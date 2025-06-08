import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import axios, { AxiosRequestConfig } from 'axios';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface IntegrationData {
  name: string;
  type: string;
  provider: string;
  version?: string;
  configuration: any;
  credentials?: any;
  endpoints?: any;
  isEnabled?: boolean;
  rateLimitConfig?: any;
  webhookUrl?: string;
  webhookSecret?: string;
  webhookEvents?: string[];
  companyId: string;
}

export interface IntegrationLogData {
  integrationId: string;
  operation: string;
  direction: string;
  status: string;
  requestData?: any;
  responseData?: any;
  errorMessage?: string;
  duration?: number;
  retryCount?: number;
  metadata?: any;
}

export class IntegrationService {
  private rateLimiters: Map<string, any> = new Map();

  // Integration Management
  async createIntegration(data: IntegrationData, createdBy?: string): Promise<any> {
    try {
      // Encrypt credentials
      const encryptedCredentials = data.credentials ? this.encryptCredentials(data.credentials) : null;

      const integration = await prisma.integration.create({
        data: {
          name: data.name,
          type: data.type as any,
          provider: data.provider,
          version: data.version || '1.0',
          configuration: data.configuration,
          credentials: encryptedCredentials,
          endpoints: data.endpoints,
          isEnabled: data.isEnabled || false,
          status: 'INACTIVE',
          rateLimitConfig: data.rateLimitConfig,
          webhookUrl: data.webhookUrl,
          webhookSecret: data.webhookSecret,
          webhookEvents: data.webhookEvents || [],
          companyId: data.companyId,
          createdBy
        }
      });

      logger.info(`Integration created: ${integration.id}`, {
        name: data.name,
        type: data.type,
        provider: data.provider,
        companyId: data.companyId
      });

      return integration;
    } catch (error) {
      logger.error('Failed to create integration:', error);
      throw error;
    }
  }

  async getIntegrations(companyId: string, type?: string, isEnabled?: boolean): Promise<any[]> {
    try {
      const where: any = { companyId };
      
      if (type) {
        where.type = type;
      }
      
      if (isEnabled !== undefined) {
        where.isEnabled = isEnabled;
      }

      const integrations = await prisma.integration.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      // Decrypt credentials for response (mask sensitive data)
      return integrations.map(integration => ({
        ...integration,
        credentials: integration.credentials ? this.maskCredentials(integration.credentials) : null
      }));
    } catch (error) {
      logger.error('Failed to get integrations:', error);
      throw error;
    }
  }

  async getIntegration(id: string, includeCredentials = false): Promise<any> {
    try {
      const integration = await prisma.integration.findUnique({
        where: { id },
        include: {
          integrationLogs: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!integration) {
        throw new Error('Integration not found');
      }

      // Handle credentials
      let credentials = integration.credentials;
      if (credentials) {
        if (includeCredentials) {
          credentials = this.decryptCredentials(credentials);
        } else {
          credentials = this.maskCredentials(credentials);
        }
      }

      return {
        ...integration,
        credentials
      };
    } catch (error) {
      logger.error('Failed to get integration:', error);
      throw error;
    }
  }

  async updateIntegration(id: string, data: Partial<IntegrationData>, updatedBy?: string): Promise<any> {
    try {
      const updateData: any = {
        ...data,
        updatedBy
      };

      // Encrypt credentials if provided
      if (data.credentials) {
        updateData.credentials = this.encryptCredentials(data.credentials);
      }

      const integration = await prisma.integration.update({
        where: { id },
        data: updateData
      });

      logger.info(`Integration updated: ${id}`, { updatedBy });

      return integration;
    } catch (error) {
      logger.error('Failed to update integration:', error);
      throw error;
    }
  }

  async enableIntegration(id: string): Promise<void> {
    try {
      await prisma.integration.update({
        where: { id },
        data: {
          isEnabled: true,
          status: 'ACTIVE'
        }
      });

      logger.info(`Integration enabled: ${id}`);
    } catch (error) {
      logger.error('Failed to enable integration:', error);
      throw error;
    }
  }

  async disableIntegration(id: string): Promise<void> {
    try {
      await prisma.integration.update({
        where: { id },
        data: {
          isEnabled: false,
          status: 'INACTIVE'
        }
      });

      logger.info(`Integration disabled: ${id}`);
    } catch (error) {
      logger.error('Failed to disable integration:', error);
      throw error;
    }
  }

  async deleteIntegration(id: string): Promise<void> {
    try {
      await prisma.integration.delete({
        where: { id }
      });

      logger.info(`Integration deleted: ${id}`);
    } catch (error) {
      logger.error('Failed to delete integration:', error);
      throw error;
    }
  }

  // Integration Execution
  async executeIntegration(
    integrationId: string,
    operation: string,
    data?: any,
    options?: any
  ): Promise<any> {
    const startTime = Date.now();
    let logData: IntegrationLogData = {
      integrationId,
      operation,
      direction: 'OUTBOUND',
      status: 'SUCCESS',
      requestData: data,
      metadata: options
    };

    try {
      const integration = await this.getIntegration(integrationId, true);
      
      if (!integration.isEnabled) {
        throw new Error('Integration is disabled');
      }

      // Check rate limits
      await this.checkRateLimit(integrationId, integration.rateLimitConfig);

      // Execute the integration based on type
      let result;
      switch (integration.type) {
        case 'API':
          result = await this.executeApiIntegration(integration, operation, data, options);
          break;
        case 'WEBHOOK':
          result = await this.executeWebhookIntegration(integration, operation, data, options);
          break;
        case 'CRM':
          result = await this.executeCrmIntegration(integration, operation, data, options);
          break;
        case 'HRIS':
          result = await this.executeHrisIntegration(integration, operation, data, options);
          break;
        default:
          throw new Error(`Unsupported integration type: ${integration.type}`);
      }

      logData.responseData = result;
      logData.duration = Date.now() - startTime;

      await this.logIntegrationActivity(logData);

      return result;
    } catch (error) {
      logData.status = 'ERROR';
      logData.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logData.duration = Date.now() - startTime;

      await this.logIntegrationActivity(logData);

      logger.error('Integration execution failed:', error);
      throw error;
    }
  }

  // Webhook handling
  async handleWebhook(integrationId: string, payload: any, headers: any): Promise<any> {
    const logData: IntegrationLogData = {
      integrationId,
      operation: 'webhook_received',
      direction: 'INBOUND',
      status: 'SUCCESS',
      requestData: payload,
      metadata: { headers }
    };

    try {
      const integration = await this.getIntegration(integrationId);
      
      if (!integration.isEnabled) {
        throw new Error('Integration is disabled');
      }

      // Verify webhook signature if secret is configured
      if (integration.webhookSecret) {
        this.verifyWebhookSignature(payload, headers, integration.webhookSecret);
      }

      // Process webhook based on integration type
      const result = await this.processWebhook(integration, payload, headers);

      logData.responseData = result;
      await this.logIntegrationActivity(logData);

      return result;
    } catch (error) {
      logData.status = 'ERROR';
      logData.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.logIntegrationActivity(logData);

      logger.error('Webhook handling failed:', error);
      throw error;
    }
  }

  // Sync operations
  async syncData(integrationId: string, entityType: string, options?: any): Promise<any> {
    try {
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          status: 'SYNCING',
          lastSyncAt: new Date()
        }
      });

      const result = await this.executeIntegration(integrationId, 'sync', { entityType, ...options });

      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          status: 'ACTIVE'
        }
      });

      return result;
    } catch (error) {
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          status: 'ERROR',
          lastError: error instanceof Error ? error.message : 'Sync failed',
          lastErrorAt: new Date()
        }
      });

      throw error;
    }
  }

  // Integration Logs
  async logIntegrationActivity(data: IntegrationLogData): Promise<void> {
    try {
      await prisma.integrationLog.create({
        data: {
          integrationId: data.integrationId,
          operation: data.operation,
          direction: data.direction as any,
          status: data.status as any,
          requestData: data.requestData,
          responseData: data.responseData,
          errorMessage: data.errorMessage,
          duration: data.duration,
          retryCount: data.retryCount || 0,
          metadata: data.metadata
        }
      });
    } catch (error) {
      logger.error('Failed to log integration activity:', error);
    }
  }

  async getIntegrationLogs(
    integrationId: string,
    limit = 50,
    offset = 0,
    status?: string
  ): Promise<any[]> {
    try {
      const where: any = { integrationId };
      
      if (status) {
        where.status = status;
      }

      const logs = await prisma.integrationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      return logs;
    } catch (error) {
      logger.error('Failed to get integration logs:', error);
      throw error;
    }
  }

  // Private helper methods
  private async executeApiIntegration(integration: any, operation: string, data?: any, options?: any): Promise<any> {
    const endpoint = integration.endpoints?.[operation];
    if (!endpoint) {
      throw new Error(`Endpoint not configured for operation: ${operation}`);
    }

    const credentials = this.decryptCredentials(integration.credentials);
    
    const config: AxiosRequestConfig = {
      method: endpoint.method || 'POST',
      url: endpoint.url,
      data,
      headers: {
        'Content-Type': 'application/json',
        ...endpoint.headers,
        ...this.buildAuthHeaders(credentials)
      },
      timeout: endpoint.timeout || 30000
    };

    const response = await axios(config);
    return response.data;
  }

  private async executeWebhookIntegration(integration: any, operation: string, data?: any, options?: any): Promise<any> {
    if (!integration.webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      operation,
      data,
      timestamp: new Date().toISOString(),
      integrationId: integration.id
    };

    const signature = this.generateWebhookSignature(payload, integration.webhookSecret);

    const response = await axios.post(integration.webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature
      },
      timeout: 30000
    });

    return response.data;
  }

  private async executeCrmIntegration(integration: any, operation: string, data?: any, options?: any): Promise<any> {
    // Implement CRM-specific logic based on provider
    switch (integration.provider.toLowerCase()) {
      case 'salesforce':
        return this.executeSalesforceOperation(integration, operation, data, options);
      case 'hubspot':
        return this.executeHubspotOperation(integration, operation, data, options);
      default:
        throw new Error(`Unsupported CRM provider: ${integration.provider}`);
    }
  }

  private async executeHrisIntegration(integration: any, operation: string, data?: any, options?: any): Promise<any> {
    // Implement HRIS-specific logic based on provider
    switch (integration.provider.toLowerCase()) {
      case 'workday':
        return this.executeWorkdayOperation(integration, operation, data, options);
      case 'bamboohr':
        return this.executeBambooHrOperation(integration, operation, data, options);
      default:
        throw new Error(`Unsupported HRIS provider: ${integration.provider}`);
    }
  }

  private async executeSalesforceOperation(integration: any, operation: string, data?: any, options?: any): Promise<any> {
    // Placeholder for Salesforce integration
    throw new Error('Salesforce integration not implemented');
  }

  private async executeHubspotOperation(integration: any, operation: string, data?: any, options?: any): Promise<any> {
    // Placeholder for HubSpot integration
    throw new Error('HubSpot integration not implemented');
  }

  private async executeWorkdayOperation(integration: any, operation: string, data?: any, options?: any): Promise<any> {
    // Placeholder for Workday integration
    throw new Error('Workday integration not implemented');
  }

  private async executeBambooHrOperation(integration: any, operation: string, data?: any, options?: any): Promise<any> {
    // Placeholder for BambooHR integration
    throw new Error('BambooHR integration not implemented');
  }

  private async processWebhook(integration: any, payload: any, headers: any): Promise<any> {
    // Process webhook based on integration type and provider
    // This would contain the business logic for handling incoming webhooks
    return { processed: true, timestamp: new Date().toISOString() };
  }

  private encryptCredentials(credentials: any): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.INTEGRATION_ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decryptCredentials(encryptedCredentials: string): any {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.INTEGRATION_ENCRYPTION_KEY || 'default-key', 'salt', 32);
    
    const [ivHex, encrypted] = encryptedCredentials.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  private maskCredentials(credentials: any): any {
    if (typeof credentials === 'string') {
      try {
        const parsed = JSON.parse(credentials);
        return this.maskObject(parsed);
      } catch {
        return '***MASKED***';
      }
    }
    return this.maskObject(credentials);
  }

  private maskObject(obj: any): any {
    const masked: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.length > 0) {
        masked[key] = '***MASKED***';
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  private buildAuthHeaders(credentials: any): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (credentials.apiKey) {
      headers['Authorization'] = `Bearer ${credentials.apiKey}`;
    } else if (credentials.username && credentials.password) {
      const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }
    
    return headers;
  }

  private generateWebhookSignature(payload: any, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  private verifyWebhookSignature(payload: any, headers: any, secret: string): void {
    const signature = headers['x-webhook-signature'] || headers['X-Webhook-Signature'];
    if (!signature) {
      throw new Error('Missing webhook signature');
    }

    const expectedSignature = this.generateWebhookSignature(payload, secret);
    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }
  }

  private async checkRateLimit(integrationId: string, rateLimitConfig?: any): Promise<void> {
    if (!rateLimitConfig) return;

    // Implement rate limiting logic
    // This is a simplified version - in production, you'd use Redis or similar
    const key = `rate_limit_${integrationId}`;
    const now = Date.now();
    
    // For now, just log the rate limit check
    logger.debug(`Rate limit check for integration: ${integrationId}`);
  }
}

export default new IntegrationService();
