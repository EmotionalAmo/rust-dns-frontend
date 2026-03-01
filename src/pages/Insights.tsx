import { Fragment, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2, RefreshCw, Globe, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { insightsApi, type AppStatEntry, type DomainStatEntry } from '@/api/insights';
import { dashboardApi } from '@/api/dashboard';
import { cn } from '@/lib/utils';

const TIME_RANGES = [
  { label: '1h', hours: 1 },
  { label: '24h', hours: 24 },
  { label: '7d', hours: 168 },
  { label: '30d', hours: 720 },
] as const;

const CATEGORY_VALUES = [
  '',
  'Streaming',
  'Social',
  'Tech',
  'Gaming',
  'Communication',
  'Shopping',
  'Finance',
  'News',
] as const;

const STATUS_VALUES = [
  { value: '', labelKey: 'insights.statusAll' },
  { value: 'blocked', labelKey: 'insights.statusBlocked' },
  { value: 'allowed', labelKey: 'insights.statusAllowed' },
] as const;

type SortKey = 'total_queries' | 'unique_clients' | 'block_rate';
type DomainSortKey = 'total_queries' | 'block_rate';
type SortDir = 'desc' | 'asc';

const CATEGORY_I18N_MAP: Record<string, string> = {
  Streaming: 'insights.catStreaming',
  Social: 'insights.catSocial',
  Tech: 'insights.catTech',
  Gaming: 'insights.catGaming',
  Communication: 'insights.catCommunication',
  Shopping: 'insights.catShopping',
  Finance: 'insights.catFinance',
  News: 'insights.catNews',
};

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function formatRelativeTime(
  iso: string | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (!iso) return '-';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t('common.justNow');
  if (mins < 60) return t('common.minutesAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('common.hoursAgo', { count: hours });
  return t('common.daysAgo', { count: Math.floor(hours / 24) });
}

function formatTimeRange(
  hours: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (hours >= 168) return t('insights.timeRangeDays', { count: hours / 24 });
  if (hours >= 24) return t('insights.timeRange24h');
  return t('insights.timeRangeHours', { count: hours });
}

function AppIcon({ icon, appName }: { icon: string; appName: string }) {
  if (icon && icon.startsWith('http')) {
    return (
      <img
        src={icon}
        alt={appName}
        className="h-6 w-6 rounded object-contain"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <span className="text-base leading-none" role="img" aria-label={appName}>
      {icon || '🌐'}
    </span>
  );
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
  return sortDir === 'desc'
    ? <ArrowDown className="ml-1 inline h-3 w-3 text-primary" />
    : <ArrowUp className="ml-1 inline h-3 w-3 text-primary" />;
}

function DomainSortIcon({ col, sortKey, sortDir }: { col: DomainSortKey; sortKey: DomainSortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
  return sortDir === 'desc'
    ? <ArrowDown className="ml-1 inline h-3 w-3 text-primary" />
    : <ArrowUp className="ml-1 inline h-3 w-3 text-primary" />;
}

function TopDomainsCard({ hours }: { hours: number }) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<DomainSortKey>('total_queries');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showAll, setShowAll] = useState(false);

  const { data: rawData = [], isLoading } = useQuery<DomainStatEntry[]>({
    queryKey: ['insights', 'top-domains-full', hours],
    queryFn: () => insightsApi.getTopDomains({ hours, limit: 20 }),
    staleTime: 60_000,
    retry: false,
  });

  const sorted = useMemo(() => {
    return [...rawData].sort((a, b) => {
      const va = sortKey === 'block_rate' ? a.block_rate : a.total_queries;
      const vb = sortKey === 'block_rate' ? b.block_rate : b.total_queries;
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [rawData, sortKey, sortDir]);

  const displayed = showAll ? sorted : sorted.slice(0, 10);

  const toggleDomainSort = (key: DomainSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const refVal = sorted.length > 0 ? (sorted[0].total_queries || 1) : 1;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-4 w-4 text-muted-foreground" />
          {t('insights.top_domains')}
        </CardTitle>
        <CardDescription>
          {t('insights.top10Desc', { time: formatTimeRange(hours, t) })}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        {isLoading ? (
          <div className="space-y-2 p-6 flex-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-6">
            <p className="text-sm text-muted-foreground">{t('insights.noData')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <th className="w-10 px-4 py-3 text-left font-medium">{t('insights.colRank')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('insights.domain')}</th>
                    <th
                      className="min-w-[160px] cursor-pointer select-none px-4 py-3 text-left font-medium hover:text-foreground"
                      onClick={() => toggleDomainSort('total_queries')}
                    >
                      {t('insights.colQueries')}
                      <DomainSortIcon col="total_queries" sortKey={sortKey} sortDir={sortDir} />
                    </th>
                    <th className="px-4 py-3 text-right font-medium">{t('insights.colDevices')}</th>
                    <th
                      className="cursor-pointer select-none px-4 py-3 text-right font-medium hover:text-foreground"
                      onClick={() => toggleDomainSort('block_rate')}
                    >
                      {t('insights.block_rate')}
                      <DomainSortIcon col="block_rate" sortKey={sortKey} sortDir={sortDir} />
                    </th>
                    <th className="px-4 py-3 text-right font-medium">{t('insights.colLast')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {displayed.map((entry, i) => {
                    const pct = Math.round((entry.total_queries / refVal) * 100);
                    const blockRateNum = entry.block_rate;
                    const blockRateColor =
                      blockRateNum >= 50
                        ? 'text-destructive'
                        : blockRateNum >= 20
                          ? 'text-orange-500'
                          : 'text-muted-foreground';

                    return (
                      <tr key={entry.domain} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                        <td className="max-w-[240px] px-4 py-3">
                          <span className="block truncate font-mono text-xs" title={entry.domain}>
                            {entry.domain}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <span className="font-medium tabular-nums">{formatNumber(entry.total_queries)}</span>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary/60 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {entry.unique_clients}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {entry.blocked_queries > 0 ? (
                            <span className={blockRateColor}>{blockRateNum.toFixed(0)}%</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(entry.last_seen, t)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {sorted.length > 10 && (
              <div className="border-t px-4 py-3 text-center">
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {showAll ? t('insights.show_less') : t('insights.show_more')}
                </button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AppTrendChart({ appId, hours }: { appId: number; hours: number }) {
  const { t } = useTranslation();
  const { data = [], isLoading } = useQuery({
    queryKey: ['insights', 'trend', appId, hours],
    queryFn: () => insightsApi.getAppTrend(appId, hours),
    staleTime: 60_000,
    retry: false,
  });

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded bg-muted" />;
  }
  if (data.length === 0) {
    return <p className="py-4 text-center text-xs text-muted-foreground">{t('insights.trendNoData')}</p>;
  }

  const chartData = data.map((d) => ({
    // Show HH:MM from ISO string, fallback to full string
    hour: d.hour.length >= 16 ? d.hour.substring(11, 16) : d.hour,
    queries: d.total_queries,
  }));

  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`grad-${appId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="hour"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.375rem',
            fontSize: 11,
          }}
          formatter={(v: number | undefined) => [formatNumber(v ?? 0), 'Queries']}
        />
        <Area
          type="monotone"
          dataKey="queries"
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          fill={`url(#grad-${appId})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function InsightsPage() {
  const { t } = useTranslation();
  const [hours, setHours] = useState<number>(24);
  const [category, setCategory] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('total_queries');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const categoryParam = category === '' ? undefined : category;
  const statusParam = status === '' ? undefined : status;

  const {
    data: topAppsRaw = [],
    isLoading: appsLoading,
    refetch: refetchApps,
    isFetching: appsFetching,
  } = useQuery<AppStatEntry[]>({
    queryKey: ['insights', 'top-apps', hours, categoryParam, statusParam],
    queryFn: () => insightsApi.getTopApps({ hours, limit: 50, category: categoryParam, status: statusParam }),
    staleTime: 60_000,
    retry: false,
  });

  const topApps = useMemo(() => {
    return [...topAppsRaw].sort((a, b) => {
      let va: number, vb: number;
      if (sortKey === 'block_rate') {
        va = a.total_queries > 0 ? a.blocked_queries / a.total_queries : 0;
        vb = b.total_queries > 0 ? b.blocked_queries / b.total_queries : 0;
      } else if (sortKey === 'unique_clients') {
        va = a.unique_clients; vb = b.unique_clients;
      } else {
        va = a.total_queries; vb = b.total_queries;
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [topAppsRaw, sortKey, sortDir]);

  const { data: topDomains = [], isLoading: domainsLoading } = useQuery({
    queryKey: ['insights', 'top-domains', hours],
    queryFn: () => dashboardApi.getTopBlockedDomains(hours),
    staleTime: 60_000,
    retry: false,
  });

  const stats = useMemo(() => {
    const totalQ = topAppsRaw.reduce((s, a) => s + a.total_queries, 0);
    const totalB = topAppsRaw.reduce((s, a) => s + a.blocked_queries, 0);
    const blockRate = totalQ > 0 ? ((totalB / totalQ) * 100).toFixed(1) : '0';
    const peakDevices = topAppsRaw.reduce((m, a) => Math.max(m, a.unique_clients), 0);
    return { totalQ, totalB, blockRate, peakDevices, appsCount: topAppsRaw.length };
  }, [topAppsRaw]);

  // Progress bar reference: always relative to #1 in current sorted order for its sort key
  const refValue = useMemo(() => {
    if (topApps.length === 0) return 1;
    const first = topApps[0];
    if (sortKey === 'block_rate')
      return first.total_queries > 0 ? first.blocked_queries / first.total_queries : 1;
    if (sortKey === 'unique_clients') return first.unique_clients || 1;
    return first.total_queries || 1;
  }, [topApps, sortKey]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BarChart2 className="h-5 w-5 text-primary" />
            {t('insights.title')}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('insights.desc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border">
            {TIME_RANGES.map((tr) => (
              <button
                key={tr.hours}
                onClick={() => setHours(tr.hours)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  hours === tr.hours
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {tr.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => void refetchApps()}
            disabled={appsFetching}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', appsFetching && 'animate-spin')} />
            {t('insights.refresh')}
          </button>
        </div>
      </div>

      {/* Summary stat cards */}
      {!appsLoading && topAppsRaw.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: t('insights.statTotal'), value: formatNumber(stats.totalQ), sub: formatTimeRange(hours, t) },
            { label: t('insights.statBlocked'), value: formatNumber(stats.totalB), sub: `${stats.blockRate}%` },
            { label: t('insights.statApps'), value: String(stats.appsCount), sub: t('insights.filterAll') },
            { label: t('insights.statDevices'), value: String(stats.peakDevices), sub: t('insights.colDevices') },
          ].map((s) => (
            <Card key={s.label} className="py-3">
              <CardContent className="px-4 py-0">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-0.5 text-xl font-semibold tabular-nums">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category + Status filter tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {CATEGORY_VALUES.map((cat) => (
          <button
            key={cat === '' ? '__all__' : cat}
            onClick={() => setCategory(cat)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              category === cat
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-transparent bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {cat === '' ? t('insights.filterAll') : t(CATEGORY_I18N_MAP[cat] ?? cat)}
          </button>
        ))}

        <span className="mx-1 h-4 w-px bg-border" />

        {STATUS_VALUES.map((sv) => (
          <button
            key={sv.value || '__allstatus__'}
            onClick={() => setStatus(sv.value)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              status === sv.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-transparent bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {t(sv.labelKey)}
          </button>
        ))}
      </div>

      {/* Main table card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('insights.tableTitle')}</CardTitle>
          <CardDescription>
            {t('insights.top10Desc', { time: formatTimeRange(hours, t) })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {appsLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : topApps.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <BarChart2 className="h-10 w-10 opacity-30" />
              <p className="text-sm">{t('insights.emptyState')}</p>
              <p className="text-xs">{t('insights.emptyHint')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <th className="w-10 px-4 py-3 text-left font-medium">{t('insights.colRank')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('insights.colApp')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('insights.colCategory')}</th>
                    <th
                      className="min-w-[160px] cursor-pointer select-none px-4 py-3 text-left font-medium hover:text-foreground"
                      onClick={() => toggleSort('total_queries')}
                    >
                      {t('insights.colQueries')}
                      <SortIcon col="total_queries" sortKey={sortKey} sortDir={sortDir} />
                    </th>
                    <th
                      className="cursor-pointer select-none px-4 py-3 text-right font-medium hover:text-foreground"
                      onClick={() => toggleSort('unique_clients')}
                    >
                      {t('insights.colDevices')}
                      <SortIcon col="unique_clients" sortKey={sortKey} sortDir={sortDir} />
                    </th>
                    <th
                      className="cursor-pointer select-none px-4 py-3 text-right font-medium hover:text-foreground"
                      onClick={() => toggleSort('block_rate')}
                    >
                      {t('insights.colBlocked')}
                      <SortIcon col="block_rate" sortKey={sortKey} sortDir={sortDir} />
                    </th>
                    <th className="px-4 py-3 text-right font-medium">{t('insights.colLast')}</th>
                    <th className="w-8 px-2 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topApps.map((app, i) => {
                    const pct = Math.round((app.total_queries / refValue) * 100);
                    const blockRate =
                      app.total_queries > 0
                        ? ((app.blocked_queries / app.total_queries) * 100).toFixed(0)
                        : '0';
                    const isExpanded = expandedId === app.id;

                    return (
                      <Fragment key={app.id}>
                        <tr className={cn('transition-colors hover:bg-muted/30', isExpanded && 'bg-muted/20')}>
                          <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <AppIcon icon={app.icon} appName={app.app_name} />
                              <span className="font-medium">{app.app_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                              {app.category ? t(CATEGORY_I18N_MAP[app.category] ?? app.category) : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <span className="font-medium tabular-nums">{formatNumber(app.total_queries)}</span>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary/60 transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                            {app.unique_clients}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {app.blocked_queries > 0 ? (
                              <span className="text-destructive">{blockRate}%</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                            {formatRelativeTime(app.last_seen, t)}
                          </td>
                          <td className="px-2 py-3 text-right">
                            <button
                              onClick={() => toggleExpand(app.id)}
                              className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              title={isExpanded ? 'Collapse' : 'Show trend'}
                            >
                              {isExpanded
                                ? <ChevronUp className="h-3.5 w-3.5" />
                                : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-muted/10">
                            <td colSpan={8} className="px-6 py-3">
                              <p className="mb-2 text-xs font-medium text-muted-foreground">
                                {t('insights.trendTitle', { name: app.app_name })}
                              </p>
                              <AppTrendChart appId={app.id} hours={hours} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top domains grid */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* Top queried domains leaderboard */}
        <TopDomainsCard hours={hours} />

        {/* Top blocked domains card */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-muted-foreground" />
              {t('insights.top10Title')}
            </CardTitle>
            <CardDescription>
              {t('insights.top10Desc', { time: formatTimeRange(hours, t) })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {domainsLoading ? (
              <div className="space-y-2 flex-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-6 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : topDomains.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-6">
                <p className="text-sm text-muted-foreground">{t('insights.noData')}</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {topDomains.slice(0, 10).map((entry, i) => {
                  const maxCount = topDomains[0]?.count ?? 1;
                  const pct = Math.round((entry.count / maxCount) * 100);
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="max-w-[70%] truncate font-mono text-xs" title={entry.domain}>
                          <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                          {entry.domain}
                        </span>
                        <span className="ml-2 shrink-0 text-muted-foreground tabular-nums">
                          {formatNumber(entry.count)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
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
      </div>
    </div>
  );
}
