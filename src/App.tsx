import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToasterProvider } from './components/ui/sonner';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuthStore } from './stores/authStore';
import { setAuthStoreCallbacks } from './api/client';
import { ErrorBoundary } from './components/ErrorBoundary';

// Eagerly loaded (always needed)
import LoginPage from './pages/Login';
import ChangePasswordPage from './pages/ChangePassword';

// Lazy loaded pages — each becomes its own chunk
const DashboardPage    = lazy(() => import('./pages/Dashboard'));
const RulesPage        = lazy(() => import('./pages/Rules'));
const FiltersPage      = lazy(() => import('./pages/Filters'));
const RewritesPage     = lazy(() => import('./pages/Rewrites'));
const QueryLogsPage    = lazy(() => import('./pages/QueryLogs'));
const ClientsPage      = lazy(() => import('./pages/Clients'));
const ClientGroupsPage = lazy(() => import('./pages/ClientGroups'));
const UsersPage        = lazy(() => import('./pages/Users'));
const SettingsPage     = lazy(() => import('./pages/Settings'));
const UpstreamsPage    = lazy(() => import('./pages/Upstreams'));
const InsightsPage     = lazy(() => import('./pages/Insights'));
const AuditLogPage     = lazy(() => import('./pages/AuditLog'));

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
});

function PageFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function App() {
  const token = useAuthStore((state) => state.token);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  // Initialize API client callbacks
  useEffect(() => {
    setAuthStoreCallbacks(
      () => token,
      clearAuth
    );
  }, [token, clearAuth]);

  return (
    <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToasterProvider />
        <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />

          {/* Protected Routes with Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout title="Dashboard">
                  <Outlet />
                </DashboardLayout>
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
          </Route>

          {/* Other protected routes with layout */}
          <Route
            path="/rules"
            element={
              <ProtectedRoute>
                <DashboardLayout title="Rules">
                  <Outlet />
                </DashboardLayout>
              </ProtectedRoute>
            }
          >
            <Route index element={<RulesPage />} />
          </Route>

          <Route
            path="/filters"
            element={
              <ProtectedRoute>
                <DashboardLayout title="Filters">
                  <Outlet />
                </DashboardLayout>
              </ProtectedRoute>
            }
          >
            <Route index element={<FiltersPage />} />
          </Route>

          <Route
            path="/rewrites"
            element={
              <ProtectedRoute>
                <DashboardLayout title="Rewrites">
                  <Outlet />
                </DashboardLayout>
              </ProtectedRoute>
            }
          >
            <Route index element={<RewritesPage />} />
          </Route>

          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <DashboardLayout title="Clients">
                  <Outlet />
                </DashboardLayout>
              </ProtectedRoute>
            }
          >
            <Route index element={<ClientsPage />} />
          </Route>

          <Route
            path="/client-groups"
            element={
              <ProtectedRoute>
                <DashboardLayout title="客户端分组">
                  <Outlet />
                </DashboardLayout>
              </ProtectedRoute>
            }
          >
            <Route index element={<ClientGroupsPage />} />
          </Route>

          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <DashboardLayout title="Users">
                  <Outlet />
                </DashboardLayout>
              </ProtectedRoute>
            }
          >
            <Route index element={<UsersPage />} />
          </Route>

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout title="Settings">
                  <Outlet />
                </DashboardLayout>
              </ProtectedRoute>
            }
          >
            <Route index element={<SettingsPage />} />
          </Route>

          <Route
            path="/logs"
            element={
              <ProtectedRoute>
                <DashboardLayout title="Query Log">
                  <Outlet />
                </DashboardLayout>
              </ProtectedRoute>
            }
          >
            <Route index element={<QueryLogsPage />} />
          </Route>

          <Route
            path="/upstreams"
            element={
              <ProtectedRoute>
                <DashboardLayout title="上游 DNS">
                  <Outlet />
                </DashboardLayout>
              </ProtectedRoute>
            }
          >
            <Route index element={<UpstreamsPage />} />
          </Route>

          <Route
            path="/insights"
            element={
              <ProtectedRoute>
                <DashboardLayout title="网站洞察">
                  <Outlet />
                </DashboardLayout>
              </ProtectedRoute>
            }
          >
            <Route index element={<InsightsPage />} />
          </Route>

          <Route
            path="/audit-log"
            element={
              <ProtectedRoute>
                <DashboardLayout title="审计日志">
                  <Outlet />
                </DashboardLayout>
              </ProtectedRoute>
            }
          >
            <Route index element={<AuditLogPage />} />
          </Route>

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
