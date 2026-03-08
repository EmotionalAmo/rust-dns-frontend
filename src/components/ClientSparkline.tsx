import { useQuery } from '@tanstack/react-query';
import { clientsApi } from '@/api/clients';

const W = 64;
const H = 28;

export function ClientSparkline({ clientId }: { clientId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['client-sparkline', clientId],
    queryFn: () => clientsApi.getActivity(clientId, 24),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <div className="w-16 h-7 animate-pulse bg-muted rounded" />;
  }

  const buckets = data?.data ?? [];
  if (buckets.length === 0) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  const totals = buckets.map((b) => b.total);
  const blockeds = buckets.map((b) => b.blocked);
  const max = Math.max(...totals, 1);
  const n = totals.length;
  const xStep = n > 1 ? W / (n - 1) : W;

  const toPoints = (values: number[]) =>
    values.map((v, i) => `${i * xStep},${H - (v / max) * (H - 2) - 1}`).join(' ');

  const totalPoints = toPoints(totals);
  const blockedPoints = toPoints(blockeds);

  // Area fill for total
  const firstX = 0;
  const lastX = (n - 1) * xStep;
  const areaPoints = `${firstX},${H} ${totalPoints} ${lastX},${H}`;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="overflow-visible"
    >
      {/* Area fill */}
      <polygon
        points={areaPoints}
        fill="hsl(var(--primary) / 0.08)"
      />
      {/* Total line */}
      <polyline
        points={totalPoints}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Blocked line */}
      <polyline
        points={blockedPoints}
        fill="none"
        stroke="hsl(var(--destructive))"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 1"
      />
    </svg>
  );
}
