import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatChartHour } from '@/lib/datetime';

export interface UpstreamTrendData {
  time: string;
  upstreams: Record<string, number>;
}

interface UpstreamTrendChartProps {
  data: UpstreamTrendData[];
  isLoading?: boolean;
}

/**
 * Generate consistent colors for upstreams based on their name hash
 */
function getColor(upstreamName: string): string {
  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    '#22c55e', // green-500
    '#eab308', // yellow-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#f97316', // orange-500
    '#14b8a6', // teal-500
  ];

  // Simple hash-based color selection
  const hash = upstreamName.split('').reduce((acc, char) =>
    acc + char.charCodeAt(0), 0
  );
  return colors[hash % colors.length];
}

/**
 * Transform API data to Recharts format
 * Converts { time: string, upstreams: { name: count } }[]
 * to { time: string, name: count }[] with all upstreams as columns
 */
function transformData(apiData: UpstreamTrendData[]): Record<string, any>[] {
  if (apiData.length === 0) return [];

  // Step 1: Collect all unique upstream names
  const allUpstreams = new Set<string>();
  apiData.forEach(item => {
    Object.keys(item.upstreams).forEach(name => allUpstreams.add(name));
  });

  // Step 2: Convert each time bucket to a flat object
  return apiData.map(item => {
    const flat: Record<string, any> = { time: item.time };
    allUpstreams.forEach(name => {
      flat[name] = item.upstreams[name] || 0;
    });
    return flat;
  });
}

/**
 * Format number with K suffix for large values
 */
function formatNumber(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
}

export function UpstreamTrendChart({ data, isLoading }: UpstreamTrendChartProps) {
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
        <p className="text-sm text-muted-foreground">{t('dashboard.trendNoData')}</p>
      </div>
    );
  }

  const chartData = transformData(data);

  // Get unique upstream names from the first data point (all points have same keys)
  const upstreamNames = Object.keys(chartData[0]).filter(key => key !== 'time');

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
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
          tickFormatter={formatNumber}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
          labelFormatter={(label) => formatChartHour(label as string)}
        />
        <Legend
          wrapperStyle={{
            paddingTop: '1rem',
          }}
        />
        {upstreamNames.map((name) => (
          <Area
            key={name}
            type="monotone"
            dataKey={name}
            stackId="1"
            stroke={getColor(name)}
            fill={getColor(name)}
            fillOpacity={0.6}
            name={name}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
