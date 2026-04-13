import request from 'supertest';
import express, { Application } from 'express';
import subscribersRoutes from './subscribers.routes';
import { supabase } from '../config/supabase';

// Mock dependencies
jest.mock('../config/supabase');
jest.mock('../middleware/auth', () => ({
  verifyToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com', role: 'admin' };
    next();
  },
  checkAdmin: (req: any, res: any, next: any) => next(),
}));

const app: Application = express();
app.use(express.json());
app.use('/api/subscribers', subscribersRoutes);

describe('Subscribers Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/subscribers', () => {
    it('should return list of subscribers with commission status', async () => {
      const mockSubscribers = [
        {
          id: 'sub-1',
          first_name: 'John',
          last_name: 'Doe',
          status: 'Activated',
          activated_at: '2024-01-15T10:00:00Z',
          agent_id: 'agent-1',
          plan_id: 'plan-1',
          agents: { id: 'agent-1', name: 'Agent One', referral_code: 'AGT-001' },
          plans: { id: 'plan-1', name: 'Basic Plan', category: 'Residential', speed: '100 Mbps', price: 1000 },
          commissions: [{ id: 'comm-1', status: 'Eligible', amount: 600, date_paid: null }],
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockSubscribers, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/api/subscribers');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('commission_status', 'Eligible');
      expect(response.body[0]).toHaveProperty('commission_amount', 600);
    });

    it('should return subscribers with Pending commission status when no commission exists', async () => {
      const mockSubscribers = [
        {
          id: 'sub-2',
          first_name: 'Jane',
          last_name: 'Smith',
          status: 'Activated',
          activated_at: '2024-01-20T10:00:00Z',
          agent_id: 'agent-2',
          plan_id: 'plan-2',
          agents: { id: 'agent-2', name: 'Agent Two', referral_code: 'AGT-002' },
          plans: { id: 'plan-2', name: 'Premium Plan', category: 'Business', speed: '500 Mbps', price: 2000 },
          commissions: [],
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockSubscribers, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/api/subscribers');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('commission_status', 'Pending');
      expect(response.body[0]).toHaveProperty('commission_amount', null);
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const response = await request(app).get('/api/subscribers');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch subscribers');
    });
  });

  describe('GET /api/subscribers/:id', () => {
    it('should return subscriber details with commission info', async () => {
      const mockSubscriber = {
        id: 'sub-1',
        first_name: 'John',
        last_name: 'Doe',
        status: 'Activated',
        activated_at: '2024-01-15T10:00:00Z',
        agent_id: 'agent-1',
        plan_id: 'plan-1',
        agents: { id: 'agent-1', name: 'Agent One', referral_code: 'AGT-001' },
        plans: { id: 'plan-1', name: 'Basic Plan', category: 'Residential', speed: '100 Mbps', price: 1000 },
        commissions: [{ id: 'comm-1', status: 'Paid', amount: 600, date_paid: '2024-02-01T10:00:00Z' }],
      };

      const mockSingle = jest.fn().mockResolvedValue({ data: mockSubscriber, error: null });
      const mockEq = jest.fn().mockReturnThis();
      mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });

      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const response = await request(app).get('/api/subscribers/sub-1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'sub-1');
      expect(response.body).toHaveProperty('commission_status', 'Paid');
      expect(response.body).toHaveProperty('commission_details');
    });

    it('should return 404 if subscriber not found', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const mockEq = jest.fn().mockReturnThis();
      mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });

      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const response = await request(app).get('/api/subscribers/non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Subscriber not found');
    });
  });
});
