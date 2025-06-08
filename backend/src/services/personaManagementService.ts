import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import dataAnonymizationService from '../utils/dataAnonymization';
import { GDPRService } from './gdprService';
import dynamicFieldService from './dynamicFieldService';

const prisma = new PrismaClient();

export interface PersonaProfileData {
  employeeId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  nationalId?: string;
  address?: any;
  emergencyContact?: any;
  department?: string;
  position?: string;
  employmentType?: string;
  startDate?: Date;
  endDate?: Date;
  managerId?: string;
  dataProcessingConsent: boolean;
  marketingConsent?: boolean;
  consentVersion?: string;
  customFields?: Record<string, any>; // Dynamic custom fields
}

export interface TrainingRecordData {
  trainingId: string;
  personaId: string;
  enrollmentDate?: Date;
  startDate?: Date;
  completionDate?: Date;
  expiryDate?: Date;
  status?: string;
  progress?: number;
  score?: number;
  isRequired?: boolean;
  metadata?: any;
  notes?: string;
}

export interface CertificationData {
  name: string;
  description?: string;
  type: string;
  category?: string;
  issuingAuthority: string;
  certificateNumber: string;
  issueDate: Date;
  expiryDate?: Date;
  validityPeriod?: number;
  status?: string;
  complianceLevel?: string;
  isRegulatory?: boolean;
  certificateUrl?: string;
  personaId: string;
}

export interface CompetencyData {
  name: string;
  description?: string;
  category: string;
  type?: string;
  currentLevel?: string;
  targetLevel?: string;
  assessmentDate?: Date;
  nextAssessmentDate?: Date;
  score?: number;
  evidenceUrl?: string;
  validatedBy?: string;
  validationDate?: Date;
  developmentPlan?: any;
  trainingRequired?: boolean;
  status?: string;
  priority?: string;
  personaId: string;
}

export class PersonaManagementService {
  private gdprService: GDPRService;

  constructor() {
    this.gdprService = new GDPRService();
  }

  // PersonaProfile Management
  async createPersonaProfile(data: PersonaProfileData, companyId: string, createdBy?: string): Promise<any> {
    try {
      // Validate required consents
      if (!data.dataProcessingConsent) {
        throw new Error('Data processing consent is required');
      }

      // Separate custom fields from core data
      const { customFields, ...coreData } = data;

      // Encrypt sensitive data before storing
      const encryptedData = await this.encryptSensitiveFields(coreData);

      const personaProfile = await prisma.personaProfile.create({
        data: {
          ...encryptedData,
          companyId,
          createdBy,
          consentTimestamp: new Date(),
          profileCompleteness: this.calculateProfileCompleteness(data),
          dataRetentionUntil: this.calculateDataRetentionDate(data.employmentType)
        },
        include: {
          company: true,
          user: true,
          trainingRecords: true,
          certifications: true,
          competencies: true
        }
      });

      // Store custom fields using dynamic field service
      if (customFields && Object.keys(customFields).length > 0) {
        await dynamicFieldService.setFieldValuesForEntity(
          'PERSONA',
          personaProfile.id,
          companyId,
          customFields,
          createdBy
        );
      }

      // Record GDPR consent
      await this.gdprService.recordConsent({
        userId: personaProfile.id,
        consentType: 'DATA_PROCESSING',
        granted: data.dataProcessingConsent,
        timestamp: new Date(),
        version: data.consentVersion || '1.0'
      });

      if (data.marketingConsent) {
        await this.gdprService.recordConsent({
          userId: personaProfile.id,
          consentType: 'MARKETING',
          granted: data.marketingConsent,
          timestamp: new Date(),
          version: data.consentVersion || '1.0'
        });
      }

      logger.info(`PersonaProfile created: ${personaProfile.id}`, {
        companyId,
        createdBy,
        hasConsent: data.dataProcessingConsent,
        hasCustomFields: !!customFields
      });

      return personaProfile;
    } catch (error) {
      logger.error('Failed to create persona profile:', error);
      throw error;
    }
  }

  async getPersonaProfile(id: string, includeDecrypted = false): Promise<any> {
    try {
      const personaProfile = await prisma.personaProfile.findUnique({
        where: { id },
        include: {
          company: true,
          user: true,
          trainingRecords: {
            include: {
              training: true
            }
          },
          certifications: true,
          competencies: true,
          consentRecords: true
        }
      });

      if (!personaProfile) {
        throw new Error('PersonaProfile not found');
      }

      // Get custom fields
      const customFields = await dynamicFieldService.getFieldValuesForEntity(
        'PERSONA',
        id,
        personaProfile.companyId
      );

      let processedProfile = personaProfile;

      // Decrypt sensitive fields if requested and authorized
      if (includeDecrypted) {
        const decryptedData = await this.decryptSensitiveFields(personaProfile);
        processedProfile = { ...personaProfile, ...decryptedData };
      } else {
        // Return masked data for display
        processedProfile = this.maskSensitiveData(personaProfile);
      }

      // Add custom fields to the profile
      return {
        ...processedProfile,
        customFields
      };
    } catch (error) {
      logger.error('Failed to get persona profile:', error);
      throw error;
    }
  }

  async updatePersonaProfile(id: string, data: Partial<PersonaProfileData>, updatedBy?: string): Promise<any> {
    try {
      const existingProfile = await prisma.personaProfile.findUnique({
        where: { id }
      });

      if (!existingProfile) {
        throw new Error('PersonaProfile not found');
      }

      // Encrypt sensitive data if provided
      const encryptedData = await this.encryptSensitiveFields(data);

      const updatedProfile = await prisma.personaProfile.update({
        where: { id },
        data: {
          ...encryptedData,
          updatedBy,
          profileCompleteness: this.calculateProfileCompleteness({ ...existingProfile, ...data })
        },
        include: {
          company: true,
          user: true,
          trainingRecords: true,
          certifications: true,
          competencies: true
        }
      });

      logger.info(`PersonaProfile updated: ${id}`, { updatedBy });

      return this.maskSensitiveData(updatedProfile);
    } catch (error) {
      logger.error('Failed to update persona profile:', error);
      throw error;
    }
  }

  async deletePersonaProfile(id: string, reason: string, deletedBy?: string): Promise<void> {
    try {
      // Check if profile exists
      const profile = await prisma.personaProfile.findUnique({
        where: { id }
      });

      if (!profile) {
        throw new Error('PersonaProfile not found');
      }

      // Anonymize instead of delete to maintain referential integrity
      await this.anonymizePersonaProfile(id, reason, deletedBy);

      logger.info(`PersonaProfile anonymized: ${id}`, { reason, deletedBy });
    } catch (error) {
      logger.error('Failed to delete persona profile:', error);
      throw error;
    }
  }

  async anonymizePersonaProfile(id: string, reason: string, requestedBy?: string): Promise<void> {
    try {
      const profile = await prisma.personaProfile.findUnique({
        where: { id }
      });

      if (!profile) {
        throw new Error('PersonaProfile not found');
      }

      // Generate anonymized data
      const anonymizedData = await dataAnonymizationService.anonymizePersonalData(profile, {
        method: 'ANONYMIZATION',
        preserveFormat: false
      });

      // Update profile with anonymized data
      await prisma.personaProfile.update({
        where: { id },
        data: {
          ...anonymizedData,
          status: 'TERMINATED',
          isActive: false,
          anonymizationDate: new Date(),
          updatedBy: requestedBy
        }
      });

      // Record anonymization
      await prisma.dataAnonymization.create({
        data: {
          originalPersonaId: id,
          anonymizationMethod: 'FULL_ANONYMIZATION',
          reason,
          fieldsAnonymized: ['firstName', 'lastName', 'email', 'phoneNumber', 'dateOfBirth', 'nationalId', 'address'],
          anonymizationDate: new Date(),
          requestedBy,
          companyId: profile.companyId,
          metadata: {
            originalEmail: profile.email,
            anonymizationReason: reason
          }
        }
      });

      logger.info(`PersonaProfile anonymized: ${id}`, { reason, requestedBy });
    } catch (error) {
      logger.error('Failed to anonymize persona profile:', error);
      throw error;
    }
  }

  // Training Records Management
  async createTrainingRecord(data: TrainingRecordData, companyId: string, createdBy?: string): Promise<any> {
    try {
      const trainingRecord = await prisma.trainingRecord.create({
        data: {
          ...data,
          companyId,
          createdBy,
          complianceStatus: data.isRequired ? 'PENDING' : 'EXEMPT'
        },
        include: {
          training: true,
          persona: true
        }
      });

      logger.info(`TrainingRecord created: ${trainingRecord.id}`, {
        personaId: data.personaId,
        trainingId: data.trainingId,
        companyId
      });

      return trainingRecord;
    } catch (error) {
      logger.error('Failed to create training record:', error);
      throw error;
    }
  }

  async updateTrainingRecord(id: string, data: Partial<TrainingRecordData>, updatedBy?: string): Promise<any> {
    try {
      const updatedRecord = await prisma.trainingRecord.update({
        where: { id },
        data: {
          ...data,
          updatedBy,
          // Update compliance status based on completion
          complianceStatus: data.completionDate ? 'COMPLIANT' : 
                           data.expiryDate && new Date() > data.expiryDate ? 'OVERDUE' : 'PENDING'
        },
        include: {
          training: true,
          persona: true
        }
      });

      logger.info(`TrainingRecord updated: ${id}`, { updatedBy });

      return updatedRecord;
    } catch (error) {
      logger.error('Failed to update training record:', error);
      throw error;
    }
  }

  async getTrainingRecords(companyId: string, filters?: any): Promise<any[]> {
    try {
      const where: any = { companyId };

      if (filters?.personaId) where.personaId = filters.personaId;
      if (filters?.trainingId) where.trainingId = filters.trainingId;
      if (filters?.status) where.status = filters.status;
      if (filters?.complianceStatus) where.complianceStatus = filters.complianceStatus;
      if (filters?.isRequired !== undefined) where.isRequired = filters.isRequired;

      const trainingRecords = await prisma.trainingRecord.findMany({
        where,
        include: {
          training: true,
          persona: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              department: true,
              position: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return trainingRecords.map(record => ({
        ...record,
        persona: this.maskSensitiveData(record.persona)
      }));
    } catch (error) {
      logger.error('Failed to get training records:', error);
      throw error;
    }
  }

  // Certification Management
  async createCertification(data: CertificationData, companyId: string, createdBy?: string): Promise<any> {
    try {
      const certification = await prisma.certification.create({
        data: {
          ...data,
          companyId,
          createdBy
        },
        include: {
          persona: true
        }
      });

      logger.info(`Certification created: ${certification.id}`, {
        personaId: data.personaId,
        certificateNumber: data.certificateNumber,
        companyId
      });

      return certification;
    } catch (error) {
      logger.error('Failed to create certification:', error);
      throw error;
    }
  }

  async getCertifications(companyId: string, filters?: any): Promise<any[]> {
    try {
      const where: any = { companyId };

      if (filters?.personaId) where.personaId = filters.personaId;
      if (filters?.type) where.type = filters.type;
      if (filters?.status) where.status = filters.status;
      if (filters?.category) where.category = filters.category;
      if (filters?.isRegulatory !== undefined) where.isRegulatory = filters.isRegulatory;

      const certifications = await prisma.certification.findMany({
        where,
        include: {
          persona: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              department: true,
              position: true
            }
          }
        },
        orderBy: { issueDate: 'desc' }
      });

      return certifications.map(cert => ({
        ...cert,
        persona: this.maskSensitiveData(cert.persona)
      }));
    } catch (error) {
      logger.error('Failed to get certifications:', error);
      throw error;
    }
  }

  // Competency Management
  async createCompetency(data: CompetencyData, companyId: string, createdBy?: string): Promise<any> {
    try {
      const competency = await prisma.personaCompetency.create({
        data: {
          ...data,
          companyId,
          createdBy
        },
        include: {
          persona: true
        }
      });

      logger.info(`Competency created: ${competency.id}`, {
        personaId: data.personaId,
        name: data.name,
        companyId
      });

      return competency;
    } catch (error) {
      logger.error('Failed to create competency:', error);
      throw error;
    }
  }

  // Compliance and Analytics
  async getComplianceOverview(companyId: string): Promise<any> {
    try {
      const [
        totalPersonas,
        activePersonas,
        trainingCompliance,
        certificationStatus,
        competencyStats
      ] = await Promise.all([
        prisma.personaProfile.count({ where: { companyId } }),
        prisma.personaProfile.count({ where: { companyId, status: 'ACTIVE' } }),
        this.getTrainingComplianceStats(companyId),
        this.getCertificationStatusStats(companyId),
        this.getCompetencyStats(companyId)
      ]);

      return {
        totalPersonas,
        activePersonas,
        trainingCompliance,
        certificationStatus,
        competencyStats,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to get compliance overview:', error);
      throw error;
    }
  }

  // Private helper methods
  private async encryptSensitiveFields(data: any): Promise<any> {
    // In production, implement proper encryption for sensitive fields
    // For now, return data as-is (encryption would be implemented here)
    return data;
  }

  private async decryptSensitiveFields(data: any): Promise<any> {
    // In production, implement proper decryption for sensitive fields
    // For now, return data as-is (decryption would be implemented here)
    return data;
  }

  private maskSensitiveData(data: any): any {
    return dataAnonymizationService.maskSensitiveData(data, 'PARTIAL');
  }

  private calculateProfileCompleteness(data: any): number {
    const requiredFields = ['firstName', 'lastName', 'email', 'department', 'position', 'employmentType'];
    const optionalFields = ['phoneNumber', 'dateOfBirth', 'address', 'emergencyContact', 'startDate'];
    
    const completedRequired = requiredFields.filter(field => data[field]).length;
    const completedOptional = optionalFields.filter(field => data[field]).length;
    
    const requiredWeight = 0.7;
    const optionalWeight = 0.3;
    
    const requiredScore = (completedRequired / requiredFields.length) * requiredWeight;
    const optionalScore = (completedOptional / optionalFields.length) * optionalWeight;
    
    return Math.round((requiredScore + optionalScore) * 100);
  }

  private calculateDataRetentionDate(employmentType?: string): Date {
    const now = new Date();
    const retentionPeriods = {
      'FULL_TIME': 7 * 365, // 7 years
      'PART_TIME': 5 * 365, // 5 years
      'CONTRACT': 3 * 365,  // 3 years
      'TEMPORARY': 2 * 365, // 2 years
      'INTERN': 1 * 365,    // 1 year
      'CONSULTANT': 3 * 365 // 3 years
    };
    
    const days = retentionPeriods[employmentType as keyof typeof retentionPeriods] || 5 * 365;
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private async getTrainingComplianceStats(companyId: string): Promise<any> {
    const stats = await prisma.trainingRecord.groupBy({
      by: ['complianceStatus'],
      where: { companyId },
      _count: true
    });

    return stats.reduce((acc, stat) => {
      acc[stat.complianceStatus] = stat._count;
      return acc;
    }, {} as any);
  }

  private async getCertificationStatusStats(companyId: string): Promise<any> {
    const stats = await prisma.certification.groupBy({
      by: ['status'],
      where: { companyId },
      _count: true
    });

    return stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count;
      return acc;
    }, {} as any);
  }

  private async getCompetencyStats(companyId: string): Promise<any> {
    const stats = await prisma.personaCompetency.groupBy({
      by: ['currentLevel'],
      where: { companyId },
      _count: true
    });

    return stats.reduce((acc, stat) => {
      acc[stat.currentLevel] = stat._count;
      return acc;
    }, {} as any);
  }
}

export default new PersonaManagementService();
