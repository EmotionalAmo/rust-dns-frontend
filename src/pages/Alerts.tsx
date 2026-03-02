import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '@/api/alerts';
import { Bell, BellRing, Check, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function AlertsPage() {
    const [page, setPage] = useState(1);
    const pageSize = 20;
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['alerts', 'all', page],
        queryFn: () => alertsApi.getAlerts({ page, page_size: pageSize }),
        refetchInterval: 15000,
    });

    const markAllReadMutation = useMutation({
        mutationFn: alertsApi.markAllAsRead,
        onSuccess: () => {
            toast.success('All alerts marked as read');
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
        },
    });

    const clearAlertsMutation = useMutation({
        mutationFn: alertsApi.clearAlerts,
        onSuccess: () => {
            toast.success('Alerts history cleared');
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
            setPage(1);
        },
    });

    const alerts = data?.data || [];
    const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Bell className="h-6 w-6 text-primary" />
                        Threat Alerts Center
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Monitor anomalous activities and security events across all devices on your network.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => markAllReadMutation.mutate()}
                        disabled={markAllReadMutation.isPending || alerts.every(a => a.is_read)}
                        className="flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
                    >
                        <Check className="h-4 w-4" />
                        Mark all read
                    </button>
                    <button
                        onClick={() => {
                            if (window.confirm('Are you sure you want to clear all alerts history?')) {
                                clearAlertsMutation.mutate();
                            }
                        }}
                        disabled={clearAlertsMutation.isPending || alerts.length === 0}
                        className="flex items-center gap-2 rounded-md border border-destructive/30 text-destructive px-4 py-2 text-sm font-medium hover:bg-destructive/10 disabled:opacity-50"
                    >
                        <Trash2 className="h-4 w-4" />
                        Clear alerts
                    </button>
                </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                {alerts.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            <Check className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-medium">No alerts found</h3>
                        <p className="text-muted-foreground mt-2">Your network is currently safe and quiet.</p>
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
                                            Type: <span className="uppercase text-xs tracking-wider">{alert.alert_type}</span>
                                        </div>
                                    </div>
                                </div>

                                {!alert.is_read && (
                                    <div className="shrink-0 self-start sm:self-center ml-auto">
                                        <button
                                            onClick={() => alertsApi.markAsRead(alert.id).then(() => queryClient.invalidateQueries({ queryKey: ['alerts'] }))}
                                            className="p-2 bg-background hover:bg-muted border rounded-full text-muted-foreground hover:text-foreground transition-colors"
                                            title="Mark as read"
                                        >
                                            <Check className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border/40 py-4 px-2">
                    <p className="text-sm text-muted-foreground">
                        Page <span className="font-medium text-foreground">{page}</span> of{' '}
                        <span className="font-medium text-foreground">{totalPages}</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="rounded-md border bg-background px-3 py-1 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="rounded-md border bg-background px-3 py-1 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
