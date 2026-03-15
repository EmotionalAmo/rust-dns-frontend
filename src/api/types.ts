// Auth Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expires_in?: number;
  role: string;
  requires_password_change: boolean;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface AuthUser {
  username: string;
  role: string;
}

// Dashboard Types — matches backend snake_case response
export interface DashboardStats {
  total_queries: number;
  blocked_queries: number;
  allowed_queries: number;
  cached_queries: number;
  filter_rules: number;
  filter_lists: number;
  block_rate: number;
  last_week_block_rate: number;
  clients: number;
  qps: number;
  // Yesterday comparison (previous same-length window)
  yesterday_total_queries?: number;
  yesterday_blocked_queries?: number;
}

export interface TopDomainEntry {
  domain: string;
  count: number;
}

export interface TopClientEntry {
  client_ip: string;
  count: number;
  blocked_count: number;
  block_rate: number;
}

// Rules Types — matches backend: {id, rule, comment, is_enabled, created_by, created_at, expires_at}
export interface Rule {
  id: string;
  rule: string;
  comment?: string | null;
  is_enabled: boolean;
  created_by: string;
  created_at: string;
  expires_at?: string | null;
}

export interface CreateRuleRequest {
  rule: string;
  comment?: string;
  expires_at?: string | null;
}

// Filter Lists Types — matches backend: {id, name, url, is_enabled, rule_count, last_updated, created_at, update_interval_hours}
export interface Filter {
  id: string;
  name: string;
  url?: string | null;
  is_enabled: boolean;
  rule_count?: number | null;
  last_updated?: string | null;
  created_at: string;
  update_interval_hours?: number;
}

export interface CreateFilterRequest {
  name: string;
  url?: string;
  is_enabled?: boolean;
  update_interval_hours?: number;
}

// DNS Rewrites Types — matches backend: {id, domain, answer, created_by, created_at, hit_count}
export interface Rewrite {
  id: string;
  domain: string;
  answer: string;
  created_by: string;
  created_at: string;
  hit_count?: number;
}

export interface CreateRewriteRequest {
  domain: string;
  answer: string;
  ttl?: number;
}

// API Error Types
export interface ApiError {
  message: string;
  status?: number;
}
