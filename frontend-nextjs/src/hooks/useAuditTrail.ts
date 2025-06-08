import { useState, useCallback } from 'react';
import { apiClient } from '../utils/apiClient';

export interface AuditEvent {
  eventId: string;
  timestamp: string;
  eventType: string;
  category: string;
  severity: string;
  action: string;
  description: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  sessionId?: string;
  companyId?: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
  outcome: string;
  errorCode?: string;
  errorMessage?: string;
  oldValues?: any;
  newValues?: any;
  changedFields?: string[];
  metadata?: any;
  tags?: string[];
  checksum: string;
  digitalSignature?: string;
  integrityVerified?: boolean;
}

export interface AuditAlert {
  id: string;
  alertId: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  status: string;
  triggerTime: string;
  resolvedAt?: string;
  companyId?: string;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  alertData?: any;
  riskScore?: number;
}

export interface AuditAnalytics {
  eventsOverTime: Array<{
    timestamp: string;
    count: number;
  }>;
  eventTypes: Array<{
    name: string;
    count: number;
  }>;
  categories: Array<{
    name: string;
    count: number;
  }>;
  severities: Array<{
    severity: string;
    count: number;
  }>;
  topUsers: Array<{
    user: string;
    count: number;
  }>;
  complianceScore?: number;
  riskScore?: number;
}

export interface SearchFilters {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: string[];
  categories?: string[];
  severities?: string[];
  userId?: string;
  resourceType?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface ExportOptions {
  format: 'JSON' | 'CSV' | 'PDF';
  startDate: Date;
  endDate: Date;
  filters?: any;
}

export const useAuditTrail = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [alerts, setAlerts] = useState<AuditAlert[]>([]);
  const [analytics, setAnalytics] = useState<AuditAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search Events
  const searchEvents = useCallback(async (filters: SearchFilters) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters.eventTypes?.length) {
        filters.eventTypes.forEach(type => params.append('eventTypes', type));
      }
      if (filters.categories?.length) {
        filters.categories.forEach(category => params.append('categories', category));
      }
      if (filters.severities?.length) {
        filters.severities.forEach(severity => params.append('severities', severity));
      }
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.resourceType) params.append('resourceType', filters.resourceType);
      if (filters.searchQuery) params.append('searchQuery', filters.searchQuery);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const response = await apiClient.get(`/audit/events?${params}`);
      
      setEvents(response.data.data.events || []);
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search audit events';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Event by ID
  const getEvent = useCallback(async (eventId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/audit/events/${eventId}`);
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get audit event';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Verify Event Integrity
  const verifyEventIntegrity = useCallback(async (eventId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post(`/audit/events/${eventId}/verify`);
      
      // Update the event in local state with verification result
      setEvents(prev => 
        prev.map(event => 
          event.eventId === eventId 
            ? { ...event, integrityVerified: response.data.data.integrityVerified }
            : event
        )
      );

      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify event integrity';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Analytics
  const getAnalytics = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());

      const response = await apiClient.get(`/audit/analytics?${params}`);
      
      setAnalytics(response.data.data);
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get audit analytics';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Alerts
  const getAlerts = useCallback(async (filters?: {
    status?: string;
    severity?: string;
    limit?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await apiClient.get(`/audit/alerts?${params}`);
      
      setAlerts(response.data.data.alerts || []);
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get audit alerts';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Export Events
  const exportEvents = useCallback(async (options: ExportOptions) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/audit/export', {
        format: options.format,
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        filters: options.filters
      }, {
        responseType: options.format === 'JSON' ? 'json' : 'blob'
      });

      // Handle file download
      if (options.format !== 'JSON') {
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const extension = options.format.toLowerCase();
        link.download = `audit-export-${new Date().toISOString().split('T')[0]}.${extension}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export audit events';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Log Custom Event (for testing/admin purposes)
  const logEvent = useCallback(async (eventData: {
    eventType: string;
    category: string;
    severity?: string;
    action: string;
    description: string;
    resourceType?: string;
    resourceId?: string;
    resourceName?: string;
    metadata?: any;
    tags?: string[];
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/audit/events', eventData);
      
      // Refresh events list
      await searchEvents({});
      
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log audit event';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [searchEvents]);

  // Get Compliance Reports
  const getComplianceReports = useCallback(async (filters?: {
    framework?: string;
    status?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.framework) params.append('framework', filters.framework);
      if (filters?.status) params.append('status', filters.status);

      const response = await apiClient.get(`/audit/compliance/reports?${params}`);
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get compliance reports';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate Compliance Report
  const generateComplianceReport = useCallback(async (options: {
    framework: string;
    startDate: Date;
    endDate: Date;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/audit/compliance/generate', {
        framework: options.framework,
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString()
      });

      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate compliance report';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time Event Streaming (WebSocket)
  const subscribeToEvents = useCallback((callback: (event: AuditEvent) => void) => {
    // This would implement WebSocket connection for real-time events
    // For now, return a mock unsubscribe function
    return () => {
      console.log('Unsubscribed from audit events');
    };
  }, []);

  // Utility Functions
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      await Promise.all([
        searchEvents({}),
        getAlerts(),
        getAnalytics(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          new Date()
        )
      ]);
    } catch (error) {
      console.error('Failed to refresh audit data:', error);
    }
  }, [searchEvents, getAlerts, getAnalytics]);

  // Event Filtering Helpers
  const filterEventsByType = useCallback((eventType: string) => {
    return events.filter(event => event.eventType === eventType);
  }, [events]);

  const filterEventsBySeverity = useCallback((severity: string) => {
    return events.filter(event => event.severity === severity);
  }, [events]);

  const filterEventsByUser = useCallback((userId: string) => {
    return events.filter(event => event.userId === userId);
  }, [events]);

  const filterEventsByDateRange = useCallback((startDate: Date, endDate: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }, [events]);

  // Statistics Helpers
  const getEventStats = useCallback(() => {
    if (!events.length) return null;

    const stats = {
      total: events.length,
      bySeverity: events.reduce((acc: any, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      }, {}),
      byType: events.reduce((acc: any, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      }, {}),
      byCategory: events.reduce((acc: any, event) => {
        acc[event.category] = (acc[event.category] || 0) + 1;
        return acc;
      }, {}),
      byOutcome: events.reduce((acc: any, event) => {
        acc[event.outcome] = (acc[event.outcome] || 0) + 1;
        return acc;
      }, {}),
      integrityVerified: events.filter(event => event.integrityVerified).length,
      integrityFailed: events.filter(event => event.integrityVerified === false).length
    };

    return stats;
  }, [events]);

  return {
    // State
    events,
    alerts,
    analytics,
    loading,
    error,

    // Event Operations
    searchEvents,
    getEvent,
    verifyEventIntegrity,
    logEvent,
    exportEvents,

    // Analytics
    getAnalytics,

    // Alerts
    getAlerts,

    // Compliance
    getComplianceReports,
    generateComplianceReport,

    // Real-time
    subscribeToEvents,

    // Utility Functions
    clearError,
    refreshData,

    // Filtering Helpers
    filterEventsByType,
    filterEventsBySeverity,
    filterEventsByUser,
    filterEventsByDateRange,

    // Statistics
    getEventStats
  };
};
