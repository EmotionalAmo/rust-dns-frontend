import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientGroupsApi, type ClientGroup, type CreateClientGroupRequest, type UpdateClientGroupRequest, type ClientGroupMember, type PaginatedResponse } from '@/api/clientGroups';
import { clientsApi, type ClientRecord } from '@/api/clients';
import { GroupTree } from '@/components/GroupTree';

const QUARANTINE_GROUP_NAME = '隔离区';
import { ClientList } from '@/components/ClientList';
import { GroupRulesPanel } from '@/components/GroupRulesPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PRESET_COLORS } from '@/lib/colors';
import { cn } from '@/lib/utils';

const MAC_REGEX = /^([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}$/i;

function parseIdentifiers(identifiers: any): { ip: string; mac: string } {
  let ids: string[] = [];
  if (Array.isArray(identifiers)) {
    ids = identifiers;
  } else if (typeof identifiers === 'string') {
    try {
      ids = JSON.parse(identifiers);
      if (!Array.isArray(ids)) ids = [identifiers];
    } catch {
      ids = [identifiers];
    }
  }

  const strIds = ids.map(id => String(id).trim());
  const ip = strIds.find((id) => !MAC_REGEX.test(id)) || '-';
  const mac = strIds.find((id) => MAC_REGEX.test(id)) || '-';
  return { ip, mac };
}

export default function ClientGroupsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'clients' | 'rules'>('clients');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<ClientGroup | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [editGroup, setEditGroup] = useState<ClientGroup | null>(null);
  const [form, setForm] = useState<{
    name: string;
    color: string;
    description: string;
  }>({ name: '', color: PRESET_COLORS[0], description: '' });
  const [moveToGroupId, setMoveToGroupId] = useState<number | null>(null);

  // 查询分组列表
  const { data: groups = [] } = useQuery({
    queryKey: ['client-groups'],
    queryFn: () => clientGroupsApi.list(),
  });

  // 查询客户端列表
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients', selectedGroupId],
    queryFn: async (): Promise<PaginatedResponse<ClientGroupMember>> => {
      if (selectedGroupId) {
        return await clientGroupsApi.getMembers(selectedGroupId);
      } else {
        const allClients: ClientRecord[] = await clientsApi.list();
        const staticClients = allClients.filter(c => c.is_static);
        return {
          data: staticClients.map((c) => {
            const { ip, mac } = parseIdentifiers(c.identifiers);
            // 查找客户端所属的分组
            // 由于分组数据中不直接包含成员列表，这里暂时返回空数组
            // 可以通过额外的 API 调用来获取，但为了性能暂时简化
            const clientGroups: ClientGroup[] = [];
            return {
              id: c.id,
              name: c.name,
              ip,
              mac,
              last_seen: c.updated_at,
              query_count: c.query_count ?? 0,
              group_ids: clientGroups.map(g => g.id),
              group_names: clientGroups.map(g => g.name),
            };
          }),
          total: staticClients.length,
        };
      }
    },
    enabled: true, // 始终加载，"全部"视图也需要客户端列表
  });

  const clients = clientsData?.data || [];

  // 查询分组规则 (custom_rule)
  const { data: rulesDataCustom, isLoading: rulesLoadingCustom } = useQuery({
    queryKey: ['client-group-rules', selectedGroupId, 'custom_rule'],
    queryFn: () => clientGroupsApi.getRules(selectedGroupId!, { rule_type: 'custom_rule' }),
    enabled: !!selectedGroupId && activeTab === 'rules',
  });

  // 查询分组规则 (rewrite)
  const { data: rulesDataRewrite, isLoading: rulesLoadingRewrite } = useQuery({
    queryKey: ['client-group-rules', selectedGroupId, 'rewrite'],
    queryFn: () => clientGroupsApi.getRules(selectedGroupId!, { rule_type: 'rewrite' }),
    enabled: !!selectedGroupId && activeTab === 'rules',
  });

  const rules = [...(rulesDataCustom?.data || []), ...(rulesDataRewrite?.data || [])];
  const rulesLoading = rulesLoadingCustom || rulesLoadingRewrite;

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  // 创建分组
  const createMutation = useMutation({
    mutationFn: (data: CreateClientGroupRequest) => clientGroupsApi.create(data),
    onSuccess: () => {
      toast.success(t('clientGroups.groupCreated'));
      qc.invalidateQueries({ queryKey: ['client-groups'] });
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(t('clientGroups.createError', { msg: e.message })),
  });

  // 更新分组
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateClientGroupRequest }) =>
      clientGroupsApi.update(id, data),
    onSuccess: () => {
      toast.success(t('clientGroups.groupUpdated'));
      qc.invalidateQueries({ queryKey: ['client-groups'] });
      setShowEditDialog(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(t('clientGroups.updateError', { msg: e.message })),
  });

  // 删除分组
  const deleteMutation = useMutation({
    mutationFn: (id: number) => clientGroupsApi.delete(id),
    onSuccess: () => {
      toast.success(t('clientGroups.groupDeleted'));
      qc.invalidateQueries({ queryKey: ['client-groups'] });
      if (selectedGroupId === showDeleteDialog?.id) {
        setSelectedGroupId(null);
      }
      setShowDeleteDialog(null);
    },
    onError: (e: Error) => toast.error(t('clientGroups.deleteError', { msg: e.message })),
  });

  // 批量移动客户端
  const moveMutation = useMutation({
    mutationFn: (data: { client_ids: string[]; from_group_id?: number; to_group_id?: number }) =>
      clientGroupsApi.batchMove(data),
    onSuccess: () => {
      toast.success(t('clientGroups.clientMoved'));
      qc.invalidateQueries({ queryKey: ['clients', selectedGroupId] });
      qc.invalidateQueries({ queryKey: ['client-groups'] });
      setSelectedClientIds([]);
      setShowMoveDialog(false);
      setMoveToGroupId(null);
    },
    onError: (e: Error) => toast.error(t('clientGroups.moveError', { msg: e.message })),
  });

  // 从组移除客户端
  const removeMutation = useMutation({
    mutationFn: (data: { client_ids: string[] }) =>
      selectedGroupId
        ? clientGroupsApi.removeMembers(selectedGroupId, data)
        : Promise.reject('No group selected'),
    onSuccess: () => {
      toast.success(t('clientGroups.clientRemoved'));
      qc.invalidateQueries({ queryKey: ['clients', selectedGroupId] });
      qc.invalidateQueries({ queryKey: ['client-groups'] });
      setSelectedClientIds([]);
    },
    onError: (e: Error) => toast.error(t('clientGroups.removeError', { msg: e.message })),
  });

  // 绑定规则
  const bindRuleMutation = useMutation({
    mutationFn: (data: { rule_id: string; rule_type: string; priority: number }) =>
      selectedGroupId
        ? clientGroupsApi.bindRules(selectedGroupId, { rules: [data] })
        : Promise.reject('No group selected'),
    onSuccess: () => {
      toast.success(t('clientGroups.ruleBound'));
      qc.invalidateQueries({ queryKey: ['client-group-rules', selectedGroupId] });
      qc.invalidateQueries({ queryKey: ['client-groups'] });
    },
    onError: (e: Error) => toast.error(t('clientGroups.bindError', { msg: e.message })),
  });

  // 解绑规则
  const unbindRuleMutation = useMutation({
    mutationFn: (data: { rule_id: string; rule_type: string }) =>
      selectedGroupId
        ? clientGroupsApi.unbindRules(selectedGroupId, {
          rule_ids: [data.rule_id],
          rule_type: data.rule_type,
        })
        : Promise.reject('No group selected'),
    onSuccess: () => {
      toast.success(t('clientGroups.ruleUnbound'));
      qc.invalidateQueries({ queryKey: ['client-group-rules', selectedGroupId] });
      qc.invalidateQueries({ queryKey: ['client-groups'] });
    },
    onError: (e: Error) => toast.error(t('clientGroups.unbindError', { msg: e.message })),
  });

  const resetForm = () => {
    setForm({ name: '', color: PRESET_COLORS[0], description: '' });
    setEditGroup(null);
  };

  const handleCreateGroup = () => {
    setEditGroup(null);
    resetForm();
    setShowCreateDialog(true);
  };

  const handleEditGroup = (group: ClientGroup) => {
    setEditGroup(group);
    setForm({
      name: group.name,
      color: group.color,
      description: group.description || '',
    });
    setShowEditDialog(true);
  };

  const handleDeleteGroup = (group: ClientGroup) => {
    setShowDeleteDialog(group);
  };

  const handleSaveGroup = () => {
    if (!form.name.trim()) {
      toast.error(t('clientGroups.nameRequired'));
      return;
    }

    if (editGroup) {
      updateMutation.mutate({ id: editGroup.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleToggleAll = () => {
    const allClientIds = clients.map((c) => c.id);
    if (selectedClientIds.length === allClientIds.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(allClientIds);
    }
  };

  const handleMoveToGroup = (clientIds: string[]) => {
    setSelectedClientIds(clientIds);
    setShowMoveDialog(true);
  };

  const confirmMoveToGroup = () => {
    if (moveToGroupId === null) {
      toast.error(t('clientGroups.targetRequired'));
      return;
    }

    moveMutation.mutate({
      client_ids: selectedClientIds,
      from_group_id: selectedGroupId || undefined,
      to_group_id: moveToGroupId,
    });
  };

  const handleRemoveFromGroup = (clientIds: string[]) => {
    removeMutation.mutate({ client_ids: clientIds });
  };

  return (
    <div className="flex flex-col h-full">
      {/* 使用引导 Banner */}
      {!bannerDismissed && (
        <div className="flex-shrink-0 bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-blue-800">
            <span className="font-medium">{t('clientGroups.bannerText')}</span>
            <span className="text-blue-600">—</span>
            <span className="text-blue-700">
              {t('clientGroups.bannerDesc')}
            </span>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-blue-500 hover:text-blue-700 ml-4 text-base leading-none"
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        {/* 左侧分组树 */}
        <div className="w-80 border-r flex flex-col h-full overflow-hidden">
          <GroupTree
            groups={groups}
            selectedGroupId={selectedGroupId}
            onSelectGroup={setSelectedGroupId}
            onCreateGroup={handleCreateGroup}
            onEditGroup={handleEditGroup}
            onDeleteGroup={handleDeleteGroup}
          />
        </div>

        {/* 右侧内容区 */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {selectedGroup ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'clients' | 'rules')} className="flex-1 flex flex-col min-h-0">
              <div className={cn('border-b px-6 py-4 shrink-0', selectedGroup.name === QUARANTINE_GROUP_NAME && 'border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-950/10')}>
                <div className="flex items-center gap-2">
                  <h1 className={cn('text-2xl font-bold', selectedGroup.name === QUARANTINE_GROUP_NAME && 'text-red-600 dark:text-red-400')}>{selectedGroup.name}</h1>
                  {selectedGroup.name === QUARANTINE_GROUP_NAME && (
                    <Badge className="bg-red-100 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
                      {t('clientGroups.quarantineBadge')}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{selectedGroup.description}</p>
                {selectedGroup.name === QUARANTINE_GROUP_NAME && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {t('clientGroups.quarantineWarning')}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="secondary">{t('clientGroups.deviceCount', { count: selectedGroup.client_count })}</Badge>
                  <Badge variant="secondary">{t('clientGroups.rulesCount', { count: selectedGroup.rule_count })}</Badge>
                </div>
              </div>

              <TabsList className="mx-6 mt-4">
                <TabsTrigger value="clients">{t('clientGroups.tabClients')}</TabsTrigger>
                <TabsTrigger value="rules">{t('clientGroups.tabRules')}</TabsTrigger>
              </TabsList>

              <TabsContent value="clients" className="flex-1 mt-0 min-h-0 data-[state=active]:flex flex-col overflow-hidden">
                <ClientList
                  clients={clients}
                  selectedClientIds={selectedClientIds}
                  loading={clientsLoading}
                  onToggleClient={handleSelectClient}
                  onToggleAll={handleToggleAll}
                  onMoveToGroup={handleMoveToGroup}
                  onRemoveFromGroup={handleRemoveFromGroup}
                />
              </TabsContent>

              <TabsContent value="rules" className="flex-1 mt-0 min-h-0 data-[state=active]:flex flex-col overflow-hidden">
                <GroupRulesPanel
                  group={selectedGroup}
                  rules={rules}
                  loading={rulesLoading}
                  onBindRule={async (ruleId, ruleType, priority) => {
                    await bindRuleMutation.mutateAsync({ rule_id: String(ruleId), rule_type: ruleType, priority });
                  }}
                  onUnbindRule={async (ruleId, ruleType) => {
                    await unbindRuleMutation.mutateAsync({ rule_id: String(ruleId), rule_type: ruleType });
                  }}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="border-b px-6 py-4 shrink-0">
                <h1 className="text-2xl font-bold">{t('clientGroups.allClients')}</h1>
                <p className="text-muted-foreground">{t('clientGroups.allClientsDesc')}</p>
                <div className="mt-2">
                  <Badge variant="secondary">{t('clientGroups.deviceCount', { count: clients.length })}</Badge>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ClientList
                  clients={clients}
                  selectedClientIds={selectedClientIds}
                  loading={clientsLoading}
                  onToggleClient={handleSelectClient}
                  onToggleAll={handleToggleAll}
                  onMoveToGroup={handleMoveToGroup}
                />
              </div>
            </div>
          )}
        </div>

        {/* 创建分组对话框 */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('clientGroups.createGroupTitle')}</DialogTitle>
              <DialogDescription>
                {t('clientGroups.createGroupDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t('clientGroups.groupName')}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('clientGroups.groupNamePlaceholder')}
                />
              </div>
              <div>
                <Label>{t('clientGroups.groupColor')}</Label>
                <div className="flex gap-2 mt-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        form.color === color
                          ? 'ring-2 ring-offset-2 ring-primary'
                          : 'ring-0'
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setForm({ ...form, color })}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="description">{t('clientGroups.groupDesc')}</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t('clientGroups.groupDescPlaceholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSaveGroup} disabled={createMutation.isPending}>
                {createMutation.isPending ? t('common.creating') : t('common.create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 编辑分组对话框 */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('clientGroups.editGroupTitle')}</DialogTitle>
              <DialogDescription>
                {t('clientGroups.editGroupDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">{t('clientGroups.groupName')}</Label>
                <Input
                  id="edit-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('clientGroups.groupNamePlaceholder')}
                />
              </div>
              <div>
                <Label>{t('clientGroups.groupColor')}</Label>
                <div className="flex gap-2 mt-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        form.color === color
                          ? 'ring-2 ring-offset-2 ring-primary'
                          : 'ring-0'
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setForm({ ...form, color })}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="edit-description">{t('clientGroups.groupDesc')}</Label>
                <Textarea
                  id="edit-description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t('clientGroups.groupDescPlaceholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSaveGroup} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? t('common.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除分组确认对话框 */}
        <AlertDialog open={!!showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('clientGroups.deleteGroupTitle')}</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  {showDeleteDialog?.name === QUARANTINE_GROUP_NAME && (
                    <div className="mb-3 p-3 rounded-md bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800">
                      <p className="text-red-600 dark:text-red-400 font-semibold text-sm">
                        {t('clientGroups.quarantineDeleteWarning')}
                      </p>
                      <p className="text-red-500 dark:text-red-500 text-xs mt-1">
                        {t('clientGroups.quarantineDeleteExtra')}
                      </p>
                    </div>
                  )}
                  <span>{t('clientGroups.deleteGroupDesc', { name: showDeleteDialog?.name })}</span>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>{t('clientGroups.deleteGroupClients', { count: showDeleteDialog?.client_count ?? 0 })}</li>
                    <li>{t('clientGroups.deleteGroupRules', { count: showDeleteDialog?.rule_count ?? 0 })}</li>
                  </ul>
                  <p className="mt-3 text-destructive font-medium">
                    {t('clientGroups.deleteGroupConfirm')}
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => showDeleteDialog && deleteMutation.mutate(showDeleteDialog.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 移动到组对话框 */}
        <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('clientGroups.moveToGroupTitle')}</DialogTitle>
              <DialogDescription>
                {t('clientGroups.moveToGroupDesc', { count: selectedClientIds.length })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('clientGroups.targetGroup')}</Label>
                <div className="space-y-2 mt-2">
                  {groups.map((group) => {
                    const isQ = group.name === QUARANTINE_GROUP_NAME;
                    return (
                      <label
                        key={group.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors',
                          moveToGroupId === group.id && 'bg-accent border-primary',
                          isQ && 'border-red-200 bg-red-50/50 hover:bg-red-100/50 dark:border-red-900 dark:bg-red-950/20'
                        )}
                      >
                        <input
                          type="radio"
                          name="target-group"
                          checked={moveToGroupId === group.id}
                          onChange={() => setMoveToGroupId(group.id)}
                          className="mt-0.5"
                        />
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: group.color }}
                          />
                          <span className={cn(isQ && 'text-red-600 dark:text-red-400 font-medium')}>{group.name}</span>
                          {isQ && (
                            <Badge className="text-xs bg-red-100 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400">
                              {t('clientGroups.quarantineBadge')}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {group.client_count}
                          </Badge>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={confirmMoveToGroup}
                disabled={moveMutation.isPending || moveToGroupId === null}
              >
                {moveMutation.isPending ? t('clientGroups.movingTo') : t('clientGroups.moveConfirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
