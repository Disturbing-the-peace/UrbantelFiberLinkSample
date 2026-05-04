import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PurgeLogsPage from './page';
import { apiRequest } from '@/lib/api';

// Mock ProtectedRoute to render children directly
jest.mock('@/features/auth/components/ProtectedRoute', () => {
  return function ProtectedRoute({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
});

// Mock the API
jest.mock('@/lib/api', () => ({
  apiRequest: jest.fn(),
}));

describe('PurgeLogsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render purge logs page title', () => {
    (apiRequest as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { total: 0, limit: 50, offset: 0 }
    });

    render(<PurgeLogsPage />);
    
    expect(screen.getByText('Data Purge Logs')).toBeInTheDocument();
    expect(screen.getByText(/View audit logs for automated data purge operations/)).toBeInTheDocument();
  });

  it('should display loading state initially', () => {
    (apiRequest as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<PurgeLogsPage />);
    
    expect(screen.getByText('Loading purge logs...')).toBeInTheDocument();
  });

  it('should display purge logs when data is loaded', async () => {
    const mockLogs = [
      {
        id: 'log-1',
        action: 'DATA_PURGE',
        entity_type: 'application',
        entity_id: 'sub-123456789',
        fields_purged: ['birthday', 'house_photo_url', 'government_id_url'],
        files_deleted: ['house.jpg', 'id.jpg'],
        performed_by: 'SYSTEM',
        performed_at: '2024-01-15T02:00:00Z',
        metadata: {
          activated_at: '2024-01-12T10:00:00Z',
          purge_trigger: 'automated_3_day_retention'
        }
      }
    ];

    (apiRequest as jest.Mock).mockResolvedValue({
      data: mockLogs,
      pagination: { total: 1, limit: 50, offset: 0 }
    });

    render(<PurgeLogsPage />);

    await waitFor(() => {
      expect(screen.getByText(/sub-1234/)).toBeInTheDocument();
    });

    expect(screen.getByText('birthday')).toBeInTheDocument();
    expect(screen.getByText('house_photo_url')).toBeInTheDocument();
    expect(screen.getByText('government_id_url')).toBeInTheDocument();
    expect(screen.getByText('2 file(s)')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM')).toBeInTheDocument();
  });

  it('should display empty state when no logs exist', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { total: 0, limit: 50, offset: 0 }
    });

    render(<PurgeLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('No purge logs found')).toBeInTheDocument();
    });
  });

  it('should display error message when API fails', async () => {
    (apiRequest as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

    render(<PurgeLogsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch/)).toBeInTheDocument();
    });
  });

  it('should display pagination information', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { total: 150, limit: 50, offset: 0 }
    });

    render(<PurgeLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Records: 150')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });
  });
});
