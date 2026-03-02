import apiClient from './client';

export interface SandboxRequest {
    rule: string;
    test_domains: string[];
}

export interface SandboxResult {
    domain: string;
    status: 'allowed' | 'blocked' | 'unmatched';
}

export interface SandboxResponse {
    rule_valid: boolean;
    rule_type: string | null;
    parsed_blocks: number;
    parsed_allows: number;
    results: SandboxResult[];
}

export const sandboxApi = {
    testRule: async (request: SandboxRequest): Promise<SandboxResponse> => {
        const { data } = await apiClient.post<SandboxResponse>('/api/v1/tools/sandbox', request);
        return data;
    }
};
