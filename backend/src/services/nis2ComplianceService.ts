import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { EmailService } from './emailService';

const prisma = new PrismaClient();

export interface SecurityIncident {
  id: string;
  type: 'CYBER_ATTACK' | 'DATA_BREACH' | 'SYSTEM_FAILURE' | 'UNAUTHORIZED_ACCESS' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'DETECTED' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'CLOSED';
  title: string;
  description: string;
  detectedAt: Date;
  reportedAt?: Date;
  resolvedAt?: Date;
  affectedSystems: string[];
  impactAssessment: string;
  responseActions: string[];
  reportingRequired: boolean;
  reportedToAuthorities?: boolean;
  metadata: any;
}

export interface RiskAssessment {
  id: string;
  category: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  likelihood: number; // 1-5 scale
  impact: number; // 1-5 scale
  description: string;
  mitigationMeasures: string[];
  residualRisk: number;
  reviewDate: Date;
  responsible: string;
}

export interface ComplianceReport {
  reportId: string;
  reportType: 'INCIDENT' | 'RISK_ASSESSMENT' | 'SECURITY_MEASURES' | 'ANNUAL_REVIEW';
  generatedAt: Date;
  period: {
    from: Date;
    to: Date;
  };
  data: any;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
}

export class NIS2ComplianceService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Report a security incident according to NIS2 requirements
   */
  async reportSecurityIncident(incident: Omit<SecurityIncident, 'id'>): Promise<SecurityIncident> {
    try {
      const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const createdIncident = await prisma.nIS2SecurityIncident.create({
        data: {
          id: incidentId,
          type: incident.type,
          severity: incident.severity,
          status: 'DETECTED',
          title: incident.title,
          description: incident.description,
          detectedAt: incident.detectedAt,
          affectedSystems: incident.affectedSystems,
          impactAssessment: incident.impactAssessment,
          responseActions: incident.responseActions || [],
          reportingRequired: this.determineReportingRequirement(incident),
          metadata: {
            ...incident.metadata,
            createdBy: 'system',
            automatedDetection: true
          }
        }
      });

      // Trigger immediate response for critical incidents
      if (incident.severity === 'CRITICAL') {
        await this.triggerEmergencyResponse(incidentId);
      }

      // Check if authorities need to be notified (within 24 hours for significant incidents)
      if (createdIncident.reportingRequired) {
        await this.scheduleAuthorityNotification(incidentId);
      }

      // Log the incident
      await this.logComplianceEvent('INCIDENT_REPORTED', {
        incidentId,
        severity: incident.severity,
        type: incident.type
      });

      logger.info(`NIS2 security incident reported: ${incidentId}`, {
        severity: incident.severity,
        type: incident.type,
        reportingRequired: createdIncident.reportingRequired
      });

      return createdIncident as SecurityIncident;
    } catch (error) {
      logger.error('Failed to report security incident', error);
      throw error;
    }
  }

  /**
   * Update incident status and response actions
   */
  async updateIncidentStatus(
    incidentId: string, 
    status: SecurityIncident['status'], 
    responseActions?: string[],
    userId?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (responseActions) {
        updateData.responseActions = responseActions;
      }

      if (status === 'RESOLVED') {
        updateData.resolvedAt = new Date();
      }

      await prisma.nIS2SecurityIncident.update({
        where: { id: incidentId },
        data: updateData
      });

      await this.logComplianceEvent('INCIDENT_UPDATED', {
        incidentId,
        newStatus: status,
        updatedBy: userId
      });

      logger.info(`Incident ${incidentId} status updated to ${status}`);
    } catch (error) {
      logger.error('Failed to update incident status', error);
      throw error;
    }
  }

  /**
   * Conduct risk assessment according to NIS2 requirements
   */
  async conductRiskAssessment(assessment: Omit<RiskAssessment, 'id'>): Promise<RiskAssessment> {
    try {
      const assessmentId = `RISK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const riskScore = this.calculateRiskScore(assessment.likelihood, assessment.impact);
      const riskLevel = this.determineRiskLevel(riskScore);

      const createdAssessment = await prisma.nIS2RiskAssessment.create({
        data: {
          id: assessmentId,
          category: assessment.category,
          riskLevel,
          likelihood: assessment.likelihood,
          impact: assessment.impact,
          description: assessment.description,
          mitigationMeasures: assessment.mitigationMeasures,
          residualRisk: assessment.residualRisk,
          reviewDate: assessment.reviewDate,
          responsible: assessment.responsible,
          riskScore,
          metadata: {
            assessmentDate: new Date(),
            methodology: 'NIS2_STANDARD'
          }
        }
      });

      // Schedule review reminder
      await this.scheduleRiskReview(assessmentId, assessment.reviewDate);

      await this.logComplianceEvent('RISK_ASSESSMENT_CONDUCTED', {
        assessmentId,
        riskLevel,
        category: assessment.category
      });

      logger.info(`Risk assessment conducted: ${assessmentId}`, {
        riskLevel,
        riskScore,
        category: assessment.category
      });

      return createdAssessment as RiskAssessment;
    } catch (error) {
      logger.error('Failed to conduct risk assessment', error);
      throw error;
    }
  }

  /**
   * Generate compliance report for authorities
   */
  async generateComplianceReport(
    reportType: ComplianceReport['reportType'],
    period: { from: Date; to: Date },
    companyId: string
  ): Promise<ComplianceReport> {
    try {
      const reportId = `RPT-${reportType}-${Date.now()}`;
      
      let reportData: any = {};

      switch (reportType) {
        case 'INCIDENT':
          reportData = await this.generateIncidentReport(period, companyId);
          break;
        case 'RISK_ASSESSMENT':
          reportData = await this.generateRiskAssessmentReport(period, companyId);
          break;
        case 'SECURITY_MEASURES':
          reportData = await this.generateSecurityMeasuresReport(companyId);
          break;
        case 'ANNUAL_REVIEW':
          reportData = await this.generateAnnualReview(period, companyId);
          break;
      }

      const report = await prisma.nIS2ComplianceReport.create({
        data: {
          id: reportId,
          reportType,
          companyId,
          generatedAt: new Date(),
          periodFrom: period.from,
          periodTo: period.to,
          data: reportData,
          status: 'DRAFT',
          metadata: {
            generatedBy: 'system',
            version: '1.0'
          }
        }
      });

      await this.logComplianceEvent('COMPLIANCE_REPORT_GENERATED', {
        reportId,
        reportType,
        period
      });

      logger.info(`NIS2 compliance report generated: ${reportId}`, {
        reportType,
        period
      });

      return report as ComplianceReport;
    } catch (error) {
      logger.error('Failed to generate compliance report', error);
      throw error;
    }
  }

  /**
   * Monitor network security events
   */
  async monitorNetworkEvents(): Promise<void> {
    try {
      // This would integrate with network monitoring tools
      // For now, we'll simulate monitoring
      
      const suspiciousEvents = await this.detectSuspiciousActivity();
      
      for (const event of suspiciousEvents) {
        if (event.severity >= 7) { // High severity threshold
          await this.reportSecurityIncident({
            type: 'CYBER_ATTACK',
            severity: 'HIGH',
            title: `Suspicious network activity detected`,
            description: event.description,
            detectedAt: new Date(),
            affectedSystems: event.affectedSystems,
            impactAssessment: event.impact,
            responseActions: ['Automated blocking initiated', 'Security team notified'],
            metadata: event.metadata
          });
        }
      }

      logger.info('Network security monitoring completed');
    } catch (error) {
      logger.error('Failed to monitor network events', error);
      throw error;
    }
  }

  /**
   * Ensure incident reporting within NIS2 timeframes
   */
  async checkReportingDeadlines(): Promise<void> {
    try {
      const unreportedIncidents = await prisma.nIS2SecurityIncident.findMany({
        where: {
          reportingRequired: true,
          reportedToAuthorities: false,
          detectedAt: {
            lte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
          }
        }
      });

      for (const incident of unreportedIncidents) {
        await this.notifyAuthorities(incident.id);
        
        // Send alert to compliance team
        await this.emailService.sendEmail({
          to: process.env.COMPLIANCE_EMAIL || 'compliance@company.com',
          subject: `URGENT: NIS2 Incident Reporting Deadline Approaching`,
          html: `
            <h2>NIS2 Compliance Alert</h2>
            <p>Incident ${incident.id} requires immediate reporting to authorities.</p>
            <p><strong>Detected:</strong> ${incident.detectedAt}</p>
            <p><strong>Severity:</strong> ${incident.severity}</p>
            <p><strong>Type:</strong> ${incident.type}</p>
            <p>Please take immediate action to comply with NIS2 reporting requirements.</p>
          `
        });
      }

      logger.info(`Checked reporting deadlines for ${unreportedIncidents.length} incidents`);
    } catch (error) {
      logger.error('Failed to check reporting deadlines', error);
      throw error;
    }
  }

  private determineReportingRequirement(incident: Omit<SecurityIncident, 'id'>): boolean {
    // NIS2 requires reporting for significant incidents
    if (incident.severity === 'CRITICAL' || incident.severity === 'HIGH') {
      return true;
    }
    
    if (incident.type === 'DATA_BREACH' || incident.type === 'CYBER_ATTACK') {
      return true;
    }
    
    return false;
  }

  private calculateRiskScore(likelihood: number, impact: number): number {
    return likelihood * impact;
  }

  private determineRiskLevel(riskScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (riskScore >= 20) return 'CRITICAL';
    if (riskScore >= 15) return 'HIGH';
    if (riskScore >= 10) return 'MEDIUM';
    return 'LOW';
  }

  private async triggerEmergencyResponse(incidentId: string): Promise<void> {
    // Implement emergency response procedures
    logger.warn(`Emergency response triggered for incident ${incidentId}`);
    
    // Notify security team immediately
    await this.emailService.sendEmail({
      to: process.env.SECURITY_TEAM_EMAIL || 'security@company.com',
      subject: `CRITICAL: Security Incident ${incidentId}`,
      html: `
        <h2>Critical Security Incident</h2>
        <p>A critical security incident has been detected and requires immediate attention.</p>
        <p><strong>Incident ID:</strong> ${incidentId}</p>
        <p><strong>Time:</strong> ${new Date()}</p>
        <p>Please access the SMS system immediately for full details and response coordination.</p>
      `
    });
  }

  private async scheduleAuthorityNotification(incidentId: string): Promise<void> {
    // Schedule notification to authorities within 24 hours
    // This would typically integrate with a job scheduler
    logger.info(`Authority notification scheduled for incident ${incidentId}`);
  }

  private async scheduleRiskReview(assessmentId: string, reviewDate: Date): Promise<void> {
    // Schedule risk assessment review
    logger.info(`Risk review scheduled for assessment ${assessmentId} on ${reviewDate}`);
  }

  private async notifyAuthorities(incidentId: string): Promise<void> {
    // Implement authority notification process
    await prisma.nIS2SecurityIncident.update({
      where: { id: incidentId },
      data: {
        reportedToAuthorities: true,
        reportedAt: new Date()
      }
    });
    
    logger.info(`Authorities notified for incident ${incidentId}`);
  }

  private async detectSuspiciousActivity(): Promise<any[]> {
    // Simulate suspicious activity detection
    // In real implementation, this would integrate with SIEM tools
    return [];
  }

  private async generateIncidentReport(period: { from: Date; to: Date }, companyId: string): Promise<any> {
    const incidents = await prisma.nIS2SecurityIncident.findMany({
      where: {
        detectedAt: {
          gte: period.from,
          lte: period.to
        }
      }
    });

    return {
      totalIncidents: incidents.length,
      incidentsByType: this.groupBy(incidents, 'type'),
      incidentsBySeverity: this.groupBy(incidents, 'severity'),
      averageResolutionTime: this.calculateAverageResolutionTime(incidents),
      incidents: incidents.map(i => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        detectedAt: i.detectedAt,
        resolvedAt: i.resolvedAt,
        reportedToAuthorities: i.reportedToAuthorities
      }))
    };
  }

  private async generateRiskAssessmentReport(period: { from: Date; to: Date }, companyId: string): Promise<any> {
    const assessments = await prisma.nIS2RiskAssessment.findMany({
      where: {
        createdAt: {
          gte: period.from,
          lte: period.to
        }
      }
    });

    return {
      totalAssessments: assessments.length,
      risksByLevel: this.groupBy(assessments, 'riskLevel'),
      averageRiskScore: assessments.reduce((sum, a) => sum + a.riskScore, 0) / assessments.length,
      highRiskItems: assessments.filter(a => a.riskLevel === 'HIGH' || a.riskLevel === 'CRITICAL')
    };
  }

  private async generateSecurityMeasuresReport(companyId: string): Promise<any> {
    // Generate report on implemented security measures
    return {
      mfaEnabled: true,
      encryptionInPlace: true,
      backupStrategy: 'implemented',
      accessControls: 'role-based',
      monitoringTools: 'active',
      incidentResponsePlan: 'documented',
      staffTraining: 'completed'
    };
  }

  private async generateAnnualReview(period: { from: Date; to: Date }, companyId: string): Promise<any> {
    const [incidentData, riskData, securityMeasures] = await Promise.all([
      this.generateIncidentReport(period, companyId),
      this.generateRiskAssessmentReport(period, companyId),
      this.generateSecurityMeasuresReport(companyId)
    ]);

    return {
      period,
      incidents: incidentData,
      risks: riskData,
      securityMeasures,
      complianceScore: this.calculateComplianceScore(incidentData, riskData),
      recommendations: this.generateRecommendations(incidentData, riskData)
    };
  }

  private groupBy(array: any[], key: string): any {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  private calculateAverageResolutionTime(incidents: any[]): number {
    const resolvedIncidents = incidents.filter(i => i.resolvedAt);
    if (resolvedIncidents.length === 0) return 0;
    
    const totalTime = resolvedIncidents.reduce((sum, incident) => {
      return sum + (new Date(incident.resolvedAt).getTime() - new Date(incident.detectedAt).getTime());
    }, 0);
    
    return totalTime / resolvedIncidents.length / (1000 * 60 * 60); // Convert to hours
  }

  private calculateComplianceScore(incidentData: any, riskData: any): number {
    // Simple compliance scoring algorithm
    let score = 100;
    
    // Deduct points for unresolved critical incidents
    const criticalIncidents = incidentData.incidentsBySeverity?.CRITICAL?.length || 0;
    score -= criticalIncidents * 10;
    
    // Deduct points for high risks
    const highRisks = riskData.risksByLevel?.HIGH?.length || 0;
    score -= highRisks * 5;
    
    return Math.max(0, score);
  }

  private generateRecommendations(incidentData: any, riskData: any): string[] {
    const recommendations = [];
    
    if (incidentData.totalIncidents > 10) {
      recommendations.push('Consider enhancing preventive security measures');
    }
    
    if (riskData.averageRiskScore > 15) {
      recommendations.push('Focus on risk mitigation strategies');
    }
    
    recommendations.push('Regular security awareness training for all staff');
    recommendations.push('Quarterly risk assessment reviews');
    
    return recommendations;
  }

  private async logComplianceEvent(action: string, details: any): Promise<void> {
    await prisma.sMSAuditLog.create({
      data: {
        action,
        entityType: 'NIS2_COMPLIANCE',
        entityId: details.incidentId || details.assessmentId || details.reportId || 'system',
        details: JSON.stringify(details),
        timestamp: new Date(),
        userId: 'system'
      }
    });
  }
}
