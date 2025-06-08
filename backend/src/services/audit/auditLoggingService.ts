import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import crypto from 'crypto';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

export interface AuditEventData {
  eventType: string;
  category: string;
  severity?: string;
  action: string;
  description: string;
  
  // Actor Information
  userId?: string;
  userEmail?: string;
  userRole?: string;
  sessionId?: string;
  impersonatedBy?: string;
  
  // Context Information
  companyId?: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  
  // Technical Context
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
  
  // Data Changes
  oldValues?: any;
  newValues?: any;
  changedFields?: string[];
  
  // Additional Context
  metadata?: any;
  tags?: string[];
  
  // Outcome
  outcome?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface AuditSearchCriteria {
  companyId?: string;
  userId?: string;
  eventTypes?: string[];
  categories?: string[];
  severities?: string[];
  resourceTypes?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
  tags?: string[];
  correlationId?: string;
  limit?: number;
  offset?: number;
}

export class AuditLoggingService extends EventEmitter {
  private readonly encryptionKey: string;
  private readonly signingKey: string;

  constructor() {
    super();
    this.encryptionKey = process.env.AUDIT_ENCRYPTION_KEY || 'default-audit-key';
    this.signingKey = process.env.AUDIT_SIGNING_KEY || 'default-signing-key';
  }

  // Core Audit Logging
  async logEvent(eventData: AuditEventData): Promise<string> {
    try {
      const eventId = crypto.randomUUID();
      const timestamp = new Date();

      // Calculate checksum for integrity
      const checksumData = {
        eventId,
        timestamp: timestamp.toISOString(),
        ...eventData
      };
      const checksum = this.calculateChecksum(checksumData);

      // Generate digital signature
      const digitalSignature = this.generateDigitalSignature(checksumData);

      // Create audit event
      const auditEvent = await prisma.auditEvent.create({
        data: {
          eventId,
          timestamp,
          eventType: eventData.eventType as any,
          category: eventData.category as any,
          severity: (eventData.severity as any) || 'INFO',
          action: eventData.action,
          description: eventData.description,
          
          // Actor Information
          userId: eventData.userId,
          userEmail: eventData.userEmail,
          userRole: eventData.userRole,
          sessionId: eventData.sessionId,
          impersonatedBy: eventData.impersonatedBy,
          
          // Context Information
          companyId: eventData.companyId,
          resourceType: eventData.resourceType,
          resourceId: eventData.resourceId,
          resourceName: eventData.resourceName,
          
          // Technical Context
          ipAddress: eventData.ipAddress,
          userAgent: eventData.userAgent,
          requestId: eventData.requestId,
          correlationId: eventData.correlationId,
          
          // Data Changes
          oldValues: eventData.oldValues,
          newValues: eventData.newValues,
          changedFields: eventData.changedFields || [],
          
          // Additional Context
          metadata: eventData.metadata,
          tags: eventData.tags || [],
          
          // Outcome
          outcome: (eventData.outcome as any) || 'SUCCESS',
          errorCode: eventData.errorCode,
          errorMessage: eventData.errorMessage,
          
          // Security and Integrity
          checksum,
          digitalSignature
        }
      });

      // Emit event for real-time processing
      this.emit('auditEventLogged', auditEvent);

      // Send to ELK stack for indexing
      await this.sendToElasticsearch(auditEvent);

      // Check for compliance violations or security alerts
      await this.checkForAlerts(auditEvent);

      logger.debug(`Audit event logged: ${eventId}`, {
        eventType: eventData.eventType,
        action: eventData.action,
        userId: eventData.userId
      });

      return eventId;
    } catch (error) {
      logger.error('Failed to log audit event:', error);
      throw error;
    }
  }

  // Batch Logging for High-Volume Events
  async logEventsBatch(events: AuditEventData[]): Promise<string[]> {
    try {
      const eventIds: string[] = [];
      const auditEvents = [];

      for (const eventData of events) {
        const eventId = crypto.randomUUID();
        const timestamp = new Date();

        const checksumData = {
          eventId,
          timestamp: timestamp.toISOString(),
          ...eventData
        };
        const checksum = this.calculateChecksum(checksumData);
        const digitalSignature = this.generateDigitalSignature(checksumData);

        auditEvents.push({
          eventId,
          timestamp,
          eventType: eventData.eventType as any,
          category: eventData.category as any,
          severity: (eventData.severity as any) || 'INFO',
          action: eventData.action,
          description: eventData.description,
          userId: eventData.userId,
          userEmail: eventData.userEmail,
          userRole: eventData.userRole,
          sessionId: eventData.sessionId,
          companyId: eventData.companyId,
          resourceType: eventData.resourceType,
          resourceId: eventData.resourceId,
          resourceName: eventData.resourceName,
          ipAddress: eventData.ipAddress,
          userAgent: eventData.userAgent,
          requestId: eventData.requestId,
          correlationId: eventData.correlationId,
          oldValues: eventData.oldValues,
          newValues: eventData.newValues,
          changedFields: eventData.changedFields || [],
          metadata: eventData.metadata,
          tags: eventData.tags || [],
          outcome: (eventData.outcome as any) || 'SUCCESS',
          errorCode: eventData.errorCode,
          errorMessage: eventData.errorMessage,
          checksum,
          digitalSignature
        });

        eventIds.push(eventId);
      }

      // Batch insert for performance
      await prisma.auditEvent.createMany({
        data: auditEvents
      });

      // Send batch to Elasticsearch
      await this.sendBatchToElasticsearch(auditEvents);

      logger.info(`Batch audit events logged: ${eventIds.length} events`);

      return eventIds;
    } catch (error) {
      logger.error('Failed to log batch audit events:', error);
      throw error;
    }
  }

  // Search and Retrieval
  async searchEvents(criteria: AuditSearchCriteria): Promise<any> {
    try {
      const where: any = {};

      // Apply filters
      if (criteria.companyId) where.companyId = criteria.companyId;
      if (criteria.userId) where.userId = criteria.userId;
      if (criteria.eventTypes?.length) where.eventType = { in: criteria.eventTypes };
      if (criteria.categories?.length) where.category = { in: criteria.categories };
      if (criteria.severities?.length) where.severity = { in: criteria.severities };
      if (criteria.resourceTypes?.length) where.resourceType = { in: criteria.resourceTypes };
      if (criteria.tags?.length) where.tags = { hasSome: criteria.tags };
      if (criteria.correlationId) where.correlationId = criteria.correlationId;

      if (criteria.dateRange) {
        where.timestamp = {
          gte: criteria.dateRange.start,
          lte: criteria.dateRange.end
        };
      }

      // Text search
      if (criteria.searchQuery) {
        where.OR = [
          { description: { contains: criteria.searchQuery, mode: 'insensitive' } },
          { action: { contains: criteria.searchQuery, mode: 'insensitive' } },
          { resourceName: { contains: criteria.searchQuery, mode: 'insensitive' } }
        ];
      }

      const [events, total] = await Promise.all([
        prisma.auditEvent.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: criteria.limit || 100,
          skip: criteria.offset || 0
        }),
        prisma.auditEvent.count({ where })
      ]);

      return {
        events,
        total,
        limit: criteria.limit || 100,
        offset: criteria.offset || 0
      };
    } catch (error) {
      logger.error('Failed to search audit events:', error);
      throw error;
    }
  }

  // Event Integrity Verification
  async verifyEventIntegrity(eventId: string): Promise<boolean> {
    try {
      const event = await prisma.auditEvent.findUnique({
        where: { eventId }
      });

      if (!event) {
        return false;
      }

      // Recalculate checksum
      const checksumData = {
        eventId: event.eventId,
        timestamp: event.timestamp.toISOString(),
        eventType: event.eventType,
        category: event.category,
        severity: event.severity,
        action: event.action,
        description: event.description,
        userId: event.userId,
        userEmail: event.userEmail,
        userRole: event.userRole,
        sessionId: event.sessionId,
        companyId: event.companyId,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        resourceName: event.resourceName,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        requestId: event.requestId,
        correlationId: event.correlationId,
        oldValues: event.oldValues,
        newValues: event.newValues,
        changedFields: event.changedFields,
        metadata: event.metadata,
        tags: event.tags,
        outcome: event.outcome,
        errorCode: event.errorCode,
        errorMessage: event.errorMessage
      };

      const calculatedChecksum = this.calculateChecksum(checksumData);
      const calculatedSignature = this.generateDigitalSignature(checksumData);

      return event.checksum === calculatedChecksum && 
             event.digitalSignature === calculatedSignature;
    } catch (error) {
      logger.error('Failed to verify event integrity:', error);
      return false;
    }
  }

  // Session Tracking
  async startSession(sessionData: {
    sessionId: string;
    userId?: string;
    userEmail?: string;
    companyId?: string;
    ipAddress?: string;
    userAgent?: string;
    authMethod?: string;
  }): Promise<void> {
    try {
      await prisma.auditSession.create({
        data: {
          sessionId: sessionData.sessionId,
          userId: sessionData.userId,
          userEmail: sessionData.userEmail,
          companyId: sessionData.companyId,
          ipAddress: sessionData.ipAddress,
          userAgent: sessionData.userAgent,
          authMethod: sessionData.authMethod,
          startTime: new Date(),
          isActive: true
        }
      });

      // Log session start event
      await this.logEvent({
        eventType: 'USER_ACTION',
        category: 'AUTHENTICATION',
        action: 'SESSION_START',
        description: 'User session started',
        userId: sessionData.userId,
        userEmail: sessionData.userEmail,
        sessionId: sessionData.sessionId,
        companyId: sessionData.companyId,
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent,
        metadata: { authMethod: sessionData.authMethod }
      });
    } catch (error) {
      logger.error('Failed to start audit session:', error);
      throw error;
    }
  }

  async endSession(sessionId: string): Promise<void> {
    try {
      const session = await prisma.auditSession.findUnique({
        where: { sessionId }
      });

      if (session) {
        const endTime = new Date();
        const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

        await prisma.auditSession.update({
          where: { sessionId },
          data: {
            endTime,
            duration,
            isActive: false
          }
        });

        // Log session end event
        await this.logEvent({
          eventType: 'USER_ACTION',
          category: 'AUTHENTICATION',
          action: 'SESSION_END',
          description: 'User session ended',
          userId: session.userId,
          userEmail: session.userEmail,
          sessionId,
          companyId: session.companyId,
          metadata: { duration }
        });
      }
    } catch (error) {
      logger.error('Failed to end audit session:', error);
      throw error;
    }
  }

  // Private Helper Methods
  private calculateChecksum(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private generateDigitalSignature(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHmac('sha256', this.signingKey).update(dataString).digest('hex');
  }

  private async sendToElasticsearch(event: any): Promise<void> {
    try {
      // This would integrate with Elasticsearch
      // For now, emit event for external processing
      this.emit('elasticsearchIndex', event);
    } catch (error) {
      logger.error('Failed to send event to Elasticsearch:', error);
    }
  }

  private async sendBatchToElasticsearch(events: any[]): Promise<void> {
    try {
      // This would integrate with Elasticsearch bulk API
      // For now, emit events for external processing
      this.emit('elasticsearchBulkIndex', events);
    } catch (error) {
      logger.error('Failed to send batch to Elasticsearch:', error);
    }
  }

  private async checkForAlerts(event: any): Promise<void> {
    try {
      // Check for security alerts, compliance violations, etc.
      // This would integrate with alerting rules engine
      this.emit('alertCheck', event);
    } catch (error) {
      logger.error('Failed to check for alerts:', error);
    }
  }
}

export default new AuditLoggingService();
