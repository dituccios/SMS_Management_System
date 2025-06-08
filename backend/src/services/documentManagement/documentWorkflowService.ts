import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

export interface WorkflowDefinition {
  name: string;
  description?: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  rules: WorkflowRule[];
  documentTypes: string[];
  categories: string[];
  companyId: string;
}

export interface WorkflowState {
  id: string;
  name: string;
  description?: string;
  type: 'start' | 'intermediate' | 'end';
  actions?: WorkflowAction[];
  permissions?: any;
  timeouts?: WorkflowTimeout[];
}

export interface WorkflowTransition {
  id: string;
  fromState: string;
  toState: string;
  trigger: string;
  conditions?: WorkflowCondition[];
  actions?: WorkflowAction[];
}

export interface WorkflowRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  priority: number;
}

export interface WorkflowAction {
  type: 'notify' | 'assign' | 'update_status' | 'create_task' | 'send_email' | 'webhook';
  parameters: any;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface WorkflowTimeout {
  duration: number; // in minutes
  action: WorkflowAction;
}

export interface ApprovalRequest {
  documentId: string;
  approverId: string;
  level: number;
  dueDate?: Date;
  comments?: string;
  isRequired: boolean;
}

export class DocumentWorkflowService extends EventEmitter {

  // Workflow Definition Management
  async createWorkflow(definition: WorkflowDefinition, createdBy: string): Promise<any> {
    try {
      const workflow = await prisma.documentWorkflow.create({
        data: {
          name: definition.name,
          description: definition.description,
          definition: {
            states: definition.states,
            transitions: definition.transitions,
            rules: definition.rules
          },
          documentTypes: definition.documentTypes,
          categories: definition.categories,
          companyId: definition.companyId,
          createdBy
        }
      });

      logger.info(`Workflow created: ${workflow.id}`, {
        name: definition.name,
        companyId: definition.companyId
      });

      return workflow;
    } catch (error) {
      logger.error('Failed to create workflow:', error);
      throw error;
    }
  }

  async getWorkflows(companyId: string, isActive = true): Promise<any[]> {
    try {
      const workflows = await prisma.documentWorkflow.findMany({
        where: {
          companyId,
          isActive
        },
        orderBy: { name: 'asc' }
      });

      return workflows;
    } catch (error) {
      logger.error('Failed to get workflows:', error);
      throw error;
    }
  }

  async updateWorkflow(id: string, updates: Partial<WorkflowDefinition>, updatedBy: string): Promise<any> {
    try {
      const workflow = await prisma.documentWorkflow.update({
        where: { id },
        data: {
          name: updates.name,
          description: updates.description,
          definition: updates.states || updates.transitions || updates.rules ? {
            states: updates.states,
            transitions: updates.transitions,
            rules: updates.rules
          } : undefined,
          documentTypes: updates.documentTypes,
          categories: updates.categories,
          updatedBy
        }
      });

      return workflow;
    } catch (error) {
      logger.error('Failed to update workflow:', error);
      throw error;
    }
  }

  // Document Workflow Execution
  async initiateWorkflow(documentId: string, workflowId?: string): Promise<any> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { type: true, category: true }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Find applicable workflow
      let workflow;
      if (workflowId) {
        workflow = await prisma.documentWorkflow.findUnique({
          where: { id: workflowId }
        });
      } else {
        workflow = await this.findApplicableWorkflow(document);
      }

      if (!workflow) {
        throw new Error('No applicable workflow found');
      }

      const workflowDef = workflow.definition as any;
      const startState = workflowDef.states.find((s: any) => s.type === 'start');

      if (!startState) {
        throw new Error('Workflow has no start state');
      }

      // Update document with workflow state
      await prisma.document.update({
        where: { id: documentId },
        data: {
          workflowState: startState.id,
          status: 'UNDER_REVIEW'
        }
      });

      // Execute start state actions
      await this.executeStateActions(documentId, startState);

      this.emit('workflowInitiated', { documentId, workflowId: workflow.id, state: startState.id });

      logger.info(`Workflow initiated for document: ${documentId}`, {
        workflowId: workflow.id,
        startState: startState.id
      });

      return { workflowId: workflow.id, currentState: startState.id };
    } catch (error) {
      logger.error('Failed to initiate workflow:', error);
      throw error;
    }
  }

  async transitionWorkflow(documentId: string, trigger: string, userId: string, data?: any): Promise<any> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      });

      if (!document || !document.workflowState) {
        throw new Error('Document not in workflow');
      }

      // Find applicable workflow
      const workflow = await this.findDocumentWorkflow(document);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const workflowDef = workflow.definition as any;
      const currentState = document.workflowState;

      // Find valid transition
      const transition = workflowDef.transitions.find((t: any) => 
        t.fromState === currentState && t.trigger === trigger
      );

      if (!transition) {
        throw new Error(`Invalid transition: ${trigger} from state ${currentState}`);
      }

      // Check transition conditions
      const canTransition = await this.checkTransitionConditions(document, transition, userId, data);
      if (!canTransition) {
        throw new Error('Transition conditions not met');
      }

      // Execute transition actions
      await this.executeTransitionActions(documentId, transition, userId, data);

      // Update document state
      const newState = workflowDef.states.find((s: any) => s.id === transition.toState);
      const newStatus = this.getDocumentStatusFromState(newState);

      await prisma.document.update({
        where: { id: documentId },
        data: {
          workflowState: transition.toState,
          status: newStatus
        }
      });

      // Execute new state actions
      await this.executeStateActions(documentId, newState);

      this.emit('workflowTransitioned', {
        documentId,
        fromState: currentState,
        toState: transition.toState,
        trigger,
        userId
      });

      logger.info(`Workflow transitioned for document: ${documentId}`, {
        fromState: currentState,
        toState: transition.toState,
        trigger
      });

      return { currentState: transition.toState, status: newStatus };
    } catch (error) {
      logger.error('Failed to transition workflow:', error);
      throw error;
    }
  }

  // Approval Management
  async requestApproval(request: ApprovalRequest): Promise<any> {
    try {
      const approval = await prisma.documentApproval.create({
        data: {
          documentId: request.documentId,
          approverId: request.approverId,
          level: request.level,
          comments: request.comments,
          isRequired: request.isRequired,
          status: 'PENDING'
        }
      });

      // Send notification to approver
      await this.notifyApprover(approval);

      this.emit('approvalRequested', { approval });

      return approval;
    } catch (error) {
      logger.error('Failed to request approval:', error);
      throw error;
    }
  }

  async processApproval(approvalId: string, decision: 'APPROVED' | 'REJECTED', comments?: string): Promise<any> {
    try {
      const approval = await prisma.documentApproval.update({
        where: { id: approvalId },
        data: {
          status: decision,
          comments,
          approvedAt: new Date()
        },
        include: { document: true }
      });

      // Check if all required approvals are complete
      const allApprovals = await prisma.documentApproval.findMany({
        where: {
          documentId: approval.documentId,
          isRequired: true
        }
      });

      const allApproved = allApprovals.every(a => a.status === 'APPROVED');
      const anyRejected = allApprovals.some(a => a.status === 'REJECTED');

      // Transition workflow based on approval result
      if (anyRejected) {
        await this.transitionWorkflow(approval.documentId, 'reject', approval.approverId);
      } else if (allApproved) {
        await this.transitionWorkflow(approval.documentId, 'approve', approval.approverId);
      }

      this.emit('approvalProcessed', { approval, decision });

      return approval;
    } catch (error) {
      logger.error('Failed to process approval:', error);
      throw error;
    }
  }

  // Review Management
  async scheduleReview(documentId: string, reviewerId: string, dueDate: Date, reviewType = 'PERIODIC'): Promise<any> {
    try {
      const review = await prisma.documentReview.create({
        data: {
          documentId,
          reviewerId,
          reviewType: reviewType as any,
          dueDate,
          status: 'PENDING',
          createdBy: reviewerId
        }
      });

      // Schedule reminder notifications
      await this.scheduleReviewReminders(review);

      this.emit('reviewScheduled', { review });

      return review;
    } catch (error) {
      logger.error('Failed to schedule review:', error);
      throw error;
    }
  }

  async completeReview(reviewId: string, comments?: string, recommendations?: string, nextReviewDate?: Date): Promise<any> {
    try {
      const review = await prisma.documentReview.update({
        where: { id: reviewId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          comments,
          recommendations,
          nextReviewDate
        },
        include: { document: true }
      });

      // Update document review date
      await prisma.document.update({
        where: { id: review.documentId },
        data: {
          lastReviewedAt: new Date(),
          lastReviewedBy: review.reviewerId,
          reviewDueAt: nextReviewDate
        }
      });

      // Schedule next review if specified
      if (nextReviewDate) {
        await this.scheduleReview(review.documentId, review.reviewerId, nextReviewDate);
      }

      this.emit('reviewCompleted', { review });

      return review;
    } catch (error) {
      logger.error('Failed to complete review:', error);
      throw error;
    }
  }

  // Document Relationships
  async linkDocuments(sourceId: string, targetId: string, linkType: string, description?: string, userId?: string): Promise<any> {
    try {
      const link = await prisma.documentLink.create({
        data: {
          sourceDocumentId: sourceId,
          targetDocumentId: targetId,
          linkType: linkType as any,
          description,
          createdBy: userId || 'system'
        }
      });

      this.emit('documentsLinked', { link });

      return link;
    } catch (error) {
      logger.error('Failed to link documents:', error);
      throw error;
    }
  }

  async getDocumentLinks(documentId: string): Promise<any> {
    try {
      const [outgoingLinks, incomingLinks] = await Promise.all([
        prisma.documentLink.findMany({
          where: { sourceDocumentId: documentId },
          include: { targetDocument: { include: { category: true, type: true } } }
        }),
        prisma.documentLink.findMany({
          where: { targetDocumentId: documentId },
          include: { sourceDocument: { include: { category: true, type: true } } }
        })
      ]);

      return {
        outgoing: outgoingLinks,
        incoming: incomingLinks
      };
    } catch (error) {
      logger.error('Failed to get document links:', error);
      throw error;
    }
  }

  // Private Helper Methods
  private async findApplicableWorkflow(document: any): Promise<any> {
    const workflows = await prisma.documentWorkflow.findMany({
      where: {
        companyId: document.companyId,
        isActive: true,
        OR: [
          { documentTypes: { has: document.typeId } },
          { categories: { has: document.categoryId } }
        ]
      }
    });

    // Return the first matching workflow (could be enhanced with priority logic)
    return workflows[0] || null;
  }

  private async findDocumentWorkflow(document: any): Promise<any> {
    // This would typically store the workflow ID with the document
    // For now, find the applicable workflow
    return await this.findApplicableWorkflow(document);
  }

  private async checkTransitionConditions(document: any, transition: any, userId: string, data?: any): Promise<boolean> {
    if (!transition.conditions) return true;

    for (const condition of transition.conditions) {
      const fieldValue = this.getFieldValue(document, condition.field, data);
      const conditionMet = this.evaluateCondition(fieldValue, condition.operator, condition.value);
      
      if (!conditionMet) {
        return false;
      }
    }

    return true;
  }

  private async executeStateActions(documentId: string, state: any): Promise<void> {
    if (!state.actions) return;

    for (const action of state.actions) {
      await this.executeAction(documentId, action);
    }
  }

  private async executeTransitionActions(documentId: string, transition: any, userId: string, data?: any): Promise<void> {
    if (!transition.actions) return;

    for (const action of transition.actions) {
      await this.executeAction(documentId, action, { userId, data });
    }
  }

  private async executeAction(documentId: string, action: WorkflowAction, context?: any): Promise<void> {
    try {
      switch (action.type) {
        case 'notify':
          await this.sendNotification(documentId, action.parameters, context);
          break;
        case 'assign':
          await this.assignTask(documentId, action.parameters, context);
          break;
        case 'update_status':
          await this.updateDocumentStatus(documentId, action.parameters.status);
          break;
        case 'create_task':
          await this.createTask(documentId, action.parameters, context);
          break;
        case 'send_email':
          await this.sendEmail(documentId, action.parameters, context);
          break;
        case 'webhook':
          await this.callWebhook(documentId, action.parameters, context);
          break;
      }
    } catch (error) {
      logger.error(`Failed to execute action ${action.type}:`, error);
    }
  }

  private getDocumentStatusFromState(state: any): string {
    const statusMap: Record<string, string> = {
      'draft': 'DRAFT',
      'review': 'UNDER_REVIEW',
      'approval': 'PENDING_APPROVAL',
      'approved': 'APPROVED',
      'published': 'PUBLISHED',
      'rejected': 'DRAFT',
      'archived': 'ARCHIVED'
    };

    return statusMap[state.id] || 'DRAFT';
  }

  private getFieldValue(document: any, field: string, data?: any): any {
    if (data && data[field] !== undefined) {
      return data[field];
    }
    return document[field];
  }

  private evaluateCondition(value: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return value === expectedValue;
      case 'not_equals':
        return value !== expectedValue;
      case 'contains':
        return String(value).includes(String(expectedValue));
      case 'greater_than':
        return Number(value) > Number(expectedValue);
      case 'less_than':
        return Number(value) < Number(expectedValue);
      default:
        return false;
    }
  }

  private async notifyApprover(approval: any): Promise<void> {
    // Implementation would send notification to approver
    this.emit('notificationRequired', {
      type: 'approval_request',
      recipientId: approval.approverId,
      documentId: approval.documentId
    });
  }

  private async scheduleReviewReminders(review: any): Promise<void> {
    // Implementation would schedule reminder notifications
    this.emit('reminderScheduled', {
      type: 'review_due',
      reviewId: review.id,
      dueDate: review.dueDate
    });
  }

  private async sendNotification(documentId: string, parameters: any, context?: any): Promise<void> {
    // Implementation would send notification
  }

  private async assignTask(documentId: string, parameters: any, context?: any): Promise<void> {
    // Implementation would assign task
  }

  private async updateDocumentStatus(documentId: string, status: string): Promise<void> {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: status as any }
    });
  }

  private async createTask(documentId: string, parameters: any, context?: any): Promise<void> {
    // Implementation would create task
  }

  private async sendEmail(documentId: string, parameters: any, context?: any): Promise<void> {
    // Implementation would send email
  }

  private async callWebhook(documentId: string, parameters: any, context?: any): Promise<void> {
    // Implementation would call webhook
  }
}

export default new DocumentWorkflowService();
