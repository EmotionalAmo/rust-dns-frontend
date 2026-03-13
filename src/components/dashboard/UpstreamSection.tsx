import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UpstreamHealthHistoryChart } from '@/components/dashboard/UpstreamHealthHistoryChart';
import { UpstreamTrendChart } from '@/components/dashboard/UpstreamTrendChart';
import { UpstreamDistributionChart } from '@/components/dashboard/UpstreamDistributionChart';
import type { UpstreamTrendData } from '@/components/dashboard/UpstreamTrendChart';
import type { UpstreamDistributionData } from '@/components/dashboard/UpstreamDistributionChart';
import type { UpstreamHealthHistoryData } from '@/components/dashboard/UpstreamHealthHistoryChart';

interface UpstreamSectionProps {
  timeRangeLabel: string;
  upstreamHealthData: UpstreamHealthHistoryData[];
  upstreamHealthNames: string[];
  upstreamHealthLoading: boolean;
  upstreamTrendData: UpstreamTrendData[];
  upstreamTrendLoading: boolean;
  upstreamDistribution: UpstreamDistributionData[];
  upstreamDistributionLoading: boolean;
}

export function UpstreamSection({
  timeRangeLabel,
  upstreamHealthData,
  upstreamHealthNames,
  upstreamHealthLoading,
  upstreamTrendData,
  upstreamTrendLoading,
  upstreamDistribution,
  upstreamDistributionLoading,
}: UpstreamSectionProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* 分组标题：上游分析 */}
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard.sectionUpstreamAnalysis')}</h3>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Upstream Health History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.upstreamHealthHistory')}</CardTitle>
          <CardDescription>{t('dashboard.upstreamHealthHistoryDesc', { timeRange: timeRangeLabel })}</CardDescription>
        </CardHeader>
        <CardContent>
          <UpstreamHealthHistoryChart
            data={upstreamHealthData}
            upstreams={upstreamHealthNames}
            isLoading={upstreamHealthLoading}
          />
        </CardContent>
      </Card>

      {/* Upstream Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.upstreamDistributionTrend')}</CardTitle>
            <CardDescription>{t('dashboard.upstreamDistributionDesc', { timeRange: timeRangeLabel })}</CardDescription>
          </CardHeader>
          <CardContent>
            <UpstreamTrendChart data={upstreamTrendData} isLoading={upstreamTrendLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.upstreamDistributionStats')}</CardTitle>
            <CardDescription>{t('dashboard.upstreamDistributionDesc', { timeRange: timeRangeLabel })}</CardDescription>
          </CardHeader>
          <CardContent>
            <UpstreamDistributionChart data={upstreamDistribution} isLoading={upstreamDistributionLoading} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
