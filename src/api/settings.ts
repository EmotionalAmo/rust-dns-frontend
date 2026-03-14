import apiClient from './client';

export interface CacheStats {
  entry_count: number;
  max_capacity: number;
  usage_percent: number;
}

export interface DnsSettingsRecord {
  upstreams: string[];
  cache_ttl: number;
  query_log_retention_days: number;
  stats_retention_days: number;
  safe_search_enabled: boolean;
  parental_control_enabled: boolean;
  upstream_strategy?: string;
  acl_allowed_networks: string[];
  acl_denied_networks: string[];
}

export interface UpdateDnsSettingsPayload {
  upstreams?: string[];
  cache_ttl?: number;
  query_log_retention_days?: number;
  stats_retention_days?: number;
  safe_search_enabled?: boolean;
  parental_control_enabled?: boolean;
  upstream_strategy?: string;
  acl_allowed_networks?: string[];
  acl_denied_networks?: string[];
}

async function getDnsSettings(): Promise<DnsSettingsRecord> {
  const response = await apiClient.get<DnsSettingsRecord>('/api/v1/settings/dns');
  return response.data;
}

async function updateDnsSettings(payload: UpdateDnsSettingsPayload): Promise<void> {
  await apiClient.put('/api/v1/settings/dns', payload);
}

async function getCacheStats(): Promise<CacheStats> {
  const response = await apiClient.get<CacheStats>('/api/v1/settings/cache');
  return response.data;
}

async function flushCache(): Promise<void> {
  await apiClient.delete('/api/v1/settings/cache');
}

async function downloadBackup(): Promise<void> {
  const response = await apiClient.get('/api/v1/admin/backup', {
    responseType: 'blob',
  });

  const disposition = response.headers['content-disposition'] as string | undefined;
  let filename = 'rust-dns-backup.dump';
  if (disposition) {
    const match = disposition.match(/filename="([^"]+)"/);
    if (match) filename = match[1];
  }

  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const settingsApi = {
  getDns: getDnsSettings,
  updateDns: updateDnsSettings,
  getCacheStats,
  flushCache,
  downloadBackup,
};
