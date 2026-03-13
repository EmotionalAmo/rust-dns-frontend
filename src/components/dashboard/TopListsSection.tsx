import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Activity, Globe, BookOpen, Pencil, Check, X } from 'lucide-react';
import type { TopDomainEntry, TopClientEntry } from '@/api/types';
import type { RuleStatEntry } from '@/api/ruleStats';
import type { ClientRecord } from '@/api/clients';
import type { UseMutationResult } from '@tanstack/react-query';
import { formatNumber } from '@/hooks/useDashboardData';

interface TopListsSectionProps {
  timeRangeLabel: string;
  topDomains: TopDomainEntry[];
  topDomainsLoading: boolean;
  topClients: TopClientEntry[];
  topClientsLoading: boolean;
  topQueriedDomains: TopDomainEntry[];
  topQueriedLoading: boolean;
  topRules: RuleStatEntry[];
  ruleStatsLoading: boolean;
  clientsList: ClientRecord[];
  editingClientIp: string | null;
  setEditingClientIp: (ip: string | null) => void;
  editingClientName: string;
  setEditingClientName: (name: string) => void;
  saveClientNameMutation: UseMutationResult<unknown, unknown, { ip: string; name: string }>;
}

export function TopListsSection({
  timeRangeLabel,
  topDomains,
  topDomainsLoading,
  topClients,
  topClientsLoading,
  topQueriedDomains,
  topQueriedLoading,
  topRules,
  ruleStatsLoading,
  clientsList,
  editingClientIp,
  setEditingClientIp,
  editingClientName,
  setEditingClientName,
  saveClientNameMutation,
}: TopListsSectionProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* 分组标题：Top 榜单 */}
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard.sectionTopLists')}</h3>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Top 10 Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top 10 Blocked Domains */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-destructive" />
              {t('dashboard.top10Blocked')}
            </CardTitle>
            <CardDescription>{t('dashboard.top10BlockedDesc', { timeRange: timeRangeLabel })}</CardDescription>
          </CardHeader>
          <CardContent>
            {topDomainsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-6 animate-pulse bg-muted rounded" />
                ))}
              </div>
            ) : topDomains.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noBlockData')}</p>
            ) : (
              <div className="space-y-2">
                {topDomains.map((entry, i) => {
                  const maxCount = topDomains[0]?.count ?? 1;
                  const pct = Math.round((entry.count / maxCount) * 100);
                  return (
                    <div key={entry.domain} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-mono text-xs max-w-[70%]" title={entry.domain}>
                          <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                          {entry.domain}
                        </span>
                        <span className="text-muted-foreground shrink-0 ml-2">{formatNumber(entry.count)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-destructive/60" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 10 Active Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {t('dashboard.top10Clients')}
            </CardTitle>
            <CardDescription>{t('dashboard.top10ClientsDesc', { timeRange: timeRangeLabel })}</CardDescription>
          </CardHeader>
          <CardContent>
            {topClientsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-6 animate-pulse bg-muted rounded" />
                ))}
              </div>
            ) : topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noClientData')}</p>
            ) : (() => {
                const avgBlockRate = topClients.reduce((s, c) => s + (c.block_rate ?? 0), 0) / topClients.length;
                return (
                  <div className="space-y-2">
                    {topClients.map((entry, i) => {
                      const maxCount = topClients[0]?.count ?? 1;
                      const pct = Math.round((entry.count / maxCount) * 100);
                      const blockRate = entry.block_rate ?? 0;
                      const isWarning = avgBlockRate > 0 && blockRate > avgBlockRate * 1.5 && blockRate <= avgBlockRate * 2;
                      const isDanger = avgBlockRate > 0 && blockRate > avgBlockRate * 2;
                      const clientRecord = clientsList.find(c => c.identifiers.includes(entry.client_ip));
                      const clientName = clientRecord?.name;
                      const isEditing = editingClientIp === entry.client_ip;
                      return (
                        <div key={entry.client_ip} className="space-y-1 group">
                          <div className="flex items-center justify-between text-sm gap-2">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    autoFocus
                                    className="h-5 text-xs border rounded px-1 w-28 bg-background"
                                    value={editingClientName}
                                    onChange={e => setEditingClientName(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') saveClientNameMutation.mutate({ ip: entry.client_ip, name: editingClientName });
                                      if (e.key === 'Escape') setEditingClientIp(null);
                                    }}
                                  />
                                  <button onClick={() => saveClientNameMutation.mutate({ ip: entry.client_ip, name: editingClientName })} className="text-primary hover:text-primary/80"><Check className="h-3 w-3" /></button>
                                  <button onClick={() => setEditingClientIp(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 min-w-0">
                                  <span className="font-mono text-xs truncate" title={entry.client_ip}>{entry.client_ip}</span>
                                  {clientName && <span className="text-xs text-muted-foreground truncate">({clientName})</span>}
                                  <button
                                    onClick={() => { setEditingClientIp(entry.client_ip); setEditingClientName(clientName ?? ''); }}
                                    className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 shrink-0"
                                    title="命名客户端"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-xs font-medium ${isDanger ? 'text-destructive' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                                {blockRate.toFixed(1)}%
                              </span>
                              <span className="text-muted-foreground text-xs">{formatNumber(entry.count)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isDanger ? 'bg-destructive/60' : isWarning ? 'bg-amber-400/60' : 'bg-primary/50'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            }
          </CardContent>
        </Card>
      </div>

      {/* Top Queried Domains */}
      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              {t('dashboard.top10Queried')}
            </CardTitle>
            <CardDescription>{t('dashboard.top10QueriedDesc', { timeRange: timeRangeLabel })}</CardDescription>
          </CardHeader>
          <CardContent>
            {topQueriedLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-6 animate-pulse bg-muted rounded" />
                ))}
              </div>
            ) : topQueriedDomains.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noQueryData')}</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {topQueriedDomains.map((entry, i) => {
                  const maxCount = topQueriedDomains[0]?.count ?? 1;
                  const pct = Math.round((entry.count / maxCount) * 100);
                  return (
                    <div key={entry.domain} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-mono text-xs max-w-[70%]" title={entry.domain}>
                          <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                          {entry.domain}
                        </span>
                        <span className="text-muted-foreground shrink-0 ml-2">{formatNumber(entry.count)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary/40" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rule Hit Leaderboard */}
      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              {t('dashboard.top10RuleHits')}
            </CardTitle>
            <CardDescription>{t('dashboard.top10RuleHitsDesc', { timeRange: timeRangeLabel })}</CardDescription>
          </CardHeader>
          <CardContent>
            {ruleStatsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-6 animate-pulse bg-muted rounded" />
                ))}
              </div>
            ) : topRules.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noRuleHitData')}</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {topRules.map((entry, i) => {
                  const maxCount = topRules[0]?.hit_count ?? 1;
                  const pct = Math.round((entry.hit_count / maxCount) * 100);
                  return (
                    <div key={entry.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-mono text-xs max-w-[70%]" title={entry.rule}>
                          <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                          {entry.rule}
                        </span>
                        <span className="text-muted-foreground shrink-0 ml-2">{formatNumber(entry.hit_count)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary/40" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
