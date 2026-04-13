import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import UsersPage from './page';
import { User } from '@/types';
import { ToastProvider } from '@/contexts/ToastContext';

// Mock ProtectedRoute to render children directly
jest.mock('@/components/ProtectedRoute', () => {
  return function ProtectedRoute({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
});

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

// Mock window.confirm
global.confirm = jest.fn(() => true);

// Mock window.alert
global.alert = jest.fn();

describe('UsersPage', () => {
  const mockUsers: User[] = [
    {
      id: 'user-1',
      email: 'admin@test.com',
      full_name: 'Admin User',
      role: 'admin',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-2',
      email: 'superadmin@test.com',
      full_name: 'Super Admin',
      role: 'superadmin',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const renderWithProviders = (component: React.ReactElement) => {
    return render(<ToastProvider>{component}</ToastProvider>);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockUsers,
    });
  });

  it('should render loading state initially', () => {
    renderWithProviders(<UsersPage />);
    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('should fetch and display users', async () => {
    renderWithProviders(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('Super Admin')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${process.env.NEXT_PUBLIC_API_URL}/api/users`,
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer mock-token',
        },
      })
    );
  });

  it('should display user roles correctly', async () => {
    renderWithProviders(<UsersPage />);

    await waitFor(() => {
      const adminBadges = screen.getAllByText('admin');
      const superadminBadges = screen.getAllByText('superadmin');
      expect(adminBadges.length).toBeGreaterThan(0);
      expect(superadminBadges.length).toBeGreaterThan(0);
    });
  });

  it('should display user status correctly', async () => {
    renderWithProviders(<UsersPage />);

    await waitFor(() => {
      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges.length).toBe(2);
    });
  });

  it('should show error message when fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch' }),
    });

    renderWithProviders(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch users/)).toBeInTheDocument();
    });
  });

  it('should open create modal when Create User button is clicked', async () => {
    renderWithProviders(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create User');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create User', { selector: 'h2' })).toBeInTheDocument();
    });
  });

  it('should open edit modal when Edit button is clicked', async () => {
    renderWithProviders(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit User')).toBeInTheDocument();
    });
  });

  it('should deactivate user when Deactivate button is clicked', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'User deactivated successfully' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      });

    renderWithProviders(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    const deactivateButtons = screen.getAllByText('Deactivate');
    fireEvent.click(deactivateButtons[0]);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to deactivate this user?');
    });
  });

  it('should display empty state when no users exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    renderWithProviders(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('No users found. Create your first user to get started.')).toBeInTheDocument();
    });
  });

  it('should submit create user form', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'new-user',
          email: 'newuser@test.com',
          full_name: 'New User',
          role: 'admin',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      });

    renderWithProviders(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create User');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create User', { selector: 'h2' })).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email/);
    const fullNameInput = screen.getByLabelText(/Full Name/);
    const passwordInput = screen.getByLabelText(/Password/);

    fireEvent.change(emailInput, { target: { value: 'newuser@test.com' } });
    fireEvent.change(fullNameInput, { target: { value: 'New User' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitButtons = screen.getAllByRole('button', { name: /Create/ });
    const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit');
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
          body: JSON.stringify({
            email: 'newuser@test.com',
            full_name: 'New User',
            role: 'admin',
            password: 'password123',
            is_active: true,
          }),
        })
      );
    });
  });
});
