import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { useAuthStore } from '../store/authStore';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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
  },

  // User methods
  users: {
    getAll: (params?: any) => api.get('/users', { params }),
    getById: (id: string) => api.get(`/users/${id}`),
    create: (userData: any) => api.post('/users', userData),
    update: (id: string, userData: any) => api.put(`/users/${id}`, userData),
    delete: (id: string) => api.delete(`/users/${id}`),
  },

  // SMS Dashboard
  sms: {
    getDashboard: () => api.get('/sms/dashboard'),
    getMetrics: (params?: any) => api.get('/sms/dashboard/metrics', { params }),
  },

  // SMS Documents
  documents: {
    getAll: (params?: any) => api.get('/sms/documents', { params }),
    getById: (id: string) => api.get(`/sms/documents/${id}`),
    create: (data: any) => api.post('/sms/documents', data),
    update: (id: string, data: any) => api.put(`/sms/documents/${id}`, data),
    delete: (id: string) => api.delete(`/sms/documents/${id}`),
  },

  // SMS Workflows
  workflows: {
    getAll: (params?: any) => api.get('/sms/workflows', { params }),
    getById: (id: string) => api.get(`/sms/workflows/${id}`),
    create: (data: any) => api.post('/sms/workflows', data),
    update: (id: string, data: any) => api.put(`/sms/workflows/${id}`, data),
    delete: (id: string) => api.delete(`/sms/workflows/${id}`),
    startInstance: (id: string, data?: any) => api.post(`/sms/workflows/${id}/start`, data),
  },

  // SMS Reviews
  reviews: {
    getAll: (params?: any) => api.get('/sms/reviews', { params }),
    getById: (id: string) => api.get(`/sms/reviews/${id}`),
    create: (data: any) => api.post('/sms/reviews', data),
    update: (id: string, data: any) => api.put(`/sms/reviews/${id}`, data),
    delete: (id: string) => api.delete(`/sms/reviews/${id}`),
  },

  // SMS Incidents
  incidents: {
    getAll: (params?: any) => api.get('/sms/incidents', { params }),
    getById: (id: string) => api.get(`/sms/incidents/${id}`),
    create: (data: any) => api.post('/sms/incidents', data),
    update: (id: string, data: any) => api.put(`/sms/incidents/${id}`, data),
    delete: (id: string) => api.delete(`/sms/incidents/${id}`),
  },

  // SMS Trainings
  trainings: {
    getAll: (params?: any) => api.get('/sms/trainings', { params }),
    getById: (id: string) => api.get(`/sms/trainings/${id}`),
    create: (data: any) => api.post('/sms/trainings', data),
    update: (id: string, data: any) => api.put(`/sms/trainings/${id}`, data),
    delete: (id: string) => api.delete(`/sms/trainings/${id}`),
  },

  // SMS Risk Assessments
  riskAssessments: {
    getAll: (params?: any) => api.get('/sms/risk-assessments', { params }),
    getById: (id: string) => api.get(`/sms/risk-assessments/${id}`),
    create: (data: any) => api.post('/sms/risk-assessments', data),
    update: (id: string, data: any) => api.put(`/sms/risk-assessments/${id}`, data),
    delete: (id: string) => api.delete(`/sms/risk-assessments/${id}`),
  },

  // SMS Audits
  audits: {
    getAll: (params?: any) => api.get('/sms/audits', { params }),
  },
};

export default api;
