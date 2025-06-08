import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { EventEmitter } from 'events';
import elasticsearchService from './elasticsearchService';

const prisma = new PrismaClient();

export interface AlertRule {
  id?: string;
  name: string;
  description?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  conditions: AlertCondition[];
  actions: AlertAction[];
  isActive: boolean;
  companyId?: string;
}

export interface AlertCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  timeWindow?: number; // minutes
  threshold?: number; // count threshold
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'sms' | 'slack' | 'teams';
  target: string;
  template?: string;
  parameters?: any;
}

export interface AnomalyDetectionConfig {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  algorithms: string[];
  baselineWindow: number; // days
  detectionWindow: number; // minutes
}

export class AuditAlertService extends EventEmitter {
  private alertRules: Map<string, AlertRule> = new Map();
  private anomalyConfig: AnomalyDetectionConfig;

  constructor() {
    super();
    
    this.anomalyConfig = {
      enabled: process.env.ANOMALY_DETECTION_ENABLED === 'true',
      sensitivity: (process.env.ANOMALY_SENSITIVITY as any) || 'medium',
      algorithms: ['statistical', 'behavioral', 'temporal'],
      baselineWindow: parseInt(process.env.ANOMALY_BASELINE_WINDOW || '30'),
      detectionWindow: parseInt(process.env.ANOMALY_DETECTION_WINDOW || '60')
    };

    this.initializeDefaultRules();
    this.startAnomalyDetection();
  }

  // Alert Rule Management
  async createAlertRule(rule: AlertRule): Promise<string> {
    try {
      const alertId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const alertRule = {
        ...rule,
        id: alertId
      };

      this.alertRules.set(alertId, alertRule);

      logger.info(`Alert rule created: ${alertId}`, {
        name: rule.name,
        severity: rule.severity,
        companyId: rule.companyId
      });

      return alertId;
    } catch (error) {
      logger.error('Failed to create alert rule:', error);
      throw error;
    }
  }

  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<void> {
    try {
      const existingRule = this.alertRules.get(ruleId);
      if (!existingRule) {
        throw new Error('Alert rule not found');
      }

      const updatedRule = { ...existingRule, ...updates };
      this.alertRules.set(ruleId, updatedRule);

      logger.info(`Alert rule updated: ${ruleId}`);
    } catch (error) {
      logger.error('Failed to update alert rule:', error);
      throw error;
    }
  }

  async deleteAlertRule(ruleId: string): Promise<void> {
    try {
      this.alertRules.delete(ruleId);
      logger.info(`Alert rule deleted: ${ruleId}`);
    } catch (error) {
      logger.error('Failed to delete alert rule:', error);
      throw error;
    }
  }

  // Event Processing and Alert Generation
  async processAuditEvent(event: any): Promise<void> {
    try {
      // Check against all active alert rules
      for (const [ruleId, rule] of this.alertRules.entries()) {
        if (!rule.isActive) continue;
        
        // Skip if company-specific rule doesn't match
        if (rule.companyId && rule.companyId !== event.companyId) continue;

        const isTriggered = await this.evaluateRule(rule, event);
        if (isTriggered) {
          await this.generateAlert(rule, event);
        }
      }

      // Anomaly detection
      if (this.anomalyConfig.enabled) {
        await this.detectAnomalies(event);
      }
    } catch (error) {
      logger.error('Failed to process audit event for alerts:', error);
    }
  }

  private async evaluateRule(rule: AlertRule, event: any): Promise<boolean> {
    try {
      for (const condition of rule.conditions) {
        const fieldValue = this.getFieldValue(event, condition.field);
        
        if (condition.timeWindow) {
          // Time-based condition evaluation
          const isTimeConditionMet = await this.evaluateTimeBasedCondition(condition, event);
          if (!isTimeConditionMet) return false;
        } else {
          // Simple condition evaluation
          const isConditionMet = this.evaluateCondition(fieldValue, condition);
          if (!isConditionMet) return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Failed to evaluate alert rule:', error);
      return false;
    }
  }

  private evaluateCondition(value: any, condition: AlertCondition): boolean {
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
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      default:
        return false;
    }
  }

  private async evaluateTimeBasedCondition(condition: AlertCondition, event: any): Promise<boolean> {
    try {
      const endTime = new Date(event.timestamp);
      const startTime = new Date(endTime.getTime() - (condition.timeWindow! * 60 * 1000));

      // Query events in time window
      const searchResult = await elasticsearchService.searchAuditEvents({
        query: {
          bool: {
            filter: [
              { term: { companyId: event.companyId } },
              { term: { [condition.field]: condition.value } },
              {
                range: {
                  timestamp: {
                    gte: startTime.toISOString(),
                    lte: endTime.toISOString()
                  }
                }
              }
            ]
          }
        },
        size: 0
      });

      const eventCount = searchResult.hits.total.value;
      return condition.threshold ? eventCount >= condition.threshold : eventCount > 0;
    } catch (error) {
      logger.error('Failed to evaluate time-based condition:', error);
      return false;
    }
  }

  private async generateAlert(rule: AlertRule, triggerEvent: any): Promise<void> {
    try {
      const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const alert = await prisma.auditAlert.create({
        data: {
          alertId,
          title: rule.name,
          description: rule.description || `Alert triggered by rule: ${rule.name}`,
          severity: rule.severity as any,
          category: rule.category as any,
          triggeredBy: triggerEvent.eventId,
          triggerTime: new Date(triggerEvent.timestamp),
          companyId: triggerEvent.companyId,
          userId: triggerEvent.userId,
          resourceType: triggerEvent.resourceType,
          resourceId: triggerEvent.resourceId,
          alertData: {
            rule: rule,
            triggerEvent: triggerEvent,
            conditions: rule.conditions
          },
          riskScore: this.calculateRiskScore(rule.severity, rule.category),
          status: 'OPEN'
        }
      });

      // Execute alert actions
      for (const action of rule.actions) {
        await this.executeAlertAction(action, alert, triggerEvent);
      }

      this.emit('alertGenerated', alert);

      logger.warn(`Alert generated: ${alertId}`, {
        rule: rule.name,
        severity: rule.severity,
        triggerEvent: triggerEvent.eventId
      });
    } catch (error) {
      logger.error('Failed to generate alert:', error);
    }
  }

  // Anomaly Detection
  private async detectAnomalies(event: any): Promise<void> {
    try {
      const anomalies = await Promise.all([
        this.detectStatisticalAnomalies(event),
        this.detectBehavioralAnomalies(event),
        this.detectTemporalAnomalies(event)
      ]);

      const detectedAnomalies = anomalies.flat().filter(Boolean);

      for (const anomaly of detectedAnomalies) {
        await this.generateAnomalyAlert(anomaly, event);
      }
    } catch (error) {
      logger.error('Failed to detect anomalies:', error);
    }
  }

  private async detectStatisticalAnomalies(event: any): Promise<any[]> {
    try {
      // Statistical anomaly detection based on event frequency
      const endTime = new Date(event.timestamp);
      const startTime = new Date(endTime.getTime() - (this.anomalyConfig.detectionWindow * 60 * 1000));
      const baselineStart = new Date(endTime.getTime() - (this.anomalyConfig.baselineWindow * 24 * 60 * 60 * 1000));

      // Get current window statistics
      const currentStats = await this.getEventStatistics(event.companyId, startTime, endTime);
      
      // Get baseline statistics
      const baselineStats = await this.getEventStatistics(event.companyId, baselineStart, startTime);

      const anomalies = [];

      // Check for unusual event frequency
      if (currentStats.totalEvents > baselineStats.averageEvents * 3) {
        anomalies.push({
          type: 'high_frequency',
          description: 'Unusually high event frequency detected',
          severity: 'MEDIUM',
          data: { current: currentStats.totalEvents, baseline: baselineStats.averageEvents }
        });
      }

      // Check for unusual error rates
      if (currentStats.errorRate > baselineStats.averageErrorRate * 2) {
        anomalies.push({
          type: 'high_error_rate',
          description: 'Unusually high error rate detected',
          severity: 'HIGH',
          data: { current: currentStats.errorRate, baseline: baselineStats.averageErrorRate }
        });
      }

      return anomalies;
    } catch (error) {
      logger.error('Failed to detect statistical anomalies:', error);
      return [];
    }
  }

  private async detectBehavioralAnomalies(event: any): Promise<any[]> {
    try {
      const anomalies = [];

      // Check for unusual user behavior
      if (event.userId) {
        const userBehavior = await this.getUserBehaviorProfile(event.userId, event.companyId);
        
        // Check for unusual access patterns
        if (this.isUnusualAccessPattern(event, userBehavior)) {
          anomalies.push({
            type: 'unusual_access_pattern',
            description: 'Unusual user access pattern detected',
            severity: 'MEDIUM',
            data: { event, userBehavior }
          });
        }

        // Check for privilege escalation
        if (this.isPrivilegeEscalation(event, userBehavior)) {
          anomalies.push({
            type: 'privilege_escalation',
            description: 'Potential privilege escalation detected',
            severity: 'HIGH',
            data: { event, userBehavior }
          });
        }
      }

      return anomalies;
    } catch (error) {
      logger.error('Failed to detect behavioral anomalies:', error);
      return [];
    }
  }

  private async detectTemporalAnomalies(event: any): Promise<any[]> {
    try {
      const anomalies = [];
      const eventTime = new Date(event.timestamp);

      // Check for off-hours access
      const hour = eventTime.getHours();
      const dayOfWeek = eventTime.getDay();

      if ((hour < 6 || hour > 22) && (dayOfWeek >= 1 && dayOfWeek <= 5)) {
        anomalies.push({
          type: 'off_hours_access',
          description: 'Off-hours access detected',
          severity: 'LOW',
          data: { hour, dayOfWeek, timestamp: event.timestamp }
        });
      }

      // Check for weekend access to sensitive resources
      if ((dayOfWeek === 0 || dayOfWeek === 6) && event.securityLevel === 'CONFIDENTIAL') {
        anomalies.push({
          type: 'weekend_sensitive_access',
          description: 'Weekend access to sensitive resources detected',
          severity: 'MEDIUM',
          data: { dayOfWeek, securityLevel: event.securityLevel }
        });
      }

      return anomalies;
    } catch (error) {
      logger.error('Failed to detect temporal anomalies:', error);
      return [];
    }
  }

  // Helper Methods
  private getFieldValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private calculateRiskScore(severity: string, category: string): number {
    const severityScores = { LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 100 };
    const categoryMultipliers = {
      SECURITY_BREACH: 1.5,
      COMPLIANCE_VIOLATION: 1.3,
      DATA_INTEGRITY: 1.2,
      ACCESS_VIOLATION: 1.1,
      SYSTEM_ANOMALY: 1.0,
      PERFORMANCE_ISSUE: 0.8,
      POLICY_VIOLATION: 0.9
    };

    const baseScore = severityScores[severity as keyof typeof severityScores] || 50;
    const multiplier = categoryMultipliers[category as keyof typeof categoryMultipliers] || 1.0;

    return Math.min(100, baseScore * multiplier);
  }

  private async executeAlertAction(action: AlertAction, alert: any, triggerEvent: any): Promise<void> {
    try {
      switch (action.type) {
        case 'email':
          await this.sendEmailAlert(action, alert, triggerEvent);
          break;
        case 'webhook':
          await this.sendWebhookAlert(action, alert, triggerEvent);
          break;
        case 'slack':
          await this.sendSlackAlert(action, alert, triggerEvent);
          break;
        // Add other notification types as needed
      }
    } catch (error) {
      logger.error(`Failed to execute alert action ${action.type}:`, error);
    }
  }

  private async sendEmailAlert(action: AlertAction, alert: any, triggerEvent: any): Promise<void> {
    // Implementation would integrate with email service
    this.emit('emailAlert', { action, alert, triggerEvent });
  }

  private async sendWebhookAlert(action: AlertAction, alert: any, triggerEvent: any): Promise<void> {
    // Implementation would send HTTP POST to webhook URL
    this.emit('webhookAlert', { action, alert, triggerEvent });
  }

  private async sendSlackAlert(action: AlertAction, alert: any, triggerEvent: any): Promise<void> {
    // Implementation would integrate with Slack API
    this.emit('slackAlert', { action, alert, triggerEvent });
  }

  private async getEventStatistics(companyId: string, startTime: Date, endTime: Date): Promise<any> {
    // Implementation would query Elasticsearch for statistics
    return {
      totalEvents: 0,
      errorRate: 0,
      averageEvents: 0,
      averageErrorRate: 0
    };
  }

  private async getUserBehaviorProfile(userId: string, companyId: string): Promise<any> {
    // Implementation would build user behavior profile
    return {
      normalAccessHours: [],
      commonResources: [],
      typicalActions: [],
      riskScore: 0
    };
  }

  private isUnusualAccessPattern(event: any, userBehavior: any): boolean {
    // Implementation would analyze access patterns
    return false;
  }

  private isPrivilegeEscalation(event: any, userBehavior: any): boolean {
    // Implementation would detect privilege escalation
    return false;
  }

  private async generateAnomalyAlert(anomaly: any, triggerEvent: any): Promise<void> {
    try {
      const alertId = `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await prisma.auditAlert.create({
        data: {
          alertId,
          title: `Anomaly Detected: ${anomaly.type}`,
          description: anomaly.description,
          severity: anomaly.severity as any,
          category: 'SYSTEM_ANOMALY' as any,
          triggeredBy: triggerEvent.eventId,
          triggerTime: new Date(triggerEvent.timestamp),
          companyId: triggerEvent.companyId,
          userId: triggerEvent.userId,
          alertData: {
            anomaly,
            triggerEvent,
            detectionMethod: 'automated'
          },
          riskScore: this.calculateRiskScore(anomaly.severity, 'SYSTEM_ANOMALY'),
          status: 'OPEN'
        }
      });

      logger.warn(`Anomaly alert generated: ${alertId}`, {
        type: anomaly.type,
        severity: anomaly.severity
      });
    } catch (error) {
      logger.error('Failed to generate anomaly alert:', error);
    }
  }

  private initializeDefaultRules(): void {
    // Initialize default security alert rules
    const defaultRules: AlertRule[] = [
      {
        name: 'Multiple Failed Login Attempts',
        description: 'Detect multiple failed login attempts from same IP',
        severity: 'HIGH',
        category: 'SECURITY_BREACH',
        conditions: [
          {
            field: 'action',
            operator: 'equals',
            value: 'LOGIN_FAILURE',
            timeWindow: 15,
            threshold: 5
          }
        ],
        actions: [
          {
            type: 'email',
            target: 'security@company.com'
          }
        ],
        isActive: true
      },
      {
        name: 'Privileged Action by Non-Admin',
        description: 'Detect privileged actions performed by non-admin users',
        severity: 'CRITICAL',
        category: 'ACCESS_VIOLATION',
        conditions: [
          {
            field: 'category',
            operator: 'equals',
            value: 'ADMIN_ACTION'
          },
          {
            field: 'userRole',
            operator: 'not_equals',
            value: 'ADMIN'
          }
        ],
        actions: [
          {
            type: 'email',
            target: 'security@company.com'
          },
          {
            type: 'webhook',
            target: 'https://security.company.com/alerts'
          }
        ],
        isActive: true
      }
    ];

    defaultRules.forEach(rule => {
      this.createAlertRule(rule);
    });
  }

  private startAnomalyDetection(): void {
    if (!this.anomalyConfig.enabled) return;

    // Start periodic anomaly detection
    setInterval(async () => {
      try {
        await this.runPeriodicAnomalyDetection();
      } catch (error) {
        logger.error('Periodic anomaly detection failed:', error);
      }
    }, this.anomalyConfig.detectionWindow * 60 * 1000);
  }

  private async runPeriodicAnomalyDetection(): Promise<void> {
    // Implementation for periodic anomaly detection
    logger.debug('Running periodic anomaly detection');
  }
}

export default new AuditAlertService();
