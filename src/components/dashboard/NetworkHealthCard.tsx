import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardStats } from '@/api/types';
import type { DnsUpstream } from '@/api/upstreams';

interface Props {
  stats: DashboardStats | undefined;
  upstreams: DnsUpstream[];
  isLoading: boolean;
  upstreamsLoading: boolean;
}

type OverallStatus = 'healthy' | 'warning' | 'critical';

function computeOverallStatus(
  stats: DashboardStats | undefined,
  upstreams: DnsUpstream[],
): OverallStatus {
  const activeUpstreams = upstreams.filter((u) => u.is_active);

  // No active upstreams means DNS forwarding is misconfigured
  if (activeUpstreams.length === 0) return 'warning';

  const hasDegraded = activeUpstreams.some(
    (u) => u.health_status === 'degraded' || u.health_status === 'down',
  );
  if (hasDegraded) return 'critical';

  const hasUnknown = activeUpstreams.some((u) => u.health_status === 'unknown');
  const blockRate = stats?.block_rate ?? 0;
  const totalQueries = stats?.total_queries ?? 0;

  if (hasUnknown) return 'warning';
  if (blockRate < 0.1 && totalQueries > 100) return 'warning';

  return 'healthy';
}

function computeUpstreamAvailability(upstreams: DnsUpstream[]): {
  ratio: string;
  label: string;
  color: 'green' | 'yellow' | 'red';
} {
  const active = upstreams.filter((u) => u.is_active);
  if (active.length === 0) {
    return { ratio: '0/0', label: 'healthNoUpstreams', color: 'yellow' };
  }

  const healthy = active.filter((u) => u.health_status === 'healthy').length;
  const hasDegraded = active.some(
    (u) => u.health_status === 'degraded' || u.health_status === 'down',
  );
  const hasUnknown = active.some((u) => u.health_status === 'unknown');

  const ratio = `${healthy}/${active.length}`;

  if (hasDegraded) return { ratio, label: 'healthHasDegraded', color: 'red' };
  if (hasUnknown) return { ratio, label: 'healthHasUnknown', color: 'yellow' };
  return { ratio, label: 'healthAllHealthy', color: 'green' };
}

function computeBlockRateInfo(
  stats: DashboardStats | undefined,
): {
  value: string;
  label: string;
  color: 'green' | 'yellow' | 'red';
} {
  const blockRate = stats?.block_rate ?? 0;
  const totalQueries = stats?.total_queries ?? 0;

  if (blockRate > 5) {
    return { value: `${blockRate.toFixed(1)}%`, label: 'healthFilterActive', color: 'green' };
  }
  if (blockRate >= 0.1) {
    return { value: `${blockRate.toFixed(1)}%`, label: 'healthLowBlockRate', color: 'yellow' };
  }
  // < 0.1%
  if (totalQueries === 0) {
    return { value: '0.0%', label: 'healthNoTraffic', color: 'red' };
  }
  // Has traffic but nothing is being blocked — filter may be inactive or misconfigured
  return { value: `${blockRate.toFixed(1)}%`, label: 'healthFilterInactive', color: 'red' };
}

const COLOR_CLASSES = {
  green: 'text-green-600 dark:text-green-400',
  yellow: 'text-yellow-600 dark:text-yellow-500',
  red: 'text-destructive',
} as const;

const DOT_CLASSES = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
} as const;

export function NetworkHealthCard({ stats, upstreams, isLoading, upstreamsLoading }: Props) {
  const { t } = useTranslation();

  const overallStatus = computeOverallStatus(stats, upstreams);
  const upstream = computeUpstreamAvailability(upstreams);
  const blockRateInfo = computeBlockRateInfo(stats);
  const qps = stats?.qps ?? 0;

  const overallDotColor =
    overallStatus === 'healthy' ? 'green' : overallStatus === 'warning' ? 'yellow' : 'red';

  const overallTextKey =
    overallStatus === 'healthy'
      ? 'networkHealthy'
      : overallStatus === 'warning'
        ? 'networkWarning'
        : 'networkCritical';

  const anyLoading = isLoading || upstreamsLoading;

  const actionLink =
    !anyLoading && overallStatus !== 'healthy'
      ? upstream.color !== 'green'
        ? { to: '/upstreams', labelKey: 'goToUpstreams' }
        : { to: '/filters', labelKey: 'goToFilters' }
      : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {t('dashboard.networkHealth')}
          {anyLoading ? (
            <div className="h-2 w-2 rounded-full animate-pulse bg-muted" />
          ) : (
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${DOT_CLASSES[overallDotColor]}`} />
              <span className={`text-xs font-normal ${COLOR_CLASSES[overallDotColor]}`}>
                {t(`dashboard.${overallTextKey}`)}
              </span>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 divide-x divide-border">
          {/* 拦截率 */}
          <div className="flex flex-col items-center gap-1 px-3 first:pl-0">
            <span className="text-xs text-muted-foreground">{t('dashboard.healthBlockRate')}</span>
            {anyLoading ? (
              <div className="h-5 w-20 animate-pulse bg-muted rounded" />
            ) : (
              <span className={`text-sm font-semibold ${COLOR_CLASSES[blockRateInfo.color]}`}>
                {blockRateInfo.value}
              </span>
            )}
            {anyLoading ? (
              <div className="h-3 w-16 animate-pulse bg-muted rounded" />
            ) : (
              <span className={`text-xs ${COLOR_CLASSES[blockRateInfo.color]}`}>
                {t(`dashboard.${blockRateInfo.label}`)}
              </span>
            )}
          </div>

          {/* 上游可用性 */}
          <div className="flex flex-col items-center gap-1 px-3">
            <span className="text-xs text-muted-foreground">
              {t('dashboard.healthUpstreamAvail')}
            </span>
            {upstreamsLoading ? (
              <div className="h-5 w-20 animate-pulse bg-muted rounded" />
            ) : (
              <span className={`text-sm font-semibold ${COLOR_CLASSES[upstream.color]}`}>
                {upstream.ratio}
              </span>
            )}
            {upstreamsLoading ? (
              <div className="h-3 w-16 animate-pulse bg-muted rounded" />
            ) : (
              <span className={`text-xs ${COLOR_CLASSES[upstream.color]}`}>
                {t(`dashboard.${upstream.label}`)}
              </span>
            )}
          </div>

          {/* 当前 QPS */}
          <div className="flex flex-col items-center gap-1 px-3 last:pr-0">
            <span className="text-xs text-muted-foreground">{t('dashboard.healthQps')}</span>
            {isLoading ? (
              <div className="h-5 w-20 animate-pulse bg-muted rounded" />
            ) : (
              <span className="text-sm font-semibold text-foreground">{qps}/s</span>
            )}
            <span className="text-xs text-muted-foreground invisible">-</span>
          </div>
        </div>
        {actionLink && (
          <div className="mt-3 pt-3 border-t text-center">
            <Link
              to={actionLink.to}
              className="text-xs text-primary hover:underline"
            >
              {t(`dashboard.${actionLink.labelKey}`)} →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
