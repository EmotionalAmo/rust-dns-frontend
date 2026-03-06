import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '@/api/client';

interface LatencyStats {
  p50_ms: number | null;
  p95_ms: number | null;
  p99_ms: number | null;
  sample_count: number;
}

async function fetchLatencyStats(hours: number): Promise<LatencyStats> {
  const { data } = await apiClient.get<LatencyStats>('/api/v1/dashboard/latency-stats', {
    params: { hours },
  });
  return data;
}

function getLatencyColor(ms: number | null): string {
  if (ms === null) return 'text-muted-foreground';
  if (ms < 50) return 'text-green-600 dark:text-green-400';
  if (ms <= 200) return 'text-yellow-600 dark:text-yellow-500';
  return 'text-destructive';
}

function getLatencyLabel(ms: number | null, t: (key: string) => string): string {
  if (ms === null) return '-';
  if (ms < 50) return t('dashboard.latencyFast');
  if (ms <= 200) return t('dashboard.latencySlow');
  return t('dashboard.latencyVerySlow');
}

interface Props {
  hours?: number;
}

export function LatencyStatsCard({ hours = 24 }: Props) {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'latency-stats', hours],
    queryFn: () => fetchLatencyStats(hours),
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const insufficient = !isLoading && (data === undefined || data.sample_count < 10);

  const metrics = [
    { label: t('dashboard.latencyP50'), value: data?.p50_ms ?? null, neutral: true },
    { label: t('dashboard.latencyP95'), value: data?.p95_ms ?? null, neutral: false },
    { label: t('dashboard.latencyP99'), value: data?.p99_ms ?? null, neutral: false },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {t('dashboard.latencyStats')}
          {!isLoading && data && data.sample_count >= 10 && (
            <span className="text-xs font-normal text-muted-foreground">
              {t('dashboard.latencySampleCount', { count: data.sample_count })}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {insufficient ? (
          <div className="flex flex-col items-center justify-center py-3 gap-1">
            <span className="text-sm font-medium text-muted-foreground">
              {t('dashboard.latencyNoData')}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('dashboard.latencyNoDataDesc')}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-3 divide-x divide-border">
            {metrics.map(({ label, value, neutral }) => {
              const colorClass = neutral ? 'text-foreground' : getLatencyColor(value);
              const sublabel = neutral ? '' : getLatencyLabel(value, t);
              return (
                <div key={label} className="flex flex-col items-center gap-1 px-3 first:pl-0 last:pr-0">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  {isLoading ? (
                    <div className="h-5 w-20 animate-pulse bg-muted rounded" />
                  ) : (
                    <span className={`text-sm font-semibold ${colorClass}`}>
                      {value !== null ? `${value} ms` : '-'}
                    </span>
                  )}
                  {isLoading ? (
                    <div className="h-3 w-16 animate-pulse bg-muted rounded" />
                  ) : neutral ? (
                    <span className="text-xs text-muted-foreground invisible">-</span>
                  ) : (
                    <span className={`text-xs ${colorClass}`}>{sublabel}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
