import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SubscribersPage from './page';

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

describe('SubscribersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render subscribers page with title', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/plans')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/subscribers')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<SubscribersPage />);

    await waitFor(() => {
      expect(screen.getByText('Subscriber Management')).toBeInTheDocument();
    });
  });

  it('should display subscribers in table', async () => {
    const mockSubscribers = [
      {
        id: 'sub-1',
        first_name: 'John',
        last_name: 'Doe',
        contact_number: '1234567890',
        activated_at: '2024-01-15T10:00:00Z',
        agents: { id: 'agent-1', name: 'Agent One', referral_code: 'AGT-001' },
        plans: { id: 'plan-1', name: 'Basic Plan', speed: '100 Mbps', price: 1000 },
        commission_status: 'Eligible',
        commission_amount: 600,
      },
    ];

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/plans')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/subscribers')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSubscribers),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<SubscribersPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Agent One')).toBeInTheDocument();
      expect(screen.getByText('Basic Plan')).toBeInTheDocument();
      expect(screen.getByText('Eligible')).toBeInTheDocument();
    });
  });

  it('should display empty state when no subscribers', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/plans')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/subscribers')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<SubscribersPage />);

    await waitFor(() => {
      expect(screen.getByText('No subscribers found. Try adjusting your filters.')).toBeInTheDocument();
    });
  });

  it('should display error message on fetch failure', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/plans')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/subscribers')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Failed to fetch' }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<SubscribersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it('should render Export to CSV button', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/plans')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/subscribers')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<SubscribersPage />);

    await waitFor(() => {
      expect(screen.getByText('Export to CSV')).toBeInTheDocument();
    });
  });

  it('should handle CSV export successfully', async () => {
    const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
    
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/plans')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/subscribers') && !url.includes('/api/export')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/export/subscribers')) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({
            'Content-Disposition': 'attachment; filename="subscribers.csv"',
          }),
          blob: () => Promise.resolve(mockBlob),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<SubscribersPage />);

    await waitFor(() => {
      expect(screen.getByText('Export to CSV')).toBeInTheDocument();
    });

    const exportButton = screen.getByText('Export to CSV');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/export/subscribers'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });
  });

  it('should render Download Docs button for each subscriber', async () => {
    const mockSubscribers = [
      {
        id: 'sub-1',
        first_name: 'John',
        last_name: 'Doe',
        contact_number: '1234567890',
        activated_at: '2024-01-15T10:00:00Z',
        agents: { id: 'agent-1', name: 'Agent One', referral_code: 'AGT-001' },
        plans: { id: 'plan-1', name: 'Basic Plan', speed: '100 Mbps', price: 1000 },
        commission_status: 'Eligible',
        commission_amount: 600,
      },
    ];

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/plans')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/subscribers')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSubscribers),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<SubscribersPage />);

    await waitFor(() => {
      expect(screen.getByText('Download Docs')).toBeInTheDocument();
    });
  });

  it('should handle document download successfully', async () => {
    const mockSubscribers = [
      {
        id: 'sub-1',
        first_name: 'John',
        last_name: 'Doe',
        contact_number: '1234567890',
        activated_at: '2024-01-15T10:00:00Z',
        agents: { id: 'agent-1', name: 'Agent One', referral_code: 'AGT-001' },
        plans: { id: 'plan-1', name: 'Basic Plan', speed: '100 Mbps', price: 1000 },
        commission_status: 'Eligible',
        commission_amount: 600,
      },
    ];

    const mockBlob = new Blob(['zip data'], { type: 'application/zip' });

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/agents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/plans')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/subscribers') && !url.includes('/api/export')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSubscribers),
        });
      }
      if (url.includes('/api/export/subscribers/sub-1/documents')) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({
            'Content-Disposition': 'attachment; filename="subscriber-sub-1-documents.zip"',
          }),
          blob: () => Promise.resolve(mockBlob),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<SubscribersPage />);

    await waitFor(() => {
      expect(screen.getByText('Download Docs')).toBeInTheDocument();
    });

    const downloadButton = screen.getByText('Download Docs');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/export/subscribers/sub-1/documents'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });
  });
});
