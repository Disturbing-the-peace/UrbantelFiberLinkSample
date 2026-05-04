import request from 'supertest';
import express, { Application } from 'express';
import plansRoutes from './plans.routes';

// Mock Supabase
jest.mock('../../shared/config/supabase', () => {
  const mockPlans = [
    {
      id: '1',
      name: 'Test Plan',
      category: 'Residential',
      speed: '100 Mbps',
      price: 1500,
      inclusions: ['Unlimited Data'],
      is_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
  ];

  return {
    supabase: {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(function (this: any) {
            return this;
          }),
          order: jest.fn(function (this: any) {
            return {
              eq: jest.fn(() => Promise.resolve({ data: mockPlans, error: null })),
              then: (resolve: any) => resolve({ data: mockPlans, error: null }),
            };
          }),
          single: jest.fn(() => Promise.resolve({ data: mockPlans[0], error: null })),
        })),
      })),
    },
  };
});

describe('Plans Routes', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/plans', plansRoutes);
  });

  describe('GET /api/plans', () => {
    it('should return all active plans', async () => {
      const response = await request(app).get('/api/plans');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter plans by category', async () => {
      const response = await request(app).get('/api/plans?category=Residential');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/plans/:id', () => {
    it('should return a specific plan', async () => {
      const response = await request(app).get('/api/plans/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
    });
  });
});
