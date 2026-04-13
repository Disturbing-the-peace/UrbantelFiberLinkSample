import { render, screen, waitFor } from '@testing-library/react';
import AnalyticsPage from './page';
import { api } from '@/lib/api';
import { ToastProvider } from '@/contexts/ToastContext';

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
  },
}));

describe('AnalyticsPage', () => {
  const mockAnalyticsData = {
    subscribersMonthly: { count: 25 },
    subscribersPerAgent: [
      { agent_id: 'agent1', agent_name: 'Agent One', count: 15 },
      { agent_id: 'agent2', agent_name: 'Agent Two', count: 10 },
    ],
    subscribersPerPlan: [
      { plan_id: 'plan1', plan_name: 'Basic Plan', plan_category: 'Residential', count: 12 },
      { plan_id: 'plan2', plan_name: 'Premium Plan', plan_category: 'Business', count: 13 },
    ],
    subscriptionTrends: [
      { month: '2024-01', count: 5 },
      { month: '2024-02', count: 8 },
      { month: '2024-03', count: 12 },
    ],
    conversionRate: {
      total_applications: 100,
      activated_applications: 60,
      conversion_rate: 60,
    },
    pendingApplications: { count: 15 },
    totalCommissionsDue: {
      total_due: 5000.50,
      count: 10,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (api.get as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(
      <ToastProvider>
        <AnalyticsPage />
      </ToastProvider>
    );

    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('should render analytics dashboard with data', async () => {
    (api.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('subscribers-monthly')) return Promise.resolve(mockAnalyticsData.subscribersMonthly);
      if (url.includes('subscribers-per-agent')) return Promise.resolve(mockAnalyticsData.subscribersPerAgent);
      if (url.includes('subscribers-per-plan')) return Promise.resolve(mockAnalyticsData.subscribersPerPlan);
      if (url.includes('subscription-trends')) return Promise.resolve(mockAnalyticsData.subscriptionTrends);
      if (url.includes('conversion-rate')) return Promise.resolve(mockAnalyticsData.conversionRate);
      if (url.includes('pending-applications')) return Promise.resolve(mockAnalyticsData.pendingApplications);
      if (url.includes('total-commissions-due')) return Promise.resolve(mockAnalyticsData.totalCommissionsDue);
      return Promise.resolve({});
    });

    render(
      <ToastProvider>
        <AnalyticsPage />
      </ToastProvider>
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument();
    });

    // Check KPI cards
    expect(screen.getByText('Subscribers This Month')).toBeInTheDocument();
    expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
    expect(screen.getByText('Pending Applications')).toBeInTheDocument();
    expect(screen.getByText('Commissions Due')).toBeInTheDocument();

    // Check agent data
    expect(screen.getByText('Agent One')).toBeInTheDocument();
    expect(screen.getByText('Agent Two')).toBeInTheDocument();

    // Check plan data
    expect(screen.getByText('Basic Plan')).toBeInTheDocument();
    expect(screen.getByText('Premium Plan')).toBeInTheDocument();
  });

  it('should handle API errors', async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(
      <ToastProvider>
        <AnalyticsPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load analytics data')).toBeInTheDocument();
    });
  });

  it('should display empty state when no data', async () => {
    (api.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('subscribers-monthly')) return Promise.resolve({ count: 0 });
      if (url.includes('subscribers-per-agent')) return Promise.resolve([]);
      if (url.includes('subscribers-per-plan')) return Promise.resolve([]);
      if (url.includes('subscription-trends')) return Promise.resolve([]);
      if (url.includes('conversion-rate')) return Promise.resolve({ total_applications: 0, activated_applications: 0, conversion_rate: 0 });
      if (url.includes('pending-applications')) return Promise.resolve({ count: 0 });
      if (url.includes('total-commissions-due')) return Promise.resolve({ total_due: 0, count: 0 });
      return Promise.resolve({});
    });

    render(
      <ToastProvider>
        <AnalyticsPage />
      </ToastProvider>
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument();
    });

    // Should show empty state messages (there are multiple "No data available" messages)
    const noDataMessages = screen.getAllByText('No data available');
    expect(noDataMessages.length).toBeGreaterThan(0);
    expect(screen.getByText('No trend data available')).toBeInTheDocument();
  });
});
