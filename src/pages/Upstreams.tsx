import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { upstreamsApi, type DnsUpstream, type CreateUpstreamRequest } from '@/api/upstreams';
import { formatDateTime, formatDateTimeShort } from '@/lib/datetime';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Plus, RefreshCw, Edit2, Trash2, Zap, ChevronDown, ChevronUp, Server,
} from 'lucide-react';

// ─── Latency Display ─────────────────────────────────────────────────────────

function latencyColor(ms: number) {
  return ms < 50 ? 'text-green-600 dark:text-green-400' :
         ms < 150 ? 'text-yellow-600 dark:text-yellow-400' :
         'text-red-600 dark:text-red-400';
}

function LatencyCell({
  last, avg30, avg60,
}: { last: number | null; avg30: number | null; avg60: number | null }) {
  const { t } = useTranslation();
  if (last == null) return <span className="text-muted-foreground">-</span>;

  const parts = [last, avg30, avg60].filter((v) => v != null) as number[];
  const label = parts.join('/') + ' ms';
  const tooltip = [
    t('upstreams.latencyCurrent', { ms: last }),
    avg30 != null ? t('upstreams.latency30m', { ms: avg30 }) : null,
    avg60 != null ? t('upstreams.latency60m', { ms: avg60 }) : null,
  ].filter(Boolean).join('\n');

  return (
    <span
      title={tooltip}
      className={`font-mono text-xs cursor-default ${latencyColor(last)}`}
    >
      {label}
    </span>
  );
}

// ─── Health Badge ───────────────────────────────────────────────────────────

function HealthBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  switch (status) {
    case 'healthy':
      return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-0">{t('upstreams.statusHealthy')}</Badge>;
    case 'unhealthy':
    case 'down':
      return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-0">{t('upstreams.statusUnhealthy')}</Badge>;
    case 'degraded':
      return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-0">{t('upstreams.statusDegraded')}</Badge>;
    default:
      return <Badge className="bg-muted text-muted-foreground border-0">{t('upstreams.statusUnknown')}</Badge>;
  }
}

// ─── Upstream Dialog ─────────────────────────────────────────────────────────

interface UpstreamDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  upstream?: DnsUpstream | null;
}

function UpstreamDialog({ open, onOpenChange, upstream }: UpstreamDialogProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: upstream?.name ?? '',
    addresses: upstream?.addresses?.join('\n') ?? '',
    priority: upstream?.priority ?? 10,
    health_check_interval: upstream?.health_check_interval ?? 30,
    health_check_timeout: upstream?.health_check_timeout ?? 5,
    failover_threshold: upstream?.failover_threshold ?? 3,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateUpstreamRequest) => upstreamsApi.create(payload),
    onSuccess: async (newUpstream) => {
      toast.success(t('upstreams.createSuccess'));
      qc.invalidateQueries({ queryKey: ['upstreams'] });
      onOpenChange(false);
      // 自动健康检查
      if (newUpstream?.id) {
        try {
          const result = await upstreamsApi.testConnectivity(newUpstream.id);
          if (result.success) {
            toast.success(`健康检查通过：${result.latency_ms} ms`);
          } else {
            toast.warning(`健康检查失败：${result.error ?? '未知错误'}`);
          }
        } catch {
          // ignore auto-check errors
        }
        qc.invalidateQueries({ queryKey: ['upstreams'] });
      }
    },
    onError: (e: Error) => toast.error(t('upstreams.createError', { msg: e.message })),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateUpstreamRequest> }) =>
      upstreamsApi.update(id, payload),
    onSuccess: () => {
      toast.success(t('upstreams.updateSuccess'));
      qc.invalidateQueries({ queryKey: ['upstreams'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(t('upstreams.updateError', { msg: e.message })),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error(t('upstreams.nameRequired')); return; }
    const addresses = form.addresses.split('\n').map((s) => s.trim()).filter(Boolean);
    if (addresses.length === 0) { toast.error(t('upstreams.addressRequired')); return; }

    const payload: CreateUpstreamRequest = {
      name: form.name.trim(),
      addresses,
      priority: Number(form.priority),
      health_check_interval: Number(form.health_check_interval),
      health_check_timeout: Number(form.health_check_timeout),
      failover_threshold: Number(form.failover_threshold),
    };

    if (upstream) {
      updateMutation.mutate({ id: upstream.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{upstream ? t('upstreams.editTitle') : t('upstreams.createTitle')}</DialogTitle>
          <DialogDescription>{t('upstreams.dialogDesc')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="name">{t('upstreams.nameLabel')}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例如: Cloudflare DoH"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="addresses">
                  {t('upstreams.addressesLabel')}
                </Label>
                <Textarea
                  id="addresses"
                  value={form.addresses}
                  onChange={(e) => setForm({ ...form, addresses: e.target.value })}
                  placeholder={"https://1.1.1.1/dns-query\nhttps://1.0.0.1/dns-query\ntls://1.1.1.1"}
                  className="h-20 font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priority">{t('upstreams.priorityLabel')}</Label>
                <Input
                  id="priority"
                  type="number"
                  min={1}
                  max={100}
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="failover_threshold">
                  {t('upstreams.thresholdLabel')}
                </Label>
                <Input
                  id="failover_threshold"
                  type="number"
                  min={1}
                  value={form.failover_threshold}
                  onChange={(e) => setForm({ ...form, failover_threshold: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hc_interval">
                  {t('upstreams.intervalLabel')}
                </Label>
                <Input
                  id="hc_interval"
                  type="number"
                  min={5}
                  value={form.health_check_interval}
                  onChange={(e) => setForm({ ...form, health_check_interval: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hc_timeout">
                  {t('upstreams.timeoutLabel')}
                </Label>
                <Input
                  id="hc_timeout"
                  type="number"
                  min={1}
                  value={form.health_check_timeout}
                  onChange={(e) => setForm({ ...form, health_check_timeout: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? <><RefreshCw size={14} className="mr-1 animate-spin" />{t('common.saving')}</>
                : upstream ? t('common.update') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Failover Log Panel ──────────────────────────────────────────────────────

function FailoverLogPanel() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['upstreams', 'failover-log'],
    queryFn: upstreamsApi.getFailoverLog,
    enabled: expanded,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <CardTitle className="text-base">{t('upstreams.failoverTitle')}</CardTitle>
            <CardDescription>{t('upstreams.failoverDesc')}</CardDescription>
          </div>
          {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </button>
      </CardHeader>
      {expanded && (
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <RefreshCw size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('upstreams.failoverEmpty')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('upstreams.failoverColTime')}</TableHead>
                  <TableHead>{t('upstreams.failoverColUpstreamId')}</TableHead>
                  <TableHead>{t('upstreams.failoverColAction')}</TableHead>
                  <TableHead>{t('upstreams.failoverColReason')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.upstream_id.slice(0, 8)}…</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.reason ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function UpstreamsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DnsUpstream | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DnsUpstream | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const { data: upstreams = [], isLoading, error, refetch } = useQuery({
    queryKey: ['upstreams'],
    queryFn: upstreamsApi.list,
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => upstreamsApi.delete(id),
    onSuccess: () => {
      toast.success(t('upstreams.deleteSuccess'));
      qc.invalidateQueries({ queryKey: ['upstreams'] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(t('upstreams.deleteError', { msg: e.message })),
  });

  const handleTest = async (up: DnsUpstream) => {
    setTestingId(up.id);
    try {
      const result = await upstreamsApi.testConnectivity(up.id);
      if (result.success) {
        toast.success(t('upstreams.testSuccess', { ms: result.latency_ms }));
      } else {
        toast.error(t('upstreams.testFailed', { msg: result.error ?? '未知错误' }));
      }
    } catch (e: unknown) {
      toast.error(t('upstreams.testError', { msg: e instanceof Error ? e.message : String(e) }));
    } finally {
      setTestingId(null);
      qc.invalidateQueries({ queryKey: ['upstreams'] });
    }
  };

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('upstreams.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('upstreams.desc')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus size={16} className="mr-1" />
            {t('upstreams.addUpstream')}
          </Button>
        </div>
      </div>

      {/* 列表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('upstreams.tableTitle')}</CardTitle>
          <CardDescription>{t('upstreams.tableCount', { count: upstreams.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw size={32} className="animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <p className="text-muted-foreground">{t('upstreams.loadError')}</p>
              <Button variant="outline" onClick={() => refetch()}>{t('common.retry')}</Button>
            </div>
          ) : upstreams.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-4">
              <Server size={48} className="text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">{t('upstreams.emptyState')}</p>
                <p className="text-sm text-muted-foreground">{t('upstreams.emptyHint')}</p>
              </div>
              <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
                <Plus size={16} className="mr-1" />{t('upstreams.addUpstream')}
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('upstreams.colName')}</TableHead>
                    <TableHead>{t('upstreams.colAddresses')}</TableHead>
                    <TableHead>{t('upstreams.colPriority')}</TableHead>
                    <TableHead>{t('upstreams.colHealth')}</TableHead>
                    <TableHead>{t('upstreams.colLastCheck')}</TableHead>
                    <TableHead>{t('upstreams.colLatency')}</TableHead>
                    <TableHead className="w-32">{t('upstreams.colActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upstreams.map((up) => (
                    <TableRow key={up.id}>
                      <TableCell className="font-medium">{up.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {up.addresses?.map((addr) => (
                            <code key={addr} className="text-xs font-mono text-muted-foreground">{addr}</code>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono">{up.priority}</span>
                      </TableCell>
                      <TableCell>
                        <HealthBadge status={up.health_status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {up.last_health_check_at
                          ? formatDateTimeShort(up.last_health_check_at)
                          : <span className="italic">{t('upstreams.notChecked')}</span>}
                      </TableCell>
                      <TableCell>
                        <LatencyCell
                          last={up.last_latency_ms}
                          avg30={up.avg_latency_30m_ms}
                          avg60={up.avg_latency_60m_ms}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title={t('upstreams.testConnection')}
                            disabled={testingId === up.id}
                            onClick={() => handleTest(up)}
                          >
                            {testingId === up.id
                              ? <RefreshCw size={14} className="animate-spin" />
                              : <Zap size={14} />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditing(up); setDialogOpen(true); }}
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(up)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Failover 日志 */}
      <FailoverLogPanel />

      {/* 对话框 */}
      <UpstreamDialog
        key={editing?.id ?? 'new'}
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}
        upstream={editing}
      />

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('upstreams.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('upstreams.confirmDeleteDesc', { name: deleteTarget?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
