import request from 'supertest';
import express, { Application } from 'express';
import exportRoutes from './export.routes';
import { supabase } from '../config/supabase';

// Mock dependencies
jest.mock('../config/supabase');
jest.mock('../middleware/auth', () => ({
  verifyToken: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-id', email: 'admin@test.com', role: 'admin' };
    next();
  }),
  checkAdmin: jest.fn((req, res, next) => next()),
}));

const app: Application = express();
app.use(express.json());
app.use('/api/export', exportRoutes);

describe('Export Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/export/subscribers', () => {
    it('should export subscribers as CSV', async () => {
      const mockSubscribers = [
        {
          id: 'sub-1',
          first_name: 'John',
          middle_name: 'A',
          last_name: 'Doe',
          birthday: '1990-01-01',
          contact_number: '09123456789',
          email: 'john@example.com',
          address: '123 Main St',
          activated_at: '2024-01-15T10:00:00Z',
          agents: { name: 'Agent Smith', referral_code: 'AGT001' },
          plans: { name: 'Fiber 100', category: 'Residential', speed: '100 Mbps', price: 1500 },
          commissions: [{ status: 'Paid', amount: 500, date_paid: '2024-02-15' }],
        },
        {
          id: 'sub-2',
          first_name: 'Jane',
          middle_name: null,
          last_name: 'Smith',
          birthday: '1985-05-20',
          contact_number: '09987654321',
          email: null,
          address: '456 Oak Ave',
          activated_at: '2024-01-20T14:30:00Z',
          agents: { name: 'Agent Jones', referral_code: 'AGT002' },
          plans: { name: 'Fiber 50', category: 'Residential', speed: '50 Mbps', price: 1000 },
          commissions: [],
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockSubscribers, error: null }),
      });

      const response = await request(app).get('/api/export/subscribers');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('subscribers_export_');
      expect(response.text).toContain('ID,First Name,Middle Name,Last Name');
      expect(response.text).toContain('John,A,Doe');
      expect(response.text).toContain('Jane,,Smith');
      expect(response.text).toContain('Agent Smith,AGT001');
      expect(response.text).toContain('Paid,500,2024-02-15');
      expect(response.text).toContain('Pending,,');
    });

    it('should return 404 when no subscribers found', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      const response = await request(app).get('/api/export/subscribers');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No subscribers found');
    });

    it('should handle database errors', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      const response = await request(app).get('/api/export/subscribers');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch subscribers');
    });

    it('should escape CSV special characters', async () => {
      const mockSubscribers = [
        {
          id: 'sub-1',
          first_name: 'John, Jr.',
          middle_name: 'A',
          last_name: 'O"Brien',
          birthday: '1990-01-01',
          contact_number: '09123456789',
          email: 'john@example.com',
          address: '123 Main St\nApt 4',
          activated_at: '2024-01-15T10:00:00Z',
          agents: { name: 'Agent Smith', referral_code: 'AGT001' },
          plans: { name: 'Fiber 100', category: 'Residential', speed: '100 Mbps', price: 1500 },
          commissions: [],
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockSubscribers, error: null }),
      });

      const response = await request(app).get('/api/export/subscribers');

      expect(response.status).toBe(200);
      expect(response.text).toContain('"John, Jr."');
      expect(response.text).toContain('"O""Brien"');
      expect(response.text).toContain('"123 Main St\nApt 4"');
    });
  });

  describe('GET /api/export/subscribers/:id/documents', () => {
    it('should return 404 when subscriber not found', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      });

      const response = await request(app).get('/api/export/subscribers/invalid-id/documents');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Subscriber not found');
    });

    it('should return 404 when subscriber has no documents', async () => {
      const mockSubscriber = {
        id: 'sub-1',
        first_name: 'John',
        last_name: 'Doe',
        house_photo_url: null,
        government_id_url: null,
        id_selfie_url: null,
        signature_url: null,
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSubscriber, error: null }),
      });

      const response = await request(app).get('/api/export/subscribers/sub-1/documents');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No documents found for this subscriber');
    });

    it('should create ZIP archive with documents', async () => {
      const mockSubscriber = {
        id: 'sub-1',
        first_name: 'John',
        last_name: 'Doe',
        house_photo_url: 'sub-1/house_photo_123.jpg',
        government_id_url: 'sub-1/government_id_456.jpg',
        id_selfie_url: 'sub-1/id_selfie_789.jpg',
        signature_url: 'sub-1/signature_012.jpg',
      };

      const mockFileBlob = new Blob(['mock file content'], { type: 'image/jpeg' });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSubscriber, error: null }),
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        download: jest.fn().mockResolvedValue({ data: mockFileBlob, error: null }),
      });

      const response = await request(app).get('/api/export/subscribers/sub-1/documents');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/zip');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('subscriber_sub-1_documents.zip');
    });

    it('should handle storage download errors gracefully', async () => {
      const mockSubscriber = {
        id: 'sub-1',
        first_name: 'John',
        last_name: 'Doe',
        house_photo_url: 'sub-1/house_photo_123.jpg',
        government_id_url: null,
        id_selfie_url: null,
        signature_url: null,
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSubscriber, error: null }),
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'File not found' },
        }),
      });

      const response = await request(app).get('/api/export/subscribers/sub-1/documents');

      // Should still return 200 but with empty or partial archive
      expect(response.status).toBe(200);
    });
  });
});
