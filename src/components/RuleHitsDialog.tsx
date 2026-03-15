import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ruleStatsApi } from '@/api/ruleStats';
import { formatDateTimeShort } from '@/lib/datetime';

interface RuleHitsDialogProps {
  ruleId: string | null;
  ruleName: string;
  onClose: () => void;
}

export function RuleHitsDialog({ ruleId, ruleName, onClose }: RuleHitsDialogProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['rule-hits', ruleId],
    queryFn: () => ruleStatsApi.getHits(ruleId!, 24, 20),
    enabled: !!ruleId,
    retry: false,
  });

  return (
    <Dialog open={!!ruleId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">规则命中详情</DialogTitle>
          <DialogDescription className="font-mono text-xs truncate">{ruleName}</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <p className="py-6 text-center text-sm text-destructive">加载失败，请重试</p>
        )}

        {!isLoading && !isError && data && (
          <>
            {data.hits.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                该规则在过去 {data.hours} 小时内无命中记录
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>域名</TableHead>
                      <TableHead className="w-24 text-right">命中次数</TableHead>
                      <TableHead className="w-40 text-right">最后命中</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.hits.map((hit) => (
                      <TableRow key={hit.domain}>
                        <TableCell className="font-mono text-sm">{hit.domain}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-medium text-red-600 dark:text-red-400">
                          {hit.count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {hit.last_seen ? formatDateTimeShort(hit.last_seen) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-right">
              过去 {data.hours} 小时 · 最多显示 20 条
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
