import apiClient from './client';

// Matches backend query_log table columns
export interface QueryLogEntry {
  id: number;
  time: string;
  client_ip: string;
  client_name: string | null;
  question: string;
  qtype: string;
  answer: string | null;
  status: 'blocked' | 'allowed';
  reason: string | null;
  elapsed_ns: number | null;
  upstream_ns: number | null;
  upstream: string | null;
}

export interface QueryLogListParams {
  limit?: number;
  offset?: number;
  cursor?: number;
  domain?: string;
  status?: 'blocked' | 'allowed';
  client?: string;
  upstream?: string;
  qtype?: string;
  time_range?: string;
}

export interface QueryLogResponse {
  data: QueryLogEntry[];
  // offset 模式
  total?: number;
  offset?: number;
  limit?: number;
  // cursor 模式
  has_more?: boolean;
  next_cursor?: number | null;
  // 两种模式都有
  returned: number;
}

export async function listQueryLogs(params: QueryLogListParams = {}): Promise<QueryLogResponse> {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.cursor !== undefined) {
    query.set('cursor', String(params.cursor));
  } else if (params.offset !== undefined) {
    query.set('offset', String(params.offset));
  }
  if (params.domain) query.set('domain', params.domain);
  if (params.status) query.set('status', params.status);
  if (params.client) query.set('client', params.client);
  if (params.upstream) query.set('upstream', params.upstream);
  if (params.qtype) query.set('qtype', params.qtype);
  if (params.time_range) query.set('time_range', params.time_range);

  const qs = query.toString();
  const response = await apiClient.get<QueryLogResponse>(
    `/api/v1/query-log${qs ? `?${qs}` : ''}`
  );
  return response.data;
}

export interface ExportParams {
  format: 'csv' | 'json';
  fields?: string[];
  limit?: number;
  filters?: import('./queryLogAdvanced').Filter[];
  time_range?: string;
}

/**
 * Export query logs with auth token (via axios, not direct URL)
 */
export async function exportQueryLogs(params: ExportParams): Promise<Blob> {
  const query = new URLSearchParams();
  query.set('format', params.format);
  if (params.fields && params.fields.length > 0) {
    query.set('fields', params.fields.join(','));
  }
  if (params.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  if (params.filters && params.filters.length > 0) {
    query.set('filters_json', JSON.stringify(params.filters));
  }
  if (params.time_range && params.time_range !== 'all') {
    query.set('time_range', params.time_range);
  }

  const response = await apiClient.get(`/api/v1/query-log/export?${query.toString()}`, {
    responseType: 'blob',
  });
  return response.data;
}

export async function bulkDeleteQueryLogs(ids: number[]): Promise<{ deleted: number }> {
  const response = await apiClient.delete<{ deleted: number }>('/api/v1/query-log/bulk', {
    data: { ids },
  });
  return response.data;
}

export const queryLogApi = {
  list: listQueryLogs,
  export: exportQueryLogs,
  bulkDelete: bulkDeleteQueryLogs,
};
