import apiClient from './client';

export interface AppStatEntry {
  id: number;
  app_name: string;
  category: string;
  icon: string;
  total_queries: number;
  unique_clients: number;
  blocked_queries: number;
  last_seen: string | null;
}

export interface AppTrendEntry {
  hour: string;
  total_queries: number;
}

export interface AppCatalogEntry {
  id: number;
  app_name: string;
  category: string;
  icon: string;
  vendor: string | null;
  homepage: string | null;
}

export interface DomainStatEntry {
  domain: string;
  total_queries: number;
  unique_clients: number;
  blocked_queries: number;
  block_rate: number;
  last_seen: string | null;
}

export const insightsApi = {
  async getTopApps(params: {
    hours?: number;
    limit?: number;
    category?: string;
    status?: string;
  }): Promise<AppStatEntry[]> {
    const searchParams = new URLSearchParams();
    if (params.hours !== undefined) searchParams.set('hours', String(params.hours));
    if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params.category) searchParams.set('category', params.category);
    if (params.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    const response = await apiClient.get<AppStatEntry[]>(
      `/api/v1/insights/apps/top${qs ? `?${qs}` : ''}`
    );
    return response.data;
  },

  async getAppTrend(appId: number, hours: number): Promise<AppTrendEntry[]> {
    const response = await apiClient.get<AppTrendEntry[]>(
      `/api/v1/insights/apps/trend?app_id=${appId}&hours=${hours}`
    );
    return response.data;
  },

  async getTopDomains(params: {
    hours?: number;
    limit?: number;
    status?: string;
  }): Promise<DomainStatEntry[]> {
    const searchParams = new URLSearchParams();
    if (params.hours !== undefined) searchParams.set('hours', String(params.hours));
    if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    const response = await apiClient.get<DomainStatEntry[]>(
      `/api/v1/insights/domains/top${qs ? `?${qs}` : ''}`
    );
    return response.data;
  },

  async getCatalog(params: { q?: string; category?: string }): Promise<AppCatalogEntry[]> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.category) searchParams.set('category', params.category);
    const qs = searchParams.toString();
    const response = await apiClient.get<AppCatalogEntry[]>(
      `/api/v1/insights/catalog${qs ? `?${qs}` : ''}`
    );
    return response.data;
  },
};
