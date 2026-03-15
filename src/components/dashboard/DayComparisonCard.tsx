import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Activity, Shield } from 'lucide-react';
import type { DashboardStats } from '@/api/';
import { formatNumber } from '@/hooks/useDashboardData';

interface DayComparisonCardProps {
  stats: DashboardStats | undefined;
  isLoading: boolean;
  hours: number;
}

interface ComparisonItemProps {
  label: string;
  today: number;
  yesterday: number | undefined;
  icon: React.ElementType;
  isLoading: boolean;
  // higher is worse (for blocked queries the trend meaning is inverted contextually,
  // but we show raw delta without judgement — caller decides icon color override)
  invertTrend?: boolean;
}

function ComparisonItem({
  label,
  today,
  yesterday,
  icon: Icon,
  isLoading,
  invertTrend = false,
}: ComparisonItemProps) {
  const hasYesterday = yesterday !== undefined && yesterday !== null;

  const pctChange =
    hasYesterday && yesterday > 0
      ? ((today - yesterday) / yesterday) * 100
      : null;

  const trend =
    pctChange === null
      ? 'flat'
      : Math.abs(pctChange) < 0.5
        ? 'flat'
        : pctChange > 0
          ? 'up'
          : 'down';

  // For total queries: up = green (more traffic), down = red
  // For blocked queries: up = red (more blocks), down = green
  const trendColor =
    trend === 'flat'
      ? 'text-muted-foreground'
      : invertTrend
        ? trend === 'up'
          ? 'text-red-500'
          : 'text-green-500'
        : trend === 'up'
          ? 'text-green-500'
          : 'text-red-500';

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>

      <div className="flex items-center gap-3 tabular-nums">
        {/* Yesterday */}
        <div className="text-right min-w-[4rem]">
          {isLoading ? (
            <div className="h-4 w-12 animate-pulse bg-muted rounded ml-auto" />
          ) : (
            <span className="text-xs text-muted-foreground">
              {hasYesterday ? formatNumber(yesterday!) : '—'}
            </span>
          )}
        </div>

        {/* Arrow */}
        <div className={`flex items-center gap-0.5 text-xs font-medium ${trendColor} min-w-[4.5rem] justify-end`}>
          {isLoading ? (
            <div className="h-4 w-12 animate-pulse bg-muted rounded" />
          ) : (
            <>
              {trend === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
              {trend === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
              {trend === 'flat' && <Minus className="h-3.5 w-3.5" />}
              {pctChange !== null
                ? `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}%`
                : '—'}
            </>
          )}
        </div>

        {/* Today */}
        <div className="text-right min-w-[4rem]">
          {isLoading ? (
            <div className="h-5 w-14 animate-pulse bg-muted rounded ml-auto" />
          ) : (
            <span className="text-sm font-semibold">{formatNumber(today)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function DayComparisonCard({ stats, isLoading, hours }: DayComparisonCardProps) {
  const { t } = useTranslation();

  const today = {
    total: stats?.total_queries ?? 0,
    blocked: stats?.blocked_queries ?? 0,
  };

  const yesterday = {
    total: stats?.yesterday_total_queries,
    blocked: stats?.yesterday_blocked_queries,
  };

  // Label based on hours window
  const periodLabel =
    hours <= 24
      ? t('dashboard.comparison.period24h')
      : hours <= 168
        ? t('dashboard.comparison.period7d')
        : t('dashboard.comparison.period30d');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {t('dashboard.comparison.title')}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Column headers */}
        <div className="flex items-center justify-between pb-1 border-b border-border mb-1">
          <div className="text-xs text-muted-foreground w-32" />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="min-w-[4rem] text-right">{t('dashboard.comparison.previous')}</span>
            <span className="min-w-[4.5rem] text-right">{t('dashboard.comparison.change')}</span>
            <span className="min-w-[4rem] text-right">{t('dashboard.comparison.current')}</span>
          </div>
        </div>

        <ComparisonItem
          label={t('dashboard.totalQueries')}
          today={today.total}
          yesterday={yesterday.total}
          icon={Activity}
          isLoading={isLoading}
          invertTrend={false}
        />
        <ComparisonItem
          label={t('dashboard.blockedQueries')}
          today={today.blocked}
          yesterday={yesterday.blocked}
          icon={Shield}
          isLoading={isLoading}
          invertTrend={true}
        />
      </CardContent>
    </Card>
  );
}
