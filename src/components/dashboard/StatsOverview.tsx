import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QueryTrendChart } from '@/components/dashboard/QueryTrendChart';
import { LatencyTrendChart } from '@/components/dashboard/LatencyTrendChart';
import { NetworkHealthCard } from '@/components/dashboard/NetworkHealthCard';
import { LatencyStatsCard } from '@/components/dashboard/LatencyStatsCard';
import { Activity, Shield, Database, Filter, Server, Settings, TrendingUp, TrendingDown, Minus, List, Wifi, Eye, Users, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardStats } from '@/api/';
import type { DnsUpstream } from '@/api/upstreams';
import type { QueryTrendData } from '@/components/dashboard/QueryTrendChart';
import type { LatencyTrendData } from '@/components/dashboard/LatencyTrendChart';
import { formatNumber, getTimeRangeLabel } from '@/hooks/useDashboardData';

interface StatsOverviewProps {
  hours: number;
  timeRangeLabel: string;
  stats: DashboardStats | undefined;
  isLoading: boolean;
  error: Error | null;
  trendData: QueryTrendData[];
  trendLoading: boolean;
  upstreamsList: DnsUpstream[];
  upstreamsListLoading: boolean;
  upstreamTrendLoading: boolean;
  activeUpstreams: number;
  latencyTrendData: LatencyTrendData[];
  latencyTrendLoading: boolean;
}

export function StatsOverview({
  hours,
  timeRangeLabel,
  stats,
  isLoading,
  error,
  trendData,
  trendLoading,
  upstreamsList,
  upstreamsListLoading,
  upstreamTrendLoading,
  activeUpstreams,
  latencyTrendData,
  latencyTrendLoading,
}: StatsOverviewProps) {
  const { t } = useTranslation();

  const totalQueries = stats?.total_queries ?? 0;
  const blockedQueries = stats?.blocked_queries ?? 0;
  const cachedQueries = stats?.cached_queries ?? 0;
  const filterRules = stats?.filter_rules ?? 0;
  const filterLists = stats?.filter_lists ?? 0;
  const blockRate = stats?.block_rate ?? 0;
  const lastWeekBlockRate = stats?.last_week_block_rate ?? 0;
  const clients = stats?.clients ?? 0;
  const qps = stats?.qps ?? 0;

  const blockRateStr = totalQueries > 0 ? ((blockedQueries / totalQueries) * 100).toFixed(1) : '0.0';
  const cacheHitRate = totalQueries > 0 ? ((cachedQueries / totalQueries) * 100).toFixed(1) : '0.0';

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

  const showOnboarding = !isLoading && !error && totalQueries === 0;

  return (
    <>
      {/* 分组标题：网络概览 */}
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard.sectionNetworkOverview')}</h3>
        <div className="flex-1 h-px bg-border" />
      </div>
      <NetworkHealthCard
        stats={stats}
        upstreams={upstreamsList}
        isLoading={isLoading}
        upstreamsLoading={upstreamsListLoading}
      />
      <LatencyStatsCard hours={hours} />
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.latencyTrend')}</CardTitle>
          <CardDescription>{t('dashboard.latencyTrendDesc', { timeRange: timeRangeLabel })}</CardDescription>
        </CardHeader>
        <CardContent>
          <LatencyTrendChart data={latencyTrendData} isLoading={latencyTrendLoading} />
        </CardContent>
      </Card>

      {/* 分组标题：查询统计 */}
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard.sectionQueryStats')}</h3>
        <div className="flex-1 h-px bg-border" />
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
              <div className="flex-1 space-y-4">
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

              <div className="pt-3 border-t border-border">
                <Link
                  to="/domain-lookup"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {t('dashboard.quickDomainCheck')}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
