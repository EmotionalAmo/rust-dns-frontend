import { useDashboardData } from '@/hooks/useDashboardData';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatsOverview } from '@/components/dashboard/StatsOverview';
import { TopListsSection } from '@/components/dashboard/TopListsSection';
import { UpstreamSection } from '@/components/dashboard/UpstreamSection';

export default function DashboardPage() {
  const data = useDashboardData();

  return (
    <div className="space-y-6">
      <DashboardHeader
        hours={data.hours}
        onHoursChange={data.handleHoursChange}
        unreadAlertCount={data.unreadAlertCount}
        showAlertBanner={data.showAlertBanner}
        onCloseAlertBanner={() => data.setShowAlertBanner(false)}
        healthBanner={data.healthBanner}
        queryClient={data.queryClient}
      />
      <StatsOverview
        hours={data.hours}
        timeRangeLabel={data.timeRangeLabel}
        stats={data.stats}
        isLoading={data.isLoading}
        error={data.error}
        trendData={data.trendData}
        trendLoading={data.trendLoading}
        upstreamsList={data.upstreamsList}
        upstreamsListLoading={data.upstreamsListLoading}
        upstreamTrendLoading={data.upstreamTrendLoading}
        activeUpstreams={data.activeUpstreams}
        latencyTrendData={data.latencyTrendData}
        latencyTrendLoading={data.latencyTrendLoading}
      />
      <TopListsSection
        timeRangeLabel={data.timeRangeLabel}
        topDomains={data.topDomains}
        topDomainsLoading={data.topDomainsLoading}
        topClients={data.topClients}
        topClientsLoading={data.topClientsLoading}
        topQueriedDomains={data.topQueriedDomains}
        topQueriedLoading={data.topQueriedLoading}
        topRules={data.topRules}
        ruleStatsLoading={data.ruleStatsLoading}
        clientsList={data.clientsList}
        editingClientIp={data.editingClientIp}
        setEditingClientIp={data.setEditingClientIp}
        editingClientName={data.editingClientName}
        setEditingClientName={data.setEditingClientName}
        saveClientNameMutation={data.saveClientNameMutation}
      />
      <UpstreamSection
        timeRangeLabel={data.timeRangeLabel}
        upstreamHealthData={data.upstreamHealthData}
        upstreamHealthNames={data.upstreamHealthNames}
        upstreamHealthLoading={data.upstreamHealthLoading}
        upstreamTrendData={data.upstreamTrendData}
        upstreamTrendLoading={data.upstreamTrendLoading}
        upstreamDistribution={data.upstreamDistribution}
        upstreamDistributionLoading={data.upstreamDistributionLoading}
      />
    </div>
  );
}
