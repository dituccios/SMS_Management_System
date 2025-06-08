import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface ConfigurationData {
  key: string;
  value: any;
  description?: string;
  category: string;
  dataType: string;
  isSecret?: boolean;
  isEditable?: boolean;
  validationRules?: any;
  defaultValue?: any;
  environment?: string;
  scope?: string;
  companyId?: string;
}

export class SystemConfigurationService {
  private configCache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Configuration Management
  async setConfiguration(data: ConfigurationData, createdBy?: string): Promise<any> {
    try {
      // Encrypt value if it's a secret
      let processedValue = data.value;
      if (data.isSecret) {
        processedValue = this.encryptValue(data.value);
      }

      const configuration = await prisma.systemConfiguration.upsert({
        where: { key: data.key },
        update: {
          value: processedValue,
          description: data.description,
          category: data.category,
          dataType: data.dataType as any,
          isSecret: data.isSecret || false,
          isEditable: data.isEditable !== false,
          validationRules: data.validationRules,
          defaultValue: data.defaultValue,
          environment: data.environment as any || 'PRODUCTION',
          scope: data.scope as any || 'GLOBAL',
          companyId: data.companyId,
          updatedBy: createdBy
        },
        create: {
          key: data.key,
          value: processedValue,
          description: data.description,
          category: data.category,
          dataType: data.dataType as any,
          isSecret: data.isSecret || false,
          isEditable: data.isEditable !== false,
          validationRules: data.validationRules,
          defaultValue: data.defaultValue,
          environment: data.environment as any || 'PRODUCTION',
          scope: data.scope as any || 'GLOBAL',
          companyId: data.companyId,
          createdBy
        }
      });

      // Clear cache for this key
      this.clearCacheKey(data.key);

      logger.info(`Configuration set: ${data.key}`, {
        category: data.category,
        scope: data.scope,
        companyId: data.companyId
      });

      return configuration;
    } catch (error) {
      logger.error('Failed to set configuration:', error);
      throw error;
    }
  }

  async getConfiguration(key: string, companyId?: string, useCache = true): Promise<any> {
    try {
      const cacheKey = this.getCacheKey(key, companyId);
      
      // Check cache first
      if (useCache && this.isCacheValid(cacheKey)) {
        return this.configCache.get(cacheKey);
      }

      const where: any = { key };
      
      // For company-specific configurations, try company first, then global
      if (companyId) {
        const companyConfig = await prisma.systemConfiguration.findFirst({
          where: { key, companyId }
        });
        
        if (companyConfig) {
          const value = this.processConfigValue(companyConfig);
          this.setCacheValue(cacheKey, value);
          return value;
        }
      }

      // Fallback to global configuration
      const globalConfig = await prisma.systemConfiguration.findFirst({
        where: { key, companyId: null }
      });

      if (!globalConfig) {
        return null;
      }

      const value = this.processConfigValue(globalConfig);
      this.setCacheValue(cacheKey, value);
      
      return value;
    } catch (error) {
      logger.error('Failed to get configuration:', error);
      throw error;
    }
  }

  async getConfigurationsByCategory(category: string, companyId?: string): Promise<any[]> {
    try {
      const where: any = { category };
      
      if (companyId) {
        where.OR = [
          { companyId },
          { companyId: null }
        ];
      } else {
        where.companyId = null;
      }

      const configurations = await prisma.systemConfiguration.findMany({
        where,
        orderBy: { key: 'asc' }
      });

      return configurations.map(config => this.processConfigValue(config));
    } catch (error) {
      logger.error('Failed to get configurations by category:', error);
      throw error;
    }
  }

  async getAllConfigurations(companyId?: string, includeSecrets = false): Promise<any[]> {
    try {
      const where: any = {};
      
      if (companyId) {
        where.OR = [
          { companyId },
          { companyId: null }
        ];
      } else {
        where.companyId = null;
      }

      if (!includeSecrets) {
        where.isSecret = false;
      }

      const configurations = await prisma.systemConfiguration.findMany({
        where,
        orderBy: [
          { category: 'asc' },
          { key: 'asc' }
        ]
      });

      return configurations.map(config => this.processConfigValue(config, !includeSecrets));
    } catch (error) {
      logger.error('Failed to get all configurations:', error);
      throw error;
    }
  }

  async deleteConfiguration(key: string, companyId?: string): Promise<void> {
    try {
      const where: any = { key };
      if (companyId) {
        where.companyId = companyId;
      }

      await prisma.systemConfiguration.delete({ where });

      // Clear cache
      this.clearCacheKey(key, companyId);

      logger.info(`Configuration deleted: ${key}`, { companyId });
    } catch (error) {
      logger.error('Failed to delete configuration:', error);
      throw error;
    }
  }

  // Bulk operations
  async setMultipleConfigurations(configurations: ConfigurationData[], createdBy?: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        for (const config of configurations) {
          let processedValue = config.value;
          if (config.isSecret) {
            processedValue = this.encryptValue(config.value);
          }

          await tx.systemConfiguration.upsert({
            where: { key: config.key },
            update: {
              value: processedValue,
              description: config.description,
              category: config.category,
              dataType: config.dataType as any,
              isSecret: config.isSecret || false,
              isEditable: config.isEditable !== false,
              validationRules: config.validationRules,
              defaultValue: config.defaultValue,
              environment: config.environment as any || 'PRODUCTION',
              scope: config.scope as any || 'GLOBAL',
              companyId: config.companyId,
              updatedBy: createdBy
            },
            create: {
              key: config.key,
              value: processedValue,
              description: config.description,
              category: config.category,
              dataType: config.dataType as any,
              isSecret: config.isSecret || false,
              isEditable: config.isEditable !== false,
              validationRules: config.validationRules,
              defaultValue: config.defaultValue,
              environment: config.environment as any || 'PRODUCTION',
              scope: config.scope as any || 'GLOBAL',
              companyId: config.companyId,
              createdBy
            }
          });
        }
      });

      // Clear entire cache
      this.clearCache();

      logger.info(`Bulk configuration update: ${configurations.length} items`);
    } catch (error) {
      logger.error('Failed to set multiple configurations:', error);
      throw error;
    }
  }

  // Validation
  async validateConfiguration(key: string, value: any): Promise<{ isValid: boolean; error?: string }> {
    try {
      const config = await prisma.systemConfiguration.findUnique({
        where: { key }
      });

      if (!config) {
        return { isValid: false, error: 'Configuration not found' };
      }

      // Type validation
      const typeValidation = this.validateDataType(value, config.dataType);
      if (!typeValidation.isValid) {
        return typeValidation;
      }

      // Custom validation rules
      if (config.validationRules) {
        const customValidation = this.validateCustomRules(value, config.validationRules);
        if (!customValidation.isValid) {
          return customValidation;
        }
      }

      return { isValid: true };
    } catch (error) {
      logger.error('Failed to validate configuration:', error);
      return { isValid: false, error: 'Validation failed' };
    }
  }

  // Environment-specific configurations
  async getEnvironmentConfigurations(environment: string, companyId?: string): Promise<any[]> {
    try {
      const where: any = { environment: environment as any };
      
      if (companyId) {
        where.OR = [
          { companyId },
          { companyId: null }
        ];
      } else {
        where.companyId = null;
      }

      const configurations = await prisma.systemConfiguration.findMany({
        where,
        orderBy: { key: 'asc' }
      });

      return configurations.map(config => this.processConfigValue(config));
    } catch (error) {
      logger.error('Failed to get environment configurations:', error);
      throw error;
    }
  }

  // Cache management
  clearCache(): void {
    this.configCache.clear();
    this.cacheExpiry.clear();
  }

  clearCacheKey(key: string, companyId?: string): void {
    const cacheKey = this.getCacheKey(key, companyId);
    this.configCache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
  }

  // Private helper methods
  private processConfigValue(config: any, maskSecrets = true): any {
    let value = config.value;

    // Decrypt secret values
    if (config.isSecret && !maskSecrets) {
      try {
        value = this.decryptValue(value);
      } catch (error) {
        logger.error('Failed to decrypt configuration value:', error);
        value = null;
      }
    } else if (config.isSecret && maskSecrets) {
      value = '***MASKED***';
    }

    return {
      ...config,
      value
    };
  }

  private encryptValue(value: any): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.CONFIG_ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(JSON.stringify(value), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decryptValue(encryptedValue: string): any {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.CONFIG_ENCRYPTION_KEY || 'default-key', 'salt', 32);
    
    const [ivHex, encrypted] = encryptedValue.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  private validateDataType(value: any, dataType: string): { isValid: boolean; error?: string } {
    switch (dataType) {
      case 'STRING':
        if (typeof value !== 'string') {
          return { isValid: false, error: 'Value must be a string' };
        }
        break;
      case 'NUMBER':
        if (typeof value !== 'number' || isNaN(value)) {
          return { isValid: false, error: 'Value must be a number' };
        }
        break;
      case 'INTEGER':
        if (!Number.isInteger(value)) {
          return { isValid: false, error: 'Value must be an integer' };
        }
        break;
      case 'BOOLEAN':
        if (typeof value !== 'boolean') {
          return { isValid: false, error: 'Value must be a boolean' };
        }
        break;
      case 'JSON':
      case 'ARRAY':
      case 'OBJECT':
        try {
          if (typeof value === 'string') {
            JSON.parse(value);
          }
        } catch {
          return { isValid: false, error: 'Value must be valid JSON' };
        }
        break;
    }
    
    return { isValid: true };
  }

  private validateCustomRules(value: any, rules: any): { isValid: boolean; error?: string } {
    if (rules.required && (value === null || value === undefined || value === '')) {
      return { isValid: false, error: 'Value is required' };
    }

    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      return { isValid: false, error: `Minimum length is ${rules.minLength}` };
    }

    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      return { isValid: false, error: `Maximum length is ${rules.maxLength}` };
    }

    if (rules.min && typeof value === 'number' && value < rules.min) {
      return { isValid: false, error: `Minimum value is ${rules.min}` };
    }

    if (rules.max && typeof value === 'number' && value > rules.max) {
      return { isValid: false, error: `Maximum value is ${rules.max}` };
    }

    if (rules.pattern && typeof value === 'string' && !new RegExp(rules.pattern).test(value)) {
      return { isValid: false, error: 'Value does not match required pattern' };
    }

    if (rules.enum && !rules.enum.includes(value)) {
      return { isValid: false, error: `Value must be one of: ${rules.enum.join(', ')}` };
    }

    return { isValid: true };
  }

  private getCacheKey(key: string, companyId?: string): string {
    return companyId ? `${companyId}:${key}` : `global:${key}`;
  }

  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey);
    return expiry ? Date.now() < expiry : false;
  }

  private setCacheValue(cacheKey: string, value: any): void {
    this.configCache.set(cacheKey, value);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);
  }
}

export default new SystemConfigurationService();
