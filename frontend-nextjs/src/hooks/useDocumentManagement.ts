import { useState, useCallback } from 'react';
import { apiClient } from '../utils/apiClient';

export interface Document {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    path: string;
  };
  typeId: string;
  type: {
    id: string;
    name: string;
    description?: string;
  };
  securityLevel: string;
  tags: string[];
  status: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  expiresAt?: string;
  reviewDueAt?: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  path: string;
  parentId?: string;
  children?: DocumentCategory[];
  documentCount?: number;
}

export interface DocumentType {
  id: string;
  name: string;
  description?: string;
  fileExtensions: string[];
  maxFileSize?: number;
  requiresApproval: boolean;
  documentCount?: number;
}

export interface SearchFilters {
  query?: string;
  categoryId?: string;
  typeId?: string;
  securityLevel?: string[];
  tags?: string[];
  status?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface SearchResult {
  documents: Document[];
  total: number;
  facets: any;
  suggestions: string[];
  searchTime: number;
}

export const useDocumentManagement = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Document Operations
  const getDocuments = useCallback(async (limit = 50, offset = 0) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/documents', {
        params: { limit, offset }
      });

      setDocuments(response.data.data.documents || []);
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load documents';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDocument = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/documents/${id}`);
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load document';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadDocument = useCallback(async (formData: FormData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDocument = useCallback(async (id: string, updates: Partial<Document>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.put(`/documents/${id}`, updates);
      
      // Update local state
      setDocuments(prev => 
        prev.map(doc => doc.id === id ? { ...doc, ...response.data.data } : doc)
      );

      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update document';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDocument = useCallback(async (id: string, reason?: string) => {
    try {
      setLoading(true);
      setError(null);

      await apiClient.delete(`/documents/${id}`, {
        data: { reason }
      });

      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete document';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadDocument = useCallback(async (id: string, fileName?: string) => {
    try {
      const response = await apiClient.get(`/documents/${id}/download`, {
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download document';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Search Operations
  const searchDocuments = useCallback(async (filters: SearchFilters) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.query) params.append('q', filters.query);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.typeId) params.append('typeId', filters.typeId);
      if (filters.securityLevel?.length) {
        filters.securityLevel.forEach(level => params.append('securityLevel', level));
      }
      if (filters.tags?.length) {
        filters.tags.forEach(tag => params.append('tags', tag));
      }
      if (filters.status?.length) {
        filters.status.forEach(status => params.append('status', status));
      }

      const response = await apiClient.get(`/documents/search?${params}`);
      
      setDocuments(response.data.data.documents || []);
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search documents';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Category Operations
  const getCategories = useCallback(async () => {
    try {
      const response = await apiClient.get('/documents/categories');
      setCategories(response.data.data || []);
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load categories';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const createCategory = useCallback(async (categoryData: {
    name: string;
    description?: string;
    parentId?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/documents/categories', categoryData);
      
      // Refresh categories
      await getCategories();
      
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create category';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getCategories]);

  // Document Type Operations
  const getDocumentTypes = useCallback(async () => {
    try {
      const response = await apiClient.get('/documents/types');
      setDocumentTypes(response.data.data || []);
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load document types';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const createDocumentType = useCallback(async (typeData: {
    name: string;
    description?: string;
    fileExtensions: string[];
    maxFileSize?: number;
    requiresApproval?: boolean;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/documents/types', typeData);
      
      // Refresh document types
      await getDocumentTypes();
      
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create document type';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getDocumentTypes]);

  // Workflow Operations
  const approveDocument = useCallback(async (id: string, comments?: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post(`/documents/${id}/approve`, { comments });
      
      // Update local state
      setDocuments(prev => 
        prev.map(doc => doc.id === id ? { ...doc, status: 'APPROVED' } : doc)
      );

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve document';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const rejectDocument = useCallback(async (id: string, comments?: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post(`/documents/${id}/reject`, { comments });
      
      // Update local state
      setDocuments(prev => 
        prev.map(doc => doc.id === id ? { ...doc, status: 'DRAFT' } : doc)
      );

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject document';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Compliance Operations
  const getComplianceReport = useCallback(async (dateRange?: { start: Date; end: Date }) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateRange?.start) params.append('startDate', dateRange.start.toISOString());
      if (dateRange?.end) params.append('endDate', dateRange.end.toISOString());

      const response = await apiClient.get(`/documents/compliance/report?${params}`);
      return response.data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate compliance report';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Utility Functions
  const refreshDocuments = useCallback(() => {
    return getDocuments();
  }, [getDocuments]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    documents,
    categories,
    documentTypes,
    loading,
    error,

    // Document Operations
    getDocuments,
    getDocument,
    uploadDocument,
    updateDocument,
    deleteDocument,
    downloadDocument,
    searchDocuments,

    // Category Operations
    getCategories,
    createCategory,

    // Document Type Operations
    getDocumentTypes,
    createDocumentType,

    // Workflow Operations
    approveDocument,
    rejectDocument,

    // Compliance Operations
    getComplianceReport,

    // Utility Functions
    refreshDocuments,
    clearError
  };
};
