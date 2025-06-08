import { useState, useCallback } from 'react';
import { apiClient } from '../utils/apiClient';

export interface SystemHealth {
  timestamp: Date;
  overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DOWN';
  services: ServiceHealthStatus[];
  performance: PerformanceMetrics;
  security: SecurityStatus;
  compliance: ComplianceStatus;
  recommendations: string[];
}

export interface ServiceHealthStatus {
  serviceName: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DOWN';
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
  details?: any;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  databaseConnections: number;
  activeUsers: number;
}

export interface SecurityStatus {
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  activeThreats: number;
  securityIncidents: number;
  vulnerabilities: any[];
  lastSecurityScan: Date;
}

export interface ComplianceStatus {
  overallScore: number;
  frameworkCompliance: Array<{
    framework: string;
    score: number;
    status: string;
  }>;
  criticalFindings: number;
  pendingActions: number;
}

export interface ComplianceDashboard {
  companyId: string;
  dashboardDate: Date;
  overallScore: number;
  frameworkScores: FrameworkScore[];
  riskAssessment: RiskAssessment;
  complianceMetrics: ComplianceMetrics;
  trends: ComplianceTrends;
  alerts: ComplianceAlert[];
  recommendations: ComplianceRecommendation[];
  upcomingDeadlines: ComplianceDeadline[];
}

export interface FrameworkScore {
  framework: string;
  score: number;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'UNDER_REVIEW';
  lastAssessment: Date;
  nextAssessment: Date;
  criticalFindings: number;
  totalRequirements: number;
  metRequirements: number;
}

export interface RiskAssessment {
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  riskFactors: any[];
  mitigationStrategies: string[];
  residualRisk: number;
}

export interface ComplianceMetrics {
  totalDocuments: number;
  compliantDocuments: number;
  expiredDocuments: number;
  overdueReviews: number;
  pendingApprovals: number;
  securityIncidents: number;
  auditFindings: number;
  remediationItems: number;
}

export interface ComplianceTrends {
  scoreHistory: Array<{ date: Date; score: number }>;
  incidentTrends: Array<{ date: Date; count: number }>;
  complianceGaps: Array<{ framework: string; gaps: number }>;
  improvementAreas: string[];
}

export interface ComplianceAlert {
  id: string;
  type: 'DEADLINE' | 'VIOLATION' | 'RISK' | 'AUDIT' | 'REGULATORY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  framework?: string;
  dueDate?: Date;
  assignedTo?: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: Date;
}

export interface ComplianceRecommendation {
  id: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  expectedImpact: string;
  estimatedEffort: string;
  framework?: string;
  dueDate?: Date;
  status: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
}

export interface ComplianceDeadline {
  id: string;
  type: 'REVIEW' | 'AUDIT' | 'SUBMISSION' | 'RENEWAL' | 'ASSESSMENT';
  title: string;
  description: string;
  framework: string;
  dueDate: Date;
  assignedTo: string;
  status: 'UPCOMING' | 'DUE' | 'OVERDUE' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface TestResults {
  testSuiteId: string;
  testName: string;
  description: string;
  testCases: TestCase[];
  executionTime: number;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  results: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    passRate: number;
    coverage: number;
    performanceMetrics: any;
    securityFindings: any[];
    complianceResults: any;
  };
}

export interface TestCase {
  testId: string;
  name: string;
  description: string;
  category: 'FUNCTIONAL' | 'SECURITY' | 'PERFORMANCE' | 'COMPLIANCE' | 'INTEGRATION';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  steps: any[];
  expectedResult: string;
  actualResult?: string;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  executionTime?: number;
  errorMessage?: string;
}

export interface SystemOptimization {
  optimizationType: 'PERFORMANCE' | 'SECURITY' | 'COMPLIANCE' | 'STORAGE' | 'NETWORK';
  description: string;
  currentMetric: number;
  targetMetric: number;
  implementationSteps: string[];
  estimatedImpact: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export const useSystemIntegration = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [complianceDashboard, setComplianceDashboard] = useState<ComplianceDashboard | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [optimizations, setOptimizations] = useState<SystemOptimization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // System Health Check
  const performHealthCheck = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/system/health');
      setSystemHealth(response.data.data);
      
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to perform health check';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Compliance Dashboard
  const getComplianceDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/compliance/dashboard');
      setComplianceDashboard(response.data.data);
      
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get compliance dashboard';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Execute End-to-End Tests
  const executeE2ETests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/system/tests/e2e');
      setTestResults(response.data.data);
      
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute E2E tests';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Security and Compliance Review
  const performSecurityReview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/system/security-compliance-review');
      
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to perform security review';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Performance Optimization
  const optimizePerformance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/system/optimize');
      setOptimizations(response.data.data);
      
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to optimize performance';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Validate System Integration
  const validateIntegration = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/system/integration/validate');
      
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate integration';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Link Document to Incident
  const linkDocumentToIncident = useCallback(async (
    incidentId: string,
    documentId: string,
    linkType: string,
    description?: string,
    relevanceScore?: number
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post(`/incidents/${incidentId}/documents`, {
        documentId,
        linkType,
        description,
        relevanceScore
      });
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to link document to incident';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Incident Documents
  const getIncidentDocuments = useCallback(async (incidentId: string, linkType?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (linkType) params.append('linkType', linkType);

      const response = await apiClient.get(`/incidents/${incidentId}/documents?${params}`);
      
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get incident documents';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initiate Evidence Collection
  const initiateEvidenceCollection = useCallback(async (
    incidentId: string,
    collectionPlan: any,
    assignedTo: string[],
    dueDate: Date
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post(`/incidents/${incidentId}/evidence-collection`, {
        collectionPlan,
        assignedTo,
        dueDate: dueDate.toISOString()
      });
      
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate evidence collection';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Document Audit Trail
  const getDocumentAuditTrail = useCallback(async (
    documentId: string,
    startDate?: Date,
    endDate?: Date
  ) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await apiClient.get(`/documents/${documentId}/audit?${params}`);
      
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get document audit trail';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate Regulatory Report
  const generateRegulatoryReport = useCallback(async (framework: string, reportType: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/compliance/reports/regulatory', {
        framework,
        reportType
      });
      
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate regulatory report';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Perform Risk Assessment
  const performRiskAssessment = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/compliance/risk-assessment');
      
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to perform risk assessment';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Utility Functions
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshAllData = useCallback(async () => {
    try {
      await Promise.all([
        performHealthCheck(),
        getComplianceDashboard()
      ]);
    } catch (error) {
      console.error('Failed to refresh all data:', error);
    }
  }, [performHealthCheck, getComplianceDashboard]);

  // Status Helpers
  const getOverallSystemStatus = useCallback(() => {
    if (!systemHealth || !complianceDashboard) return 'UNKNOWN';

    const healthStatus = systemHealth.overallStatus;
    const complianceScore = complianceDashboard.overallScore;

    if (healthStatus === 'DOWN' || complianceScore < 50) return 'CRITICAL';
    if (healthStatus === 'CRITICAL' || complianceScore < 70) return 'HIGH_RISK';
    if (healthStatus === 'WARNING' || complianceScore < 90) return 'MEDIUM_RISK';
    return 'HEALTHY';
  }, [systemHealth, complianceDashboard]);

  const getSystemMetrics = useCallback(() => {
    if (!systemHealth || !complianceDashboard) return null;

    return {
      healthScore: systemHealth.overallStatus === 'HEALTHY' ? 100 : 
                  systemHealth.overallStatus === 'WARNING' ? 75 :
                  systemHealth.overallStatus === 'CRITICAL' ? 25 : 0,
      complianceScore: complianceDashboard.overallScore,
      securityLevel: systemHealth.security.threatLevel,
      performanceScore: systemHealth.performance ? 
        Math.max(0, 100 - systemHealth.performance.errorRate * 10) : 0,
      riskLevel: complianceDashboard.riskAssessment.overallRiskLevel
    };
  }, [systemHealth, complianceDashboard]);

  return {
    // State
    systemHealth,
    complianceDashboard,
    testResults,
    optimizations,
    loading,
    error,

    // System Operations
    performHealthCheck,
    executeE2ETests,
    performSecurityReview,
    optimizePerformance,
    validateIntegration,

    // Compliance Operations
    getComplianceDashboard,
    generateRegulatoryReport,
    performRiskAssessment,

    // Integration Operations
    linkDocumentToIncident,
    getIncidentDocuments,
    initiateEvidenceCollection,
    getDocumentAuditTrail,

    // Utility Functions
    clearError,
    refreshAllData,

    // Status Helpers
    getOverallSystemStatus,
    getSystemMetrics
  };
};
