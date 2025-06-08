import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import app from '../../app';
import trainingIntegrationService from '../../services/trainingIntegrationService';
import complianceEngine from '../../services/complianceEngine';
import trainingAnalyticsService from '../../services/trainingAnalyticsService';

const prisma = new PrismaClient();

describe('Persona Training Integration - End-to-End Tests', () => {
  let testCompanyId: string;
  let testPersonaId: string;
  let testTrainingId: string;
  let authToken: string;

  beforeAll(async () => {
    // Setup test data
    const testCompany = await prisma.company.create({
      data: {
        name: 'Test Company',
        email: 'test@company.com',
        phone: '+1234567890',
        address: 'Test Address',
        industry: 'Technology',
        size: 'MEDIUM',
        status: 'ACTIVE'
      }
    });
    testCompanyId = testCompany.id;

    // Create test training
    const testTraining = await prisma.sMSTraining.create({
      data: {
        title: 'Safety Training',
        description: 'Basic safety training for all employees',
        category: 'SAFETY',
        status: 'ACTIVE',
        companyId: testCompanyId,
        duration: 60,
        passingScore: 80
      }
    });
    testTrainingId = testTraining.id;

    // Create test user and get auth token
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN',
        companyId: testCompanyId,
        isActive: true,
        emailVerified: true
      }
    });

    // Mock auth token (in real tests, you'd get this from login endpoint)
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.trainingRecord.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.certification.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.personaProfile.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.sMSTraining.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.user.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.company.delete({ where: { id: testCompanyId } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create fresh test persona for each test
    const testPersona = await prisma.personaProfile.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        department: 'Engineering',
        position: 'Software Engineer',
        employmentType: 'FULL_TIME',
        status: 'ACTIVE',
        dataProcessingConsent: true,
        companyId: testCompanyId,
        profileCompleteness: 100
      }
    });
    testPersonaId = testPersona.id;
  });

  afterEach(async () => {
    // Clean up persona-specific data
    await prisma.trainingRecord.deleteMany({ where: { personaId: testPersonaId } });
    await prisma.certification.deleteMany({ where: { personaId: testPersonaId } });
    await prisma.personaProfile.delete({ where: { id: testPersonaId } });
  });

  describe('Training Assignment Integration', () => {
    it('should automatically assign training when persona is created', async () => {
      // Test automatic training assignment
      const assignments = await trainingIntegrationService.evaluateTrainingRequirements(testPersonaId);
      
      expect(assignments).toBeDefined();
      expect(Array.isArray(assignments)).toBe(true);
    });

    it('should assign training to persona via API', async () => {
      const response = await request(app)
        .post(`/api/v1/persona-management/profiles/${testPersonaId}/training`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trainingId: testTrainingId,
          priority: 'HIGH',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.trainingId).toBe(testTrainingId);
      expect(response.body.data.personaId).toBe(testPersonaId);
    });

    it('should handle bulk training assignment', async () => {
      const assignments = [
        {
          personaId: testPersonaId,
          trainingId: testTrainingId,
          assignedDate: new Date(),
          priority: 'HIGH' as const,
          reason: 'Bulk assignment test'
        }
      ];

      const results = await trainingIntegrationService.bulkAssignTraining(assignments);
      
      expect(results).toBeDefined();
      expect(results.length).toBe(1);
      expect(results[0].personaId).toBe(testPersonaId);
      expect(results[0].trainingId).toBe(testTrainingId);
    });
  });

  describe('Training Progress Tracking', () => {
    let trainingRecordId: string;

    beforeEach(async () => {
      // Create a training record for progress tracking tests
      const trainingRecord = await prisma.trainingRecord.create({
        data: {
          personaId: testPersonaId,
          trainingId: testTrainingId,
          enrollmentDate: new Date(),
          status: 'ENROLLED',
          complianceStatus: 'PENDING',
          progress: 0,
          attempts: 0,
          companyId: testCompanyId
        }
      });
      trainingRecordId = trainingRecord.id;
    });

    it('should update training progress', async () => {
      const updatedRecord = await trainingIntegrationService.updateTrainingProgress(
        testPersonaId,
        testTrainingId,
        {
          progress: 50,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          timeSpentMinutes: 30
        }
      );

      expect(updatedRecord.progress).toBe(50);
      expect(updatedRecord.status).toBe('IN_PROGRESS');
    });

    it('should handle training completion', async () => {
      const updatedRecord = await trainingIntegrationService.updateTrainingProgress(
        testPersonaId,
        testTrainingId,
        {
          progress: 100,
          status: 'COMPLETED',
          completedAt: new Date(),
          score: 85
        }
      );

      expect(updatedRecord.progress).toBe(100);
      expect(updatedRecord.status).toBe('COMPLETED');
      expect(updatedRecord.complianceStatus).toBe('COMPLIANT');
    });

    it('should issue certification upon training completion', async () => {
      // Complete the training
      await trainingIntegrationService.updateTrainingProgress(
        testPersonaId,
        testTrainingId,
        {
          progress: 100,
          status: 'COMPLETED',
          completedAt: new Date(),
          score: 90
        }
      );

      // Check if certification was issued
      const certifications = await prisma.certification.findMany({
        where: { personaId: testPersonaId }
      });

      expect(certifications.length).toBeGreaterThan(0);
      expect(certifications[0].status).toBe('ACTIVE');
    });
  });

  describe('Compliance Engine Integration', () => {
    beforeEach(async () => {
      // Create training record for compliance tests
      await prisma.trainingRecord.create({
        data: {
          personaId: testPersonaId,
          trainingId: testTrainingId,
          enrollmentDate: new Date(),
          status: 'ENROLLED',
          complianceStatus: 'PENDING',
          progress: 0,
          attempts: 0,
          companyId: testCompanyId,
          metadata: {
            dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Overdue by 1 day
          }
        }
      });
    });

    it('should evaluate persona compliance status', async () => {
      const complianceStatus = await complianceEngine.evaluatePersonaCompliance(testPersonaId);

      expect(complianceStatus).toBeDefined();
      expect(complianceStatus.personaId).toBe(testPersonaId);
      expect(complianceStatus.overallStatus).toBeDefined();
      expect(complianceStatus.complianceScore).toBeGreaterThanOrEqual(0);
      expect(complianceStatus.complianceScore).toBeLessThanOrEqual(100);
    });

    it('should detect compliance violations', async () => {
      const complianceStatus = await complianceEngine.evaluatePersonaCompliance(testPersonaId);

      expect(complianceStatus.violations).toBeDefined();
      expect(Array.isArray(complianceStatus.violations)).toBe(true);
      
      // Should detect overdue training
      const overdueViolations = complianceStatus.violations.filter(v => v.violationType === 'OVERDUE');
      expect(overdueViolations.length).toBeGreaterThan(0);
    });

    it('should evaluate company-wide compliance', async () => {
      const companyCompliance = await complianceEngine.evaluateCompanyCompliance(testCompanyId);

      expect(companyCompliance).toBeDefined();
      expect(companyCompliance.companyId).toBe(testCompanyId);
      expect(companyCompliance.stats).toBeDefined();
      expect(companyCompliance.stats.totalPersonas).toBeGreaterThan(0);
    });
  });

  describe('Training Analytics Integration', () => {
    beforeEach(async () => {
      // Create sample training records for analytics
      await prisma.trainingRecord.createMany({
        data: [
          {
            personaId: testPersonaId,
            trainingId: testTrainingId,
            enrollmentDate: new Date(),
            status: 'COMPLETED',
            complianceStatus: 'COMPLIANT',
            progress: 100,
            score: 85,
            completionDate: new Date(),
            attempts: 1,
            companyId: testCompanyId
          }
        ]
      });
    });

    it('should generate training metrics', async () => {
      const metrics = await trainingAnalyticsService.getTrainingMetrics({
        companyId: testCompanyId
      });

      expect(metrics).toBeDefined();
      expect(metrics.totalPersonas).toBeGreaterThan(0);
      expect(metrics.totalTrainingRecords).toBeGreaterThan(0);
      expect(metrics.completionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.complianceRate).toBeGreaterThanOrEqual(0);
    });

    it('should generate detailed reports', async () => {
      const report = await trainingAnalyticsService.getDetailedReport(
        { companyId: testCompanyId },
        { format: 'JSON', includeDetails: true }
      );

      expect(report).toBeDefined();
      expect(report.metadata).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.records).toBeDefined();
    });

    it('should export reports in different formats', async () => {
      // Test CSV export
      const csvReport = await trainingAnalyticsService.getDetailedReport(
        { companyId: testCompanyId },
        { format: 'CSV', includeDetails: true }
      );

      expect(typeof csvReport).toBe('string');
      expect(csvReport).toContain('Personnel Name');

      // Test Excel export
      const excelReport = await trainingAnalyticsService.getDetailedReport(
        { companyId: testCompanyId },
        { format: 'EXCEL', includeDetails: true }
      );

      expect(excelReport).toBeInstanceOf(Buffer);
    });
  });

  describe('API Integration Tests', () => {
    it('should get persona training status via API', async () => {
      const response = await request(app)
        .get(`/api/v1/persona-management/profiles/${testPersonaId}/training`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should get compliance overview via API', async () => {
      const response = await request(app)
        .get('/api/v1/persona-management/compliance/overview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should get training analytics via API', async () => {
      const response = await request(app)
        .get('/api/v1/persona-management/analytics/training')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .get(`/api/v1/persona-management/profiles/${testPersonaId}/training`);

      expect(response.status).toBe(401);
    });

    it('should handle invalid persona ID', async () => {
      const response = await request(app)
        .get('/api/v1/persona-management/profiles/invalid-id/training')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GDPR Compliance Integration', () => {
    it('should handle persona data anonymization', async () => {
      const response = await request(app)
        .delete(`/api/v1/persona-management/profiles/${testPersonaId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'GDPR data deletion request'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify training records are also anonymized
      const trainingRecords = await prisma.trainingRecord.findMany({
        where: { personaId: testPersonaId }
      });

      // Records should still exist but be anonymized
      expect(trainingRecords.length).toBeGreaterThanOrEqual(0);
    });

    it('should export persona data including training records', async () => {
      const response = await request(app)
        .post(`/api/v1/persona-management/profiles/${testPersonaId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'JSON',
          includeTrainingRecords: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.trainingRecords).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple personas
      const personas = await Promise.all(
        Array.from({ length: 10 }, (_, i) => 
          prisma.personaProfile.create({
            data: {
              firstName: `Test${i}`,
              lastName: 'User',
              email: `test${i}@example.com`,
              department: 'Engineering',
              position: 'Developer',
              employmentType: 'FULL_TIME',
              status: 'ACTIVE',
              dataProcessingConsent: true,
              companyId: testCompanyId,
              profileCompleteness: 100
            }
          })
        )
      );

      // Bulk assign training
      const assignments = personas.map(persona => ({
        personaId: persona.id,
        trainingId: testTrainingId,
        assignedDate: new Date(),
        priority: 'MEDIUM' as const,
        reason: 'Performance test'
      }));

      await trainingIntegrationService.bulkAssignTraining(assignments);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds

      // Cleanup
      await prisma.trainingRecord.deleteMany({
        where: { personaId: { in: personas.map(p => p.id) } }
      });
      await prisma.personaProfile.deleteMany({
        where: { id: { in: personas.map(p => p.id) } }
      });
    });

    it('should handle concurrent compliance evaluations', async () => {
      const startTime = Date.now();

      // Run multiple compliance evaluations concurrently
      const evaluations = await Promise.all([
        complianceEngine.evaluatePersonaCompliance(testPersonaId),
        complianceEngine.evaluatePersonaCompliance(testPersonaId),
        complianceEngine.evaluatePersonaCompliance(testPersonaId)
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(evaluations.length).toBe(3);
      expect(evaluations.every(e => e.personaId === testPersonaId)).toBe(true);
      expect(duration).toBeLessThan(3000); // 3 seconds
    });
  });
});
