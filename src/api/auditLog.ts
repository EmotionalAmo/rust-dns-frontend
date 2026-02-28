import apiClient from './client';

export interface AuditLogRecord {
  id: number;
  time: string;
  user_id: string;
  username: string;
  action: string;
  resource: string;
  resource_id: string | null;
  detail: string | null;
  ip: string;
}

export interface AuditLogParams {
  page?: number;
  per_page?: number;
  user_id?: string;
  action?: string;
  resource?: string;
}

export interface AuditLogResponse {
  data: AuditLogRecord[];
  total: number;
  page: number;
  per_page: number;
}

async function listAuditLog(params: AuditLogParams = {}): Promise<AuditLogResponse> {
  const response = await apiClient.get<AuditLogResponse>('/api/v1/audit-log', { params });
  return response.data;
}

export const auditLogApi = {
  list: listAuditLog,
};
