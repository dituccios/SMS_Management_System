import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { EventEmitter } from 'events';
import auditLoggingService from '../audit/auditLoggingService';
import axios from 'axios';
import cron from 'node-cron';

const prisma = new PrismaClient();

export interface RiskDataCollector {
  id: string;
  name: string;
  description: string;
  type: 'INCIDENT_BASED' | 'EXTERNAL_API' | 'MANUAL_INPUT' | 'CALCULATED' | 'THREAT_INTELLIGENCE';
  configuration: CollectorConfiguration;
  schedule: CollectionSchedule;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'IDLE' | 'RUNNING' | 'ERROR' | 'DISABLED';
}

export interface CollectorConfiguration {
  dataSource: DataSourceConfig;
  transformation: TransformationConfig;
  validation: ValidationConfig;
  storage: StorageConfig;
  errorHandling: ErrorHandlingConfig;
}

export interface DataSourceConfig {
  type: string;
  endpoint?: string;
  query?: string;
  authentication?: AuthenticationConfig;
  parameters?: any;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

export interface AuthenticationConfig {
  type: 'API_KEY' | 'OAUTH' | 'BASIC' | 'BEARER' | 'CUSTOM';
  credentials: any;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface TransformationConfig {
  mappings: FieldMapping[];
  calculations: CalculationRule[];
  aggregations: AggregationRule[];
  filters: FilterRule[];
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  dataType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'OBJECT' | 'ARRAY';
  transformation?: string;
  defaultValue?: any;
  required: boolean;
}

export interface CalculationRule {
  name: string;
  expression: string;
  dependencies: string[];
  outputField: string;
}

export interface AggregationRule {
  groupBy: string[];
  aggregations: Array<{
    field: string;
    function: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'STDDEV';
    outputField: string;
  }>;
}

export interface FilterRule {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'IN' | 'NOT_IN';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface ValidationConfig {
  rules: ValidationRule[];
  onValidationFailure: 'REJECT' | 'LOG_AND_CONTINUE' | 'USE_DEFAULT';
}

export interface ValidationRule {
  field: string;
  type: 'REQUIRED' | 'TYPE_CHECK' | 'RANGE' | 'PATTERN' | 'CUSTOM';
  parameters: any;
  errorMessage: string;
}

export interface StorageConfig {
  destination: 'DATABASE' | 'CACHE' | 'FILE' | 'EXTERNAL_SYSTEM';
  tableName?: string;
  retentionPeriod?: number;
  compressionEnabled?: boolean;
}

export interface ErrorHandlingConfig {
  maxRetries: number;
  retryDelay: number;
  escalationThreshold: number;
  notificationTargets: string[];
}

export interface CollectionSchedule {
  frequency: 'REAL_TIME' | 'CONTINUOUS' | 'INTERVAL' | 'CRON';
  interval?: number; // in minutes
  cronExpression?: string;
  timezone?: string;
  enabled: boolean;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface ThreatIntelligenceFeed {
  id: string;
  name: string;
  provider: string;
  feedType: 'IOC' | 'VULNERABILITY' | 'THREAT_ACTOR' | 'CAMPAIGN' | 'MALWARE' | 'GENERAL';
  endpoint: string;
  authentication: AuthenticationConfig;
  updateFrequency: number; // in minutes
  isActive: boolean;
  lastUpdate?: Date;
  recordCount?: number;
}

export interface ComplianceRequirementMapping {
  id: string;
  framework: string;
  requirementId: string;
  requirementText: string;
  riskFactors: string[];
  assessmentCriteria: AssessmentCriteria[];
  evidenceRequirements: string[];
  automatedChecks: AutomatedCheck[];
}

export interface AssessmentCriteria {
  criterion: string;
  weight: number;
  scoringMethod: string;
  thresholds: any[];
}

export interface AutomatedCheck {
  checkType: 'DATA_PRESENCE' | 'VALUE_RANGE' | 'PATTERN_MATCH' | 'CALCULATION' | 'EXTERNAL_VALIDATION';
  configuration: any;
  frequency: string;
  alertOnFailure: boolean;
}

export class RiskDataCollectionService extends EventEmitter {
  private collectors: Map<string, RiskDataCollector> = new Map();
  private scheduledJobs: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeCollectors();
  }

  // Risk Data Collector Management
  async createDataCollector(collector: Omit<RiskDataCollector, 'id'>): Promise<string> {
    try {
      const collectorId = crypto.randomUUID();

      const newCollector: RiskDataCollector = {
        id: collectorId,
        ...collector,
        status: 'IDLE'
      };

      await prisma.riskDataCollector.create({
        data: {
          id: collectorId,
          name: collector.name,
          description: collector.description,
          type: collector.type as any,
          configuration: collector.configuration,
          schedule: collector.schedule,
          isActive: collector.isActive,
          status: 'IDLE'
        }
      });

      this.collectors.set(collectorId, newCollector);

      // Schedule collector if active
      if (collector.isActive) {
        await this.scheduleCollector(collectorId);
      }

      // Log collector creation
      await auditLoggingService.logEvent({
        eventType: 'DATA_CHANGE',
        category: 'RISK_MANAGEMENT',
        action: 'DATA_COLLECTOR_CREATED',
        description: `Risk data collector created: ${collector.name}`,
        resourceType: 'RISK_DATA_COLLECTOR',
        resourceId: collectorId,
        metadata: {
          collectorName: collector.name,
          type: collector.type,
          isActive: collector.isActive
        },
        tags: ['risk', 'data-collection', 'creation']
      });

      this.emit('collectorCreated', { collectorId, collector: newCollector });

      logger.info(`Risk data collector created: ${collectorId}`, {
        name: collector.name,
        type: collector.type
      });

      return collectorId;
    } catch (error) {
      logger.error('Failed to create data collector:', error);
      throw error;
    }
  }

  async runDataCollector(collectorId: string): Promise<any> {
    try {
      const collector = this.collectors.get(collectorId);
      if (!collector) {
        throw new Error('Collector not found');
      }

      if (collector.status === 'RUNNING') {
        throw new Error('Collector is already running');
      }

      // Update collector status
      collector.status = 'RUNNING';
      collector.lastRun = new Date();

      await this.updateCollectorStatus(collectorId, 'RUNNING');

      let collectedData: any;

      // Collect data based on collector type
      switch (collector.type) {
        case 'INCIDENT_BASED':
          collectedData = await this.collectIncidentData(collector);
          break;
        case 'EXTERNAL_API':
          collectedData = await this.collectExternalApiData(collector);
          break;
        case 'THREAT_INTELLIGENCE':
          collectedData = await this.collectThreatIntelligenceData(collector);
          break;
        case 'CALCULATED':
          collectedData = await this.collectCalculatedData(collector);
          break;
        case 'MANUAL_INPUT':
          collectedData = await this.collectManualInputData(collector);
          break;
        default:
          throw new Error(`Unsupported collector type: ${collector.type}`);
      }

      // Transform data
      const transformedData = await this.transformData(collectedData, collector.configuration.transformation);

      // Validate data
      const validatedData = await this.validateData(transformedData, collector.configuration.validation);

      // Store data
      await this.storeData(validatedData, collector.configuration.storage);

      // Update collector status
      collector.status = 'IDLE';
      await this.updateCollectorStatus(collectorId, 'IDLE');

      // Log successful collection
      await auditLoggingService.logEvent({
        eventType: 'DATA_CHANGE',
        category: 'RISK_MANAGEMENT',
        action: 'DATA_COLLECTION_COMPLETED',
        description: `Risk data collection completed: ${collector.name}`,
        resourceType: 'RISK_DATA_COLLECTOR',
        resourceId: collectorId,
        metadata: {
          collectorName: collector.name,
          recordCount: Array.isArray(validatedData) ? validatedData.length : 1,
          executionTime: Date.now() - collector.lastRun!.getTime()
        },
        tags: ['risk', 'data-collection', 'success']
      });

      this.emit('dataCollected', { collectorId, data: validatedData });

      logger.info(`Risk data collection completed: ${collectorId}`, {
        recordCount: Array.isArray(validatedData) ? validatedData.length : 1
      });

      return validatedData;
    } catch (error) {
      // Update collector status to error
      const collector = this.collectors.get(collectorId);
      if (collector) {
        collector.status = 'ERROR';
        await this.updateCollectorStatus(collectorId, 'ERROR');
      }

      // Log error
      await auditLoggingService.logEvent({
        eventType: 'SYSTEM_EVENT',
        category: 'RISK_MANAGEMENT',
        severity: 'HIGH',
        action: 'DATA_COLLECTION_FAILED',
        description: `Risk data collection failed: ${collector?.name}`,
        resourceType: 'RISK_DATA_COLLECTOR',
        resourceId: collectorId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        tags: ['risk', 'data-collection', 'error']
      });

      logger.error(`Risk data collection failed: ${collectorId}`, error);
      throw error;
    }
  }

  // Incident Database Integration
  async collectIncidentData(collector: RiskDataCollector): Promise<any[]> {
    try {
      const config = collector.configuration.dataSource;
      const query = config.query || this.buildDefaultIncidentQuery();

      // Execute query against incident database
      const incidents = await prisma.$queryRawUnsafe(query, ...(config.parameters || []));

      // Apply additional processing
      const processedData = await this.processIncidentData(incidents, collector.configuration);

      logger.debug(`Collected incident data: ${Array.isArray(incidents) ? incidents.length : 0} records`);

      return processedData;
    } catch (error) {
      logger.error('Failed to collect incident data:', error);
      throw error;
    }
  }

  // External Threat Intelligence Integration
  async collectThreatIntelligenceData(collector: RiskDataCollector): Promise<any[]> {
    try {
      const config = collector.configuration.dataSource;
      
      // Authenticate with threat intelligence provider
      const authHeaders = await this.authenticateWithProvider(config.authentication!);

      // Fetch threat intelligence data
      const response = await axios.get(config.endpoint!, {
        headers: authHeaders,
        timeout: config.timeout || 30000,
        params: config.parameters
      });

      // Process threat intelligence data
      const processedData = await this.processThreatIntelligenceData(response.data, collector.configuration);

      logger.debug(`Collected threat intelligence data: ${Array.isArray(response.data) ? response.data.length : 0} records`);

      return processedData;
    } catch (error) {
      logger.error('Failed to collect threat intelligence data:', error);
      throw error;
    }
  }

  // External API Data Collection
  async collectExternalApiData(collector: RiskDataCollector): Promise<any> {
    try {
      const config = collector.configuration.dataSource;
      
      const requestConfig: any = {
        method: 'GET',
        url: config.endpoint,
        timeout: config.timeout || 30000,
        params: config.parameters
      };

      // Add authentication if configured
      if (config.authentication) {
        const authHeaders = await this.authenticateWithProvider(config.authentication);
        requestConfig.headers = { ...requestConfig.headers, ...authHeaders };
      }

      const response = await axios(requestConfig);

      logger.debug(`Collected external API data from: ${config.endpoint}`);

      return response.data;
    } catch (error) {
      logger.error('Failed to collect external API data:', error);
      throw error;
    }
  }

  // Compliance Requirement Mapping
  async createComplianceMapping(mapping: Omit<ComplianceRequirementMapping, 'id'>): Promise<string> {
    try {
      const mappingId = crypto.randomUUID();

      await prisma.complianceRequirementMapping.create({
        data: {
          id: mappingId,
          framework: mapping.framework,
          requirementId: mapping.requirementId,
          requirementText: mapping.requirementText,
          riskFactors: mapping.riskFactors,
          assessmentCriteria: mapping.assessmentCriteria,
          evidenceRequirements: mapping.evidenceRequirements,
          automatedChecks: mapping.automatedChecks
        }
      });

      // Log mapping creation
      await auditLoggingService.logEvent({
        eventType: 'DATA_CHANGE',
        category: 'COMPLIANCE_MONITORING',
        action: 'COMPLIANCE_MAPPING_CREATED',
        description: `Compliance requirement mapping created: ${mapping.framework} - ${mapping.requirementId}`,
        resourceType: 'COMPLIANCE_MAPPING',
        resourceId: mappingId,
        metadata: {
          framework: mapping.framework,
          requirementId: mapping.requirementId,
          riskFactorCount: mapping.riskFactors.length
        },
        tags: ['compliance', 'mapping', 'creation']
      });

      this.emit('complianceMappingCreated', { mappingId, mapping });

      logger.info(`Compliance requirement mapping created: ${mappingId}`, {
        framework: mapping.framework,
        requirementId: mapping.requirementId
      });

      return mappingId;
    } catch (error) {
      logger.error('Failed to create compliance mapping:', error);
      throw error;
    }
  }

  async assessComplianceRequirement(mappingId: string): Promise<any> {
    try {
      const mapping = await prisma.complianceRequirementMapping.findUnique({
        where: { id: mappingId }
      });

      if (!mapping) {
        throw new Error('Compliance mapping not found');
      }

      const assessmentResults = {
        mappingId,
        framework: mapping.framework,
        requirementId: mapping.requirementId,
        assessmentDate: new Date(),
        criteriaResults: [],
        overallScore: 0,
        status: 'PENDING',
        findings: [],
        recommendations: []
      };

      // Assess each criterion
      for (const criterion of mapping.assessmentCriteria) {
        const criterionResult = await this.assessCriterion(criterion, mapping.riskFactors);
        assessmentResults.criteriaResults.push(criterionResult);
      }

      // Calculate overall score
      assessmentResults.overallScore = this.calculateOverallComplianceScore(assessmentResults.criteriaResults);

      // Determine status
      assessmentResults.status = assessmentResults.overallScore >= 80 ? 'COMPLIANT' : 
                                assessmentResults.overallScore >= 60 ? 'PARTIALLY_COMPLIANT' : 'NON_COMPLIANT';

      // Store assessment results
      await prisma.complianceAssessmentResult.create({
        data: {
          id: crypto.randomUUID(),
          mappingId,
          assessmentDate: assessmentResults.assessmentDate,
          results: assessmentResults,
          overallScore: assessmentResults.overallScore,
          status: assessmentResults.status as any
        }
      });

      return assessmentResults;
    } catch (error) {
      logger.error('Failed to assess compliance requirement:', error);
      throw error;
    }
  }

  // Private Helper Methods
  private async initializeCollectors(): Promise<void> {
    try {
      const collectors = await prisma.riskDataCollector.findMany({
        where: { isActive: true }
      });

      for (const collector of collectors) {
        this.collectors.set(collector.id, collector as RiskDataCollector);
        await this.scheduleCollector(collector.id);
      }

      logger.info(`Initialized ${collectors.length} risk data collectors`);
    } catch (error) {
      logger.error('Failed to initialize collectors:', error);
    }
  }

  private async scheduleCollector(collectorId: string): Promise<void> {
    try {
      const collector = this.collectors.get(collectorId);
      if (!collector || !collector.isActive) return;

      const schedule = collector.schedule;

      if (schedule.frequency === 'CRON' && schedule.cronExpression) {
        const job = cron.schedule(schedule.cronExpression, async () => {
          await this.runDataCollector(collectorId);
        }, {
          scheduled: false,
          timezone: schedule.timezone || 'UTC'
        });

        if (schedule.enabled) {
          job.start();
        }

        this.scheduledJobs.set(collectorId, job);
      } else if (schedule.frequency === 'INTERVAL' && schedule.interval) {
        const intervalMs = schedule.interval * 60 * 1000; // Convert minutes to milliseconds
        const intervalId = setInterval(async () => {
          await this.runDataCollector(collectorId);
        }, intervalMs);

        this.scheduledJobs.set(collectorId, intervalId);
      }

      logger.debug(`Scheduled collector: ${collectorId}`, { frequency: schedule.frequency });
    } catch (error) {
      logger.error(`Failed to schedule collector: ${collectorId}`, error);
    }
  }

  private async updateCollectorStatus(collectorId: string, status: string): Promise<void> {
    try {
      await prisma.riskDataCollector.update({
        where: { id: collectorId },
        data: { 
          status: status as any,
          lastRun: new Date()
        }
      });

      const collector = this.collectors.get(collectorId);
      if (collector) {
        collector.status = status as any;
      }
    } catch (error) {
      logger.error('Failed to update collector status:', error);
    }
  }

  private buildDefaultIncidentQuery(): string {
    return `
      SELECT 
        id,
        title,
        description,
        severity,
        category,
        status,
        created_at,
        resolved_at,
        impact_score,
        likelihood_score
      FROM incidents 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
    `;
  }

  private async processIncidentData(incidents: any[], configuration: CollectorConfiguration): Promise<any[]> {
    // Apply transformations and calculations specific to incident data
    return incidents.map(incident => ({
      ...incident,
      risk_score: this.calculateIncidentRiskScore(incident),
      age_days: this.calculateIncidentAge(incident.created_at),
      resolution_time: incident.resolved_at ? 
        this.calculateResolutionTime(incident.created_at, incident.resolved_at) : null
    }));
  }

  private async processThreatIntelligenceData(data: any, configuration: CollectorConfiguration): Promise<any[]> {
    // Process and normalize threat intelligence data
    if (!Array.isArray(data)) {
      data = [data];
    }

    return data.map(item => ({
      ...item,
      processed_at: new Date(),
      threat_level: this.normalizeThreatLevel(item.severity || item.threat_level),
      confidence_score: this.normalizeConfidenceScore(item.confidence)
    }));
  }

  private async authenticateWithProvider(authConfig: AuthenticationConfig): Promise<any> {
    const headers: any = {};

    switch (authConfig.type) {
      case 'API_KEY':
        headers['X-API-Key'] = authConfig.credentials.apiKey;
        break;
      case 'BEARER':
        headers['Authorization'] = `Bearer ${authConfig.credentials.token}`;
        break;
      case 'BASIC':
        const credentials = Buffer.from(`${authConfig.credentials.username}:${authConfig.credentials.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'OAUTH':
        // Handle OAuth token refresh if needed
        if (authConfig.expiresAt && new Date() >= authConfig.expiresAt) {
          await this.refreshOAuthToken(authConfig);
        }
        headers['Authorization'] = `Bearer ${authConfig.credentials.accessToken}`;
        break;
    }

    return headers;
  }

  private async refreshOAuthToken(authConfig: AuthenticationConfig): Promise<void> {
    // Implement OAuth token refresh logic
    logger.debug('Refreshing OAuth token');
  }

  private async transformData(data: any, transformConfig: TransformationConfig): Promise<any> {
    let transformedData = data;

    // Apply field mappings
    if (transformConfig.mappings && transformConfig.mappings.length > 0) {
      transformedData = this.applyFieldMappings(transformedData, transformConfig.mappings);
    }

    // Apply filters
    if (transformConfig.filters && transformConfig.filters.length > 0) {
      transformedData = this.applyFilters(transformedData, transformConfig.filters);
    }

    // Apply calculations
    if (transformConfig.calculations && transformConfig.calculations.length > 0) {
      transformedData = this.applyCalculations(transformedData, transformConfig.calculations);
    }

    // Apply aggregations
    if (transformConfig.aggregations && transformConfig.aggregations.length > 0) {
      transformedData = this.applyAggregations(transformedData, transformConfig.aggregations);
    }

    return transformedData;
  }

  private async validateData(data: any, validationConfig: ValidationConfig): Promise<any> {
    // Implement data validation logic
    return data;
  }

  private async storeData(data: any, storageConfig: StorageConfig): Promise<void> {
    // Implement data storage logic based on destination
    switch (storageConfig.destination) {
      case 'DATABASE':
        await this.storeInDatabase(data, storageConfig);
        break;
      case 'CACHE':
        await this.storeInCache(data, storageConfig);
        break;
      case 'FILE':
        await this.storeInFile(data, storageConfig);
        break;
    }
  }

  private async collectCalculatedData(collector: RiskDataCollector): Promise<any> {
    // Implement calculated data collection
    return {};
  }

  private async collectManualInputData(collector: RiskDataCollector): Promise<any> {
    // Implement manual input data collection
    return {};
  }

  private calculateIncidentRiskScore(incident: any): number {
    // Simple risk score calculation based on severity and impact
    const severityScore = this.getSeverityScore(incident.severity);
    const impactScore = incident.impact_score || 1;
    const likelihoodScore = incident.likelihood_score || 1;
    
    return (severityScore * impactScore * likelihoodScore) / 3;
  }

  private calculateIncidentAge(createdAt: Date): number {
    const now = new Date();
    const created = new Date(createdAt);
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  private calculateResolutionTime(createdAt: Date, resolvedAt: Date): number {
    const created = new Date(createdAt);
    const resolved = new Date(resolvedAt);
    return Math.floor((resolved.getTime() - created.getTime()) / (1000 * 60 * 60)); // Hours
  }

  private getSeverityScore(severity: string): number {
    const severityMap: Record<string, number> = {
      'LOW': 1,
      'MEDIUM': 2,
      'HIGH': 3,
      'CRITICAL': 4
    };
    return severityMap[severity?.toUpperCase()] || 1;
  }

  private normalizeThreatLevel(level: string): string {
    // Normalize threat level to standard values
    const normalizedMap: Record<string, string> = {
      'low': 'LOW',
      'medium': 'MEDIUM',
      'high': 'HIGH',
      'critical': 'CRITICAL'
    };
    return normalizedMap[level?.toLowerCase()] || 'UNKNOWN';
  }

  private normalizeConfidenceScore(confidence: any): number {
    if (typeof confidence === 'number') {
      return Math.max(0, Math.min(100, confidence));
    }
    if (typeof confidence === 'string') {
      const confidenceMap: Record<string, number> = {
        'low': 25,
        'medium': 50,
        'high': 75,
        'very high': 90
      };
      return confidenceMap[confidence.toLowerCase()] || 50;
    }
    return 50; // Default confidence
  }

  private applyFieldMappings(data: any, mappings: FieldMapping[]): any {
    // Implement field mapping logic
    return data;
  }

  private applyFilters(data: any, filters: FilterRule[]): any {
    // Implement filtering logic
    return data;
  }

  private applyCalculations(data: any, calculations: CalculationRule[]): any {
    // Implement calculation logic
    return data;
  }

  private applyAggregations(data: any, aggregations: AggregationRule[]): any {
    // Implement aggregation logic
    return data;
  }

  private async storeInDatabase(data: any, config: StorageConfig): Promise<void> {
    // Store data in database
  }

  private async storeInCache(data: any, config: StorageConfig): Promise<void> {
    // Store data in cache
  }

  private async storeInFile(data: any, config: StorageConfig): Promise<void> {
    // Store data in file
  }

  private async assessCriterion(criterion: AssessmentCriteria, riskFactors: string[]): Promise<any> {
    // Implement criterion assessment logic
    return {
      criterion: criterion.criterion,
      score: 75,
      weight: criterion.weight,
      status: 'COMPLIANT'
    };
  }

  private calculateOverallComplianceScore(criteriaResults: any[]): number {
    if (criteriaResults.length === 0) return 0;

    const totalWeightedScore = criteriaResults.reduce((sum, result) => 
      sum + (result.score * result.weight), 0);
    const totalWeight = criteriaResults.reduce((sum, result) => sum + result.weight, 0);

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  }
}

export default new RiskDataCollectionService();
