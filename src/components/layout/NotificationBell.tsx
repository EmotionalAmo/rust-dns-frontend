import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '@/api/alerts';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

function getAlertActionLink(alertType: string): { label: string; href: string } | null {
    switch (alertType) {
        case 'high_frequency_block':
            return { label: '审查拦截域名', href: '/query-logs?status=blocked' };
        case 'high_query_rate':
            return { label: '查看查询日志', href: '/query-logs' };
        case 'upstream_failure':
        case 'upstream_degraded':
            return { label: '检查上游状态', href: '/upstreams' };
        default:
            return null;
    }
}

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Polling unread alerts
    const { data } = useQuery({
        queryKey: ['alerts', 'unread'],
        queryFn: () => alertsApi.getAlerts({ is_read: false, page_size: 5 }),
        refetchInterval: 10000, // Poll every 10s
    });

    const unreadCount = data?.total || 0;
    const recentAlerts = data?.data || [];

    const markAsReadMutation = useMutation({
        mutationFn: (id: string) => alertsApi.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
        },
        onError: () => {
            toast.error('Failed to mark alert as read');
        }
    });

    const handleAlertClick = (id: string) => {
        markAsReadMutation.mutate(id);
        setIsOpen(false);
        navigate('/alerts');
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative" ref={popoverRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-1.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Alerts"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-md border bg-card text-card-foreground shadow-lg z-50 overflow-hidden">
                    <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                        <h3 className="font-semibold text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="text-xs text-muted-foreground font-medium bg-secondary px-2 py-0.5 rounded-full">
                                {unreadCount} new
                            </span>
                        )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {recentAlerts.length > 0 ? (
                            <ul className="divide-y">
                                {recentAlerts.map(alert => {
                                    const actionLink = getAlertActionLink(alert.alert_type);
                                    return (
                                    <li
                                        key={alert.id}
                                        className="p-3 hover:bg-muted/50 transition-colors"
                                    >
                                        <div
                                            className="cursor-pointer"
                                            onClick={() => handleAlertClick(alert.id)}
                                        >
                                            <p className="text-sm font-medium leading-tight mb-1">{alert.message}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                        {actionLink && (
                                            <button
                                                onClick={() => {
                                                    markAsReadMutation.mutate(alert.id);
                                                    setIsOpen(false);
                                                    navigate(actionLink.href);
                                                }}
                                                className="mt-1.5 text-xs text-primary hover:underline font-medium"
                                            >
                                                → {actionLink.label}
                                            </button>
                                        )}
                                    </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="p-6 text-center text-muted-foreground flex flex-col items-center gap-2">
                                <CheckCircle className="h-8 w-8 text-success/50" />
                                <p className="text-sm">No new alerts</p>
                            </div>
                        )}
                    </div>
                    <div className="p-2 border-t text-center bg-muted/20">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                navigate('/alerts');
                            }}
                            className="text-xs text-primary hover:underline font-medium"
                        >
                            View all history
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
