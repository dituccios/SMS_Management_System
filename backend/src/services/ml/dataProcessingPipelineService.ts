import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { EventEmitter } from 'events';
import auditLoggingService from '../audit/auditLoggingService';

const prisma = new PrismaClient();

export interface DataPipeline {
  pipelineId: string;
  name: string;
  description: string;
  stages: PipelineStage[];
  schedule: PipelineSchedule;
  status: 'ACTIVE' | 'INACTIVE' | 'RUNNING' | 'ERROR' | 'COMPLETED';
  configuration: PipelineConfiguration;
  metrics: PipelineMetrics;
  createdAt: Date;
  lastRun: Date;
}

export interface PipelineStage {
  stageId: string;
  name: string;
  type: 'EXTRACT' | 'TRANSFORM' | 'LOAD' | 'VALIDATE' | 'FEATURE_ENGINEERING' | 'QUALITY_CHECK';
  order: number;
  configuration: StageConfiguration;
  dependencies: string[];
  outputs: string[];
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  metrics: StageMetrics;
}

export interface PipelineSchedule {
  type: 'CRON' | 'INTERVAL' | 'EVENT_DRIVEN' | 'MANUAL';
  expression?: string;
  interval?: number;
  events?: string[];
  timezone?: string;
  enabled: boolean;
}

export interface PipelineConfiguration {
  parallelism: number;
  retryPolicy: RetryPolicy;
  timeout: number;
  resources: ResourceRequirements;
  notifications: NotificationSettings;
  dataQuality: DataQualitySettings;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'LINEAR' | 'EXPONENTIAL' | 'FIXED';
  initialDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

export interface ResourceRequirements {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
}

export interface NotificationSettings {
  onSuccess: boolean;
  onFailure: boolean;
  onWarning: boolean;
  channels: NotificationChannel[];
}

export interface NotificationChannel {
  type: 'EMAIL' | 'SLACK' | 'WEBHOOK' | 'SMS';
  configuration: Record<string, any>;
  enabled: boolean;
}

export interface DataQualitySettings {
  enableValidation: boolean;
  validationRules: ValidationRule[];
  qualityThresholds: QualityThreshold[];
  actions: QualityAction[];
}

export interface ValidationRule {
  ruleId: string;
  name: string;
  type: 'COMPLETENESS' | 'ACCURACY' | 'CONSISTENCY' | 'VALIDITY' | 'UNIQUENESS' | 'TIMELINESS';
  condition: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  enabled: boolean;
}

export interface QualityThreshold {
  metric: string;
  threshold: number;
  operator: 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NEQ';
  action: 'WARN' | 'FAIL' | 'CONTINUE';
}

export interface QualityAction {
  trigger: string;
  action: 'ALERT' | 'RETRY' | 'SKIP' | 'STOP' | 'QUARANTINE';
  configuration: Record<string, any>;
}

export interface StageConfiguration {
  source?: DataSource;
  destination?: DataDestination;
  transformation?: TransformationConfig;
  validation?: ValidationConfig;
  featureEngineering?: FeatureEngineeringConfig;
}

export interface DataSource {
  type: 'DATABASE' | 'FILE' | 'API' | 'STREAM' | 'QUEUE';
  connection: ConnectionConfig;
  query?: string;
  filters?: Record<string, any>;
  pagination?: PaginationConfig;
}

export interface DataDestination {
  type: 'DATABASE' | 'FILE' | 'API' | 'CACHE' | 'QUEUE';
  connection: ConnectionConfig;
  format?: 'JSON' | 'CSV' | 'PARQUET' | 'AVRO';
  compression?: 'GZIP' | 'SNAPPY' | 'LZ4';
  partitioning?: PartitioningConfig;
}

export interface ConnectionConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  url?: string;
  headers?: Record<string, string>;
  parameters?: Record<string, any>;
}

export interface PaginationConfig {
  pageSize: number;
  maxPages?: number;
  offsetField?: string;
  limitField?: string;
}

export interface PartitioningConfig {
  strategy: 'TIME' | 'HASH' | 'RANGE';
  field: string;
  partitions: number;
}

export interface TransformationConfig {
  operations: TransformationOperation[];
  schema?: SchemaDefinition;
  aggregations?: AggregationConfig[];
  joins?: JoinConfig[];
}

export interface TransformationOperation {
  operationId: string;
  type: 'MAP' | 'FILTER' | 'AGGREGATE' | 'JOIN' | 'UNION' | 'PIVOT' | 'UNPIVOT' | 'SORT';
  configuration: Record<string, any>;
  order: number;
}

export interface SchemaDefinition {
  fields: FieldDefinition[];
  constraints: SchemaConstraint[];
}

export interface FieldDefinition {
  name: string;
  type: 'STRING' | 'INTEGER' | 'FLOAT' | 'BOOLEAN' | 'DATE' | 'TIMESTAMP' | 'JSON';
  nullable: boolean;
  defaultValue?: any;
  description?: string;
}

export interface SchemaConstraint {
  type: 'PRIMARY_KEY' | 'FOREIGN_KEY' | 'UNIQUE' | 'CHECK' | 'NOT_NULL';
  fields: string[];
  condition?: string;
}

export interface AggregationConfig {
  groupBy: string[];
  aggregations: AggregationFunction[];
}

export interface AggregationFunction {
  field: string;
  function: 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX' | 'STDDEV' | 'VARIANCE';
  alias?: string;
}

export interface JoinConfig {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
  leftTable: string;
  rightTable: string;
  condition: string;
}

export interface ValidationConfig {
  rules: ValidationRule[];
  sampling: SamplingConfig;
  reporting: ValidationReporting;
}

export interface SamplingConfig {
  strategy: 'RANDOM' | 'SYSTEMATIC' | 'STRATIFIED';
  size: number;
  seed?: number;
}

export interface ValidationReporting {
  generateReport: boolean;
  includeDetails: boolean;
  format: 'JSON' | 'HTML' | 'PDF';
  destination: string;
}

export interface FeatureEngineeringConfig {
  features: FeatureDefinition[];
  encoding: EncodingConfig;
  scaling: ScalingConfig;
  selection: FeatureSelectionConfig;
}

export interface FeatureDefinition {
  name: string;
  type: 'NUMERICAL' | 'CATEGORICAL' | 'TEMPORAL' | 'TEXT' | 'DERIVED';
  source: string;
  transformation?: string;
  parameters?: Record<string, any>;
}

export interface EncodingConfig {
  categorical: CategoricalEncoding[];
  temporal: TemporalEncoding[];
  text: TextEncoding[];
}

export interface CategoricalEncoding {
  field: string;
  method: 'ONE_HOT' | 'LABEL' | 'TARGET' | 'BINARY' | 'ORDINAL';
  parameters?: Record<string, any>;
}

export interface TemporalEncoding {
  field: string;
  components: ('YEAR' | 'MONTH' | 'DAY' | 'HOUR' | 'MINUTE' | 'WEEKDAY' | 'QUARTER')[];
  cyclical: boolean;
}

export interface TextEncoding {
  field: string;
  method: 'BAG_OF_WORDS' | 'TF_IDF' | 'WORD2VEC' | 'BERT' | 'SENTIMENT';
  parameters?: Record<string, any>;
}

export interface ScalingConfig {
  numerical: NumericalScaling[];
  robust: boolean;
  outlierHandling: OutlierHandling;
}

export interface NumericalScaling {
  field: string;
  method: 'STANDARD' | 'MIN_MAX' | 'ROBUST' | 'QUANTILE' | 'POWER';
  parameters?: Record<string, any>;
}

export interface OutlierHandling {
  method: 'IQR' | 'Z_SCORE' | 'ISOLATION_FOREST' | 'LOCAL_OUTLIER_FACTOR';
  threshold: number;
  action: 'REMOVE' | 'CAP' | 'TRANSFORM' | 'FLAG';
}

export interface FeatureSelectionConfig {
  method: 'CORRELATION' | 'MUTUAL_INFO' | 'CHI2' | 'ANOVA' | 'RECURSIVE' | 'LASSO';
  parameters?: Record<string, any>;
  maxFeatures?: number;
  threshold?: number;
}

export interface PipelineMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageRuntime: number;
  lastRuntime: number;
  dataVolume: DataVolumeMetrics;
  qualityMetrics: DataQualityMetrics;
  performance: PerformanceMetrics;
}

export interface DataVolumeMetrics {
  recordsProcessed: number;
  bytesProcessed: number;
  recordsPerSecond: number;
  bytesPerSecond: number;
}

export interface DataQualityMetrics {
  completeness: number;
  accuracy: number;
  consistency: number;
  validity: number;
  uniqueness: number;
  timeliness: number;
  overallScore: number;
}

export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkUsage: number;
  throughput: number;
  latency: number;
}

export interface StageMetrics {
  runtime: number;
  recordsProcessed: number;
  bytesProcessed: number;
  errorCount: number;
  warningCount: number;
  qualityScore: number;
}

export interface PipelineExecution {
  executionId: string;
  pipelineId: string;
  startTime: Date;
  endTime?: Date;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  stages: StageExecution[];
  metrics: PipelineMetrics;
  logs: ExecutionLog[];
  errors: ExecutionError[];
}

export interface StageExecution {
  stageId: string;
  startTime: Date;
  endTime?: Date;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  metrics: StageMetrics;
  outputs: StageOutput[];
}

export interface StageOutput {
  name: string;
  type: string;
  location: string;
  schema?: SchemaDefinition;
  statistics?: DataStatistics;
}

export interface DataStatistics {
  recordCount: number;
  fieldStatistics: FieldStatistics[];
  qualityMetrics: DataQualityMetrics;
}

export interface FieldStatistics {
  field: string;
  type: string;
  nullCount: number;
  uniqueCount: number;
  min?: any;
  max?: any;
  mean?: number;
  median?: number;
  stddev?: number;
  distribution?: Record<string, number>;
}

export interface ExecutionLog {
  timestamp: Date;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  stage?: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface ExecutionError {
  timestamp: Date;
  stage: string;
  error: string;
  stackTrace?: string;
  recoverable: boolean;
  retryCount: number;
}

export class DataProcessingPipelineService extends EventEmitter {

  // Create new data pipeline
  async createPipeline(
    name: string,
    description: string,
    stages: Omit<PipelineStage, 'stageId' | 'status' | 'metrics'>[],
    configuration: Partial<PipelineConfiguration> = {}
  ): Promise<DataPipeline> {
    try {
      const pipelineId = crypto.randomUUID();

      const defaultConfig: PipelineConfiguration = {
        parallelism: 1,
        retryPolicy: {
          maxRetries: 3,
          backoffStrategy: 'EXPONENTIAL',
          initialDelay: 1000,
          maxDelay: 30000,
          retryableErrors: ['TIMEOUT', 'CONNECTION_ERROR', 'TEMPORARY_FAILURE']
        },
        timeout: 3600000, // 1 hour
        resources: {
          cpu: 1,
          memory: 2048,
          storage: 10240,
          network: 100
        },
        notifications: {
          onSuccess: false,
          onFailure: true,
          onWarning: true,
          channels: []
        },
        dataQuality: {
          enableValidation: true,
          validationRules: [],
          qualityThresholds: [],
          actions: []
        }
      };

      const pipelineStages: PipelineStage[] = stages.map((stage, index) => ({
        ...stage,
        stageId: crypto.randomUUID(),
        order: index,
        status: 'PENDING',
        metrics: {
          runtime: 0,
          recordsProcessed: 0,
          bytesProcessed: 0,
          errorCount: 0,
          warningCount: 0,
          qualityScore: 0
        }
      }));

      const pipeline: DataPipeline = {
        pipelineId,
        name,
        description,
        stages: pipelineStages,
        schedule: {
          type: 'MANUAL',
          enabled: false
        },
        status: 'INACTIVE',
        configuration: { ...defaultConfig, ...configuration },
        metrics: {
          totalRuns: 0,
          successfulRuns: 0,
          failedRuns: 0,
          averageRuntime: 0,
          lastRuntime: 0,
          dataVolume: {
            recordsProcessed: 0,
            bytesProcessed: 0,
            recordsPerSecond: 0,
            bytesPerSecond: 0
          },
          qualityMetrics: {
            completeness: 0,
            accuracy: 0,
            consistency: 0,
            validity: 0,
            uniqueness: 0,
            timeliness: 0,
            overallScore: 0
          },
          performance: {
            cpuUsage: 0,
            memoryUsage: 0,
            diskUsage: 0,
            networkUsage: 0,
            throughput: 0,
            latency: 0
          }
        },
        createdAt: new Date(),
        lastRun: new Date()
      };

      // Store pipeline
      await this.storePipeline(pipeline);

      // Log pipeline creation
      await auditLoggingService.logEvent({
        eventType: 'SYSTEM_EVENT',
        category: 'DATA_PIPELINE',
        action: 'PIPELINE_CREATED',
        description: `Data pipeline '${name}' created with ${stages.length} stages`,
        resourceType: 'DATA_PIPELINE',
        resourceId: pipelineId,
        metadata: {
          pipelineId,
          stageCount: stages.length,
          configuration
        },
        tags: ['data', 'pipeline', 'etl']
      });

      this.emit('pipelineCreated', { pipelineId, pipeline });

      logger.info('Data pipeline created successfully', {
        pipelineId,
        name,
        stageCount: stages.length
      });

      return pipeline;
    } catch (error) {
      logger.error('Failed to create data pipeline:', error);
      throw error;
    }
  }

  // Execute pipeline
  async executePipeline(pipelineId: string, parameters?: Record<string, any>): Promise<PipelineExecution> {
    try {
      logger.info('Executing data pipeline', { pipelineId, parameters });

      const pipeline = await this.getPipeline(pipelineId);
      if (!pipeline) {
        throw new Error(`Pipeline not found: ${pipelineId}`);
      }

      const executionId = crypto.randomUUID();
      const execution: PipelineExecution = {
        executionId,
        pipelineId,
        startTime: new Date(),
        status: 'RUNNING',
        stages: [],
        metrics: pipeline.metrics,
        logs: [],
        errors: []
      };

      // Update pipeline status
      pipeline.status = 'RUNNING';
      await this.updatePipeline(pipeline);

      try {
        // Execute stages in order
        for (const stage of pipeline.stages.sort((a, b) => a.order - b.order)) {
          const stageExecution = await this.executeStage(stage, execution, parameters);
          execution.stages.push(stageExecution);

          if (stageExecution.status === 'FAILED') {
            execution.status = 'FAILED';
            break;
          }
        }

        if (execution.status === 'RUNNING') {
          execution.status = 'COMPLETED';
        }

        execution.endTime = new Date();

        // Update pipeline metrics
        await this.updatePipelineMetrics(pipeline, execution);

        // Store execution
        await this.storeExecution(execution);

        // Send notifications
        await this.sendNotifications(pipeline, execution);

        this.emit('pipelineExecuted', { executionId, execution });

        logger.info('Pipeline execution completed', {
          executionId,
          pipelineId,
          status: execution.status,
          runtime: execution.endTime.getTime() - execution.startTime.getTime()
        });

        return execution;
      } catch (error) {
        execution.status = 'FAILED';
        execution.endTime = new Date();
        execution.errors.push({
          timestamp: new Date(),
          stage: 'PIPELINE',
          error: error.message,
          stackTrace: error.stack,
          recoverable: false,
          retryCount: 0
        });

        await this.storeExecution(execution);
        throw error;
      } finally {
        pipeline.status = 'ACTIVE';
        pipeline.lastRun = new Date();
        await this.updatePipeline(pipeline);
      }
    } catch (error) {
      logger.error('Failed to execute pipeline:', error);
      throw error;
    }
  }

  // Execute individual stage
  private async executeStage(
    stage: PipelineStage,
    execution: PipelineExecution,
    parameters?: Record<string, any>
  ): Promise<StageExecution> {
    const stageExecution: StageExecution = {
      stageId: stage.stageId,
      startTime: new Date(),
      status: 'RUNNING',
      metrics: {
        runtime: 0,
        recordsProcessed: 0,
        bytesProcessed: 0,
        errorCount: 0,
        warningCount: 0,
        qualityScore: 0
      },
      outputs: []
    };

    try {
      logger.info('Executing stage', { stageId: stage.stageId, type: stage.type });

      switch (stage.type) {
        case 'EXTRACT':
          await this.executeExtractStage(stage, stageExecution, parameters);
          break;
        case 'TRANSFORM':
          await this.executeTransformStage(stage, stageExecution, parameters);
          break;
        case 'LOAD':
          await this.executeLoadStage(stage, stageExecution, parameters);
          break;
        case 'VALIDATE':
          await this.executeValidateStage(stage, stageExecution, parameters);
          break;
        case 'FEATURE_ENGINEERING':
          await this.executeFeatureEngineeringStage(stage, stageExecution, parameters);
          break;
        case 'QUALITY_CHECK':
          await this.executeQualityCheckStage(stage, stageExecution, parameters);
          break;
      }

      stageExecution.status = 'COMPLETED';
      stageExecution.endTime = new Date();
      stageExecution.metrics.runtime = stageExecution.endTime.getTime() - stageExecution.startTime.getTime();

      logger.info('Stage execution completed', {
        stageId: stage.stageId,
        runtime: stageExecution.metrics.runtime,
        recordsProcessed: stageExecution.metrics.recordsProcessed
      });

      return stageExecution;
    } catch (error) {
      stageExecution.status = 'FAILED';
      stageExecution.endTime = new Date();
      stageExecution.metrics.errorCount++;

      execution.errors.push({
        timestamp: new Date(),
        stage: stage.stageId,
        error: error.message,
        stackTrace: error.stack,
        recoverable: this.isRecoverableError(error),
        retryCount: 0
      });

      logger.error('Stage execution failed', {
        stageId: stage.stageId,
        error: error.message
      });

      throw error;
    }
  }

  // Storage methods (simplified implementations)
  private async storePipeline(pipeline: DataPipeline): Promise<void> {
    // Implementation would store to database
    logger.info('Pipeline stored', { pipelineId: pipeline.pipelineId });
  }

  private async getPipeline(pipelineId: string): Promise<DataPipeline | null> {
    // Implementation would retrieve from database
    return null;
  }

  private async updatePipeline(pipeline: DataPipeline): Promise<void> {
    // Implementation would update database
    logger.info('Pipeline updated', { pipelineId: pipeline.pipelineId });
  }

  private async storeExecution(execution: PipelineExecution): Promise<void> {
    // Implementation would store execution to database
    logger.info('Execution stored', { executionId: execution.executionId });
  }

  private async updatePipelineMetrics(pipeline: DataPipeline, execution: PipelineExecution): Promise<void> {
    // Implementation would update pipeline metrics
    logger.info('Pipeline metrics updated', { pipelineId: pipeline.pipelineId });
  }

  private async sendNotifications(pipeline: DataPipeline, execution: PipelineExecution): Promise<void> {
    // Implementation would send notifications
    logger.info('Notifications sent', { pipelineId: pipeline.pipelineId, status: execution.status });
  }

  private isRecoverableError(error: Error): boolean {
    const recoverableErrors = ['TIMEOUT', 'CONNECTION_ERROR', 'TEMPORARY_FAILURE'];
    return recoverableErrors.some(err => error.message.includes(err));
  }

  // Simplified stage execution methods
  private async executeExtractStage(stage: PipelineStage, execution: StageExecution, parameters?: Record<string, any>): Promise<void> {
    execution.metrics.recordsProcessed = 10000;
    execution.metrics.bytesProcessed = 1024 * 1024;
  }

  private async executeTransformStage(stage: PipelineStage, execution: StageExecution, parameters?: Record<string, any>): Promise<void> {
    execution.metrics.recordsProcessed = 9500;
    execution.metrics.bytesProcessed = 1024 * 1024 * 1.2;
  }

  private async executeLoadStage(stage: PipelineStage, execution: StageExecution, parameters?: Record<string, any>): Promise<void> {
    execution.metrics.recordsProcessed = 9500;
    execution.metrics.bytesProcessed = 1024 * 1024 * 1.2;
  }

  private async executeValidateStage(stage: PipelineStage, execution: StageExecution, parameters?: Record<string, any>): Promise<void> {
    execution.metrics.qualityScore = 0.94;
    execution.metrics.warningCount = 5;
    execution.metrics.errorCount = 2;
  }

  private async executeFeatureEngineeringStage(stage: PipelineStage, execution: StageExecution, parameters?: Record<string, any>): Promise<void> {
    execution.metrics.recordsProcessed = 9500;
    execution.metrics.bytesProcessed = 1024 * 1024 * 1.5;
    execution.metrics.qualityScore = 0.97;
  }

  private async executeQualityCheckStage(stage: PipelineStage, execution: StageExecution, parameters?: Record<string, any>): Promise<void> {
    execution.metrics.qualityScore = 0.95;
    execution.metrics.warningCount = 3;
    execution.metrics.errorCount = 1;
  }
}

export default new DataProcessingPipelineService();
