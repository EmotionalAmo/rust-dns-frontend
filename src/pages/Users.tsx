import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, type UserRecord, type CreateUserPayload } from '@/api/users';
import { formatDateTimeShort } from '@/lib/datetime';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, RefreshCw, Users, Edit2, ShieldCheck } from 'lucide-react';

type Role = 'super_admin' | 'admin' | 'operator' | 'read_only';

const ROLE_CONFIG: Record<Role, { i18nKey: string; color: string }> = {
  super_admin: { i18nKey: 'users.roleSuperAdmin', color: 'text-destructive bg-destructive/10' },
  admin: { i18nKey: 'users.roleAdmin', color: 'text-primary bg-primary/10' },
  operator: { i18nKey: 'users.roleOperator', color: 'text-green-600 bg-green-500/10' },
  read_only: { i18nKey: 'users.roleReadonly', color: 'text-muted-foreground bg-muted' },
};

function RoleBadge({ role }: { role: Role }) {
  const { t } = useTranslation();
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.read_only;
  return (
    <span className={`text-xs font-medium rounded px-2 py-0.5 ${cfg.color}`}>
      {t(cfg.i18nKey)}
    </span>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState({ username: '', password: '', role: 'operator' as Role });

  const mutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload),
    onSuccess: () => {
      toast.success(t('users.createSuccess'));
      qc.invalidateQueries({ queryKey: ['users'] });
      onOpenChange(false);
      setForm({ username: '', password: '', role: 'operator' });
    },
    onError: (e: Error) => toast.error(t('users.createError', { msg: e.message })),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim()) { toast.error(t('users.usernameRequired')); return; }
    if (form.password.length < 8) { toast.error(t('users.passwordTooShort')); return; }
    mutation.mutate({ username: form.username.trim(), password: form.password, role: form.role });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('users.createTitle')}</DialogTitle>
          <DialogDescription>{t('users.createDesc')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">{t('users.usernameLabel')}</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder={t('users.usernamePlaceholder')}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t('users.passwordLabel')}</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={t('users.passwordPlaceholder')}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('users.roleLabel')}</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ROLE_CONFIG) as [Role, { i18nKey: string; color: string }][]).map(([val, cfg]) => (
                    <SelectItem key={val} value={val}>{t(cfg.i18nKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <><RefreshCw size={14} className="mr-1 animate-spin" />{t('common.creating')}</>
              ) : (
                <><Plus size={14} className="mr-1" />{t('common.create')}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UpdateRoleDialog({
  user,
  onClose,
}: {
  user: UserRecord | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [role, setRole] = useState<Role>(user?.role ?? 'read_only');

  const mutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => usersApi.updateRole(id, { role }),
    onSuccess: () => {
      toast.success(t('users.updateSuccess'));
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (e: Error) => toast.error(t('users.updateError', { msg: e.message })),
  });

  if (!user) return null;

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{t('users.changeRoleTitle')}</DialogTitle>
          <DialogDescription>
            {t('users.changeRoleDesc', { name: user.username })}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <Label>{t('users.newRole')}</Label>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(ROLE_CONFIG) as [Role, { i18nKey: string; color: string }][]).map(([val, cfg]) => (
                <SelectItem key={val} value={val}>{t(cfg.i18nKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>{t('common.cancel')}</Button>
          <Button
            onClick={() => mutation.mutate({ id: user.id, role })}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <><RefreshCw size={14} className="mr-1 animate-spin" />{t('common.saving')}</>
            ) : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const formatDate = formatDateTimeShort;

export default function UsersPage() {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  const { data: users = [], isLoading, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('users.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('users.desc')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} className="mr-1" />
            {t('users.createUser')}
          </Button>
        </div>
      </div>

      {/* 表格 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={18} />
            {t('users.tableTitle')}
          </CardTitle>
          <CardDescription>{t('users.tableCount', { count: users.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw size={32} className="animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <p className="text-muted-foreground">{t('users.loadError')}</p>
              <Button variant="outline" onClick={() => refetch()}>{t('common.retry')}</Button>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-4">
              <Users size={48} className="text-muted-foreground" />
              <p className="text-muted-foreground">{t('users.emptyState')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('users.colUsername')}</TableHead>
                    <TableHead>{t('users.colRole')}</TableHead>
                    <TableHead>{t('users.colStatus')}</TableHead>
                    <TableHead>{t('users.colCreatedAt')}</TableHead>
                    <TableHead className="w-20">{t('users.colActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <RoleBadge role={user.role} />
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs rounded px-2 py-0.5 ${
                          user.is_active
                            ? 'bg-green-500/10 text-green-700 dark:text-green-300'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {user.is_active ? t('users.statusActive') : t('users.statusDisabled')}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingUser(user)}
                        >
                          <Edit2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <UpdateRoleDialog user={editingUser} onClose={() => setEditingUser(null)} />
    </div>
  );
}
