import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginPage from './page';
import { useAuth } from '@/contexts/AuthContext';
import * as authLib from '@/lib/auth';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  signIn: jest.fn(),
  verify2FA: jest.fn(),
  listMFAFactors: jest.fn(),
  getAuthErrorMessage: jest.fn((error) => error?.message || 'An error occurred'),
}));

describe('LoginPage', () => {
  const mockPush = jest.fn();
  const mockRefreshUser = jest.fn();
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useSearchParams as jest.Mock).mockReturnValue({ get: mockGet });
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      refreshUser: mockRefreshUser,
    });
    mockGet.mockReturnValue(null);
  });

  it('renders login form', () => {
    render(<LoginPage />);
    
    expect(screen.getByText('Admin Login')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('redirects authenticated users to dashboard', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', email: 'admin@test.com', role: 'admin' },
      refreshUser: mockRefreshUser,
    });

    render(<LoginPage />);
    
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('handles successful login without 2FA', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      role: 'admin',
      requires2FA: false,
    };

    (authLib.signIn as jest.Mock).mockResolvedValue({
      user: mockUser,
      error: null,
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'admin@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(authLib.signIn).toHaveBeenCalledWith('admin@test.com', 'password123');
      expect(mockRefreshUser).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows 2FA form when user requires 2FA', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      role: 'superadmin',
      requires2FA: true,
    };

    (authLib.signIn as jest.Mock).mockResolvedValue({
      user: mockUser,
      error: null,
    });

    (authLib.listMFAFactors as jest.Mock).mockResolvedValue({
      factors: [{ id: 'factor-123', type: 'totp' }],
      error: null,
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'admin@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
      expect(screen.getByLabelText('Verification Code')).toBeInTheDocument();
    });
  });

  it('handles successful 2FA verification', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      role: 'superadmin',
      requires2FA: true,
    };

    (authLib.signIn as jest.Mock).mockResolvedValue({
      user: mockUser,
      error: null,
    });

    (authLib.listMFAFactors as jest.Mock).mockResolvedValue({
      factors: [{ id: 'factor-123', type: 'totp' }],
      error: null,
    });

    (authLib.verify2FA as jest.Mock).mockResolvedValue({
      success: true,
      error: null,
    });

    render(<LoginPage />);

    // First login
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'admin@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Wait for 2FA form
    await waitFor(() => {
      expect(screen.getByLabelText('Verification Code')).toBeInTheDocument();
    });

    // Enter 2FA code
    fireEvent.change(screen.getByLabelText('Verification Code'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /verify & sign in/i }));

    await waitFor(() => {
      expect(authLib.verify2FA).toHaveBeenCalledWith('factor-123', '123456');
      expect(mockRefreshUser).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays error message on login failure', async () => {
    (authLib.signIn as jest.Mock).mockResolvedValue({
      user: null,
      error: { message: 'Invalid credentials' },
    });

    (authLib.getAuthErrorMessage as jest.Mock).mockReturnValue('Invalid email or password');

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'wrong@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrongpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  it('displays error message on 2FA verification failure', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      role: 'superadmin',
      requires2FA: true,
    };

    (authLib.signIn as jest.Mock).mockResolvedValue({
      user: mockUser,
      error: null,
    });

    (authLib.listMFAFactors as jest.Mock).mockResolvedValue({
      factors: [{ id: 'factor-123', type: 'totp' }],
      error: null,
    });

    (authLib.verify2FA as jest.Mock).mockResolvedValue({
      success: false,
      error: { message: 'Invalid TOTP code' },
    });

    (authLib.getAuthErrorMessage as jest.Mock).mockReturnValue('Invalid verification code. Please try again.');

    render(<LoginPage />);

    // First login
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'admin@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Wait for 2FA form
    await waitFor(() => {
      expect(screen.getByLabelText('Verification Code')).toBeInTheDocument();
    });

    // Enter wrong 2FA code
    fireEvent.change(screen.getByLabelText('Verification Code'), {
      target: { value: '000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /verify & sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid verification code. Please try again.')).toBeInTheDocument();
    });
  });

  it('allows going back from 2FA form to login', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      role: 'superadmin',
      requires2FA: true,
    };

    (authLib.signIn as jest.Mock).mockResolvedValue({
      user: mockUser,
      error: null,
    });

    (authLib.listMFAFactors as jest.Mock).mockResolvedValue({
      factors: [{ id: 'factor-123', type: 'totp' }],
      error: null,
    });

    render(<LoginPage />);

    // First login
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'admin@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Wait for 2FA form
    await waitFor(() => {
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    });

    // Click back button
    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));

    await waitFor(() => {
      expect(screen.getByText('Admin Login')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    });
  });

  it('respects redirect parameter', async () => {
    mockGet.mockReturnValue('/dashboard/users');

    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      role: 'admin',
      requires2FA: false,
    };

    (authLib.signIn as jest.Mock).mockResolvedValue({
      user: mockUser,
      error: null,
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'admin@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/users');
    });
  });
});
