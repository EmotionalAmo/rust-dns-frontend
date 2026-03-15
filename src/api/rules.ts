import apiClient from './client';
import type { Rule, CreateRuleRequest } from './types';

export interface ExpiringRule extends Rule {
  expires_at: string; // guaranteed non-null for expiring rules
}

export interface ExpiringRulesResponse {
  data: ExpiringRule[];
  minutes: number;
}

export interface ListRulesParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface ListRulesResponse {
  data: Rule[];
  total: number;
  page: number;
  per_page: number;
}

export interface UpdateRuleRequest {
  rule?: string;
  comment?: string;
  is_enabled?: boolean;
  expires_at?: string | null;
}

export interface ImportRulesResponse {
  imported: number;
  skipped: number;
  total: number;
}

export interface ToggleRuleRequest {
  is_enabled: boolean;
}

/**
 * Rules API
 * 管理用户自定义 DNS 阻断/允许规则（不含订阅列表规则）
 */
export const rulesApi = {
  async listRules(params: ListRulesParams = {}): Promise<ListRulesResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.per_page) query.set('per_page', String(params.per_page));
    if (params.search) query.set('search', params.search);
    const response = await apiClient.get<ListRulesResponse>(`/api/v1/rules?${query}`);
    return response.data;
  },

  async createRule(request: CreateRuleRequest): Promise<Rule> {
    const response = await apiClient.post<Rule>('/api/v1/rules', request);
    return response.data;
  },

  async updateRule(id: string, request: UpdateRuleRequest): Promise<Rule> {
    const response = await apiClient.put<Rule>(`/api/v1/rules/${id}`, request);
    return response.data;
  },

  async toggleRule(id: string, request: ToggleRuleRequest): Promise<{ id: string; is_enabled: boolean }> {
    const response = await apiClient.post<{ id: string; is_enabled: boolean }>(
      `/api/v1/rules/${id}`,
      request
    );
    return response.data;
  },

  async deleteRule(id: string): Promise<void> {
    await apiClient.delete<void>(`/api/v1/rules/${id}`);
  },

  async deleteRules(ids: string[]): Promise<void> {
    await Promise.all(ids.map(id => this.deleteRule(id)));
  },

  async bulkAction(ids: string[], action: 'enable' | 'disable' | 'delete'): Promise<{ affected: number }> {
    const response = await apiClient.post<{ affected: number }>('/api/v1/rules/bulk', { ids, action });
    return response.data;
  },

  async exportRules(format: 'csv' | 'json' | 'txt'): Promise<Blob> {
    const response = await apiClient.get(`/api/v1/rules/export?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async importRulesFile(file: File): Promise<ImportRulesResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ImportRulesResponse>('/api/v1/rules/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async getExpiringRules(minutes = 5): Promise<ExpiringRule[]> {
    const response = await apiClient.get<ExpiringRulesResponse>(
      `/api/v1/rules/expiring?minutes=${minutes}`
    );
    return response.data.data;
  },

  async extendRule(id: string, hours = 1): Promise<Rule> {
    const newExpiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    const response = await apiClient.put<Rule>(`/api/v1/rules/${id}`, {
      expires_at: newExpiresAt,
    });
    return response.data;
  },
};
