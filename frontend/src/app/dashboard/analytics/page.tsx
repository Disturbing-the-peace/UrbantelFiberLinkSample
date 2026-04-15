'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { analyticsApi } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { dataCache } from '@/lib/cache';
import LoadingSpinner from '@/components/LoadingSpinner';

// Dynamically import the map component to avoid SSR issues
const SubscriberMap = dynamic(() => import('@/components/SubscriberMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="md" />
        <p className="text-gray-600 dark:text-gray-400 mt-2">Loading map...</p>
      </div>
    </div>
  ),
});

interface AnalyticsData {
  subscribersMonthly: number;
  subscribersPerAgent: Array<{ agent_id: string; agent_name: string; count: number }>;
  subscribersPerPlan: Array<{ plan_id: string; plan_name: string; plan_category: string; count: number }>;
  subscriptionTrends: Array<{ month: string; count: number }>;
  conversionRate: { total_applications: number; activated_applications: number; conversion_rate: number };
  pendingApplications: number;
  totalCommissionsDue: { total_due: number; count: number };
  // Phase 1 additions
  pipelineSnapshot: Array<{ status: string; count: number }>;
  agentRankings: { period: string; rankings: Array<{ agent_id: string; agent_name: string; activations: number }> };
  agentActivationsByStatus: Array<{ agent_id: string; agent_name: string; statuses: Record<string, number> }>;
  stuckApplications: Array<{ id: string; customer_name: string; status: string; agent_name: string; days_stuck: number; updated_at: string }>;
  // Phase 2 additions (optional to handle API failures gracefully)
  agentCommissionsBreakdown?: Array<{ agent_id: string; agent_name: string; eligible: number; paid: number; total: number }>;
  pipelineDuration?: { average_days: number; count: number };
  planCategoryDistribution?: Array<{ category: string; count: number }>;
  revenueEstimates?: { total_mrr: number; subscriber_count: number; monthly_trend: Array<{ month: string; revenue: number; count: number }> };
  denialReasons?: Array<{ reason: string; count: number }>;
  // Phase 3 additions (optional)
  subscriberLocations?: Array<{ id: string; name: string; latitude: number; longitude: number; plan_name: string; plan_category: string }>;
  agentConversionRates?: Array<{ agent_id: string; agent_name: string; total: number; activated: number; conversion_rate: number }>;
  planConversionRates?: Array<{ category: string; total: number; activated: number; conversion_rate: number }>;
  growthComparison?: Array<{ month: string; count: number; growth_rate: number }>;
  voidRate?: { total_applications: number; voided_applications: number; void_rate: number };
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankingPeriod, setRankingPeriod] = useState<'monthly' | 'quarterly'>('monthly');
  const toast = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [rankingPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Phase 1 & Basic Analytics (required)
      const [
        subscribersMonthly,
        subscribersPerAgent,
        subscribersPerPlan,
        subscriptionTrends,
        conversionRate,
        pendingApplications,
        totalCommissionsDue,
        pipelineSnapshot,
        agentRankings,
        agentActivationsByStatus,
        stuckApplications,
      ] = await Promise.all([
        analyticsApi.subscribersMonthly(),
        analyticsApi.subscribersPerAgent(),
        analyticsApi.subscribersPerPlan(),
        analyticsApi.subscriptionTrends(),
        analyticsApi.conversionRate(),
        analyticsApi.pendingApplications(),
        analyticsApi.totalCommissionsDue(),
        analyticsApi.pipelineSnapshot(),
        analyticsApi.agentRankings(rankingPeriod),
        analyticsApi.agentActivationsByStatus(),
        analyticsApi.stuckApplications(),
      ]);

      // Phase 2 Analytics (optional - fetch individually to handle failures)
      let agentCommissionsBreakdown;
      let pipelineDuration;
      let planCategoryDistribution;
      let revenueEstimates;
      let denialReasons;

      try {
        agentCommissionsBreakdown = await analyticsApi.agentCommissionsBreakdown();
      } catch (err) {
        console.warn('Failed to fetch agent commissions breakdown:', err);
      }

      try {
        pipelineDuration = await analyticsApi.pipelineDuration();
      } catch (err) {
        console.warn('Failed to fetch pipeline duration:', err);
      }

      try {
        planCategoryDistribution = await analyticsApi.planCategoryDistribution();
      } catch (err) {
        console.warn('Failed to fetch plan category distribution:', err);
      }

      try {
        revenueEstimates = await analyticsApi.revenueEstimates();
      } catch (err) {
        console.warn('Failed to fetch revenue estimates:', err);
      }

      try {
        denialReasons = await analyticsApi.denialReasons();
      } catch (err) {
        console.warn('Failed to fetch denial reasons:', err);
      }

      // Phase 3 Analytics (optional - fetch individually to handle failures)
      let subscriberLocations;
      let agentConversionRates;
      let planConversionRates;
      let growthComparison;
      let voidRate;

      try {
        subscriberLocations = await analyticsApi.subscriberLocations();
      } catch (err) {
        console.warn('Failed to fetch subscriber locations:', err);
      }

      try {
        agentConversionRates = await analyticsApi.agentConversionRates();
      } catch (err) {
        console.warn('Failed to fetch agent conversion rates:', err);
      }

      try {
        planConversionRates = await analyticsApi.planConversionRates();
      } catch (err) {
        console.warn('Failed to fetch plan conversion rates:', err);
      }

      try {
        growthComparison = await analyticsApi.growthComparison();
      } catch (err) {
        console.warn('Failed to fetch growth comparison:', err);
      }

      try {
        voidRate = await analyticsApi.voidRate();
      } catch (err) {
        console.warn('Failed to fetch void rate:', err);
      }

      setAnalytics({
        subscribersMonthly: subscribersMonthly.count,
        subscribersPerAgent,
        subscribersPerPlan,
        subscriptionTrends,
        conversionRate,
        pendingApplications: pendingApplications.count,
        totalCommissionsDue,
        pipelineSnapshot,
        agentRankings,
        agentActivationsByStatus,
        stuckApplications,
        agentCommissionsBreakdown,
        pipelineDuration,
        planCategoryDistribution,
        revenueEstimates,
        denialReasons,
        subscriberLocations,
        agentConversionRates,
        planConversionRates,
        growthComparison,
        voidRate,
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    // Clear analytics cache
    dataCache.clearPattern('^analytics:');
    toast.success('Cache cleared. Refreshing data...');
    fetchAnalytics();
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#00A191] mb-6">Analytics Dashboard</h1>
        <div className="text-center py-12">
          <LoadingSpinner size="md" />
          <p className="mt-2 text-gray-900 dark:text-white">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#00A191] mb-6">Analytics Dashboard</h1>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">{error || 'No data available'}</div>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-[#00A191] text-white rounded-md hover:bg-[#008c7d] font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#00A191]">Analytics Dashboard</h1>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-4 py-2 bg-[#00A191] text-white rounded-md hover:bg-[#008c7d] disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          title="Clear cache and refresh data"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Subscribers This Month</h3>
          <p className="text-3xl font-bold text-[#00A191]">{analytics.subscribersMonthly}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Conversion Rate</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-500">{analytics.conversionRate.conversion_rate}%</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {analytics.conversionRate.activated_applications} / {analytics.conversionRate.total_applications} applications
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Pending Applications</h3>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-500">{analytics.pendingApplications}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Commissions Due</h3>
          <p className="text-3xl font-bold text-[#00A191]">₱{analytics.totalCommissionsDue.total_due.toFixed(2)}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{analytics.totalCommissionsDue.count} eligible commissions</p>
        </div>
      </div>

      {/* Operational Health - Stuck Applications Alert */}
      {analytics.stuckApplications.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Stuck Applications Alert</h3>
              <p className="text-sm text-red-700 mt-1">
                {analytics.stuckApplications.length} application(s) haven't been updated in 30+ days
              </p>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {analytics.stuckApplications.slice(0, 3).map(app => (
                    <li key={app.id}>
                      {app.customer_name} - {app.status} ({app.days_stuck} days)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Snapshot */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300 mb-6">
        <h3 className="text-lg font-semibold text-[#00A191] mb-4">Application Pipeline</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {analytics.pipelineSnapshot.map((item) => (
            <div key={item.status} className="text-center">
              <div className="text-2xl font-bold text-[#00A191]">{item.count}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Agent Rankings */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[#00A191]">Agent Rankings</h3>
            <select
              value={rankingPeriod}
              onChange={(e) => setRankingPeriod(e.target.value as 'monthly' | 'quarterly')}
              className="text-sm border border-[#C9B8EC] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#00A191]"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
          <div className="space-y-3">
            {analytics.agentRankings.rankings.slice(0, 5).map((agent, index) => (
              <div key={agent.agent_id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-[#00A191]'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{agent.agent_name}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{agent.activations} activations</div>
                </div>
              </div>
            ))}
            {analytics.agentRankings.rankings.length === 0 && (
              <p className="text-gray-600 dark:text-gray-400 text-center py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Subscribers per Plan */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-[#00A191] mb-4">Subscribers per Plan</h3>
          <div className="space-y-2">
            {analytics.subscribersPerPlan.map((plan, index) => {
              const total = analytics.subscribersPerPlan.reduce((sum, p) => sum + p.count, 0);
              const percentage = total > 0 ? ((plan.count / total) * 100).toFixed(1) : 0;
              const colors = ['bg-[#00A191]', 'bg-[#00A191]', 'bg-teal-500', 'bg-orange-500', 'bg-pink-500'];
              
              return (
                <div key={plan.plan_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded ${colors[index % colors.length]}`} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{plan.plan_name}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">({plan.plan_category})</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold text-gray-900 dark:text-white">{plan.count}</span>
                    <span className="text-gray-600 dark:text-gray-400 ml-1">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
            {analytics.subscribersPerPlan.length === 0 && (
              <p className="text-gray-600 dark:text-gray-400 text-center py-4">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Trends */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[#00A191]">Subscription Trends (Last 12 Months)</h3>
          <div className="relative group">
            <button
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
              title="Plan Categories"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {/* Hover tooltip with legend */}
            <div className="absolute right-0 top-10 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Plan Categories</h4>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#4B328D]"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Residential</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#00A191]"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Business</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative h-64">
          {analytics.subscriptionTrends.length > 0 ? (
            <svg className="w-full h-full" viewBox="0 0 800 250" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="0" x2="800" y2="0" stroke="currentColor" strokeWidth="1" className="text-gray-200 dark:text-gray-600" />
              <line x1="0" y1="62.5" x2="800" y2="62.5" stroke="currentColor" strokeWidth="1" className="text-gray-200 dark:text-gray-600" />
              <line x1="0" y1="125" x2="800" y2="125" stroke="currentColor" strokeWidth="1" className="text-gray-200 dark:text-gray-600" />
              <line x1="0" y1="187.5" x2="800" y2="187.5" stroke="currentColor" strokeWidth="1" className="text-gray-200 dark:text-gray-600" />
              <line x1="0" y1="250" x2="800" y2="250" stroke="currentColor" strokeWidth="1" className="text-gray-200 dark:text-gray-600" />
              
              {/* Line graph */}
              <polyline
                points={analytics.subscriptionTrends.map((trend, index) => {
                  const maxCount = Math.max(...analytics.subscriptionTrends.map(t => t.count));
                  const x = (index / (analytics.subscriptionTrends.length - 1)) * 800;
                  const y = 250 - ((trend.count / (maxCount || 1)) * 250);
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#4B328D"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Data points */}
              {analytics.subscriptionTrends.map((trend, index) => {
                const maxCount = Math.max(...analytics.subscriptionTrends.map(t => t.count));
                const x = (index / (analytics.subscriptionTrends.length - 1)) * 800;
                const y = 250 - ((trend.count / (maxCount || 1)) * 250);
                return (
                  <g key={trend.month}>
                    <circle cx={x} cy={y} r="5" fill="#4B328D" />
                    <circle cx={x} cy={y} r="3" fill="white" />
                  </g>
                );
              })}
            </svg>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-center py-12">No trend data available</p>
          )}
        </div>
        
        {/* Month labels */}
        {analytics.subscriptionTrends.length > 0 && (
          <div className="flex justify-between mt-4">
            {analytics.subscriptionTrends.map((trend) => (
              <span key={trend.month} className="text-xs text-gray-600 dark:text-gray-400 transform -rotate-45 origin-top-left">
                {trend.month}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Phase 2: Additional Analytics */}
      
      {/* Pipeline Duration & Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pipeline Duration */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-[#00A191] mb-4">Pipeline Duration</h3>
          <div className="text-center py-6">
            {analytics.pipelineDuration ? (
              <>
                <div className="text-5xl font-bold text-[#00A191] mb-2">
                  {analytics.pipelineDuration.average_days}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Average days from Submitted to Activated</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">Based on {analytics.pipelineDuration.count} activations</div>
              </>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">No data available</p>
            )}
          </div>
        </div>

        {/* Revenue Estimates */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-[#00A191] mb-4">Monthly Recurring Revenue</h3>
          <div className="text-center py-6">
            {analytics.revenueEstimates ? (
              <>
                <div className="text-5xl font-bold text-[#00A191] mb-2">
                  ₱{analytics.revenueEstimates.total_mrr.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total MRR from {analytics.revenueEstimates.subscriber_count} subscribers</div>
              </>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Plan Category Distribution & Denial Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Plan Category Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-[#00A191] mb-4">Plan Category Distribution</h3>
          <div className="space-y-4">
            {analytics.planCategoryDistribution && analytics.planCategoryDistribution.length > 0 ? (
              analytics.planCategoryDistribution.map((category, index) => {
                const total = (analytics.planCategoryDistribution || []).reduce((sum, c) => sum + c.count, 0);
                const percentage = total > 0 ? ((category.count / total) * 100).toFixed(1) : 0;
                const colors = ['bg-[#4B328D]', 'bg-[#00A191]']; // Purple for Residential, Teal for Business
                
                return (
                  <div key={category.category}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{category.category}</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {category.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`${colors[index % colors.length]} h-3 rounded-full transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-center py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Denial Reasons */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-[#00A191] mb-4">Top Denial Reasons</h3>
          <div className="space-y-3">
            {analytics.denialReasons && analytics.denialReasons.length > 0 ? (
              analytics.denialReasons.slice(0, 5).map((reason, index) => {
                const maxCount = Math.max(...(analytics.denialReasons || []).map(r => r.count));
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <div className="text-sm text-gray-900 dark:text-white">{reason.reason}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{reason.count}</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{
                            width: `${(reason.count / maxCount) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-center py-4">No denial data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Agent Commission Breakdown */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <h3 className="text-lg font-semibold text-[#00A191] mb-4">Agent Commission Breakdown</h3>
        <div className="overflow-x-auto">
          {analytics.agentCommissionsBreakdown && analytics.agentCommissionsBreakdown.length > 0 ? (
            <table className="min-w-full">
              <thead className="bg-[#00A191]">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-white">Agent</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white">Eligible</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white">Paid</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white">Total</th>
                </tr>
              </thead>
              <tbody>
                {analytics.agentCommissionsBreakdown.map((agent) => (
                  <tr key={agent.agent_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{agent.agent_name}</td>
                    <td className="py-3 px-4 text-sm text-right text-orange-600 font-medium">
                      ₱{agent.eligible.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-green-600 font-medium">
                      ₱{agent.paid.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-[#00A191] font-semibold">
                      ₱{agent.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">No commission data available</p>
          )}
        </div>
      </div>

      {/* Phase 3: Geographic & Advanced Analytics */}

      {/* Conversion Rates & Void Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 mt-6">
        {/* Agent Conversion Rates */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-[#00A191] mb-4">Agent Conversion Rates</h3>
          <div className="space-y-3">
            {analytics.agentConversionRates && analytics.agentConversionRates.length > 0 ? (
              analytics.agentConversionRates.slice(0, 5).map((agent) => (
                <div key={agent.agent_id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{agent.agent_name}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{agent.activated} / {agent.total} apps</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      agent.conversion_rate >= 70 ? 'text-green-600' : 
                      agent.conversion_rate >= 50 ? 'text-[#00A191]' : 
                      'text-orange-600'
                    }`}>
                      {agent.conversion_rate}%
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-center py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Plan Conversion Rates */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-[#00A191] mb-4">Plan Category Performance</h3>
          <div className="space-y-4">
            {analytics.planConversionRates && analytics.planConversionRates.length > 0 ? (
              analytics.planConversionRates.map((plan) => (
                <div key={plan.category}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{plan.category}</span>
                    <span className="text-lg font-bold text-[#00A191]">{plan.conversion_rate}%</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {plan.activated} activated / {plan.total} total
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#00A191] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${plan.conversion_rate}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-center py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Void Rate */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-[#00A191] mb-4">Installation Failure Rate</h3>
          {analytics.voidRate ? (
            <div className="text-center py-6">
              <div className="text-5xl font-bold text-red-600 mb-2">
                {analytics.voidRate.void_rate}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {analytics.voidRate.voided_applications} voided out of {analytics.voidRate.total_applications} applications
              </div>
              <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
                Lower is better - indicates successful installations
              </div>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">No data available</p>
          )}
        </div>
      </div>

      {/* Growth Comparison */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300 mb-6">
        <h3 className="text-lg font-semibold text-[#00A191] mb-4">Month-over-Month Growth</h3>
        <div className="overflow-x-auto">
          {analytics.growthComparison && analytics.growthComparison.length > 0 ? (
            <table className="min-w-full">
              <thead className="bg-[#00A191]">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-white">Month</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white">Activations</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white">Growth Rate</th>
                </tr>
              </thead>
              <tbody>
                {analytics.growthComparison.slice(-6).map((month) => (
                  <tr key={month.month} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{month.month}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                      {month.count}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold">
                      {month.growth_rate === 0 ? (
                        <span className="text-gray-600 dark:text-gray-400">-</span>
                      ) : (
                        <span className={month.growth_rate > 0 ? 'text-green-600' : 'text-red-600'}>
                          {month.growth_rate > 0 ? '+' : ''}{month.growth_rate}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">No data available</p>
          )}
        </div>
      </div>

      {/* Subscriber Locations Map */}
      {analytics.subscriberLocations && analytics.subscriberLocations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-[#00A191] mb-4">
            Subscriber Locations ({analytics.subscriberLocations.length} subscribers)
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Geographic distribution of activated subscribers. Click markers for details.
          </div>
          <SubscriberMap locations={analytics.subscriberLocations} />
        </div>
      )}
    </div>
  );
}

