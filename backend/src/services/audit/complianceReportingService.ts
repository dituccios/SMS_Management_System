import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import elasticsearchService from './elasticsearchService';
import auditLoggingService from './auditLoggingService';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface ComplianceFramework {
  name: string;
  version: string;
  requirements: ComplianceRequirement[];
  controls: ComplianceControl[];
  reportingPeriod: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
}

export interface ComplianceRequirement {
  id: string;
  title: string;
  description: string;
  category: string;
  mandatory: boolean;
  evidenceTypes: string[];
  auditCriteria: AuditCriteria[];
}

export interface ComplianceControl {
  id: string;
  title: string;
  description: string;
  controlType: 'PREVENTIVE' | 'DETECTIVE' | 'CORRECTIVE';
  automationLevel: 'MANUAL' | 'SEMI_AUTOMATED' | 'AUTOMATED';
  testingFrequency: string;
  owner: string;
}

export interface AuditCriteria {
  eventTypes: string[];
  categories: string[];
  conditions: any[];
  timeframe: string;
  threshold?: number;
}

export interface ComplianceReport {
  id: string;
  framework: string;
  version: string;
  reportPeriod: {
    start: Date;
    end: Date;
  };
  generatedAt: Date;
  generatedBy: string;
  companyId: string;
  status: 'DRAFT' | 'FINAL' | 'SUBMITTED';
  overallScore: number;
  findings: ComplianceFinding[];
  evidence: ComplianceEvidence[];
  recommendations: string[];
  digitalSignature: string;
  checksum: string;
}

export interface ComplianceFinding {
  requirementId: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NOT_APPLICABLE';
  score: number;
  evidence: string[];
  gaps: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  remediation: string[];
}

export interface ComplianceEvidence {
  id: string;
  type: 'AUDIT_LOG' | 'DOCUMENT' | 'SCREENSHOT' | 'CONFIGURATION' | 'POLICY';
  source: string;
  description: string;
  collectedAt: Date;
  hash: string;
  metadata: any;
}

export class ComplianceReportingService {
  private frameworks: Map<string, ComplianceFramework> = new Map();

  constructor() {
    this.initializeFrameworks();
  }

  // Framework Management
  async registerFramework(framework: ComplianceFramework): Promise<void> {
    try {
      this.frameworks.set(framework.name, framework);
      
      logger.info(`Compliance framework registered: ${framework.name}`, {
        version: framework.version,
        requirements: framework.requirements.length
      });
    } catch (error) {
      logger.error('Failed to register compliance framework:', error);
      throw error;
    }
  }

  async getFrameworks(): Promise<ComplianceFramework[]> {
    return Array.from(this.frameworks.values());
  }

  // Compliance Assessment
  async assessCompliance(
    companyId: string,
    frameworkName: string,
    reportPeriod: { start: Date; end: Date },
    assessedBy: string
  ): Promise<ComplianceReport> {
    try {
      const framework = this.frameworks.get(frameworkName);
      if (!framework) {
        throw new Error(`Framework not found: ${frameworkName}`);
      }

      const reportId = crypto.randomUUID();
      const findings: ComplianceFinding[] = [];
      const evidence: ComplianceEvidence[] = [];

      // Assess each requirement
      for (const requirement of framework.requirements) {
        const finding = await this.assessRequirement(
          requirement,
          companyId,
          reportPeriod
        );
        findings.push(finding);

        // Collect evidence for this requirement
        const reqEvidence = await this.collectEvidence(
          requirement,
          companyId,
          reportPeriod
        );
        evidence.push(...reqEvidence);
      }

      // Calculate overall compliance score
      const overallScore = this.calculateOverallScore(findings);

      // Generate recommendations
      const recommendations = this.generateRecommendations(findings);

      const report: ComplianceReport = {
        id: reportId,
        framework: frameworkName,
        version: framework.version,
        reportPeriod,
        generatedAt: new Date(),
        generatedBy: assessedBy,
        companyId,
        status: 'DRAFT',
        overallScore,
        findings,
        evidence,
        recommendations,
        digitalSignature: '',
        checksum: ''
      };

      // Generate digital signature and checksum
      report.checksum = this.calculateChecksum(report);
      report.digitalSignature = this.generateDigitalSignature(report);

      // Store report
      await this.storeComplianceReport(report);

      logger.info(`Compliance assessment completed: ${reportId}`, {
        framework: frameworkName,
        companyId,
        overallScore,
        findings: findings.length
      });

      return report;
    } catch (error) {
      logger.error('Failed to assess compliance:', error);
      throw error;
    }
  }

  private async assessRequirement(
    requirement: ComplianceRequirement,
    companyId: string,
    reportPeriod: { start: Date; end: Date }
  ): Promise<ComplianceFinding> {
    try {
      const evidence: string[] = [];
      const gaps: string[] = [];
      let score = 0;
      let status: ComplianceFinding['status'] = 'NON_COMPLIANT';

      // Evaluate each audit criteria
      for (const criteria of requirement.auditCriteria) {
        const criteriaResult = await this.evaluateAuditCriteria(
          criteria,
          companyId,
          reportPeriod
        );

        if (criteriaResult.compliant) {
          evidence.push(criteriaResult.evidence);
          score += criteriaResult.score;
        } else {
          gaps.push(criteriaResult.gap);
        }
      }

      // Determine compliance status
      const maxScore = requirement.auditCriteria.length * 100;
      const compliancePercentage = (score / maxScore) * 100;

      if (compliancePercentage >= 95) {
        status = 'COMPLIANT';
      } else if (compliancePercentage >= 70) {
        status = 'PARTIALLY_COMPLIANT';
      } else {
        status = 'NON_COMPLIANT';
      }

      // Determine risk level
      const riskLevel = this.determineRiskLevel(requirement, status, compliancePercentage);

      // Generate remediation recommendations
      const remediation = this.generateRemediation(requirement, gaps);

      return {
        requirementId: requirement.id,
        status,
        score: compliancePercentage,
        evidence,
        gaps,
        riskLevel,
        remediation
      };
    } catch (error) {
      logger.error('Failed to assess requirement:', error);
      throw error;
    }
  }

  private async evaluateAuditCriteria(
    criteria: AuditCriteria,
    companyId: string,
    reportPeriod: { start: Date; end: Date }
  ): Promise<{ compliant: boolean; evidence: string; gap: string; score: number }> {
    try {
      // Search for relevant audit events
      const searchResult = await elasticsearchService.searchAuditEvents({
        query: {
          bool: {
            filter: [
              { term: { companyId } },
              { terms: { eventType: criteria.eventTypes } },
              { terms: { category: criteria.categories } },
              {
                range: {
                  timestamp: {
                    gte: reportPeriod.start.toISOString(),
                    lte: reportPeriod.end.toISOString()
                  }
                }
              }
            ]
          }
        },
        size: 1000
      });

      const events = searchResult.hits.hits.map(hit => hit._source);
      
      // Apply additional conditions
      const filteredEvents = this.applyConditions(events, criteria.conditions);

      // Check threshold if specified
      const compliant = criteria.threshold 
        ? filteredEvents.length >= criteria.threshold
        : filteredEvents.length > 0;

      const evidence = compliant 
        ? `Found ${filteredEvents.length} compliant events`
        : '';

      const gap = !compliant 
        ? `Expected ${criteria.threshold || 'at least 1'} events, found ${filteredEvents.length}`
        : '';

      const score = compliant ? 100 : 0;

      return { compliant, evidence, gap, score };
    } catch (error) {
      logger.error('Failed to evaluate audit criteria:', error);
      return { compliant: false, evidence: '', gap: 'Evaluation failed', score: 0 };
    }
  }

  private async collectEvidence(
    requirement: ComplianceRequirement,
    companyId: string,
    reportPeriod: { start: Date; end: Date }
  ): Promise<ComplianceEvidence[]> {
    try {
      const evidence: ComplianceEvidence[] = [];

      for (const evidenceType of requirement.evidenceTypes) {
        switch (evidenceType) {
          case 'AUDIT_LOG':
            const auditEvidence = await this.collectAuditLogEvidence(
              requirement,
              companyId,
              reportPeriod
            );
            evidence.push(...auditEvidence);
            break;

          case 'DOCUMENT':
            const docEvidence = await this.collectDocumentEvidence(
              requirement,
              companyId
            );
            evidence.push(...docEvidence);
            break;

          case 'CONFIGURATION':
            const configEvidence = await this.collectConfigurationEvidence(
              requirement,
              companyId
            );
            evidence.push(...configEvidence);
            break;
        }
      }

      return evidence;
    } catch (error) {
      logger.error('Failed to collect evidence:', error);
      return [];
    }
  }

  private async collectAuditLogEvidence(
    requirement: ComplianceRequirement,
    companyId: string,
    reportPeriod: { start: Date; end: Date }
  ): Promise<ComplianceEvidence[]> {
    try {
      const evidence: ComplianceEvidence[] = [];

      // Collect relevant audit logs
      const searchResult = await auditLoggingService.searchEvents({
        companyId,
        dateRange: reportPeriod,
        limit: 100
      });

      for (const event of searchResult.events) {
        const evidenceItem: ComplianceEvidence = {
          id: crypto.randomUUID(),
          type: 'AUDIT_LOG',
          source: `audit_event_${event.eventId}`,
          description: `Audit log: ${event.action} - ${event.description}`,
          collectedAt: new Date(),
          hash: this.calculateHash(event),
          metadata: {
            eventId: event.eventId,
            eventType: event.eventType,
            category: event.category,
            timestamp: event.timestamp
          }
        };

        evidence.push(evidenceItem);
      }

      return evidence;
    } catch (error) {
      logger.error('Failed to collect audit log evidence:', error);
      return [];
    }
  }

  private async collectDocumentEvidence(
    requirement: ComplianceRequirement,
    companyId: string
  ): Promise<ComplianceEvidence[]> {
    try {
      // This would integrate with document management system
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Failed to collect document evidence:', error);
      return [];
    }
  }

  private async collectConfigurationEvidence(
    requirement: ComplianceRequirement,
    companyId: string
  ): Promise<ComplianceEvidence[]> {
    try {
      // This would collect system configuration evidence
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Failed to collect configuration evidence:', error);
      return [];
    }
  }

  // Report Generation and Management
  async generateComplianceReport(
    reportId: string,
    format: 'PDF' | 'HTML' | 'JSON' = 'PDF'
  ): Promise<Buffer | string> {
    try {
      const report = await this.getComplianceReport(reportId);
      if (!report) {
        throw new Error('Compliance report not found');
      }

      switch (format) {
        case 'PDF':
          return await this.generatePDFReport(report);
        case 'HTML':
          return await this.generateHTMLReport(report);
        case 'JSON':
          return JSON.stringify(report, null, 2);
        default:
          throw new Error('Unsupported report format');
      }
    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  async finalizeReport(reportId: string, finalizedBy: string): Promise<void> {
    try {
      await prisma.auditCompliance.update({
        where: { id: reportId },
        data: {
          status: 'COMPLIANT', // This would be determined by the report
          updatedBy: finalizedBy,
          updatedAt: new Date()
        }
      });

      logger.info(`Compliance report finalized: ${reportId}`, {
        finalizedBy
      });
    } catch (error) {
      logger.error('Failed to finalize compliance report:', error);
      throw error;
    }
  }

  async getComplianceReports(
    companyId: string,
    framework?: string,
    status?: string
  ): Promise<any[]> {
    try {
      const where: any = { companyId };
      if (framework) where.framework = framework;
      if (status) where.status = status;

      const reports = await prisma.auditCompliance.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      return reports;
    } catch (error) {
      logger.error('Failed to get compliance reports:', error);
      throw error;
    }
  }

  // Tamper Detection and Verification
  async verifyReportIntegrity(reportId: string): Promise<boolean> {
    try {
      const report = await this.getComplianceReport(reportId);
      if (!report) {
        return false;
      }

      // Recalculate checksum
      const calculatedChecksum = this.calculateChecksum(report);
      const calculatedSignature = this.generateDigitalSignature(report);

      return report.checksum === calculatedChecksum && 
             report.digitalSignature === calculatedSignature;
    } catch (error) {
      logger.error('Failed to verify report integrity:', error);
      return false;
    }
  }

  async detectTampering(reportId: string): Promise<any> {
    try {
      const isValid = await this.verifyReportIntegrity(reportId);
      
      if (!isValid) {
        const tamperAlert = {
          reportId,
          detectedAt: new Date(),
          severity: 'CRITICAL',
          description: 'Compliance report tampering detected',
          evidence: {
            integrityCheck: false,
            checksumMismatch: true
          }
        };

        // Log tampering event
        await auditLoggingService.logEvent({
          eventType: 'SECURITY_EVENT',
          category: 'COMPLIANCE_MONITORING',
          severity: 'CRITICAL',
          action: 'TAMPERING_DETECTED',
          description: `Compliance report tampering detected: ${reportId}`,
          resourceType: 'COMPLIANCE_REPORT',
          resourceId: reportId,
          metadata: tamperAlert,
          tags: ['tampering', 'compliance', 'security']
        });

        return tamperAlert;
      }

      return null;
    } catch (error) {
      logger.error('Failed to detect tampering:', error);
      throw error;
    }
  }

  // Private Helper Methods
  private applyConditions(events: any[], conditions: any[]): any[] {
    return events.filter(event => {
      return conditions.every(condition => {
        const fieldValue = this.getFieldValue(event, condition.field);
        return this.evaluateCondition(fieldValue, condition);
      });
    });
  }

  private getFieldValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private evaluateCondition(value: any, condition: any): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      default:
        return false;
    }
  }

  private calculateOverallScore(findings: ComplianceFinding[]): number {
    if (findings.length === 0) return 0;
    
    const totalScore = findings.reduce((sum, finding) => sum + finding.score, 0);
    return totalScore / findings.length;
  }

  private generateRecommendations(findings: ComplianceFinding[]): string[] {
    const recommendations: string[] = [];
    
    findings.forEach(finding => {
      if (finding.status !== 'COMPLIANT') {
        recommendations.push(...finding.remediation);
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private determineRiskLevel(
    requirement: ComplianceRequirement,
    status: ComplianceFinding['status'],
    score: number
  ): ComplianceFinding['riskLevel'] {
    if (requirement.mandatory && status === 'NON_COMPLIANT') {
      return 'CRITICAL';
    }
    
    if (score < 50) return 'HIGH';
    if (score < 70) return 'MEDIUM';
    return 'LOW';
  }

  private generateRemediation(requirement: ComplianceRequirement, gaps: string[]): string[] {
    const remediation: string[] = [];
    
    gaps.forEach(gap => {
      remediation.push(`Address gap: ${gap}`);
    });

    // Add generic recommendations based on requirement category
    switch (requirement.category) {
      case 'ACCESS_CONTROL':
        remediation.push('Review and update access control policies');
        break;
      case 'DATA_PROTECTION':
        remediation.push('Implement additional data protection measures');
        break;
      case 'AUDIT_LOGGING':
        remediation.push('Enhance audit logging coverage');
        break;
    }

    return remediation;
  }

  private calculateChecksum(report: Omit<ComplianceReport, 'checksum' | 'digitalSignature'>): string {
    const reportString = JSON.stringify(report, Object.keys(report).sort());
    return crypto.createHash('sha256').update(reportString).digest('hex');
  }

  private generateDigitalSignature(report: Omit<ComplianceReport, 'digitalSignature'>): string {
    const reportString = JSON.stringify(report, Object.keys(report).sort());
    const signingKey = process.env.COMPLIANCE_SIGNING_KEY || 'default-signing-key';
    return crypto.createHmac('sha256', signingKey).update(reportString).digest('hex');
  }

  private calculateHash(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private async storeComplianceReport(report: ComplianceReport): Promise<void> {
    // This would store the report in the database
    // For now, just log it
    logger.info(`Storing compliance report: ${report.id}`);
  }

  private async getComplianceReport(reportId: string): Promise<ComplianceReport | null> {
    // This would retrieve the report from the database
    // For now, return null
    return null;
  }

  private async generatePDFReport(report: ComplianceReport): Promise<Buffer> {
    // This would generate a PDF report
    // For now, return empty buffer
    return Buffer.from('PDF report content');
  }

  private async generateHTMLReport(report: ComplianceReport): Promise<string> {
    // This would generate an HTML report
    return '<html><body>HTML report content</body></html>';
  }

  private initializeFrameworks(): void {
    // Initialize common compliance frameworks
    const frameworks: ComplianceFramework[] = [
      {
        name: 'SOX',
        version: '2002',
        requirements: [
          {
            id: 'SOX-302',
            title: 'Corporate Responsibility for Financial Reports',
            description: 'CEO and CFO certification of financial reports',
            category: 'FINANCIAL_REPORTING',
            mandatory: true,
            evidenceTypes: ['AUDIT_LOG', 'DOCUMENT'],
            auditCriteria: [
              {
                eventTypes: ['USER_ACTION'],
                categories: ['DATA_MODIFICATION'],
                conditions: [
                  { field: 'resourceType', operator: 'equals', value: 'FINANCIAL_REPORT' }
                ],
                timeframe: 'QUARTERLY'
              }
            ]
          }
        ],
        controls: [],
        reportingPeriod: 'QUARTERLY'
      },
      {
        name: 'GDPR',
        version: '2018',
        requirements: [
          {
            id: 'GDPR-32',
            title: 'Security of Processing',
            description: 'Implement appropriate technical and organizational measures',
            category: 'DATA_PROTECTION',
            mandatory: true,
            evidenceTypes: ['AUDIT_LOG', 'CONFIGURATION'],
            auditCriteria: [
              {
                eventTypes: ['SECURITY_EVENT'],
                categories: ['DATA_ACCESS'],
                conditions: [],
                timeframe: 'CONTINUOUS'
              }
            ]
          }
        ],
        controls: [],
        reportingPeriod: 'ANNUALLY'
      }
    ];

    frameworks.forEach(framework => {
      this.frameworks.set(framework.name, framework);
    });
  }
}

export default new ComplianceReportingService();
