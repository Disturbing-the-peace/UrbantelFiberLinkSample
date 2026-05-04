import request from 'supertest';
import express, { Application } from 'express';
import usersRoutes from './users.routes';
import { supabase } from '../../shared/config/supabase';
import { verifyToken, checkSuperadmin } from '../../shared/middleware/auth';

// Mock dependencies
jest.mock('../../shared/config/supabase');
jest.mock('../../shared/middleware/auth');

const app: Application = express();
app.use(express.json());
app.use('/api/users', usersRoutes);

describe('Users Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock auth middleware to pass through
    (verifyToken as jest.Mock).mockImplementation((req, res, next) => {
      req.user = { id: 'test-superadmin-id', email: 'superadmin@test.com', role: 'superadmin' };
      next();
    });
    (checkSuperadmin as jest.Mock).mockImplementation((req, res, next) => next());
  });

  describe('POST /api/users', () => {
    it('should create a new user successfully', async () => {
      const mockAuthUser = { user: { id: 'new-user-id' } };
      const mockUser = {
        id: 'new-user-id',
        email: 'newadmin@test.com',
        full_name: 'New Admin',
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (supabase.auth.admin.createUser as jest.Mock).mockResolvedValue({
        data: mockAuthUser,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'newadmin@test.com',
          full_name: 'New Admin',
          role: 'admin',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockUser);
    });

    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          full_name: 'New Admin',
          role: 'admin',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email is required');
    });

    it('should return 400 if password is too short', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'newadmin@test.com',
          full_name: 'New Admin',
          role: 'admin',
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password must be at least 8 characters');
    });

    it('should return 400 if role is invalid', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'newadmin@test.com',
          full_name: 'New Admin',
          role: 'invalid',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Valid role is required (admin or superadmin)');
    });
  });

  describe('GET /api/users', () => {
    it('should return all users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'admin1@test.com',
          full_name: 'Admin One',
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'user-2',
          email: 'admin2@test.com',
          full_name: 'Admin Two',
          role: 'superadmin',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
        }),
      });

      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUsers);
    });

    it('should filter users by active status', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'admin1@test.com',
          full_name: 'Admin One',
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
          }),
        }),
      });

      const response = await request(app).get('/api/users?is_active=true');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUsers);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return a single user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'admin1@test.com',
        full_name: 'Admin One',
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      const response = await request(app).get('/api/users/user-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUser);
    });

    it('should return 404 if user not found', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      });

      const response = await request(app).get('/api/users/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update a user successfully', async () => {
      const mockExisting = { id: 'user-1', email: 'admin1@test.com' };
      const mockUpdated = {
        id: 'user-1',
        email: 'admin1@test.com',
        full_name: 'Updated Name',
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockExisting, error: null }),
          }),
        }),
      }).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockUpdated, error: null }),
            }),
          }),
        }),
      });

      const response = await request(app)
        .put('/api/users/user-1')
        .send({ full_name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUpdated);
    });

    it('should prevent user from deactivating themselves', async () => {
      const mockExisting = { id: 'test-superadmin-id', email: 'superadmin@test.com' };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockExisting, error: null }),
          }),
        }),
      });

      const response = await request(app)
        .put('/api/users/test-superadmin-id')
        .send({ is_active: false });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot deactivate your own account');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should deactivate a user successfully', async () => {
      const mockExisting = { id: 'user-1', is_active: true };
      const mockDeactivated = {
        id: 'user-1',
        email: 'admin1@test.com',
        full_name: 'Admin One',
        role: 'admin',
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockExisting, error: null }),
          }),
        }),
      }).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockDeactivated, error: null }),
            }),
          }),
        }),
      });

      const response = await request(app).delete('/api/users/user-1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User deactivated successfully');
    });

    it('should prevent user from deactivating themselves', async () => {
      const response = await request(app).delete('/api/users/test-superadmin-id');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot deactivate your own account');
    });

    it('should return 400 if user is already inactive', async () => {
      const mockExisting = { id: 'user-1', is_active: false };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockExisting, error: null }),
          }),
        }),
      });

      const response = await request(app).delete('/api/users/user-1');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User is already inactive');
    });
  });
});
