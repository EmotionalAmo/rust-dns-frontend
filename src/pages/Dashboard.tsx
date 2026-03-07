import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { dashboardApi } from '@/api/dashboard';
import { QueryTrendChart } from '@/components/dashboard/QueryTrendChart';
import { UpstreamTrendChart } from '@/components/dashboard/UpstreamTrendChart';
import { UpstreamDistributionChart } from '@/components/dashboard/UpstreamDistributionChart';
import { Activity, Shield, Database, Server, Filter, Settings, TrendingUp, TrendingDown, Minus, Wifi, List, Eye, Users, RefreshCw, Globe, BookOpen } from 'lucide-react';
import { ruleStatsApi } from '@/api/ruleStats';
import { upstreamsApi } from '@/api/upstreams';
import { NetworkHealthCard } from '@/components/dashboard/NetworkHealthCard';
import { LatencyStatsCard } from '@/components/dashboard/LatencyStatsCard';
import { UpstreamHealthHistoryChart } from '@/components/dashboard/UpstreamHealthHistoryChart';
import { LatencyTrendChart } from '@/components/dashboard/LatencyTrendChart';

/**
 * Get time range label in Chinese or English based on hours
 */
function getTimeRangeLabel(hours: number, t: (key: string) => string): string {
  if (hours <= 24) return t('dashboard.timeRanges.24');
  if (hours <= 168) return t('dashboard.timeRanges.168');
  return t('dashboard.timeRanges.720');
}


export default function DashboardPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Use state with useEffect to sync with localStorage changes
  const [hours, setHours] = useState<number>(() => {
    const v = localStorage.getItem('dashboard-time-range');
    return v ? Number(v) : 24;
  });

  // Get time range label for UI display (computed from hours)
  const timeRangeLabel = getTimeRangeLabel(hours, t);

  const handleHoursChange = (v: string) => {
    const n = Number(v);
    setHours(n);
    localStorage.setItem('dashboard-time-range', String(n));
    window.dispatchEvent(new CustomEvent('dashboard-time-range-change', { detail: n }));
  };

  // Sync hours state with localStorage changes (when user changes in Settings)
  useEffect(() => {
    const handleStorageChange = () => {
      const v = localStorage.getItem('dashboard-time-range');
      if (v) setHours(Number(v));
    };

    const handleCustomChange = (e: Event) => {
      setHours((e as CustomEvent<number>).detail);
    };

    // Cross-tab sync via storage event; same-tab sync via CustomEvent
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dashboard-time-range-change', handleCustomChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dashboard-time-range-change', handleCustomChange);
    };
  }, []);

  // Fetch dashboard stats (refresh every 30s)
  const { data: stats, isLoading, error, refetch: _refetch } = useQuery({
    queryKey: ['dashboard', 'stats', hours],
    queryFn: () => dashboardApi.getStats(hours),
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Fetch trend chart data (refresh every 5s for near-realtime feel)
  const { data: trendData = [], isLoading: trendLoading } = useQuery({
    queryKey: ['dashboard', 'query-trend', hours],
    queryFn: () => dashboardApi.getQueryTrend(hours),
    refetchInterval: 5000,
    staleTime: 4000,
  });

  // Fetch Top 10 blocked domains
  const { data: topDomains = [], isLoading: topDomainsLoading } = useQuery({
    queryKey: ['dashboard', 'top-blocked-domains', hours],
    queryFn: () => dashboardApi.getTopBlockedDomains(hours),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  // Fetch Top 10 queried domains (all statuses)
  const { data: topQueriedDomains = [], isLoading: topQueriedLoading } = useQuery({
    queryKey: ['dashboard', 'top-queried-domains', hours],
    queryFn: () => dashboardApi.getTopQueriedDomains(hours),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  // Fetch Top 10 active clients
  const { data: topClients = [], isLoading: topClientsLoading } = useQuery({
    queryKey: ['dashboard', 'top-clients', hours],
    queryFn: () => dashboardApi.getTopClients(hours),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  // Fetch upstream trend data
  const { data: upstreamTrendResponse, isLoading: upstreamTrendLoading } = useQuery({
    queryKey: ['dashboard', 'upstream-trend', hours],
    queryFn: () => dashboardApi.getUpstreamTrend(hours, 10),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const upstreamTrendData = upstreamTrendResponse?.data ?? [];
  const activeUpstreams = upstreamTrendResponse?.total_upstreams ?? 0;

  // Fetch rule hit stats
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

  // Fetch upstreams list for NetworkHealthCard
  const { data: upstreamsList = [], isLoading: upstreamsListLoading } = useQuery({
    queryKey: ['upstreams', 'list'],
    queryFn: () => upstreamsApi.list(),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  // Fetch upstream distribution data
  const { data: upstreamDistribution = [], isLoading: upstreamDistributionLoading } = useQuery({
    queryKey: ['dashboard', 'upstream-distribution', hours],
    queryFn: () => dashboardApi.getUpstreamDistribution(hours),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  // Fetch latency trend (P50/P95 over time)
  const { data: latencyTrendData = [], isLoading: latencyTrendLoading } = useQuery({
    queryKey: ['dashboard', 'latency-trend', hours],
    queryFn: () => dashboardApi.getLatencyTrend(hours),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  // Fetch upstream health history (availability % over time)
  const { data: upstreamHealthResponse, isLoading: upstreamHealthLoading } = useQuery({
    queryKey: ['dashboard', 'upstream-health-history', hours],
    queryFn: () => dashboardApi.getUpstreamHealthHistory(hours),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const upstreamHealthData = upstreamHealthResponse?.data ?? [];
  const upstreamHealthNames = upstreamHealthResponse?.upstreams ?? [];

  const totalQueries = stats?.total_queries ?? 0;
  const blockedQueries = stats?.blocked_queries ?? 0;
  const cachedQueries = stats?.cached_queries ?? 0;
  const filterRules = stats?.filter_rules ?? 0;
  const filterLists = stats?.filter_lists ?? 0;
  const blockRate = stats?.block_rate ?? 0;
  const lastWeekBlockRate = stats?.last_week_block_rate ?? 0;
  const clients = stats?.clients ?? 0;
  const qps = stats?.qps ?? 0;

  // Format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Calculate rates
  const blockRateStr = totalQueries > 0 ? ((blockedQueries / totalQueries) * 100).toFixed(1) : '0.0';
  const cacheHitRate = totalQueries > 0 ? ((cachedQueries / totalQueries) * 100).toFixed(1) : '0.0';

  // Week-over-week trend
  const blockRateDiff = blockRate - lastWeekBlockRate;
  const blockRateTrend = Math.abs(blockRateDiff) < 0.1 ? 'flat' : blockRateDiff > 0 ? 'up' : 'down';

  const statsCards = [
    {
      title: t('dashboard.totalQueries'),
      value: formatNumber(totalQueries),
      subtitle: getTimeRangeLabel(hours, t),
      icon: Activity,
    },
    {
      title: t('dashboard.blockedQueries'),
      value: formatNumber(blockedQueries),
      subtitle: t('dashboard.blockRate', { rate: blockRateStr }),
      icon: Shield,
    },
    {
      title: t('dashboard.cacheHits'),
      value: formatNumber(cachedQueries),
      subtitle: t('dashboard.hitRate', { rate: cacheHitRate }),
      icon: Database,
    },
    {
      title: t('dashboard.filterLists'),
      value: filterLists.toString(),
      subtitle: t('dashboard.customRules', { count: filterRules }),
      icon: Filter,
    },
  ];

  // Zero-traffic onboarding guide
  const showOnboarding = !isLoading && !error && totalQueries === 0;

  return (
    <div className="space-y-6">
      {/* 时间范围选择器 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('dashboard.dataRange')}</span>
          <Select value={String(hours)} onValueChange={handleHoursChange}>
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24">{t('dashboard.timeRanges.24')}</SelectItem>
              <SelectItem value="168">{t('dashboard.timeRanges.168')}</SelectItem>
              <SelectItem value="720">{t('dashboard.timeRanges.720')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard'] })}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors focus:outline-none"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('dashboard.refreshStatus')}
        </button>
      </div>
      {/* Network Health Summary Card */}
      <NetworkHealthCard
        stats={stats}
        upstreams={upstreamsList}
        isLoading={isLoading}
        upstreamsLoading={upstreamsListLoading}
      />
      {/* Latency Stats Card */}
      <LatencyStatsCard hours={hours} />
      {/* Latency Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.latencyTrend')}</CardTitle>
          <CardDescription>{t('dashboard.latencyTrendDesc', { timeRange: timeRangeLabel })}</CardDescription>
        </CardHeader>
        <CardContent>
          <LatencyTrendChart data={latencyTrendData} isLoading={latencyTrendLoading} />
        </CardContent>
      </Card>
      {/* Zero-traffic onboarding guide */}
      {showOnboarding && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 text-base">{t('dashboard.gettingStartedTitle')}</CardTitle>
            <CardDescription className="text-blue-600">{t('dashboard.gettingStartedDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-100 p-2 shrink-0">
                  <List className="h-4 w-4 text-blue-700" />
                </div>
                <div>
                  <p className="font-medium text-blue-900 text-sm">{t('dashboard.step1Title')}</p>
                  <p className="text-xs text-blue-600 mt-1">{t('dashboard.step1Desc')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-100 p-2 shrink-0">
                  <Wifi className="h-4 w-4 text-blue-700" />
                </div>
                <div>
                  <p className="font-medium text-blue-900 text-sm">{t('dashboard.step2Title')}</p>
                  <p className="text-xs text-blue-600 mt-1">{t('dashboard.step2Desc')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-100 p-2 shrink-0">
                  <Eye className="h-4 w-4 text-blue-700" />
                </div>
                <div>
                  <p className="font-medium text-blue-900 text-sm">{t('dashboard.step3Title')}</p>
                  <p className="text-xs text-blue-600 mt-1">{t('dashboard.step3Desc')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-9 w-20 animate-pulse bg-muted rounded" />
                ) : error ? (
                  <div className="text-2xl font-bold text-destructive">-</div>
                ) : (
                  <div className="text-2xl font-bold">{card.value}</div>
                )}
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Query Trend Chart */}
        <div className="lg:col-span-2 h-full">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t('dashboard.queryTrend')}</CardTitle>
              <CardDescription>{t('dashboard.queryTrendDynamic', { timeRange: timeRangeLabel })}</CardDescription>
            </CardHeader>
            <CardContent>
              <QueryTrendChart data={trendData} isLoading={trendLoading} />
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <div className="h-full">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>{t('dashboard.systemStatus')}</CardTitle>
              <CardDescription>{t('dashboard.dnsServiceStatus')}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-6">
              {/* Status rows — flex-1 pushes separator + button to the bottom */}
              <div className="flex-1 space-y-4">
                {/* DNS Server Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('dashboard.dnsServer')}</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    {t('dashboard.running')}
                  </span>
                </div>

                {/* Filter Rules */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('dashboard.customRulesLabel')}</span>
                  </div>
                  {isLoading ? (
                    <div className="h-5 w-16 animate-pulse bg-muted rounded" />
                  ) : (
                    <span className="text-sm font-medium">{t('dashboard.rules', { count: filterRules })}</span>
                  )}
                </div>

                {/* Filter Lists */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('dashboard.filterLists')}</span>
                  </div>
                  {isLoading ? (
                    <div className="h-5 w-16 animate-pulse bg-muted rounded" />
                  ) : (
                    <span className="text-sm font-medium">{t('dashboard.lists', { count: filterLists })}</span>
                  )}
                </div>

                {/* Block Rate with week-over-week */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('dashboard.blockRateStat')}</span>
                  </div>
                  {isLoading ? (
                    <div className="h-5 w-16 animate-pulse bg-muted rounded" />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{blockRateStr}%</span>
                      {lastWeekBlockRate > 0 && (
                        <span className={`flex items-center text-xs ${blockRateTrend === 'up' ? 'text-red-500' :
                          blockRateTrend === 'down' ? 'text-green-500' :
                            'text-muted-foreground'
                          }`}>
                          {blockRateTrend === 'up' && <TrendingUp className="h-3 w-3" />}
                          {blockRateTrend === 'down' && <TrendingDown className="h-3 w-3" />}
                          {blockRateTrend === 'flat' && <Minus className="h-3 w-3" />}
                          {blockRateDiff > 0 ? '+' : ''}{blockRateDiff.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Cache Hit Rate */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('dashboard.cacheHitRate')}</span>
                  </div>
                  {isLoading ? (
                    <div className="h-5 w-16 animate-pulse bg-muted rounded" />
                  ) : (
                    <span className="text-sm font-medium">{cacheHitRate}%</span>
                  )}
                </div>

                {/* Clients */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('dashboard.clientsLabel')}</span>
                  </div>
                  {isLoading ? (
                    <div className="h-5 w-16 animate-pulse bg-muted rounded" />
                  ) : (
                    <span className="text-sm font-medium">{clients}</span>
                  )}
                </div>

                {/* Active Upstreams */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('dashboard.activeUpstreams')}</span>
                  </div>
                  {upstreamTrendLoading ? (
                    <div className="h-5 w-16 animate-pulse bg-muted rounded" />
                  ) : (
                    <span className="text-sm font-medium">{activeUpstreams}</span>
                  )}
                </div>

                {/* QPS */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('dashboard.qps')}</span>
                  </div>
                  {isLoading ? (
                    <div className="h-5 w-16 animate-pulse bg-muted rounded" />
                  ) : (
                    <span className="text-sm font-medium">{qps} /s</span>
                  )}
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top 10 Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top 10 Blocked Domains */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-destructive" />
              {t('dashboard.top10Blocked')}
            </CardTitle>
            <CardDescription>{t('dashboard.top10BlockedDesc', { timeRange: timeRangeLabel })}</CardDescription>
          </CardHeader>
          <CardContent>
            {topDomainsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-6 animate-pulse bg-muted rounded" />
                ))}
              </div>
            ) : topDomains.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noBlockData')}</p>
            ) : (
              <div className="space-y-2">
                {topDomains.map((entry, i) => {
                  const maxCount = topDomains[0]?.count ?? 1;
                  const pct = Math.round((entry.count / maxCount) * 100);
                  return (
                    <div key={entry.domain} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-mono text-xs max-w-[70%]" title={entry.domain}>
                          <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                          {entry.domain}
                        </span>
                        <span className="text-muted-foreground shrink-0 ml-2">{formatNumber(entry.count)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-destructive/60"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 10 Active Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {t('dashboard.top10Clients')}
            </CardTitle>
            <CardDescription>{t('dashboard.top10ClientsDesc', { timeRange: timeRangeLabel })}</CardDescription>
          </CardHeader>
          <CardContent>
            {topClientsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-6 animate-pulse bg-muted rounded" />
                ))}
              </div>
            ) : topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noClientData')}</p>
            ) : (
              <div className="space-y-2">
                {topClients.map((entry, i) => {
                  const maxCount = topClients[0]?.count ?? 1;
                  const pct = Math.round((entry.count / maxCount) * 100);
                  return (
                    <div key={entry.client_ip} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono text-xs">
                          <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                          {entry.client_ip}
                        </span>
                        <span className="text-muted-foreground shrink-0 ml-2">{formatNumber(entry.count)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/50"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Queried Domains Row */}
      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              {t('dashboard.top10Queried')}
            </CardTitle>
            <CardDescription>{t('dashboard.top10QueriedDesc', { timeRange: timeRangeLabel })}</CardDescription>
          </CardHeader>
          <CardContent>
            {topQueriedLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-6 animate-pulse bg-muted rounded" />
                ))}
              </div>
            ) : topQueriedDomains.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noQueryData')}</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {topQueriedDomains.map((entry, i) => {
                  const maxCount = topQueriedDomains[0]?.count ?? 1;
                  const pct = Math.round((entry.count / maxCount) * 100);
                  return (
                    <div key={entry.domain} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-mono text-xs max-w-[70%]" title={entry.domain}>
                          <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                          {entry.domain}
                        </span>
                        <span className="text-muted-foreground shrink-0 ml-2">{formatNumber(entry.count)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/40"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rule Hit Leaderboard */}
      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              {t('dashboard.top10RuleHits')}
            </CardTitle>
            <CardDescription>{t('dashboard.top10RuleHitsDesc', { timeRange: timeRangeLabel })}</CardDescription>
          </CardHeader>
          <CardContent>
            {ruleStatsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-6 animate-pulse bg-muted rounded" />
                ))}
              </div>
            ) : topRules.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noRuleHitData')}</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {topRules.map((entry, i) => {
                  const maxCount = topRules[0]?.hit_count ?? 1;
                  const pct = Math.round((entry.hit_count / maxCount) * 100);
                  return (
                    <div key={entry.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-mono text-xs max-w-[70%]" title={entry.rule}>
                          <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                          {entry.rule}
                        </span>
                        <span className="text-muted-foreground shrink-0 ml-2">{formatNumber(entry.hit_count)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/40"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upstream Health History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.upstreamHealthHistory')}</CardTitle>
          <CardDescription>{t('dashboard.upstreamHealthHistoryDesc', { timeRange: timeRangeLabel })}</CardDescription>
        </CardHeader>
        <CardContent>
          <UpstreamHealthHistoryChart
            data={upstreamHealthData}
            upstreams={upstreamHealthNames}
            isLoading={upstreamHealthLoading}
          />
        </CardContent>
      </Card>

      {/* Upstream Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upstream Trend */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.upstreamDistributionTrend')}</CardTitle>
            <CardDescription>{t('dashboard.upstreamDistributionDesc', { timeRange: timeRangeLabel })}</CardDescription>
          </CardHeader>
          <CardContent>
            <UpstreamTrendChart data={upstreamTrendData} isLoading={upstreamTrendLoading} />
          </CardContent>
        </Card>

        {/* Upstream Distribution (pie/bar) */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.upstreamDistributionStats')}</CardTitle>
            <CardDescription>{t('dashboard.upstreamDistributionDesc', { timeRange: timeRangeLabel })}</CardDescription>
          </CardHeader>
          <CardContent>
            <UpstreamDistributionChart data={upstreamDistribution} isLoading={upstreamDistributionLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
