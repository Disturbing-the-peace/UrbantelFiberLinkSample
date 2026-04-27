import { calculateCommission, createCommissionForActivation } from './commissions.routes';
import { supabase } from '../config/supabase';

// Mock Supabase
jest.mock('../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Commission Routes', () => {
  describe('calculateCommission', () => {
    it('should calculate 60% of plan price', () => {
      expect(calculateCommission(100)).toBe(60);
      expect(calculateCommission(1000)).toBe(600);
      expect(calculateCommission(50)).toBe(30);
    });

    it('should handle decimal prices', () => {
      expect(calculateCommission(99.99)).toBeCloseTo(59.994, 2);
      expect(calculateCommission(149.50)).toBeCloseTo(89.7, 2);
    });

    it('should handle zero price', () => {
      expect(calculateCommission(0)).toBe(0);
    });
  });

  describe('createCommissionForActivation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create commission with correct amount', async () => {
      const mockCommission = {
        id: 'comm-123',
        agent_id: 'agent-123',
        subscriber_id: 'sub-123',
        amount: 60,
        status: 'Pending',
        date_activated: '2024-01-01T00:00:00Z',
      };

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockCommission,
          error: null,
        }),
      };

      const mockInsert = jest.fn().mockReturnValue(mockChain);

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const result = await createCommissionForActivation(
        'agent-123',
        'sub-123',
        100,
        '2024-01-01T00:00:00Z',
        'branch-123'
      );

      expect(result).toEqual(mockCommission);
      expect(supabase.from).toHaveBeenCalledWith('commissions');
      expect(mockInsert).toHaveBeenCalledWith({
        agent_id: 'agent-123',
        subscriber_id: 'sub-123',
        amount: 60,
        status: 'Pending',
        date_activated: '2024-01-01T00:00:00Z',
        branch_id: 'branch-123',
      });
    });

    it('should return null on database error', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      const mockInsert = jest.fn().mockReturnValue(mockChain);

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const result = await createCommissionForActivation(
        'agent-123',
        'sub-123',
        100,
        '2024-01-01T00:00:00Z',
        'branch-123'
      );

      expect(result).toBeNull();
    });
  });
});
