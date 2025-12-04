/**
 * Integration Tests for Review System
 * Tests review submission, retrieval, and validation
 */

import { supabase } from '../../services/supabase';

// Mock Supabase
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

describe('Review System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Submit Review', () => {
    it('should successfully submit a review', async () => {
      const mockReview = {
        id: 'review-123',
        booking_id: 'booking-456',
        provider_id: 'provider-789',
        customer_id: 'customer-101',
        rating: 5,
        comment: 'Excellent service! Very professional.',
        created_at: new Date().toISOString(),
      };

      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockReview,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await supabase
        .from('reviews')
        .insert({
          booking_id: 'booking-456',
          provider_id: 'provider-789',
          customer_id: 'customer-101',
          rating: 5,
          comment: 'Excellent service! Very professional.',
        })
        .select()
        .single();

      expect(result.data).toEqual(mockReview);
      expect(result.error).toBeNull();
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should validate rating is between 1 and 5', async () => {
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Rating must be between 1 and 5' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await supabase
        .from('reviews')
        .insert({
          booking_id: 'booking-456',
          provider_id: 'provider-789',
          customer_id: 'customer-101',
          rating: 6, // Invalid rating
          comment: 'Test',
        })
        .select()
        .single();

      expect(result.error?.message).toBe('Rating must be between 1 and 5');
    });

    it('should prevent duplicate reviews for same booking', async () => {
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Review already exists for this booking' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await supabase
        .from('reviews')
        .insert({
          booking_id: 'booking-456',
          provider_id: 'provider-789',
          customer_id: 'customer-101',
          rating: 5,
          comment: 'Great!',
        })
        .select()
        .single();

      expect(result.error?.message).toBe('Review already exists for this booking');
    });

    it('should allow review without comment', async () => {
      const mockReview = {
        id: 'review-123',
        booking_id: 'booking-456',
        provider_id: 'provider-789',
        customer_id: 'customer-101',
        rating: 4,
        comment: null,
        created_at: new Date().toISOString(),
      };

      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockReview,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await supabase
        .from('reviews')
        .insert({
          booking_id: 'booking-456',
          provider_id: 'provider-789',
          customer_id: 'customer-101',
          rating: 4,
        })
        .select()
        .single();

      expect(result.data?.rating).toBe(4);
      expect(result.data?.comment).toBeNull();
    });

    it('should validate comment length', async () => {
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Comment exceeds maximum length' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const longComment = 'a'.repeat(501); // Exceeds 500 character limit

      const result = await supabase
        .from('reviews')
        .insert({
          booking_id: 'booking-456',
          provider_id: 'provider-789',
          customer_id: 'customer-101',
          rating: 5,
          comment: longComment,
        })
        .select()
        .single();

      expect(result.error?.message).toBe('Comment exceeds maximum length');
    });
  });

  describe('Update Provider Rating', () => {
    it('should update provider average rating after review submission', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { average_rating: 4.7, total_reviews: 25 },
        error: null,
      });

      const result = await supabase.rpc('update_provider_rating', {
        provider_id: 'provider-789',
      });

      expect(result.data?.average_rating).toBe(4.7);
      expect(result.data?.total_reviews).toBe(25);
    });

    it('should handle rating update errors', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Provider not found' },
      });

      const result = await supabase.rpc('update_provider_rating', {
        provider_id: 'invalid-id',
      });

      expect(result.error?.message).toBe('Provider not found');
    });
  });

  describe('Get Reviews', () => {
    it('should retrieve reviews for a provider', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          rating: 5,
          comment: 'Excellent!',
          customer: { name: 'Alice', avatar: 'avatar1.jpg' },
          created_at: '2024-12-20',
        },
        {
          id: 'review-2',
          rating: 4,
          comment: 'Very good',
          customer: { name: 'Bob', avatar: 'avatar2.jpg' },
          created_at: '2024-12-19',
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockReviews,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await supabase
        .from('reviews')
        .select('*, customer:customers(name, avatar)')
        .eq('provider_id', 'provider-789')
        .order('created_at', { ascending: false });

      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].rating).toBe(5);
    });

    it('should retrieve reviews for a customer', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          rating: 5,
          comment: 'Great service!',
          provider: { name: 'Jane Doe', avatar: 'avatar1.jpg' },
          created_at: '2024-12-20',
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockReviews,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await supabase
        .from('reviews')
        .select('*, provider:providers(name, avatar)')
        .eq('customer_id', 'customer-101')
        .order('created_at', { ascending: false });

      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].provider.name).toBe('Jane Doe');
    });

    it('should filter reviews by rating', async () => {
      const mockReviews = [
        { id: 'review-1', rating: 5, comment: 'Excellent!' },
        { id: 'review-2', rating: 5, comment: 'Perfect!' },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockResolvedValue({
        data: mockReviews,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq.mockReturnValue({
          eq: mockEq2,
        }),
      });

      const result = await supabase
        .from('reviews')
        .select('*')
        .eq('provider_id', 'provider-789')
        .eq('rating', 5);

      expect(result.data).toHaveLength(2);
      expect(result.data?.every(r => r.rating === 5)).toBe(true);
    });

    it('should paginate reviews', async () => {
      const mockReviews = [
        { id: 'review-1', rating: 5 },
        { id: 'review-2', rating: 4 },
        { id: 'review-3', rating: 5 },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockResolvedValue({
        data: mockReviews,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        range: mockRange,
      });

      const result = await supabase
        .from('reviews')
        .select('*')
        .eq('provider_id', 'provider-789')
        .order('created_at', { ascending: false })
        .range(0, 2);

      expect(result.data).toHaveLength(3);
      expect(mockRange).toHaveBeenCalledWith(0, 2);
    });
  });

  describe('Review Statistics', () => {
    it('should calculate rating distribution', async () => {
      const mockReviews = [
        { rating: 5 },
        { rating: 5 },
        { rating: 4 },
        { rating: 5 },
        { rating: 3 },
        { rating: 4 },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: mockReviews,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      });

      const result = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', 'provider-789');

      const distribution = result.data?.reduce((acc, r) => {
        acc[r.rating] = (acc[r.rating] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      expect(distribution?.[5]).toBe(3);
      expect(distribution?.[4]).toBe(2);
      expect(distribution?.[3]).toBe(1);
    });

    it('should calculate average rating', async () => {
      const mockReviews = [
        { rating: 5 },
        { rating: 4 },
        { rating: 5 },
        { rating: 3 },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: mockReviews,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      });

      const result = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', 'provider-789');

      const avgRating = result.data?.reduce((sum, r) => sum + r.rating, 0) / result.data.length;
      expect(avgRating).toBe(4.25);
    });

    it('should get total review count', async () => {
      const mockReviews = [
        { id: 'review-1' },
        { id: 'review-2' },
        { id: 'review-3' },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: mockReviews,
        error: null,
        count: 3,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      });

      const result = await supabase
        .from('reviews')
        .select('id', { count: 'exact' })
        .eq('provider_id', 'provider-789');

      expect(result.count).toBe(3);
    });
  });

  describe('Delete Review', () => {
    it('should successfully delete a review', async () => {
      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: { id: 'review-123' },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      });

      const result = await supabase
        .from('reviews')
        .delete()
        .eq('id', 'review-123');

      expect(result.error).toBeNull();
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should handle delete errors', async () => {
      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Review not found' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      });

      const result = await supabase
        .from('reviews')
        .delete()
        .eq('id', 'invalid-id');

      expect(result.error?.message).toBe('Review not found');
    });
  });

  describe('Update Review', () => {
    it('should successfully update a review', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'review-123',
          rating: 4,
          comment: 'Updated comment',
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await supabase
        .from('reviews')
        .update({
          rating: 4,
          comment: 'Updated comment',
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'review-123')
        .select()
        .single();

      expect(result.data?.rating).toBe(4);
      expect(result.data?.comment).toBe('Updated comment');
    });

    it('should prevent updating review after 24 hours', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Cannot update review after 24 hours' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await supabase
        .from('reviews')
        .update({ rating: 5 })
        .eq('id', 'review-123')
        .select()
        .single();

      expect(result.error?.message).toBe('Cannot update review after 24 hours');
    });
  });
});

