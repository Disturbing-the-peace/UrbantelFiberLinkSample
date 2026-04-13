import { render, screen, waitFor } from '@testing-library/react';
import CommissionsPage from './page';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => 'mock-token'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('CommissionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {}) // Never resolves
    );

    render(<CommissionsPage />);
    expect(screen.getByText('Loading commissions...')).toBeInTheDocument();
  });

  it('should render commissions table with data', async () => {
    const mockAgents = [
      { id: 'agent-1', name: 'Agent One', is_active: true, referral_code: 'REF001' },
    ];

    const mockCommissions = [
      {
        id: 'comm-1',
        agent_id: 'agent-1',
        subscriber_id: 'sub-1',
        amount: 600,
        status: 'Eligible',
        date_activated: '2024-01-15T00:00:00Z',
        agents: { id: 'agent-1', name: 'Agent One', referral_code: 'REF001' },
        applications: {
          id: 'sub-1',
          first_name: 'John',
          last_name: 'Doe',
          plans: {
            id: 'plan-1',
            name: 'Premium Plan',
            category: 'Residential',
            speed: '100 Mbps',
            price: 1000,
          },
        },
      },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgents,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCommissions,
      });

    render(<CommissionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Commission Tracker')).toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getAllByText('Agent One').length).toBeGreaterThan(0);
    expect(screen.getByText('Premium Plan')).toBeInTheDocument();
    expect(screen.getAllByText('₱600.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Eligible').length).toBeGreaterThan(0);
  });

  it('should display total commissions due', async () => {
    const mockAgents = [
      { id: 'agent-1', name: 'Agent One', is_active: true, referral_code: 'REF001' },
    ];

    const mockCommissions = [
      {
        id: 'comm-1',
        agent_id: 'agent-1',
        subscriber_id: 'sub-1',
        amount: 600,
        status: 'Eligible',
        date_activated: '2024-01-15T00:00:00Z',
        agents: { id: 'agent-1', name: 'Agent One', referral_code: 'REF001' },
        applications: {
          id: 'sub-1',
          first_name: 'John',
          last_name: 'Doe',
          plans: { id: 'plan-1', name: 'Premium Plan', price: 1000 },
        },
      },
      {
        id: 'comm-2',
        agent_id: 'agent-1',
        subscriber_id: 'sub-2',
        amount: 300,
        status: 'Eligible',
        date_activated: '2024-01-16T00:00:00Z',
        agents: { id: 'agent-1', name: 'Agent One', referral_code: 'REF001' },
        applications: {
          id: 'sub-2',
          first_name: 'Jane',
          last_name: 'Smith',
          plans: { id: 'plan-2', name: 'Basic Plan', price: 500 },
        },
      },
      {
        id: 'comm-3',
        agent_id: 'agent-1',
        subscriber_id: 'sub-3',
        amount: 450,
        status: 'Paid',
        date_activated: '2024-01-10T00:00:00Z',
        agents: { id: 'agent-1', name: 'Agent One', referral_code: 'REF001' },
        applications: {
          id: 'sub-3',
          first_name: 'Bob',
          last_name: 'Johnson',
          plans: { id: 'plan-3', name: 'Standard Plan', price: 750 },
        },
      },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgents,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCommissions,
      });

    render(<CommissionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Commissions Due')).toBeInTheDocument();
    });

    // Total should be 600 + 300 = 900 (only Eligible commissions)
    expect(screen.getByText('₱900.00')).toBeInTheDocument();
  });

  it('should render error state', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to fetch' }),
      });

    render(<CommissionsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it('should render empty state when no commissions', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    render(<CommissionsPage />);

    await waitFor(() => {
      expect(screen.getByText('No commissions found. Try adjusting your filters.')).toBeInTheDocument();
    });
  });
});
