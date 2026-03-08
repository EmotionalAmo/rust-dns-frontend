import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryLogApi, type QueryLogListParams } from '@/api/queryLog';
import { rulesApi } from '@/api/rules';
import { upstreamsApi } from '@/api/upstreams';
import { useQueryLogWebSocket } from '@/hooks/useQueryLogWebSocket';
import { queryLogAdvancedApi } from '@/api/queryLogAdvanced';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RefreshCw, CheckCircle2, XCircle, Globe, ChevronLeft, ChevronRight, Download, Radio, Trash2, ShieldX, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/datetime';
import { ExportDialog } from '@/components/query-log/ExportDialog';
import type { Filter } from '@/components/query-log/FilterRow';
import { ClientDetailSheet } from '@/components/ClientDetailSheet';

const PAGE_SIZE = 50;

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  if (status === 'blocked') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
        <XCircle size={12} />
        {t('queryLogs.statusBlocked2')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
      <CheckCircle2 size={12} />
      {t('queryLogs.statusAllowed2')}
    </span>
  );
}

const formatTime = formatDateTime;

function formatNs(ns: number): string {
  if (ns < 1_000) return `${ns}ns`;
  if (ns < 1_000_000) return `${(ns / 1_000).toFixed(1)}µs`;
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(1)}ms`;
  return `${(ns / 1_000_000_000).toFixed(2)}s`;
}

interface TimingCellProps {
  elapsedNs: number | null | undefined;
  upstreamNs: number | null | undefined;
  status: string;
}

function TimingCell({ elapsedNs, upstreamNs, status }: TimingCellProps) {
  const { t } = useTranslation();
  if (elapsedNs == null) return <span className="text-muted-foreground">-</span>;

  if (upstreamNs != null) {
    const localNs = Math.max(0, elapsedNs - upstreamNs);
    return (
      <div
        className="text-right"
        title={t('queryLogs.latencyTooltip', {
          total: formatNs(elapsedNs),
          local: formatNs(localNs),
          upstream: formatNs(upstreamNs),
        })}
      >
        <div className="text-xs font-medium tabular-nums">{formatNs(elapsedNs)}</div>
        <div className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
          {t('queryLogs.local')} {formatNs(localNs)} · {t('queryLogs.colLatency')} {formatNs(upstreamNs)}
        </div>
      </div>
    );
  }

  const tag = status === 'cached' ? t('queryLogs.cache') : t('queryLogs.local');
  return (
    <div className="text-right tabular-nums text-xs text-muted-foreground"
      title={t('queryLogs.localLatencyTooltip', { tag, elapsed: formatNs(elapsedNs) })}>
      {formatNs(elapsedNs)} <span className="text-[10px] opacity-60">{tag}</span>
    </div>
  );
}

function WsStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const config: Record<string, { color: string; labelKey: string }> = {
    connected: { color: 'text-green-600', labelKey: 'queryLogs.wsStatusLive' },
    connecting: { color: 'text-yellow-500', labelKey: 'queryLogs.wsStatusConnecting' },
    disconnected: { color: 'text-muted-foreground', labelKey: 'queryLogs.wsStatusOffline' },
    error: { color: 'text-red-500', labelKey: 'queryLogs.wsStatusError' },
  };
  const { color, labelKey } = config[status] ?? config.disconnected;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', color)}>
      <Radio size={11} className={status === 'connected' ? 'animate-pulse' : ''} />
      {t(labelKey)}
    </span>
  );
}

export default function QueryLogsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialClient = searchParams.get('client') ?? '';
  const [domainFilter, setDomainFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'blocked' | 'allowed' | 'all'>('all');
  const [clientFilter, setClientFilter] = useState(initialClient);
  const [upstreamFilter, setUpstreamFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<QueryLogListParams>(() => ({
    limit: PAGE_SIZE,
    offset: 0,
    ...(initialClient ? { filters: [{ field: 'client_ip', operator: 'like' as const, value: initialClient }] } : {}),
  }));
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());
  const [clientSheetIp, setClientSheetIp] = useState<string | null>(null);
  const [clientSheetOpen, setClientSheetOpen] = useState(false);

  // New filter states
  const [timeRange, setTimeRange] = useState<string>('all');
  const [qtypeFilter, setQtypeFilter] = useState<string>('all');

  // Autocomplete states for domain
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);
  const [showDomainSuggestions, setShowDomainSuggestions] = useState(false);
  const domainDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const domainInputRef = useRef<HTMLDivElement>(null);

  // Autocomplete states for client IP
  const [clientSuggestions, setClientSuggestions] = useState<string[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const clientDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientInputRef = useRef<HTMLDivElement>(null);

  // Click-outside handler to close suggestion dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (domainInputRef.current && !domainInputRef.current.contains(e.target as Node)) {
        setShowDomainSuggestions(false);
      }
      if (clientInputRef.current && !clientInputRef.current.contains(e.target as Node)) {
        setShowClientSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchDomainSuggestions = useCallback((prefix: string) => {
    if (domainDebounceRef.current) clearTimeout(domainDebounceRef.current);
    if (!prefix || prefix.length < 1) {
      setDomainSuggestions([]);
      setShowDomainSuggestions(false);
      return;
    }
    domainDebounceRef.current = setTimeout(async () => {
      try {
        const suggestions = await queryLogAdvancedApi.suggest('question', prefix, 8);
        setDomainSuggestions(suggestions);
        setShowDomainSuggestions(suggestions.length > 0);
      } catch {
        setDomainSuggestions([]);
        setShowDomainSuggestions(false);
      }
    }, 300);
  }, []);

  const fetchClientSuggestions = useCallback((prefix: string) => {
    if (clientDebounceRef.current) clearTimeout(clientDebounceRef.current);
    if (!prefix || prefix.length < 1) {
      setClientSuggestions([]);
      setShowClientSuggestions(false);
      return;
    }
    clientDebounceRef.current = setTimeout(async () => {
      try {
        const suggestions = await queryLogAdvancedApi.suggest('client_ip', prefix, 8);
        setClientSuggestions(suggestions);
        setShowClientSuggestions(suggestions.length > 0);
      } catch {
        setClientSuggestions([]);
        setShowClientSuggestions(false);
      }
    }, 300);
  }, []);

  const { wsStatus, liveEntries, clearEntries } = useQueryLogWebSocket({ maxEntries: 100 });

  // Fetch upstreams for filter dropdown
  const { data: upstreams = [] } = useQuery({
    queryKey: ['upstreams'],
    queryFn: () => upstreamsApi.list(),
  });

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['query-logs', appliedFilters],
    queryFn: () => queryLogApi.list(appliedFilters),
    refetchInterval: 10000,
  });

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // 预加载已有规则，构建 domain -> type 映射，用于显示 badge
  const { data: rulesData } = useQuery({
    queryKey: ['rules-for-badge'],
    queryFn: () => rulesApi.listRules({ per_page: 500 }),
    staleTime: 10000,
  });

  const domainRuleMap = useMemo(() => {
    const map = new Map<string, 'block' | 'allow'>();
    for (const rule of rulesData?.data ?? []) {
      // ||example.com^ -> block, @@||example.com^ -> allow
      const blockMatch = rule.rule.match(/^\|\|([^/^*\s]+)\^?$/);
      const allowMatch = rule.rule.match(/^@@\|\|([^/^*\s]+)\^?$/);
      if (blockMatch) map.set(blockMatch[1], 'block');
      else if (allowMatch) map.set(allowMatch[1], 'allow');
    }
    return map;
  }, [rulesData]);

  const STATUS_OPTIONS = [
    { value: 'all' as const, label: t('queryLogs.statusAll') },
    { value: 'blocked' as const, label: t('queryLogs.statusBlocked') },
    { value: 'allowed' as const, label: t('queryLogs.statusAllowed') },
  ];

  const applyFilters = () => {
    const newFilters: QueryLogListParams = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    };
    if (domainFilter) newFilters.domain = domainFilter;
    if (statusFilter && statusFilter !== 'all') newFilters.status = statusFilter;
    if (clientFilter) newFilters.client = clientFilter;
    if (upstreamFilter && upstreamFilter !== 'all') newFilters.upstream = upstreamFilter;
    if (qtypeFilter && qtypeFilter !== 'all') newFilters.qtype = qtypeFilter;
    if (timeRange && timeRange !== 'all') newFilters.time_range = timeRange;
    setAppliedFilters(newFilters);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    applyFilters();
  };

  const goToPage = (newPage: number) => {
    const newFilters = {
      ...appliedFilters,
      offset: newPage * PAGE_SIZE,
    };
    setPage(newPage);
    setAppliedFilters(newFilters);
  };

  const buildExportFilters = (): Filter[] => {
    const filters: Filter[] = [];
    if (appliedFilters.domain) filters.push({ field: 'question', operator: 'like', value: appliedFilters.domain });
    if (appliedFilters.status) filters.push({ field: 'status', operator: 'eq', value: appliedFilters.status });
    if (appliedFilters.client) filters.push({ field: 'client_ip', operator: 'like', value: appliedFilters.client });
    if (appliedFilters.upstream) filters.push({ field: 'upstream', operator: 'eq', value: appliedFilters.upstream });
    if (appliedFilters.qtype) filters.push({ field: 'qtype', operator: 'eq', value: appliedFilters.qtype });
    return filters;
  };

  const handleQuickRule = async (domain: string, type: 'block' | 'allow') => {
    const key = `${type}:${domain}`;
    if (pendingActions.has(key)) return;
    setPendingActions((prev) => new Set(prev).add(key));
    try {
      const rule = type === 'block' ? `||${domain}^` : `@@||${domain}^`;
      await rulesApi.createRule({ rule });
      queryClient.invalidateQueries({ queryKey: ['rules-for-badge'] });
      const message = type === 'block'
        ? t('queryLogs.blockSuccess', { domain })
        : t('queryLogs.allowSuccess', { domain });
      toast.success(message, {
        action: {
          label: t('queryLogs.viewRules'),
          onClick: () => navigate('/rules'),
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(t('queryLogs.actionError', { msg }));
    } finally {
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 过滤器 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe size={18} />
            {t('queryLogs.title')}
          </CardTitle>
          <CardDescription>{t('queryLogs.desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-end justify-between">
            <form onSubmit={handleSearch} className="flex flex-col gap-3">
              {/* Time range selector - first row */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{t('queryLogs.filterTimeRange')}</label>
                <div className="flex gap-1">
                  {[
                    { value: 'all', label: t('queryLogs.timeRangeAll') },
                    { value: '1h', label: t('queryLogs.timeRange1h') },
                    { value: '6h', label: t('queryLogs.timeRange6h') },
                    { value: '24h', label: t('queryLogs.timeRange24h') },
                    { value: '7d', label: t('queryLogs.timeRange7d') },
                  ].map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant={timeRange === opt.value ? 'default' : 'outline'}
                      className="h-8 px-3 text-xs"
                      onClick={() => setTimeRange(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              {/* Filter inputs - second row */}
              <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1 relative" ref={domainInputRef}>
                <label className="text-xs text-muted-foreground">{t('queryLogs.filterDomain')}</label>
                <Input
                  type="text"
                  placeholder={t('queryLogs.domainPlaceholder')}
                  value={domainFilter}
                  onChange={(e) => {
                    setDomainFilter(e.target.value);
                    fetchDomainSuggestions(e.target.value);
                  }}
                  onFocus={() => {
                    if (domainSuggestions.length > 0) setShowDomainSuggestions(true);
                  }}
                  className="h-9 w-48"
                  autoComplete="off"
                />
                {showDomainSuggestions && (
                  <div className="absolute top-full left-0 z-50 mt-1 w-48 rounded-md border bg-popover shadow-md">
                    {domainSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent truncate"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setDomainFilter(s);
                          setShowDomainSuggestions(false);
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 relative" ref={clientInputRef}>
                <label className="text-xs text-muted-foreground">{t('queryLogs.filterClient')}</label>
                <Input
                  type="text"
                  placeholder={t('queryLogs.clientPlaceholder')}
                  value={clientFilter}
                  onChange={(e) => {
                    setClientFilter(e.target.value);
                    fetchClientSuggestions(e.target.value);
                  }}
                  onFocus={() => {
                    if (clientSuggestions.length > 0) setShowClientSuggestions(true);
                  }}
                  className="h-9 w-40"
                  autoComplete="off"
                />
                {showClientSuggestions && (
                  <div className="absolute top-full left-0 z-50 mt-1 w-40 rounded-md border bg-popover shadow-md">
                    {clientSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent truncate"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setClientFilter(s);
                          setShowClientSuggestions(false);
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{t('queryLogs.filterStatus')}</label>
                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as 'blocked' | 'allowed' | 'all')}>
                  <SelectTrigger className="h-9 w-32">
                    <SelectValue placeholder={t('queryLogs.filterStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{t('queryLogs.filterQtype')}</label>
                <Select value={qtypeFilter} onValueChange={setQtypeFilter}>
                  <SelectTrigger className="h-9 w-28">
                    <SelectValue placeholder={t('queryLogs.filterQtype')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('queryLogs.qtypeAll')}</SelectItem>
                    {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'PTR', 'NS', 'SRV'].map((qt) => (
                      <SelectItem key={qt} value={qt}>{qt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{t('queryLogs.filterUpstream')}</label>
                <Select value={upstreamFilter} onValueChange={setUpstreamFilter}>
                  <SelectTrigger className="h-9 w-36">
                    <SelectValue placeholder={t('queryLogs.filterUpstream')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('queryLogs.upstreamAll')}</SelectItem>
                    {upstreams.map((up) => (
                      <SelectItem key={up.id} value={up.name}>
                        {up.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="h-9" disabled={isFetching}>
                  {t('queryLogs.searchBtn')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                </Button>
              </div>
              </div>
            </form>

            {/* 导出按钮 */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setShowExportDialog(true)}
            >
              <Download size={14} className="mr-1" />
              {t('common.export')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 实时推送面板 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Radio size={15} />
              {t('queryLogs.realtimeTitle')}
              <WsStatusBadge status={wsStatus} />
            </CardTitle>
            {liveEntries.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearEntries} className="h-7 gap-1 text-xs">
                <Trash2 size={12} />
                {t('queryLogs.clearBtn')}
              </Button>
            )}
          </div>
          <CardDescription className="text-xs">{t('queryLogs.realtimeDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {liveEntries.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              {wsStatus === 'connected' ? t('queryLogs.waitingQueries') : t('queryLogs.wsNotConnected')}
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{t('queryLogs.colTime')}</TableHead>
                    <TableHead className="text-xs">{t('queryLogs.colDomain')}</TableHead>
                    <TableHead className="text-xs">{t('queryLogs.colType')}</TableHead>
                    <TableHead className="text-xs">{t('queryLogs.colStatus')}</TableHead>
                    <TableHead className="text-xs">{t('queryLogs.colClient')}</TableHead>
                    <TableHead className="text-xs">{t('queryLogs.colUpstream')}</TableHead>
                    <TableHead className="text-right text-xs">{t('queryLogs.colLatency')}</TableHead>
                    <TableHead className="text-xs">{t('queryLogs.colActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liveEntries.map((entry) => (
                    <TableRow key={entry._key} className="text-xs">
                      <TableCell className="text-muted-foreground whitespace-nowrap py-1.5">
                        {formatTime(entry.time)}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <code className="font-mono">{entry.question}</code>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{entry.qtype}</span>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <StatusBadge status={entry.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground py-1.5">
                        {entry.client_ip ? (
                          <button
                            type="button"
                            className="font-mono text-xs text-foreground/70 hover:text-primary hover:underline transition-colors"
                            onClick={() => { setClientSheetIp(entry.client_ip); setClientSheetOpen(true); }}
                          >
                            {entry.client_ip}
                          </button>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground py-1.5">{entry.upstream || '-'}</TableCell>
                      <TableCell className="py-1.5">
                        <TimingCell elapsedNs={entry.elapsed_ns} upstreamNs={entry.upstream_ns} status={entry.status} />
                      </TableCell>
                      <TableCell className="py-1.5">
                        {(() => {
                          const domain = entry.question.replace(/\.$/, '');
                          return (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                title={t('queryLogs.actionBlock')}
                                disabled={pendingActions.has(`block:${domain}`)}
                                onClick={() => handleQuickRule(domain, 'block')}
                              >
                                <ShieldX size={12} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                                title={t('queryLogs.actionAllow')}
                                disabled={pendingActions.has(`allow:${domain}`)}
                                onClick={() => handleQuickRule(domain, 'allow')}
                              >
                                <ShieldCheck size={12} />
                              </Button>
                            </div>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 日志表格 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('queryLogs.tableTitle')}</CardTitle>
              <CardDescription>{t('queryLogs.tableCount', { count: total })}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={32} className="animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <p className="text-muted-foreground">{t('common.loadFailed')}</p>
              <Button variant="outline" onClick={() => refetch()}>{t('common.retry')}</Button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Globe size={48} className="text-muted-foreground" />
              <p className="text-muted-foreground">{t('queryLogs.emptyState')}</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('queryLogs.colTime')}</TableHead>
                      <TableHead>{t('queryLogs.colDomain')}</TableHead>
                      <TableHead>{t('queryLogs.colType')}</TableHead>
                      <TableHead>{t('queryLogs.colStatus')}</TableHead>
                      <TableHead>{t('queryLogs.colReason')}</TableHead>
                      <TableHead>{t('queryLogs.colClient')}</TableHead>
                      <TableHead>{t('queryLogs.colResponse')}</TableHead>
                      <TableHead>{t('queryLogs.colUpstream')}</TableHead>
                      <TableHead className="text-right">{t('queryLogs.colLatency')}</TableHead>
                      <TableHead>{t('queryLogs.colActions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const logDomain = log.question.replace(/\.$/, '');
                      const ruleType = domainRuleMap.get(logDomain);
                      return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(log.time)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <code className="text-sm font-mono">{log.question}</code>
                            {ruleType === 'block' && (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                                {t('queryLogs.badgeBlocked')}
                              </span>
                            )}
                            {ruleType === 'allow' && (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                                {t('queryLogs.badgeAllowed')}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono">
                            {log.qtype}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={log.status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[160px]">
                          {log.reason ? (
                            <span
                              className="block truncate font-mono"
                              title={log.reason}
                            >
                              {log.reason}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.client_ip ? (
                            <button
                              type="button"
                              className="font-mono text-xs text-foreground/70 hover:text-primary hover:underline transition-colors"
                              onClick={() => { setClientSheetIp(log.client_ip); setClientSheetOpen(true); }}
                            >
                              {log.client_ip}
                            </button>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {log.answer || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.upstream || '-'}
                        </TableCell>
                        <TableCell>
                          <TimingCell elapsedNs={log.elapsed_ns} upstreamNs={log.upstream_ns} status={log.status} />
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const domain = log.question.replace(/\.$/, '');
                            return (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                  title={t('queryLogs.actionBlock')}
                                  disabled={pendingActions.has(`block:${domain}`)}
                                  onClick={() => handleQuickRule(domain, 'block')}
                                >
                                  <ShieldX size={13} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                                  title={t('queryLogs.actionAllow')}
                                  disabled={pendingActions.has(`allow:${domain}`)}
                                  onClick={() => handleQuickRule(domain, 'allow')}
                                >
                                  <ShieldCheck size={13} />
                                </Button>
                              </div>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {t('common.pageInfo', { page: page + 1, total: totalPages, count: total })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        filters={buildExportFilters()}
        estimatedCount={total}
      />

      <ClientDetailSheet
        ip={clientSheetIp}
        open={clientSheetOpen}
        onOpenChange={setClientSheetOpen}
      />
    </div>
  );
}
