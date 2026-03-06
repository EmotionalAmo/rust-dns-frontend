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

export const ruleStatsApi = {
  async getStats(hours = 24): Promise<RuleStatsResponse> {
    const response = await apiClient.get<RuleStatsResponse>(
      `/api/v1/rules/stats?hours=${hours}`
    );
    return response.data;
  },
};
