import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import auditLoggingService from '../services/audit/auditLoggingService';
import { logger } from '../utils/logger';

// Extend Request interface to include audit context
declare global {
  namespace Express {
    interface Request {
      auditContext?: AuditContext;
      correlationId?: string;
      requestId?: string;
    }
  }
}

export interface AuditContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  sessionId?: string;
  companyId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
  correlationId: string;
  startTime: Date;
}

export interface AuditableAction {
  action: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  description?: string;
  category?: string;
  severity?: string;
  tags?: string[];
}

// Audit Context Middleware
export const auditContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Generate unique identifiers
    const requestId = uuidv4();
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

    // Extract user context from JWT token
    const user = req.user as any;
    
    // Extract technical context
    const ipAddress = req.ip || 
                     req.connection.remoteAddress || 
                     req.headers['x-forwarded-for'] as string ||
                     req.headers['x-real-ip'] as string;
    
    const userAgent = req.headers['user-agent'];

    // Create audit context
    const auditContext: AuditContext = {
      userId: user?.userId,
      userEmail: user?.email,
      userRole: user?.role,
      sessionId: user?.sessionId,
      companyId: user?.companyId,
      ipAddress,
      userAgent,
      requestId,
      correlationId,
      startTime: new Date()
    };

    // Attach to request
    req.auditContext = auditContext;
    req.requestId = requestId;
    req.correlationId = correlationId;

    // Set response headers
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Correlation-ID', correlationId);

    next();
  } catch (error) {
    logger.error('Failed to create audit context:', error);
    next();
  }
};

// API Request Logging Middleware
export const apiAuditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Capture original end function
  const originalEnd = res.end;
  
  // Override end function to log after response
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Log API call
    if (req.auditContext) {
      auditLoggingService.logEvent({
        eventType: 'API_CALL',
        category: 'DATA_ACCESS',
        severity: statusCode >= 400 ? 'HIGH' : 'INFO',
        action: `${req.method} ${req.path}`,
        description: `API call: ${req.method} ${req.originalUrl}`,
        userId: req.auditContext.userId,
        userEmail: req.auditContext.userEmail,
        userRole: req.auditContext.userRole,
        sessionId: req.auditContext.sessionId,
        companyId: req.auditContext.companyId,
        ipAddress: req.auditContext.ipAddress,
        userAgent: req.auditContext.userAgent,
        requestId: req.auditContext.requestId,
        correlationId: req.auditContext.correlationId,
        outcome: statusCode < 400 ? 'SUCCESS' : 'FAILURE',
        errorCode: statusCode >= 400 ? statusCode.toString() : undefined,
        metadata: {
          method: req.method,
          path: req.path,
          query: req.query,
          statusCode,
          duration,
          contentLength: res.get('content-length'),
          referer: req.headers.referer,
          origin: req.headers.origin
        },
        tags: ['api', 'http', req.method.toLowerCase()]
      }).catch(error => {
        logger.error('Failed to log API audit event:', error);
      });
    }
    
    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Authentication Event Logging
export const logAuthenticationEvent = async (
  eventType: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'MFA_CHALLENGE',
  context: {
    userId?: string;
    userEmail?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    companyId?: string;
    reason?: string;
    metadata?: any;
  }
) => {
  try {
    await auditLoggingService.logEvent({
      eventType: 'USER_ACTION',
      category: 'AUTHENTICATION',
      severity: eventType === 'LOGIN_FAILURE' ? 'MEDIUM' : 'INFO',
      action: eventType,
      description: getAuthEventDescription(eventType),
      userId: context.userId,
      userEmail: context.userEmail,
      sessionId: context.sessionId,
      companyId: context.companyId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      outcome: eventType.includes('FAILURE') ? 'FAILURE' : 'SUCCESS',
      errorMessage: context.reason,
      metadata: context.metadata,
      tags: ['authentication', 'security']
    });
  } catch (error) {
    logger.error('Failed to log authentication event:', error);
  }
};

// Data Change Event Logging
export const logDataChangeEvent = async (
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  resourceType: string,
  resourceId: string,
  resourceName: string,
  oldValues?: any,
  newValues?: any,
  context?: AuditContext
) => {
  try {
    const changedFields = oldValues && newValues ? 
      Object.keys(newValues).filter(key => 
        JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])
      ) : [];

    await auditLoggingService.logEvent({
      eventType: 'DATA_CHANGE',
      category: 'DATA_MODIFICATION',
      severity: action === 'DELETE' ? 'MEDIUM' : 'INFO',
      action: `${action}_${resourceType.toUpperCase()}`,
      description: `${action} ${resourceType}: ${resourceName}`,
      userId: context?.userId,
      userEmail: context?.userEmail,
      userRole: context?.userRole,
      sessionId: context?.sessionId,
      companyId: context?.companyId,
      resourceType,
      resourceId,
      resourceName,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      correlationId: context?.correlationId,
      oldValues,
      newValues,
      changedFields,
      tags: ['data-change', resourceType.toLowerCase(), action.toLowerCase()]
    });
  } catch (error) {
    logger.error('Failed to log data change event:', error);
  }
};

// Security Event Logging
export const logSecurityEvent = async (
  eventType: 'ACCESS_DENIED' | 'PRIVILEGE_ESCALATION' | 'SUSPICIOUS_ACTIVITY' | 'SECURITY_VIOLATION',
  description: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
  context?: AuditContext,
  metadata?: any
) => {
  try {
    await auditLoggingService.logEvent({
      eventType: 'SECURITY_EVENT',
      category: 'SECURITY_MONITORING',
      severity,
      action: eventType,
      description,
      userId: context?.userId,
      userEmail: context?.userEmail,
      userRole: context?.userRole,
      sessionId: context?.sessionId,
      companyId: context?.companyId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      correlationId: context?.correlationId,
      outcome: 'BLOCKED',
      metadata,
      tags: ['security', 'violation', severity.toLowerCase()]
    });
  } catch (error) {
    logger.error('Failed to log security event:', error);
  }
};

// System Event Logging
export const logSystemEvent = async (
  eventType: 'STARTUP' | 'SHUTDOWN' | 'ERROR' | 'CONFIGURATION_CHANGE' | 'BACKUP' | 'MAINTENANCE',
  description: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'INFO',
  metadata?: any
) => {
  try {
    await auditLoggingService.logEvent({
      eventType: 'SYSTEM_EVENT',
      category: 'SYSTEM_CONFIGURATION',
      severity,
      action: eventType,
      description,
      outcome: eventType === 'ERROR' ? 'FAILURE' : 'SUCCESS',
      metadata,
      tags: ['system', eventType.toLowerCase()]
    });
  } catch (error) {
    logger.error('Failed to log system event:', error);
  }
};

// Workflow Event Logging
export const logWorkflowEvent = async (
  action: string,
  workflowType: string,
  workflowId: string,
  workflowName: string,
  context?: AuditContext,
  metadata?: any
) => {
  try {
    await auditLoggingService.logEvent({
      eventType: 'WORKFLOW_EVENT',
      category: 'WORKFLOW_MANAGEMENT',
      severity: 'INFO',
      action: `WORKFLOW_${action.toUpperCase()}`,
      description: `Workflow ${action}: ${workflowName}`,
      userId: context?.userId,
      userEmail: context?.userEmail,
      userRole: context?.userRole,
      sessionId: context?.sessionId,
      companyId: context?.companyId,
      resourceType: workflowType,
      resourceId: workflowId,
      resourceName: workflowName,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      correlationId: context?.correlationId,
      metadata,
      tags: ['workflow', workflowType.toLowerCase(), action.toLowerCase()]
    });
  } catch (error) {
    logger.error('Failed to log workflow event:', error);
  }
};

// Compliance Event Logging
export const logComplianceEvent = async (
  eventType: 'POLICY_VIOLATION' | 'COMPLIANCE_CHECK' | 'AUDIT_TRAIL_ACCESS' | 'RETENTION_ACTION',
  description: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
  context?: AuditContext,
  metadata?: any
) => {
  try {
    await auditLoggingService.logEvent({
      eventType: 'COMPLIANCE_EVENT',
      category: 'COMPLIANCE_MONITORING',
      severity,
      action: eventType,
      description,
      userId: context?.userId,
      userEmail: context?.userEmail,
      userRole: context?.userRole,
      sessionId: context?.sessionId,
      companyId: context?.companyId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      correlationId: context?.correlationId,
      metadata,
      tags: ['compliance', eventType.toLowerCase()]
    });
  } catch (error) {
    logger.error('Failed to log compliance event:', error);
  }
};

// Helper function to get authentication event descriptions
function getAuthEventDescription(eventType: string): string {
  const descriptions = {
    'LOGIN_SUCCESS': 'User successfully logged in',
    'LOGIN_FAILURE': 'User login attempt failed',
    'LOGOUT': 'User logged out',
    'PASSWORD_CHANGE': 'User changed password',
    'MFA_CHALLENGE': 'Multi-factor authentication challenge issued'
  };
  
  return descriptions[eventType as keyof typeof descriptions] || eventType;
}

// Export audit logging functions for use in other modules
export const auditLogger = {
  logAuthenticationEvent,
  logDataChangeEvent,
  logSecurityEvent,
  logSystemEvent,
  logWorkflowEvent,
  logComplianceEvent
};
