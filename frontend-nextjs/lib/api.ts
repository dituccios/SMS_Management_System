import axios, { AxiosError, AxiosResponse } from 'axios';
import { getSession } from 'next-auth/react';

// Create axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const session = await getSession();
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      window.location.href = '/auth/signin';
    }
    return Promise.reject(error);
  }
);

// SWR fetcher function
export const fetcher = async (url: string) => {
  const response = await api.get(url);
  return response.data;
};

// API service methods
export const apiService = {
  // Generic methods
  get: (url: string, config?: any) => api.get(url, config),
  post: (url: string, data?: any, config?: any) => api.post(url, data, config),
  put: (url: string, data?: any, config?: any) => api.put(url, data, config),
  patch: (url: string, data?: any, config?: any) => api.patch(url, data, config),
  delete: (url: string, config?: any) => api.delete(url, config),

  // Auth methods
  auth: {
    login: (email: string, password: string) =>
      api.post('/auth/login', { email, password }),
    register: (userData: any) =>
      api.post('/auth/register', userData),
    logout: () =>
      api.post('/auth/logout'),
    getProfile: () =>
      api.get('/auth/profile'),
    refreshToken: () =>
      api.post('/auth/refresh'),
  },

  // Subscription methods
  subscription: {
    get: () => api.get('/subscription'),
    create: (data: any) => api.post('/subscription', data),
    update: (data: any) => api.put('/subscription', data),
    cancel: (data?: any) => api.delete('/subscription', { data }),
    getUsage: () => api.get('/subscription/usage'),
    getInvoices: () => api.get('/subscription/invoices'),
    getPayments: () => api.get('/subscription/payments'),
    requestRefund: (data: any) => api.post('/subscription/refunds', data),
  },

  // Payment methods
  paymentMethods: {
    getAll: () => api.get('/subscription/payment-methods'),
    create: (data: any) => api.post('/subscription/payment-methods', data),
    delete: (id: string) => api.delete(`/subscription/payment-methods/${id}`),
    setDefault: (id: string) => api.patch(`/subscription/payment-methods/${id}/default`),
  },

  // SMS modules
  sms: {
    getDashboard: () => api.get('/sms/dashboard'),
    getMetrics: (params?: any) => api.get('/sms/dashboard/metrics', { params }),
  },

  // Documents
  documents: {
    getAll: (params?: any) => api.get('/sms/documents', { params }),
    getById: (id: string) => api.get(`/sms/documents/${id}`),
    create: (data: any) => api.post('/sms/documents', data),
    update: (id: string, data: any) => api.put(`/sms/documents/${id}`, data),
    delete: (id: string) => api.delete(`/sms/documents/${id}`),
    upload: (file: File, documentId?: string) => {
      const formData = new FormData();
      formData.append('file', file);
      if (documentId) formData.append('documentId', documentId);
      return api.post('/sms/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
  },

  // Workflows
  workflows: {
    getAll: (params?: any) => api.get('/sms/workflows', { params }),
    getById: (id: string) => api.get(`/sms/workflows/${id}`),
    create: (data: any) => api.post('/sms/workflows', data),
    update: (id: string, data: any) => api.put(`/sms/workflows/${id}`, data),
    delete: (id: string) => api.delete(`/sms/workflows/${id}`),
    startInstance: (id: string, data?: any) => api.post(`/sms/workflows/${id}/start`, data),
  },

  // Incidents
  incidents: {
    getAll: (params?: any) => api.get('/sms/incidents', { params }),
    getById: (id: string) => api.get(`/sms/incidents/${id}`),
    create: (data: any) => api.post('/sms/incidents', data),
    update: (id: string, data: any) => api.put(`/sms/incidents/${id}`, data),
    delete: (id: string) => api.delete(`/sms/incidents/${id}`),
  },

  // Training
  trainings: {
    getAll: (params?: any) => api.get('/sms/trainings', { params }),
    getById: (id: string) => api.get(`/sms/trainings/${id}`),
    create: (data: any) => api.post('/sms/trainings', data),
    update: (id: string, data: any) => api.put(`/sms/trainings/${id}`, data),
    delete: (id: string) => api.delete(`/sms/trainings/${id}`),
  },

  // Risk Assessments
  riskAssessments: {
    getAll: (params?: any) => api.get('/sms/risk-assessments', { params }),
    getById: (id: string) => api.get(`/sms/risk-assessments/${id}`),
    create: (data: any) => api.post('/sms/risk-assessments', data),
    update: (id: string, data: any) => api.put(`/sms/risk-assessments/${id}`, data),
    delete: (id: string) => api.delete(`/sms/risk-assessments/${id}`),
  },

  // Reviews
  reviews: {
    getAll: (params?: any) => api.get('/sms/reviews', { params }),
    getById: (id: string) => api.get(`/sms/reviews/${id}`),
    create: (data: any) => api.post('/sms/reviews', data),
    update: (id: string, data: any) => api.put(`/sms/reviews/${id}`, data),
    delete: (id: string) => api.delete(`/sms/reviews/${id}`),
  },

  // Audit logs
  audits: {
    getAll: (params?: any) => api.get('/sms/audits', { params }),
  },

  // Users
  users: {
    getAll: (params?: any) => api.get('/users', { params }),
    getById: (id: string) => api.get(`/users/${id}`),
    create: (data: any) => api.post('/users', data),
    update: (id: string, data: any) => api.put(`/users/${id}`, data),
    delete: (id: string) => api.delete(`/users/${id}`),
  },

  // Download and installation
  download: {
    getInstaller: (platform: string) => api.get(`/download/installer/${platform}`, {
      responseType: 'blob',
    }),
    getLicense: () => api.get('/download/license'),
    getInstallationGuide: () => api.get('/download/guide'),
    trackDownload: (data: any) => api.post('/download/track', data),
  },
};

// Error handling utility
export const handleApiError = (error: AxiosError) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please log in.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'Conflict. The resource already exists.';
      case 422:
        return 'Validation failed. Please check your input.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Internal server error. Please try again later.';
      default:
        return (data as any)?.message || 'An unexpected error occurred.';
    }
  } else if (error.request) {
    // Network error
    return 'Network error. Please check your connection.';
  } else {
    // Other error
    return error.message || 'An unexpected error occurred.';
  }
};

export default api;
