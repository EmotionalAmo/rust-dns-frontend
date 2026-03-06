import { apiClient, type DashboardStats } from './';
import type { QueryTrendData } from '@/components/dashboard/QueryTrendChart';
import type { UpstreamTrendData } from '@/components/dashboard/UpstreamTrendChart';
import type { TopDomainEntry, TopClientEntry } from './types';

/**
 * Get dashboard statistics for the past N hours (default 24)
 */
export async function getDashboardStats(hours = 24): Promise<DashboardStats> {
  const response = await apiClient.get<DashboardStats>(
    `/api/v1/dashboard/stats?hours=${hours}`
  );
  return response.data;
}

/**
 * Get hourly query trend data for the past N hours (default 24)
 */
export async function getQueryTrend(hours = 24): Promise<QueryTrendData[]> {
  const response = await apiClient.get<Array<{
    time: string;
    total: number;
    blocked: number;
    allowed: number;
    cached: number;
  }>>(`/api/v1/dashboard/query-trend?hours=${hours}`);

  return response.data.map((row) => ({
    time: row.time,
    queries: row.total,
    blocked: row.blocked,
    allowed: row.allowed,
    cached: row.cached,
  }));
}

/**
 * Get top 10 blocked domains in the past N hours
 */
export async function getTopBlockedDomains(hours = 24): Promise<TopDomainEntry[]> {
  const response = await apiClient.get<TopDomainEntry[]>(
    `/api/v1/dashboard/top-blocked-domains?hours=${hours}`
  );
  return response.data;
}

/**
 * Get top 10 most queried domains (all statuses) in the past N hours
 */
export async function getTopQueriedDomains(hours = 24): Promise<TopDomainEntry[]> {
  const response = await apiClient.get<TopDomainEntry[]>(
    `/api/v1/dashboard/top-queried-domains?hours=${hours}`
  );
  return response.data;
}

/**
 * Get top 10 most active clients in the past N hours
 */
export async function getTopClients(hours = 24): Promise<TopClientEntry[]> {
  const response = await apiClient.get<TopClientEntry[]>(
    `/api/v1/dashboard/top-clients?hours=${hours}`
  );
  return response.data;
}

/**
 * Get upstream distribution trend for past N hours
 */
export async function getUpstreamTrend(hours = 24, limit = 10): Promise<{
  data: UpstreamTrendData[];
  total_upstreams: number;
}> {
  const response = await apiClient.get<{
    data: UpstreamTrendData[];
    total_upstreams: number;
  }>(`/api/v1/dashboard/upstream-trend?hours=${hours}&limit=${limit}`);
  return response.data;
}

/**
 * Get upstream distribution (count and percentage) for past N hours
 */
export async function getUpstreamDistribution(hours = 24): Promise<Array<{
  upstream: string;
  count: number;
  percentage: number;
}>> {
  const response = await apiClient.get<Array<{
    upstream: string;
    count: number;
    percentage: number;
  }>>(`/api/v1/dashboard/upstream-distribution?hours=${hours}`);
  return response.data;
}

// Export API object
export const dashboardApi = {
  getStats: getDashboardStats,
  getQueryTrend,
  getTopBlockedDomains,
  getTopQueriedDomains,
  getTopClients,
  getUpstreamTrend,
  getUpstreamDistribution,
};
