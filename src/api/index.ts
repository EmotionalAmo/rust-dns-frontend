// Export API client
export { default as apiClient } from './client';

// Export API modules
export { authApi } from './auth';
export { dashboardApi } from './dashboard';
export { rulesApi } from './rules';
export { filtersApi } from './filters';
export { rewritesApi } from './rewrites';
export { queryLogApi, type QueryLogResponse } from './queryLog';
export { clientsApi, type ClientRecord, type CreateClientPayload, type UpdateClientPayload, type ClientsResponse } from './clients';
export { usersApi, type UserRecord, type CreateUserPayload, type UpdateRolePayload, type UsersResponse } from './users';
export { settingsApi, type DnsSettingsRecord, type UpdateDnsSettingsPayload } from './settings';
export { domainCheckApi, type DomainCheckResult, type DomainCheckResponse } from './domainCheck';

// Export types
export type {
  LoginRequest,
  LoginResponse,
  ChangePasswordRequest,
  AuthUser,
  DashboardStats,
  Rule,
  CreateRuleRequest,
  Filter,
  CreateFilterRequest,
  Rewrite,
  CreateRewriteRequest,
  ApiError,
} from './types';
