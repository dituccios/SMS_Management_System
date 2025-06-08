import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { EventEmitter } from 'events';
import cron from 'node-cron';

const prisma = new PrismaClient();

export interface RetentionPolicyData {
  name: string;
  description?: string;
  retentionPeriod: number; // in days
  documentTypes: string[];
  categories: string[];
  securityLevels: string[];
  archiveAfterDays?: number;
  deleteAfterDays?: number;
  notifyBeforeDays?: number;
  conditions?: any;
  companyId: string;
}

export interface ComplianceReport {
  companyId: string;
  reportDate: Date;
  totalDocuments: number;
  compliantDocuments: number;
  expiredDocuments: number;
  overdueReviews: number;
  retentionViolations: number;
  legalHoldDocuments: number;
  archivedDocuments: number;
  deletedDocuments: number;
  details: any;
}

export interface ArchiveOperation {
  documentIds: string[];
  reason: string;
  scheduledDate?: Date;
  performedBy?: string;
}

export class DocumentComplianceService extends EventEmitter {
  private scheduledJobs: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeScheduledJobs();
  }

  // Retention Policy Management
  async createRetentionPolicy(data: RetentionPolicyData, createdBy: string): Promise<any> {
    try {
      const policy = await prisma.documentRetentionPolicy.create({
        data: {
          name: data.name,
          description: data.description,
          retentionPeriod: data.retentionPeriod,
          documentTypes: data.documentTypes,
          categories: data.categories,
          securityLevels: data.securityLevels as any,
          archiveAfterDays: data.archiveAfterDays,
          deleteAfterDays: data.deleteAfterDays,
          notifyBeforeDays: data.notifyBeforeDays,
          conditions: data.conditions,
          companyId: data.companyId,
          createdBy
        }
      });

      // Apply policy to existing documents
      await this.applyRetentionPolicy(policy.id);

      logger.info(`Retention policy created: ${policy.id}`, {
        name: data.name,
        companyId: data.companyId
      });

      return policy;
    } catch (error) {
      logger.error('Failed to create retention policy:', error);
      throw error;
    }
  }

  async getRetentionPolicies(companyId: string, isActive = true): Promise<any[]> {
    try {
      const policies = await prisma.documentRetentionPolicy.findMany({
        where: {
          companyId,
          isActive
        },
        orderBy: { name: 'asc' }
      });

      return policies;
    } catch (error) {
      logger.error('Failed to get retention policies:', error);
      throw error;
    }
  }

  async updateRetentionPolicy(id: string, updates: Partial<RetentionPolicyData>, updatedBy: string): Promise<any> {
    try {
      const policy = await prisma.documentRetentionPolicy.update({
        where: { id },
        data: {
          name: updates.name,
          description: updates.description,
          retentionPeriod: updates.retentionPeriod,
          documentTypes: updates.documentTypes,
          categories: updates.categories,
          securityLevels: updates.securityLevels as any,
          archiveAfterDays: updates.archiveAfterDays,
          deleteAfterDays: updates.deleteAfterDays,
          notifyBeforeDays: updates.notifyBeforeDays,
          conditions: updates.conditions,
          updatedBy
        }
      });

      // Reapply policy to documents
      await this.applyRetentionPolicy(id);

      return policy;
    } catch (error) {
      logger.error('Failed to update retention policy:', error);
      throw error;
    }
  }

  async deleteRetentionPolicy(id: string): Promise<void> {
    try {
      await prisma.documentRetentionPolicy.update({
        where: { id },
        data: { isActive: false }
      });

      logger.info(`Retention policy deactivated: ${id}`);
    } catch (error) {
      logger.error('Failed to delete retention policy:', error);
      throw error;
    }
  }

  // Document Retention Management
  async applyRetentionPolicy(policyId: string): Promise<void> {
    try {
      const policy = await prisma.documentRetentionPolicy.findUnique({
        where: { id: policyId }
      });

      if (!policy || !policy.isActive) {
        return;
      }

      // Find documents that match the policy criteria
      const documents = await this.findDocumentsForPolicy(policy);

      for (const document of documents) {
        await this.updateDocumentRetention(document.id, policy);
      }

      logger.info(`Retention policy applied to ${documents.length} documents`, {
        policyId,
        documentCount: documents.length
      });
    } catch (error) {
      logger.error('Failed to apply retention policy:', error);
      throw error;
    }
  }

  async checkDocumentRetention(documentId: string): Promise<any> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { type: true, category: true }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Find applicable retention policies
      const policies = await this.findApplicablePolicies(document);
      
      // Calculate retention dates
      const retentionInfo = this.calculateRetentionDates(document, policies);

      return {
        documentId,
        retentionPeriod: retentionInfo.retentionPeriod,
        expiryDate: retentionInfo.expiryDate,
        archiveDate: retentionInfo.archiveDate,
        deleteDate: retentionInfo.deleteDate,
        isExpired: retentionInfo.isExpired,
        daysUntilExpiry: retentionInfo.daysUntilExpiry,
        applicablePolicies: policies.map(p => ({ id: p.id, name: p.name }))
      };
    } catch (error) {
      logger.error('Failed to check document retention:', error);
      throw error;
    }
  }

  // Automatic Archiving
  async scheduleArchiving(operation: ArchiveOperation): Promise<void> {
    try {
      const scheduledDate = operation.scheduledDate || new Date();
      
      // Store archiving operation
      const archiveJob = {
        id: `archive_${Date.now()}`,
        documentIds: operation.documentIds,
        reason: operation.reason,
        scheduledDate,
        performedBy: operation.performedBy,
        status: 'SCHEDULED'
      };

      // Schedule the archiving job
      if (scheduledDate <= new Date()) {
        await this.performArchiving(archiveJob);
      } else {
        this.scheduleDelayedArchiving(archiveJob);
      }

      logger.info(`Archiving scheduled for ${operation.documentIds.length} documents`, {
        scheduledDate,
        reason: operation.reason
      });
    } catch (error) {
      logger.error('Failed to schedule archiving:', error);
      throw error;
    }
  }

  async performArchiving(archiveJob: any): Promise<void> {
    try {
      const archivedCount = await prisma.document.updateMany({
        where: {
          id: { in: archiveJob.documentIds },
          legalHold: false // Don't archive documents under legal hold
        },
        data: {
          status: 'ARCHIVED',
          archivedAt: new Date(),
          complianceNotes: archiveJob.reason
        }
      });

      // Log archiving operations
      for (const documentId of archiveJob.documentIds) {
        await prisma.documentAccessLog.create({
          data: {
            documentId,
            userId: archiveJob.performedBy || 'system',
            action: 'ARCHIVE',
            details: {
              reason: archiveJob.reason,
              jobId: archiveJob.id
            }
          }
        });
      }

      this.emit('documentsArchived', {
        documentIds: archiveJob.documentIds,
        count: archivedCount.count,
        reason: archiveJob.reason
      });

      logger.info(`Documents archived: ${archivedCount.count}`, {
        jobId: archiveJob.id,
        reason: archiveJob.reason
      });
    } catch (error) {
      logger.error('Failed to perform archiving:', error);
      throw error;
    }
  }

  async getArchivedDocuments(companyId: string, limit = 50, offset = 0): Promise<any> {
    try {
      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where: {
            companyId,
            status: 'ARCHIVED'
          },
          include: {
            category: true,
            type: true
          },
          orderBy: { archivedAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.document.count({
          where: {
            companyId,
            status: 'ARCHIVED'
          }
        })
      ]);

      return {
        documents,
        total,
        limit,
        offset
      };
    } catch (error) {
      logger.error('Failed to get archived documents:', error);
      throw error;
    }
  }

  // Legal Hold Management
  async placeLegalHold(documentIds: string[], reason: string, placedBy: string): Promise<void> {
    try {
      await prisma.document.updateMany({
        where: { id: { in: documentIds } },
        data: {
          legalHold: true,
          complianceNotes: reason
        }
      });

      // Log legal hold placement
      for (const documentId of documentIds) {
        await prisma.documentAccessLog.create({
          data: {
            documentId,
            userId: placedBy,
            action: 'LEGAL_HOLD',
            details: { reason, action: 'placed' }
          }
        });
      }

      this.emit('legalHoldPlaced', { documentIds, reason, placedBy });

      logger.info(`Legal hold placed on ${documentIds.length} documents`, {
        reason,
        placedBy
      });
    } catch (error) {
      logger.error('Failed to place legal hold:', error);
      throw error;
    }
  }

  async removeLegalHold(documentIds: string[], reason: string, removedBy: string): Promise<void> {
    try {
      await prisma.document.updateMany({
        where: { id: { in: documentIds } },
        data: {
          legalHold: false,
          complianceNotes: reason
        }
      });

      // Log legal hold removal
      for (const documentId of documentIds) {
        await prisma.documentAccessLog.create({
          data: {
            documentId,
            userId: removedBy,
            action: 'LEGAL_HOLD',
            details: { reason, action: 'removed' }
          }
        });
      }

      this.emit('legalHoldRemoved', { documentIds, reason, removedBy });

      logger.info(`Legal hold removed from ${documentIds.length} documents`, {
        reason,
        removedBy
      });
    } catch (error) {
      logger.error('Failed to remove legal hold:', error);
      throw error;
    }
  }

  // Compliance Reporting
  async generateComplianceReport(companyId: string, dateRange?: { start: Date; end: Date }): Promise<ComplianceReport> {
    try {
      const where: any = { companyId };
      if (dateRange) {
        where.createdAt = {
          gte: dateRange.start,
          lte: dateRange.end
        };
      }

      const [
        totalDocuments,
        expiredDocuments,
        overdueReviews,
        legalHoldDocuments,
        archivedDocuments,
        deletedDocuments
      ] = await Promise.all([
        prisma.document.count({ where }),
        prisma.document.count({
          where: {
            ...where,
            expiresAt: { lt: new Date() },
            status: { not: 'ARCHIVED' }
          }
        }),
        prisma.documentReview.count({
          where: {
            document: { companyId },
            dueDate: { lt: new Date() },
            status: 'PENDING'
          }
        }),
        prisma.document.count({
          where: { ...where, legalHold: true }
        }),
        prisma.document.count({
          where: { ...where, status: 'ARCHIVED' }
        }),
        prisma.document.count({
          where: { ...where, status: 'DELETED' }
        })
      ]);

      const compliantDocuments = totalDocuments - expiredDocuments;
      const retentionViolations = await this.countRetentionViolations(companyId);

      const report: ComplianceReport = {
        companyId,
        reportDate: new Date(),
        totalDocuments,
        compliantDocuments,
        expiredDocuments,
        overdueReviews,
        retentionViolations,
        legalHoldDocuments,
        archivedDocuments,
        deletedDocuments,
        details: {
          complianceRate: totalDocuments > 0 ? (compliantDocuments / totalDocuments) * 100 : 100,
          retentionCompliance: await this.calculateRetentionCompliance(companyId),
          reviewCompliance: await this.calculateReviewCompliance(companyId)
        }
      };

      return report;
    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  // Private Helper Methods
  private initializeScheduledJobs(): void {
    // Daily compliance check at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.performDailyComplianceCheck();
    });

    // Weekly retention policy enforcement on Sundays at 3 AM
    cron.schedule('0 3 * * 0', async () => {
      await this.enforceRetentionPolicies();
    });
  }

  private async performDailyComplianceCheck(): Promise<void> {
    try {
      logger.info('Starting daily compliance check');

      // Check for expired documents
      await this.checkExpiredDocuments();

      // Check for overdue reviews
      await this.checkOverdueReviews();

      // Send compliance notifications
      await this.sendComplianceNotifications();

      logger.info('Daily compliance check completed');
    } catch (error) {
      logger.error('Daily compliance check failed:', error);
    }
  }

  private async enforceRetentionPolicies(): Promise<void> {
    try {
      logger.info('Starting retention policy enforcement');

      const policies = await prisma.documentRetentionPolicy.findMany({
        where: { isActive: true }
      });

      for (const policy of policies) {
        await this.applyRetentionPolicy(policy.id);
      }

      logger.info('Retention policy enforcement completed');
    } catch (error) {
      logger.error('Retention policy enforcement failed:', error);
    }
  }

  private async findDocumentsForPolicy(policy: any): Promise<any[]> {
    const where: any = {
      companyId: policy.companyId,
      status: { notIn: ['DELETED', 'ARCHIVED'] }
    };

    if (policy.documentTypes.length > 0) {
      where.typeId = { in: policy.documentTypes };
    }

    if (policy.categories.length > 0) {
      where.categoryId = { in: policy.categories };
    }

    if (policy.securityLevels.length > 0) {
      where.securityLevel = { in: policy.securityLevels };
    }

    return await prisma.document.findMany({
      where,
      include: { type: true, category: true }
    });
  }

  private async findApplicablePolicies(document: any): Promise<any[]> {
    return await prisma.documentRetentionPolicy.findMany({
      where: {
        companyId: document.companyId,
        isActive: true,
        OR: [
          { documentTypes: { has: document.typeId } },
          { categories: { has: document.categoryId } },
          { securityLevels: { has: document.securityLevel } }
        ]
      }
    });
  }

  private calculateRetentionDates(document: any, policies: any[]): any {
    // Use the most restrictive policy
    const maxRetentionPeriod = Math.max(...policies.map(p => p.retentionPeriod));
    const retentionPeriod = document.retentionPeriod || maxRetentionPeriod;

    const createdDate = new Date(document.createdAt);
    const expiryDate = new Date(createdDate.getTime() + retentionPeriod * 24 * 60 * 60 * 1000);
    
    const archivePolicy = policies.find(p => p.archiveAfterDays);
    const archiveDate = archivePolicy 
      ? new Date(createdDate.getTime() + archivePolicy.archiveAfterDays * 24 * 60 * 60 * 1000)
      : null;

    const deletePolicy = policies.find(p => p.deleteAfterDays);
    const deleteDate = deletePolicy
      ? new Date(createdDate.getTime() + deletePolicy.deleteAfterDays * 24 * 60 * 60 * 1000)
      : null;

    const now = new Date();
    const isExpired = expiryDate < now;
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    return {
      retentionPeriod,
      expiryDate,
      archiveDate,
      deleteDate,
      isExpired,
      daysUntilExpiry
    };
  }

  private async updateDocumentRetention(documentId: string, policy: any): Promise<void> {
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document) return;

    const retentionDates = this.calculateRetentionDates(document, [policy]);

    await prisma.document.update({
      where: { id: documentId },
      data: {
        retentionPeriod: retentionDates.retentionPeriod,
        expiresAt: retentionDates.expiryDate
      }
    });
  }

  private scheduleDelayedArchiving(archiveJob: any): void {
    const delay = archiveJob.scheduledDate.getTime() - Date.now();
    
    setTimeout(async () => {
      await this.performArchiving(archiveJob);
    }, delay);
  }

  private async countRetentionViolations(companyId: string): Promise<number> {
    return await prisma.document.count({
      where: {
        companyId,
        expiresAt: { lt: new Date() },
        status: { notIn: ['ARCHIVED', 'DELETED'] },
        legalHold: false
      }
    });
  }

  private async calculateRetentionCompliance(companyId: string): Promise<number> {
    const [total, violations] = await Promise.all([
      prisma.document.count({ where: { companyId, status: { not: 'DELETED' } } }),
      this.countRetentionViolations(companyId)
    ]);

    return total > 0 ? ((total - violations) / total) * 100 : 100;
  }

  private async calculateReviewCompliance(companyId: string): Promise<number> {
    const [totalReviews, overdueReviews] = await Promise.all([
      prisma.documentReview.count({
        where: { document: { companyId } }
      }),
      prisma.documentReview.count({
        where: {
          document: { companyId },
          dueDate: { lt: new Date() },
          status: 'PENDING'
        }
      })
    ]);

    return totalReviews > 0 ? ((totalReviews - overdueReviews) / totalReviews) * 100 : 100;
  }

  private async checkExpiredDocuments(): Promise<void> {
    // Implementation for checking expired documents
  }

  private async checkOverdueReviews(): Promise<void> {
    // Implementation for checking overdue reviews
  }

  private async sendComplianceNotifications(): Promise<void> {
    // Implementation for sending compliance notifications
  }
}

export default new DocumentComplianceService();
