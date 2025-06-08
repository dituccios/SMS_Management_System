import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../app';
import { PrismaClient } from '@prisma/client';
import riskAssessmentService from '../../services/risk/riskAssessmentService';
import trainingRecommendationService from '../../services/training/trainingRecommendationService';
import complianceForecastingService from '../../services/compliance/complianceForecastingService';
import smsIntelligenceService from '../../services/integration/smsIntelligenceService';

const prisma = new PrismaClient();

describe('SMS Intelligence Integration Tests', () => {
  let authToken: string;
  let testCompanyId: string;
  let testUserId: string;
  let smsSystemId: string;

  beforeAll(async () => {
    // Setup test database
    await prisma.$connect();
    
    // Create test company
    const company = await prisma.company.create({
      data: {
        name: 'Test SMS Company',
        industry: 'Technology',
        size: 'MEDIUM',
        country: 'US'
      }
    });
    testCompanyId = company.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@smsintegration.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN',
        companyId: testCompanyId
      }
    });
    testUserId = user.id;

    // Get auth token
    const authResponse = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@smsintegration.com',
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

  describe('SMS Intelligence System Initialization', () => {
    test('should initialize SMS Intelligence system successfully', async () => {
      const response = await request(app)
        .post('/api/sms/intelligence/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          configuration: {
            features: ['RISK_ASSESSMENT', 'TRAINING_RECOMMENDATION', 'COMPLIANCE_FORECASTING'],
            automation: {
              enabled: true,
              rules: ['HIGH_RISK_ALERT', 'TRAINING_REMINDER']
            }
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('systemId');
      expect(response.body.data.status).toBe('ACTIVE');
      expect(response.body.data.components).toHaveLength(3);
      expect(response.body.data.integrations).toHaveLength(2);

      smsSystemId = response.body.data.systemId;
    });

    test('should validate system components are properly initialized', async () => {
      const response = await request(app)
        .get(`/api/sms/intelligence/${smsSystemId}/health`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.overallHealth).toBeGreaterThan(90);
      expect(response.body.data.componentHealth).toHaveLength(3);
      expect(response.body.data.integrationHealth).toHaveLength(2);
    });
  });

  describe('Risk Assessment Integration', () => {
    test('should create risk assessment and trigger training recommendations', async () => {
      // Create risk assessment
      const riskResponse = await request(app)
        .post('/api/risk/assessments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          framework: 'ISO27001',
          assessmentType: 'COMPREHENSIVE',
          scope: 'FULL_ORGANIZATION'
        });

      expect(riskResponse.status).toBe(200);
      const riskAssessmentId = riskResponse.body.data.assessmentId;

      // Wait for integration to process
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if training recommendations were generated
      const trainingResponse = await request(app)
        .get('/api/training/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ riskAssessmentId });

      expect(trainingResponse.status).toBe(200);
      expect(trainingResponse.body.data).toHaveLength.greaterThan(0);
      expect(trainingResponse.body.data[0]).toHaveProperty('riskFactors');
      expect(trainingResponse.body.data[0]).toHaveProperty('trainingPriority');
    });

    test('should update risk scores and reflect in intelligence insights', async () => {
      // Generate intelligence
      const intelligenceResponse = await request(app)
        .post(`/api/sms/intelligence/${smsSystemId}/generate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(intelligenceResponse.status).toBe(200);
      expect(intelligenceResponse.body.data.insights).toHaveLength.greaterThan(0);
      
      const riskInsights = intelligenceResponse.body.data.insights.filter(
        (insight: any) => insight.type === 'RISK'
      );
      expect(riskInsights).toHaveLength.greaterThan(0);
    });
  });

  describe('Training-Compliance Integration', () => {
    test('should connect training effectiveness to compliance forecasts', async () => {
      // Create training plan
      const trainingResponse = await request(app)
        .post('/api/training/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Compliance Training Plan',
          framework: 'ISO27001',
          modules: [
            {
              title: 'Risk Management Fundamentals',
              duration: 120,
              type: 'COMPLIANCE'
            }
          ]
        });

      expect(trainingResponse.status).toBe(200);

      // Generate compliance forecast
      const forecastResponse = await request(app)
        .post('/api/compliance/forecasts/time-series')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          framework: 'ISO27001',
          metric: 'overall_compliance',
          horizon: 90,
          modelType: 'ARIMA'
        });

      expect(forecastResponse.status).toBe(200);
      expect(forecastResponse.body.data.trainingImpact).toBeDefined();
      expect(forecastResponse.body.data.trainingImpact.improvement).toBeGreaterThan(0);
    });

    test('should predict training effectiveness on compliance outcomes', async () => {
      const predictionResponse = await request(app)
        .post('/api/training/effectiveness/predict')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          framework: 'ISO27001',
          trainingPlanId: 'test-plan-id',
          complianceMetrics: ['overall_compliance', 'security_score']
        });

      expect(predictionResponse.status).toBe(200);
      expect(predictionResponse.body.data.complianceMetrics).toHaveLength.greaterThan(0);
      expect(predictionResponse.body.data.roi).toBeDefined();
      expect(predictionResponse.body.data.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Automation and Intelligence', () => {
    test('should execute automation rules based on intelligence insights', async () => {
      // Configure automation rule
      const ruleResponse = await request(app)
        .put(`/api/sms/intelligence/${smsSystemId}/automation/rules`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rules: [
            {
              name: 'High Risk Training Alert',
              trigger: {
                type: 'THRESHOLD',
                configuration: { metric: 'risk_level', threshold: 80 }
              },
              actions: [
                {
                  type: 'TRAINING',
                  configuration: { priority: 'HIGH', immediate: true }
                }
              ]
            }
          ]
        });

      expect(ruleResponse.status).toBe(200);

      // Execute automation
      const executionResponse = await request(app)
        .post(`/api/sms/intelligence/${smsSystemId}/automation/execute`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(executionResponse.status).toBe(200);
      expect(executionResponse.body.data).toHaveLength.greaterThan(0);
      
      const executedRules = executionResponse.body.data.filter(
        (result: any) => result.executed
      );
      expect(executedRules).toHaveLength.greaterThan(0);
    });

    test('should generate intelligent recommendations based on integrated data', async () => {
      const recommendationResponse = await request(app)
        .get('/api/sms/intelligence/recommendations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(recommendationResponse.status).toBe(200);
      expect(recommendationResponse.body.data).toHaveLength.greaterThan(0);
      
      const recommendations = recommendationResponse.body.data;
      expect(recommendations[0]).toHaveProperty('type');
      expect(recommendations[0]).toHaveProperty('priority');
      expect(recommendations[0]).toHaveProperty('expectedImpact');
      expect(recommendations[0]).toHaveProperty('implementation');
    });
  });

  describe('Performance and Monitoring', () => {
    test('should monitor system performance across all components', async () => {
      const performanceResponse = await request(app)
        .get(`/api/sms/intelligence/${smsSystemId}/performance`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(performanceResponse.status).toBe(200);
      expect(performanceResponse.body.data.overallHealth).toBeGreaterThan(0);
      expect(performanceResponse.body.data.availability).toBeGreaterThan(90);
      expect(performanceResponse.body.data.componentHealth).toHaveLength(3);
      expect(performanceResponse.body.data.integrationHealth).toHaveLength(2);
    });

    test('should detect and report system anomalies', async () => {
      const anomalyResponse = await request(app)
        .get('/api/sms/intelligence/anomalies')
        .set('Authorization', `Bearer ${authToken}`);

      expect(anomalyResponse.status).toBe(200);
      // Anomalies may or may not exist, but the endpoint should work
      expect(Array.isArray(anomalyResponse.body.data)).toBe(true);
    });
  });

  describe('Data Flow and Synchronization', () => {
    test('should maintain data consistency across all systems', async () => {
      // Create data in risk system
      const riskData = await request(app)
        .post('/api/risk/data-points')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          framework: 'ISO27001',
          metric: 'security_score',
          value: 85,
          timestamp: new Date().toISOString()
        });

      expect(riskData.status).toBe(200);

      // Wait for synchronization
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if data is reflected in intelligence
      const intelligenceResponse = await request(app)
        .get(`/api/sms/intelligence/${smsSystemId}/data-sync`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(intelligenceResponse.status).toBe(200);
      expect(intelligenceResponse.body.data.lastSync).toBeDefined();
      expect(intelligenceResponse.body.data.syncAccuracy).toBeGreaterThan(95);
    });

    test('should handle concurrent operations without data corruption', async () => {
      // Execute multiple operations concurrently
      const operations = [
        request(app)
          .post('/api/risk/assessments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ framework: 'ISO27001', assessmentType: 'QUICK' }),
        
        request(app)
          .post('/api/training/recommendations/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ userId: testUserId }),
        
        request(app)
          .post('/api/compliance/forecasts/time-series')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ framework: 'ISO27001', metric: 'compliance_score', horizon: 30 })
      ];

      const results = await Promise.all(operations);
      
      // All operations should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
      });

      // System should remain healthy
      const healthResponse = await request(app)
        .get(`/api/sms/intelligence/${smsSystemId}/health`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.data.overallHealth).toBeGreaterThan(85);
    });
  });

  describe('Security and Compliance', () => {
    test('should enforce proper authentication and authorization', async () => {
      // Test without auth token
      const unauthorizedResponse = await request(app)
        .get(`/api/sms/intelligence/${smsSystemId}/health`);

      expect(unauthorizedResponse.status).toBe(401);

      // Test with invalid token
      const invalidTokenResponse = await request(app)
        .get(`/api/sms/intelligence/${smsSystemId}/health`)
        .set('Authorization', 'Bearer invalid-token');

      expect(invalidTokenResponse.status).toBe(401);
    });

    test('should audit all intelligence operations', async () => {
      // Perform an operation
      await request(app)
        .post(`/api/sms/intelligence/${smsSystemId}/generate`)
        .set('Authorization', `Bearer ${authToken}`);

      // Check audit logs
      const auditResponse = await request(app)
        .get('/api/audit/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          category: 'SMS_INTELLIGENCE',
          action: 'INTELLIGENCE_GENERATED'
        });

      expect(auditResponse.status).toBe(200);
      expect(auditResponse.body.data).toHaveLength.greaterThan(0);
      expect(auditResponse.body.data[0]).toHaveProperty('eventType');
      expect(auditResponse.body.data[0]).toHaveProperty('userId');
      expect(auditResponse.body.data[0]).toHaveProperty('companyId');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle component failures gracefully', async () => {
      // Simulate component failure (this would be mocked in a real test)
      const response = await request(app)
        .post(`/api/sms/intelligence/${smsSystemId}/simulate-failure`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ component: 'RISK_ASSESSMENT' });

      expect(response.status).toBe(200);

      // System should continue operating with degraded functionality
      const healthResponse = await request(app)
        .get(`/api/sms/intelligence/${smsSystemId}/health`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.data.overallHealth).toBeGreaterThan(60);
    });

    test('should recover from temporary failures', async () => {
      // Simulate recovery
      const recoveryResponse = await request(app)
        .post(`/api/sms/intelligence/${smsSystemId}/recover`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(recoveryResponse.status).toBe(200);

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 3000));

      // System should be back to full health
      const healthResponse = await request(app)
        .get(`/api/sms/intelligence/${smsSystemId}/health`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.data.overallHealth).toBeGreaterThan(90);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet response time requirements', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get(`/api/sms/intelligence/${smsSystemId}/health`)
        .set('Authorization', `Bearer ${authToken}`);

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    test('should handle concurrent users efficiently', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        request(app)
          .get(`/api/sms/intelligence/${smsSystemId}/health`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      // Average response time should be reasonable
      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(2000); // 2 seconds average
    });
  });
});
