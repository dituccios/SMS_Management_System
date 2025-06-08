import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';
import trainingIntegrationService from './trainingIntegrationService';

const prisma = new PrismaClient();

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  type: 'TRAINING' | 'CERTIFICATION' | 'DOCUMENT' | 'CUSTOM';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // Rule Definition
  conditions: any; // JSON object defining the conditions
  actions: any; // JSON object defining actions to take
  
  // Scope
  departments?: string[];
  positions?: string[];
  employmentTypes?: string[];
  locations?: string[];
  
  // Timing
  evaluationFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  gracePeriodDays?: number;
  warningDays?: number; // Days before due date to send warning
  
  // Status
  isActive: boolean;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceViolation {
  id: string;
  ruleId: string;
  personaId: string;
  violationType: 'OVERDUE' | 'MISSING' | 'EXPIRED' | 'INCOMPLETE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  dueDate?: Date;
  detectedAt: Date;
  resolvedAt?: Date;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'WAIVED';
  assignedTo?: string;
  notes?: string;
  metadata?: any;
}

export interface ComplianceStatus {
  personaId: string;
  overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'AT_RISK' | 'UNKNOWN';
  complianceScore: number; // 0-100
  lastEvaluated: Date;
  violations: ComplianceViolation[];
  upcomingDeadlines: any[];
  recommendations: string[];
}

export class ComplianceEngine extends EventEmitter {
  
  // Compliance Evaluation
  async evaluatePersonaCompliance(personaId: string): Promise<ComplianceStatus> {
    try {
      const persona = await prisma.personaProfile.findUnique({
        where: { id: personaId },
        include: {
          trainingRecords: {
            include: { training: true }
          },
          certifications: true
        }
      });

      if (!persona) {
        throw new Error('Persona not found');
      }

      // Get applicable compliance rules
      const rules = await this.getApplicableRules(persona);
      
      // Evaluate each rule
      const violations: ComplianceViolation[] = [];
      const upcomingDeadlines: any[] = [];
      let totalScore = 0;
      let maxScore = 0;

      for (const rule of rules) {
        const evaluation = await this.evaluateRule(persona, rule);
        
        if (evaluation.violations.length > 0) {
          violations.push(...evaluation.violations);
        }
        
        if (evaluation.upcomingDeadlines.length > 0) {
          upcomingDeadlines.push(...evaluation.upcomingDeadlines);
        }
        
        totalScore += evaluation.score;
        maxScore += evaluation.maxScore;
      }

      // Calculate overall compliance score
      const complianceScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 100;
      
      // Determine overall status
      let overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'AT_RISK' | 'UNKNOWN' = 'COMPLIANT';
      
      if (violations.some(v => v.severity === 'CRITICAL')) {
        overallStatus = 'NON_COMPLIANT';
      } else if (violations.some(v => v.severity === 'HIGH') || complianceScore < 80) {
        overallStatus = 'AT_RISK';
      } else if (violations.length > 0 || complianceScore < 95) {
        overallStatus = 'AT_RISK';
      }

      // Generate recommendations
      const recommendations = this.generateRecommendations(violations, upcomingDeadlines);

      const complianceStatus: ComplianceStatus = {
        personaId,
        overallStatus,
        complianceScore,
        lastEvaluated: new Date(),
        violations,
        upcomingDeadlines,
        recommendations
      };

      // Store compliance status
      await this.storeComplianceStatus(complianceStatus);

      // Emit compliance event
      this.emit('complianceEvaluated', { personaId, complianceStatus });

      return complianceStatus;
    } catch (error) {
      logger.error('Failed to evaluate persona compliance:', error);
      throw error;
    }
  }

  async evaluateCompanyCompliance(companyId: string): Promise<any> {
    try {
      const personas = await prisma.personaProfile.findMany({
        where: { 
          companyId,
          status: 'ACTIVE'
        }
      });

      const evaluations = await Promise.allSettled(
        personas.map(persona => this.evaluatePersonaCompliance(persona.id))
      );

      const successful = evaluations
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<ComplianceStatus>).value);

      const failed = evaluations
        .filter(result => result.status === 'rejected')
        .length;

      // Calculate company-wide statistics
      const stats = {
        totalPersonas: personas.length,
        evaluated: successful.length,
        failed,
        compliant: successful.filter(s => s.overallStatus === 'COMPLIANT').length,
        atRisk: successful.filter(s => s.overallStatus === 'AT_RISK').length,
        nonCompliant: successful.filter(s => s.overallStatus === 'NON_COMPLIANT').length,
        averageScore: successful.length > 0 
          ? successful.reduce((sum, s) => sum + s.complianceScore, 0) / successful.length 
          : 0,
        totalViolations: successful.reduce((sum, s) => sum + s.violations.length, 0),
        criticalViolations: successful.reduce((sum, s) => 
          sum + s.violations.filter(v => v.severity === 'CRITICAL').length, 0
        )
      };

      return {
        companyId,
        evaluatedAt: new Date(),
        stats,
        personaStatuses: successful
      };
    } catch (error) {
      logger.error('Failed to evaluate company compliance:', error);
      throw error;
    }
  }

  // Rule Evaluation
  private async evaluateRule(persona: any, rule: ComplianceRule): Promise<any> {
    const violations: ComplianceViolation[] = [];
    const upcomingDeadlines: any[] = [];
    let score = 0;
    let maxScore = 100;

    try {
      switch (rule.type) {
        case 'TRAINING':
          return await this.evaluateTrainingRule(persona, rule);
        case 'CERTIFICATION':
          return await this.evaluateCertificationRule(persona, rule);
        case 'DOCUMENT':
          return await this.evaluateDocumentRule(persona, rule);
        case 'CUSTOM':
          return await this.evaluateCustomRule(persona, rule);
        default:
          logger.warn(`Unknown rule type: ${rule.type}`);
          return { violations, upcomingDeadlines, score: maxScore, maxScore };
      }
    } catch (error) {
      logger.error(`Failed to evaluate rule ${rule.id}:`, error);
      return { violations, upcomingDeadlines, score: 0, maxScore };
    }
  }

  private async evaluateTrainingRule(persona: any, rule: ComplianceRule): Promise<any> {
    const violations: ComplianceViolation[] = [];
    const upcomingDeadlines: any[] = [];
    let score = 0;
    let maxScore = 100;

    // Get required training for this persona based on rule conditions
    const requiredTrainingIds = rule.conditions.requiredTraining || [];
    
    for (const trainingId of requiredTrainingIds) {
      const trainingRecord = persona.trainingRecords.find((tr: any) => tr.trainingId === trainingId);
      
      if (!trainingRecord) {
        // Missing training
        violations.push({
          id: `violation-${Date.now()}-${Math.random()}`,
          ruleId: rule.id,
          personaId: persona.id,
          violationType: 'MISSING',
          severity: rule.priority,
          description: `Required training not assigned: ${trainingId}`,
          detectedAt: new Date(),
          status: 'OPEN'
        });
        score += 0;
      } else if (trainingRecord.status !== 'COMPLETED') {
        // Check if overdue
        const dueDate = trainingRecord.metadata?.dueDate 
          ? new Date(trainingRecord.metadata.dueDate)
          : null;
        
        if (dueDate && dueDate < new Date()) {
          violations.push({
            id: `violation-${Date.now()}-${Math.random()}`,
            ruleId: rule.id,
            personaId: persona.id,
            violationType: 'OVERDUE',
            severity: rule.priority,
            description: `Training overdue: ${trainingRecord.training.title}`,
            dueDate,
            detectedAt: new Date(),
            status: 'OPEN'
          });
          score += 25; // Partial credit for being assigned
        } else if (dueDate) {
          // Check for upcoming deadline
          const warningDate = new Date(dueDate.getTime() - (rule.warningDays || 7) * 24 * 60 * 60 * 1000);
          
          if (new Date() >= warningDate) {
            upcomingDeadlines.push({
              type: 'TRAINING',
              trainingId,
              trainingTitle: trainingRecord.training.title,
              dueDate,
              daysRemaining: Math.ceil((dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
            });
          }
          
          score += 75; // Good progress
        } else {
          score += 50; // In progress but no due date
        }
      } else {
        // Completed - check if still valid (not expired)
        const completionDate = new Date(trainingRecord.completionDate);
        const validityPeriod = rule.conditions.validityDays || 365;
        const expiryDate = new Date(completionDate.getTime() + validityPeriod * 24 * 60 * 60 * 1000);
        
        if (expiryDate < new Date()) {
          violations.push({
            id: `violation-${Date.now()}-${Math.random()}`,
            ruleId: rule.id,
            personaId: persona.id,
            violationType: 'EXPIRED',
            severity: rule.priority,
            description: `Training expired: ${trainingRecord.training.title}`,
            dueDate: expiryDate,
            detectedAt: new Date(),
            status: 'OPEN'
          });
          score += 50; // Partial credit for previous completion
        } else {
          score += 100; // Fully compliant
        }
      }
    }

    // Average score across all required training
    const finalScore = requiredTrainingIds.length > 0 
      ? score / requiredTrainingIds.length 
      : 100;

    return { violations, upcomingDeadlines, score: finalScore, maxScore };
  }

  private async evaluateCertificationRule(persona: any, rule: ComplianceRule): Promise<any> {
    const violations: ComplianceViolation[] = [];
    const upcomingDeadlines: any[] = [];
    let score = 100;
    const maxScore = 100;

    const requiredCertifications = rule.conditions.requiredCertifications || [];
    
    for (const certName of requiredCertifications) {
      const certification = persona.certifications.find((cert: any) => 
        cert.name === certName && cert.status === 'ACTIVE'
      );
      
      if (!certification) {
        violations.push({
          id: `violation-${Date.now()}-${Math.random()}`,
          ruleId: rule.id,
          personaId: persona.id,
          violationType: 'MISSING',
          severity: rule.priority,
          description: `Required certification missing: ${certName}`,
          detectedAt: new Date(),
          status: 'OPEN'
        });
        score = 0;
      } else if (certification.expiryDate) {
        const expiryDate = new Date(certification.expiryDate);
        
        if (expiryDate < new Date()) {
          violations.push({
            id: `violation-${Date.now()}-${Math.random()}`,
            ruleId: rule.id,
            personaId: persona.id,
            violationType: 'EXPIRED',
            severity: rule.priority,
            description: `Certification expired: ${certName}`,
            dueDate: expiryDate,
            detectedAt: new Date(),
            status: 'OPEN'
          });
          score = 25;
        } else {
          // Check for upcoming expiry
          const warningDate = new Date(expiryDate.getTime() - (rule.warningDays || 30) * 24 * 60 * 60 * 1000);
          
          if (new Date() >= warningDate) {
            upcomingDeadlines.push({
              type: 'CERTIFICATION',
              certificationId: certification.id,
              certificationName: certName,
              expiryDate,
              daysRemaining: Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
            });
          }
        }
      }
    }

    return { violations, upcomingDeadlines, score, maxScore };
  }

  private async evaluateDocumentRule(persona: any, rule: ComplianceRule): Promise<any> {
    // Placeholder for document compliance evaluation
    return { violations: [], upcomingDeadlines: [], score: 100, maxScore: 100 };
  }

  private async evaluateCustomRule(persona: any, rule: ComplianceRule): Promise<any> {
    // Placeholder for custom rule evaluation
    return { violations: [], upcomingDeadlines: [], score: 100, maxScore: 100 };
  }

  // Rule Management
  private async getApplicableRules(persona: any): Promise<ComplianceRule[]> {
    // This would typically come from a compliance_rules table
    // For now, we'll create some default rules based on the persona's attributes
    
    const defaultRules: ComplianceRule[] = [
      {
        id: 'safety-training-rule',
        name: 'Safety Training Requirement',
        description: 'All employees must complete safety training',
        type: 'TRAINING',
        priority: 'CRITICAL',
        conditions: {
          requiredTraining: [], // Would be populated from actual training IDs
          validityDays: 365
        },
        actions: {},
        evaluationFrequency: 'MONTHLY',
        warningDays: 30,
        isActive: true,
        companyId: persona.companyId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Filter rules based on persona attributes
    return defaultRules.filter(rule => {
      if (rule.departments && !rule.departments.includes(persona.department)) {
        return false;
      }
      if (rule.positions && !rule.positions.includes(persona.position)) {
        return false;
      }
      if (rule.employmentTypes && !rule.employmentTypes.includes(persona.employmentType)) {
        return false;
      }
      return rule.isActive;
    });
  }

  private generateRecommendations(violations: ComplianceViolation[], upcomingDeadlines: any[]): string[] {
    const recommendations: string[] = [];

    // Critical violations
    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
    if (criticalViolations.length > 0) {
      recommendations.push(`Address ${criticalViolations.length} critical compliance violation(s) immediately`);
    }

    // Overdue items
    const overdueViolations = violations.filter(v => v.violationType === 'OVERDUE');
    if (overdueViolations.length > 0) {
      recommendations.push(`Complete ${overdueViolations.length} overdue training requirement(s)`);
    }

    // Upcoming deadlines
    const urgentDeadlines = upcomingDeadlines.filter(d => d.daysRemaining <= 7);
    if (urgentDeadlines.length > 0) {
      recommendations.push(`${urgentDeadlines.length} deadline(s) approaching within 7 days`);
    }

    // Missing requirements
    const missingViolations = violations.filter(v => v.violationType === 'MISSING');
    if (missingViolations.length > 0) {
      recommendations.push(`Enroll in ${missingViolations.length} required training course(s)`);
    }

    return recommendations;
  }

  private async storeComplianceStatus(status: ComplianceStatus): Promise<void> {
    try {
      // Store in a compliance_status table or update persona record
      await prisma.personaProfile.update({
        where: { id: status.personaId },
        data: {
          metadata: {
            complianceStatus: status.overallStatus,
            complianceScore: status.complianceScore,
            lastComplianceEvaluation: status.lastEvaluated,
            violationCount: status.violations.length
          }
        }
      });
    } catch (error) {
      logger.error('Failed to store compliance status:', error);
    }
  }

  // Violation Management
  async resolveViolation(violationId: string, resolvedBy: string, notes?: string): Promise<void> {
    try {
      // In a real implementation, this would update a violations table
      this.emit('violationResolved', { violationId, resolvedBy, notes });
      
      logger.info(`Compliance violation resolved: ${violationId} by ${resolvedBy}`);
    } catch (error) {
      logger.error('Failed to resolve violation:', error);
      throw error;
    }
  }

  async getComplianceReport(companyId: string, options?: any): Promise<any> {
    try {
      const companyCompliance = await this.evaluateCompanyCompliance(companyId);
      
      return {
        ...companyCompliance,
        generatedAt: new Date(),
        reportType: 'COMPLIANCE_OVERVIEW',
        options
      };
    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      throw error;
    }
  }
}

export default new ComplianceEngine();
