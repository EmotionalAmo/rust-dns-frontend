import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

export interface UpstreamDistributionData {
  upstream: string;
  count: number;
  percentage: number;
}

interface UpstreamDistributionChartProps {
  data: UpstreamDistributionData[];
  isLoading?: boolean;
}

/**
 * Generate consistent colors for upstreams
 */
function getColor(index: number): string {
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
  return colors[index % colors.length];
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

/**
 * Truncate upstream name for display
 */
function truncateUpstream(name: string, maxLength = 25): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
}

/**
 * Custom tooltip that shows both query count and percentage
 */
function CustomTooltip({
  active,
  payload,
  label,
  t,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { count: number; percentage: number } }>;
  label?: string;
  t: (key: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const { count, percentage } = payload[0].payload;
  return (
    <div
      style={{
        backgroundColor: 'hsl(var(--background))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '0.5rem',
        padding: '8px 12px',
        color: 'hsl(var(--foreground))',
        fontSize: 12,
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      <p>{t('dashboard.upstreamQueries')}: <strong>{formatNumber(count)}</strong></p>
      <p>{t('dashboard.upstreamPercentage')}: <strong>{percentage.toFixed(1)}%</strong></p>
    </div>
  );
}

export function UpstreamDistributionChart({ data, isLoading }: UpstreamDistributionChartProps) {
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

  // Transform data for horizontal bar chart
  const chartData = data.map((item, index) => ({
    upstream: truncateUpstream(item.upstream),
    count: item.count,
    percentage: item.percentage,
    color: getColor(index),
  }));

  // Dynamic chart height: at least 200px, 44px per row capped at 300px
  const chartHeight = Math.min(300, Math.max(200, chartData.length * 44));

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 60, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-muted" horizontal={false} />
        <XAxis
          type="number"
          stroke="currentColor"
          className="stroke-muted-foreground"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatNumber}
        />
        <YAxis
          type="category"
          dataKey="upstream"
          stroke="currentColor"
          className="stroke-muted-foreground"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={150}
        />
        <Tooltip
          content={(props) => (
            <CustomTooltip
              active={props.active}
              payload={props.payload as Array<{ value: number; payload: { count: number; percentage: number } }>}
              label={typeof props.label === 'number' ? String(props.label) : props.label}
              t={t}
            />
          )}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
          <LabelList
            dataKey="percentage"
            position="right"
            formatter={(v: unknown) => {
              const num = Number(v);
              return isNaN(num) ? '' : `${num.toFixed(1)}%`;
            }}
            style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
