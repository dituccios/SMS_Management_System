import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

export interface TrainingRequirement {
  id: string;
  trainingId: string;
  name: string;
  description?: string;
  isRequired: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // Assignment Rules
  departments?: string[];
  positions?: string[];
  employmentTypes?: string[];
  locations?: string[];
  customRules?: any;
  
  // Timing
  dueWithinDays?: number; // Days after assignment
  renewalPeriodDays?: number; // Renewal period
  gracePeriodDays?: number; // Grace period after due date
  
  // Prerequisites
  prerequisites?: string[]; // Other training IDs that must be completed first
  
  // Metadata
  companyId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingAssignment {
  personaId: string;
  trainingId: string;
  requirementId?: string;
  assignedDate: Date;
  dueDate?: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedBy?: string;
  reason?: string;
  metadata?: any;
}

export interface TrainingProgress {
  personaId: string;
  trainingId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'OVERDUE' | 'EXEMPT';
  progress: number; // 0-100
  startedAt?: Date;
  completedAt?: Date;
  lastAccessedAt?: Date;
  timeSpentMinutes?: number;
  attempts: number;
  score?: number;
  passingScore?: number;
  certificateIssued?: boolean;
  notes?: string;
}

export class TrainingIntegrationService extends EventEmitter {
  
  // Training Assignment Management
  async assignTrainingToPersona(assignment: TrainingAssignment): Promise<any> {
    try {
      // Check if already assigned
      const existingRecord = await prisma.trainingRecord.findFirst({
        where: {
          personaId: assignment.personaId,
          trainingId: assignment.trainingId
        }
      });

      if (existingRecord) {
        logger.warn(`Training already assigned: ${assignment.trainingId} to ${assignment.personaId}`);
        return existingRecord;
      }

      // Get training details
      const training = await prisma.sMSTraining.findUnique({
        where: { id: assignment.trainingId }
      });

      if (!training) {
        throw new Error('Training not found');
      }

      // Create training record
      const trainingRecord = await prisma.trainingRecord.create({
        data: {
          personaId: assignment.personaId,
          trainingId: assignment.trainingId,
          enrollmentDate: assignment.assignedDate,
          status: 'ENROLLED',
          isRequired: assignment.priority === 'CRITICAL' || assignment.priority === 'HIGH',
          complianceStatus: 'PENDING',
          progress: 0,
          attempts: 0,
          companyId: training.companyId,
          createdBy: assignment.assignedBy,
          metadata: {
            assignmentReason: assignment.reason,
            priority: assignment.priority,
            dueDate: assignment.dueDate,
            ...assignment.metadata
          }
        },
        include: {
          persona: true,
          training: true
        }
      });

      // Emit event for notifications
      this.emit('trainingAssigned', {
        trainingRecord,
        assignment
      });

      logger.info(`Training assigned: ${assignment.trainingId} to ${assignment.personaId}`, {
        trainingId: assignment.trainingId,
        personaId: assignment.personaId,
        priority: assignment.priority
      });

      return trainingRecord;
    } catch (error) {
      logger.error('Failed to assign training:', error);
      throw error;
    }
  }

  async bulkAssignTraining(assignments: TrainingAssignment[]): Promise<any[]> {
    try {
      const results = await Promise.allSettled(
        assignments.map(assignment => this.assignTrainingToPersona(assignment))
      );

      const successful = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);

      const failed = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason);

      if (failed.length > 0) {
        logger.warn(`Bulk assignment completed with ${failed.length} failures`, { failed });
      }

      logger.info(`Bulk training assignment completed: ${successful.length} successful, ${failed.length} failed`);

      return successful;
    } catch (error) {
      logger.error('Failed to bulk assign training:', error);
      throw error;
    }
  }

  // Automatic Training Assignment Based on Rules
  async evaluateTrainingRequirements(personaId: string): Promise<TrainingAssignment[]> {
    try {
      const persona = await prisma.personaProfile.findUnique({
        where: { id: personaId }
      });

      if (!persona) {
        throw new Error('Persona not found');
      }

      // Get all active training requirements for the company
      const requirements = await this.getTrainingRequirements(persona.companyId);
      
      const assignments: TrainingAssignment[] = [];

      for (const requirement of requirements) {
        if (await this.isPersonaEligibleForTraining(persona, requirement)) {
          // Check if already assigned
          const existingRecord = await prisma.trainingRecord.findFirst({
            where: {
              personaId: persona.id,
              trainingId: requirement.trainingId
            }
          });

          if (!existingRecord) {
            const dueDate = requirement.dueWithinDays 
              ? new Date(Date.now() + requirement.dueWithinDays * 24 * 60 * 60 * 1000)
              : undefined;

            assignments.push({
              personaId: persona.id,
              trainingId: requirement.trainingId,
              requirementId: requirement.id,
              assignedDate: new Date(),
              dueDate,
              priority: requirement.priority,
              reason: 'Automatic assignment based on requirements'
            });
          }
        }
      }

      return assignments;
    } catch (error) {
      logger.error('Failed to evaluate training requirements:', error);
      throw error;
    }
  }

  async autoAssignTrainingForPersona(personaId: string): Promise<any[]> {
    try {
      const assignments = await this.evaluateTrainingRequirements(personaId);
      
      if (assignments.length === 0) {
        return [];
      }

      const results = await this.bulkAssignTraining(assignments);

      logger.info(`Auto-assigned ${results.length} training courses to persona ${personaId}`);

      return results;
    } catch (error) {
      logger.error('Failed to auto-assign training:', error);
      throw error;
    }
  }

  // Training Progress Tracking
  async updateTrainingProgress(
    personaId: string,
    trainingId: string,
    progress: Partial<TrainingProgress>
  ): Promise<any> {
    try {
      const trainingRecord = await prisma.trainingRecord.findFirst({
        where: {
          personaId,
          trainingId
        }
      });

      if (!trainingRecord) {
        throw new Error('Training record not found');
      }

      // Calculate new status based on progress
      let newStatus = trainingRecord.status;
      if (progress.progress !== undefined) {
        if (progress.progress === 0) {
          newStatus = 'ENROLLED';
        } else if (progress.progress > 0 && progress.progress < 100) {
          newStatus = 'IN_PROGRESS';
        } else if (progress.progress === 100) {
          newStatus = 'COMPLETED';
        }
      }

      // Update compliance status
      let complianceStatus = trainingRecord.complianceStatus;
      if (newStatus === 'COMPLETED') {
        complianceStatus = 'COMPLIANT';
      } else if (progress.status === 'OVERDUE') {
        complianceStatus = 'OVERDUE';
      }

      const updatedRecord = await prisma.trainingRecord.update({
        where: { id: trainingRecord.id },
        data: {
          status: newStatus as any,
          complianceStatus: complianceStatus as any,
          progress: progress.progress ?? trainingRecord.progress,
          startDate: progress.startedAt ?? trainingRecord.startDate,
          completionDate: progress.completedAt ?? trainingRecord.completionDate,
          lastReminderDate: progress.lastAccessedAt ?? trainingRecord.lastReminderDate,
          score: progress.score ?? trainingRecord.score,
          attempts: progress.attempts ?? trainingRecord.attempts,
          notes: progress.notes ?? trainingRecord.notes,
          metadata: {
            ...trainingRecord.metadata,
            timeSpentMinutes: progress.timeSpentMinutes,
            lastAccessedAt: progress.lastAccessedAt
          }
        },
        include: {
          persona: true,
          training: true
        }
      });

      // Emit progress event
      this.emit('trainingProgressUpdated', {
        trainingRecord: updatedRecord,
        progress
      });

      // Handle completion
      if (newStatus === 'COMPLETED') {
        await this.handleTrainingCompletion(updatedRecord);
      }

      return updatedRecord;
    } catch (error) {
      logger.error('Failed to update training progress:', error);
      throw error;
    }
  }

  async handleTrainingCompletion(trainingRecord: any): Promise<void> {
    try {
      // Check if certification should be issued
      if (trainingRecord.training.category === 'CERTIFICATION' || 
          trainingRecord.metadata?.issueCertificate) {
        await this.issueCertification(trainingRecord);
      }

      // Check for dependent training
      await this.checkDependentTraining(trainingRecord);

      // Emit completion event
      this.emit('trainingCompleted', { trainingRecord });

      logger.info(`Training completed: ${trainingRecord.trainingId} by ${trainingRecord.personaId}`);
    } catch (error) {
      logger.error('Failed to handle training completion:', error);
    }
  }

  async issueCertification(trainingRecord: any): Promise<any> {
    try {
      // Check if certification already exists
      const existingCert = await prisma.certification.findFirst({
        where: {
          personaId: trainingRecord.personaId,
          name: trainingRecord.training.title
        }
      });

      if (existingCert) {
        return existingCert;
      }

      // Create certification
      const certification = await prisma.certification.create({
        data: {
          name: trainingRecord.training.title,
          description: `Certification for completing ${trainingRecord.training.title}`,
          type: 'INTERNAL',
          issuingAuthority: 'Internal Training System',
          certificateNumber: `CERT-${Date.now()}-${trainingRecord.personaId.slice(-6)}`,
          issueDate: new Date(),
          status: 'ACTIVE',
          complianceLevel: 'STANDARD',
          personaId: trainingRecord.personaId,
          companyId: trainingRecord.companyId,
          metadata: {
            trainingRecordId: trainingRecord.id,
            score: trainingRecord.score,
            completionDate: trainingRecord.completionDate
          }
        }
      });

      // Update training record
      await prisma.trainingRecord.update({
        where: { id: trainingRecord.id },
        data: {
          certificateNumber: certification.certificateNumber,
          issuedBy: 'Internal Training System'
        }
      });

      logger.info(`Certification issued: ${certification.id} for training ${trainingRecord.trainingId}`);

      return certification;
    } catch (error) {
      logger.error('Failed to issue certification:', error);
      throw error;
    }
  }

  // Training Requirements Management
  async getTrainingRequirements(companyId: string): Promise<TrainingRequirement[]> {
    try {
      // This would typically come from a training_requirements table
      // For now, we'll simulate with some default requirements
      const trainings = await prisma.sMSTraining.findMany({
        where: { companyId }
      });

      return trainings.map(training => ({
        id: `req-${training.id}`,
        trainingId: training.id,
        name: training.title,
        description: training.description,
        isRequired: training.category === 'MANDATORY',
        priority: training.category === 'SAFETY' ? 'CRITICAL' : 'MEDIUM',
        dueWithinDays: 30,
        renewalPeriodDays: 365,
        gracePeriodDays: 7,
        companyId,
        isActive: training.status === 'ACTIVE',
        createdAt: training.createdAt,
        updatedAt: training.updatedAt
      }));
    } catch (error) {
      logger.error('Failed to get training requirements:', error);
      throw error;
    }
  }

  private async isPersonaEligibleForTraining(persona: any, requirement: TrainingRequirement): Promise<boolean> {
    // Check department eligibility
    if (requirement.departments && requirement.departments.length > 0) {
      if (!requirement.departments.includes(persona.department)) {
        return false;
      }
    }

    // Check position eligibility
    if (requirement.positions && requirement.positions.length > 0) {
      if (!requirement.positions.includes(persona.position)) {
        return false;
      }
    }

    // Check employment type eligibility
    if (requirement.employmentTypes && requirement.employmentTypes.length > 0) {
      if (!requirement.employmentTypes.includes(persona.employmentType)) {
        return false;
      }
    }

    // Check prerequisites
    if (requirement.prerequisites && requirement.prerequisites.length > 0) {
      const completedTraining = await prisma.trainingRecord.findMany({
        where: {
          personaId: persona.id,
          trainingId: { in: requirement.prerequisites },
          status: 'COMPLETED'
        }
      });

      if (completedTraining.length < requirement.prerequisites.length) {
        return false;
      }
    }

    return true;
  }

  private async checkDependentTraining(trainingRecord: any): Promise<void> {
    try {
      // Find training that has this training as a prerequisite
      const requirements = await this.getTrainingRequirements(trainingRecord.companyId);
      const dependentRequirements = requirements.filter(req => 
        req.prerequisites?.includes(trainingRecord.trainingId)
      );

      if (dependentRequirements.length > 0) {
        const assignments = dependentRequirements.map(req => ({
          personaId: trainingRecord.personaId,
          trainingId: req.trainingId,
          requirementId: req.id,
          assignedDate: new Date(),
          priority: req.priority,
          reason: `Unlocked after completing ${trainingRecord.training.title}`
        }));

        await this.bulkAssignTraining(assignments);
      }
    } catch (error) {
      logger.error('Failed to check dependent training:', error);
    }
  }

  // Utility Methods
  async getPersonaTrainingStatus(personaId: string): Promise<any> {
    try {
      const trainingRecords = await prisma.trainingRecord.findMany({
        where: { personaId },
        include: {
          training: true
        },
        orderBy: { enrollmentDate: 'desc' }
      });

      const stats = {
        total: trainingRecords.length,
        completed: trainingRecords.filter(r => r.status === 'COMPLETED').length,
        inProgress: trainingRecords.filter(r => r.status === 'IN_PROGRESS').length,
        overdue: trainingRecords.filter(r => r.complianceStatus === 'OVERDUE').length,
        compliant: trainingRecords.filter(r => r.complianceStatus === 'COMPLIANT').length
      };

      return {
        stats,
        records: trainingRecords
      };
    } catch (error) {
      logger.error('Failed to get persona training status:', error);
      throw error;
    }
  }

  async getTrainingOverview(companyId: string): Promise<any> {
    try {
      const trainingRecords = await prisma.trainingRecord.findMany({
        where: { companyId },
        include: {
          training: true,
          persona: true
        }
      });

      const stats = {
        totalRecords: trainingRecords.length,
        totalPersonas: new Set(trainingRecords.map(r => r.personaId)).size,
        completionRate: trainingRecords.length > 0 
          ? (trainingRecords.filter(r => r.status === 'COMPLETED').length / trainingRecords.length) * 100 
          : 0,
        complianceRate: trainingRecords.length > 0
          ? (trainingRecords.filter(r => r.complianceStatus === 'COMPLIANT').length / trainingRecords.length) * 100
          : 0,
        overdueCount: trainingRecords.filter(r => r.complianceStatus === 'OVERDUE').length
      };

      return {
        stats,
        records: trainingRecords
      };
    } catch (error) {
      logger.error('Failed to get training overview:', error);
      throw error;
    }
  }
}

export default new TrainingIntegrationService();
