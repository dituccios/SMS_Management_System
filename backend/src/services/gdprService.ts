import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface GDPRDataExport {
  personalData: any;
  documents: any[];
  activities: any[];
  consents: any[];
  exportDate: Date;
  requestId: string;
}

export interface ConsentRecord {
  userId: string;
  consentType: string;
  granted: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  version: string;
}

export class GDPRService {
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-this';
  }

  /**
   * Encrypt sensitive data for GDPR compliance
   */
  private encrypt(text: string): string {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, this.encryptionKey);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-gcm';
    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Record user consent for GDPR compliance
   */
  async recordConsent(consent: ConsentRecord): Promise<void> {
    try {
      await prisma.gDPRConsent.create({
        data: {
          userId: consent.userId,
          consentType: consent.consentType,
          granted: consent.granted,
          timestamp: consent.timestamp,
          ipAddress: consent.ipAddress,
          userAgent: consent.userAgent,
          version: consent.version,
          metadata: {
            recordedAt: new Date(),
            source: 'application'
          }
        }
      });

      logger.info(`GDPR consent recorded for user ${consent.userId}`, {
        consentType: consent.consentType,
        granted: consent.granted
      });
    } catch (error) {
      logger.error('Failed to record GDPR consent', error);
      throw error;
    }
  }

  /**
   * Get user's current consent status
   */
  async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    try {
      const consents = await prisma.gDPRConsent.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' }
      });

      return consents.map(consent => ({
        userId: consent.userId,
        consentType: consent.consentType,
        granted: consent.granted,
        timestamp: consent.timestamp,
        ipAddress: consent.ipAddress || undefined,
        userAgent: consent.userAgent || undefined,
        version: consent.version
      }));
    } catch (error) {
      logger.error('Failed to get user consents', error);
      throw error;
    }
  }

  /**
   * Export all user data for GDPR data portability
   */
  async exportUserData(userId: string): Promise<GDPRDataExport> {
    try {
      const requestId = crypto.randomUUID();
      
      // Get user personal data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          company: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get user documents
      const documents = await prisma.sMSDocument.findMany({
        where: { authorId: userId },
        include: {
          versions: true,
          reviews: true
        }
      });

      // Get user activities
      const activities = await prisma.sMSAuditLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' }
      });

      // Get user consents
      const consents = await this.getUserConsents(userId);

      const exportData: GDPRDataExport = {
        personalData: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          company: user.company ? {
            name: user.company.name,
            industry: user.company.industry,
            country: user.company.country
          } : null
        },
        documents: documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          description: doc.description,
          category: doc.category,
          type: doc.type,
          status: doc.status,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          versionsCount: doc.versions.length,
          reviewsCount: doc.reviews.length
        })),
        activities: activities.map(activity => ({
          id: activity.id,
          action: activity.action,
          entityType: activity.entityType,
          entityId: activity.entityId,
          timestamp: activity.timestamp,
          ipAddress: activity.ipAddress,
          userAgent: activity.userAgent
        })),
        consents,
        exportDate: new Date(),
        requestId
      };

      // Log the export request
      await prisma.gDPRDataExport.create({
        data: {
          userId,
          requestId,
          exportDate: new Date(),
          status: 'COMPLETED',
          metadata: {
            documentsCount: documents.length,
            activitiesCount: activities.length,
            consentsCount: consents.length
          }
        }
      });

      logger.info(`GDPR data export completed for user ${userId}`, {
        requestId,
        documentsCount: documents.length,
        activitiesCount: activities.length
      });

      return exportData;
    } catch (error) {
      logger.error('Failed to export user data', error);
      throw error;
    }
  }

  /**
   * Anonymize user data (Right to be forgotten)
   */
  async anonymizeUserData(userId: string, reason: string): Promise<void> {
    try {
      const anonymizedEmail = `anonymized_${crypto.randomUUID()}@deleted.local`;
      const anonymizedName = 'Anonymized User';

      // Start transaction
      await prisma.$transaction(async (tx) => {
        // Update user data
        await tx.user.update({
          where: { id: userId },
          data: {
            email: anonymizedEmail,
            firstName: anonymizedName,
            lastName: '',
            isActive: false,
            password: 'ANONYMIZED'
          }
        });

        // Anonymize audit logs
        await tx.sMSAuditLog.updateMany({
          where: { userId },
          data: {
            ipAddress: 'ANONYMIZED',
            userAgent: 'ANONYMIZED',
            metadata: {
              anonymized: true,
              anonymizedAt: new Date(),
              reason
            }
          }
        });

        // Create anonymization record
        await tx.gDPRAnonymization.create({
          data: {
            originalUserId: userId,
            anonymizedAt: new Date(),
            reason,
            requestedBy: userId,
            metadata: {
              originalEmail: anonymizedEmail,
              anonymizationMethod: 'full_anonymization'
            }
          }
        });
      });

      logger.info(`User data anonymized for GDPR compliance`, {
        userId,
        reason,
        anonymizedAt: new Date()
      });
    } catch (error) {
      logger.error('Failed to anonymize user data', error);
      throw error;
    }
  }

  /**
   * Delete user data completely (Right to erasure)
   */
  async deleteUserData(userId: string, reason: string): Promise<void> {
    try {
      // Start transaction
      await prisma.$transaction(async (tx) => {
        // Delete user-related data in correct order
        await tx.sMSReviewComment.deleteMany({ where: { authorId: userId } });
        await tx.sMSReview.deleteMany({ where: { reviewerId: userId } });
        await tx.sMSWorkflowTask.deleteMany({ where: { assigneeId: userId } });
        await tx.sMSAuditLog.deleteMany({ where: { userId } });
        await tx.sMSIncident.deleteMany({ where: { reporterId: userId } });
        await tx.sMSTraining.deleteMany({ where: { instructorId: userId } });
        await tx.sMSRiskAssessment.deleteMany({ where: { assessorId: userId } });
        await tx.gDPRConsent.deleteMany({ where: { userId } });
        await tx.gDPRDataExport.deleteMany({ where: { userId } });

        // Create deletion record before deleting user
        await tx.gDPRDeletion.create({
          data: {
            originalUserId: userId,
            deletedAt: new Date(),
            reason,
            requestedBy: userId,
            metadata: {
              deletionMethod: 'complete_deletion',
              cascadeDeleted: true
            }
          }
        });

        // Finally delete the user
        await tx.user.delete({ where: { id: userId } });
      });

      logger.info(`User data completely deleted for GDPR compliance`, {
        userId,
        reason,
        deletedAt: new Date()
      });
    } catch (error) {
      logger.error('Failed to delete user data', error);
      throw error;
    }
  }

  /**
   * Generate GDPR compliance report
   */
  async generateComplianceReport(companyId: string): Promise<any> {
    try {
      const [
        totalUsers,
        activeConsents,
        dataExports,
        anonymizations,
        deletions
      ] = await Promise.all([
        prisma.user.count({ where: { companyId } }),
        prisma.gDPRConsent.count({ 
          where: { 
            user: { companyId },
            granted: true 
          } 
        }),
        prisma.gDPRDataExport.count({ 
          where: { user: { companyId } } 
        }),
        prisma.gDPRAnonymization.count(),
        prisma.gDPRDeletion.count()
      ]);

      const report = {
        companyId,
        reportDate: new Date(),
        metrics: {
          totalUsers,
          activeConsents,
          dataExports,
          anonymizations,
          deletions,
          complianceScore: this.calculateComplianceScore({
            totalUsers,
            activeConsents,
            dataExports
          })
        },
        recommendations: this.generateRecommendations({
          totalUsers,
          activeConsents
        })
      };

      logger.info(`GDPR compliance report generated for company ${companyId}`, {
        totalUsers,
        activeConsents,
        complianceScore: report.metrics.complianceScore
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate GDPR compliance report', error);
      throw error;
    }
  }

  private calculateComplianceScore(metrics: any): number {
    const consentRate = metrics.totalUsers > 0 ? metrics.activeConsents / metrics.totalUsers : 0;
    return Math.round(consentRate * 100);
  }

  private generateRecommendations(metrics: any): string[] {
    const recommendations = [];
    
    if (metrics.totalUsers > 0 && metrics.activeConsents / metrics.totalUsers < 0.8) {
      recommendations.push('Improve consent collection rate - currently below 80%');
    }
    
    recommendations.push('Regular GDPR compliance audits recommended');
    recommendations.push('Ensure all staff are trained on GDPR procedures');
    
    return recommendations;
  }
}
