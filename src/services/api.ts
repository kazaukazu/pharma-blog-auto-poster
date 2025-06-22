import axios, { AxiosInstance, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth-token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth-token');
          localStorage.removeItem('auth-user');
          window.location.href = '/login';
          toast.error('認証が無効です。再度ログインしてください。');
        } else if (error.response?.status === 403) {
          toast.error('このアクションを実行する権限がありません。');
        } else if (error.response?.status >= 500) {
          toast.error('サーバーエラーが発生しました。後でもう一度お試しください。');
        } else if (error.message === 'Network Error') {
          toast.error('ネットワークエラーが発生しました。接続を確認してください。');
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async register(email: string, password: string, name: string) {
    const response = await this.client.post('/auth/register', { email, password, name });
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  async updateProfile(data: { name?: string; email?: string }) {
    const response = await this.client.put('/auth/profile', data);
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await this.client.put('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  }

  // Sites endpoints
  async getSites() {
    const response = await this.client.get('/sites');
    return response.data;
  }

  async getSite(id: string) {
    const response = await this.client.get(`/sites/${id}`);
    return response.data;
  }

  async createSite(data: any) {
    const response = await this.client.post('/sites', data);
    return response.data;
  }

  async updateSite(id: string, data: any) {
    const response = await this.client.put(`/sites/${id}`, data);
    return response.data;
  }

  async deleteSite(id: string) {
    const response = await this.client.delete(`/sites/${id}`);
    return response.data;
  }

  async testSiteConnection(id: string) {
    const response = await this.client.post(`/sites/${id}/test-connection`);
    return response.data;
  }

  async getSiteCategories(id: string) {
    const response = await this.client.get(`/sites/${id}/categories`);
    return response.data;
  }

  // Posts endpoints
  async getPosts(siteId: string, params?: { page?: number; limit?: number; status?: string }) {
    const response = await this.client.get(`/${siteId}/posts`, { params });
    return response.data;
  }

  async getPost(siteId: string, id: string) {
    const response = await this.client.get(`/${siteId}/posts/${id}`);
    return response.data;
  }

  async createPost(siteId: string, data: any) {
    const response = await this.client.post(`/${siteId}/posts`, data);
    return response.data;
  }

  async updatePost(siteId: string, id: string, data: any) {
    const response = await this.client.put(`/${siteId}/posts/${id}`, data);
    return response.data;
  }

  async deletePost(siteId: string, id: string) {
    const response = await this.client.delete(`/${siteId}/posts/${id}`);
    return response.data;
  }

  async publishPost(siteId: string, id: string) {
    const response = await this.client.post(`/${siteId}/posts/${id}/publish`);
    return response.data;
  }

  async schedulePost(siteId: string, id: string, scheduledAt: string) {
    const response = await this.client.post(`/${siteId}/posts/${id}/schedule`, {
      scheduled_at: scheduledAt,
    });
    return response.data;
  }

  async retryPost(siteId: string, id: string) {
    const response = await this.client.post(`/${siteId}/posts/${id}/retry`);
    return response.data;
  }

  async getPostStats(siteId: string) {
    const response = await this.client.get(`/${siteId}/posts/stats`);
    return response.data;
  }

  // Claude endpoints
  async generateArticle(siteId: string, requestData: any, createPost: boolean = true) {
    const response = await this.client.post(`/claude/${siteId}/generate`, {
      request_data: requestData,
      create_post: createPost,
    });
    return response.data;
  }

  async getClaudeRequests(siteId: string, params?: { page?: number; limit?: number }) {
    const response = await this.client.get(`/claude/${siteId}/requests`, { params });
    return response.data;
  }

  async getClaudeRequest(siteId: string, id: string) {
    const response = await this.client.get(`/claude/${siteId}/requests/${id}`);
    return response.data;
  }

  async retryClaudeRequest(siteId: string, id: string) {
    const response = await this.client.post(`/claude/${siteId}/requests/${id}/retry`);
    return response.data;
  }

  async deleteClaudeRequest(siteId: string, id: string) {
    const response = await this.client.delete(`/claude/${siteId}/requests/${id}`);
    return response.data;
  }

  async getClaudeStats(siteId: string) {
    const response = await this.client.get(`/claude/${siteId}/stats`);
    return response.data;
  }

  async testClaudeConnection() {
    const response = await this.client.get('/claude/test-connection');
    return response.data;
  }

  // Schedule endpoints
  async getSchedules(siteId: string) {
    const response = await this.client.get(`/${siteId}/schedules`);
    return response.data;
  }

  async getSchedule(siteId: string, id: string) {
    const response = await this.client.get(`/${siteId}/schedules/${id}`);
    return response.data;
  }

  async createSchedule(siteId: string, data: any) {
    const response = await this.client.post(`/${siteId}/schedules`, data);
    return response.data;
  }

  async updateSchedule(siteId: string, id: string, data: any) {
    const response = await this.client.put(`/${siteId}/schedules/${id}`, data);
    return response.data;
  }

  async deleteSchedule(siteId: string, id: string) {
    const response = await this.client.delete(`/${siteId}/schedules/${id}`);
    return response.data;
  }

  async toggleSchedule(siteId: string, id: string, isActive: boolean) {
    const response = await this.client.post(`/${siteId}/schedules/${id}/toggle`, {
      is_active: isActive,
    });
    return response.data;
  }

  async testSchedule(cronExpression: string) {
    const response = await this.client.post('/test-schedule', {
      cron_expression: cronExpression,
    });
    return response.data;
  }

  async getMonthlyLimit(siteId: string) {
    const response = await this.client.get(`/${siteId}/monthly-limit`);
    return response.data;
  }

  async getUpcomingSchedules() {
    const response = await this.client.get('/upcoming');
    return response.data;
  }

  // Analytics endpoints
  async getAnalytics(siteId: string, params?: { period?: string; timezone?: string }) {
    const response = await this.client.get(`/sites/${siteId}/analytics`, { params });
    return response.data;
  }

  async getSiteStats(siteId: string) {
    const response = await this.client.get(`/sites/${siteId}/stats`);
    return response.data;
  }

  async getDashboardAnalytics() {
    const response = await this.client.get('/analytics/dashboard');
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;