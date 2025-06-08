import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/netinfo';
import { Alert } from 'react-native';

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  constructor() {
    this.baseURL = __DEV__ 
      ? 'http://localhost:3001/api/v1' 
      : 'https://api.sms.yourdomain.com/api/v1';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        // Add auth token
        const token = await this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Check network connectivity
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          throw new Error('No internet connection');
        }

        // Add request timestamp for debugging
        config.metadata = { startTime: new Date() };

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log response time in development
        if (__DEV__ && response.config.metadata) {
          const endTime = new Date();
          const duration = endTime.getTime() - response.config.metadata.startTime.getTime();
          console.log(`API Request to ${response.config.url} took ${duration}ms`);
        }

        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle network errors
        if (!error.response) {
          Alert.alert(
            'Network Error',
            'Please check your internet connection and try again.',
            [{ text: 'OK' }]
          );
          return Promise.reject(error);
        }

        // Handle 401 errors (token refresh)
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.api(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshToken();
            this.processQueue(null, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            await this.logout();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle other errors
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any, token: string | null): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  private handleApiError(error: any): void {
    const status = error.response?.status;
    const message = error.response?.data?.message || 'An unexpected error occurred';

    switch (status) {
      case 400:
        Alert.alert('Bad Request', message);
        break;
      case 403:
        Alert.alert('Access Denied', 'You do not have permission to perform this action.');
        break;
      case 404:
        Alert.alert('Not Found', 'The requested resource was not found.');
        break;
      case 429:
        Alert.alert('Rate Limited', 'Too many requests. Please try again later.');
        break;
      case 500:
        Alert.alert('Server Error', 'Internal server error. Please try again later.');
        break;
      default:
        if (__DEV__) {
          console.error('API Error:', error);
        }
    }
  }

  // Authentication methods
  async login(email: string, password: string): Promise<AuthTokens> {
    try {
      const response = await this.api.post<ApiResponse<AuthTokens>>('/auth/login', {
        email,
        password,
      });

      const tokens = response.data.data;
      await this.storeTokens(tokens);
      return tokens;
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      await this.clearTokens();
    }
  }

  async refreshToken(): Promise<string> {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.api.post<ApiResponse<AuthTokens>>('/auth/refresh', {
        refreshToken,
      });

      const tokens = response.data.data;
      await this.storeTokens(tokens);
      return tokens.accessToken;
    } catch (error) {
      await this.clearTokens();
      throw error;
    }
  }

  // Token management
  private async storeTokens(tokens: AuthTokens): Promise<void> {
    await AsyncStorage.multiSet([
      ['accessToken', tokens.accessToken],
      ['refreshToken', tokens.refreshToken],
      ['tokenExpiresAt', tokens.expiresAt.toString()],
    ]);
  }

  private async getAccessToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const expiresAt = await AsyncStorage.getItem('tokenExpiresAt');

      if (!token || !expiresAt) {
        return null;
      }

      // Check if token is expired
      if (Date.now() >= parseInt(expiresAt)) {
        return null;
      }

      return token;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  private async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'tokenExpiresAt']);
  }

  // Generic API methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  // File upload
  async uploadFile(url: string, file: any, onProgress?: (progress: number) => void): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);

    return this.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          onProgress(progress);
        }
      },
    });
  }

  // SMS-specific API methods
  async getDashboard(): Promise<ApiResponse> {
    return this.get('/sms/dashboard');
  }

  async getDocuments(params?: any): Promise<ApiResponse> {
    return this.get('/sms/documents', { params });
  }

  async createDocument(document: any): Promise<ApiResponse> {
    return this.post('/sms/documents', document);
  }

  async updateDocument(id: string, document: any): Promise<ApiResponse> {
    return this.put(`/sms/documents/${id}`, document);
  }

  async deleteDocument(id: string): Promise<ApiResponse> {
    return this.delete(`/sms/documents/${id}`);
  }

  async getIncidents(params?: any): Promise<ApiResponse> {
    return this.get('/sms/incidents', { params });
  }

  async createIncident(incident: any): Promise<ApiResponse> {
    return this.post('/sms/incidents', incident);
  }

  async updateIncident(id: string, incident: any): Promise<ApiResponse> {
    return this.put(`/sms/incidents/${id}`, incident);
  }

  async getTrainings(params?: any): Promise<ApiResponse> {
    return this.get('/sms/trainings', { params });
  }

  async enrollInTraining(trainingId: string): Promise<ApiResponse> {
    return this.post(`/sms/trainings/${trainingId}/enroll`);
  }

  async completeTraining(trainingId: string, completion: any): Promise<ApiResponse> {
    return this.post(`/sms/trainings/${trainingId}/complete`, completion);
  }

  async getRiskAssessments(params?: any): Promise<ApiResponse> {
    return this.get('/sms/risk-assessments', { params });
  }

  async createRiskAssessment(assessment: any): Promise<ApiResponse> {
    return this.post('/sms/risk-assessments', assessment);
  }

  async getWorkflows(params?: any): Promise<ApiResponse> {
    return this.get('/sms/workflows', { params });
  }

  async getWorkflowTasks(params?: any): Promise<ApiResponse> {
    return this.get('/sms/workflows/tasks', { params });
  }

  async updateTaskStatus(taskId: string, status: string): Promise<ApiResponse> {
    return this.patch(`/sms/workflows/tasks/${taskId}`, { status });
  }

  // User profile methods
  async getProfile(): Promise<ApiResponse> {
    return this.get('/users/profile');
  }

  async updateProfile(profile: any): Promise<ApiResponse> {
    return this.put('/users/profile', profile);
  }

  async changePassword(passwords: { currentPassword: string; newPassword: string }): Promise<ApiResponse> {
    return this.post('/users/change-password', passwords);
  }

  // Utility methods
  isAuthenticated(): Promise<boolean> {
    return this.getAccessToken().then(token => !!token);
  }

  getBaseURL(): string {
    return this.baseURL;
  }
}

export default new ApiService();
