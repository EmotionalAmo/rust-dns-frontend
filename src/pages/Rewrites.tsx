import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rewritesApi } from '@/api';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { formatDateTimeShort } from '@/lib/datetime';
import { ValidatedInput } from '@/components/ValidatedInput';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Info,
  Route,
  Server,
  User,
  Clock,
  ExternalLink,
  Copy,
} from 'lucide-react';
import type { Rewrite, CreateRewriteRequest } from '@/api/types';

/**
 * Rewrites 页面
 * 管理 DNS 重写规则（域名 -> IP 映射）
 */

// 常用本地服务 IP
const LOCAL_SERVICE_IPS = [
  { ip: '127.0.0.1', label: 'Localhost' },
  { ip: '192.168.1.1', label: 'Router (常见)' },
  { ip: '10.0.0.1', label: 'Gateway (常见)' },
  { ip: '172.16.0.1', label: 'Private Network' },
];

// 常用重写示例
const COMMON_REWRITES = [
  { domain: 'myapp.local', ip: '127.0.0.1', description: '本地开发环境' },
  { domain: 'nas.local', ip: '192.168.1.100', description: 'NAS 设备' },
  { domain: 'pihole.local', ip: '192.168.1.50', description: 'Pi-hole' },
  { domain: 'homeassistant.local', ip: '192.168.1.80', description: 'Home Assistant' },
];

interface CreateRewriteFormData {
  domain: string;
  answer: string;
}

function IpSelector({
  onChange,
}: {
  value?: string;
  onChange: (ip: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{t('rewrites.commonAddresses')}</Label>
      <div className="flex flex-wrap gap-2">
        {LOCAL_SERVICE_IPS.map((item) => (
          <button
            key={item.ip}
            type="button"
            onClick={() => onChange(item.ip)}
            className="px-3 py-1.5 text-xs rounded-md border border-input hover:bg-muted/50 transition-colors"
          >
            {item.ip}
          </button>
        ))}
      </div>
    </div>
  );
}

function CommonRewritesList({
  onSelect,
}: {
  onSelect: (rewrite: { domain: string; ip: string }) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{t('rewrites.commonExamples')}</Label>
      <div className="space-y-1">
        {COMMON_REWRITES.map((item, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelect({ domain: item.domain, ip: item.ip })}
            className="w-full flex items-center justify-between rounded-md border border-input px-3 py-2 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium font-mono truncate">{item.domain}</div>
              <div className="text-xs text-muted-foreground truncate">{item.description}</div>
            </div>
            <div className="text-xs text-muted-foreground font-mono">{item.ip}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CreateRewriteDialog({
  open,
  onOpenChange,
  rewrite,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rewrite?: Rewrite | null;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateRewriteFormData>({
    domain: rewrite?.domain || '',
    answer: rewrite?.answer || '',
  });

  const createMutation = useMutation({
    mutationFn: rewritesApi.createRewrite,
    onSuccess: () => {
      toast.success(t('rewrites.createSuccess'));
      queryClient.invalidateQueries({ queryKey: ['rewrites'] });
      onOpenChange(false);
      setFormData({ domain: '', answer: '' });
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(t('rewrites.createError', { msg: error.message || '未知错误' }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRewriteRequest> }) =>
      rewritesApi.updateRewrite(id, data),
    onSuccess: () => {
      toast.success(t('rewrites.updateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['rewrites'] });
      onOpenChange(false);
      setFormData({ domain: '', answer: '' });
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(t('rewrites.updateError', { msg: error.message || '未知错误' }));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.domain.trim()) {
      toast.error(t('rewrites.domainRequired'));
      return;
    }
    if (!formData.answer.trim()) {
      toast.error(t('rewrites.ipRequired'));
      return;
    }

    // 验证 IP 格式（简单验证）
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    if (!ipRegex.test(formData.answer)) {
      toast.error(t('rewrites.ipInvalid'));
      return;
    }

    if (rewrite) {
      updateMutation.mutate({ id: rewrite.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSelectCommonRewrite = (item: { domain: string; ip: string }) => {
    setFormData({ domain: item.domain, answer: item.ip });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{rewrite ? t('rewrites.editTitle') : t('rewrites.createTitle')}</DialogTitle>
          <DialogDescription>
            {rewrite ? t('rewrites.editDesc') : t('rewrites.createDesc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* 常用示例（仅创建时显示） */}
            {!rewrite && (
              <CommonRewritesList onSelect={handleSelectCommonRewrite} />
            )}

            {/* 域名输入 */}
            <ValidatedInput
              id="domain"
              label={t('rewrites.domainLabel')}
              type="domain"
              value={formData.domain}
              onChange={(value) => setFormData({ ...formData, domain: value })}
              placeholder={t('rewrites.domainPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">
              {t('rewrites.domainHint')}
            </p>

            {/* 目标 IP 输入 */}
            <IpSelector
              value={formData.answer}
              onChange={(ip) => setFormData({ ...formData, answer: ip })}
            />
            <ValidatedInput
              id="target"
              label={t('rewrites.targetIPLabel')}
              type="ip"
              value={formData.answer}
              onChange={(value) => setFormData({ ...formData, answer: value })}
              placeholder={t('rewrites.targetIPPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">
              {t('rewrites.ipHint')}
            </p>

            {/* 启用状态 */}
            {/* 重写规则创建后立即生效 */}

            {/* 帮助提示 */}
            <div className="rounded-md bg-primary/10 p-3">
              <div className="flex items-start gap-2">
                <Info size={14} className="mt-0.5 text-primary shrink-0" />
                <div className="text-xs text-primary">
                  <p className="font-medium mb-1">{t('rewrites.aboutTitle')}</p>
                  <ul className="space-y-0.5">
                    <li>• {t('rewrites.aboutBullet1')}</li>
                    <li>• {t('rewrites.aboutBullet2')}</li>
                    <li>• {t('rewrites.aboutBullet3')}</li>
                    <li>• {t('rewrites.aboutBullet4')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <Plus size={16} className="mr-1" />
                  {rewrite ? t('common.update') : t('common.create')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  rewriteIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  rewriteIds: string[];
}) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
          <AlertDialogDescription>
            {rewriteIds.length === 1
              ? t('rewrites.deleteConfirmSingle')
              : t('rewrites.deleteConfirmMultiple', { count: rewriteIds.length })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function RewritesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRewrite, setEditingRewrite] = useState<Rewrite | null>(null);

  // 查询重写规则列表
  const { data: rewrites = [], isLoading, error, refetch } = useQuery({
    queryKey: ['rewrites'],
    queryFn: rewritesApi.listRewrites,
  });

  // 过滤重写规则
  const filteredRewrites = rewrites.filter((rewrite) =>
    rewrite.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rewrite.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 删除重写规则
  const deleteMutation = useMutation({
    mutationFn: (id: string) => rewritesApi.deleteRewrite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewrites'] });
      toast.success(t('rewrites.deletedCount', { count: selectedIds.size }));
    },
    onError: (error: Error) => {
      toast.error(t('rewrites.deleteError', { msg: error.message || '未知错误' }));
    },
  });

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedIds.size === filteredRewrites.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRewrites.map(r => r.id)));
    }
  };

  // 切换单个重写规则选中
  const handleSelectRewrite = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 确认删除
  const handleDeleteConfirm = () => {
    if (selectedIds.size === 0) return;
    Promise.all(Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id))).then(() => {
      setSelectedIds(new Set());
      setDeleteDialogOpen(false);
    });
  };

  const formatDate = formatDateTimeShort;

  // 测试 DNS 解析（使用 dig 命令显示）
  const handleTestDns = (domain: string) => {
    const command = `dig @127.0.0.1 -p 15353 ${domain} A +short`;
    navigator.clipboard.writeText(command);
    toast.success(t('rewrites.testCopied'));
  };

  // 计算统计
  const enabledRewrites = rewrites.length;
  const localIps = rewrites.filter(r => r.answer.startsWith('192.168.') || r.answer.startsWith('10.') || r.answer.startsWith('127.')).length;
  const customIps = rewrites.length - localIps;

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('rewrites.title')}</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rewrites.length}</div>
            <p className="text-xs text-muted-foreground">{t('rewrites.enabledCount', { count: enabledRewrites })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('rewrites.lanAddresses')}</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{localIps}</div>
            <p className="text-xs text-muted-foreground">192.168.x.x / 10.x.x.x / 127.x.x.x</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('rewrites.customAddresses')}</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customIps}</div>
            <p className="text-xs text-muted-foreground">{t('rewrites.otherIPs')}</p>
          </CardContent>
        </Card>
      </div>

      {/* 头部操作栏 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          {/* 搜索框 */}
          <input
            type="text"
            placeholder={t('rewrites.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* 刷新按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          {/* 删除按钮 */}
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 size={16} className="mr-1" />
              {t('rewrites.deleteSelected', { count: selectedIds.size })}
            </Button>
          )}
          {/* 创建按钮 */}
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus size={16} className="mr-1" />
            {t('rewrites.addRewrite')}
          </Button>
        </div>
      </div>

      {/* 重写规则表格 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('rewrites.tableTitle')}</CardTitle>
              <CardDescription>
                {searchQuery
                  ? t('rewrites.tableCount', { count: rewrites.length, matched: filteredRewrites.length })
                  : t('rewrites.tableCount', { count: rewrites.length, matched: rewrites.length })}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={32} className="animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-center">
              <div className="space-y-2">
                <Route size={48} className="mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">{t('rewrites.loadError')}</p>
                <Button variant="outline" onClick={() => refetch()}>
                  {t('common.retry')}
                </Button>
              </div>
            </div>
          ) : filteredRewrites.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-center">
              <div className="space-y-4 max-w-md">
                <Route size={48} className="mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">{t('rewrites.emptyState')}</p>
                  <p className="text-muted-foreground">
                    {searchQuery ? t('rewrites.emptySearch') : t('rewrites.emptyHint')}
                  </p>
                </div>
                {!searchQuery && (
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus size={16} className="mr-1" />
                    {t('rewrites.addRewrite')}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.size === filteredRewrites.length}
                        onCheckedChange={handleSelectAll}
                        aria-label="全选"
                      />
                    </TableHead>
                    <TableHead>{t('rewrites.colDomain')}</TableHead>
                    <TableHead>{t('rewrites.colTargetIP')}</TableHead>
                    <TableHead>{t('rewrites.colCreatedAt')}</TableHead>
                    <TableHead className="w-32">{t('rewrites.colActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRewrites.map((rewrite) => {
                    const isLocalIp =
                      rewrite.answer.startsWith('192.168.') ||
                      rewrite.answer.startsWith('10.') ||
                      rewrite.answer.startsWith('127.');

                    return (
                      <TableRow
                        key={rewrite.id}
                        className={selectedIds.has(rewrite.id) ? 'bg-primary/10' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(rewrite.id)}
                            onCheckedChange={() => handleSelectRewrite(rewrite.id)}
                            aria-label={`选择重写规则 ${rewrite.domain}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                              {rewrite.domain}
                            </code>
                            <button
                              onClick={() => navigator.clipboard.writeText(rewrite.domain)}
                              className="text-muted-foreground hover:text-foreground"
                              title={t('rewrites.copyDomain')}
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                              {rewrite.answer}
                            </code>
                            {isLocalIp && (
                              <span title={t('rewrites.lanAddress')}>
                                <Server size={14} className="text-muted-foreground" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(rewrite.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTestDns(rewrite.domain)}
                              title={t('rewrites.testResolve')}
                            >
                              <ExternalLink size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingRewrite(rewrite)}
                              title={t('common.edit')}
                            >
                              <Edit2 size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setSelectedIds(new Set([rewrite.id]));
                                setDeleteDialogOpen(true);
                              }}
                              title={t('common.delete')}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建重写规则对话框 */}
      <CreateRewriteDialog
        key={editingRewrite?.id ?? 'new'}
        open={createDialogOpen || editingRewrite !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingRewrite(null);
          }
        }}
        rewrite={editingRewrite}
        onSuccess={() => {
          setCreateDialogOpen(false);
          setEditingRewrite(null);
        }}
      />

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        rewriteIds={Array.from(selectedIds)}
      />
    </div>
  );
}
