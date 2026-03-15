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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  Play,
  Upload,
  Search,
  Wrench,
  Clock,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDateTimeShort } from '@/lib/datetime';
import { sandboxApi, type SandboxResponse } from '@/api/sandbox';
import { domainCheckApi, type DomainCheckResult } from '@/api/domainCheck';
import { ruleStatsApi } from '@/api/ruleStats';

const PER_PAGE = 50;

function inferRuleType(rule: string): 'block' | 'allow' {
  return rule.trim().startsWith('@@') ? 'allow' : 'block';
}

// 计算相对时间字符串，如 "2h 15m" / "1d 3h" / null（已过期）
function formatTimeRemaining(expiresAt: string): string | null {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function ExpiryBadge({ expiresAt }: { expiresAt?: string | null }) {
  const { t } = useTranslation();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => forceUpdate((n) => n + 1), 60000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!expiresAt) return null;

  const remaining = formatTimeRemaining(expiresAt);
  if (remaining === null) {
    return (
      <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 dark:bg-red-950/20 text-xs">
        <Clock size={10} className="mr-1" />{t('rules.expired')}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950/20 text-xs">
      <Clock size={10} className="mr-1" />{t('rules.expiresIn', { time: remaining })}
    </Badge>
  );
}

// 快速选择临时规则的选项（小时数，0 = 永久）
const EXPIRY_OPTIONS = [
  { label: 'rules.permanent', hours: 0 },
  { label: 'rules.1h', hours: 1 },
  { label: 'rules.2h', hours: 2 },
  { label: 'rules.6h', hours: 6 },
  { label: 'rules.24h', hours: 24 },
] as const;

function calcExpiresAt(hours: number): string | null {
  if (hours === 0) return null;
  return new Date(Date.now() + hours * 3600000).toISOString();
}

interface CreateRuleFormData {
  rule: string;
  comment: string;
  expires_at: string | null;
}

type CreateMode = 'simple' | 'expert';
type RuleAction = 'block' | 'allow';

function buildSimpleRule(action: RuleAction, domain: string): string {
  const d = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!d) return '';
  return action === 'allow' ? `@@||${d}^` : `||${d}^`;
}

interface EditRuleFormData {
  rule: string;
  comment: string;
  is_enabled: boolean;
  expires_at: string | null;
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
  const [mode, setMode] = useState<CreateMode>('simple');
  const [formData, setFormData] = useState<CreateRuleFormData>({
    rule: '',
    comment: '',
    expires_at: null,
  });
  const [simpleAction, setSimpleAction] = useState<RuleAction>('block');
  const [simpleDomain, setSimpleDomain] = useState('');
  const [simpleComment, setSimpleComment] = useState('');
  const [expiryHours, setExpiryHours] = useState(0);

  const handleClose = (val: boolean) => {
    if (!val) {
      setFormData({ rule: '', comment: '', expires_at: null });
      setSimpleDomain('');
      setSimpleComment('');
      setSimpleAction('block');
      setMode('simple');
      setExpiryHours(0);
    }
    onOpenChange(val);
  };

  const createMutation = useMutation({
    mutationFn: (payload: { rule: string; comment?: string; expires_at?: string | null }) =>
      rulesApi.createRule(payload),
    onSuccess: () => {
      toast.success(t('rules.createSuccess'));
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      handleClose(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(t('rules.createError', { msg: error.message || '未知错误' }));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expiresAt = calcExpiresAt(expiryHours);
    if (mode === 'simple') {
      const domain = simpleDomain.trim();
      if (!domain) {
        toast.error(t('rules.simpleDomainRequired'));
        return;
      }
      const rule = buildSimpleRule(simpleAction, domain);
      createMutation.mutate({ rule, comment: simpleComment.trim() || undefined, expires_at: expiresAt });
    } else {
      if (!formData.rule.trim()) {
        toast.error(t('rules.ruleRequired'));
        return;
      }
      createMutation.mutate({
        rule: formData.rule.trim(),
        comment: formData.comment.trim() || undefined,
        expires_at: expiresAt,
      });
    }
  };

  const previewRule = simpleDomain.trim()
    ? buildSimpleRule(simpleAction, simpleDomain)
    : '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('rules.dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('rules.dialogDesc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs value={mode} onValueChange={(v) => setMode(v as CreateMode)} className="pt-2">
            <TabsList className="w-full">
              <TabsTrigger value="simple" className="flex-1">{t('rules.simpleMode')}</TabsTrigger>
              <TabsTrigger value="expert" className="flex-1">{t('rules.expertMode')}</TabsTrigger>
            </TabsList>

            <TabsContent value="simple">
              <div className="space-y-4 py-4">
                {/* 操作类型 */}
                <div className="space-y-2">
                  <Label>{t('rules.simpleAction')}</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSimpleAction('block')}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border py-2 text-sm font-medium transition-colors ${
                        simpleAction === 'block'
                          ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <XCircle size={14} />
                      {t('rules.simpleActionBlock')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimpleAction('allow')}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border py-2 text-sm font-medium transition-colors ${
                        simpleAction === 'allow'
                          ? 'border-green-400 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <CheckCircle2 size={14} />
                      {t('rules.simpleActionAllow')}
                    </button>
                  </div>
                </div>
                {/* 域名输入 */}
                <div className="space-y-2">
                  <Label htmlFor="simple-domain">{t('rules.simpleDomain')}</Label>
                  <Input
                    id="simple-domain"
                    value={simpleDomain}
                    onChange={(e) => setSimpleDomain(e.target.value)}
                    placeholder={t('rules.simpleDomainPlaceholder')}
                    autoFocus
                  />
                </div>
                {/* 规则预览 */}
                {previewRule && (
                  <div className="rounded-md bg-muted px-3 py-2 text-sm">
                    <span className="text-xs text-muted-foreground mr-2">{t('rules.simplePreview')}</span>
                    <code className="font-mono">{previewRule}</code>
                  </div>
                )}
                {/* 备注 */}
                <div className="space-y-2">
                  <Label htmlFor="simple-comment">{t('rules.ruleNote')}</Label>
                  <Input
                    id="simple-comment"
                    value={simpleComment}
                    onChange={(e) => setSimpleComment(e.target.value)}
                    placeholder={t('rules.ruleNotePlaceholder')}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="expert">
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
            </TabsContent>
          </Tabs>

          {/* 临时规则选项 */}
          <div className="pt-2 pb-1 border-t mt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock size={12} />{t('rules.temporary')}:
              </span>
              {EXPIRY_OPTIONS.map(({ label, hours }) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => setExpiryHours(hours)}
                  className={`rounded border px-2 py-0.5 text-xs font-medium transition-colors ${
                    expiryHours === hours
                      ? 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t(label)}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
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
    expires_at: rule.expires_at ?? null,
  }));
  const [editExpiryHours, setEditExpiryHours] = useState<number>(-1); // -1 = keep existing

  const updateMutation = useMutation({
    mutationFn: () => {
      const expiresAt = editExpiryHours === -1
        ? formData.expires_at
        : calcExpiresAt(editExpiryHours);
      return rulesApi.updateRule(rule.id, {
        rule: formData.rule.trim(),
        comment: formData.comment.trim() || undefined,
        is_enabled: formData.is_enabled,
        expires_at: expiresAt,
      });
    },
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
          {/* 到期时间编辑 */}
          <div className="space-y-2 border-t pt-3">
            <Label className="flex items-center gap-1 text-sm">
              <Clock size={12} />{t('rules.expires')}
              {formData.expires_at && editExpiryHours === -1 && (
                <ExpiryBadge expiresAt={formData.expires_at} />
              )}
            </Label>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => { setEditExpiryHours(0); }}
                className={`rounded border px-2 py-0.5 text-xs font-medium transition-colors ${
                  editExpiryHours === 0
                    ? 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {t('rules.clearExpiry')}
              </button>
              {EXPIRY_OPTIONS.filter(o => o.hours > 0).map(({ label, hours }) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => setEditExpiryHours(hours)}
                  className={`rounded border px-2 py-0.5 text-xs font-medium transition-colors ${
                    editExpiryHours === hours
                      ? 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t(label)}
                </button>
              ))}
            </div>
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

function BulkImportDialog({
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
  const [tab, setTab] = useState<'paste' | 'file'>('paste');
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseRules = (raw: string): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        result.push(trimmed);
      }
    }
    return result;
  };

  const validRules = parseRules(text);

  const handleClose = (val: boolean) => {
    if (isImporting) return;
    if (!val) {
      setText('');
      setSelectedFile(null);
    }
    onOpenChange(val);
  };

  const handleImport = async () => {
    if (isImporting) return;
    let file: File;
    if (tab === 'paste') {
      if (validRules.length === 0) return;
      file = new File([text], 'rules.txt', { type: 'text/plain' });
    } else {
      if (!selectedFile) return;
      file = selectedFile;
    }
    setIsImporting(true);
    try {
      const result = await rulesApi.importRulesFile(file);
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      if (result.skipped > 0) {
        toast.success(t('rules.importResultWithSkipped', { imported: result.imported, skipped: result.skipped }));
      } else {
        toast.success(t('rules.importSuccess', { count: result.imported }));
      }
      setText('');
      setSelectedFile(null);
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(t('rules.importError'));
    } finally {
      setIsImporting(false);
    }
  };

  const canSubmit = tab === 'paste' ? validRules.length > 0 : selectedFile !== null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('rules.importDialogTitle')}</DialogTitle>
          <DialogDescription>{t('rules.importDialogDesc')}</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'paste' | 'file')} className="mt-1">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="paste">{t('rules.importTabPaste')}</TabsTrigger>
            <TabsTrigger value="file">{t('rules.importTabFile')}</TabsTrigger>
          </TabsList>
          <TabsContent value="paste" className="space-y-3 mt-3">
            <textarea
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              rows={10}
              placeholder={t('rules.importPlaceholder')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isImporting}
            />
            <p className="text-xs text-muted-foreground">
              {t('rules.importDetected', { count: validRules.length })}
            </p>
          </TabsContent>
          <TabsContent value="file" className="mt-3">
            <div
              className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-8 cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} className="text-muted-foreground mb-3" />
              {selectedFile ? (
                <p className="text-sm font-medium">{selectedFile.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{t('rules.importFileHint')}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{t('rules.importFileLimit')}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.json,.conf,.list"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              disabled={isImporting}
            />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isImporting}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleImport} disabled={!canSubmit || isImporting}>
            {isImporting ? (
              <>
                <RefreshCw size={16} className="mr-2 animate-spin" />
                {t('common.importing')}
              </>
            ) : tab === 'paste' ? (
              <>
                <Upload size={16} className="mr-1" />
                {t('rules.importSubmit', { count: validRules.length })}
              </>
            ) : (
              <>
                <Upload size={16} className="mr-1" />
                {t('rules.importFileSubmit')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
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

function SandboxDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [rule, setRule] = useState('');
  const [domainsText, setDomainsText] = useState('');
  const [result, setResult] = useState<SandboxResponse | null>(null);

  const testMutation = useMutation({
    mutationFn: () => sandboxApi.testRule({
      rule: rule.trim(),
      test_domains: domainsText.split('\n').map(d => d.trim()).filter(Boolean),
    }),
    onSuccess: (data) => setResult(data),
    onError: (error: Error) => toast.error(error.message || 'Error occurred'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rule.trim()) return toast.error(t('rules.ruleRequired'));
    if (!domainsText.trim()) return toast.error(t('rules.sandboxDomainsRequired'));
    testMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) setResult(null); }}>
      <DialogContent className="sm:max-w-2xl px-6 py-6 pb-2">
        <DialogHeader>
          <DialogTitle>{t('rules.sandboxTitle')}</DialogTitle>
          <DialogDescription>
            {t('rules.sandboxDesc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 space-y-2 max-w-full md:mt-0 mt-4">
              <Label>{t('rules.sandboxRuleLabel')}</Label>
              <Input
                placeholder={t('rules.sandboxRulePlaceholder')}
                value={rule}
                onChange={(e) => setRule(e.target.value)}
              />
              <Label className="mt-4 block">{t('rules.sandboxDomainsLabel')}</Label>
              <textarea
                className="flex h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="test.example.com&#10;google.com"
                value={domainsText}
                onChange={(e) => setDomainsText(e.target.value)}
              />
            </div>
            <div className="col-span-1 space-y-2 border rounded-md min-h-[160px] bg-muted/20 p-3 overflow-y-auto w-full max-h-56">
              <div className="font-semibold text-sm mb-2">{t('rules.sandboxResults')}</div>
              {testMutation.isPending && (
                <div className="flex h-12 items-center justify-center"><RefreshCw className="animate-spin text-muted-foreground" /></div>
              )}
              {result && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant={result.rule_valid ? 'default' : 'destructive'} className={result.rule_valid ? "bg-green-600 hover:bg-green-700" : ""}>
                      {result.rule_valid ? t('rules.sandboxRuleValid') : t('rules.sandboxRuleInvalid')}
                    </Badge>
                    {result.rule_type && <Badge variant="outline">{result.rule_type}</Badge>}
                  </div>
                  <ul className="space-y-1 mt-2 text-sm">
                    {result.results.map((r, i) => (
                      <li key={i} className="flex justify-between items-center py-1 border-b last:border-0 border-border/50">
                        <span className="font-mono text-xs w-[60%] truncate" title={r.domain}>{r.domain}</span>
                        <Badge variant={r.status === 'blocked' ? 'destructive' : r.status === 'allowed' ? 'default' : 'secondary'} className="capitalize text-[10px] w-16 justify-center">
                          {r.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!result && !testMutation.isPending && (
                <p className="text-sm text-muted-foreground text-center mt-6">{t('rules.sandboxResultsEmpty')}</p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={testMutation.isPending}>
              {testMutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              {t('rules.sandboxTestBtn')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DomainCheckDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [domainsText, setDomainsText] = useState('');
  const [results, setResults] = useState<DomainCheckResult[] | null>(null);

  const checkMutation = useMutation({
    mutationFn: () => {
      const domains = domainsText.split('\n').map(d => d.trim()).filter(Boolean);
      if (domains.length > 100) {
        throw new Error(t('rules.domainCheckLimit'));
      }
      return domainCheckApi.checkDomains(domains);
    },
    onSuccess: (data) => setResults(data.results),
    onError: (error: Error) => toast.error(error.message || t('common.unknownError')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const domains = domainsText.split('\n').map(d => d.trim()).filter(Boolean);
    if (domains.length === 0) return toast.error('Please enter at least one domain');
    if (domains.length > 100) return toast.error(t('rules.domainCheckLimit'));
    checkMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) setResults(null); }}>
      <DialogContent className="sm:max-w-2xl px-6 py-6 pb-2">
        <DialogHeader>
          <DialogTitle>{t('rules.domainCheckTitle')}</DialogTitle>
          <DialogDescription>
            {t('rules.domainCheckDesc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 space-y-2 max-w-full md:mt-0 mt-4">
              <Label>{t('rules.simpleDomain')}</Label>
              <textarea
                className="flex h-40 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={t('rules.domainCheckPlaceholder')}
                value={domainsText}
                onChange={(e) => setDomainsText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('rules.domainCheckLimit')}</p>
            </div>
            <div className="col-span-1 space-y-2 border rounded-md min-h-[160px] bg-muted/20 p-3 overflow-y-auto w-full max-h-56">
              <div className="font-semibold text-sm mb-2">{t('common.success')}</div>
              {checkMutation.isPending && (
                <div className="flex h-12 items-center justify-center"><RefreshCw className="animate-spin text-muted-foreground" /></div>
              )}
              {results && (
                <ul className="space-y-1 text-sm">
                  {results.map((r, i) => (
                    <li key={i} className="flex justify-between items-center py-1 border-b last:border-0 border-border/50">
                      <span className="font-mono text-xs w-[55%] truncate" title={r.domain}>{r.domain}</span>
                      {r.blocked ? (
                        <Badge variant="destructive" className="text-[10px] justify-center">
                          {t('rules.domainCheckBlocked')}
                        </Badge>
                      ) : r.rewrite_target ? (
                        <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/20 justify-center">
                          {t('rules.domainCheckRewritten')}: {r.rewrite_target}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-green-600 border-green-300 bg-green-50 dark:bg-green-950/20 justify-center">
                          {t('rules.domainCheckAllowed')}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {!results && !checkMutation.isPending && (
                <p className="text-sm text-muted-foreground text-center mt-6">{t('rules.domainCheckNoResults')}</p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={checkMutation.isPending}>
              {checkMutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {t('rules.domainCheckButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [sandboxDialogOpen, setSandboxDialogOpen] = useState(false);
  const [domainCheckDialogOpen, setDomainCheckDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'txt'>('txt');
  const [isExporting, setIsExporting] = useState(false);
  const toggleMutationRef = useRef<{ isPending: boolean }>({ isPending: false });

  // Inline quick-add state
  const [inlineAction, setInlineAction] = useState<RuleAction>('block');
  const [inlineDomain, setInlineDomain] = useState('');
  const [inlineComment, setInlineComment] = useState('');
  const inlineDomainRef = useRef<HTMLInputElement>(null);

  const inlineCreateMutation = useMutation({
    mutationFn: (payload: { rule: string; comment?: string }) =>
      rulesApi.createRule(payload),
    onSuccess: () => {
      toast.success(t('rules.createSuccess'));
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      setInlineDomain('');
      setInlineComment('');
      setTimeout(() => inlineDomainRef.current?.focus(), 0);
    },
    onError: (error: Error) => {
      toast.error(t('rules.createError', { msg: error.message || t('common.unknownError') }));
    },
  });

  const handleInlineSubmit = () => {
    const domain = inlineDomain.trim();
    if (!domain) return;
    const rule = buildSimpleRule(inlineAction, domain);
    inlineCreateMutation.mutate({ rule, comment: inlineComment.trim() || undefined });
  };

  const RULE_EXAMPLES = [
    {
      category: t('rules.exampleBasic'),
      examples: [
        t('rules.exampleBasicDesc1'),
        t('rules.exampleBasicDesc2'),
      ],
    },
    {
      category: t('rules.exampleWhitelist'),
      examples: [
        t('rules.exampleWhitelistDesc1'),
      ],
    },
    {
      category: t('rules.exampleHosts'),
      examples: [
        t('rules.exampleHostsDesc1'),
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

  // 规则命中统计：与规则列表并行加载，失败不影响主列表
  const { data: statsData } = useQuery({
    queryKey: ['rule-stats'],
    queryFn: () => ruleStatsApi.getStats(24),
    retry: false,
  });

  // id -> hit_count 快速查找 Map
  const hitCountMap = new Map<string, number>(
    (statsData?.data ?? []).map((entry) => [entry.id, entry.hit_count])
  );

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
          <Select value={exportFormat} onValueChange={(val) => setExportFormat(val as 'csv' | 'json' | 'txt')}>
            <SelectTrigger className="h-8 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="txt">TXT</SelectItem>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                <Wrench size={16} className="mr-1" />
                工具
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDomainCheckDialogOpen(true)}>
                <Search size={14} className="mr-2" />
                {t('rules.domainCheck')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSandboxDialogOpen(true)}>
                <Play size={14} className="mr-2" />
                {t('rules.sandboxMenuItem')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => setBulkImportDialogOpen(true)}>
            <Upload size={16} className="mr-1" />
            {t('rules.importRules')}
          </Button>
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
                      <TableHead className="w-20 text-right">{t('rules.colHits')}</TableHead>
                      <TableHead className="w-20">{t('rules.colActions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Inline quick-add row */}
                    <TableRow>
                      <TableCell colSpan={8} className="py-2 px-3">
                        <div className="flex gap-2 items-center">
                          {/* Block / Allow toggle */}
                          <button
                            type="button"
                            onClick={() => setInlineAction('block')}
                            className={`flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors ${
                              inlineAction === 'block'
                                ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                                : 'border-border bg-background text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            <XCircle size={12} />
                            {t('rules.simpleActionBlock')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setInlineAction('allow')}
                            className={`flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors ${
                              inlineAction === 'allow'
                                ? 'border-green-400 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                                : 'border-border bg-background text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            <CheckCircle2 size={12} />
                            {t('rules.simpleActionAllow')}
                          </button>
                          {/* Domain input */}
                          <Input
                            ref={inlineDomainRef}
                            value={inlineDomain}
                            onChange={(e) => setInlineDomain(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInlineSubmit(); } }}
                            placeholder={t('rules.inlineAddPlaceholder')}
                            className="h-7 text-sm flex-1"
                            disabled={inlineCreateMutation.isPending}
                          />
                          {/* Comment input */}
                          <Input
                            value={inlineComment}
                            onChange={(e) => setInlineComment(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInlineSubmit(); } }}
                            placeholder={t('rules.inlineCommentPlaceholder')}
                            className="h-7 text-sm w-40"
                            disabled={inlineCreateMutation.isPending}
                          />
                          {/* Submit button */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={handleInlineSubmit}
                            disabled={inlineCreateMutation.isPending || !inlineDomain.trim()}
                          >
                            {inlineCreateMutation.isPending ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <Plus size={12} />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
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
                              title={rule.is_enabled ? t('rules.clickToDisable') : t('rules.clickToEnable')}
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
                            <div className="flex flex-col gap-1">
                              <span>{rule.comment || '-'}</span>
                              {rule.expires_at && <ExpiryBadge expiresAt={rule.expires_at} />}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(rule.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            {(() => {
                              const hits = hitCountMap.get(rule.id);
                              if (hits === undefined) {
                                return <span className="text-xs text-muted-foreground">?</span>;
                              }
                              if (hits === 0) {
                                return <span className="text-xs text-muted-foreground">0</span>;
                              }
                              const isAllowRule = rule.rule.trim().startsWith('@@');
                              return (
                                <span className={`text-sm font-medium tabular-nums ${isAllowRule ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {hits.toLocaleString()}
                                </span>
                              );
                            })()}
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
                  {t('common.pageInfo', { page, total: totalPages, count: total })}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setPage(1); setSelectedIds(new Set()); }}
                    disabled={page <= 1 || isLoading}
                  >
                    {t('common.firstPage')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setPage(p => p - 1); setSelectedIds(new Set()); }}
                    disabled={page <= 1 || isLoading}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setPage(p => p + 1); setSelectedIds(new Set()); }}
                    disabled={page >= totalPages || isLoading}
                  >
                    <ChevronRight size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setPage(totalPages); setSelectedIds(new Set()); }}
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

      <BulkImportDialog
        open={bulkImportDialogOpen}
        onOpenChange={setBulkImportDialogOpen}
        onSuccess={() => setBulkImportDialogOpen(false)}
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

      <DomainCheckDialog
        open={domainCheckDialogOpen}
        onOpenChange={setDomainCheckDialogOpen}
      />

      <SandboxDialog
        open={sandboxDialogOpen}
        onOpenChange={setSandboxDialogOpen}
      />
    </div>
  );
}
