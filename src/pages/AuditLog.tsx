import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditLogApi, type AuditLogRecord } from '@/api/auditLog';
import { formatDateTime } from '@/lib/datetime';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RefreshCw, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';

const ACTION_OPTIONS = [
  { value: 'all', label: '全部操作' },
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'login', label: '登录' },
  { value: 'logout', label: '登出' },
  { value: 'toggle', label: '切换' },
  { value: 'bulk_action', label: '批量操作' },
  { value: 'refresh', label: '刷新' },
  { value: 'password_change', label: '修改密码' },
];

const ACTION_COLOR: Record<string, string> = {
  create: 'text-green-700 bg-green-500/10 dark:text-green-300',
  update: 'text-blue-700 bg-blue-500/10 dark:text-blue-300',
  delete: 'text-red-700 bg-red-500/10 dark:text-red-300',
  login: 'text-purple-700 bg-purple-500/10 dark:text-purple-300',
  logout: 'text-muted-foreground bg-muted',
  toggle: 'text-orange-700 bg-orange-500/10 dark:text-orange-300',
  bulk_action: 'text-yellow-700 bg-yellow-500/10 dark:text-yellow-300',
  refresh: 'text-cyan-700 bg-cyan-500/10 dark:text-cyan-300',
  password_change: 'text-pink-700 bg-pink-500/10 dark:text-pink-300',
};

function ActionBadge({ action }: { action: string }) {
  const color = ACTION_COLOR[action] ?? 'text-muted-foreground bg-muted';
  const label = ACTION_OPTIONS.find((o) => o.value === action)?.label ?? action;
  return (
    <span className={`text-xs font-medium rounded px-2 py-0.5 ${color}`}>{label}</span>
  );
}

const RESOURCE_COLOR: Record<string, string> = {
  rule: 'text-blue-600 bg-blue-500/10 dark:text-blue-300',
  filter: 'text-green-600 bg-green-500/10 dark:text-green-300',
  client: 'text-purple-600 bg-purple-500/10 dark:text-purple-300',
  rewrite: 'text-orange-600 bg-orange-500/10 dark:text-orange-300',
  session: 'text-muted-foreground bg-muted',
  user: 'text-pink-600 bg-pink-500/10 dark:text-pink-300',
};

function ResourceBadge({ resource }: { resource: string }) {
  const color = RESOURCE_COLOR[resource] ?? 'text-muted-foreground bg-muted';
  return (
    <span className={`text-xs font-medium rounded px-2 py-0.5 ${color}`}>{resource}</span>
  );
}

const PER_PAGE = 50;

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('all');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audit-log', page, actionFilter],
    queryFn: () =>
      auditLogApi.list({
        page,
        per_page: PER_PAGE,
        action: actionFilter === 'all' ? undefined : actionFilter,
      }),
  });

  const logs: AuditLogRecord[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const handleActionChange = (value: string) => {
    setActionFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">审计日志</h2>
          <p className="text-sm text-muted-foreground">记录所有管理操作，仅管理员可查看</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">操作类型：</span>
          <Select value={actionFilter} onValueChange={handleActionChange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {total > 0 && (
          <span className="text-sm text-muted-foreground ml-auto">
            共 {total} 条记录
          </span>
        )}
      </div>

      {/* 表格 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList size={18} />
            操作记录
          </CardTitle>
          <CardDescription>
            第 {page} 页，每页 {PER_PAGE} 条
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw size={32} className="animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <p className="text-muted-foreground">加载失败</p>
              <Button variant="outline" onClick={() => refetch()}>重试</Button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-4">
              <ClipboardList size={48} className="text-muted-foreground" />
              <p className="text-muted-foreground">暂无审计记录</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>操作</TableHead>
                    <TableHead>资源</TableHead>
                    <TableHead>资源 ID</TableHead>
                    <TableHead>详情</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.time)}
                      </TableCell>
                      <TableCell className="font-medium">{log.username}</TableCell>
                      <TableCell>
                        <ActionBadge action={log.action} />
                      </TableCell>
                      <TableCell>
                        <ResourceBadge resource={log.resource} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono max-w-[120px] truncate">
                        {log.resource_id ?? '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {log.detail ?? '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {log.ip}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
