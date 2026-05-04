import { DataPurgeService } from './dataPurge.service';
import { supabase } from '../../shared/config/supabase';

// Mock supabase
jest.mock('../../shared/config/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn()
    }
  }
}));

describe('DataPurgeService', () => {
  let service: DataPurgeService;

  beforeEach(() => {
    service = DataPurgeService.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.stopScheduler();
  });

  describe('executePurge', () => {
    it('should purge data for activated subscribers after 3 days', async () => {
      const mockSubscribers = [
        {
          id: 'sub-1',
          birthday: '1990-01-01',
          house_photo_url: 'https://example.supabase.co/storage/v1/object/public/application-documents/house.jpg',
          government_id_url: 'https://example.supabase.co/storage/v1/object/public/application-documents/id.jpg',
          id_selfie_url: null,
          signature_url: null,
          activated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      // Mock query for subscribers
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockLte = jest.fn().mockResolvedValue({ data: mockSubscribers, error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        lte: mockLte,
        update: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      mockSelect.mockReturnValue({
        eq: mockEq
      });

      mockEq.mockReturnValue({
        eq: mockEq,
        lte: mockLte
      });

      // Mock storage delete
      const mockRemove = jest.fn().mockResolvedValue({ error: null });
      (supabase.storage.from as jest.Mock).mockReturnValue({
        remove: mockRemove
      });

      const results = await service.executePurge();

      expect(results).toHaveLength(1);
      expect(results[0].subscriberId).toBe('sub-1');
      expect(results[0].fieldsPurged).toContain('birthday');
      expect(results[0].fieldsPurged).toContain('house_photo_url');
    });

    it('should return empty array when no subscribers need purging', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockLte = jest.fn().mockResolvedValue({ data: [], error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      mockSelect.mockReturnValue({
        eq: mockEq
      });

      mockEq.mockReturnValue({
        eq: mockEq,
        lte: mockLte
      });

      const results = await service.executePurge();

      expect(results).toHaveLength(0);
    });

    it('should handle query errors gracefully', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockLte = jest.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      mockSelect.mockReturnValue({
        eq: mockEq
      });

      mockEq.mockReturnValue({
        eq: mockEq,
        lte: mockLte
      });

      await expect(service.executePurge()).rejects.toThrow('Failed to query subscribers for purge');
    });
  });

  describe('scheduler', () => {
    it('should start and stop scheduler', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.startScheduler();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Data purge scheduler started'));

      service.stopScheduler();
      expect(consoleSpy).toHaveBeenCalledWith('Data purge scheduler stopped');

      consoleSpy.mockRestore();
    });

    it('should not start scheduler twice', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.startScheduler();
      service.startScheduler();

      expect(consoleSpy).toHaveBeenCalledWith('Data purge scheduler is already running');

      service.stopScheduler();
      consoleSpy.mockRestore();
    });
  });
});
