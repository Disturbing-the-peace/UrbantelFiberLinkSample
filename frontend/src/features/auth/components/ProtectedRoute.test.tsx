import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('ProtectedRoute', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
  });

  it('shows loading state while checking authentication', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: true,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Fdashboard');
    });
  });

  it('renders children when user is authenticated', () => {
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      role: 'admin' as const,
      fullName: 'Admin User',
      isActive: true,
      requires2FA: false,
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('allows admin to access admin routes', () => {
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      role: 'admin' as const,
      fullName: 'Admin User',
      isActive: true,
      requires2FA: false,
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(
      <ProtectedRoute requiredRole="admin">
        <div>Admin Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('allows superadmin to access superadmin routes', () => {
    const mockUser = {
      id: '1',
      email: 'superadmin@test.com',
      role: 'superadmin' as const,
      fullName: 'Super Admin',
      isActive: true,
      requires2FA: true,
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(
      <ProtectedRoute requiredRole="superadmin">
        <div>Superadmin Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Superadmin Content')).toBeInTheDocument();
  });

  it('redirects admin trying to access superadmin routes', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      role: 'admin' as const,
      fullName: 'Admin User',
      isActive: true,
      requires2FA: false,
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    (usePathname as jest.Mock).mockReturnValue('/dashboard/users');

    render(
      <ProtectedRoute requiredRole="superadmin">
        <div>Superadmin Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('does not render content when role requirement is not met', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      role: 'admin' as const,
      fullName: 'Admin User',
      isActive: true,
      requires2FA: false,
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(
      <ProtectedRoute requiredRole="superadmin">
        <div>Superadmin Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.queryByText('Superadmin Content')).not.toBeInTheDocument();
    });
  });
});
