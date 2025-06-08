import { useState, useCallback } from 'react';
import { apiClient } from '../utils/apiClient';

export interface SMSIntelligenceSystem {
  systemId: string;
  companyId: string;
  name: string;
  description: string;
  components: any[];
  integrations: any[];
  intelligence: SMSIntelligence;
  predictiveCapabilities: any[];
  automationRules: any[];
  dashboards: any[];
  alerts: any[];
  recommendations: any[];
  performance: SystemPerformance;
  configuration: any;
  status: string;
  createdAt: Date;
  lastUpdated: Date;
}

export interface SMSIntelligence {
  insights: IntelligenceInsight[];
  patterns: IntelligencePattern[];
  predictions: any[];
  anomalies: any[];
  correlations: any[];
  trends: any[];
  recommendations: any[];
}

export interface IntelligenceInsight {
  insightId: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  confidence: number;
  evidence: any[];
  impact: any;
  recommendations: string[];
  actionable: boolean;
  generatedAt: Date;
  expiresAt: Date;
}

export interface IntelligencePattern {
  patternId: string;
  name: string;
  type: string;
  description: string;
  frequency: number;
  strength: number;
  confidence: number;
  occurrences: any[];
  predictability: number;
  businessImpact: string;
}

export interface SystemPerformance {
  overallHealth: number;
  availability: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  resourceUtilization: any;
  componentHealth: any[];
  integrationHealth: any[];
  lastAssessment: Date;
}

export interface AutomationStatus {
  status: string;
  isEnabled: boolean;
  executedRules: number;
  successRate: number;
  lastExecution: Date;
}

export const useSMSIntelligence = () => {
  const [smsSystem, setSmsSystem] = useState<SMSIntelligenceSystem | null>(null);
  const [intelligence, setIntelligence] = useState<SMSIntelligence | null>(null);
  const [performance, setPerformance] = useState<SystemPerformance | null>(null);
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize SMS Intelligence System
  const initializeSystem = useCallback(async (configuration?: any) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/sms/intelligence/initialize', {
        configuration
      });

      const system = response.data.data;
      
      setSmsSystem(system);
      setIntelligence(system.intelligence);
      setPerformance(system.performance);
      setAlerts(system.alerts || []);
      setRecommendations(system.recommendations || []);

      return system;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize SMS Intelligence system';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate Intelligence
  const generateIntelligence = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!smsSystem) {
        throw new Error('SMS system not initialized');
      }

      const response = await apiClient.post(`/sms/intelligence/${smsSystem.systemId}/generate`);
      const intelligence = response.data.data;
      
      setIntelligence(intelligence);

      return intelligence;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate intelligence';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [smsSystem]);

  // Execute Automation
  const executeAutomation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!smsSystem) {
        throw new Error('SMS system not initialized');
      }

      const response = await apiClient.post(`/sms/intelligence/${smsSystem.systemId}/automation/execute`);
      const results = response.data.data;
      
      setAutomationStatus({
        status: 'ACTIVE',
        isEnabled: true,
        executedRules: results.length,
        successRate: results.filter((r: any) => r.executed).length / results.length * 100,
        lastExecution: new Date()
      });

      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute automation';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [smsSystem]);

  // Monitor System Health
  const monitorHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!smsSystem) {
        throw new Error('SMS system not initialized');
      }

      const response = await apiClient.get(`/sms/intelligence/${smsSystem.systemId}/health`);
      const performance = response.data.data;
      
      setPerformance(performance);

      return performance;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to monitor system health';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [smsSystem]);

  // Get Risk Analytics
  const getRiskAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/sms/intelligence/risk/analytics');
      const analytics = response.data.data;

      return analytics;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get risk analytics';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Training Intelligence
  const getTrainingIntelligence = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/sms/intelligence/training/analytics');
      const intelligence = response.data.data;

      return intelligence;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get training intelligence';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Compliance Forecasts
  const getComplianceForecasts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/sms/intelligence/compliance/forecasts');
      const forecasts = response.data.data;

      return forecasts;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get compliance forecasts';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Predictive Insights
  const getPredictiveInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/sms/intelligence/predictive/insights');
      const insights = response.data.data;

      return insights;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get predictive insights';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Configure Automation Rules
  const configureAutomationRules = useCallback(async (rules: any[]) => {
    try {
      setLoading(true);
      setError(null);

      if (!smsSystem) {
        throw new Error('SMS system not initialized');
      }

      const response = await apiClient.put(`/sms/intelligence/${smsSystem.systemId}/automation/rules`, {
        rules
      });

      const updatedSystem = response.data.data;
      setSmsSystem(updatedSystem);

      return updatedSystem;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to configure automation rules';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [smsSystem]);

  // Update System Configuration
  const updateSystemConfiguration = useCallback(async (configuration: any) => {
    try {
      setLoading(true);
      setError(null);

      if (!smsSystem) {
        throw new Error('SMS system not initialized');
      }

      const response = await apiClient.put(`/sms/intelligence/${smsSystem.systemId}/configuration`, {
        configuration
      });

      const updatedSystem = response.data.data;
      setSmsSystem(updatedSystem);

      return updatedSystem;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update system configuration';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [smsSystem]);

  // Generate Reports
  const generateReport = useCallback(async (reportType: string, parameters?: any) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/sms/intelligence/reports/generate', {
        reportType,
        parameters
      });

      // Handle file download
      const blob = new Blob([response.data], { 
        type: 'application/pdf'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sms-intelligence-report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate report';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh Dashboard
  const refreshDashboard = useCallback(async () => {
    try {
      await Promise.all([
        generateIntelligence(),
        monitorHealth(),
        executeAutomation()
      ]);
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    }
  }, [generateIntelligence, monitorHealth, executeAutomation]);

  // Utility Functions
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Status Helpers
  const getSystemStatus = useCallback(() => {
    if (!smsSystem) return 'NOT_INITIALIZED';
    return smsSystem.status;
  }, [smsSystem]);

  const getHealthStatus = useCallback(() => {
    if (!performance) return 'UNKNOWN';
    
    if (performance.overallHealth >= 95) return 'EXCELLENT';
    if (performance.overallHealth >= 85) return 'GOOD';
    if (performance.overallHealth >= 70) return 'FAIR';
    return 'POOR';
  }, [performance]);

  const getIntelligenceMetrics = useCallback(() => {
    if (!intelligence) return null;

    return {
      totalInsights: intelligence.insights?.length || 0,
      criticalInsights: intelligence.insights?.filter(i => i.severity === 'CRITICAL').length || 0,
      actionableInsights: intelligence.insights?.filter(i => i.actionable).length || 0,
      patternCount: intelligence.patterns?.length || 0,
      predictionCount: intelligence.predictions?.length || 0,
      anomalyCount: intelligence.anomalies?.length || 0,
      correlationCount: intelligence.correlations?.length || 0,
      trendCount: intelligence.trends?.length || 0
    };
  }, [intelligence]);

  const getAutomationMetrics = useCallback(() => {
    if (!automationStatus || !smsSystem) return null;

    return {
      isEnabled: automationStatus.isEnabled,
      status: automationStatus.status,
      totalRules: smsSystem.automationRules?.length || 0,
      activeRules: smsSystem.automationRules?.filter(r => r.isActive).length || 0,
      executedRules: automationStatus.executedRules,
      successRate: automationStatus.successRate,
      lastExecution: automationStatus.lastExecution
    };
  }, [automationStatus, smsSystem]);

  const getPerformanceMetrics = useCallback(() => {
    if (!performance) return null;

    return {
      overallHealth: performance.overallHealth,
      availability: performance.availability,
      responseTime: performance.responseTime,
      throughput: performance.throughput,
      errorRate: performance.errorRate,
      componentCount: performance.componentHealth?.length || 0,
      healthyComponents: performance.componentHealth?.filter(c => c.health > 90).length || 0,
      integrationCount: performance.integrationHealth?.length || 0,
      healthyIntegrations: performance.integrationHealth?.filter(i => i.health > 90).length || 0
    };
  }, [performance]);

  return {
    // State
    smsSystem,
    intelligence,
    performance,
    automationStatus,
    alerts,
    recommendations,
    loading,
    error,

    // System Operations
    initializeSystem,
    generateIntelligence,
    executeAutomation,
    monitorHealth,

    // Data Operations
    getRiskAnalytics,
    getTrainingIntelligence,
    getComplianceForecasts,
    getPredictiveInsights,

    // Configuration Operations
    configureAutomationRules,
    updateSystemConfiguration,

    // Reporting Operations
    generateReport,

    // Utility Functions
    refreshDashboard,
    clearError,

    // Status Helpers
    getSystemStatus,
    getHealthStatus,
    getIntelligenceMetrics,
    getAutomationMetrics,
    getPerformanceMetrics
  };
};
