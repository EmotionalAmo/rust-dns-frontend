import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type GroupRule, type ClientGroup } from '@/api/clientGroups';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Trash2, Plus, Filter, ArrowRightCircle } from 'lucide-react';

interface GroupRulesPanelProps {
  group: ClientGroup | null;
  rules: GroupRule[];
  loading?: boolean;
  onBindRule: (ruleId: number, ruleType: string, priority: number) => Promise<void>;
  onUnbindRule: (ruleId: number, ruleType: string) => Promise<void>;
  availableFilters?: Array<{ id: number; name: string; pattern: string; action: string }>;
  availableRewrites?: Array<{ id: number; name: string; domain: string }>;
}

export function GroupRulesPanel({
  group,
  rules,
  loading = false,
  onBindRule,
  onUnbindRule,
  availableFilters = [],
}: GroupRulesPanelProps) {
  const { t } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState<{
    rule: GroupRule | null;
  }>({ rule: null });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedRules, setSelectedRules] = useState<Set<number>>(new Set());
  const [bindLoading, setBindLoading] = useState(false);

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Filter className="h-12 w-12 mb-4 opacity-50" />
        <p>{t('clientGroups.selectGroupHint')}</p>
      </div>
    );
  }

  const handleAddRules = async () => {
    if (selectedRules.size === 0) return;

    setBindLoading(true);
    try {
      const promises = Array.from(selectedRules).map(async (ruleId) => {
        const filter = availableFilters.find((f) => f.id === ruleId);
        if (filter) {
          await onBindRule(ruleId, 'filter', 0);
        }
      });

      await Promise.all(promises);
      setSelectedRules(new Set());
      setShowAddDialog(false);
    } catch (error) {
      console.error('绑定规则失败:', error);
    } finally {
      setBindLoading(false);
    }
  };

  const handleUnbindRule = async (rule: GroupRule) => {
    setShowDeleteDialog({ rule });
  };

  const confirmUnbind = async () => {
    if (!showDeleteDialog.rule) return;

    try {
      await onUnbindRule(showDeleteDialog.rule.rule_id, showDeleteDialog.rule.rule_type);
      setShowDeleteDialog({ rule: null });
    } catch (error) {
      console.error('解绑规则失败:', error);
    }
  };

  const getRuleIcon = (ruleType: string) => {
    return ruleType === 'filter' ? (
      <Filter className="h-4 w-4" />
    ) : (
      <ArrowRightCircle className="h-4 w-4" />
    );
  };

  const getRuleActionBadge = (rule: GroupRule) => {
    if (rule.rule_type === 'filter' && rule.action) {
      return (
        <Badge variant={rule.action === 'block' ? 'destructive' : 'default'}>
          {rule.action === 'block' ? t('common.block') : t('common.allow')}
        </Badge>
      );
    }
    return <Badge variant="outline">{t('common.rewrite')}</Badge>;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('clientGroups.groupRulesTitle', { name: group.name })}</h2>
          <p className="text-sm text-muted-foreground">
            {t('clientGroups.rulesTotal', { count: rules.length })}
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t('clientGroups.addRule')}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {t('clientGroups.loading')}
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Filter className="h-12 w-12 mb-4 opacity-50" />
            <p>{t('clientGroups.emptyRules')}</p>
            <p className="text-sm mt-2">{t('clientGroups.emptyRulesHint')}</p>
          </div>
        ) : (
          <div className="divide-y">
            {rules.map((rule, index) => (
              <div
                key={rule.rule_id}
                className="px-4 py-3 hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground">
                        {index + 1}.
                      </span>
                      <span className="font-medium">{rule.name}</span>
                      {getRuleActionBadge(rule)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {getRuleIcon(rule.rule_type)}
                      {rule.rule_type === 'filter' ? (
                        <>
                          <span className="font-mono">{rule.pattern}</span>
                          <Badge variant="outline" className="text-xs">
                            {t('clientGroups.rulePriority', { n: rule.priority })}
                          </Badge>
                        </>
                      ) : (
                        <>
                          <span className="font-mono">{rule.domain}</span>
                          <ArrowRightCircle className="h-3 w-3" />
                          <span className="font-mono">{rule.replacement}</span>
                          <Badge variant="outline" className="text-xs">
                            {t('clientGroups.rulePriority', { n: rule.priority })}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUnbindRule(rule)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!showDeleteDialog.rule} onOpenChange={(open) => !open && setShowDeleteDialog({ rule: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clientGroups.unbindTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clientGroups.unbindDesc', { name: showDeleteDialog.rule?.name })}
              <br />
              <br />
              {t('clientGroups.unbindHint')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnbind} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('clientGroups.unbindConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 添加规则对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('clientGroups.addRuleTitle')}</DialogTitle>
            <DialogDescription>
              {t('clientGroups.addRuleDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {availableFilters.map((filter) => (
              <label
                key={filter.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors',
                  selectedRules.has(filter.id) && 'bg-accent border-primary'
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={selectedRules.has(filter.id)}
                  onChange={(e) => {
                    const newSet = new Set(selectedRules);
                    if (e.target.checked) {
                      newSet.add(filter.id);
                    } else {
                      newSet.delete(filter.id);
                    }
                    setSelectedRules(newSet);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{filter.name}</span>
                    <Badge variant={filter.action === 'block' ? 'destructive' : 'default'}>
                      {filter.action === 'block' ? t('common.block') : t('common.allow')}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground font-mono">
                    {filter.pattern}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddRules} disabled={bindLoading || selectedRules.size === 0}>
              {bindLoading ? t('clientGroups.binding') : t('clientGroups.bindConfirm', { count: selectedRules.size })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
