import request from 'supertest';
import express, { Application } from 'express';
import applicationsRoutes from './applications.routes';
import { supabase } from '../../shared/config/supabase';

// Mock Supabase
jest.mock('../../shared/config/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

// Mock auth middleware
jest.mock('../../shared/middleware/auth', () => ({
  verifyToken: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-id', email: 'admin@test.com', role: 'admin' };
    next();
  }),
  checkAdmin: jest.fn((req, res, next) => next()),
}));

describe('Applications Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/applications', applicationsRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/applications', () => {
    it('should return all applications with agent and plan details', async () => {
      const mockApplications = [
        {
          id: 'app-1',
          first_name: 'John',
          last_name: 'Doe',
          status: 'Submitted',
          agent_id: 'agent-1',
          plan_id: 'plan-1',
          created_at: '2024-01-01T00:00:00Z',
          agents: { id: 'agent-1', name: 'Agent One', referral_code: 'AGT-123456' },
          plans: { id: 'plan-1', name: 'Basic Plan', category: 'Residential', speed: '100 Mbps', price: 1000 },
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockApplications, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/api/applications');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockApplications);
      expect(supabase.from).toHaveBeenCalledWith('applications');
    });

    it('should filter applications by status', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await request(app).get('/api/applications?status=Approved');

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'Approved');
    });

    it('should filter applications by agent_id', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await request(app).get('/api/applications?agent_id=agent-123');

      expect(mockQuery.eq).toHaveBeenCalledWith('agent_id', 'agent-123');
    });

    it('should filter applications by date range', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };

      mockQuery.lte.mockResolvedValue({ data: [], error: null });

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await request(app).get('/api/applications?start_date=2024-01-01&end_date=2024-12-31');

      expect(mockQuery.gte).toHaveBeenCalledWith('created_at', '2024-01-01');
      expect(mockQuery.lte).toHaveBeenCalledWith('created_at', '2024-12-31');
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/api/applications');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch applications' });
    });
  });

  describe('GET /api/applications/:id', () => {
    it('should return a single application with full details', async () => {
      const mockApplication = {
        id: 'app-1',
        first_name: 'John',
        middle_name: 'M',
        last_name: 'Doe',
        birthday: '1990-01-01',
        contact_number: '1234567890',
        email: 'john@example.com',
        address: '123 Main St',
        status: 'Submitted',
        agent_id: 'agent-1',
        plan_id: 'plan-1',
        agents: {
          id: 'agent-1',
          name: 'Agent One',
          referral_code: 'AGT-123456',
          contact_number: '9876543210',
          email: 'agent@example.com',
          messenger_link: 'https://m.me/agent',
        },
        plans: {
          id: 'plan-1',
          name: 'Basic Plan',
          category: 'Residential',
          speed: '100 Mbps',
          price: 1000,
          inclusions: ['Unlimited data', 'Free router'],
        },
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockApplication, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/api/applications/app-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockApplication);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'app-1');
    });

    it('should return 404 if application not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/api/applications/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Application not found' });
    });
  });

  describe('PUT /api/applications/:id/status', () => {
    it('should update application status successfully', async () => {
      const currentApp = { id: 'app-1', status: 'Submitted' };
      const updatedApp = {
        id: 'app-1',
        status: 'Under Review',
        agents: { id: 'agent-1', name: 'Agent One' },
        plans: { id: 'plan-1', name: 'Basic Plan' },
      };

      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: currentApp, error: null }),
      };

      const updateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updatedApp, error: null }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(selectQuery)
        .mockReturnValueOnce(updateQuery);

      const response = await request(app)
        .put('/api/applications/app-1/status')
        .send({ status: 'Under Review' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedApp);
    });

    it('should reject invalid status transitions', async () => {
      const currentApp = { id: 'app-1', status: 'Activated' };

      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: currentApp, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(selectQuery);

      const response = await request(app)
        .put('/api/applications/app-1/status')
        .send({ status: 'Submitted' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid status transition');
      expect(response.body.allowedTransitions).toEqual([]);
    });

    it('should require status_reason for Denied status', async () => {
      const currentApp = { id: 'app-1', status: 'Under Review' };

      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: currentApp, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(selectQuery);

      const response = await request(app)
        .put('/api/applications/app-1/status')
        .send({ status: 'Denied' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Status reason is required');
    });

    it('should require status_reason for Voided status', async () => {
      const currentApp = { id: 'app-1', status: 'Approved' };

      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: currentApp, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(selectQuery);

      const response = await request(app)
        .put('/api/applications/app-1/status')
        .send({ status: 'Voided' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Status reason is required');
    });

    it('should set activated_at when status is Activated', async () => {
      const currentApp = { id: 'app-1', status: 'Scheduled for Installation' };
      const updatedApp = {
        id: 'app-1',
        status: 'Activated',
        activated_at: expect.any(String),
      };

      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: currentApp, error: null }),
      };

      const updateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updatedApp, error: null }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(selectQuery)
        .mockReturnValueOnce(updateQuery);

      const response = await request(app)
        .put('/api/applications/app-1/status')
        .send({ status: 'Activated' });

      expect(response.status).toBe(200);
      expect(updateQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Activated',
          activated_at: expect.any(String),
        })
      );
    });

    it('should return 400 if status is missing', async () => {
      const response = await request(app)
        .put('/api/applications/app-1/status')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Status is required' });
    });

    it('should return 404 if application not found', async () => {
      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      };

      (supabase.from as jest.Mock).mockReturnValue(selectQuery);

      const response = await request(app)
        .put('/api/applications/nonexistent-id/status')
        .send({ status: 'Under Review' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Application not found' });
    });

    it('should validate all status transitions from Submitted', async () => {
      const currentApp = { id: 'app-1', status: 'Submitted' };

      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: currentApp, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(selectQuery);

      // Valid transitions
      const validTransitions = ['Under Review', 'Denied', 'Voided'];
      for (const status of validTransitions) {
        const response = await request(app)
          .put('/api/applications/app-1/status')
          .send({ status, status_reason: 'Test reason' });

        // Should not return 400 for invalid transition
        expect(response.status).not.toBe(400);
      }

      // Invalid transition
      const response = await request(app)
        .put('/api/applications/app-1/status')
        .send({ status: 'Activated' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid status transition');
    });
  });
});
