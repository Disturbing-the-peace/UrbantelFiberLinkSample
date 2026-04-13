import request from 'supertest';
import express from 'express';
import auditLogRoutes from './auditLog.routes';
import { supabase } from '../config/supabase';

// Mock dependencies
jest.mock('../config/supabase');
jest.mock('../middleware/auth', () => ({
  verifyToken: (req: any, res: any, next: any) => {
    req.user = { id: 'user-1', role: 'superadmin' };
    next();
  },
  checkSuperadmin: (req: any, res: any, next: any) => {
    if (req.user?.role === 'superadmin') {
      next();
    } else {
      res.status(403).json({ error: 'Superadmin access required' });
    }
  }
}));

const app = express();
app.use(express.json());
app.use('/api/audit-logs', auditLogRoutes);

describe('Audit Log Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/audit-logs', () => {
    it('should return audit logs with pagination', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'DATA_PURGE',
          entity_type: 'application',
          entity_id: 'app-1',
          fields_purged: ['birthday', 'house_photo_url'],
          files_deleted: ['house.jpg'],
          performed_by: 'SYSTEM',
          performed_at: new Date().toISOString()
        }
      ];

      const mockRange = jest.fn().mockResolvedValue({
        data: mockLogs,
        error: null,
        count: 1
      });

      const mockOrder = jest.fn().mockReturnValue({
        range: mockRange
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      const response = await request(app)
        .get('/api/audit-logs')
        .expect(200);

      expect(response.body.data).toEqual(mockLogs);
      expect(response.body.pagination).toEqual({
        total: 1,
        limit: 100,
        offset: 0
      });
    });

    it('should filter by action type', async () => {
      const mockEq = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0
      });

      const mockOrder = jest.fn().mockReturnValue({
        eq: mockEq,
        range: mockRange
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      mockEq.mockReturnValue({
        range: mockRange
      });

      await request(app)
        .get('/api/audit-logs?action=DATA_PURGE')
        .expect(200);

      expect(mockEq).toHaveBeenCalledWith('action', 'DATA_PURGE');
    });

    it('should handle database errors', async () => {
      const mockRange = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
        count: null
      });

      const mockOrder = jest.fn().mockReturnValue({
        range: mockRange
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      const response = await request(app)
        .get('/api/audit-logs')
        .expect(500);

      expect(response.body.error).toBe('Database error');
    });
  });

  describe('GET /api/audit-logs/:id', () => {
    it('should return a specific audit log entry', async () => {
      const mockLog = {
        id: 'log-1',
        action: 'DATA_PURGE',
        entity_type: 'application',
        entity_id: 'app-1',
        performed_by: 'SYSTEM'
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockLog,
        error: null
      });

      const mockEq = jest.fn().mockReturnValue({
        single: mockSingle
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      const response = await request(app)
        .get('/api/audit-logs/log-1')
        .expect(200);

      expect(response.body).toEqual(mockLog);
    });

    it('should return 404 for non-existent log', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      });

      const mockEq = jest.fn().mockReturnValue({
        single: mockSingle
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      const response = await request(app)
        .get('/api/audit-logs/non-existent')
        .expect(404);

      expect(response.body.error).toBe('Audit log entry not found');
    });
  });
});
