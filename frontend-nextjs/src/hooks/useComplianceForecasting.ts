import { useState, useCallback } from 'react';
import { apiClient } from '../utils/apiClient';

export interface ComplianceForecast {
  forecastId: string;
  companyId: string;
  framework: string;
  metric: string;
  forecastDate: Date;
  forecastHorizon: number;
  model: any;
  predictions: ForecastPrediction[];
  confidence: any;
  accuracy: any;
  scenarios: ForecastScenario[];
  assumptions: string[];
  limitations: string[];
}

export interface ForecastPrediction {
  date: Date;
  predictedValue: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  factors: any[];
  volatility: number;
}

export interface ForecastScenario {
  scenarioId: string;
  name: string;
  description: string;
  probability: number;
  assumptions: any[];
  predictions: ForecastPrediction[];
  impact: any;
  mitigations: string[];
}

export interface WhatIfAnalysis {
  analysisId: string;
  baseScenario: ForecastScenario;
  alternativeScenarios: ForecastScenario[];
  variables: any[];
  results: any[];
  sensitivity: any;
  recommendations: any[];
}

export interface ForecastAccuracy {
  overallAccuracy: number;
  shortTermAccuracy: number;
  mediumTermAccuracy: number;
  longTermAccuracy: number;
  trendAccuracy: number;
  levelAccuracy: number;
  historicalPerformance: any[];
}

export interface Intervention {
  id: string;
  name: string;
  type: string;
  startDate: Date;
  expectedImpact: number;
  progress: number;
  status: string;
  description: string;
}

export const useComplianceForecasting = () => {
  const [forecasts, setForecasts] = useState<ComplianceForecast[]>([]);
  const [currentForecast, setCurrentForecast] = useState<ComplianceForecast | null>(null);
  const [scenarios, setScenarios] = useState<ForecastScenario[]>([]);
  const [whatIfAnalysis, setWhatIfAnalysis] = useState<WhatIfAnalysis | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [accuracyMetrics, setAccuracyMetrics] = useState<ForecastAccuracy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Time Series Forecast
  const createTimeSeriesForecast = useCallback(async (
    framework: string,
    metric: string,
    horizon: number,
    modelType: string = 'ARIMA'
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/compliance/forecasts/time-series', {
        framework,
        metric,
        horizon,
        modelType
      });

      const forecast = response.data.data;
      
      setCurrentForecast(forecast);
      setForecasts(prev => [forecast, ...prev.filter(f => f.forecastId !== forecast.forecastId)]);

      return forecast;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create time series forecast';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create Scenario Forecast
  const createScenarioForecast = useCallback(async (
    framework: string,
    metric: string,
    scenarioSpecs: any[]
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/compliance/forecasts/scenarios', {
        framework,
        metric,
        scenarios: scenarioSpecs
      });

      const forecast = response.data.data;
      
      setCurrentForecast(forecast);
      setScenarios(forecast.scenarios || []);
      setForecasts(prev => [forecast, ...prev.filter(f => f.forecastId !== forecast.forecastId)]);

      return forecast;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create scenario forecast';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Perform What-If Analysis
  const performWhatIfAnalysis = useCallback(async (
    framework: string,
    metric: string,
    variables: any[]
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/compliance/forecasts/what-if', {
        framework,
        metric,
        variables
      });

      const analysis = response.data.data;
      
      setWhatIfAnalysis(analysis);

      return analysis;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to perform what-if analysis';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate Confidence Intervals
  const calculateConfidenceIntervals = useCallback(async (
    forecastId: string,
    level: number = 0.95,
    method: string = 'BOOTSTRAP'
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post(`/compliance/forecasts/${forecastId}/confidence`, {
        level,
        method
      });

      const confidence = response.data.data;

      // Update current forecast with new confidence intervals
      if (currentForecast && currentForecast.forecastId === forecastId) {
        setCurrentForecast(prev => prev ? { ...prev, confidence } : null);
      }

      return confidence;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate confidence intervals';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentForecast]);

  // Get Forecasts
  const getForecasts = useCallback(async (framework?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = framework ? `?framework=${framework}` : '';
      const response = await apiClient.get(`/compliance/forecasts${params}`);
      const forecastList = response.data.data;
      
      setForecasts(forecastList);
      
      if (forecastList.length > 0) {
        const latest = forecastList[0];
        setCurrentForecast(latest);
        setScenarios(latest.scenarios || []);
      }

      return forecastList;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get forecasts';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Forecast Accuracy
  const getForecastAccuracy = useCallback(async (framework?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = framework ? `?framework=${framework}` : '';
      const response = await apiClient.get(`/compliance/forecasts/accuracy${params}`);
      const accuracy = response.data.data;
      
      setAccuracyMetrics(accuracy);

      return accuracy;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get forecast accuracy';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Plan Intervention
  const planIntervention = useCallback(async (interventionData: {
    name: string;
    type: string;
    expectedImpact: number;
    description: string;
    startDate?: Date;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/compliance/interventions', {
        ...interventionData,
        startDate: interventionData.startDate || new Date()
      });

      const intervention = response.data.data;
      
      setInterventions(prev => [intervention, ...prev]);

      return intervention;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to plan intervention';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Interventions
  const getInterventions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/compliance/interventions');
      const interventionList = response.data.data;
      
      setInterventions(interventionList);

      return interventionList;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get interventions';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update Intervention Progress
  const updateInterventionProgress = useCallback(async (
    interventionId: string,
    progress: number,
    status?: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.put(`/compliance/interventions/${interventionId}`, {
        progress,
        status
      });

      const updatedIntervention = response.data.data;

      // Update local state
      setInterventions(prev => 
        prev.map(intervention => 
          intervention.id === interventionId 
            ? { ...intervention, progress, status: status || intervention.status }
            : intervention
        )
      );

      return updatedIntervention;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update intervention progress';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate Forecast Report
  const generateForecastReport = useCallback(async (
    forecastId: string,
    format: string = 'PDF'
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post(`/compliance/forecasts/${forecastId}/report`, {
        format
      });

      // Handle file download
      const blob = new Blob([response.data], { 
        type: format === 'PDF' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compliance-forecast-${forecastId}-${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate forecast report';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Validate Forecast Model
  const validateForecastModel = useCallback(async (
    forecastId: string,
    validationMethod: string = 'CROSS_VALIDATION'
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post(`/compliance/forecasts/${forecastId}/validate`, {
        method: validationMethod
      });

      const validation = response.data.data;

      return validation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate forecast model';
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

  const refreshAllData = useCallback(async (framework?: string) => {
    try {
      await Promise.all([
        getForecasts(framework),
        getForecastAccuracy(framework),
        getInterventions()
      ]);
    } catch (error) {
      console.error('Failed to refresh all forecasting data:', error);
    }
  }, [getForecasts, getForecastAccuracy, getInterventions]);

  // Status Helpers
  const getForecastStatus = useCallback(() => {
    if (!currentForecast) return 'NO_FORECAST';
    
    const now = new Date();
    const forecastAge = now.getTime() - currentForecast.forecastDate.getTime();
    const daysSinceForecast = Math.floor(forecastAge / (1000 * 60 * 60 * 24));
    
    if (daysSinceForecast > 7) return 'OUTDATED';
    if (currentForecast.accuracy?.overallAccuracy < 70) return 'LOW_ACCURACY';
    if (currentForecast.confidence?.level < 0.8) return 'LOW_CONFIDENCE';
    
    return 'GOOD';
  }, [currentForecast]);

  const getForecastMetrics = useCallback(() => {
    if (!currentForecast) return null;

    const nextPrediction = currentForecast.predictions?.[0];
    const lastPrediction = currentForecast.predictions?.[currentForecast.predictions.length - 1];

    return {
      nextValue: nextPrediction?.predictedValue,
      finalValue: lastPrediction?.predictedValue,
      trend: nextPrediction && lastPrediction ? 
        (lastPrediction.predictedValue > nextPrediction.predictedValue ? 'IMPROVING' : 'DECLINING') : 'STABLE',
      confidence: currentForecast.confidence?.level,
      accuracy: currentForecast.accuracy?.overallAccuracy,
      horizon: currentForecast.forecastHorizon,
      scenarioCount: currentForecast.scenarios?.length || 0
    };
  }, [currentForecast]);

  const getInterventionStats = useCallback(() => {
    if (!interventions || interventions.length === 0) return null;

    return {
      total: interventions.length,
      active: interventions.filter(i => i.status === 'In Progress').length,
      completed: interventions.filter(i => i.status === 'Completed').length,
      totalExpectedImpact: interventions.reduce((sum, i) => sum + i.expectedImpact, 0),
      averageProgress: interventions.reduce((sum, i) => sum + i.progress, 0) / interventions.length
    };
  }, [interventions]);

  return {
    // State
    forecasts,
    currentForecast,
    scenarios,
    whatIfAnalysis,
    interventions,
    accuracyMetrics,
    loading,
    error,

    // Forecast Operations
    createTimeSeriesForecast,
    createScenarioForecast,
    performWhatIfAnalysis,
    calculateConfidenceIntervals,

    // Data Operations
    getForecasts,
    getForecastAccuracy,

    // Intervention Operations
    planIntervention,
    getInterventions,
    updateInterventionProgress,

    // Reporting Operations
    generateForecastReport,
    validateForecastModel,

    // Utility Functions
    clearError,
    refreshAllData,

    // Status Helpers
    getForecastStatus,
    getForecastMetrics,
    getInterventionStats
  };
};
