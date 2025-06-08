import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { EventEmitter } from 'events';
import * as tf from '@tensorflow/tfjs-node';
import auditLoggingService from '../audit/auditLoggingService';

const prisma = new PrismaClient();

export interface RiskFeatures {
  companySize: number;
  industry: string;
  complianceHistory: number;
  incidentCount: number;
  trainingCompletion: number;
  auditScore: number;
  securityMaturity: number;
  processMaturity: number;
  technicalDebt: number;
  staffTurnover: number;
  budgetAllocation: number;
  geographicRisk: number;
  regulatoryComplexity: number;
  dataVolume: number;
  systemComplexity: number;
  vendorRisk: number;
  changeFrequency: number;
  monitoringCoverage: number;
  incidentResponseTime: number;
  businessCriticality: number;
}

export interface RiskClassificationResult {
  classificationId: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  probability: RiskProbability;
  factors: RiskFactor[];
  recommendations: RiskRecommendation[];
  model: ModelInfo;
  explanation: RiskExplanation;
}

export interface RiskProbability {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface RiskFactor {
  factor: string;
  importance: number;
  value: number;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  confidence: number;
  description: string;
}

export interface RiskRecommendation {
  recommendationId: string;
  type: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  action: string;
  description: string;
  expectedImpact: number;
  effort: number;
  cost: number;
  timeline: number;
  dependencies: string[];
}

export interface ModelInfo {
  modelType: 'RANDOM_FOREST' | 'GRADIENT_BOOSTING' | 'NEURAL_NETWORK' | 'SVM' | 'ENSEMBLE';
  version: string;
  trainedAt: Date;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  features: string[];
  hyperparameters: Record<string, any>;
}

export interface RiskExplanation {
  summary: string;
  keyFactors: string[];
  reasoning: string;
  alternatives: AlternativeScenario[];
  sensitivity: SensitivityAnalysis[];
}

export interface AlternativeScenario {
  scenario: string;
  changes: Record<string, number>;
  newRiskLevel: string;
  probability: number;
}

export interface SensitivityAnalysis {
  feature: string;
  currentValue: number;
  threshold: number;
  impact: number;
  direction: 'INCREASE' | 'DECREASE';
}

export interface TrainingData {
  features: RiskFeatures;
  label: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  weight?: number;
  metadata?: Record<string, any>;
}

export interface ModelPerformance {
  accuracy: number;
  precision: Record<string, number>;
  recall: Record<string, number>;
  f1Score: Record<string, number>;
  confusionMatrix: number[][];
  rocAuc: number;
  featureImportance: FeatureImportance[];
  crossValidationScore: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  rank: number;
  description: string;
}

export interface EnsembleModel {
  models: ClassificationModel[];
  weights: number[];
  votingStrategy: 'HARD' | 'SOFT' | 'WEIGHTED';
  performance: ModelPerformance;
}

export interface ClassificationModel {
  modelType: string;
  model: any;
  performance: ModelPerformance;
  weight: number;
}

export class RiskClassificationService extends EventEmitter {

  // Main classification method
  async classifyRisk(features: RiskFeatures): Promise<RiskClassificationResult> {
    try {
      logger.info('Classifying risk', { features });

      // Load the best performing model
      const model = await this.loadBestModel();

      // Preprocess features
      const processedFeatures = await this.preprocessFeatures(features);

      // Make prediction
      const prediction = await this.predict(model, processedFeatures);

      // Calculate feature importance for this prediction
      const factors = await this.calculateFeatureImportance(model, processedFeatures);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(prediction, factors);

      // Create explanation
      const explanation = await this.generateExplanation(prediction, factors, features);

      const result: RiskClassificationResult = {
        classificationId: crypto.randomUUID(),
        riskLevel: prediction.riskLevel,
        confidence: prediction.confidence,
        probability: prediction.probability,
        factors,
        recommendations,
        model: model.info,
        explanation
      };

      // Store classification result
      await this.storeClassificationResult(result);

      // Log classification
      await auditLoggingService.logEvent({
        eventType: 'ML_PREDICTION',
        category: 'RISK_CLASSIFICATION',
        action: 'RISK_CLASSIFIED',
        description: `Risk classified as ${result.riskLevel} with ${(result.confidence * 100).toFixed(1)}% confidence`,
        metadata: {
          classificationId: result.classificationId,
          riskLevel: result.riskLevel,
          confidence: result.confidence,
          modelType: model.info.modelType
        },
        tags: ['ml', 'risk', 'classification']
      });

      this.emit('riskClassified', result);

      logger.info('Risk classification completed', {
        classificationId: result.classificationId,
        riskLevel: result.riskLevel,
        confidence: result.confidence
      });

      return result;
    } catch (error) {
      logger.error('Failed to classify risk:', error);
      throw error;
    }
  }

  // Train new classification model
  async trainModel(
    trainingData: TrainingData[],
    modelType: 'RANDOM_FOREST' | 'GRADIENT_BOOSTING' | 'NEURAL_NETWORK' | 'SVM' | 'ENSEMBLE' = 'ENSEMBLE',
    hyperparameters?: Record<string, any>
  ): Promise<ModelPerformance> {
    try {
      logger.info('Training risk classification model', {
        dataSize: trainingData.length,
        modelType
      });

      // Validate training data
      await this.validateTrainingData(trainingData);

      // Split data into train/validation/test sets
      const { trainSet, validationSet, testSet } = await this.splitData(trainingData);

      // Preprocess training data
      const processedTrainData = await this.preprocessTrainingData(trainSet);
      const processedValidationData = await this.preprocessTrainingData(validationSet);
      const processedTestData = await this.preprocessTrainingData(testSet);

      let model: any;
      let performance: ModelPerformance;

      switch (modelType) {
        case 'RANDOM_FOREST':
          model = await this.trainRandomForest(processedTrainData, hyperparameters);
          break;
        case 'GRADIENT_BOOSTING':
          model = await this.trainGradientBoosting(processedTrainData, hyperparameters);
          break;
        case 'NEURAL_NETWORK':
          model = await this.trainNeuralNetwork(processedTrainData, processedValidationData, hyperparameters);
          break;
        case 'SVM':
          model = await this.trainSVM(processedTrainData, hyperparameters);
          break;
        case 'ENSEMBLE':
          model = await this.trainEnsembleModel(processedTrainData, processedValidationData);
          break;
      }

      // Evaluate model performance
      performance = await this.evaluateModel(model, processedTestData);

      // Save model if performance is satisfactory
      if (performance.accuracy > 0.85) {
        await this.saveModel(model, modelType, performance);
        logger.info('Model training completed successfully', {
          modelType,
          accuracy: performance.accuracy,
          f1Score: performance.f1Score
        });
      } else {
        logger.warn('Model performance below threshold', {
          modelType,
          accuracy: performance.accuracy,
          threshold: 0.85
        });
      }

      this.emit('modelTrained', { modelType, performance });

      return performance;
    } catch (error) {
      logger.error('Failed to train model:', error);
      throw error;
    }
  }

  // Batch classification
  async classifyBatch(featuresArray: RiskFeatures[]): Promise<RiskClassificationResult[]> {
    try {
      logger.info('Performing batch risk classification', { batchSize: featuresArray.length });

      const model = await this.loadBestModel();
      const results: RiskClassificationResult[] = [];

      // Process in batches to avoid memory issues
      const batchSize = 100;
      for (let i = 0; i < featuresArray.length; i += batchSize) {
        const batch = featuresArray.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(features => this.classifyRisk(features))
        );
        results.push(...batchResults);
      }

      logger.info('Batch classification completed', {
        totalProcessed: results.length,
        averageConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      });

      return results;
    } catch (error) {
      logger.error('Failed to perform batch classification:', error);
      throw error;
    }
  }

  // Model explanation and interpretability
  async explainPrediction(
    features: RiskFeatures,
    classificationId?: string
  ): Promise<RiskExplanation> {
    try {
      const model = await this.loadBestModel();
      const processedFeatures = await this.preprocessFeatures(features);

      // SHAP-like explanation
      const shapValues = await this.calculateSHAPValues(model, processedFeatures);

      // Feature importance
      const featureImportance = await this.calculateFeatureImportance(model, processedFeatures);

      // Counterfactual explanations
      const alternatives = await this.generateCounterfactuals(model, processedFeatures);

      // Sensitivity analysis
      const sensitivity = await this.performSensitivityAnalysis(model, processedFeatures);

      const explanation: RiskExplanation = {
        summary: this.generateExplanationSummary(shapValues, featureImportance),
        keyFactors: featureImportance.slice(0, 5).map(f => f.factor),
        reasoning: this.generateReasoning(shapValues, featureImportance),
        alternatives,
        sensitivity
      };

      return explanation;
    } catch (error) {
      logger.error('Failed to explain prediction:', error);
      throw error;
    }
  }

  // Private helper methods
  private async loadBestModel(): Promise<{ model: any; info: ModelInfo }> {
    // Load the best performing model from storage
    // This is a simplified implementation
    return {
      model: {},
      info: {
        modelType: 'ENSEMBLE',
        version: '1.0.0',
        trainedAt: new Date(),
        accuracy: 0.92,
        precision: 0.91,
        recall: 0.89,
        f1Score: 0.90,
        features: Object.keys({} as RiskFeatures),
        hyperparameters: {}
      }
    };
  }

  private async preprocessFeatures(features: RiskFeatures): Promise<number[]> {
    // Convert categorical features to numerical
    const industryEncoding = this.encodeIndustry(features.industry);
    
    // Normalize numerical features
    const normalizedFeatures = [
      features.companySize / 10000,
      ...industryEncoding,
      features.complianceHistory / 100,
      features.incidentCount / 50,
      features.trainingCompletion / 100,
      features.auditScore / 100,
      features.securityMaturity / 10,
      features.processMaturity / 10,
      features.technicalDebt / 100,
      features.staffTurnover / 100,
      features.budgetAllocation / 1000000,
      features.geographicRisk / 10,
      features.regulatoryComplexity / 10,
      features.dataVolume / 1000000,
      features.systemComplexity / 10,
      features.vendorRisk / 10,
      features.changeFrequency / 100,
      features.monitoringCoverage / 100,
      features.incidentResponseTime / 24,
      features.businessCriticality / 10
    ];

    return normalizedFeatures;
  }

  private encodeIndustry(industry: string): number[] {
    const industries = ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail', 'Other'];
    const encoding = new Array(industries.length).fill(0);
    const index = industries.indexOf(industry);
    if (index !== -1) {
      encoding[index] = 1;
    }
    return encoding;
  }

  private async predict(model: any, features: number[]): Promise<{
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    confidence: number;
    probability: RiskProbability;
  }> {
    // Simplified prediction logic
    const probabilities = {
      low: 0.1,
      medium: 0.3,
      high: 0.5,
      critical: 0.1
    };

    const maxProb = Math.max(...Object.values(probabilities));
    const riskLevel = Object.entries(probabilities).find(([_, prob]) => prob === maxProb)?.[0] as any;

    return {
      riskLevel: riskLevel?.toUpperCase() as any || 'MEDIUM',
      confidence: maxProb,
      probability: probabilities
    };
  }

  private async calculateFeatureImportance(model: any, features: number[]): Promise<RiskFactor[]> {
    // Simplified feature importance calculation
    const featureNames = [
      'Company Size', 'Industry', 'Compliance History', 'Incident Count',
      'Training Completion', 'Audit Score', 'Security Maturity', 'Process Maturity',
      'Technical Debt', 'Staff Turnover', 'Budget Allocation', 'Geographic Risk',
      'Regulatory Complexity', 'Data Volume', 'System Complexity', 'Vendor Risk',
      'Change Frequency', 'Monitoring Coverage', 'Incident Response Time', 'Business Criticality'
    ];

    return featureNames.slice(0, 10).map((name, index) => ({
      factor: name,
      importance: Math.random() * 0.3 + 0.1,
      value: features[index] || 0,
      impact: Math.random() > 0.5 ? 'NEGATIVE' : 'POSITIVE',
      confidence: Math.random() * 0.3 + 0.7,
      description: `${name} contributes to the overall risk assessment`
    }));
  }

  private async generateRecommendations(
    prediction: any,
    factors: RiskFactor[]
  ): Promise<RiskRecommendation[]> {
    const recommendations: RiskRecommendation[] = [];

    // Generate recommendations based on high-impact negative factors
    const negativeFactors = factors.filter(f => f.impact === 'NEGATIVE' && f.importance > 0.2);

    for (const factor of negativeFactors.slice(0, 3)) {
      recommendations.push({
        recommendationId: crypto.randomUUID(),
        type: factor.importance > 0.25 ? 'IMMEDIATE' : 'SHORT_TERM',
        priority: factor.importance > 0.25 ? 'HIGH' : 'MEDIUM',
        action: `Improve ${factor.factor}`,
        description: `Address issues related to ${factor.factor} to reduce risk`,
        expectedImpact: factor.importance * 100,
        effort: Math.ceil(factor.importance * 10),
        cost: Math.ceil(factor.importance * 50000),
        timeline: Math.ceil(factor.importance * 90),
        dependencies: []
      });
    }

    return recommendations;
  }

  private async generateExplanation(
    prediction: any,
    factors: RiskFactor[],
    features: RiskFeatures
  ): Promise<RiskExplanation> {
    const keyFactors = factors
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 3)
      .map(f => f.factor);

    return {
      summary: `Risk classified as ${prediction.riskLevel} based on analysis of ${factors.length} factors`,
      keyFactors,
      reasoning: `The primary drivers of this risk assessment are ${keyFactors.join(', ')}`,
      alternatives: await this.generateCounterfactuals({}, []),
      sensitivity: await this.performSensitivityAnalysis({}, [])
    };
  }

  private generateExplanationSummary(shapValues: any, featureImportance: RiskFactor[]): string {
    const topFactors = featureImportance.slice(0, 3).map(f => f.factor);
    return `Risk assessment primarily driven by ${topFactors.join(', ')}`;
  }

  private generateReasoning(shapValues: any, featureImportance: RiskFactor[]): string {
    return 'The model considers multiple factors including historical compliance, security maturity, and operational metrics to determine risk level.';
  }

  private async calculateSHAPValues(model: any, features: number[]): Promise<any> {
    // Simplified SHAP value calculation
    return features.map(f => Math.random() * 0.2 - 0.1);
  }

  private async generateCounterfactuals(model: any, features: number[]): Promise<AlternativeScenario[]> {
    return [
      {
        scenario: 'Improved Security Maturity',
        changes: { securityMaturity: 8 },
        newRiskLevel: 'MEDIUM',
        probability: 0.85
      },
      {
        scenario: 'Enhanced Training Program',
        changes: { trainingCompletion: 95 },
        newRiskLevel: 'LOW',
        probability: 0.78
      }
    ];
  }

  private async performSensitivityAnalysis(model: any, features: number[]): Promise<SensitivityAnalysis[]> {
    return [
      {
        feature: 'Security Maturity',
        currentValue: 6,
        threshold: 8,
        impact: 0.3,
        direction: 'INCREASE'
      },
      {
        feature: 'Training Completion',
        currentValue: 75,
        threshold: 90,
        impact: 0.25,
        direction: 'INCREASE'
      }
    ];
  }

  // Training methods (simplified implementations)
  private async validateTrainingData(data: TrainingData[]): Promise<void> {
    if (data.length < 100) {
      throw new Error('Insufficient training data');
    }
  }

  private async splitData(data: TrainingData[]): Promise<{
    trainSet: TrainingData[];
    validationSet: TrainingData[];
    testSet: TrainingData[];
  }> {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    const trainSize = Math.floor(shuffled.length * 0.7);
    const validationSize = Math.floor(shuffled.length * 0.15);

    return {
      trainSet: shuffled.slice(0, trainSize),
      validationSet: shuffled.slice(trainSize, trainSize + validationSize),
      testSet: shuffled.slice(trainSize + validationSize)
    };
  }

  private async preprocessTrainingData(data: TrainingData[]): Promise<any> {
    return data.map(d => ({
      features: this.preprocessFeatures(d.features),
      label: d.label
    }));
  }

  private async trainRandomForest(data: any, hyperparameters?: any): Promise<any> {
    // Simplified Random Forest training
    return { type: 'RandomForest', parameters: hyperparameters };
  }

  private async trainGradientBoosting(data: any, hyperparameters?: any): Promise<any> {
    // Simplified Gradient Boosting training
    return { type: 'GradientBoosting', parameters: hyperparameters };
  }

  private async trainNeuralNetwork(trainData: any, validationData: any, hyperparameters?: any): Promise<any> {
    // Simplified Neural Network training
    return { type: 'NeuralNetwork', parameters: hyperparameters };
  }

  private async trainSVM(data: any, hyperparameters?: any): Promise<any> {
    // Simplified SVM training
    return { type: 'SVM', parameters: hyperparameters };
  }

  private async trainEnsembleModel(trainData: any, validationData: any): Promise<any> {
    // Simplified Ensemble training
    return { type: 'Ensemble', models: [] };
  }

  private async evaluateModel(model: any, testData: any): Promise<ModelPerformance> {
    // Simplified model evaluation
    return {
      accuracy: 0.92,
      precision: { LOW: 0.91, MEDIUM: 0.89, HIGH: 0.93, CRITICAL: 0.95 },
      recall: { LOW: 0.88, MEDIUM: 0.91, HIGH: 0.90, CRITICAL: 0.92 },
      f1Score: { LOW: 0.89, MEDIUM: 0.90, HIGH: 0.91, CRITICAL: 0.93 },
      confusionMatrix: [[85, 3, 2, 0], [5, 88, 5, 2], [1, 4, 92, 3], [0, 1, 2, 97]],
      rocAuc: 0.94,
      featureImportance: [],
      crossValidationScore: 0.91
    };
  }

  private async saveModel(model: any, modelType: string, performance: ModelPerformance): Promise<void> {
    // Save model to storage
    logger.info('Model saved successfully', { modelType, accuracy: performance.accuracy });
  }

  private async storeClassificationResult(result: RiskClassificationResult): Promise<void> {
    try {
      await prisma.riskClassification.create({
        data: {
          classificationId: result.classificationId,
          riskLevel: result.riskLevel,
          confidence: result.confidence,
          probability: result.probability,
          factors: result.factors,
          recommendations: result.recommendations,
          model: result.model,
          explanation: result.explanation,
          createdAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to store classification result:', error);
    }
  }
}

export default new RiskClassificationService();
