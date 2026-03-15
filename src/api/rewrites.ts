import apiClient from './client';
import type { Rewrite, CreateRewriteRequest } from './types';

export interface ListRewritesParams {
  search?: string;
  page?: number;
  per_page?: number;
}

export interface ListRewritesResponse {
  data: Rewrite[];
  total: number;
  page: number;
  per_page: number;
}

/**
 * Rewrites API
 * 管理 DNS 重写规则（域名 -> IP 映射）
 */
export const rewritesApi = {
  /**
   * 获取 DNS 重写规则列表，支持分页和搜索
   */
  async listRewrites(params?: ListRewritesParams): Promise<ListRewritesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.per_page !== undefined) searchParams.set('per_page', String(params.per_page));
    const query = searchParams.toString();
    const url = query ? `/api/v1/rewrites?${query}` : '/api/v1/rewrites';
    const response = await apiClient.get<ListRewritesResponse>(url);
    return response.data;
  },

  /**
   * 创建新重写规则
   */
  async createRewrite(request: CreateRewriteRequest): Promise<Rewrite> {
    const response = await apiClient.post<Rewrite>('/api/v1/rewrites', request);
    return response.data;
  },

  /**
   * 更新重写规则
   */
  async updateRewrite(id: string, request: Partial<CreateRewriteRequest>): Promise<Rewrite> {
    const response = await apiClient.put<Rewrite>(`/api/v1/rewrites/${id}`, request);
    return response.data;
  },

  /**
   * 删除重写规则
   */
  async deleteRewrite(id: string): Promise<void> {
    await apiClient.delete<void>(`/api/v1/rewrites/${id}`);
  },

  /**
   * 批量删除重写规则
   */
  async deleteRewrites(ids: string[]): Promise<void> {
    await Promise.all(ids.map(id => this.deleteRewrite(id)));
  },
};
