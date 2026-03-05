import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type DnsSettingsRecord, type UpdateDnsSettingsPayload } from '@/api/settings';
import { formatDateTime } from '@/lib/datetime';
import { upstreamsApi, type DnsUpstream, type CreateUpstreamRequest, type UpdateUpstreamRequest, type HealthCheckResult } from '@/api/upstreams';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { RefreshCw, Save, Settings as SettingsIcon, Shield, Server, Plus, Trash2, Zap, Activity, BarChart3 } from 'lucide-react';

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b last:border-0">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="ml-8">{children}</div>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy': return 'bg-green-500';
    case 'degraded': return 'bg-yellow-500';
    case 'down': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
}

function UpstreamDialog({
  upstream,
  onSave,
  onCancel,
}: {
  upstream?: DnsUpstream;
  onSave: (data: CreateUpstreamRequest | UpdateUpstreamRequest) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(upstream?.name || '');
  const [addresses, setAddresses] = useState(upstream?.addresses.join(', ') || '');
  const [priority, setPriority] = useState(upstream?.priority || 1);
  const [interval, setInterval] = useState(upstream?.health_check_interval || 30);
  const [connectTimeout, setConnectTimeout] = useState(upstream?.health_check_timeout || 5);
  const [threshold, setThreshold] = useState(upstream?.failover_threshold || 3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const addressesArray = addresses.split(',').map(a => a.trim()).filter(Boolean);
    if (addressesArray.length === 0) {
      toast.error(t('settings.addressRequired'));
      return;
    }

    const data = upstream
      ? ({
        name,
        addresses: addressesArray,
        priority,
        health_check_interval: interval,
        health_check_timeout: connectTimeout,
        failover_threshold: threshold,
      } as UpdateUpstreamRequest)
      : ({
        name,
        addresses: addressesArray,
        priority,
        health_check_interval: interval,
        health_check_timeout: connectTimeout,
        failover_threshold: threshold,
      } as CreateUpstreamRequest);

    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t('settings.upstreamName')}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('settings.placeholders.upstreamName')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="addresses">{t('settings.upstreamAddresses')}</Label>
          <Input
            id="addresses"
            value={addresses}
            onChange={(e) => setAddresses(e.target.value)}
            placeholder={t('settings.placeholders.upstreamAddresses')}
          />
          <p className="text-xs text-muted-foreground">{t('settings.upstreamAddressesHint')}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">{t('settings.upstreamPriority')}</Label>
          <Input
            id="priority"
            type="number"
            min="1"
            max="10"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="interval">{t('settings.upstreamInterval')}</Label>
            <Input
              id="interval"
              type="number"
              min="10"
              max="3600"
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeout">{t('settings.upstreamTimeout')}</Label>
            <Input
              id="timeout"
              type="number"
              min="1"
              max="30"
              value={connectTimeout}
              onChange={(e) => setConnectTimeout(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="threshold">{t('settings.upstreamThreshold')}</Label>
            <Input
              id="threshold"
              type="number"
              min="1"
              max="10"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button type="submit">{t('common.save')}</Button>
      </DialogFooter>
    </form>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: settings, isLoading, error, refetch } = useQuery({
    queryKey: ['settings-dns'],
    queryFn: settingsApi.getDns,
  });

  const { data: upstreams, isLoading: upstreamsLoading } = useQuery({
    queryKey: ['upstreams'],
    queryFn: upstreamsApi.list,
  });

  const { data: failoverLog } = useQuery({
    queryKey: ['failover-log'],
    queryFn: upstreamsApi.getFailoverLog,
  });

  // Local form state
  const [form, setForm] = useState<UpdateDnsSettingsPayload>({});

  // 仪表盘时间范围（存 localStorage）
  const [dashHours, setDashHours] = useState<number>(() => {
    const v = localStorage.getItem('dashboard-time-range');
    return v ? Number(v) : 24;
  });

  const handleDashHoursChange = (v: string) => {
    const n = Number(v);
    setDashHours(n);
    localStorage.setItem('dashboard-time-range', String(n));
    toast.success(t('settings.dashboardTimeRangeSaved'));
  };

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmUpstream, setDeleteConfirmUpstream] = useState<{ id: string; name: string } | null>(null);
  const [editingUpstream, setEditingUpstream] = useState<DnsUpstream | undefined>();
  const [testingUpstream, setTestingUpstream] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, HealthCheckResult>>({});

  // Sync form when settings load
  useEffect(() => {
    if (settings) {
      setForm({
        cache_ttl: settings.cache_ttl,
        query_log_retention_days: settings.query_log_retention_days,
        stats_retention_days: settings.stats_retention_days,
        safe_search_enabled: settings.safe_search_enabled,
        parental_control_enabled: settings.parental_control_enabled,
        upstream_strategy: settings.upstream_strategy ?? 'priority',
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateDnsSettingsPayload) => settingsApi.updateDns(payload),
    onSuccess: () => {
      toast.success(t('settings.saveSuccess'));
      refetch();
    },
    onError: (e: Error) => toast.error(t('settings.saveError', { msg: e.message })),
  });

  const createUpstreamMutation = useMutation({
    mutationFn: (req: CreateUpstreamRequest) => upstreamsApi.create(req),
    onSuccess: async (newUpstream) => {
      toast.success(t('settings.upstreamCreated'));
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['upstreams'] });
      // 自动健康检查
      if (newUpstream?.id) {
        setTestingUpstream(newUpstream.id);
        try {
          const result = await upstreamsApi.testConnectivity(newUpstream.id);
          setTestResults(prev => ({ ...prev, [newUpstream.id]: result }));
          if (result.success) {
            toast.success(t('settings.connectSuccess', { ms: result.latency_ms }));
          } else {
            toast.warning(t('settings.healthCheckFailed', { error: result.error ?? t('common.unknownError') }));
          }
        } catch {
          // ignore auto-check errors
        } finally {
          setTestingUpstream(null);
        }
        queryClient.invalidateQueries({ queryKey: ['upstreams'] });
      }
    },
    onError: (e: Error) => toast.error(t('settings.createFailed', { msg: e.message })),
  });

  const updateUpstreamMutation = useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateUpstreamRequest }) =>
      upstreamsApi.update(id, req),
    onSuccess: () => {
      toast.success(t('settings.upstreamUpdated'));
      setDialogOpen(false);
      setEditingUpstream(undefined);
      queryClient.invalidateQueries({ queryKey: ['upstreams'] });
    },
    onError: (e: Error) => toast.error(t('settings.updateFailed', { msg: e.message })),
  });

  const deleteUpstreamMutation = useMutation({
    mutationFn: (id: string) => upstreamsApi.delete(id),
    onSuccess: () => {
      toast.success(t('settings.upstreamDeleted'));
      queryClient.invalidateQueries({ queryKey: ['upstreams'] });
    },
    onError: (e: Error) => toast.error(t('settings.deleteFailed', { msg: e.message })),
  });

  const failoverMutation = useMutation({
    mutationFn: () => upstreamsApi.triggerFailover(),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t('settings.failoverTriggered', { msg: result.message }));
      } else {
        toast.warning(result.message);
      }
      queryClient.invalidateQueries({ queryKey: ['upstreams'] });
      queryClient.invalidateQueries({ queryKey: ['failover-log'] });
    },
    onError: (e: Error) => toast.error(t('settings.failoverError', { msg: e.message })),
  });

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const handleTestUpstream = async (id: string) => {
    setTestingUpstream(id);
    try {
      const result = await upstreamsApi.testConnectivity(id);
      setTestResults(prev => ({ ...prev, [id]: result }));
      if (result.success) {
        toast.success(t('settings.connectSuccess', { ms: result.latency_ms }));
      } else {
        toast.error(t('settings.connectFailed', { msg: result.error }));
      }
    } catch (e: unknown) {
      toast.error(t('settings.testError', { msg: (e as Error).message }));
    } finally {
      setTestingUpstream(null);
    }
  };

  const handleSaveUpstream = (data: CreateUpstreamRequest | UpdateUpstreamRequest) => {
    if (editingUpstream) {
      updateUpstreamMutation.mutate({ id: editingUpstream.id, req: data as UpdateUpstreamRequest });
    } else {
      createUpstreamMutation.mutate(data as CreateUpstreamRequest);
    }
  };

  const handleDeleteUpstream = (id: string, name: string) => {
    setDeleteConfirmUpstream({ id, name });
  };

  const handleCreateUpstream = () => {
    setEditingUpstream(undefined);
    setDialogOpen(true);
  };

  const handleEditUpstream = (upstream: DnsUpstream) => {
    setEditingUpstream(upstream);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <RefreshCw size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <p className="text-muted-foreground">{t('settings.loadError')}</p>
        <Button variant="outline" onClick={() => refetch()}>{t('common.retry')}</Button>
      </div>
    );
  }

  const current = { ...settings, ...form } as DnsSettingsRecord & UpdateDnsSettingsPayload;

  return (
    <div className="space-y-6 w-full max-w-[1400px] mx-auto pb-10">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('settings.desc')}</p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="shrink-0" size="default">
          {updateMutation.isPending ? (
            <><RefreshCw size={16} className="mr-2 animate-spin" />{t('common.saving')}</>
          ) : (
            <><Save size={16} className="mr-2" />{t('settings.saveAll')}</>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
        {/* 第一列：基础配置与安全 */}
        <div className="space-y-6">

          {/* 缓存设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon size={16} />
                {t('settings.cacheTitle')}
              </CardTitle>
              <CardDescription>{t('settings.cacheDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingRow
                label={t('settings.cacheTTL')}
                description={t('settings.cacheTTLDesc')}
              >
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={86400}
                    value={current.cache_ttl ?? 300}
                    onChange={(e) =>
                      setForm({ ...form, cache_ttl: Number(e.target.value) })
                    }
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">{t('common.seconds')}</span>
                </div>
              </SettingRow>
            </CardContent>
          </Card>


          {/* 安全过滤 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield size={16} />
                {t('settings.safeTitle')}
              </CardTitle>
              <CardDescription>{t('settings.safeDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingRow
                label={t('settings.safeSearch')}
                description={t('settings.safeSearchDesc')}
              >
                <Switch
                  checked={current.safe_search_enabled ?? false}
                  onCheckedChange={(v) => setForm({ ...form, safe_search_enabled: v })}
                />
              </SettingRow>
              <SettingRow
                label={t('settings.parentalControl')}
                description={t('settings.parentalControlDesc')}
              >
                <Switch
                  checked={current.parental_control_enabled ?? false}
                  onCheckedChange={(v) => setForm({ ...form, parental_control_enabled: v })}
                />
              </SettingRow>
            </CardContent>
          </Card>
        </div>

        {/* 第二列：数据保留与日志 */}
        <div className="space-y-6">
          {/* 数据保留 */}
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.retentionTitle')}</CardTitle>
              <CardDescription>{t('settings.retentionDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingRow
                label={t('settings.queryLogRetention')}
                description={t('settings.queryLogRetentionDesc')}
              >
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={current.query_log_retention_days ?? 30}
                    onChange={(e) =>
                      setForm({ ...form, query_log_retention_days: Number(e.target.value) })
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">{t('common.days')}</span>
                </div>
              </SettingRow>
              <SettingRow
                label={t('settings.statsRetention')}
                description={t('settings.statsRetentionDesc')}
              >
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={current.stats_retention_days ?? 90}
                    onChange={(e) =>
                      setForm({ ...form, stats_retention_days: Number(e.target.value) })
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">{t('common.days')}</span>
                </div>
              </SettingRow>
            </CardContent>
          </Card>

          {/* 仪表盘设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={16} />
                {t('settings.dashboardSettings')}
              </CardTitle>
              <CardDescription>{t('settings.dashboardSettingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingRow label={t('settings.dashboardTimeRange')} description={t('settings.dashboardTimeRangeDesc')}>
                <Select value={String(dashHours)} onValueChange={handleDashHoursChange}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">{t('dashboard.timeRanges.24')}</SelectItem>
                    <SelectItem value="168">{t('dashboard.timeRanges.168')}</SelectItem>
                    <SelectItem value="720">{t('dashboard.timeRanges.720')}</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
            </CardContent>
          </Card>

          {/* 故障转移日志 */}
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.failoverTitle')}</CardTitle>
              <CardDescription>{t('settings.failoverDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {failoverLog && failoverLog.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {failoverLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="text-sm py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {formatDateTime(entry.timestamp)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${entry.action === 'failover_triggered' ? 'bg-yellow-100 text-yellow-800' :
                          entry.action === 'recovered' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                          {entry.action}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-xs mt-1">
                        Upstream: {entry.upstream_id}
                        {entry.reason && ` - ${entry.reason}`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  {t('settings.failoverEmpty')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 第三列：高级网络与上游服务器 */}
        <div className="space-y-6 lg:col-span-2 xl:col-span-1">

          {/* Upstream 管理 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Server size={16} />
                  {t('settings.upstreamsTitle')}
                </span>
                <Button size="sm" onClick={handleCreateUpstream}>
                  <Plus size={14} className="mr-1" />{t('settings.addUpstream')}
                </Button>
              </CardTitle>
              <CardDescription>{t('settings.upstreamsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 mb-4">
                <SettingRow
                  label={t('settings.upstreamRoutingStrategy')}
                  description={t('settings.upstreamRoutingStrategyDesc')}
                >
                  <Select
                    value={current.upstream_strategy ?? 'priority'}
                    onValueChange={(v) => setForm({ ...form, upstream_strategy: v })}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="priority">{t('settings.strategyPriority')}</SelectItem>
                      <SelectItem value="load_balance">{t('settings.strategyLoadBalance')}</SelectItem>
                      <SelectItem value="fastest">{t('settings.strategyFastest')}</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
              </div>

              {upstreamsLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw size={24} className="animate-spin text-muted-foreground" />
                </div>
              ) : upstreams && upstreams.length > 0 ? (
                <div className="space-y-3">
                  {upstreams.map((upstream) => (
                    <div
                      key={upstream.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${getStatusColor(upstream.health_status)}`}
                              title={upstream.health_status}
                            />
                            <h4 className="font-medium">{upstream.name}</h4>
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">
                              {t('settings.priority', { n: upstream.priority })}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>
                              {t('settings.addresses', { addrs: upstream.addresses.join(', ') })}
                            </div>
                            {testResults[upstream.id] && (
                              <div className={`text-xs ${testResults[upstream.id]?.success ? 'text-green-600' : 'text-red-600'}`}>
                                {testResults[upstream.id]?.success
                                  ? t('settings.testSuccess', { ms: testResults[upstream.id]?.latency_ms })
                                  : t('settings.testFailed', { msg: testResults[upstream.id]?.error })}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUpstream(upstream)}
                          >
                            {t('common.edit')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTestUpstream(upstream.id)}
                            disabled={testingUpstream === upstream.id}
                          >
                            {testingUpstream === upstream.id ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Activity size={14} />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteUpstream(upstream.id, upstream.name)}
                          >
                            <Trash2 size={14} className="text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{t('settings.checkInterval', { n: upstream.health_check_interval })}</span>
                        <span>{t('settings.timeout', { n: upstream.health_check_timeout })}</span>
                        <span>{t('settings.threshold', { n: upstream.failover_threshold })}</span>
                        <span>{upstream.is_active ? t('settings.healthCheckEnabled') : t('settings.healthCheckDisabled')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t('settings.noUpstreams')}
                </div>
              )}
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => failoverMutation.mutate()}
                  disabled={failoverMutation.isPending}
                  className="w-full"
                >
                  <Zap size={16} className="mr-2" />
                  {failoverMutation.isPending ? t('settings.switching') : t('settings.manualFailover')}
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Upstream Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUpstream ? t('settings.editUpstream') : t('settings.createUpstream')}
            </DialogTitle>
          </DialogHeader>
          <UpstreamDialog
            upstream={editingUpstream}
            onSave={handleSaveUpstream}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Upstream Confirm Dialog */}
      <AlertDialog open={!!deleteConfirmUpstream} onOpenChange={(open) => !open && setDeleteConfirmUpstream(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.deleteUpstreamTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.deleteConfirm', { name: deleteConfirmUpstream?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteConfirmUpstream) { deleteUpstreamMutation.mutate(deleteConfirmUpstream.id); setDeleteConfirmUpstream(null); } }}
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
