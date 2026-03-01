import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardApi } from '@/api/dashboard';
import { QueryTrendChart } from '@/components/dashboard/QueryTrendChart';
import { Activity, Shield, Database, Server, Filter, Settings, TrendingUp, TrendingDown, Minus, Wifi, List, Eye, Users, RefreshCw } from 'lucide-react';

/**
 * Get time range label in Chinese or English based on hours
 */
function getTimeRangeLabel(hours: number, lang: string): string {
  if (lang === 'zh-CN') {
    if (hours <= 24) return '最近 1 天';
    if (hours <= 168) return '最近 7 天';
    return '最近 30 天';
  }
  // English
  if (hours <= 24) return 'the last 1 day';
  if (hours <= 168) return 'the last 7 days';
  return 'the last 30 days';
}

/**
 * Get short time range label for card subtitles (e.g., "最近 7 天")
 */
function getShortTimeRangeLabel(hours: number, lang: string): string {
  return getTimeRangeLabel(hours, lang);
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  // Get current language for time range labels
  const currentLang = i18n.language;

  // Use state with useEffect to sync with localStorage changes
  const [hours, setHours] = useState<number>(() => {
    const v = localStorage.getItem('dashboard-time-range');
    return v ? Number(v) : 24;
  });

  // Get time range label for UI display (computed from hours)
  const timeRangeLabel = getTimeRangeLabel(hours, currentLang);

  // Sync hours state with localStorage changes (when user changes in Settings)
  useEffect(() => {
    const handleStorageChange = () => {
      const v = localStorage.getItem('dashboard-time-range');
      if (v) {
        const newHours = Number(v);
        setHours(newHours);
      }
    };

    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);

    // Also check periodically for same-tab changes
    const interval = setInterval(() => {
      const v = localStorage.getItem('dashboard-time-range');
      if (v) {
        const newHours = Number(v);
        setHours(prev => prev !== newHours ? newHours : prev);
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
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

  // Fetch Top 10 active clients
  const { data: topClients = [], isLoading: topClientsLoading } = useQuery({
    queryKey: ['dashboard', 'top-clients', hours],
    queryFn: () => dashboardApi.getTopClients(hours),
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const totalQueries = stats?.total_queries ?? 0;
  const blockedQueries = stats?.blocked_queries ?? 0;
  const cachedQueries = stats?.cached_queries ?? 0;
  const filterRules = stats?.filter_rules ?? 0;
  const filterLists = stats?.filter_lists ?? 0;
  const blockRate = stats?.block_rate ?? 0;
  const lastWeekBlockRate = stats?.last_week_block_rate ?? 0;
  const clients = stats?.clients ?? 0;

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
      subtitle: getShortTimeRangeLabel(hours, currentLang),
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
      {/* 时间范围标签 */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {currentLang === 'zh-CN' ? '数据范围：' : 'Data range: '}
          {getShortTimeRangeLabel(hours, currentLang)}
          {currentLang === 'zh-CN' ? '（可在设置页调整）' : ' (adjustable in Settings)'}
        </p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard'] })}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors focus:outline-none"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('dashboard.refreshStatus')}
        </button>
      </div>
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
    </div>
  );
}
