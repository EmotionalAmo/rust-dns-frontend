import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { dashboardApi } from '@/api/dashboard';
import { ruleStatsApi } from '@/api/ruleStats';
import { upstreamsApi } from '@/api/upstreams';
import { clientsApi } from '@/api/clients';
import { alertsApi } from '@/api/alerts';
import { toast } from 'sonner';

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function getTimeRangeLabel(hours: number, t: (key: string) => string): string {
  if (hours <= 24) return t('dashboard.timeRanges.24');
  if (hours <= 168) return t('dashboard.timeRanges.168');
  return t('dashboard.timeRanges.720');
}

export function useDashboardData() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [hours, setHours] = useState<number>(() => {
    const v = localStorage.getItem('dashboard-time-range');
    return v ? Number(v) : 24;
  });

  const [showAlertBanner, setShowAlertBanner] = useState(true);
  const [editingClientIp, setEditingClientIp] = useState<string | null>(null);
  const [editingClientName, setEditingClientName] = useState('');

  const handleHoursChange = (v: string) => {
    const n = Number(v);
    setHours(n);
    localStorage.setItem('dashboard-time-range', String(n));
    window.dispatchEvent(new CustomEvent('dashboard-time-range-change', { detail: n }));
  };

  // Sync hours state with localStorage changes (cross-tab and same-tab)
  useEffect(() => {
    const handleStorageChange = () => {
      const v = localStorage.getItem('dashboard-time-range');
      if (v) setHours(Number(v));
    };
    const handleCustomChange = (e: Event) => {
      setHours((e as CustomEvent<number>).detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dashboard-time-range-change', handleCustomChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dashboard-time-range-change', handleCustomChange);
    };
  }, []);

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'stats', hours],
    queryFn: () => dashboardApi.getStats(hours),
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const { data: trendData = [], isLoading: trendLoading } = useQuery({
    queryKey: ['dashboard', 'query-trend', hours],
    queryFn: () => dashboardApi.getQueryTrend(hours),
    refetchInterval: 5000,
    staleTime: 4000,
  });

  const { data: topDomains = [], isLoading: topDomainsLoading } = useQuery({
    queryKey: ['dashboard', 'top-blocked-domains', hours],
    queryFn: () => dashboardApi.getTopBlockedDomains(hours),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const { data: topQueriedDomains = [], isLoading: topQueriedLoading } = useQuery({
    queryKey: ['dashboard', 'top-queried-domains', hours],
    queryFn: () => dashboardApi.getTopQueriedDomains(hours),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const { data: topClients = [], isLoading: topClientsLoading } = useQuery({
    queryKey: ['dashboard', 'top-clients', hours],
    queryFn: () => dashboardApi.getTopClients(hours),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const { data: clientsList = [] } = useQuery({
    queryKey: ['clients', 'list'],
    queryFn: () => clientsApi.list(),
    staleTime: 30000,
  });

  const { data: unreadAlertsData } = useQuery({
    queryKey: ['alerts', 'unread-count'],
    queryFn: () => alertsApi.getAlerts({ is_read: false, page_size: 1 }),
    refetchInterval: 30000,
    staleTime: 20000,
  });
  const unreadAlertCount = unreadAlertsData?.total ?? 0;

  const { data: upstreamTrendResponse, isLoading: upstreamTrendLoading } = useQuery({
    queryKey: ['dashboard', 'upstream-trend', hours],
    queryFn: () => dashboardApi.getUpstreamTrend(hours, 10),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const upstreamTrendData = upstreamTrendResponse?.data ?? [];
  const activeUpstreams = upstreamTrendResponse?.total_upstreams ?? 0;

  const { data: ruleStatsResponse, isLoading: ruleStatsLoading } = useQuery({
    queryKey: ['dashboard', 'rule-stats', hours],
    queryFn: () => ruleStatsApi.getStats(hours),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const topRules = (ruleStatsResponse?.data ?? [])
    .filter(r => r.hit_count > 0)
    .sort((a, b) => b.hit_count - a.hit_count)
    .slice(0, 10);

  const { data: upstreamsList = [], isLoading: upstreamsListLoading } = useQuery({
    queryKey: ['upstreams', 'list'],
    queryFn: () => upstreamsApi.list(),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const { data: upstreamDistribution = [], isLoading: upstreamDistributionLoading } = useQuery({
    queryKey: ['dashboard', 'upstream-distribution', hours],
    queryFn: () => dashboardApi.getUpstreamDistribution(hours),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const { data: latencyTrendData = [], isLoading: latencyTrendLoading } = useQuery({
    queryKey: ['dashboard', 'latency-trend', hours],
    queryFn: () => dashboardApi.getLatencyTrend(hours),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const { data: upstreamHealthResponse, isLoading: upstreamHealthLoading } = useQuery({
    queryKey: ['dashboard', 'upstream-health-history', hours],
    queryFn: () => dashboardApi.getUpstreamHealthHistory(hours),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const upstreamHealthData = upstreamHealthResponse?.data ?? [];
  const upstreamHealthNames = upstreamHealthResponse?.upstreams ?? [];

  const saveClientNameMutation = useMutation({
    mutationFn: async ({ ip, name }: { ip: string; name: string }) => {
      const existing = clientsList.find(c => c.identifiers.includes(ip));
      if (existing) {
        return clientsApi.update(existing.id, { name });
      } else {
        return clientsApi.create({ name, identifiers: [ip] });
      }
    },
    onSuccess: () => {
      toast.success('客户端已命名');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setEditingClientIp(null);
    },
    onError: () => {
      toast.error('命名失败');
    },
  });

  // Health Summary Banner computation
  const healthBanner = (() => {
    if (!stats) return null;

    const total = stats.total_queries ?? 0;
    const bRate = total > 0 ? ((stats.blocked_queries ?? 0) / total * 100).toFixed(1) : '0.0';

    const latestP50 = latencyTrendData.length > 0
      ? Math.round(latencyTrendData.filter(d => d.p50_ms > 0).at(-1)?.p50_ms ?? 0)
      : 0;

    const avgBlockRate = topClients.length > 0
      ? topClients.reduce((s, c) => s + (c.block_rate ?? 0), 0) / topClients.length
      : 0;
    const dangerClients = topClients.filter(c => avgBlockRate > 0 && (c.block_rate ?? 0) > avgBlockRate * 2);
    const warningClients = topClients.filter(c => avgBlockRate > 0 && (c.block_rate ?? 0) > avgBlockRate * 1.5 && (c.block_rate ?? 0) <= avgBlockRate * 2);

    const offlineUpstreams = upstreamsList.filter(u => u.health_status === 'down');
    const slowUpstreams = upstreamsList.filter(u => (u.avg_latency_30m_ms ?? 0) > 100);

    const getClientLabel = (ip: string) => {
      const record = clientsList.find(c => c.identifiers.includes(ip));
      return record?.name ? `${record.name} (${ip})` : ip;
    };

    if (dangerClients.length > 0 || offlineUpstreams.length > 0) {
      const count = dangerClients.length + offlineUpstreams.length;
      const issues = [
        ...dangerClients.map(c => getClientLabel(c.client_ip)),
        ...offlineUpstreams.map(u => u.name),
      ];
      return { level: 'danger' as const, count, total, blockRate: bRate, latestP50, issues };
    }
    if (warningClients.length > 0 || slowUpstreams.length > 0) {
      const count = warningClients.length + slowUpstreams.length;
      const issues = [
        ...warningClients.map(c => getClientLabel(c.client_ip)),
        ...slowUpstreams.map(u => u.name),
      ];
      return { level: 'warning' as const, count, total, blockRate: bRate, latestP50, issues };
    }
    return { level: 'ok' as const, count: 0, total, blockRate: bRate, latestP50, issues: [] as string[] };
  })();

  return {
    // Time range
    hours,
    handleHoursChange,
    timeRangeLabel: getTimeRangeLabel(hours, t),

    // Alert banner
    unreadAlertCount,
    showAlertBanner,
    setShowAlertBanner,

    // Stats
    stats,
    isLoading,
    error,

    // Trend
    trendData,
    trendLoading,

    // Top lists
    topDomains,
    topDomainsLoading,
    topQueriedDomains,
    topQueriedLoading,
    topClients,
    topClientsLoading,
    topRules,
    ruleStatsLoading,

    // Client naming
    clientsList,
    editingClientIp,
    setEditingClientIp,
    editingClientName,
    setEditingClientName,
    saveClientNameMutation,

    // Upstream
    upstreamTrendData,
    upstreamTrendLoading,
    activeUpstreams,
    upstreamsList,
    upstreamsListLoading,
    upstreamDistribution,
    upstreamDistributionLoading,
    upstreamHealthData,
    upstreamHealthNames,
    upstreamHealthLoading,

    // Latency
    latencyTrendData,
    latencyTrendLoading,

    // Health banner
    healthBanner,

    // Query client (for refresh button)
    queryClient,
  };
}
