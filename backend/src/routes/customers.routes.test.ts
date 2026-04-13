import request from 'supertest';
import express, { Application } from 'express';
import customersRoutes from './customers.routes';
import { supabase } from '../config/supabase';
import * as storage from '../lib/storage';

// Mock dependencies
jest.mock('../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../lib/storage', () => ({
  uploadDocument: jest.fn(),
}));

describe('POST /api/customers/applications', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json({ limit: '50mb' }));
    app.use('/api/customers', customersRoutes);
    jest.clearAllMocks();
  });

  const validApplicationData = {
    firstName: 'Juan',
    middleName: 'Dela',
    lastName: 'Cruz',
    birthday: '1990-01-01',
    address: '123 Main St, Manila',
    latitude: 14.5995,
    longitude: 120.9842,
    planId: 'plan-123',
    agentRef: 'AGENT001',
    images: {
      housePhoto: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      governmentId: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      idSelfie: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    },
  };

  it('should create an application successfully', async () => {
    const mockAgent = { id: 'agent-123', is_active: true };
    const mockPlan = { id: 'plan-123', is_active: true };
    const mockApplication = {
      id: 'app-123',
      first_name: 'Juan',
      last_name: 'Cruz',
      status: 'Submitted',
    };

    // Mock agent lookup
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockAgent, error: null }),
    });

    // Mock plan lookup
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockPlan, error: null }),
    });

    // Mock application insert
    (supabase.from as jest.Mock).mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockApplication, error: null }),
    });

    // Mock image uploads
    (storage.uploadDocument as jest.Mock).mockResolvedValue('path/to/image.png');

    // Mock application update with image URLs
    (supabase.from as jest.Mock).mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    const response = await request(app)
      .post('/api/customers/applications')
      .send(validApplicationData);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      message: 'Application submitted successfully',
      applicationId: 'app-123',
    });
  });

  it('should return 400 if required fields are missing', async () => {
    const response = await request(app)
      .post('/api/customers/applications')
      .send({
        firstName: 'Juan',
        // Missing other required fields
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Missing required fields');
  });

  it('should return 400 if images are missing', async () => {
    const response = await request(app)
      .post('/api/customers/applications')
      .send({
        ...validApplicationData,
        images: {
          housePhoto: 'data:image/png;base64,test',
          // Missing other images
        },
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('All required images must be provided');
  });

  it('should return 400 if agent referral code is invalid', async () => {
    // Mock agent lookup returning null
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    });

    const response = await request(app)
      .post('/api/customers/applications')
      .send(validApplicationData);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid referral code');
  });

  it('should return 400 if agent is not active', async () => {
    const mockAgent = { id: 'agent-123', is_active: false };

    // Mock agent lookup
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockAgent, error: null }),
    });

    const response = await request(app)
      .post('/api/customers/applications')
      .send(validApplicationData);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Agent is not active');
  });

  it('should return 400 if plan is invalid', async () => {
    const mockAgent = { id: 'agent-123', is_active: true };

    // Mock agent lookup
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockAgent, error: null }),
    });

    // Mock plan lookup returning null
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    });

    const response = await request(app)
      .post('/api/customers/applications')
      .send(validApplicationData);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid plan ID');
  });

  it('should return 400 if plan is not active', async () => {
    const mockAgent = { id: 'agent-123', is_active: true };
    const mockPlan = { id: 'plan-123', is_active: false };

    // Mock agent lookup
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockAgent, error: null }),
    });

    // Mock plan lookup
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockPlan, error: null }),
    });

    const response = await request(app)
      .post('/api/customers/applications')
      .send(validApplicationData);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Plan is not active');
  });

  it('should rollback application if image upload fails', async () => {
    const mockAgent = { id: 'agent-123', is_active: true };
    const mockPlan = { id: 'plan-123', is_active: true };
    const mockApplication = {
      id: 'app-123',
      first_name: 'Juan',
      last_name: 'Cruz',
      status: 'Submitted',
    };

    // Mock agent lookup
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockAgent, error: null }),
    });

    // Mock plan lookup
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockPlan, error: null }),
    });

    // Mock application insert
    (supabase.from as jest.Mock).mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockApplication, error: null }),
    });

    // Mock image upload failure
    (storage.uploadDocument as jest.Mock).mockRejectedValue(new Error('Upload failed'));

    // Mock application delete (rollback)
    (supabase.from as jest.Mock).mockReturnValueOnce({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    const response = await request(app)
      .post('/api/customers/applications')
      .send(validApplicationData);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Failed to submit application');
  });
});
