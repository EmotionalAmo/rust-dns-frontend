import apiClient from './client';

export interface RuleStatEntry {
  id: string;
  rule: string;
  comment: string | null;
  is_enabled: boolean;
  created_at: string;
  hit_count: number;
  last_seen: string | null;
}

export interface RuleStatsResponse {
  data: RuleStatEntry[];
  hours: number;
  total_rules: number;
}

export interface RuleHitEntry {
  domain: string;
  count: number;
  last_seen: string | null;
}

export interface RuleHitsResponse {
  rule_id: string;
  rule: string;
  hits: RuleHitEntry[];
  hours: number;
}

export const ruleStatsApi = {
  async getStats(hours = 24): Promise<RuleStatsResponse> {
    const response = await apiClient.get<RuleStatsResponse>(
      `/api/v1/rules/stats?hours=${hours}`
    );
    return response.data;
  },

  async getHits(id: string, hours = 24, limit = 20): Promise<RuleHitsResponse> {
    const response = await apiClient.get<RuleHitsResponse>(
      `/api/v1/rules/stats/${id}/hits?hours=${hours}&limit=${limit}`
    );
    return response.data;
  },
};
