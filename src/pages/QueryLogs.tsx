import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { queryLogApi, type QueryLogListParams } from '@/api/queryLog';
import { useQueryLogWebSocket } from '@/hooks/useQueryLogWebSocket';
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
import { RefreshCw, CheckCircle2, XCircle, Globe, ChevronLeft, ChevronRight, Download, Radio, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/datetime';

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
      title={`${tag}处理耗时 ${formatNs(elapsedNs)}，无上游调用`}>
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
  const [domainFilter, setDomainFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'blocked' | 'allowed' | 'all'>('all');
  const [clientFilter, setClientFilter] = useState('');
  const [page, setPage] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<QueryLogListParams>({
    limit: PAGE_SIZE,
    offset: 0,
  });
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const { wsStatus, liveEntries, clearEntries } = useQueryLogWebSocket({ maxEntries: 100 });

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['query-logs', appliedFilters],
    queryFn: () => queryLogApi.list(appliedFilters),
    refetchInterval: 10000,
  });

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await queryLogApi.export({ format: exportFormat });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `query-logs-${new Date().toISOString().slice(0, 10)}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      console.error('Export failed:', error);
      toast.error(t('queryLogs.exportError'));
    } finally {
      setIsExporting(false);
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
            <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{t('queryLogs.filterDomain')}</label>
                <Input
                  type="text"
                  placeholder={t('queryLogs.domainPlaceholder')}
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="h-9 w-48"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{t('queryLogs.filterClient')}</label>
                <Input
                  type="text"
                  placeholder={t('queryLogs.clientPlaceholder')}
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="h-9 w-40"
                />
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
            </form>

            {/* 导出按钮 */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">{t('queryLogs.exportFormat')}</label>
              <Select value={exportFormat} onValueChange={(val) => setExportFormat(val as 'csv' | 'json')}>
                <SelectTrigger className="h-9 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={handleExport}
                disabled={isExporting}
              >
                <Download size={14} className="mr-1" />
                {isExporting ? t('common.exporting') : t('common.export')}
              </Button>
            </div>
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
                      <TableCell className="text-muted-foreground py-1.5">{entry.client_ip || '-'}</TableCell>
                      <TableCell className="text-muted-foreground py-1.5">{entry.upstream || '-'}</TableCell>
                      <TableCell className="py-1.5">
                        <TimingCell elapsedNs={entry.elapsed_ns} upstreamNs={entry.upstream_ns} status={entry.status} />
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
                      <TableHead>{t('queryLogs.colClient')}</TableHead>
                      <TableHead>{t('queryLogs.colResponse')}</TableHead>
                      <TableHead>{t('queryLogs.colUpstream')}</TableHead>
                      <TableHead className="text-right">{t('queryLogs.colLatency')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(log.time)}
                        </TableCell>
                        <TableCell>
                          <code className="text-sm font-mono">{log.question}</code>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono">
                            {log.qtype}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={log.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.client_ip || '-'}
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
                      </TableRow>
                    ))}
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
    </div>
  );
}
