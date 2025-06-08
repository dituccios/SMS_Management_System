import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { EventEmitter } from 'events';
import documentService from '../documentManagement/documentService';
import auditLoggingService from '../audit/auditLoggingService';
import notificationService from '../notifications/notificationService';

const prisma = new PrismaClient();

export interface IncidentDocumentLink {
  incidentId: string;
  documentId: string;
  linkType: 'EVIDENCE' | 'PROCEDURE' | 'POLICY' | 'REPORT' | 'COMMUNICATION' | 'REMEDIATION';
  description?: string;
  relevanceScore?: number;
  addedBy: string;
  addedAt: Date;
}

export interface DocumentBasedResolution {
  incidentId: string;
  resolutionType: 'PROCEDURE_FOLLOWED' | 'POLICY_UPDATED' | 'DOCUMENT_CREATED' | 'TRAINING_REQUIRED';
  documentIds: string[];
  resolutionSteps: ResolutionStep[];
  completedBy: string;
  completedAt: Date;
  verificationRequired: boolean;
}

export interface ResolutionStep {
  stepNumber: number;
  description: string;
  documentReference?: string;
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  evidence?: string[];
}

export interface EvidenceCollectionWorkflow {
  incidentId: string;
  workflowId: string;
  collectionPlan: EvidenceCollectionPlan;
  collectedEvidence: CollectedEvidence[];
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUSPENDED';
  assignedTo: string[];
  dueDate: Date;
  completedAt?: Date;
}

export interface EvidenceCollectionPlan {
  evidenceTypes: string[];
  documentTypes: string[];
  systemLogs: string[];
  interviews: string[];
  forensicRequirements: string[];
  legalRequirements: string[];
  timeline: EvidenceTimelineItem[];
}

export interface EvidenceTimelineItem {
  timestamp: Date;
  action: string;
  responsible: string;
  deliverables: string[];
  dependencies: string[];
}

export interface CollectedEvidence {
  id: string;
  type: 'DOCUMENT' | 'LOG' | 'SCREENSHOT' | 'INTERVIEW' | 'FORENSIC' | 'EXTERNAL';
  documentId?: string;
  description: string;
  collectedBy: string;
  collectedAt: Date;
  hash: string;
  chainOfCustody: ChainOfCustodyEntry[];
  metadata: any;
}

export interface ChainOfCustodyEntry {
  timestamp: Date;
  action: 'COLLECTED' | 'TRANSFERRED' | 'ANALYZED' | 'STORED' | 'ACCESSED';
  person: string;
  location: string;
  purpose: string;
  signature: string;
}

export class IncidentDocumentIntegrationService extends EventEmitter {

  // Document-Incident Linking
  async linkDocumentToIncident(link: IncidentDocumentLink): Promise<void> {
    try {
      // Verify incident exists
      const incident = await prisma.incident.findUnique({
        where: { id: link.incidentId }
      });

      if (!incident) {
        throw new Error('Incident not found');
      }

      // Verify document exists and user has access
      const document = await documentService.getDocument(link.documentId, link.addedBy);

      // Create the link
      await prisma.incidentDocumentLink.create({
        data: {
          incidentId: link.incidentId,
          documentId: link.documentId,
          linkType: link.linkType as any,
          description: link.description,
          relevanceScore: link.relevanceScore,
          addedBy: link.addedBy,
          addedAt: link.addedAt
        }
      });

      // Log the linking action
      await auditLoggingService.logEvent({
        eventType: 'DATA_CHANGE',
        category: 'DOCUMENT_MANAGEMENT',
        action: 'LINK_DOCUMENT_TO_INCIDENT',
        description: `Document ${document.title} linked to incident ${incident.title}`,
        userId: link.addedBy,
        resourceType: 'INCIDENT_DOCUMENT_LINK',
        resourceId: `${link.incidentId}-${link.documentId}`,
        metadata: {
          incidentId: link.incidentId,
          documentId: link.documentId,
          linkType: link.linkType,
          relevanceScore: link.relevanceScore
        },
        tags: ['incident', 'document', 'link']
      });

      // Trigger notifications for relevant stakeholders
      await this.notifyDocumentLinked(incident, document, link);

      this.emit('documentLinked', { incident, document, link });

      logger.info(`Document linked to incident: ${link.documentId} -> ${link.incidentId}`, {
        linkType: link.linkType,
        addedBy: link.addedBy
      });
    } catch (error) {
      logger.error('Failed to link document to incident:', error);
      throw error;
    }
  }

  async getIncidentDocuments(incidentId: string, linkType?: string): Promise<any[]> {
    try {
      const where: any = { incidentId };
      if (linkType) where.linkType = linkType;

      const links = await prisma.incidentDocumentLink.findMany({
        where,
        include: {
          document: {
            include: {
              category: true,
              type: true
            }
          }
        },
        orderBy: [
          { relevanceScore: 'desc' },
          { addedAt: 'desc' }
        ]
      });

      return links.map(link => ({
        ...link.document,
        linkType: link.linkType,
        relevanceScore: link.relevanceScore,
        linkedAt: link.addedAt,
        linkedBy: link.addedBy,
        linkDescription: link.description
      }));
    } catch (error) {
      logger.error('Failed to get incident documents:', error);
      throw error;
    }
  }

  // Document-Based Incident Resolution
  async createDocumentBasedResolution(resolution: DocumentBasedResolution): Promise<string> {
    try {
      const resolutionId = crypto.randomUUID();

      // Create resolution record
      await prisma.incidentResolution.create({
        data: {
          id: resolutionId,
          incidentId: resolution.incidentId,
          resolutionType: resolution.resolutionType as any,
          documentIds: resolution.documentIds,
          resolutionSteps: resolution.resolutionSteps,
          completedBy: resolution.completedBy,
          completedAt: resolution.completedAt,
          verificationRequired: resolution.verificationRequired,
          status: 'COMPLETED'
        }
      });

      // Link all referenced documents
      for (const documentId of resolution.documentIds) {
        await this.linkDocumentToIncident({
          incidentId: resolution.incidentId,
          documentId,
          linkType: 'REMEDIATION',
          description: `Document used in ${resolution.resolutionType} resolution`,
          addedBy: resolution.completedBy,
          addedAt: resolution.completedAt
        });
      }

      // Update incident status
      await prisma.incident.update({
        where: { id: resolution.incidentId },
        data: {
          status: resolution.verificationRequired ? 'RESOLVED_PENDING_VERIFICATION' : 'RESOLVED',
          resolvedAt: resolution.completedAt,
          resolvedBy: resolution.completedBy
        }
      });

      // Log resolution
      await auditLoggingService.logEvent({
        eventType: 'WORKFLOW_EVENT',
        category: 'INCIDENT_MANAGEMENT',
        action: 'INCIDENT_RESOLVED',
        description: `Incident resolved using ${resolution.resolutionType}`,
        userId: resolution.completedBy,
        resourceType: 'INCIDENT',
        resourceId: resolution.incidentId,
        metadata: {
          resolutionType: resolution.resolutionType,
          documentCount: resolution.documentIds.length,
          stepsCount: resolution.resolutionSteps.length,
          verificationRequired: resolution.verificationRequired
        },
        tags: ['incident', 'resolution', 'document-based']
      });

      // Trigger notifications
      await this.notifyResolutionCompleted(resolution);

      this.emit('resolutionCompleted', resolution);

      logger.info(`Document-based resolution created: ${resolutionId}`, {
        incidentId: resolution.incidentId,
        resolutionType: resolution.resolutionType
      });

      return resolutionId;
    } catch (error) {
      logger.error('Failed to create document-based resolution:', error);
      throw error;
    }
  }

  // Evidence Collection Workflow
  async initiateEvidenceCollection(workflow: EvidenceCollectionWorkflow): Promise<string> {
    try {
      const workflowId = workflow.workflowId || crypto.randomUUID();

      // Create evidence collection workflow
      await prisma.evidenceCollectionWorkflow.create({
        data: {
          id: workflowId,
          incidentId: workflow.incidentId,
          collectionPlan: workflow.collectionPlan,
          status: 'PLANNED',
          assignedTo: workflow.assignedTo,
          dueDate: workflow.dueDate,
          createdAt: new Date()
        }
      });

      // Create tasks for each evidence collection item
      for (const timelineItem of workflow.collectionPlan.timeline) {
        await this.createEvidenceCollectionTask(workflowId, timelineItem);
      }

      // Log workflow initiation
      await auditLoggingService.logEvent({
        eventType: 'WORKFLOW_EVENT',
        category: 'INCIDENT_MANAGEMENT',
        action: 'EVIDENCE_COLLECTION_INITIATED',
        description: `Evidence collection workflow initiated for incident`,
        resourceType: 'EVIDENCE_WORKFLOW',
        resourceId: workflowId,
        metadata: {
          incidentId: workflow.incidentId,
          evidenceTypes: workflow.collectionPlan.evidenceTypes,
          assignedTo: workflow.assignedTo,
          dueDate: workflow.dueDate
        },
        tags: ['incident', 'evidence', 'workflow']
      });

      // Notify assigned personnel
      await this.notifyEvidenceCollectionAssigned(workflow);

      this.emit('evidenceCollectionInitiated', workflow);

      logger.info(`Evidence collection workflow initiated: ${workflowId}`, {
        incidentId: workflow.incidentId,
        assignedTo: workflow.assignedTo.length
      });

      return workflowId;
    } catch (error) {
      logger.error('Failed to initiate evidence collection:', error);
      throw error;
    }
  }

  async collectEvidence(workflowId: string, evidence: CollectedEvidence): Promise<void> {
    try {
      // Add evidence to workflow
      await prisma.collectedEvidence.create({
        data: {
          id: evidence.id,
          workflowId,
          type: evidence.type as any,
          documentId: evidence.documentId,
          description: evidence.description,
          collectedBy: evidence.collectedBy,
          collectedAt: evidence.collectedAt,
          hash: evidence.hash,
          chainOfCustody: evidence.chainOfCustody,
          metadata: evidence.metadata
        }
      });

      // If it's a document, ensure it's properly linked
      if (evidence.documentId) {
        const workflow = await prisma.evidenceCollectionWorkflow.findUnique({
          where: { id: workflowId }
        });

        if (workflow) {
          await this.linkDocumentToIncident({
            incidentId: workflow.incidentId,
            documentId: evidence.documentId,
            linkType: 'EVIDENCE',
            description: evidence.description,
            addedBy: evidence.collectedBy,
            addedAt: evidence.collectedAt
          });
        }
      }

      // Log evidence collection
      await auditLoggingService.logEvent({
        eventType: 'DATA_CHANGE',
        category: 'INCIDENT_MANAGEMENT',
        action: 'EVIDENCE_COLLECTED',
        description: `Evidence collected: ${evidence.description}`,
        userId: evidence.collectedBy,
        resourceType: 'EVIDENCE',
        resourceId: evidence.id,
        metadata: {
          workflowId,
          evidenceType: evidence.type,
          documentId: evidence.documentId,
          hash: evidence.hash
        },
        tags: ['incident', 'evidence', 'collection']
      });

      // Check if collection is complete
      await this.checkEvidenceCollectionCompletion(workflowId);

      this.emit('evidenceCollected', { workflowId, evidence });

      logger.info(`Evidence collected: ${evidence.id}`, {
        workflowId,
        type: evidence.type,
        collectedBy: evidence.collectedBy
      });
    } catch (error) {
      logger.error('Failed to collect evidence:', error);
      throw error;
    }
  }

  // Document-Driven Notifications
  async setupDocumentDrivenNotifications(incidentId: string): Promise<void> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          documentLinks: {
            include: { document: true }
          }
        }
      });

      if (!incident) {
        throw new Error('Incident not found');
      }

      // Set up notifications for document updates
      for (const link of incident.documentLinks) {
        await this.setupDocumentUpdateNotification(incidentId, link.documentId);
      }

      // Set up notifications for new document links
      await this.setupNewDocumentLinkNotification(incidentId);

      logger.info(`Document-driven notifications set up for incident: ${incidentId}`);
    } catch (error) {
      logger.error('Failed to setup document-driven notifications:', error);
      throw error;
    }
  }

  // Smart Document Suggestions
  async suggestRelevantDocuments(incidentId: string): Promise<any[]> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          category: true,
          type: true
        }
      });

      if (!incident) {
        throw new Error('Incident not found');
      }

      // Find documents based on incident characteristics
      const suggestions = await this.findRelevantDocuments(incident);

      // Score and rank suggestions
      const rankedSuggestions = await this.rankDocumentSuggestions(incident, suggestions);

      return rankedSuggestions;
    } catch (error) {
      logger.error('Failed to suggest relevant documents:', error);
      throw error;
    }
  }

  // Private Helper Methods
  private async createEvidenceCollectionTask(workflowId: string, timelineItem: EvidenceTimelineItem): Promise<void> {
    // Create task for evidence collection
    // This would integrate with task management system
    logger.debug(`Creating evidence collection task for workflow: ${workflowId}`);
  }

  private async checkEvidenceCollectionCompletion(workflowId: string): Promise<void> {
    try {
      const workflow = await prisma.evidenceCollectionWorkflow.findUnique({
        where: { id: workflowId },
        include: {
          collectedEvidence: true
        }
      });

      if (!workflow) return;

      // Check if all required evidence has been collected
      const requiredCount = workflow.collectionPlan.evidenceTypes.length;
      const collectedCount = workflow.collectedEvidence.length;

      if (collectedCount >= requiredCount) {
        await prisma.evidenceCollectionWorkflow.update({
          where: { id: workflowId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date()
          }
        });

        await this.notifyEvidenceCollectionCompleted(workflow);
      }
    } catch (error) {
      logger.error('Failed to check evidence collection completion:', error);
    }
  }

  private async findRelevantDocuments(incident: any): Promise<any[]> {
    try {
      // Search for documents based on incident keywords, category, type
      const searchTerms = [
        incident.title,
        incident.description,
        incident.category?.name,
        incident.type?.name
      ].filter(Boolean).join(' ');

      // This would use the document search service
      const documents = await documentService.searchDocuments({
        query: searchTerms,
        companyId: incident.companyId,
        limit: 20
      });

      return documents.documents || [];
    } catch (error) {
      logger.error('Failed to find relevant documents:', error);
      return [];
    }
  }

  private async rankDocumentSuggestions(incident: any, documents: any[]): Promise<any[]> {
    // Implement relevance scoring algorithm
    return documents.map(doc => ({
      ...doc,
      relevanceScore: this.calculateRelevanceScore(incident, doc),
      suggestedLinkType: this.suggestLinkType(incident, doc)
    })).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private calculateRelevanceScore(incident: any, document: any): number {
    let score = 0;

    // Title similarity
    if (this.textSimilarity(incident.title, document.title) > 0.3) {
      score += 30;
    }

    // Category match
    if (incident.categoryId === document.categoryId) {
      score += 25;
    }

    // Type relevance
    if (document.type?.name.toLowerCase().includes('procedure') || 
        document.type?.name.toLowerCase().includes('policy')) {
      score += 20;
    }

    // Security level appropriateness
    if (incident.severity === 'CRITICAL' && document.securityLevel === 'CONFIDENTIAL') {
      score += 15;
    }

    // Recent updates
    const daysSinceUpdate = (Date.now() - new Date(document.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) {
      score += 10;
    }

    return Math.min(100, score);
  }

  private suggestLinkType(incident: any, document: any): string {
    const docType = document.type?.name.toLowerCase() || '';
    
    if (docType.includes('procedure') || docType.includes('process')) {
      return 'PROCEDURE';
    }
    if (docType.includes('policy')) {
      return 'POLICY';
    }
    if (docType.includes('report') || docType.includes('analysis')) {
      return 'REPORT';
    }
    
    return 'EVIDENCE';
  }

  private textSimilarity(text1: string, text2: string): number {
    // Simple text similarity calculation
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  private async notifyDocumentLinked(incident: any, document: any, link: IncidentDocumentLink): Promise<void> {
    // Send notifications to incident stakeholders
    await notificationService.sendNotification({
      type: 'INCIDENT_DOCUMENT_LINKED',
      recipients: [incident.reportedBy, incident.assignedTo].filter(Boolean),
      title: 'Document Linked to Incident',
      message: `Document "${document.title}" has been linked to incident "${incident.title}"`,
      data: { incidentId: incident.id, documentId: document.id, linkType: link.linkType }
    });
  }

  private async notifyResolutionCompleted(resolution: DocumentBasedResolution): Promise<void> {
    // Send resolution completion notifications
    await notificationService.sendNotification({
      type: 'INCIDENT_RESOLVED',
      recipients: [resolution.completedBy],
      title: 'Incident Resolution Completed',
      message: `Incident has been resolved using ${resolution.resolutionType}`,
      data: { incidentId: resolution.incidentId, resolutionType: resolution.resolutionType }
    });
  }

  private async notifyEvidenceCollectionAssigned(workflow: EvidenceCollectionWorkflow): Promise<void> {
    // Notify assigned personnel about evidence collection
    await notificationService.sendNotification({
      type: 'EVIDENCE_COLLECTION_ASSIGNED',
      recipients: workflow.assignedTo,
      title: 'Evidence Collection Assignment',
      message: `You have been assigned to collect evidence for incident`,
      data: { workflowId: workflow.workflowId, incidentId: workflow.incidentId, dueDate: workflow.dueDate }
    });
  }

  private async notifyEvidenceCollectionCompleted(workflow: any): Promise<void> {
    // Notify about evidence collection completion
    await notificationService.sendNotification({
      type: 'EVIDENCE_COLLECTION_COMPLETED',
      recipients: workflow.assignedTo,
      title: 'Evidence Collection Completed',
      message: `Evidence collection has been completed for incident`,
      data: { workflowId: workflow.id, incidentId: workflow.incidentId }
    });
  }

  private async setupDocumentUpdateNotification(incidentId: string, documentId: string): Promise<void> {
    // Set up notification for document updates
    logger.debug(`Setting up document update notification: ${documentId} for incident: ${incidentId}`);
  }

  private async setupNewDocumentLinkNotification(incidentId: string): Promise<void> {
    // Set up notification for new document links
    logger.debug(`Setting up new document link notification for incident: ${incidentId}`);
  }
}

export default new IncidentDocumentIntegrationService();
