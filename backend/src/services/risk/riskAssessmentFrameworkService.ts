import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { EventEmitter } from 'events';
import auditLoggingService from '../audit/auditLoggingService';

const prisma = new PrismaClient();

export interface RiskCategory {
  id: string;
  name: string;
  description: string;
  weight: number;
  parentCategoryId?: string;
  subcategories?: RiskCategory[];
  factors: RiskFactor[];
  scoringMethod: 'WEIGHTED_AVERAGE' | 'MAXIMUM' | 'MINIMUM' | 'CUSTOM';
  thresholds: RiskThreshold[];
  isActive: boolean;
}

export interface RiskFactor {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  dataType: 'NUMERIC' | 'BOOLEAN' | 'CATEGORICAL' | 'TEXT' | 'DATE';
  weight: number;
  scoringFunction: ScoringFunction;
  dataSource: DataSource;
  updateFrequency: 'REAL_TIME' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  isActive: boolean;
}

export interface ScoringFunction {
  type: 'LINEAR' | 'EXPONENTIAL' | 'LOGARITHMIC' | 'STEP' | 'CUSTOM';
  parameters: any;
  minValue: number;
  maxValue: number;
  normalizeToScale: boolean;
  scaleMin: number;
  scaleMax: number;
}

export interface DataSource {
  type: 'INCIDENT_DATABASE' | 'EXTERNAL_API' | 'MANUAL_INPUT' | 'CALCULATED' | 'THREAT_INTELLIGENCE';
  endpoint?: string;
  query?: string;
  transformation?: string;
  authentication?: any;
  refreshInterval?: number;
}

export interface RiskThreshold {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  minScore: number;
  maxScore: number;
  color: string;
  actions: ThresholdAction[];
}

export interface ThresholdAction {
  type: 'NOTIFICATION' | 'ESCALATION' | 'WORKFLOW' | 'REPORT' | 'MITIGATION';
  target: string;
  parameters: any;
  delay?: number;
}

export interface RiskAssessmentWorkflow {
  id: string;
  name: string;
  description: string;
  triggerConditions: WorkflowTrigger[];
  steps: WorkflowStep[];
  schedule?: WorkflowSchedule;
  isActive: boolean;
}

export interface WorkflowTrigger {
  type: 'SCHEDULE' | 'EVENT' | 'THRESHOLD' | 'MANUAL' | 'DATA_CHANGE';
  condition: string;
  parameters: any;
}

export interface WorkflowStep {
  stepNumber: number;
  name: string;
  type: 'DATA_COLLECTION' | 'CALCULATION' | 'VALIDATION' | 'NOTIFICATION' | 'APPROVAL';
  action: string;
  parameters: any;
  dependencies: string[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

export interface WorkflowSchedule {
  frequency: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timezone: string;
}

export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxRetryDelay: number;
}

export interface RiskVisualization {
  id: string;
  name: string;
  type: 'HEATMAP' | 'MATRIX' | 'DASHBOARD' | 'CHART' | 'GAUGE' | 'TIMELINE';
  configuration: VisualizationConfig;
  dataQuery: string;
  refreshInterval: number;
  permissions: string[];
}

export interface VisualizationConfig {
  dimensions: string[];
  metrics: string[];
  filters: any[];
  styling: any;
  interactivity: any;
  exportOptions: string[];
}

export class RiskAssessmentFrameworkService extends EventEmitter {

  // Risk Category Management
  async createRiskCategory(category: Omit<RiskCategory, 'id'>): Promise<string> {
    try {
      const categoryId = crypto.randomUUID();

      await prisma.riskCategory.create({
        data: {
          id: categoryId,
          name: category.name,
          description: category.description,
          weight: category.weight,
          parentCategoryId: category.parentCategoryId,
          scoringMethod: category.scoringMethod as any,
          thresholds: category.thresholds,
          isActive: category.isActive
        }
      });

      // Create risk factors for this category
      for (const factor of category.factors) {
        await this.createRiskFactor({
          ...factor,
          categoryId
        });
      }

      // Log category creation
      await auditLoggingService.logEvent({
        eventType: 'DATA_CHANGE',
        category: 'RISK_MANAGEMENT',
        action: 'RISK_CATEGORY_CREATED',
        description: `Risk category created: ${category.name}`,
        resourceType: 'RISK_CATEGORY',
        resourceId: categoryId,
        metadata: {
          categoryName: category.name,
          weight: category.weight,
          factorCount: category.factors.length
        },
        tags: ['risk', 'category', 'creation']
      });

      this.emit('categoryCreated', { categoryId, category });

      logger.info(`Risk category created: ${categoryId}`, {
        name: category.name,
        factorCount: category.factors.length
      });

      return categoryId;
    } catch (error) {
      logger.error('Failed to create risk category:', error);
      throw error;
    }
  }

  async createRiskFactor(factor: Omit<RiskFactor, 'id'>): Promise<string> {
    try {
      const factorId = crypto.randomUUID();

      await prisma.riskFactor.create({
        data: {
          id: factorId,
          name: factor.name,
          description: factor.description,
          categoryId: factor.categoryId,
          dataType: factor.dataType as any,
          weight: factor.weight,
          scoringFunction: factor.scoringFunction,
          dataSource: factor.dataSource,
          updateFrequency: factor.updateFrequency as any,
          isActive: factor.isActive
        }
      });

      // Log factor creation
      await auditLoggingService.logEvent({
        eventType: 'DATA_CHANGE',
        category: 'RISK_MANAGEMENT',
        action: 'RISK_FACTOR_CREATED',
        description: `Risk factor created: ${factor.name}`,
        resourceType: 'RISK_FACTOR',
        resourceId: factorId,
        metadata: {
          factorName: factor.name,
          categoryId: factor.categoryId,
          dataType: factor.dataType,
          weight: factor.weight
        },
        tags: ['risk', 'factor', 'creation']
      });

      this.emit('factorCreated', { factorId, factor });

      logger.info(`Risk factor created: ${factorId}`, {
        name: factor.name,
        categoryId: factor.categoryId
      });

      return factorId;
    } catch (error) {
      logger.error('Failed to create risk factor:', error);
      throw error;
    }
  }

  // Risk Scoring Methodology
  async calculateRiskScore(
    categoryId: string,
    factorValues: Map<string, any>,
    context?: any
  ): Promise<number> {
    try {
      const category = await this.getRiskCategory(categoryId);
      if (!category) {
        throw new Error('Risk category not found');
      }

      let totalScore = 0;
      let totalWeight = 0;

      // Calculate score for each factor
      for (const factor of category.factors) {
        if (!factor.isActive) continue;

        const factorValue = factorValues.get(factor.id);
        if (factorValue === undefined || factorValue === null) continue;

        const factorScore = await this.calculateFactorScore(factor, factorValue, context);
        totalScore += factorScore * factor.weight;
        totalWeight += factor.weight;
      }

      // Apply category scoring method
      let categoryScore = totalWeight > 0 ? totalScore / totalWeight : 0;

      switch (category.scoringMethod) {
        case 'WEIGHTED_AVERAGE':
          // Already calculated above
          break;
        case 'MAXIMUM':
          categoryScore = Math.max(...Array.from(factorValues.values()).map(v => 
            this.calculateFactorScore(category.factors.find(f => factorValues.get(f.id) === v)!, v, context)
          ));
          break;
        case 'MINIMUM':
          categoryScore = Math.min(...Array.from(factorValues.values()).map(v => 
            this.calculateFactorScore(category.factors.find(f => factorValues.get(f.id) === v)!, v, context)
          ));
          break;
        case 'CUSTOM':
          categoryScore = await this.applyCustomScoringMethod(category, factorValues, context);
          break;
      }

      // Apply category weight if it's a subcategory
      if (category.parentCategoryId) {
        categoryScore *= category.weight;
      }

      return Math.max(0, Math.min(100, categoryScore));
    } catch (error) {
      logger.error('Failed to calculate risk score:', error);
      throw error;
    }
  }

  private async calculateFactorScore(factor: RiskFactor, value: any, context?: any): Promise<number> {
    try {
      const scoringFunction = factor.scoringFunction;
      let normalizedValue = this.normalizeValue(value, factor.dataType);
      let score = 0;

      switch (scoringFunction.type) {
        case 'LINEAR':
          score = this.linearScoring(normalizedValue, scoringFunction.parameters);
          break;
        case 'EXPONENTIAL':
          score = this.exponentialScoring(normalizedValue, scoringFunction.parameters);
          break;
        case 'LOGARITHMIC':
          score = this.logarithmicScoring(normalizedValue, scoringFunction.parameters);
          break;
        case 'STEP':
          score = this.stepScoring(normalizedValue, scoringFunction.parameters);
          break;
        case 'CUSTOM':
          score = await this.customScoring(normalizedValue, scoringFunction.parameters, context);
          break;
      }

      // Normalize to scale if required
      if (scoringFunction.normalizeToScale) {
        score = this.normalizeToScale(
          score,
          scoringFunction.minValue,
          scoringFunction.maxValue,
          scoringFunction.scaleMin,
          scoringFunction.scaleMax
        );
      }

      return Math.max(scoringFunction.scaleMin, Math.min(scoringFunction.scaleMax, score));
    } catch (error) {
      logger.error('Failed to calculate factor score:', error);
      return 0;
    }
  }

  // Assessment Workflow Management
  async createAssessmentWorkflow(workflow: Omit<RiskAssessmentWorkflow, 'id'>): Promise<string> {
    try {
      const workflowId = crypto.randomUUID();

      await prisma.riskAssessmentWorkflow.create({
        data: {
          id: workflowId,
          name: workflow.name,
          description: workflow.description,
          triggerConditions: workflow.triggerConditions,
          steps: workflow.steps,
          schedule: workflow.schedule,
          isActive: workflow.isActive
        }
      });

      // Set up workflow triggers
      await this.setupWorkflowTriggers(workflowId, workflow.triggerConditions);

      // Log workflow creation
      await auditLoggingService.logEvent({
        eventType: 'WORKFLOW_EVENT',
        category: 'RISK_MANAGEMENT',
        action: 'ASSESSMENT_WORKFLOW_CREATED',
        description: `Risk assessment workflow created: ${workflow.name}`,
        resourceType: 'RISK_WORKFLOW',
        resourceId: workflowId,
        metadata: {
          workflowName: workflow.name,
          stepCount: workflow.steps.length,
          triggerCount: workflow.triggerConditions.length
        },
        tags: ['risk', 'workflow', 'creation']
      });

      this.emit('workflowCreated', { workflowId, workflow });

      logger.info(`Risk assessment workflow created: ${workflowId}`, {
        name: workflow.name,
        stepCount: workflow.steps.length
      });

      return workflowId;
    } catch (error) {
      logger.error('Failed to create assessment workflow:', error);
      throw error;
    }
  }

  async executeWorkflow(workflowId: string, context?: any): Promise<string> {
    try {
      const workflow = await this.getAssessmentWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const executionId = crypto.randomUUID();

      // Create workflow execution record
      await prisma.workflowExecution.create({
        data: {
          id: executionId,
          workflowId,
          status: 'RUNNING',
          startedAt: new Date(),
          context: context || {},
          currentStep: 1
        }
      });

      // Execute workflow steps
      await this.executeWorkflowSteps(executionId, workflow.steps, context);

      this.emit('workflowExecuted', { executionId, workflowId });

      logger.info(`Risk assessment workflow executed: ${executionId}`, {
        workflowId,
        stepCount: workflow.steps.length
      });

      return executionId;
    } catch (error) {
      logger.error('Failed to execute workflow:', error);
      throw error;
    }
  }

  // Risk Visualization Management
  async createRiskVisualization(visualization: Omit<RiskVisualization, 'id'>): Promise<string> {
    try {
      const visualizationId = crypto.randomUUID();

      await prisma.riskVisualization.create({
        data: {
          id: visualizationId,
          name: visualization.name,
          type: visualization.type as any,
          configuration: visualization.configuration,
          dataQuery: visualization.dataQuery,
          refreshInterval: visualization.refreshInterval,
          permissions: visualization.permissions
        }
      });

      // Log visualization creation
      await auditLoggingService.logEvent({
        eventType: 'DATA_CHANGE',
        category: 'RISK_MANAGEMENT',
        action: 'RISK_VISUALIZATION_CREATED',
        description: `Risk visualization created: ${visualization.name}`,
        resourceType: 'RISK_VISUALIZATION',
        resourceId: visualizationId,
        metadata: {
          visualizationName: visualization.name,
          type: visualization.type,
          refreshInterval: visualization.refreshInterval
        },
        tags: ['risk', 'visualization', 'creation']
      });

      this.emit('visualizationCreated', { visualizationId, visualization });

      logger.info(`Risk visualization created: ${visualizationId}`, {
        name: visualization.name,
        type: visualization.type
      });

      return visualizationId;
    } catch (error) {
      logger.error('Failed to create risk visualization:', error);
      throw error;
    }
  }

  // Helper Methods
  private normalizeValue(value: any, dataType: string): number {
    switch (dataType) {
      case 'NUMERIC':
        return Number(value) || 0;
      case 'BOOLEAN':
        return value ? 1 : 0;
      case 'CATEGORICAL':
        // Convert categorical to numeric based on predefined mapping
        return this.categoricalToNumeric(value);
      case 'TEXT':
        // Convert text to numeric based on sentiment or length
        return this.textToNumeric(value);
      case 'DATE':
        // Convert date to numeric (days since epoch or relative to reference date)
        return this.dateToNumeric(value);
      default:
        return 0;
    }
  }

  private linearScoring(value: number, parameters: any): number {
    const { slope = 1, intercept = 0 } = parameters;
    return slope * value + intercept;
  }

  private exponentialScoring(value: number, parameters: any): number {
    const { base = Math.E, coefficient = 1, offset = 0 } = parameters;
    return coefficient * Math.pow(base, value) + offset;
  }

  private logarithmicScoring(value: number, parameters: any): number {
    const { base = Math.E, coefficient = 1, offset = 0 } = parameters;
    return coefficient * Math.log(value) / Math.log(base) + offset;
  }

  private stepScoring(value: number, parameters: any): number {
    const { steps = [] } = parameters;
    for (const step of steps) {
      if (value >= step.min && value < step.max) {
        return step.score;
      }
    }
    return 0;
  }

  private async customScoring(value: number, parameters: any, context?: any): Promise<number> {
    // Implement custom scoring logic based on parameters
    return 0;
  }

  private normalizeToScale(value: number, minValue: number, maxValue: number, scaleMin: number, scaleMax: number): number {
    if (maxValue === minValue) return scaleMin;
    return scaleMin + (value - minValue) * (scaleMax - scaleMin) / (maxValue - minValue);
  }

  private categoricalToNumeric(value: string): number {
    // Implement categorical to numeric conversion
    const categoryMap: Record<string, number> = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4
    };
    return categoryMap[value.toLowerCase()] || 0;
  }

  private textToNumeric(value: string): number {
    // Simple implementation based on text length
    return Math.min(value.length / 100, 1);
  }

  private dateToNumeric(value: Date | string): number {
    const date = new Date(value);
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, diffDays);
  }

  private async applyCustomScoringMethod(category: RiskCategory, factorValues: Map<string, any>, context?: any): Promise<number> {
    // Implement custom scoring method
    return 0;
  }

  private async setupWorkflowTriggers(workflowId: string, triggers: WorkflowTrigger[]): Promise<void> {
    // Set up workflow triggers (schedule, events, etc.)
    for (const trigger of triggers) {
      await this.setupTrigger(workflowId, trigger);
    }
  }

  private async setupTrigger(workflowId: string, trigger: WorkflowTrigger): Promise<void> {
    // Implement trigger setup logic
    logger.debug(`Setting up trigger for workflow: ${workflowId}`, { trigger });
  }

  private async executeWorkflowSteps(executionId: string, steps: WorkflowStep[], context?: any): Promise<void> {
    // Execute workflow steps sequentially
    for (const step of steps.sort((a, b) => a.stepNumber - b.stepNumber)) {
      await this.executeWorkflowStep(executionId, step, context);
    }
  }

  private async executeWorkflowStep(executionId: string, step: WorkflowStep, context?: any): Promise<void> {
    try {
      // Update execution status
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: { currentStep: step.stepNumber }
      });

      // Execute step based on type
      switch (step.type) {
        case 'DATA_COLLECTION':
          await this.executeDataCollectionStep(step, context);
          break;
        case 'CALCULATION':
          await this.executeCalculationStep(step, context);
          break;
        case 'VALIDATION':
          await this.executeValidationStep(step, context);
          break;
        case 'NOTIFICATION':
          await this.executeNotificationStep(step, context);
          break;
        case 'APPROVAL':
          await this.executeApprovalStep(step, context);
          break;
      }

      logger.debug(`Workflow step executed: ${step.name}`, { executionId, stepNumber: step.stepNumber });
    } catch (error) {
      logger.error(`Failed to execute workflow step: ${step.name}`, error);
      throw error;
    }
  }

  private async executeDataCollectionStep(step: WorkflowStep, context?: any): Promise<void> {
    // Implement data collection step
  }

  private async executeCalculationStep(step: WorkflowStep, context?: any): Promise<void> {
    // Implement calculation step
  }

  private async executeValidationStep(step: WorkflowStep, context?: any): Promise<void> {
    // Implement validation step
  }

  private async executeNotificationStep(step: WorkflowStep, context?: any): Promise<void> {
    // Implement notification step
  }

  private async executeApprovalStep(step: WorkflowStep, context?: any): Promise<void> {
    // Implement approval step
  }

  // Getter Methods
  async getRiskCategory(categoryId: string): Promise<RiskCategory | null> {
    try {
      const category = await prisma.riskCategory.findUnique({
        where: { id: categoryId },
        include: {
          factors: true,
          subcategories: true
        }
      });

      return category as RiskCategory | null;
    } catch (error) {
      logger.error('Failed to get risk category:', error);
      return null;
    }
  }

  async getAssessmentWorkflow(workflowId: string): Promise<RiskAssessmentWorkflow | null> {
    try {
      const workflow = await prisma.riskAssessmentWorkflow.findUnique({
        where: { id: workflowId }
      });

      return workflow as RiskAssessmentWorkflow | null;
    } catch (error) {
      logger.error('Failed to get assessment workflow:', error);
      return null;
    }
  }

  async getRiskCategories(companyId?: string): Promise<RiskCategory[]> {
    try {
      const categories = await prisma.riskCategory.findMany({
        where: companyId ? { companyId } : {},
        include: {
          factors: true,
          subcategories: true
        },
        orderBy: { name: 'asc' }
      });

      return categories as RiskCategory[];
    } catch (error) {
      logger.error('Failed to get risk categories:', error);
      return [];
    }
  }
}

export default new RiskAssessmentFrameworkService();
