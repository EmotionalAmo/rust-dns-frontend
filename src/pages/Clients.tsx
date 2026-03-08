import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi, type ClientRecord, type CreateClientPayload } from '@/api/clients';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Edit2, RefreshCw, Monitor, X, BookmarkPlus, BarChart2 } from 'lucide-react';
import { ClientSparkline } from '@/components/ClientSparkline';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function ClientActivityDialog({
  client,
  onClose,
}: {
  client: ClientRecord;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [hours, setHours] = useState(24);

  const { data, isLoading, error } = useQuery({
    queryKey: ['client-activity', client.id, hours],
    queryFn: () => clientsApi.getActivity(client.id, hours),
  });

  const chartData =
    data?.data.map((b) => ({
      hour: b.hour.slice(11, 16), // HH:MM
      [t('clients.activityAllowed')]: b.total - b.blocked,
      [t('clients.activityBlocked')]: b.blocked,
    })) ?? [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t('clients.activityTitle', { name: client.name })}
          </DialogTitle>
          <DialogDescription>{t('clients.activityDesc')}</DialogDescription>
        </DialogHeader>

        {/* Time range selector */}
        <div className="flex gap-2">
          {[6, 24, 72, 168].map((h) => (
            <Button
              key={h}
              variant={hours === h ? 'default' : 'outline'}
              size="sm"
              onClick={() => setHours(h)}
            >
              {h < 24 ? `${h}h` : h === 24 ? '24h' : h === 72 ? '3d' : '7d'}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <RefreshCw size={28} className="animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {t('common.loadError')}
          </p>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {t('clients.activityEmpty')}
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 11 }}
                  interval={hours <= 24 ? 3 : hours <= 72 ? 11 : 23}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey={t('clients.activityAllowed')}
                  stackId="a"
                  fill="hsl(var(--chart-2))"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey={t('clients.activityBlocked')}
                  stackId="a"
                  fill="hsl(var(--chart-5))"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Top domains */}
            {data && data.top_domains.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {t('clients.activityTopDomains')}
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {data.top_domains.map((d) => (
                    <div key={d.domain} className="flex items-center justify-between text-xs">
                      <span className="font-mono truncate max-w-[80%]">{d.domain}</span>
                      <span className="text-muted-foreground shrink-0">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FormData {
  name: string;
  identifiers: string;
  upstreams: string;
  filter_enabled: boolean;
  tags: string;
}

function ClientDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientRecord | null;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormData>({
    name: client?.name ?? '',
    identifiers: client?.identifiers?.join('\n') ?? '',
    upstreams: client?.upstreams?.join('\n') ?? '',
    filter_enabled: client?.filter_enabled ?? true,
    tags: client?.tags?.join(', ') ?? '',
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateClientPayload) => clientsApi.create(payload),
    onSuccess: () => {
      toast.success(t('clients.createSuccess'));
      qc.invalidateQueries({ queryKey: ['clients'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(t('clients.createError', { msg: e.message })),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateClientPayload }) =>
      clientsApi.update(id, payload),
    onSuccess: () => {
      toast.success(t('clients.updateSuccess'));
      qc.invalidateQueries({ queryKey: ['clients'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(t('clients.updateError', { msg: e.message })),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t('clients.nameRequired'));
      return;
    }
    const identifiers = form.identifiers.split('\n').map((s) => s.trim()).filter(Boolean);
    if (identifiers.length === 0) {
      toast.error(t('clients.identifierRequired'));
      return;
    }
    const upstreams = form.upstreams.split('\n').map((s) => s.trim()).filter(Boolean);
    const tags = form.tags.split(',').map((s) => s.trim()).filter(Boolean);

    const payload: CreateClientPayload = {
      name: form.name.trim(),
      identifiers,
      filter_enabled: form.filter_enabled,
      ...(upstreams.length > 0 ? { upstreams } : {}),
      ...(tags.length > 0 ? { tags } : {}),
    };

    if (client) {
      updateMutation.mutate({ id: client.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{client ? t('clients.editTitle') : t('clients.createTitle')}</DialogTitle>
          <DialogDescription>{t('clients.dialogDesc')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t('clients.nameLabel')}</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('clients.namePlaceholder')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="identifiers">
                {t('clients.identifiersLabel')}
              </Label>
              <Textarea
                id="identifiers"
                value={form.identifiers}
                onChange={(e) => setForm({ ...form, identifiers: e.target.value })}
                placeholder="192.168.1.100&#10;AA:BB:CC:DD:EE:FF"
                className="h-20 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="upstreams">
                {t('clients.upstreamsLabel')}
              </Label>
              <Textarea
                id="upstreams"
                value={form.upstreams}
                onChange={(e) => setForm({ ...form, upstreams: e.target.value })}
                placeholder="1.1.1.1&#10;8.8.8.8"
                className="h-16 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tags">
                {t('clients.tagsLabel')}
              </Label>
              <Input
                id="tags"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder={t('clients.tagsPlaceholder')}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.filter_enabled}
                onCheckedChange={(v) => setForm({ ...form, filter_enabled: v })}
              />
              <Label>{t('clients.enableFilter')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <><RefreshCw size={14} className="mr-1 animate-spin" />{t('common.saving')}</>
              ) : (
                <><Plus size={14} className="mr-1" />{client ? t('common.update') : t('common.create')}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


export default function ClientsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientRecord | null>(null);
  const [activityClient, setActivityClient] = useState<ClientRecord | null>(null);
  const [search, setSearch] = useState('');

  const { data: clients = [], isLoading, error, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => {
      toast.success(t('clients.deleteSuccess'));
      qc.invalidateQueries({ queryKey: ['clients'] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(t('clients.deleteError', { msg: e.message })),
  });

  const toggleFilterMutation = useMutation({
    mutationFn: ({ id, filter_enabled }: { id: string; filter_enabled: boolean }) => {
      const c = clients.find((x) => x.id === id);
      if (!c) throw new Error('客户端不存在');
      return clientsApi.update(id, {
        name: c.name,
        identifiers: c.identifiers,
        filter_enabled,
        ...(c.upstreams?.length ? { upstreams: c.upstreams } : {}),
        ...(c.tags?.length ? { tags: c.tags } : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (e: Error) => toast.error(t('clients.updateError', { msg: e.message })),
  });

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('clients.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('clients.desc')}</p>
        </div>
        <div className="flex gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('clients.searchPlaceholder')}
            className="w-[200px]"
          />
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus size={16} className="mr-1" />
            {t('clients.addClient')}
          </Button>
        </div>
      </div>

      {/* 表格 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('clients.tableTitle')}</CardTitle>
          <CardDescription>{t('clients.tableCount', { count: clients.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw size={32} className="animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <p className="text-muted-foreground">{t('clients.loadError')}</p>
              <Button variant="outline" onClick={() => refetch()}>{t('common.retry')}</Button>
            </div>
          ) : (() => {
            const filtered = clients.filter((c) => {
              if (!search.trim()) return true;
              const q = search.toLowerCase();
              return (
                c.name.toLowerCase().includes(q) ||
                (c.identifiers ?? []).join(' ').toLowerCase().includes(q)
              );
            });
            return filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-4">
              <Monitor size={48} className="text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">{t('clients.emptyState')}</p>
                <p className="text-sm text-muted-foreground">{t('clients.emptyHint')}</p>
              </div>
              <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
                <Plus size={16} className="mr-1" />
                {t('clients.addClient')}
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('clients.colName')}</TableHead>
                    <TableHead>{t('clients.colIdentifiers')}</TableHead>
                    <TableHead>{t('clients.colUpstreams')}</TableHead>
                    <TableHead>{t('clients.colFilter')}</TableHead>
                    <TableHead>{t('clients.colTags')}</TableHead>
                    <TableHead>{t('clients.colQueries')}</TableHead>
                    <TableHead>{t('clients.colTrend')}</TableHead>
                    <TableHead>{t('clients.colLastActive')}</TableHead>
                    <TableHead className="w-20">{t('clients.colActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {client.name}
                          {client.is_static !== false ? (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1 rounded-sm">{t('clients.static') || 'Static'}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 rounded-sm text-muted-foreground">{t('clients.dynamic') || 'Dynamic'}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {(client.identifiers ?? []).slice(0, 3).map((id) => (
                            <span key={id} className="text-xs bg-muted rounded px-1.5 py-0.5 font-mono truncate max-w-full">
                              {id}
                            </span>
                          ))}
                          {(client.identifiers?.length ?? 0) > 3 && (
                            <span className="text-xs bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                              +{(client.identifiers?.length ?? 0) - 3}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {client.upstreams?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {client.upstreams.map((u) => (
                              <span key={u} className="text-xs font-mono bg-primary/10 px-1.5 py-0.5 rounded">
                                {u}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs">{t('clients.defaultUpstream')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.is_static === false ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <Switch
                                    checked={client.filter_enabled}
                                    disabled
                                    onCheckedChange={(checked) =>
                                      toggleFilterMutation.mutate({ id: client.id, filter_enabled: checked })
                                    }
                                  />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t('clients.dynamicFilterDisabledTip')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <Switch
                            checked={client.filter_enabled}
                            onCheckedChange={(checked) =>
                              toggleFilterMutation.mutate({ id: client.id, filter_enabled: checked })
                            }
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {client.tags?.map((tag) => (
                            <span key={tag} className="text-xs bg-accent text-accent-foreground rounded px-1.5 py-0.5">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {client.query_count != null && client.query_count > 0 ? client.query_count : '-'}
                      </TableCell>
                      <TableCell>
                        {client.query_count != null && client.query_count > 0
                          ? <ClientSparkline clientId={client.id} />
                          : <span className="text-xs text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {client.query_count != null && client.query_count > 0
                          ? formatDistanceToNow(new Date(client.updated_at), { addSuffix: true })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {client.is_static !== false ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title={t('clients.activityButtonTip')}
                              onClick={() => setActivityClient(client)}
                            >
                              <BarChart2 size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setEditing(client); setDialogOpen(true); }}
                            >
                              <Edit2 size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(client)}
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title={t('clients.activityButtonTip')}
                              onClick={() => setActivityClient(client)}
                            >
                              <BarChart2 size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title={t('clients.promoteToStatic') || 'Add to static list'}
                              onClick={() => {
                                // Create a new static record from this dynamic one
                                setEditing({
                                  ...client,
                                  id: '', // Empty ID means create new
                                });
                                setDialogOpen(true);
                              }}
                            >
                              <BookmarkPlus size={14} />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          );
          })()}
        </CardContent>
      </Card>

      {/* 创建/编辑对话框 */}
      <ClientDialog
        key={editing?.id ?? 'new'}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        client={editing}
      />

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clients.confirmDeleteDesc', { name: deleteTarget?.name })}
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

      {/* 活动时间线 */}
      {activityClient && (
        <ClientActivityDialog
          client={activityClient}
          onClose={() => setActivityClient(null)}
        />
      )}
    </div>
  );
}
