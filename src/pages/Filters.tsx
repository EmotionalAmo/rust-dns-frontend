import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filtersApi } from '@/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Info,
  ListFilter,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import type { Filter, CreateFilterRequest } from '@/api/types';

/**
 * Filters 页面
 * 管理过滤列表（AdGuard/hosts 格式）
 */

// 热门过滤列表推荐（名称/URL 保持原样，不做 i18n）
const POPULAR_FILTERS = [
  {
    name: 'AdGuard DNS Filter',
    url: 'https://filters.adtidy.org/extension/ublock/filters/3.txt',
    type: 'adguard' as const,
    description: 'AdGuard 官方过滤器',
  },
  {
    name: 'Peter Lowe\'s Ad and tracking server list',
    url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&mimetype=plaintext',
    type: 'hosts' as const,
    description: '广告和跟踪服务器列表',
  },
  {
    name: 'AdAway Default Blocklist',
    url: 'https://raw.githubusercontent.com/AdAway/adaway.github.io/master/hosts.txt',
    type: 'hosts' as const,
    description: 'AdAway 默认阻止列表',
  },
];

// 精选推荐 Filter Lists（页面内直接一键添加）
const RECOMMENDED_FILTERS = [
  {
    name: 'OISD Basic',
    url: 'https://basic.oisd.nl/',
    type: 'adguard' as const,
    descKey: 'filters.recommendedOisdBasic',
  },
  {
    name: 'AdGuard DNS Filter',
    url: 'https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt',
    type: 'adguard' as const,
    descKey: 'filters.recommendedAdGuardDns',
  },
  {
    name: 'EasyList China',
    url: 'https://easylist-downloads.adblockplus.org/easylistchina.txt',
    type: 'adguard' as const,
    descKey: 'filters.recommendedEasyListChina',
  },
  {
    name: "HaGeZi's Pro++ Blocklist",
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/pro.plus.txt',
    type: 'adguard' as const,
    descKey: 'filters.recommendedHagezi',
  },
  {
    name: '1Hosts (Lite)',
    url: 'https://raw.githubusercontent.com/nicholaswilde/block-lists/main/1hosts_lite.txt',
    type: 'hosts' as const,
    descKey: 'filters.recommendedOneHostsLite',
  },
];

// 根据 URL 判断过滤器类型（前端辅助函数）
function inferFilterType(url?: string | null): 'adguard' | 'hosts' {
  if (!url) return 'adguard';

  // Hosts 格式的常见标识
  const hostsKeywords = [
    'hostformat=hosts',
    'hosts.txt',
    '/hosts/',
    'pgl.yoyo.org',
    'adaway.github.io',
    'github.com/StevenBlack/hosts',
  ];

  const lowerUrl = url.toLowerCase();
  return hostsKeywords.some(keyword => lowerUrl.includes(keyword))
    ? 'hosts'
    : 'adguard';
}

interface CreateFilterFormData {
  name: string;
  url: string;
  type: 'adguard' | 'hosts';  // local UI only, not sent to backend
  is_enabled: boolean;
  update_interval_hours: number;
}

function FilterTypeSelector({
  value,
  onChange,
}: {
  value: CreateFilterFormData['type'];
  onChange: (type: CreateFilterFormData['type']) => void;
}) {
  const { t } = useTranslation();

  const FILTER_TYPES = [
    { value: 'adguard' as const, label: t('filters.typeAdguard'), description: t('filters.typeAdguardDesc') },
    { value: 'hosts' as const, label: t('filters.typeHosts'), description: t('filters.typeHostsDesc') },
  ];

  return (
    <div className="grid grid-cols-1 gap-2">
      {FILTER_TYPES.map((type) => {
        const isSelected = value === type.value;
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={cn(
              'flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all',
              isSelected
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-muted/50'
            )}
          >
            <Globe size={18} className={cn('mt-0.5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
            <div>
              <div className={cn('text-sm font-medium', isSelected ? 'text-primary' : 'text-foreground')}>
                {type.label}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{type.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function PopularFiltersList({
  onSelect,
}: {
  onSelect: (filter: { name: string; url: string; type: 'adguard' | 'hosts' }) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{t('filters.popular')}</Label>
      <div className="space-y-2">
        {POPULAR_FILTERS.map((filter, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(filter)}
            className="w-full flex items-start gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{filter.name}</div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">{filter.url}</div>
            </div>
            <Badge variant="outline" className="shrink-0">
              {filter.type === 'hosts' ? 'Hosts' : 'AdGuard'}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}

function CreateFilterDialog({
  open,
  onOpenChange,
  filter,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter?: Filter | null;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateFilterFormData>({
    name: filter?.name || '',
    url: filter?.url || '',
    type: filter ? inferFilterType(filter.url) : 'adguard',
    is_enabled: filter?.is_enabled ?? true,
    update_interval_hours: filter?.update_interval_hours ?? 0,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: filter?.name || '',
        url: filter?.url || '',
        type: filter ? inferFilterType(filter.url) : 'adguard',
        is_enabled: filter?.is_enabled ?? true,
        update_interval_hours: filter?.update_interval_hours ?? 0,
      });
    }
  }, [open, filter]);

  const createMutation = useMutation({
    mutationFn: filtersApi.createFilter,
    onSuccess: (data: { syncing?: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ['filters'] });
      onOpenChange(false);
      setFormData({ name: '', url: '', type: 'adguard', is_enabled: true, update_interval_hours: 0 });
      onSuccess();
      if (data?.syncing) {
        toast.success(t('filters.createSuccess'));
        // Poll for completion: refresh list every 3s for up to 60s
        let attempts = 0;
        const timer = setInterval(() => {
          attempts++;
          queryClient.invalidateQueries({ queryKey: ['filters'] });
          if (attempts >= 20) clearInterval(timer);
        }, 3000);
      } else {
        toast.success(t('filters.createSuccess'));
      }
    },
    onError: (error: Error) => {
      toast.error(t('filters.createError', { msg: error.message || '未知错误' }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateFilterRequest> }) =>
      filtersApi.updateFilter(id, data),
    onSuccess: () => {
      toast.success(t('filters.updateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['filters'] });
      onOpenChange(false);
      setFormData({ name: '', url: '', type: 'adguard', is_enabled: true, update_interval_hours: 0 });
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(t('filters.updateError', { msg: error.message || '未知错误' }));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(t('filters.nameRequired'));
      return;
    }

    if (filter) {
      updateMutation.mutate({ id: filter.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSelectPopularFilter = (popularFilter: { name: string; url: string; type: 'adguard' | 'hosts' }) => {
    setFormData({
      name: popularFilter.name,
      url: popularFilter.url,
      type: popularFilter.type,
      is_enabled: true,
      update_interval_hours: formData.update_interval_hours,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{filter ? t('filters.editTitle') : t('filters.createTitle')}</DialogTitle>
          <DialogDescription>
            {filter ? t('filters.editDesc') : t('filters.createDesc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* 热门推荐（仅创建时显示） */}
            {!filter && (
              <PopularFiltersList onSelect={handleSelectPopularFilter} />
            )}

            {/* 过滤器类型选择 */}
            <div className="space-y-2">
              <Label>{t('filters.filterType')}</Label>
              <FilterTypeSelector
                value={formData.type}
                onChange={(type) => setFormData({ ...formData, type })}
              />
            </div>

            {/* 名称输入 */}
            <div className="space-y-2">
              <Label htmlFor="name">{t('filters.nameLabel')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={formData.type === 'hosts' ? t('filters.namePlaceholderHosts') : t('filters.namePlaceholderAdguard')}
              />
            </div>

            {/* URL 输入 */}
            <div className="space-y-2">
              <Label htmlFor="url">
                {t('filters.urlLabel')} {formData.url ? '' : t('filters.urlHint')}
              </Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder={formData.type === 'hosts' ? "https://example.com/hosts.txt" : "https://example.com/filter.txt"}
              />
              <p className="text-xs text-muted-foreground">
                {t('filters.urlDesc')}
              </p>
            </div>

            {/* 启用状态 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('filters.enableFilter')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('filters.enableFilterDesc')}
                </p>
              </div>
              <Switch
                checked={formData.is_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
              />
            </div>

            {/* 自动更新频率（仅远程列表） */}
            {formData.url && (
              <div className="space-y-2">
                <Label>{t('filters.updateIntervalLabel')}</Label>
                <Select
                  value={String(formData.update_interval_hours)}
                  onValueChange={(v) => setFormData({ ...formData, update_interval_hours: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t('filters.intervalManual')}</SelectItem>
                    <SelectItem value="24">{t('filters.intervalDaily')}</SelectItem>
                    <SelectItem value="168">{t('filters.intervalWeekly')}</SelectItem>
                    <SelectItem value="720">{t('filters.intervalMonthly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 帮助提示 */}
            <div className="rounded-md bg-primary/10 p-3">
              <div className="flex items-start gap-2">
                <Info size={14} className="mt-0.5 text-primary shrink-0" />
                <div className="text-xs text-primary">
                  <p className="font-medium mb-1">{t('filters.aboutTitle')}</p>
                  <ul className="space-y-0.5">
                    <li>• {t('filters.aboutRemote')}</li>
                    <li>• {t('filters.aboutLocal')}</li>
                    <li>• {t('filters.aboutAdguardFormat')}</li>
                    <li>• {t('filters.aboutHostsFormat')}</li>
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
                  {filter ? t('common.update') : t('common.create')}
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
  filterIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  filterIds: string[];
}) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
          <AlertDialogDescription>
            {filterIds.length === 1
              ? `${t('filters.deleteConfirmSingle')} ${t('common.cannotUndo')}`
              : `${t('filters.deleteConfirmMultiple', { count: filterIds.length })} ${t('common.cannotUndo')}`}
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

export default function FiltersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<Filter | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [showRecommended, setShowRecommended] = useState(false);

  // 查询过滤列表
  const { data: filters = [], isLoading, error, refetch } = useQuery({
    queryKey: ['filters'],
    queryFn: filtersApi.listFilters,
  });

  // 过滤过滤列表
  const filteredFilters = filters.filter((filter) =>
    filter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    filter.url?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 切换过滤器启用状态
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_enabled }: { id: string; is_enabled: boolean }) =>
      filtersApi.updateFilter(id, { is_enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filters'] });
      toast.success(t('filters.statusUpdated'));
    },
    onError: (error: Error) => {
      toast.error(t('filters.updateError', { msg: error.message || '未知错误' }));
    },
  });

  // 删除过滤器
  const deleteMutation = useMutation({
    mutationFn: (id: string) => filtersApi.deleteFilter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filters'] });
      toast.success(t('filters.deletedCount', { count: selectedIds.size }));
    },
    onError: (error: Error) => {
      toast.error(t('filters.deleteError', { msg: error.message || '未知错误' }));
    },
  });

  // 刷新单个过滤器
  const refreshMutation = useMutation({
    mutationFn: (id: string) => filtersApi.refreshFilter(id),
    onSuccess: (data: { syncing?: boolean; rule_count?: number }) => {
      queryClient.invalidateQueries({ queryKey: ['filters'] });
      if (data?.syncing) {
        toast.success(t('filters.syncStarted'));
        let attempts = 0;
        const timer = setInterval(() => {
          attempts++;
          queryClient.invalidateQueries({ queryKey: ['filters'] });
          if (attempts >= 20) clearInterval(timer);
        }, 3000);
      } else {
        toast.success(t('filters.syncSuccess', { count: data?.rule_count ?? 0 }));
      }
    },
    onError: (error: Error) => {
      toast.error(t('filters.syncError', { msg: error.message || '未知错误' }));
    },
    onSettled: () => {
      setRefreshingId(null);
    },
  });

  // 刷新所有过滤器
  const refreshAllMutation = useMutation({
    mutationFn: () => filtersApi.refreshAllFilters(filters),
    onSuccess: (data: { anySyncing: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ['filters'] });
      if (data?.anySyncing) {
        toast.success(t('filters.refreshAllStarted'));
        let attempts = 0;
        const timer = setInterval(() => {
          attempts++;
          queryClient.invalidateQueries({ queryKey: ['filters'] });
          if (attempts >= 20) clearInterval(timer);
        }, 3000);
      } else {
        toast.success(t('filters.refreshAllSuccess'));
      }
    },
    onError: (error: Error) => {
      toast.error(t('filters.syncError', { msg: error.message || '未知错误' }));
    },
    onSettled: () => {
      setRefreshingAll(false);
    },
  });

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedIds.size === filteredFilters.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFilters.map(f => f.id)));
    }
  };

  // 切换单个过滤器选中
  const handleSelectFilter = (id: string) => {
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

  // 刷新单个过滤器
  const handleRefreshFilter = (id: string) => {
    setRefreshingId(id);
    refreshMutation.mutate(id);
  };

  // 刷新所有过滤器
  const handleRefreshAll = () => {
    setRefreshingAll(true);
    refreshAllMutation.mutate();
  };

  // 已有 URL 集合，用于推荐区块判断是否已添加
  const existingUrls = useMemo(() => new Set(filters.map(f => f.url).filter(Boolean)), [filters]);

  // 一键添加推荐 filter
  const addRecommendedMutation = useMutation({
    mutationFn: (item: typeof RECOMMENDED_FILTERS[number]) =>
      filtersApi.createFilter({ name: item.name, url: item.url, is_enabled: true, update_interval_hours: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filters'] });
      toast.success(t('filters.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(t('filters.createError', { msg: error.message || '未知错误' }));
    },
  });

  // 格式化时间
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('common.justNow');
    if (diffMins < 60) return t('common.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('common.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('common.daysAgo', { count: diffDays });

    return date.toLocaleDateString(undefined);
  };

  // 计算统计
  const totalRules = filters.reduce((sum, f) => sum + (f.rule_count || 0), 0);
  const enabledFilters = filters.filter(f => f.is_enabled).length;
  const remoteFilters = filters.filter(f => f.url).length;

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('filters.totalRules')}</CardTitle>
            <ListFilter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRules.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{t('filters.fromLists', { count: enabledFilters })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('filters.enabledFilters')}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enabledFilters}</div>
            <p className="text-xs text-muted-foreground">{t('filters.totalFilters', { count: filters.length })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('filters.remoteSubscriptions')}</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{remoteFilters}</div>
            <p className="text-xs text-muted-foreground">{t('filters.autoSync')}</p>
          </CardContent>
        </Card>
      </div>

      {/* 头部操作栏 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          {/* 搜索框 */}
          <input
            type="text"
            placeholder={t('filters.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* 刷新全部按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={refreshingAll || isLoading || enabledFilters === 0}
          >
            <RefreshCw size={16} className={refreshingAll ? 'animate-spin' : ''} />
            <span className="hidden sm:inline ml-1">{t('filters.refreshAll')}</span>
          </Button>
          {/* 删除按钮 */}
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 size={16} className="mr-1" />
              {t('filters.deleteSelected', { count: selectedIds.size })}
            </Button>
          )}
          {/* 创建按钮 */}
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus size={16} className="mr-1" />
            {t('filters.addFilter')}
          </Button>
        </div>
      </div>

      {/* 过滤器表格 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('filters.tableTitle')}</CardTitle>
              <CardDescription>
                {searchQuery
                  ? t('filters.tableCount', { count: filters.length, matched: filteredFilters.length })
                  : t('filters.tableCountAll', { count: filters.length })}
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
                <AlertCircle size={48} className="mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">{t('filters.loadError')}</p>
                <Button variant="outline" onClick={() => refetch()}>
                  {t('common.retry')}
                </Button>
              </div>
            </div>
          ) : filteredFilters.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-center">
              <div className="space-y-4 max-w-md">
                <ListFilter size={48} className="mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">{t('filters.emptyState')}</p>
                  <p className="text-muted-foreground">
                    {searchQuery ? t('filters.emptySearch') : t('filters.emptyHint')}
                  </p>
                </div>
                {!searchQuery && (
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus size={16} className="mr-1" />
                    {t('filters.addFilter')}
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
                        checked={filteredFilters.length > 0 && selectedIds.size === filteredFilters.length}
                        onCheckedChange={handleSelectAll}
                        aria-label={t('common.selectAll')}
                      />
                    </TableHead>
                    <TableHead>{t('filters.colName')}</TableHead>
                    <TableHead>{t('filters.colType')}</TableHead>
                    <TableHead>{t('filters.colRules')}</TableHead>
                    <TableHead>{t('filters.colStatus')}</TableHead>
                    <TableHead>{t('filters.colLastUpdated')}</TableHead>
                    <TableHead className="w-32">{t('filters.colActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFilters.map((filter) => {
                    const isRefreshing = refreshingId === filter.id;
                    return (
                      <TableRow
                        key={filter.id}
                        className={selectedIds.has(filter.id) ? 'bg-primary/10' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(filter.id)}
                            onCheckedChange={() => handleSelectFilter(filter.id)}
                            aria-label={t('filters.selectItem', { name: filter.name })}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{filter.name}</span>
                              {filter.url && (
                                <a
                                  href={filter.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-foreground"
                                  title={filter.url}
                                >
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                            {filter.url && (
                              <div className="text-xs text-muted-foreground truncate max-w-xs">
                                {filter.url}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {inferFilterType(filter.url) === 'hosts' ? 'Hosts' : 'AdGuard'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono">
                            {filter.rule_count?.toLocaleString() ?? '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={filter.is_enabled}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ id: filter.id, is_enabled: checked })
                            }
                            disabled={toggleMutation.isPending}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              {filter.last_updated ? (
                                <>
                                  <Clock size={12} />
                                  {formatDate(filter.last_updated)}
                                </>
                              ) : (
                                <span>-</span>
                              )}
                            </div>
                            {filter.url && (filter.update_interval_hours ?? 0) > 0 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                                <RefreshCw size={9} />
                                {filter.update_interval_hours === 24
                                  ? t('filters.intervalDaily')
                                  : filter.update_interval_hours === 168
                                  ? t('filters.intervalWeekly')
                                  : t('filters.intervalMonthly')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {filter.url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRefreshFilter(filter.id)}
                                disabled={isRefreshing || !filter.is_enabled}
                                title={t('filters.refreshTitle')}
                              >
                                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingFilter(filter)}
                              title={t('common.edit')}
                            >
                              <Edit2 size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setSelectedIds(new Set([filter.id]));
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

      {/* 精选推荐 Filter Lists */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t('filters.recommendedTitle')}</CardTitle>
              <CardDescription>{t('filters.recommendedDesc')}</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRecommended((v) => !v)}
              className="shrink-0"
            >
              {showRecommended ? t('filters.recommendedCollapse') : t('filters.recommendedExpand')}
            </Button>
          </div>
        </CardHeader>
        {showRecommended && (
          <CardContent>
            <div className="space-y-2">
              {RECOMMENDED_FILTERS.map((item) => {
                const isAdded = existingUrls.has(item.url);
                return (
                  <div
                    key={item.url}
                    className="flex items-center justify-between rounded-md border px-3 py-2.5 gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {item.type === 'hosts' ? 'Hosts' : 'AdGuard'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t(item.descKey)}</div>
                      <div className="text-xs text-muted-foreground/70 truncate font-mono mt-0.5">{item.url}</div>
                    </div>
                    <Button
                      size="sm"
                      variant={isAdded ? 'secondary' : 'outline'}
                      disabled={isAdded || addRecommendedMutation.isPending}
                      onClick={() => !isAdded && addRecommendedMutation.mutate(item)}
                      className="shrink-0 h-8"
                    >
                      {isAdded ? (
                        <><CheckCircle2 size={13} className="mr-1 text-green-600" />{t('filters.recommendedAdded')}</>
                      ) : (
                        <><Plus size={13} className="mr-1" />{t('filters.recommendedAdd')}</>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* 创建过滤器对话框 */}
      <CreateFilterDialog
        open={createDialogOpen || editingFilter !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingFilter(null);
          }
        }}
        filter={editingFilter}
        onSuccess={() => {
          setCreateDialogOpen(false);
          setEditingFilter(null);
        }}
      />

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        filterIds={Array.from(selectedIds)}
      />
    </div>
  );
}
