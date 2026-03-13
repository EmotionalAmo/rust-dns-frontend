import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Bell, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { QueryClient } from '@tanstack/react-query';

type HealthBanner = {
  level: 'ok' | 'warning' | 'danger';
  count: number;
  total: number;
  blockRate: string;
  latestP50: number;
  issues: string[];
} | null;

interface DashboardHeaderProps {
  hours: number;
  onHoursChange: (v: string) => void;
  unreadAlertCount: number;
  showAlertBanner: boolean;
  onCloseAlertBanner: () => void;
  healthBanner: HealthBanner;
  queryClient: QueryClient;
}

export function DashboardHeader({
  hours,
  onHoursChange,
  unreadAlertCount,
  showAlertBanner,
  onCloseAlertBanner,
  healthBanner,
  queryClient,
}: DashboardHeaderProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* 时间范围选择器 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('dashboard.dataRange')}</span>
          <Select value={String(hours)} onValueChange={onHoursChange}>
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24">{t('dashboard.timeRanges.24')}</SelectItem>
              <SelectItem value="168">{t('dashboard.timeRanges.168')}</SelectItem>
              <SelectItem value="720">{t('dashboard.timeRanges.720')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard'] })}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors focus:outline-none"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('dashboard.refreshStatus')}
        </button>
      </div>

      {/* Alert Banner */}
      {showAlertBanner && unreadAlertCount > 0 && (
        <div className="flex items-center justify-between rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-2.5 text-sm">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <Bell className="h-4 w-4 shrink-0" />
            <span>{t('dashboard.alertBanner', { count: unreadAlertCount })}</span>
            <Link to="/alerts" className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100">
              {t('dashboard.alertBannerLink')}
            </Link>
          </div>
          <button onClick={onCloseAlertBanner} className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100 ml-4">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Health Summary Banner */}
      {healthBanner && (
        <div className={`rounded-md border px-4 py-2.5 text-sm ${
          healthBanner.level === 'ok'
            ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
            : healthBanner.level === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
        }`}>
          <div className="flex items-start gap-2">
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
              healthBanner.level === 'ok' ? 'bg-green-500' : healthBanner.level === 'warning' ? 'bg-amber-500' : 'bg-red-500'
            }`} />
            <div>
              <span>
                {healthBanner.level === 'ok'
                  ? t('dashboard.healthBannerOk', { total: healthBanner.total.toLocaleString(), blockRate: healthBanner.blockRate })
                  : healthBanner.level === 'warning'
                    ? t('dashboard.healthBannerWarning', { count: healthBanner.count })
                    : t('dashboard.healthBannerDanger', { count: healthBanner.count })
                }
                {healthBanner.level === 'ok' && healthBanner.latestP50 > 0 && (
                  <span className="ml-1 opacity-70">{t('dashboard.healthBannerLatency', { ms: healthBanner.latestP50 })}</span>
                )}
              </span>
              {healthBanner.issues.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-xs opacity-80">
                  {healthBanner.issues.map((issue, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <span className="shrink-0">·</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
