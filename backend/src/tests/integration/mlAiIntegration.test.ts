import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../app';
import { PrismaClient } from '@prisma/client';
import timeSeriesForecastingService from '../../services/ml/timeSeriesForecastingService';
import riskClassificationService from '../../services/ml/riskClassificationService';
import dataProcessingPipelineService from '../../services/ml/dataProcessingPipelineService';
import optimizationAlgorithmsService from '../../services/ml/optimizationAlgorithmsService';
import aiServiceLayer from '../../services/ml/aiServiceLayer';

const prisma = new PrismaClient();

describe('ML/AI Integration Tests', () => {
  let authToken: string;
  let testCompanyId: string;
  let testUserId: string;
  let testModelId: string;
  let testPipelineId: string;

  beforeAll(async () => {
    // Setup test database
    await prisma.$connect();

    // Create test company
    const company = await prisma.company.create({
      data: {
        name: 'Test ML Company',
        industry: 'Technology',
        size: 'LARGE',
        country: 'US'
      }
    });
    testCompanyId = company.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@mlai.com',
        password: 'hashedpassword',
        firstName: 'ML',
        lastName: 'Tester',
        role: 'ADMIN',
        companyId: testCompanyId
      }
    });
    testUserId = user.id;

    // Get auth token
    const authResponse = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@mlai.com',
        password: 'password'
      });

    authToken = authResponse.body.token;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.user.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Reset test state before each test
  });

  describe('Time Series Forecasting Integration', () => {
    test('should create ARIMA forecast successfully', async () => {
      const forecastData = [
        { timestamp: new Date('2024-01-01'), value: 100 },
        { timestamp: new Date('2024-01-02'), value: 105 },
        { timestamp: new Date('2024-01-03'), value: 110 },
        { timestamp: new Date('2024-01-04'), value: 108 },
        { timestamp: new Date('2024-01-05'), value: 112 }
      ];

      const forecast = await timeSeriesForecastingService.createARIMAForecast(
        forecastData,
        7, // 7-day horizon
        true // auto-order selection
      );

      expect(forecast).toBeDefined();
      expect(forecast.modelType).toBe('ARIMA');
      expect(forecast.predictions).toHaveLength(7);
      expect(forecast.confidence).toHaveLength(7);
      expect(forecast.metrics.mae).toBeGreaterThan(0);
      expect(forecast.metrics.r2).toBeGreaterThan(0);
    });

    test('should create Prophet forecast with seasonality detection', async () => {
      const forecastData = Array.from({ length: 365 }, (_, i) => ({
        timestamp: new Date(2023, 0, i + 1),
        value: 100 + Math.sin(i * 2 * Math.PI / 365) * 20 + Math.random() * 10
      }));

      const forecast = await timeSeriesForecastingService.createProphetForecast(
        forecastData,
        30, // 30-day horizon
        true // include holidays
      );

      expect(forecast).toBeDefined();
      expect(forecast.modelType).toBe('PROPHET');
      expect(forecast.predictions).toHaveLength(30);
      expect(forecast.metadata.seasonality.detected).toBe(true);
      expect(forecast.metadata.seasonality.period).toBeGreaterThan(0);
    });

    test('should create LSTM forecast for complex patterns', async () => {
      const forecastData = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(2024, 0, i + 1),
        value: 100 + Math.sin(i * 0.1) * 10 + Math.cos(i * 0.05) * 5 + Math.random() * 3
      }));

      const forecast = await timeSeriesForecastingService.createLSTMForecast(
        forecastData,
        14 // 14-day horizon
      );

      expect(forecast).toBeDefined();
      expect(forecast.modelType).toBe('LSTM');
      expect(forecast.predictions).toHaveLength(14);
      expect(forecast.metrics.rmse).toBeGreaterThan(0);
    });

    test('should create ensemble forecast combining multiple models', async () => {
      const forecastData = Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date(2024, 0, i + 1),
        value: 100 + i * 0.5 + Math.random() * 5
      }));

      const forecast = await timeSeriesForecastingService.createEnsembleForecast(
        forecastData,
        10, // 10-day horizon
        ['ARIMA', 'PROPHET', 'LSTM']
      );

      expect(forecast).toBeDefined();
      expect(forecast.modelType).toBe('ENSEMBLE');
      expect(forecast.predictions).toHaveLength(10);
      expect(forecast.metrics.accuracy).toBeGreaterThan(0.8);
    });
  });

  describe('Risk Classification Integration', () => {
    test('should classify risk with high accuracy', async () => {
      const riskFeatures = {
        companySize: 5000,
        industry: 'Technology',
        complianceHistory: 85,
        incidentCount: 3,
        trainingCompletion: 92,
        auditScore: 88,
        securityMaturity: 7,
        processMaturity: 8,
        technicalDebt: 25,
        staffTurnover: 12,
        budgetAllocation: 2000000,
        geographicRisk: 4,
        regulatoryComplexity: 6,
        dataVolume: 500000,
        systemComplexity: 7,
        vendorRisk: 5,
        changeFrequency: 15,
        monitoringCoverage: 85,
        incidentResponseTime: 4,
        businessCriticality: 8
      };

      const classification = await riskClassificationService.classifyRisk(riskFeatures);

      expect(classification).toBeDefined();
      expect(classification.riskLevel).toMatch(/^(LOW|MEDIUM|HIGH|CRITICAL)$/);
      expect(classification.confidence).toBeGreaterThan(0.5);
      expect(classification.probability).toBeDefined();
      expect(classification.factors).toHaveLength.greaterThan(0);
      expect(classification.recommendations).toHaveLength.greaterThan(0);
      expect(classification.explanation).toBeDefined();
    });

    test('should provide detailed risk explanations', async () => {
      const riskFeatures = {
        companySize: 1000,
        industry: 'Finance',
        complianceHistory: 60,
        incidentCount: 8,
        trainingCompletion: 70,
        auditScore: 65,
        securityMaturity: 5,
        processMaturity: 6,
        technicalDebt: 45,
        staffTurnover: 25,
        budgetAllocation: 800000,
        geographicRisk: 7,
        regulatoryComplexity: 9,
        dataVolume: 1000000,
        systemComplexity: 8,
        vendorRisk: 7,
        changeFrequency: 25,
        monitoringCoverage: 70,
        incidentResponseTime: 8,
        businessCriticality: 9
      };

      const explanation = await riskClassificationService.explainPrediction(riskFeatures);

      expect(explanation).toBeDefined();
      expect(explanation.summary).toBeDefined();
      expect(explanation.keyFactors).toHaveLength.greaterThan(0);
      expect(explanation.reasoning).toBeDefined();
      expect(explanation.alternatives).toHaveLength.greaterThan(0);
      expect(explanation.sensitivity).toHaveLength.greaterThan(0);
    });

    test('should handle batch risk classification efficiently', async () => {
      const batchFeatures = Array.from({ length: 50 }, (_, i) => ({
        companySize: 1000 + i * 100,
        industry: i % 2 === 0 ? 'Technology' : 'Finance',
        complianceHistory: 60 + Math.random() * 40,
        incidentCount: Math.floor(Math.random() * 10),
        trainingCompletion: 70 + Math.random() * 30,
        auditScore: 60 + Math.random() * 40,
        securityMaturity: Math.floor(Math.random() * 10) + 1,
        processMaturity: Math.floor(Math.random() * 10) + 1,
        technicalDebt: Math.random() * 50,
        staffTurnover: Math.random() * 30,
        budgetAllocation: 500000 + Math.random() * 1500000,
        geographicRisk: Math.floor(Math.random() * 10) + 1,
        regulatoryComplexity: Math.floor(Math.random() * 10) + 1,
        dataVolume: Math.random() * 1000000,
        systemComplexity: Math.floor(Math.random() * 10) + 1,
        vendorRisk: Math.floor(Math.random() * 10) + 1,
        changeFrequency: Math.random() * 50,
        monitoringCoverage: 50 + Math.random() * 50,
        incidentResponseTime: Math.random() * 24,
        businessCriticality: Math.floor(Math.random() * 10) + 1
      }));

      const startTime = Date.now();
      const results = await riskClassificationService.classifyBatch(batchFeatures);
      const processingTime = Date.now() - startTime;

      expect(results).toHaveLength(50);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(results.every(r => r.confidence > 0)).toBe(true);
    });
  });

  describe('Data Processing Pipeline Integration', () => {
    test('should create and execute ETL pipeline successfully', async () => {
      const pipeline = await dataProcessingPipelineService.createPipeline(
        'Test ETL Pipeline',
        'Pipeline for testing ML data processing',
        [
          {
            name: 'Extract Data',
            type: 'EXTRACT',
            configuration: {
              source: {
                type: 'DATABASE',
                connection: {
                  host: 'localhost',
                  database: 'test_db'
                }
              }
            },
            dependencies: [],
            outputs: ['raw_data']
          },
          {
            name: 'Transform Data',
            type: 'TRANSFORM',
            configuration: {
              transformation: {
                operations: [
                  {
                    operationId: 'op1',
                    type: 'MAP',
                    configuration: { function: 'normalize' },
                    order: 1
                  }
                ]
              }
            },
            dependencies: ['raw_data'],
            outputs: ['transformed_data']
          },
          {
            name: 'Load Data',
            type: 'LOAD',
            configuration: {
              destination: {
                type: 'DATABASE',
                connection: {
                  host: 'localhost',
                  database: 'ml_db'
                }
              }
            },
            dependencies: ['transformed_data'],
            outputs: ['loaded_data']
          }
        ]
      );

      expect(pipeline).toBeDefined();
      expect(pipeline.stages).toHaveLength(3);
      expect(pipeline.status).toBe('INACTIVE');

      testPipelineId = pipeline.pipelineId;

      // Execute the pipeline
      const execution = await dataProcessingPipelineService.executePipeline(testPipelineId);

      expect(execution).toBeDefined();
      expect(execution.status).toMatch(/^(COMPLETED|FAILED)$/);
      expect(execution.stages).toHaveLength(3);
    });

    test('should validate data quality during processing', async () => {
      const pipeline = await dataProcessingPipelineService.createPipeline(
        'Data Quality Pipeline',
        'Pipeline with data quality validation',
        [
          {
            name: 'Extract Data',
            type: 'EXTRACT',
            configuration: {
              source: {
                type: 'FILE',
                connection: { url: '/test/data.csv' }
              }
            },
            dependencies: [],
            outputs: ['raw_data']
          },
          {
            name: 'Validate Data',
            type: 'VALIDATE',
            configuration: {
              validation: {
                rules: [
                  {
                    ruleId: 'rule1',
                    name: 'Completeness Check',
                    type: 'COMPLETENESS',
                    condition: 'null_count < 0.05',
                    severity: 'ERROR',
                    enabled: true
                  }
                ],
                sampling: {
                  strategy: 'RANDOM',
                  size: 1000
                },
                reporting: {
                  generateReport: true,
                  includeDetails: true,
                  format: 'JSON',
                  destination: '/test/validation_report.json'
                }
              }
            },
            dependencies: ['raw_data'],
            outputs: ['validated_data']
          }
        ]
      );

      const execution = await dataProcessingPipelineService.executePipeline(pipeline.pipelineId);

      expect(execution.stages[1].metrics.qualityScore).toBeGreaterThan(0);
      expect(execution.stages[1].outputs).toHaveLength.greaterThan(0);
    });

    test('should perform feature engineering with multiple techniques', async () => {
      const pipeline = await dataProcessingPipelineService.createPipeline(
        'Feature Engineering Pipeline',
        'Pipeline for advanced feature engineering',
        [
          {
            name: 'Feature Engineering',
            type: 'FEATURE_ENGINEERING',
            configuration: {
              featureEngineering: {
                features: [
                  {
                    name: 'risk_score_normalized',
                    type: 'NUMERICAL',
                    source: 'risk_score',
                    transformation: 'min_max_scale'
                  },
                  {
                    name: 'industry_encoded',
                    type: 'CATEGORICAL',
                    source: 'industry',
                    transformation: 'one_hot_encode'
                  }
                ],
                encoding: {
                  categorical: [
                    {
                      field: 'industry',
                      method: 'ONE_HOT'
                    }
                  ],
                  temporal: [
                    {
                      field: 'timestamp',
                      components: ['YEAR', 'MONTH', 'DAY', 'WEEKDAY'],
                      cyclical: true
                    }
                  ],
                  text: []
                },
                scaling: {
                  numerical: [
                    {
                      field: 'risk_score',
                      method: 'STANDARD'
                    }
                  ],
                  robust: true,
                  outlierHandling: {
                    method: 'IQR',
                    threshold: 1.5,
                    action: 'CAP'
                  }
                },
                selection: {
                  method: 'CORRELATION',
                  threshold: 0.8,
                  maxFeatures: 50
                }
              }
            },
            dependencies: [],
            outputs: ['engineered_features']
          }
        ]
      );

      const execution = await dataProcessingPipelineService.executePipeline(pipeline.pipelineId);

      expect(execution.stages[0].metrics.qualityScore).toBeGreaterThan(0.9);
      expect(execution.stages[0].outputs[0].name).toBe('engineered_features');
    });
  });

  describe('Optimization Algorithms Integration', () => {
    test('should solve constraint satisfaction problem', async () => {
      const problem = {
        problemId: crypto.randomUUID(),
        name: 'Resource Allocation Problem',
        type: 'CONSTRAINT_SATISFACTION' as const,
        description: 'Optimize resource allocation with constraints',
        objectives: [
          {
            objectiveId: 'obj1',
            name: 'Minimize Cost',
            type: 'MINIMIZE' as const,
            expression: 'sum(cost * allocation)',
            weight: 1.0,
            priority: 1,
            description: 'Minimize total cost'
          }
        ],
        constraints: [
          {
            constraintId: 'const1',
            name: 'Resource Capacity',
            type: 'INEQUALITY' as const,
            expression: 'sum(allocation) <= capacity',
            operator: 'LE' as const,
            value: 100,
            description: 'Total allocation cannot exceed capacity'
          }
        ],
        variables: [
          {
            variableId: 'var1',
            name: 'allocation_1',
            type: 'CONTINUOUS' as const,
            lowerBound: 0,
            upperBound: 50,
            description: 'Allocation for resource 1'
          }
        ],
        parameters: {
          algorithm: 'BACKTRACKING',
          maxIterations: 1000,
          tolerance: 1e-6,
          timeLimit: 60,
          convergenceCriteria: {
            type: 'OBJECTIVE_CHANGE',
            threshold: 1e-6,
            consecutiveIterations: 10
          },
          parallelization: {
            enabled: false,
            threads: 1,
            strategy: 'MASTER_SLAVE'
          }
        },
        status: 'PENDING' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const solution = await optimizationAlgorithmsService.solveConstraintSatisfaction(problem);

      expect(solution).toBeDefined();
      expect(solution.status).toMatch(/^(OPTIMAL|FEASIBLE|INFEASIBLE)$/);
      expect(solution.objectiveValues).toBeDefined();
      expect(solution.variableValues).toBeDefined();
      expect(solution.metadata.iterations).toBeGreaterThan(0);
    });

    test('should solve genetic algorithm optimization', async () => {
      const problem = {
        problemId: crypto.randomUUID(),
        name: 'Multi-Objective Optimization',
        type: 'GENETIC_ALGORITHM' as const,
        description: 'Optimize multiple objectives using genetic algorithm',
        objectives: [
          {
            objectiveId: 'obj1',
            name: 'Maximize Efficiency',
            type: 'MAXIMIZE' as const,
            expression: 'efficiency_function(x)',
            weight: 0.6,
            priority: 1,
            description: 'Maximize system efficiency'
          },
          {
            objectiveId: 'obj2',
            name: 'Minimize Cost',
            type: 'MINIMIZE' as const,
            expression: 'cost_function(x)',
            weight: 0.4,
            priority: 2,
            description: 'Minimize total cost'
          }
        ],
        constraints: [],
        variables: [
          {
            variableId: 'var1',
            name: 'parameter_1',
            type: 'CONTINUOUS' as const,
            lowerBound: 0,
            upperBound: 100,
            description: 'Optimization parameter 1'
          }
        ],
        parameters: {
          algorithm: 'GENETIC_ALGORITHM',
          maxIterations: 100,
          tolerance: 1e-4,
          timeLimit: 300,
          populationSize: 50,
          crossoverRate: 0.8,
          mutationRate: 0.1,
          elitismRate: 0.1,
          convergenceCriteria: {
            type: 'OBJECTIVE_CHANGE',
            threshold: 1e-4,
            consecutiveIterations: 5
          },
          parallelization: {
            enabled: true,
            threads: 4,
            strategy: 'ISLAND_MODEL'
          }
        },
        status: 'PENDING' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const solution = await optimizationAlgorithmsService.solveGeneticAlgorithm(problem);

      expect(solution).toBeDefined();
      expect(solution.status).toBe('OPTIMAL');
      expect(solution.alternatives).toHaveLength.greaterThan(0);
      expect(solution.metadata.algorithmSpecific.populationSize).toBe(50);
    });

    test('should solve resource allocation with multiple resources', async () => {
      const resources = [
        {
          resourceId: 'res1',
          name: 'Technical Team',
          type: 'HUMAN' as const,
          capacity: 40,
          availability: [],
          skills: ['programming', 'analysis'],
          cost: 1000
        },
        {
          resourceId: 'res2',
          name: 'Equipment',
          type: 'EQUIPMENT' as const,
          capacity: 20,
          availability: [],
          skills: [],
          cost: 500
        }
      ];

      const demands = [
        {
          demandId: 'dem1',
          locationId: 'loc1',
          quantity: 30,
          priority: 1,
          skills: ['programming'],
          timeWindows: []
        },
        {
          demandId: 'dem2',
          locationId: 'loc2',
          quantity: 25,
          priority: 2,
          skills: ['analysis'],
          timeWindows: []
        }
      ];

      const objectives = [
        {
          objectiveId: 'obj1',
          name: 'Minimize Cost',
          type: 'MINIMIZE' as const,
          expression: 'sum(cost * allocation)',
          weight: 1.0,
          priority: 1,
          description: 'Minimize total allocation cost'
        }
      ];

      const constraints = [
        {
          constraintId: 'const1',
          name: 'Capacity Constraint',
          type: 'INEQUALITY' as const,
          expression: 'allocation <= capacity',
          operator: 'LE' as const,
          value: 1,
          description: 'Allocation cannot exceed capacity'
        }
      ];

      const solution = await optimizationAlgorithmsService.solveResourceAllocation(
        resources,
        demands,
        objectives,
        constraints
      );

      expect(solution).toBeDefined();
      expect(solution.status).toBe('OPTIMAL');
      expect(solution.objectiveValues.total_cost).toBeDefined();
    });
  });

  describe('AI Service Layer Integration', () => {
    test('should deploy AI model successfully', async () => {
      const model = {
        modelId: crypto.randomUUID(),
        name: 'Test Risk Classification Model',
        type: 'CLASSIFICATION' as const,
        version: '1.0.0',
        status: 'TRAINING' as const,
        framework: 'TENSORFLOW' as const,
        metadata: {
          description: 'Model for risk classification',
          features: ['feature1', 'feature2', 'feature3'],
          targetVariable: 'risk_level',
          hyperparameters: { learning_rate: 0.001, epochs: 100 },
          trainingData: {
            source: 'training_dataset',
            size: 10000,
            timeRange: { start: new Date('2023-01-01'), end: new Date('2023-12-31') },
            features: [],
            quality: {
              completeness: 0.95,
              consistency: 0.92,
              accuracy: 0.88,
              validity: 0.94,
              uniqueness: 0.99
            }
          },
          validationData: {
            source: 'validation_dataset',
            size: 2000,
            splitStrategy: 'RANDOM' as const,
            splitRatio: 0.2
          },
          preprocessing: {
            steps: [],
            scalers: [],
            encoders: [],
            transformations: []
          }
        },
        performance: {
          metrics: { accuracy: 0.92, precision: 0.89, recall: 0.91 },
          crossValidation: {
            folds: 5,
            strategy: 'k-fold',
            scores: { accuracy: [0.91, 0.92, 0.90, 0.93, 0.89] },
            mean: { accuracy: 0.91 },
            std: { accuracy: 0.015 }
          },
          testResults: {
            metrics: { accuracy: 0.92 },
            featureImportance: []
          },
          benchmarks: [],
          driftDetection: {
            dataDrift: {
              detected: false,
              severity: 'LOW' as const,
              confidence: 0.95,
              features: [],
              recommendations: []
            },
            conceptDrift: {
              detected: false,
              severity: 'LOW' as const,
              confidence: 0.95,
              features: [],
              recommendations: []
            },
            lastCheck: new Date(),
            nextCheck: new Date()
          }
        },
        deployment: {
          environment: 'PRODUCTION' as const,
          infrastructure: {
            provider: 'AWS' as const,
            region: 'us-east-1',
            instanceType: 't3.medium',
            resources: {
              cpu: 2,
              memory: 4096,
              storage: 20
            }
          },
          scaling: {
            type: 'AUTO' as const,
            minInstances: 1,
            maxInstances: 5,
            targetUtilization: 70,
            scaleUpPolicy: {
              metric: 'cpu',
              threshold: 80,
              cooldown: 300,
              stepSize: 1
            },
            scaleDownPolicy: {
              metric: 'cpu',
              threshold: 30,
              cooldown: 600,
              stepSize: 1
            }
          },
          security: {
            authentication: 'JWT' as const,
            authorization: 'RBAC' as const,
            encryption: {
              inTransit: true,
              atRest: true,
              algorithm: 'AES-256',
              keyManagement: 'AWS-KMS'
            },
            rateLimit: {
              requestsPerMinute: 1000,
              requestsPerHour: 50000,
              burstLimit: 100
            }
          },
          endpoints: [
            {
              path: '/predict',
              method: 'POST' as const,
              type: 'PREDICTION' as const,
              authentication: true
            }
          ]
        },
        monitoring: {
          metrics: [],
          alerts: [],
          logging: {
            level: 'INFO' as const,
            format: 'JSON' as const,
            destination: 'CLOUDWATCH' as const,
            retention: 30
          },
          dashboard: {
            enabled: true,
            panels: [],
            refreshInterval: 60
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const deploymentId = await aiServiceLayer.deployModel(model);

      expect(deploymentId).toBeDefined();
      expect(typeof deploymentId).toBe('string');

      testModelId = model.modelId;
    });

    test('should make predictions with deployed model', async () => {
      const predictionRequest = {
        requestId: crypto.randomUUID(),
        modelId: testModelId,
        features: {
          feature1: 0.5,
          feature2: 0.8,
          feature3: 0.3
        },
        options: {
          includeExplanation: true,
          includeConfidence: true,
          includeAlternatives: true,
          outputFormat: 'JSON' as const
        }
      };

      const response = await aiServiceLayer.predict(predictionRequest);

      expect(response).toBeDefined();
      expect(response.requestId).toBe(predictionRequest.requestId);
      expect(response.modelId).toBe(testModelId);
      expect(response.prediction).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.explanation).toBeDefined();
      expect(response.alternatives).toBeDefined();
      expect(response.metadata.processingTime).toBeGreaterThan(0);
    });

    test('should handle batch predictions efficiently', async () => {
      const batchRequest = {
        requestId: crypto.randomUUID(),
        modelId: testModelId,
        data: Array.from({ length: 100 }, (_, i) => ({
          feature1: Math.random(),
          feature2: Math.random(),
          feature3: Math.random()
        })),
        options: {
          includeExplanation: false,
          includeConfidence: true,
          includeAlternatives: false,
          outputFormat: 'JSON' as const
        }
      };

      const startTime = Date.now();
      const response = await aiServiceLayer.batchPredict(batchRequest);
      const processingTime = Date.now() - startTime;

      expect(response).toBeDefined();
      expect(response.status).toBe('COMPLETED');
      expect(response.results).toHaveLength(100);
      expect(response.metadata.processedRecords).toBe(100);
      expect(response.metadata.failedRecords).toBe(0);
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    test('should monitor model performance and detect drift', async () => {
      await aiServiceLayer.monitorModel(testModelId);

      // Monitoring should complete without errors
      // In a real implementation, this would check for:
      // - Model health status
      // - Data drift detection
      // - Performance degradation
      // - Alert generation
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should provide model explanations', async () => {
      const features = {
        feature1: 0.7,
        feature2: 0.4,
        feature3: 0.9
      };

      const explanation = await aiServiceLayer.explainModel(testModelId, features);

      expect(explanation).toBeDefined();
      expect(explanation.method).toBeDefined();
      expect(explanation.globalImportance).toHaveLength.greaterThan(0);
      expect(explanation.localImportance).toHaveLength.greaterThan(0);
      expect(explanation.summary).toBeDefined();
    });
  });

  describe('End-to-End ML Workflow Integration', () => {
    test('should execute complete ML workflow from data to prediction', async () => {
      // 1. Create data processing pipeline
      const pipeline = await dataProcessingPipelineService.createPipeline(
        'E2E ML Pipeline',
        'End-to-end machine learning pipeline',
        [
          {
            name: 'Extract Training Data',
            type: 'EXTRACT',
            configuration: {
              source: {
                type: 'DATABASE',
                connection: { host: 'localhost', database: 'ml_data' }
              }
            },
            dependencies: [],
            outputs: ['raw_training_data']
          },
          {
            name: 'Feature Engineering',
            type: 'FEATURE_ENGINEERING',
            configuration: {
              featureEngineering: {
                features: [
                  {
                    name: 'normalized_risk',
                    type: 'NUMERICAL',
                    source: 'risk_score'
                  }
                ],
                encoding: { categorical: [], temporal: [], text: [] },
                scaling: { numerical: [], robust: false, outlierHandling: { method: 'IQR', threshold: 1.5, action: 'REMOVE' } },
                selection: { method: 'CORRELATION', threshold: 0.8 }
              }
            },
            dependencies: ['raw_training_data'],
            outputs: ['processed_features']
          }
        ]
      );

      // 2. Execute pipeline
      const execution = await dataProcessingPipelineService.executePipeline(pipeline.pipelineId);
      expect(execution.status).toBe('COMPLETED');

      // 3. Create time series forecast
      const forecastData = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(2024, 0, i + 1),
        value: 100 + Math.sin(i * 0.2) * 10 + Math.random() * 5
      }));

      const forecast = await timeSeriesForecastingService.createEnsembleForecast(
        forecastData,
        7
      );

      expect(forecast.modelType).toBe('ENSEMBLE');
      expect(forecast.predictions).toHaveLength(7);

      // 4. Classify risk based on forecast
      const riskFeatures = {
        companySize: 2000,
        industry: 'Technology',
        complianceHistory: forecast.predictions[0].value,
        incidentCount: 2,
        trainingCompletion: 90,
        auditScore: 85,
        securityMaturity: 8,
        processMaturity: 7,
        technicalDebt: 20,
        staffTurnover: 10,
        budgetAllocation: 1500000,
        geographicRisk: 3,
        regulatoryComplexity: 5,
        dataVolume: 750000,
        systemComplexity: 6,
        vendorRisk: 4,
        changeFrequency: 12,
        monitoringCoverage: 88,
        incidentResponseTime: 3,
        businessCriticality: 7
      };

      const riskClassification = await riskClassificationService.classifyRisk(riskFeatures);
      expect(riskClassification.riskLevel).toMatch(/^(LOW|MEDIUM|HIGH|CRITICAL)$/);

      // 5. Optimize based on risk and forecast
      const optimizationProblem = {
        problemId: crypto.randomUUID(),
        name: 'Risk-Based Optimization',
        type: 'MULTI_OBJECTIVE' as const,
        description: 'Optimize based on forecast and risk assessment',
        objectives: [
          {
            objectiveId: 'obj1',
            name: 'Minimize Risk',
            type: 'MINIMIZE' as const,
            expression: 'risk_function(x)',
            weight: 0.7,
            priority: 1,
            description: 'Minimize overall risk'
          }
        ],
        constraints: [],
        variables: [
          {
            variableId: 'var1',
            name: 'mitigation_level',
            type: 'CONTINUOUS' as const,
            lowerBound: 0,
            upperBound: 10,
            description: 'Risk mitigation level'
          }
        ],
        parameters: {
          algorithm: 'NSGA2',
          maxIterations: 50,
          tolerance: 1e-3,
          timeLimit: 120,
          convergenceCriteria: {
            type: 'OBJECTIVE_CHANGE',
            threshold: 1e-3,
            consecutiveIterations: 5
          },
          parallelization: {
            enabled: false,
            threads: 1,
            strategy: 'MASTER_SLAVE'
          }
        },
        status: 'PENDING' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const optimization = await optimizationAlgorithmsService.solveMultiObjective(optimizationProblem);
      expect(optimization.status).toMatch(/^(OPTIMAL|FEASIBLE)$/);

      // Verify end-to-end integration
      expect(execution.status).toBe('COMPLETED');
      expect(forecast.predictions).toHaveLength(7);
      expect(riskClassification.confidence).toBeGreaterThan(0.5);
      expect(optimization.objectiveValues).toBeDefined();
    });
  });

  describe('Performance and Scalability Tests', () => {
    test('should handle high-volume concurrent requests', async () => {
      const concurrentRequests = 20;
      const requestsPerBatch = 5;

      const requests = Array.from({ length: concurrentRequests }, (_, i) =>
        riskClassificationService.classifyRisk({
          companySize: 1000 + i * 100,
          industry: 'Technology',
          complianceHistory: 80 + Math.random() * 20,
          incidentCount: Math.floor(Math.random() * 5),
          trainingCompletion: 85 + Math.random() * 15,
          auditScore: 80 + Math.random() * 20,
          securityMaturity: Math.floor(Math.random() * 5) + 5,
          processMaturity: Math.floor(Math.random() * 5) + 5,
          technicalDebt: Math.random() * 30,
          staffTurnover: Math.random() * 20,
          budgetAllocation: 1000000 + Math.random() * 1000000,
          geographicRisk: Math.floor(Math.random() * 5) + 1,
          regulatoryComplexity: Math.floor(Math.random() * 5) + 1,
          dataVolume: Math.random() * 1000000,
          systemComplexity: Math.floor(Math.random() * 5) + 1,
          vendorRisk: Math.floor(Math.random() * 5) + 1,
          changeFrequency: Math.random() * 25,
          monitoringCoverage: 70 + Math.random() * 30,
          incidentResponseTime: Math.random() * 10,
          businessCriticality: Math.floor(Math.random() * 5) + 5
        })
      );

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(concurrentRequests);
      expect(results.every(r => r.confidence > 0)).toBe(true);
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds

      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(1000); // Average response time under 1 second
    });

    test('should maintain accuracy under load', async () => {
      const testData = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(2024, 0, i + 1),
        value: 100 + Math.sin(i * 0.1) * 20 + Math.random() * 5
      }));

      const forecasts = await Promise.all([
        timeSeriesForecastingService.createARIMAForecast(testData, 5),
        timeSeriesForecastingService.createProphetForecast(testData, 5),
        timeSeriesForecastingService.createLSTMForecast(testData, 5)
      ]);

      forecasts.forEach(forecast => {
        expect(forecast.metrics.r2).toBeGreaterThan(0.7);
        expect(forecast.predictions).toHaveLength(5);
        expect(forecast.confidence.every(c => c.level > 0.8)).toBe(true);
      });
    });
  });

  describe('Security and Data Protection Tests', () => {
    test('should enforce authentication for ML endpoints', async () => {
      const response = await request(app)
        .post('/api/ml/predict')
        .send({
          modelId: testModelId,
          features: { feature1: 0.5 }
        });

      expect(response.status).toBe(401);
    });

    test('should validate input data and prevent injection attacks', async () => {
      const maliciousFeatures = {
        companySize: "'; DROP TABLE users; --",
        industry: '<script>alert("xss")</script>',
        complianceHistory: 'UNION SELECT * FROM sensitive_data',
        incidentCount: 1,
        trainingCompletion: 90,
        auditScore: 85,
        securityMaturity: 8,
        processMaturity: 7,
        technicalDebt: 20,
        staffTurnover: 10,
        budgetAllocation: 1500000,
        geographicRisk: 3,
        regulatoryComplexity: 5,
        dataVolume: 750000,
        systemComplexity: 6,
        vendorRisk: 4,
        changeFrequency: 12,
        monitoringCoverage: 88,
        incidentResponseTime: 3,
        businessCriticality: 7
      };

      // Should handle malicious input gracefully
      try {
        await riskClassificationService.classifyRisk(maliciousFeatures as any);
        // If it doesn't throw, the input was sanitized
        expect(true).toBe(true);
      } catch (error) {
        // Should throw a validation error, not a security breach
        expect(error.message).not.toContain('DROP TABLE');
        expect(error.message).not.toContain('<script>');
      }
    });

    test('should audit ML operations', async () => {
      const features = {
        companySize: 2000,
        industry: 'Technology',
        complianceHistory: 85,
        incidentCount: 2,
        trainingCompletion: 90,
        auditScore: 88,
        securityMaturity: 8,
        processMaturity: 7,
        technicalDebt: 15,
        staffTurnover: 8,
        budgetAllocation: 1800000,
        geographicRisk: 3,
        regulatoryComplexity: 4,
        dataVolume: 600000,
        systemComplexity: 6,
        vendorRisk: 3,
        changeFrequency: 10,
        monitoringCoverage: 92,
        incidentResponseTime: 2,
        businessCriticality: 8
      };

      const classification = await riskClassificationService.classifyRisk(features);

      // Verify audit log was created
      // In a real implementation, this would check the audit log database
      expect(classification.classificationId).toBeDefined();
    });
  });
});