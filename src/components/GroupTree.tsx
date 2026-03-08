import { useTranslation } from 'react-i18next';
import { type ClientGroup } from '@/api/clientGroups';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Plus, Settings, Trash2, ShieldAlert } from 'lucide-react';

const QUARANTINE_GROUP_NAME = '隔离区';

interface GroupTreeProps {
  groups: ClientGroup[];
  selectedGroupId: number | null;
  onSelectGroup: (groupId: number | null) => void;
  onCreateGroup: () => void;
  onEditGroup: (group: ClientGroup) => void;
  onDeleteGroup: (group: ClientGroup) => void;
}

export function GroupTree({
  groups,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
}: GroupTreeProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">{t('clientGroups.title')}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* "全部" 选项 */}
        <button
          className={cn(
            'w-full text-left px-3 py-2 rounded-md flex items-center justify-between hover:bg-accent transition-colors',
            selectedGroupId === null ? 'bg-accent' : ''
          )}
          onClick={() => onSelectGroup(null)}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span className="font-medium">{t('clientGroups.all')}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {groups.reduce((sum, g) => sum + g.client_count, 0)}
          </span>
        </button>

        {/* 分组列表 */}
        {groups.map((group) => {
          const isQuarantine = group.name === QUARANTINE_GROUP_NAME;
          return (
            <ContextMenu key={group.id}>
              <ContextMenuTrigger asChild>
                <button
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md flex items-center justify-between hover:bg-accent transition-colors',
                    selectedGroupId === group.id ? 'bg-accent' : '',
                    isQuarantine && 'border border-red-200 bg-red-50/50 hover:bg-red-100/50 dark:border-red-900 dark:bg-red-950/20 dark:hover:bg-red-950/30'
                  )}
                  onClick={() => onSelectGroup(group.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isQuarantine ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    ) : (
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: group.color }}
                      />
                    )}
                    <span className={cn('font-medium truncate', isQuarantine && 'text-red-600 dark:text-red-400')}>
                      {group.name}
                    </span>
                    {isQuarantine && (
                      <span className="text-[10px] font-semibold px-1 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 shrink-0">
                        {t('clientGroups.quarantineBadge')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span className={cn(isQuarantine && 'text-red-500 font-medium')}>{group.client_count}</span>
                    <span className="text-[10px] opacity-70">
                      {t('clientGroups.rulesCount', { count: group.rule_count })}
                    </span>
                  </div>
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => onEditGroup(group)}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t('common.edit')}
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => !isQuarantine && onDeleteGroup(group)}
                  className={cn(isQuarantine ? 'text-muted-foreground cursor-not-allowed opacity-50' : 'text-destructive')}
                  disabled={isQuarantine}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isQuarantine ? t('clientGroups.quarantineCannotDelete') : t('common.delete')}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
      <div className="p-3 border-t">
        <Button onClick={onCreateGroup} className="w-full" variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t('clientGroups.newGroup')}
        </Button>
      </div>
    </div>
  );
}
