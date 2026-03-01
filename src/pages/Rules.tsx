import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rulesApi } from '@/api';
import type { Rule } from '@/api/types';
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
import { Input } from '@/components/ui/input';
import { RuleInput } from '@/components/RuleInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  Shield,
  XCircle,
  CheckCircle2,
  Download,
  ChevronLeft,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Edit2,
} from 'lucide-react';
import { formatDateTimeShort } from '@/lib/datetime';

const PER_PAGE = 50;

function inferRuleType(rule: string): 'block' | 'allow' {
  return rule.trim().startsWith('@@') ? 'allow' : 'block';
}

interface CreateRuleFormData {
  rule: string;
  comment: string;
}

interface EditRuleFormData {
  rule: string;
  comment: string;
  is_enabled: boolean;
}

function CreateRuleDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateRuleFormData>({
    rule: '',
    comment: '',
  });

  const createMutation = useMutation({
    mutationFn: () => rulesApi.createRule({
      rule: formData.rule.trim(),
      comment: formData.comment.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success(t('rules.createSuccess'));
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      onOpenChange(false);
      setFormData({ rule: '', comment: '' });
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(t('rules.createError', { msg: error.message || '未知错误' }));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.rule.trim()) {
      toast.error(t('rules.ruleRequired'));
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('rules.dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('rules.dialogDesc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rule">{t('rules.ruleContent')}</Label>
              <RuleInput
                id="rule"
                value={formData.rule}
                onChange={(value) => setFormData({ ...formData, rule: value })}
                ruleType="filter"
                placeholder={t('rules.rulePlaceholder')}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {t('rules.formatHint')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">{t('rules.ruleNote')}</Label>
              <Input
                id="comment"
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder={t('rules.ruleNotePlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <><RefreshCw size={16} className="mr-2 animate-spin" />{t('common.saving')}</>
              ) : (
                <><Plus size={16} className="mr-1" />{t('common.create')}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditRuleDialogContent({
  onSuccess,
  rule,
}: {
  onSuccess: () => void;
  rule: Rule;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<EditRuleFormData>(() => ({
    rule: rule.rule,
    comment: rule.comment || '',
    is_enabled: rule.is_enabled,
  }));

  const updateMutation = useMutation({
    mutationFn: () =>
      rulesApi.updateRule(rule.id, {
        rule: formData.rule.trim(),
        comment: formData.comment.trim() || undefined,
        is_enabled: formData.is_enabled,
      }),
    onSuccess: () => {
      toast.success(t('rules.updateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(t('rules.updateError', { msg: error.message || '未知错误' }));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.rule.trim()) {
      toast.error(t('rules.ruleRequired'));
      return;
    }
    updateMutation.mutate();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t('rules.editDialogTitle')}</DialogTitle>
        <DialogDescription>
          {t('rules.editDialogDesc')}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rule">{t('rules.ruleContent')}</Label>
            <RuleInput
              id="rule"
              value={formData.rule}
              onChange={(value) => setFormData({ ...formData, rule: value })}
              ruleType="filter"
              placeholder={t('rules.rulePlaceholder')}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {t('rules.formatHint')}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment">{t('rules.ruleNote')}</Label>
            <Input
              id="comment"
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder={t('rules.ruleNotePlaceholder')}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_enabled"
              checked={formData.is_enabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_enabled: checked === true })
              }
            />
            <Label htmlFor="is_enabled">{t('rules.enableRule')}</Label>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onSuccess()}
            disabled={updateMutation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <><RefreshCw size={16} className="mr-2 animate-spin" />{t('common.saving')}</>
            ) : (
              <><RefreshCw size={16} className="mr-1" />{t('common.save')}</>
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function EditRuleDialog({
  open,
  onOpenChange,
  rule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: Rule | null;
}) {
  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <EditRuleDialogContent onSuccess={() => onOpenChange(false)} rule={rule} />
    </Dialog>
  );
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  count,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  count: number;
}) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('rules.confirmDeleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {count === 1 ? t('rules.confirmDeleteOne') : t('rules.confirmDeleteMany', { count })}{t('common.cannotUndo')}
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

export default function RulesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showExamples, setShowExamples] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const toggleMutationRef = useRef<{ isPending: boolean }>({ isPending: false });

  const RULE_EXAMPLES = [
    {
      category: t('rules.exampleBasic'),
      examples: [
        '||example.com^ - 阻断 example.com 及其子域名',
        '||ads.example.com^ - 阻断特定子域名',
      ],
    },
    {
      category: t('rules.exampleWhitelist'),
      examples: [
        '@@||example.com^ - 允许 example.com（优先于阻断规则）',
      ],
    },
    {
      category: t('rules.exampleHosts'),
      examples: [
        '0.0.0.0 example.com - hosts 格式阻断',
      ],
    },
  ];

  // 搜索防抖：300ms 后触发，同时重置页码
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['rules', page, debouncedSearch],
    queryFn: () => rulesApi.listRules({ page, per_page: PER_PAGE, search: debouncedSearch || undefined }),
    placeholderData: (prev) => prev, // 翻页时保留旧数据避免闪烁
  });

  const rules = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const bulkMutation = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: 'enable' | 'disable' | 'delete' }) =>
      rulesApi.bulkAction(ids, action),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      setSelectedIds(new Set());
      if (variables.action === 'enable') {
        toast.success(t('rules.enabledCount', { count: data.affected }));
      } else if (variables.action === 'disable') {
        toast.success(t('rules.disabledCount', { count: data.affected }));
      } else {
        toast.success(t('rules.deletedCount', { count: data.affected }));
      }
    },
    onError: (error: Error) => {
      toast.error(t('rules.batchError', { msg: error.message || '未知错误' }));
    },
  });

  // 单个规则切换状态的 mutation（使用普通函数避免 ref 问题）
  const handleToggleRule = async (rule: Rule) => {
    if (toggleMutationRef.current.isPending) return;

    toggleMutationRef.current.isPending = true;
    try {
      const newState = !rule.is_enabled;
      await rulesApi.toggleRule(rule.id, { is_enabled: newState });
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      toast.success(newState ? t('rules.enabled') : t('rules.disabled'));
    } catch (error: any) {
      toast.error(t('rules.toggleError', { msg: error.message || '未知错误' }));
    } finally {
      toggleMutationRef.current.isPending = false;
    }
  };

  // 单个规则编辑
  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
    setEditDialogOpen(true);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === rules.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rules.map((r: Rule) => r.id)));
    }
  };

  const handleSelectRule = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleDeleteConfirm = () => {
    if (selectedIds.size === 0) return;
    bulkMutation.mutate({ ids: Array.from(selectedIds), action: 'delete' });
    setDeleteDialogOpen(false);
  };

  const handleBulkEnable = () => {
    if (selectedIds.size === 0) return;
    bulkMutation.mutate({ ids: Array.from(selectedIds), action: 'enable' });
  };

  const handleBulkDisable = () => {
    if (selectedIds.size === 0) return;
    bulkMutation.mutate({ ids: Array.from(selectedIds), action: 'disable' });
  };

  const formatDate = formatDateTimeShort;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await rulesApi.exportRules(exportFormat);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rules-${new Date().toISOString().slice(0, 10)}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      console.error('Export failed:', error);
      toast.error(t('rules.exportError'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部操作栏 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <input
            type="text"
            placeholder={t('rules.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          <div className="h-6 w-px bg-border" />
          <Select value={exportFormat} onValueChange={(val) => setExportFormat(val as 'csv' | 'json')}>
            <SelectTrigger className="h-8 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download size={14} className="mr-1" />
            {isExporting ? t('common.exporting') : t('common.export')}
          </Button>
          {selectedIds.size > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkEnable}
                disabled={bulkMutation.isPending}
              >
                <ToggleRight size={14} className="mr-1 text-green-600" />
                {t('rules.enableSelected', { count: selectedIds.size })}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDisable}
                disabled={bulkMutation.isPending}
              >
                <ToggleLeft size={14} className="mr-1 text-orange-500" />
                {t('rules.disableSelected', { count: selectedIds.size })}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)} disabled={bulkMutation.isPending}>
                <Trash2 size={16} className="mr-1" />
                {t('rules.deleteSelected', { count: selectedIds.size })}
              </Button>
            </>
          )}
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus size={16} className="mr-1" />
            {t('rules.addRule')}
          </Button>
        </div>
      </div>

      {/* 规则表格 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('rules.title')}</CardTitle>
              <CardDescription>
                {t('rules.totalCount', { count: total })}
                {debouncedSearch && t('rules.searchMatch', { keyword: debouncedSearch })}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && rules.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={32} className="animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-center">
              <div className="space-y-2">
                <Shield size={48} className="mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">{t('common.loadFailed')}</p>
                <Button variant="outline" onClick={() => refetch()}>{t('common.retry')}</Button>
              </div>
            </div>
          ) : rules.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-center">
              <div className="space-y-4 max-w-md">
                <Shield size={48} className="mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">{t('rules.emptyState')}</p>
                  <p className="text-muted-foreground">
                    {debouncedSearch ? t('rules.emptySearch') : t('rules.emptyHint')}
                  </p>
                </div>
                {!debouncedSearch && (
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus size={16} className="mr-1" />{t('rules.addRule')}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-md border mx-6 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.size === rules.length && rules.length > 0}
                          onCheckedChange={handleSelectAll}
                          aria-label={t('common.selectAll')}
                        />
                      </TableHead>
                      <TableHead>{t('rules.colStatus')}</TableHead>
                      <TableHead>{t('rules.colRule')}</TableHead>
                      <TableHead>{t('rules.colType')}</TableHead>
                      <TableHead>{t('rules.colNote')}</TableHead>
                      <TableHead>{t('rules.colCreatedAt')}</TableHead>
                      <TableHead className="w-20">{t('rules.colActions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule: Rule) => {
                      const ruleType = inferRuleType(rule.rule);
                      return (
                        <TableRow
                          key={rule.id}
                          className={selectedIds.has(rule.id) ? 'bg-primary/10' : ''}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(rule.id)}
                              onCheckedChange={() => handleSelectRule(rule.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleToggleRule(rule)}
                              className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
                              disabled={toggleMutationRef.current.isPending}
                            >
                              {rule.is_enabled ? (
                                <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/20">
                                  <CheckCircle2 size={12} className="mr-1" />{t('rules.statusEnabled')}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground border-gray-300 bg-gray-50 dark:bg-gray-950/20">
                                  <XCircle size={12} className="mr-1" />{t('rules.statusDisabled')}
                                </Badge>
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                              {rule.rule}
                            </code>
                          </TableCell>
                          <TableCell>
                            {ruleType === 'allow' ? (
                              <Badge variant="outline" className="text-green-600 border-green-300">
                                <CheckCircle2 size={12} className="mr-1" />{t('rules.typeAllow')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-600 border-red-300">
                                <XCircle size={12} className="mr-1" />{t('rules.typeBlock')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {rule.comment || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(rule.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRule(rule)}
                                disabled={toggleMutationRef.current.isPending}
                                title={t('common.edit')}
                              >
                                <Edit2 size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setSelectedIds(new Set([rule.id]));
                                  setDeleteDialogOpen(true);
                                }}
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

              {/* 分页控件 */}
              <div className="flex items-center justify-between px-6 py-4">
                <p className="text-sm text-muted-foreground">
                  第 {page} / {totalPages} 页，每页 {PER_PAGE} 条，共 {total} 条
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(1)}
                    disabled={page <= 1 || isLoading}
                  >
                    {t('common.firstPage')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p - 1)}
                    disabled={page <= 1 || isLoading}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages || isLoading}
                  >
                    <ChevronRight size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages || isLoading}
                  >
                    {t('common.lastPage')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 规则格式说明 */}
      <Card>
        <CardHeader>
          <button
            onClick={() => setShowExamples(!showExamples)}
            className="flex items-center justify-between w-full"
          >
            <CardTitle className="flex items-center gap-2">
              <Info size={18} />{t('rules.examplesTitle')}
            </CardTitle>
            {showExamples ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </CardHeader>
        {showExamples && (
          <CardContent className="space-y-4">
            {RULE_EXAMPLES.map((cat, idx) => (
              <div key={idx}>
                <h4 className="font-medium text-sm mb-2">{cat.category}</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {cat.examples.map((ex, i) => (
                    <li key={i} className="font-mono">{ex}</li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      <CreateRuleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => setCreateDialogOpen(false)}
      />

      <EditRuleDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        rule={editingRule}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        count={selectedIds.size}
      />
    </div>
  );
}
