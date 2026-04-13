import request from 'supertest';
import express, { Application } from 'express';
import analyticsRoutes from './analytics.routes';
import { supabase } from '../config/supabase';

// Mock the supabase client
jest.mock('../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  verifyToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com', role: 'admin' };
    next();
  },
  checkAdmin: (req: any, res: any, next: any) => next(),
}));

describe('Analytics Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/analytics', analyticsRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/analytics/subscribers-monthly', () => {
    it('should return monthly subscriber count', async () => {
      const mockLte = jest.fn().mockResolvedValue({ count: 15, error: null });
      const mockGte = jest.fn().mockReturnValue({
        lte: mockLte,
      });
      const mockEq = jest.fn().mockReturnValue({
        gte: mockGte,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const response = await request(app).get('/api/analytics/subscribers-monthly');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ count: 15 });
    });

    it('should handle errors', async () => {
      const mockLte = jest.fn().mockResolvedValue({ count: null, error: { message: 'DB error' } });
      const mockGte = jest.fn().mockReturnValue({
        lte: mockLte,
      });
      const mockEq = jest.fn().mockReturnValue({
        gte: mockGte,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const response = await request(app).get('/api/analytics/subscribers-monthly');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/analytics/subscribers-per-agent', () => {
    it('should return subscriber counts grouped by agent', async () => {
      const mockData = [
        { agent_id: 'agent1', agents: { id: 'agent1', name: 'Agent One' } },
        { agent_id: 'agent1', agents: { id: 'agent1', name: 'Agent One' } },
        { agent_id: 'agent2', agents: { id: 'agent2', name: 'Agent Two' } },
      ];

      const mockEq = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const response = await request(app).get('/api/analytics/subscribers-per-agent');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        agent_id: 'agent1',
        agent_name: 'Agent One',
        count: 2,
      });
      expect(response.body[1]).toMatchObject({
        agent_id: 'agent2',
        agent_name: 'Agent Two',
        count: 1,
      });
    });
  });

  describe('GET /api/analytics/subscribers-per-plan', () => {
    it('should return subscriber counts grouped by plan', async () => {
      const mockData = [
        { plan_id: 'plan1', plans: { id: 'plan1', name: 'Basic Plan', category: 'Residential' } },
        { plan_id: 'plan1', plans: { id: 'plan1', name: 'Basic Plan', category: 'Residential' } },
        { plan_id: 'plan2', plans: { id: 'plan2', name: 'Business Plan', category: 'Business' } },
      ];

      const mockEq = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const response = await request(app).get('/api/analytics/subscribers-per-plan');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        plan_id: 'plan1',
        plan_name: 'Basic Plan',
        plan_category: 'Residential',
        count: 2,
      });
    });
  });

  describe('GET /api/analytics/subscription-trends', () => {
    it('should return monthly subscription trends', async () => {
      const mockData = [
        { activated_at: '2024-01-15T10:00:00Z' },
        { activated_at: '2024-01-20T10:00:00Z' },
        { activated_at: '2024-02-10T10:00:00Z' },
      ];

      const mockOrder = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const mockGte = jest.fn().mockReturnValue({
        order: mockOrder,
      });
      const mockEq = jest.fn().mockReturnValue({
        gte: mockGte,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const response = await request(app).get('/api/analytics/subscription-trends');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({ month: expect.any(String), count: expect.any(Number) }),
      ]));
    });
  });

  describe('GET /api/analytics/conversion-rate', () => {
    it('should return conversion rate', async () => {
      // Mock for total count
      const mockSelectTotal = jest.fn().mockResolvedValue({ count: 100, error: null });
      
      // Mock for activated count
      const mockEqActivated = jest.fn().mockResolvedValue({ count: 60, error: null });
      const mockSelectActivated = jest.fn().mockReturnValue({
        eq: mockEqActivated,
      });

      // Setup from mock to return different values on consecutive calls
      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: mockSelectTotal,
        })
        .mockReturnValueOnce({
          select: mockSelectActivated,
        });

      const response = await request(app).get('/api/analytics/conversion-rate');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        total_applications: 100,
        activated_applications: 60,
        conversion_rate: 60,
      });
    });
  });

  describe('GET /api/analytics/pending-applications', () => {
    it('should return pending applications count', async () => {
      const mockIn = jest.fn().mockResolvedValue({ count: 25, error: null });
      const mockSelect = jest.fn().mockReturnValue({
        in: mockIn,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const response = await request(app).get('/api/analytics/pending-applications');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ count: 25 });
    });
  });

  describe('GET /api/analytics/total-commissions-due', () => {
    it('should return total commissions due', async () => {
      const mockData = [
        { amount: 100.50 },
        { amount: 200.75 },
        { amount: 150.25 },
      ];

      const mockEq = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const response = await request(app).get('/api/analytics/total-commissions-due');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        total_due: 451.50,
        count: 3,
      });
    });
  });
});
