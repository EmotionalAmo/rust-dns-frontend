import apiClient from './client';

export interface DomainCheckResult {
  domain: string;
  blocked: boolean;
  rewrite_target: string | null;
  action: string;
}

export interface DomainCheckResponse {
  results: DomainCheckResult[];
}

export const domainCheckApi = {
  checkDomains: async (domains: string[]): Promise<DomainCheckResponse> => {
    const { data } = await apiClient.post<DomainCheckResponse>('/api/v1/dns/check', { domains });
    return data;
  },
};
