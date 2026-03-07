import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { alertsApi } from '@/api/alerts';
import { Bell, BellRing, Check, Trash2, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function AlertsPage() {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [filterType, setFilterType] = useState<string>('all');
    const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
    const pageSize = 20;
    const queryClient = useQueryClient();

    const alertTypeParam = filterType === 'all' ? undefined : filterType;

    const { data, isLoading } = useQuery({
        queryKey: ['alerts', 'all', page, filterType],
        queryFn: () => alertsApi.getAlerts({ page, page_size: pageSize, alert_type: alertTypeParam }),
        refetchInterval: 15000,
    });

    const markAllReadMutation = useMutation({
        mutationFn: alertsApi.markAllAsRead,
        onSuccess: () => {
            toast.success(t('alerts.markAllReadSuccess'));
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
        },
    });

    const clearAlertsMutation = useMutation({
        mutationFn: alertsApi.clearAlerts,
        onSuccess: () => {
            toast.success(t('alerts.clearSuccess'));
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
            setPage(1);
        },
    });

    const deleteAlertMutation = useMutation({
        mutationFn: (id: string) => alertsApi.deleteAlert(id),
        onSuccess: () => {
            toast.success(t('alerts.deleteSuccess'));
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
        },
    });

    const alerts = data?.data || [];

    // Collect unique alert types from current page for the filter dropdown
    // We fetch all types from all pages by using a separate unfilterd query key
    const { data: allTypesData } = useQuery({
        queryKey: ['alerts', 'types'],
        queryFn: () => alertsApi.getAlerts({ page: 1, page_size: 100 }),
        refetchInterval: 60000,
    });
    const alertTypes = Array.from(new Set((allTypesData?.data || []).map(a => a.alert_type))).filter(Boolean);
    const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <>
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Bell className="h-6 w-6 text-primary" />
                        {t('alerts.title')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('alerts.desc')}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Select
                        value={filterType}
                        onValueChange={(val) => { setFilterType(val); setPage(1); }}
                    >
                        <SelectTrigger className="h-9 w-40 text-sm">
                            <SelectValue placeholder={t('alerts.filterAll')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('alerts.filterAll')}</SelectItem>
                            {alertTypes.map(type => (
                                <SelectItem key={type} value={type}>
                                    <span className="uppercase text-xs tracking-wider">{type}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAllReadMutation.mutate()}
                        disabled={markAllReadMutation.isPending || alerts.every(a => a.is_read)}
                    >
                        <Check className="h-4 w-4" />
                        {t('alerts.markAllRead')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => setClearConfirmOpen(true)}
                        disabled={clearAlertsMutation.isPending || alerts.length === 0}
                    >
                        <Trash2 className="h-4 w-4" />
                        {t('alerts.clearAlerts')}
                    </Button>
                </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                {alerts.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            <Check className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-medium">{t('alerts.emptyTitle')}</h3>
                        <p className="text-muted-foreground mt-2">{t('alerts.emptyDesc')}</p>
                    </div>
                ) : (
                    <div className="divide-y relative">
                        {alerts.map((alert) => (
                            <div
                                key={alert.id}
                                className={`p-4 sm:p-5 flex flex-col sm:flex-row gap-4 transition-colors ${alert.is_read ? 'opacity-70 hover:opacity-100' : 'bg-primary/5'}`}
                            >
                                <div className="shrink-0 mt-1">
                                    {alert.is_read ? (
                                        <Bell className="h-5 w-5 text-muted-foreground" />
                                    ) : (
                                        <BellRing className="h-5 w-5 text-destructive animate-[wiggle_1s_ease-in-out_infinite]" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                        <h4 className="text-base font-semibold truncate pr-4">
                                            {alert.message}
                                        </h4>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap bg-muted px-2.5 py-1 rounded-md shrink-0">
                                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                        {alert.client_id && (
                                            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded border border-border/50">
                                                <span className="font-mono text-xs text-foreground/80">{alert.client_id}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1">
                                            {t('alerts.typeLabel')} <span className="uppercase text-xs tracking-wider">{alert.alert_type}</span>
                                        </div>
                                    </div>
                                    {alert.alert_type === 'high_frequency_block' && alert.client_id && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <Link
                                                to={`/query-logs?client=${encodeURIComponent(alert.client_id)}`}
                                                className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 border border-border rounded px-2 py-1 hover:bg-muted/50 transition-colors"
                                            >
                                                <FileText className="h-3 w-3" />
                                                {t('alerts.viewQueryLogs', { client: alert.client_id })}
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                <div className="shrink-0 self-start sm:self-center ml-auto flex items-center gap-1">
                                    {!alert.is_read && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="p-2 rounded-full"
                                            onClick={() => alertsApi.markAsRead(alert.id).then(() => queryClient.invalidateQueries({ queryKey: ['alerts'] }))}
                                            title={t('alerts.markAsRead')}
                                        >
                                            <Check className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => deleteAlertMutation.mutate(alert.id)}
                                        disabled={deleteAlertMutation.isPending}
                                        title={t('alerts.deleteAlert')}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border/40 py-4 px-2">
                    <p className="text-sm text-muted-foreground">
                        {t('alerts.pageInfo', { page, total: totalPages })}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            {t('alerts.previous')}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            {t('alerts.next')}
                        </Button>
                    </div>
                </div>
            )}
        </div>

        <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('alerts.clearConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('alerts.clearConfirm')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => clearAlertsMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {t('alerts.clearAlerts')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}
