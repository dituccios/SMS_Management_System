import { useState, useCallback } from 'react';
import { apiClient } from '../utils/apiClient';

export interface RiskAssessment {
  id: string;
  companyId: string;
  assessmentType: 'COMPREHENSIVE' | 'TARGETED' | 'CONTINUOUS' | 'INCIDENT_TRIGGERED' | 'COMPLIANCE_DRIVEN';
  scope: any;
  methodology: any;
  executedAt: Date;
  executedBy: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  results?: AssessmentResults;
  recommendations?: RiskRecommendation[];
  nextAssessmentDate?: Date;
}

export interface AssessmentResults {
  overallRiskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidenceScore: number;
  categoryScores: CategoryRiskScore[];
  factorScores: FactorRiskScore[];
  trends: RiskTrend[];
  correlations: RiskCorrelation[];
  scenarios: RiskScenario[];
  heatmap: any;
}

export interface CategoryRiskScore {
  categoryId: string;
  categoryName: string;
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  contributingFactors: string[];
  trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';
  lastAssessment?: Date;
  changeFromLast?: number;
}

export interface FactorRiskScore {
  factorId: string;
  factorName: string;
  score: number;
  normalizedScore: number;
  weight: number;
  dataQuality: number;
  lastUpdated: Date;
  source: string;
  trend: any;
}

export interface RiskTrend {
  metric: string;
  timeframe: string;
  direction: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';
  magnitude: number;
  confidence: number;
  dataPoints: Array<{ date: Date; value: number }>;
  forecast?: Array<{ date: Date; predicted: number; confidence: number }>;
}

export interface RiskCorrelation {
  factor1: string;
  factor2: string;
  correlationCoefficient: number;
  significance: number;
  type: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
}

export interface RiskScenario {
  id: string;
  name: string;
  description: string;
  probability: number;
  impact: number;
  riskScore: number;
  factors: string[];
  mitigationStrategies: string[];
  timeframe: string;
}

export interface RiskRecommendation {
  id: string;
  type: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM' | 'STRATEGIC';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  title: string;
  description: string;
  rationale: string;
  expectedImpact: string;
  estimatedCost: number;
  timeframe: string;
  assignedTo?: string;
  status: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  relatedFactors: string[];
}

export interface RiskCategory {
  id: string;
  name: string;
  description: string;
  weight: number;
  parentCategoryId?: string;
  subcategories?: RiskCategory[];
  factors: any[];
  scoringMethod: string;
  thresholds: any[];
  isActive: boolean;
}

export const useRiskManagement = () => {
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<RiskAssessment | null>(null);
  const [riskCategories, setRiskCategories] = useState<RiskCategory[]>([]);
  const [riskTrends, setRiskTrends] = useState<RiskTrend[]>([]);
  const [riskCorrelations, setRiskCorrelations] = useState<RiskCorrelation[]>([]);
  const [riskScenarios, setRiskScenarios] = useState<RiskScenario[]>([]);
  const [recommendations, setRecommendations] = useState<RiskRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Execute Risk Assessment
  const executeRiskAssessment = useCallback(async (assessmentData: {
    assessmentType: string;
    scope: any;
    methodology: any;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/risk/assessments', assessmentData);
      const assessmentId = response.data.data.assessmentId;

      // Poll for assessment completion
      const pollAssessment = async () => {
        try {
          const statusResponse = await apiClient.get(`/risk/assessments/${assessmentId}`);
          const assessment = statusResponse.data.data;

          if (assessment.status === 'COMPLETED') {
            setCurrentAssessment(assessment);
            setRiskAssessments(prev => [assessment, ...prev.filter(a => a.id !== assessmentId)]);
            
            if (assessment.results) {
              setRiskTrends(assessment.results.trends || []);
              setRiskCorrelations(assessment.results.correlations || []);
              setRiskScenarios(assessment.results.scenarios || []);
            }
            
            if (assessment.recommendations) {
              setRecommendations(assessment.recommendations);
            }
          } else if (assessment.status === 'FAILED') {
            setError('Risk assessment failed');
          } else {
            // Continue polling
            setTimeout(pollAssessment, 5000);
          }
        } catch (error) {
          console.error('Failed to poll assessment status:', error);
        }
      };

      // Start polling
      setTimeout(pollAssessment, 2000);

      return assessmentId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute risk assessment';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Risk Assessments
  const getRiskAssessments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/risk/assessments');
      const assessments = response.data.data;
      
      setRiskAssessments(assessments);
      
      if (assessments.length > 0) {
        const latest = assessments[0];
        setCurrentAssessment(latest);
        
        if (latest.results) {
          setRiskTrends(latest.results.trends || []);
          setRiskCorrelations(latest.results.correlations || []);
          setRiskScenarios(latest.results.scenarios || []);
        }
        
        if (latest.recommendations) {
          setRecommendations(latest.recommendations);
        }
      }
      
      return assessments;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get risk assessments';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Risk Categories
  const getRiskCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/risk/categories');
      const categories = response.data.data;
      
      setRiskCategories(categories);
      
      return categories;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get risk categories';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create Risk Category
  const createRiskCategory = useCallback(async (categoryData: any) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/risk/categories', categoryData);
      const categoryId = response.data.data.categoryId;

      // Refresh categories
      await getRiskCategories();

      return categoryId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create risk category';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getRiskCategories]);

  // Get Risk Trends
  const getRiskTrends = useCallback(async (timeframe?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = timeframe ? `?timeframe=${timeframe}` : '';
      const response = await apiClient.get(`/risk/trends${params}`);
      const trends = response.data.data;
      
      setRiskTrends(trends);
      
      return trends;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get risk trends';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Risk Correlations
  const getRiskCorrelations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/risk/correlations');
      const correlations = response.data.data;
      
      setRiskCorrelations(correlations);
      
      return correlations;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get risk correlations';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate Risk Report
  const generateRiskReport = useCallback(async (reportType: string, format: string = 'PDF') => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/risk/reports', {
        reportType,
        format,
        assessmentId: currentAssessment?.id
      });

      // Handle file download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `risk-report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate risk report';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentAssessment]);

  // Update Risk Mitigation
  const updateRiskMitigation = useCallback(async (recommendationId: string, updates: any) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.put(`/risk/recommendations/${recommendationId}`, updates);

      // Update local state
      setRecommendations(prev => 
        prev.map(rec => 
          rec.id === recommendationId 
            ? { ...rec, ...updates }
            : rec
        )
      );

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update risk mitigation';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create Data Collector
  const createDataCollector = useCallback(async (collectorData: any) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/risk/data-collectors', collectorData);
      const collectorId = response.data.data.collectorId;

      return collectorId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create data collector';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Run Data Collector
  const runDataCollector = useCallback(async (collectorId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post(`/risk/data-collectors/${collectorId}/run`);
      
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run data collector';
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
        getRiskAssessments(),
        getRiskCategories(),
        getRiskTrends(),
        getRiskCorrelations()
      ]);
    } catch (error) {
      console.error('Failed to refresh all risk data:', error);
    }
  }, [getRiskAssessments, getRiskCategories, getRiskTrends, getRiskCorrelations]);

  // Status Helpers
  const getOverallRiskStatus = useCallback(() => {
    if (!currentAssessment?.results) return 'UNKNOWN';
    return currentAssessment.results.riskLevel;
  }, [currentAssessment]);

  const getRiskMetrics = useCallback(() => {
    if (!currentAssessment?.results) return null;

    const results = currentAssessment.results;
    return {
      overallScore: results.overallRiskScore,
      confidenceScore: results.confidenceScore,
      categoryCount: results.categoryScores.length,
      highRiskCategories: results.categoryScores.filter(c => c.level === 'HIGH' || c.level === 'CRITICAL').length,
      trendDirection: results.trends.length > 0 ? results.trends[0].direction : 'STABLE',
      lastAssessment: currentAssessment.executedAt
    };
  }, [currentAssessment]);

  return {
    // State
    riskAssessments,
    currentAssessment,
    riskCategories,
    riskTrends,
    riskCorrelations,
    riskScenarios,
    recommendations,
    loading,
    error,

    // Risk Assessment Operations
    executeRiskAssessment,
    getRiskAssessments,

    // Risk Category Operations
    getRiskCategories,
    createRiskCategory,

    // Risk Analysis Operations
    getRiskTrends,
    getRiskCorrelations,

    // Risk Reporting
    generateRiskReport,

    // Risk Mitigation
    updateRiskMitigation,

    // Data Collection
    createDataCollector,
    runDataCollector,

    // Utility Functions
    clearError,
    refreshAllData,

    // Status Helpers
    getOverallRiskStatus,
    getRiskMetrics
  };
};
