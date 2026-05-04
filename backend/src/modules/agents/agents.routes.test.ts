import request from 'supertest';
import express, { Application } from 'express';
import agentsRoutes from './agents.routes';
import { supabase } from '../../shared/config/supabase';

// Mock the supabase client
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
  verifyToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com', role: 'superadmin' };
    next();
  },
  checkSuperadmin: (req: any, res: any, next: any) => next(),
  checkAdmin: (req: any, res: any, next: any) => next(),
}));

describe('Agent Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/agents', agentsRoutes);
    jest.clearAllMocks();
  });

  describe('POST /api/agents', () => {
    it('should create a new agent with generated referral code', async () => {
      const mockAgent = {
        id: 'agent-123',
        name: 'John Doe',
        referral_code: 'AGT-ABC123',
        contact_number: '1234567890',
        email: 'john@example.com',
        messenger_link: 'https://m.me/johndoe',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = jest.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });
      const mockInsertSelect = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockAgent, error: null }),
      });
      const mockInsert = jest.fn().mockReturnValue({
        select: mockInsertSelect,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      const response = await request(app)
        .post('/api/agents')
        .send({
          name: 'John Doe',
          contact_number: '1234567890',
          email: 'john@example.com',
          messenger_link: 'https://m.me/johndoe',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('John Doe');
      expect(response.body.referral_code).toMatch(/^AGT-[A-Z0-9]{6}$/);
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/agents')
        .send({
          contact_number: '1234567890',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Agent name is required');
    });
  });

  describe('GET /api/agents', () => {
    it('should return list of all agents', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Agent One',
          referral_code: 'AGT-111111',
          is_active: true,
        },
        {
          id: 'agent-2',
          name: 'Agent Two',
          referral_code: 'AGT-222222',
          is_active: true,
        },
      ];

      const mockOrder = jest.fn().mockResolvedValue({ data: mockAgents, error: null });
      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const response = await request(app).get('/api/agents');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should filter agents by active status', async () => {
      const mockActiveAgents = [
        {
          id: 'agent-1',
          name: 'Active Agent',
          referral_code: 'AGT-111111',
          is_active: true,
        },
      ];

      // Mock the chained query builder
      const mockQuery = {
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockActiveAgents, error: null }),
      };

      const mockSelect = jest.fn().mockReturnValue(mockQuery);

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const response = await request(app).get('/api/agents?is_active=true');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/agents/:id', () => {
    it('should return a single agent by ID', async () => {
      const mockAgent = {
        id: 'agent-123',
        name: 'John Doe',
        referral_code: 'AGT-ABC123',
        is_active: true,
      };

      const mockSingle = jest.fn().mockResolvedValue({ data: mockAgent, error: null });
      const mockEq = jest.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const response = await request(app).get('/api/agents/agent-123');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('agent-123');
      expect(response.body.name).toBe('John Doe');
    });

    it('should return 404 if agent not found', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const mockEq = jest.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const response = await request(app).get('/api/agents/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Agent not found');
    });
  });

  describe('PUT /api/agents/:id', () => {
    it('should update an agent', async () => {
      const mockUpdatedAgent = {
        id: 'agent-123',
        name: 'Updated Name',
        referral_code: 'AGT-ABC123',
        contact_number: '9876543210',
        is_active: true,
      };

      const mockSingleFetch = jest.fn().mockResolvedValue({ data: { id: 'agent-123' }, error: null });
      const mockEqFetch = jest.fn().mockReturnValue({
        single: mockSingleFetch,
      });
      const mockSelectFetch = jest.fn().mockReturnValue({
        eq: mockEqFetch,
      });

      const mockSingleUpdate = jest.fn().mockResolvedValue({ data: mockUpdatedAgent, error: null });
      const mockSelectUpdate = jest.fn().mockReturnValue({
        single: mockSingleUpdate,
      });
      const mockEqUpdate = jest.fn().mockReturnValue({
        select: mockSelectUpdate,
      });
      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEqUpdate,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelectFetch,
        update: mockUpdate,
      });

      const response = await request(app)
        .put('/api/agents/agent-123')
        .send({
          name: 'Updated Name',
          contact_number: '9876543210',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
    });

    it('should return 404 if agent not found', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const mockEq = jest.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const response = await request(app)
        .put('/api/agents/nonexistent-id')
        .send({
          name: 'Updated Name',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Agent not found');
    });
  });

  describe('DELETE /api/agents/:id', () => {
    it('should soft delete an agent', async () => {
      const mockAgent = {
        id: 'agent-123',
        name: 'John Doe',
        referral_code: 'AGT-ABC123',
        is_active: false,
      };

      const mockSingleFetch = jest.fn().mockResolvedValue({
        data: { id: 'agent-123', is_active: true },
        error: null,
      });
      const mockEqFetch = jest.fn().mockReturnValue({
        single: mockSingleFetch,
      });
      const mockSelectFetch = jest.fn().mockReturnValue({
        eq: mockEqFetch,
      });

      const mockSingleUpdate = jest.fn().mockResolvedValue({ data: mockAgent, error: null });
      const mockSelectUpdate = jest.fn().mockReturnValue({
        single: mockSingleUpdate,
      });
      const mockEqUpdate = jest.fn().mockReturnValue({
        select: mockSelectUpdate,
      });
      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEqUpdate,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelectFetch,
        update: mockUpdate,
      });

      const response = await request(app).delete('/api/agents/agent-123');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Agent deactivated successfully');
      expect(response.body.agent.is_active).toBe(false);
    });

    it('should return 404 if agent not found', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const mockEq = jest.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const response = await request(app).delete('/api/agents/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Agent not found');
    });

    it('should return 400 if agent is already inactive', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: 'agent-123', is_active: false },
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const response = await request(app).delete('/api/agents/agent-123');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Agent is already inactive');
    });
  });
});
