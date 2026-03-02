import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type GroupRule, type ClientGroup } from '@/api/clientGroups';
import { type Rule, type Rewrite } from '@/api/types';
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
  onBindRule: (ruleId: string, ruleType: string, priority: number) => Promise<void>;
  onUnbindRule: (ruleId: string, ruleType: string) => Promise<void>;
  availableRules?: Rule[];
  availableRewrites?: Rewrite[];
}

export function GroupRulesPanel({
  group,
  rules,
  loading = false,
  onBindRule,
  onUnbindRule,
  availableRules = [],
  availableRewrites = [],
}: GroupRulesPanelProps) {
  const { t } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState<{
    rule: GroupRule | null;
  }>({ rule: null });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedRules, setSelectedRules] = useState<Set<string>>(new Set());
  const [selectedRewrites, setSelectedRewrites] = useState<Set<string>>(new Set());
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
    if (selectedRules.size === 0 && selectedRewrites.size === 0) return;

    setBindLoading(true);
    try {
      const rulePromises = Array.from(selectedRules).map((ruleId) =>
        onBindRule(ruleId, 'custom_rule', 0)
      );
      const rewritePromises = Array.from(selectedRewrites).map((ruleId) =>
        onBindRule(ruleId, 'rewrite', 0)
      );

      await Promise.all([...rulePromises, ...rewritePromises]);
      setSelectedRules(new Set());
      setSelectedRewrites(new Set());
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
    return ruleType === 'custom_rule' ? (
      <Filter className="h-4 w-4" />
    ) : (
      <ArrowRightCircle className="h-4 w-4" />
    );
  };

  const getRuleActionBadge = (rule: GroupRule) => {
    if (rule.rule_type === 'custom_rule') {
      const isBlock = rule.rule && rule.rule.startsWith('||');
      return (
        <Badge variant={isBlock ? 'destructive' : 'default'}>
          {isBlock ? t('common.block') : t('common.allow')}
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
                      <span className="font-medium">
                        {rule.rule_type === 'custom_rule' ? rule.rule : rule.domain}
                      </span>
                      {getRuleActionBadge(rule)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {getRuleIcon(rule.rule_type)}
                      {rule.rule_type === 'custom_rule' ? (
                        <>
                          <span className="font-mono">{rule.comment || t('clientGroups.customRule')}</span>
                          <Badge variant="outline" className="text-xs">
                            {t('clientGroups.rulePriority', { n: rule.priority })}
                          </Badge>
                        </>
                      ) : (
                        <>
                          <ArrowRightCircle className="h-3 w-3" />
                          <span className="font-mono">{rule.answer || rule.replacement}</span>
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
              {t('clientGroups.unbindDesc', { name: showDeleteDialog.rule?.rule || showDeleteDialog.rule?.domain })}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('clientGroups.addRuleTitle')}</DialogTitle>
            <DialogDescription>
              {t('clientGroups.addRuleDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-2">

            <div className="space-y-3">
              <h3 className="font-medium">{t('clientGroups.customRules')}</h3>
              {availableRules.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('clientGroups.noAvailableRules')}</p>
              ) : (
                <div className="space-y-2">
                  {availableRules.map((filter) => (
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
                          <span className="font-medium font-mono">{filter.rule}</span>
                          <Badge variant={filter.rule.startsWith('||') ? 'destructive' : 'default'}>
                            {filter.rule.startsWith('||') ? t('common.block') : t('common.allow')}
                          </Badge>
                        </div>
                        {filter.comment && (
                          <div className="text-sm text-muted-foreground">
                            {filter.comment}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="font-medium">{t('clientGroups.rewrites')}</h3>
              {availableRewrites.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('clientGroups.noAvailableRewrites')}</p>
              ) : (
                <div className="space-y-2">
                  {availableRewrites.map((rewrite) => (
                    <label
                      key={rewrite.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors',
                        selectedRewrites.has(rewrite.id) && 'bg-accent border-primary'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={selectedRewrites.has(rewrite.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedRewrites);
                          if (e.target.checked) {
                            newSet.add(rewrite.id);
                          } else {
                            newSet.delete(rewrite.id);
                          }
                          setSelectedRewrites(newSet);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium font-mono">{rewrite.domain}</span>
                          <Badge variant="outline">{t('common.rewrite')}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 font-mono">
                          <ArrowRightCircle className="h-3 w-3" />
                          {rewrite.answer}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddRules} disabled={bindLoading || (selectedRules.size === 0 && selectedRewrites.size === 0)}>
              {bindLoading ? t('clientGroups.binding') : t('clientGroups.bindConfirm', { count: selectedRules.size + selectedRewrites.size })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
