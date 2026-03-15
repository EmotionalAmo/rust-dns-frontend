import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Monitor, ExternalLink, Shield, ShieldOff, Loader2, MapPin } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { clientsApi } from '@/api/clients';
import { listQueryLogs } from '@/api/queryLog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

function isPrivateIp(ip: string): boolean {
    if (!ip || ip === 'localhost' || ip === '::1') return true;
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return true; // IPv6 等视为私有
    const [a, b] = parts;
    return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

interface ClientDetailSheetProps {
    ip: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ClientDetailSheet({ ip, open, onOpenChange }: ClientDetailSheetProps) {
    const { t } = useTranslation();
    const [hours, setHours] = useState(24);
    const qc = useQueryClient();

    const { data: clients, isLoading: clientsLoading } = useQuery({
        queryKey: ['clients', 'list'],
        queryFn: () => clientsApi.list(),
        enabled: open && ip !== null,
    });

    const { data: logsData, isLoading: logsLoading } = useQuery({
        queryKey: ['queryLogs', 'client-detail', ip],
        queryFn: () => listQueryLogs({ client: ip!, limit: 20 }),
        enabled: open && ip !== null,
    });

    const client = clients?.find((c) => c.identifiers.includes(ip ?? ''));

    const toggleFilterMutation = useMutation({
        mutationFn: ({ id, c }: { id: string; c: typeof client & object }) => {
            return clientsApi.update(id, {
                name: c!.name,
                identifiers: c!.identifiers,
                filter_enabled: !c!.filter_enabled,
                ...(c!.upstreams?.length ? { upstreams: c!.upstreams } : {}),
                ...(c!.tags?.length ? { tags: c!.tags } : {}),
            });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['clients'] });
        },
        onError: (e: Error) => {
            toast.error(t('clients.updateError', { msg: e.message }));
        },
    });

    const { data: geoData } = useQuery({
        queryKey: ['ip-geo', ip],
        queryFn: async () => {
            const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,country,countryCode,isp,org`);
            if (!res.ok) throw new Error('geo fetch failed');
            return res.json() as Promise<{ status: string; city: string; country: string; countryCode: string; isp: string; org: string }>;
        },
        enabled: open && ip !== null && !isPrivateIp(ip ?? ''),
        staleTime: 1000 * 60 * 60, // 1 小时
        retry: false,
    });

    const { data: ptrRecord } = useQuery({
        queryKey: ['client-ptr', ip],
        queryFn: () => clientsApi.getPtr(ip!),
        enabled: open && ip !== null,
        staleTime: 1000 * 60 * 5, // 5 分钟缓存
        retry: false,
    });

    const { data: activityData, isLoading: activityLoading } = useQuery({
        queryKey: ['client-activity', client?.id, hours],
        queryFn: () => clientsApi.getActivity(client!.id, hours),
        enabled: open && !!client?.id,
    });

    const logs = logsData?.data ?? [];
    const isLoading = clientsLoading || logsLoading;

    const displayName = client?.name ?? ip ?? '';
    const tags = client?.tags ?? [];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-[480px] sm:max-w-[480px] flex flex-col gap-0 p-0">
                <SheetHeader className="px-6 py-5 border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                            <Monitor className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <SheetTitle className="flex flex-wrap items-center gap-2 text-base font-semibold">
                                <span className="truncate">{displayName}</span>
                                <Badge variant={client ? 'default' : 'secondary'} className="shrink-0 text-xs">
                                    {client ? t('clientDetail.registered') : t('clientDetail.unregistered')}
                                </Badge>
                            </SheetTitle>
                            {tags.length > 0 && (
                                <SheetDescription className="mt-1 flex flex-wrap gap-1">
                                    {tags.map((tag) => (
                                        <Badge key={tag} variant="outline" className="text-xs font-normal">
                                            {tag}
                                        </Badge>
                                    ))}
                                </SheetDescription>
                            )}
                            {tags.length === 0 && (
                                <SheetDescription className="mt-1 font-mono text-xs">
                                    {ip}
                                </SheetDescription>
                            )}
                        </div>
                    </div>
                </SheetHeader>

                {isLoading ? (
                    <div className="flex flex-1 items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">{t('clientDetail.loading')}</span>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        {/* 状态卡片 */}
                        <div className="px-6 py-4 border-b border-border/40">
                            <div className="flex flex-wrap gap-2">
                                {client ? (
                                    <>
                                        <button
                                            onClick={() => toggleFilterMutation.mutate({ id: client.id, c: client })}
                                            disabled={toggleFilterMutation.isPending}
                                            title={t('clientDetail.filterToggleTip')}
                                            className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/40 px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/70 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {toggleFilterMutation.isPending ? (
                                                <>
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                                    <span className="text-muted-foreground">{client.filter_enabled ? t('clientDetail.filterEnabled') : t('clientDetail.filterDisabled')}</span>
                                                </>
                                            ) : client.filter_enabled ? (
                                                <>
                                                    <Shield className="h-3.5 w-3.5 text-green-500" />
                                                    <span className="text-green-700 dark:text-green-400">{t('clientDetail.filterEnabled')}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldOff className="h-3.5 w-3.5 text-orange-500" />
                                                    <span className="text-orange-700 dark:text-orange-400">{t('clientDetail.filterDisabled')}</span>
                                                </>
                                            )}
                                        </button>
                                        <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/40 px-3 py-1.5 text-sm font-mono text-xs text-muted-foreground">
                                            {ip}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground">
                                        <Monitor className="h-3.5 w-3.5" />
                                        <span className="font-mono text-xs">{ip}</span>
                                    </div>
                                )}
                                {geoData?.status === 'success' && (() => {
                                    const flag = geoData.countryCode
                                        .toUpperCase()
                                        .split('')
                                        .map((c: string) => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
                                        .join('');
                                    const ispOrg = geoData.org || geoData.isp;
                                    const location = geoData.city ? `${geoData.city}, ${geoData.country}` : geoData.country;
                                    return (
                                        <>
                                            <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/40 px-3 py-1.5 text-sm">
                                                <span>{flag}</span>
                                                <span className="text-muted-foreground">{location}</span>
                                            </div>
                                            {ispOrg && (
                                                <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/40 px-3 py-1.5 text-sm">
                                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="text-muted-foreground">{ispOrg}</span>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                                {ptrRecord && (
                                    <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/40 px-3 py-1.5 text-sm">
                                        <span className="font-mono text-xs text-muted-foreground">{ptrRecord}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 查询活动 */}
                        {client?.id && (
                            <div className="px-6 py-4 border-b border-border/40">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-medium">{t('clientDetail.activityTitle')}</h3>
                                    <div className="flex gap-1">
                                        {([6, 24, 72, 168] as const).map((h) => (
                                            <button
                                                key={h}
                                                onClick={() => setHours(h)}
                                                className={`text-xs px-2 py-0.5 rounded transition-colors ${hours === h ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                            >
                                                {h < 24 ? `${h}h` : h === 24 ? '24h' : h === 72 ? '3d' : '7d'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {activityLoading ? (
                                    <div className="h-[160px] flex items-center justify-center">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                ) : !activityData || activityData.data.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-6 text-center">{t('clientDetail.activityEmpty')}</p>
                                ) : (
                                    <>
                                        <ResponsiveContainer width="100%" height={160}>
                                            <BarChart data={activityData.data.map(b => ({
                                                hour: b.hour.slice(11, 16),
                                                [t('clientDetail.activityAllowed')]: b.total - b.blocked,
                                                [t('clientDetail.activityBlocked')]: b.blocked,
                                            }))} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={hours <= 24 ? 3 : hours <= 72 ? 11 : 23} />
                                                <YAxis tick={{ fontSize: 10 }} />
                                                <RechartsTooltip />
                                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                                <Bar dataKey={t('clientDetail.activityAllowed')} stackId="a" fill="hsl(var(--chart-2))" />
                                                <Bar dataKey={t('clientDetail.activityBlocked')} stackId="a" fill="hsl(var(--chart-5))" radius={[2, 2, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                        {activityData.top_domains.length > 0 && (
                                            <div className="mt-3">
                                                <p className="text-xs font-medium text-muted-foreground mb-2">{t('clientDetail.activityTopDomains')}</p>
                                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                                    {activityData.top_domains.map((d) => (
                                                        <div key={d.domain} className="flex items-center justify-between text-xs">
                                                            <span className="font-mono truncate max-w-[80%]">{d.domain}</span>
                                                            <span className="text-muted-foreground shrink-0">{d.count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* 最近查询 */}
                        <div className="px-6 py-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-medium">{t('clientDetail.recentQueries')}</h3>
                                {ip && (
                                    <Link
                                        to={`/query-logs?client=${encodeURIComponent(ip)}`}
                                        onClick={() => onOpenChange(false)}
                                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        {t('clientDetail.viewAllLogs')}
                                    </Link>
                                )}
                            </div>

                            {logs.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
                                    {t('clientDetail.noQueries')}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {logs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                                        >
                                            <Badge
                                                variant="outline"
                                                className={`shrink-0 text-xs px-1.5 py-0 ${
                                                    log.status === 'blocked'
                                                        ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400'
                                                        : 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400'
                                                }`}
                                            >
                                                {log.status === 'blocked'
                                                    ? t('queryLogs.statusBlocked2')
                                                    : t('queryLogs.statusAllowed2')}
                                            </Badge>
                                            <span className="flex-1 truncate font-mono text-xs text-foreground/90">
                                                {log.question}
                                            </span>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(log.time), { addSuffix: true })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
