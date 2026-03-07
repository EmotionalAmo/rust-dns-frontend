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

export interface UpstreamHealthHistoryData {
  time: string;
  upstreams: Record<string, number>;
}

interface Props {
  data: UpstreamHealthHistoryData[];
  upstreams: string[];
  isLoading?: boolean;
}

const COLORS = [
  'hsl(var(--primary))',
  '#22c55e',
  '#eab308',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#14b8a6',
  '#3b82f6',
];

function getColor(name: string): string {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
}

function transformData(
  apiData: UpstreamHealthHistoryData[],
  upstreams: string[]
): Record<string, unknown>[] {
  return apiData.map((item) => {
    const flat: Record<string, unknown> = { time: item.time };
    upstreams.forEach((name) => {
      flat[name] = item.upstreams[name] ?? null;
    });
    return flat;
  });
}

export function UpstreamHealthHistoryChart({ data, upstreams, isLoading }: Props) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="h-[240px] flex items-center justify-center bg-muted/20 rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">{t('dashboard.trendLoading')}</p>
        </div>
      </div>
    );
  }

  if (data.length === 0 || upstreams.length === 0) {
    return (
      <div className="h-[240px] flex items-center justify-center bg-muted/20 rounded-lg">
        <p className="text-sm text-muted-foreground">{t('dashboard.upstreamHealthNoData')}</p>
      </div>
    );
  }

  const chartData = transformData(data, upstreams);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData}>
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
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          width={42}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
          labelFormatter={(label) => formatChartHour(label as string)}
          formatter={(value: unknown) =>
            value !== null ? [`${value}%`, ''] : ['-', '']
          }
        />
        <Legend wrapperStyle={{ paddingTop: '0.75rem' }} />
        {upstreams.map((name) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={getColor(name)}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            name={name}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
