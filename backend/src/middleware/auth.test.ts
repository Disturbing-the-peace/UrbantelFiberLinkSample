import { Request, Response, NextFunction } from 'express';
import {
  verifyToken,
  checkAdmin,
  checkSuperadmin,
  check2FA,
  logAuthEvent,
} from './auth';
import { supabase } from '../config/supabase';

// Mock Supabase
jest.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      mfa: {
        listFactors: jest.fn(),
      },
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should reject request without authorization header', async () => {
      await verifyToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'No token provided',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with invalid authorization header format', async () => {
      mockRequest.headers = { authorization: 'InvalidFormat token123' };

      await verifyToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'No token provided',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid_token' };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      await verifyToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request when user not found in database', async () => {
      mockRequest.headers = { authorization: 'Bearer valid_token' };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: 'user123',
            email: 'test@example.com',
          },
        },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'User not found' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await verifyToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not found in system',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request when user is inactive', async () => {
      mockRequest.headers = { authorization: 'Bearer valid_token' };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: 'user123',
            email: 'test@example.com',
          },
        },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            role: 'admin',
            is_active: false,
          },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await verifyToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User account is inactive',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should authenticate valid admin user and attach to request', async () => {
      mockRequest.headers = { authorization: 'Bearer valid_token' };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: 'user123',
            email: 'admin@example.com',
          },
        },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            role: 'admin',
            is_active: true,
            branch_id: 'branch-123',
          },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await verifyToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toEqual({
        id: 'user123',
        email: 'admin@example.com',
        role: 'admin',
        branch_id: 'branch-123',
      });
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should authenticate valid superadmin user and attach to request', async () => {
      mockRequest.headers = { authorization: 'Bearer valid_token' };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: 'superadmin123',
            email: 'superadmin@example.com',
          },
        },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            role: 'superadmin',
            is_active: true,
            branch_id: 'branch-456',
          },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await verifyToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toEqual({
        id: 'superadmin123',
        email: 'superadmin@example.com',
        role: 'superadmin',
        branch_id: 'branch-456',
      });
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors gracefully', async () => {
      mockRequest.headers = { authorization: 'Bearer valid_token' };

      (supabase.auth.getUser as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await verifyToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('checkAdmin', () => {
    it('should reject request without authenticated user', () => {
      checkAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Not authenticated',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow admin user', () => {
      mockRequest.user = {
        id: 'user123',
        email: 'admin@example.com',
        role: 'admin',
        branch_id: 'branch-123',
      };

      checkAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow superadmin user', () => {
      mockRequest.user = {
        id: 'superadmin123',
        email: 'superadmin@example.com',
        role: 'superadmin',
        branch_id: 'branch-123',
      };

      checkAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('checkSuperadmin', () => {
    it('should reject request without authenticated user', () => {
      checkSuperadmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Not authenticated',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject admin user', () => {
      mockRequest.user = {
        id: 'user123',
        email: 'admin@example.com',
        role: 'admin',
        branch_id: 'branch-123',
      };

      checkSuperadmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Superadmin access required',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow superadmin user', () => {
      mockRequest.user = {
        id: 'superadmin123',
        email: 'superadmin@example.com',
        role: 'superadmin',
        branch_id: 'branch-123',
      };

      checkSuperadmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('check2FA', () => {
    it('should reject request without authenticated user', async () => {
      await check2FA(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Not authenticated',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow user when 2FA is not required', async () => {
      mockRequest.user = {
        id: 'user123',
        email: 'user@example.com',
        role: 'admin',
        branch_id: 'branch-123',
      };
      mockRequest.headers = { authorization: 'Bearer valid_token' };

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: false,
        error: null,
      });

      await check2FA(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject user when 2FA is required but not enrolled', async () => {
      mockRequest.user = {
        id: 'admin123',
        email: 'admin@example.com',
        role: 'admin',
        branch_id: 'branch-123',
      };
      mockRequest.headers = { authorization: 'Bearer valid_token' };

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: true,
        error: null,
      });

      (supabase.auth.mfa.listFactors as jest.Mock).mockResolvedValue({
        data: { totp: [] },
        error: null,
      });

      await check2FA(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: '2FA enrollment required',
        requires2FA: true,
        message:
          'Your role requires two-factor authentication. Please enroll in 2FA to continue.',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow user when 2FA is required and enrolled', async () => {
      mockRequest.user = {
        id: 'admin123',
        email: 'admin@example.com',
        role: 'admin',
        branch_id: 'branch-123',
      };
      mockRequest.headers = { authorization: 'Bearer valid_token' };

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: true,
        error: null,
      });

      (supabase.auth.mfa.listFactors as jest.Mock).mockResolvedValue({
        data: {
          totp: [
            {
              id: 'factor123',
              status: 'verified',
            },
          ],
        },
        error: null,
      });

      await check2FA(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.user = {
        id: 'user123',
        email: 'user@example.com',
        role: 'admin',
        branch_id: 'branch-123',
      };
      mockRequest.headers = { authorization: 'Bearer valid_token' };

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await check2FA(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to check 2FA requirement',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle MFA check errors gracefully', async () => {
      mockRequest.user = {
        id: 'admin123',
        email: 'admin@example.com',
        role: 'admin',
        branch_id: 'branch-123',
      };
      mockRequest.headers = { authorization: 'Bearer valid_token' };

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: true,
        error: null,
      });

      (supabase.auth.mfa.listFactors as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'MFA error' },
      });

      await check2FA(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to verify 2FA status',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors gracefully', async () => {
      mockRequest.user = {
        id: 'user123',
        email: 'user@example.com',
        role: 'admin',
        branch_id: 'branch-123',
      };
      mockRequest.headers = { authorization: 'Bearer valid_token' };

      (supabase.rpc as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      await check2FA(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: '2FA verification failed',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('logAuthEvent', () => {
    it('should log auth event for authenticated user', async () => {
      mockRequest = {
        user: {
          id: 'user123',
          email: 'user@example.com',
          role: 'admin',
          branch_id: 'branch-123',
        },
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' },
        path: '/api/test',
        method: 'GET',
      };

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const middleware = logAuthEvent('login');
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(supabase.rpc).toHaveBeenCalledWith('log_auth_event', {
        p_user_id: 'user123',
        p_event_type: 'login',
        p_metadata: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          path: '/api/test',
          method: 'GET',
        },
      });
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should skip logging if user is not authenticated', async () => {
      mockRequest.user = undefined;

      const middleware = logAuthEvent('login');
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue request even if logging fails', async () => {
      mockRequest = {
        user: {
          id: 'user123',
          email: 'user@example.com',
          role: 'admin',
          branch_id: 'branch-123',
        },
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' },
        path: '/api/test',
        method: 'POST',
      };

      (supabase.rpc as jest.Mock).mockRejectedValue(
        new Error('Logging failed')
      );

      const middleware = logAuthEvent('access');
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should log different event types correctly', async () => {
      mockRequest = {
        user: {
          id: 'admin123',
          email: 'admin@example.com',
          role: 'superadmin',
          branch_id: 'branch-123',
        },
        ip: '10.0.0.1',
        headers: { 'user-agent': 'Chrome' },
        path: '/api/admin',
        method: 'DELETE',
      };

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const middleware = logAuthEvent('logout');
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(supabase.rpc).toHaveBeenCalledWith('log_auth_event', {
        p_user_id: 'admin123',
        p_event_type: 'logout',
        p_metadata: {
          ip: '10.0.0.1',
          userAgent: 'Chrome',
          path: '/api/admin',
          method: 'DELETE',
        },
      });
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
