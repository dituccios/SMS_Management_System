import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../utils/apiClient';

export interface TrainingMetrics {
  totalPersonas: number;
  totalTrainingRecords: number;
  completionRate: number;
  complianceRate: number;
  averageCompletionTime: number;
  averageScore: number;
  overdueCount: number;
  upcomingDeadlines: number;
  certificationsIssued: number;
  completionTrend: any[];
  complianceTrend: any[];
  departmentBreakdown: any[];
  trainingBreakdown: any[];
  statusDistribution: any[];
}

export interface AnalyticsFilter {
  startDate?: Date;
  endDate?: Date;
  departments?: string[];
  positions?: string[];
  trainingIds?: string[];
  status?: string[];
}

export interface ReportOptions {
  format: 'JSON' | 'PDF' | 'EXCEL' | 'CSV';
  includeDetails?: boolean;
  groupBy?: 'DEPARTMENT' | 'POSITION' | 'TRAINING' | 'MONTH';
}

export const useTrainingAnalytics = () => {
  const [metrics, setMetrics] = useState<TrainingMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDashboardData = useCallback(async (filter?: AnalyticsFilter) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filter?.startDate) params.append('startDate', filter.startDate.toISOString());
      if (filter?.endDate) params.append('endDate', filter.endDate.toISOString());
      if (filter?.departments) {
        filter.departments.forEach(dept => params.append('departments', dept));
      }

      const response = await apiClient.get(`/persona-management/analytics/training?${params}`);
      setMetrics(response.data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const exportReport = useCallback(async (filter: AnalyticsFilter, options: ReportOptions) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/persona-management/reports/training', {
        ...filter,
        ...options
      }, {
        responseType: options.format === 'JSON' ? 'json' : 'blob'
      });

      if (options.format !== 'JSON') {
        // Handle file download
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const extension = options.format.toLowerCase();
        link.download = `training-report.${extension === 'excel' ? 'xlsx' : extension}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export report';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    await getDashboardData();
  }, [getDashboardData]);

  return {
    metrics,
    loading,
    error,
    getDashboardData,
    exportReport,
    refreshData
  };
};

export const usePersonaTraining = (personaId: string) => {
  const [trainingStatus, setTrainingStatus] = useState<any>(null);
  const [complianceStatus, setComplianceStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrainingStatus = useCallback(async () => {
    if (!personaId) return;

    try {
      setLoading(true);
      setError(null);

      const [trainingResponse, complianceResponse] = await Promise.all([
        apiClient.get(`/persona-management/profiles/${personaId}/training`),
        apiClient.get(`/persona-management/profiles/${personaId}/compliance`)
      ]);

      setTrainingStatus(trainingResponse.data.data);
      setComplianceStatus(complianceResponse.data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load training status';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [personaId]);

  const assignTraining = useCallback(async (trainingData: {
    trainingId: string;
    priority?: string;
    dueDate?: Date;
    reason?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post(
        `/persona-management/profiles/${personaId}/training`,
        trainingData
      );

      // Refresh training status after assignment
      await loadTrainingStatus();

      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign training';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [personaId, loadTrainingStatus]);

  const updateProgress = useCallback(async (trainingId: string, progressData: {
    progress?: number;
    score?: number;
    timeSpentMinutes?: number;
    notes?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.put(
        `/persona-management/profiles/${personaId}/training/${trainingId}/progress`,
        progressData
      );

      // Refresh training status after update
      await loadTrainingStatus();

      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update progress';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [personaId, loadTrainingStatus]);

  useEffect(() => {
    loadTrainingStatus();
  }, [loadTrainingStatus]);

  return {
    trainingStatus,
    complianceStatus,
    loading,
    error,
    assignTraining,
    updateProgress,
    refreshStatus: loadTrainingStatus
  };
};

export const useComplianceOverview = () => {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/persona-management/compliance/overview');
      setOverview(response.data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load compliance overview';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  return {
    overview,
    loading,
    error,
    refreshOverview: loadOverview
  };
};

export const useTrainingProgress = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bulkUpdateProgress = useCallback(async (updates: Array<{
    personaId: string;
    trainingId: string;
    progress: number;
    score?: number;
  }>) => {
    try {
      setLoading(true);
      setError(null);

      const promises = updates.map(update =>
        apiClient.put(
          `/persona-management/profiles/${update.personaId}/training/${update.trainingId}/progress`,
          {
            progress: update.progress,
            score: update.score
          }
        )
      );

      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      return { successful, failed, total: updates.length };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update progress';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const bulkAssignTraining = useCallback(async (assignments: Array<{
    personaId: string;
    trainingId: string;
    priority?: string;
    dueDate?: Date;
  }>) => {
    try {
      setLoading(true);
      setError(null);

      const promises = assignments.map(assignment =>
        apiClient.post(
          `/persona-management/profiles/${assignment.personaId}/training`,
          assignment
        )
      );

      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      return { successful, failed, total: assignments.length };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign training';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    bulkUpdateProgress,
    bulkAssignTraining
  };
};

export const useTrainingReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback(async (
    filter: AnalyticsFilter,
    options: ReportOptions
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/persona-management/reports/training', {
        ...filter,
        ...options
      }, {
        responseType: options.format === 'JSON' ? 'json' : 'blob'
      });

      if (options.format !== 'JSON') {
        // Handle file download
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const extension = options.format.toLowerCase();
        link.download = `training-report-${new Date().toISOString().split('T')[0]}.${extension === 'excel' ? 'xlsx' : extension}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate report';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleReport = useCallback(async (
    filter: AnalyticsFilter,
    options: ReportOptions & {
      schedule: 'DAILY' | 'WEEKLY' | 'MONTHLY';
      recipients: string[];
    }
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/persona-management/reports/training/schedule', {
        ...filter,
        ...options
      });

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to schedule report';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    generateReport,
    scheduleReport
  };
};
