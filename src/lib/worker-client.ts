/**
 * Worker API Client
 * Handles all communication with Cloudflare Workers
 */

import type {
  ApiResponse,
  PaginatedResponse,
  Source,
  Topic,
  ContentJob,
  ContentOutput,
  Publish,
  Account,
  DashboardStats,
  TopicFilters,
  OutputFilters,
  PublishFilters,
  GenerateContentRequest,
  PublishRequest,
  UpdateOutputRequest,
  UpdateGoogleTrendsConfigRequest,
} from './types';

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'https://postrella.digitexa.com';

class WorkerClient {
  private baseUrl: string;

  constructor(baseUrl: string = WORKER_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data;
  }

  // Sources
  async getSources(): Promise<ApiResponse<Source[]>> {
    return this.request('/api/sources');
  }

  // Topics
  async getTopics(filters?: TopicFilters): Promise<PaginatedResponse<Topic>> {
    const params = new URLSearchParams();
    if (filters?.source) params.set('source', filters.source);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.minScore) params.set('minScore', String(filters.minScore));
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    
    const query = params.toString();
    return this.request(`/api/topics${query ? `?${query}` : ''}`);
  }

  async getTopic(id: number): Promise<ApiResponse<Topic>> {
    return this.request(`/api/topics/${id}`);
  }

  async generateContent(
    topicId: number,
    request: GenerateContentRequest
  ): Promise<ApiResponse<{ job_id: number }>> {
    return this.request(`/api/topics/${topicId}/generate`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Jobs
  async getJob(id: number): Promise<ApiResponse<ContentJob>> {
    return this.request(`/api/jobs/${id}`);
  }

  // Outputs
  async getOutputs(filters?: OutputFilters): Promise<PaginatedResponse<ContentOutput>> {
    const params = new URLSearchParams();
    if (filters?.topicId) params.set('topicId', String(filters.topicId));
    if (filters?.target) params.set('target', filters.target);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    
    const query = params.toString();
    return this.request(`/api/outputs${query ? `?${query}` : ''}`);
  }

  async getOutput(id: number): Promise<ApiResponse<ContentOutput>> {
    return this.request(`/api/outputs/${id}`);
  }

  async updateOutput(
    id: number,
    request: UpdateOutputRequest
  ): Promise<ApiResponse<ContentOutput>> {
    return this.request(`/api/outputs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  // Publish
  async publish(request: PublishRequest): Promise<ApiResponse<Publish>> {
    return this.request('/api/publish', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getPublishes(filters?: PublishFilters): Promise<PaginatedResponse<Publish>> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.platform) params.set('platform', filters.platform);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    
    const query = params.toString();
    return this.request(`/api/publishes${query ? `?${query}` : ''}`);
  }

  // Accounts
  async getAccounts(): Promise<ApiResponse<Account[]>> {
    return this.request('/api/accounts');
  }

  async startXAuth(): Promise<ApiResponse<{ auth_url: string }>> {
    return this.request('/api/auth/x/start', { method: 'POST' });
  }

  async startRedditAuth(): Promise<ApiResponse<{ auth_url: string }>> {
    return this.request('/api/auth/reddit/start', { method: 'POST' });
  }

  async startPinterestAuth(): Promise<ApiResponse<{ auth_url: string }>> {
    return this.request('/api/auth/pinterest/start', { method: 'POST' });
  }

  // Pinterest
  async getPinterestBoards(): Promise<ApiResponse<Array<{ id: string; name: string; description?: string; privacy: string }>>> {
    return this.request('/api/pinterest/boards');
  }

  async getPinterestBoardMappings(): Promise<ApiResponse<Record<string, string>>> {
    return this.request('/api/settings/pinterest-board-mappings');
  }

  async updatePinterestBoardMappings(mappings: Record<string, string>): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/settings/pinterest-board-mappings', {
      method: 'PUT',
      body: JSON.stringify(mappings),
    });
  }

  async publishToPinterest(outputId: number, boardId?: string): Promise<ApiResponse<{ id: number; pin_id: string; url: string }>> {
    return this.request('/api/pinterest/publish', {
      method: 'POST',
      body: JSON.stringify({ output_id: outputId, board_id: boardId }),
    });
  }

  // Settings
  async updateGoogleTrendsConfig(
    config: UpdateGoogleTrendsConfigRequest
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/settings/google-trends-config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async getSettings(key: string): Promise<ApiResponse<{ value: string }>> {
    return this.request(`/api/settings/${key}`);
  }

  async updateSetting(key: string, value: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }

  // Manual Triggers
  async fetchTrends(): Promise<ApiResponse<{ pinterest_count: number; google_trends_count: number }>> {
    return this.request('/api/trends/fetch', { method: 'POST' });
  }

  async runJobs(): Promise<ApiResponse<{ processed: number; failed: number }>> {
    return this.request('/api/jobs/run', { method: 'POST' });
  }

  // Dashboard
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request('/api/dashboard/stats');
  }

  async getRecentTopics(limit: number = 10): Promise<ApiResponse<Topic[]>> {
    return this.request(`/api/topics?limit=${limit}&page=1`);
  }

  async getRecentPublishes(limit: number = 10): Promise<ApiResponse<Publish[]>> {
    return this.request(`/api/publishes?limit=${limit}&page=1`);
  }
}

export const workerClient = new WorkerClient();
export default workerClient;

