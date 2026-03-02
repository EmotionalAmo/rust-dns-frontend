import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '@/api/alerts';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
                    <span className="absolute top-1 right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
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
                                {recentAlerts.map(alert => (
                                    <li
                                        key={alert.id}
                                        className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                                        onClick={() => handleAlertClick(alert.id)}
                                    >
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <p className="text-sm font-medium leading-tight">{alert.message}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                                        </p>
                                    </li>
                                ))}
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
