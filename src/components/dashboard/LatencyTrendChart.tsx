import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatChartHour } from '@/lib/datetime';

export interface LatencyTrendData {
  time: string;
  p50_ms: number;
  p95_ms: number;
  sample_count: number;
}

interface LatencyTrendChartProps {
  data: LatencyTrendData[];
  isLoading?: boolean;
}

export function LatencyTrendChart({ data, isLoading }: LatencyTrendChartProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">{t('dashboard.trendLoading')}</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg">
        <p className="text-sm text-muted-foreground">{t('dashboard.latencyTrendNoData')}</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-muted" />
        <XAxis
          dataKey="time"
          stroke="currentColor"
          className="stroke-muted-foreground"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatChartHour}
        />
        <YAxis
          stroke="currentColor"
          className="stroke-muted-foreground"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}ms`}
          width={48}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
          labelFormatter={(label) => formatChartHour(label as string)}
          formatter={(value: number | undefined, name: string | undefined) => [value != null ? `${value} ms` : '-', name ?? '']}
        />
        <Legend wrapperStyle={{ paddingTop: '1rem' }} />
        <Line
          type="monotone"
          dataKey="p50_ms"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          name={t('dashboard.latencyP50')}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="p95_ms"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          name={t('dashboard.latencyP95')}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
