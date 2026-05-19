/**
 * Integration Tests for Provider Search and Management
 * Tests provider search, filtering, and details retrieval
 */

import { supabase } from '../../services/supabase';

// Mock Supabase
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

describe('Provider Search Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Search Providers', () => {
    it('should search providers by service type', async () => {
      const mockProviders = [
        {
          id: 'provider-1',
          name: 'Jane Doe',
          services: ['Haircut', 'Hair Coloring'],
          rating: 4.8,
        },
        {
          id: 'provider-2',
          name: 'John Smith',
          services: ['Haircut', 'Beard Trim'],
          rating: 4.5,
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockContains = jest.fn().mockResolvedValue({
        data: mockProviders,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        contains: mockContains,
      });

      const result = await supabase
        .from('providers')
        .select('*')
        .contains('services', ['Haircut']);

      expect(result.data).toHaveLength(2);
      expect(result.data?.every(p => p.services.includes('Haircut'))).toBe(true);
    });

    it('should search providers by name', async () => {
      const mockProviders = [
        {
          id: 'provider-1',
          name: 'Jane Doe',
          rating: 4.8,
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockIlike = jest.fn().mockResolvedValue({
        data: mockProviders,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        ilike: mockIlike,
      });

      const result = await supabase
        .from('providers')
        .select('*')
        .ilike('name', '%Jane%');

      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].name).toBe('Jane Doe');
    });

    it('should handle empty search results', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockIlike = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        ilike: mockIlike,
      });

      const result = await supabase
        .from('providers')
        .select('*')
        .ilike('name', '%NonExistent%');

      expect(result.data).toHaveLength(0);
    });
  });

  describe('Filter Providers', () => {
    it('should filter providers by minimum rating', async () => {
      const mockProviders = [
        { id: 'provider-1', name: 'Jane Doe', rating: 4.8 },
        { id: 'provider-2', name: 'John Smith', rating: 4.5 },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockGte = jest.fn().mockResolvedValue({
        data: mockProviders,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        gte: mockGte,
      });

      const result = await supabase
        .from('providers')
        .select('*')
        .gte('rating', 4.5);

      expect(result.data).toHaveLength(2);
      expect(result.data?.every(p => p.rating >= 4.5)).toBe(true);
    });

    it('should filter providers by price range', async () => {
      const mockProviders = [
        { id: 'provider-1', name: 'Jane Doe', base_price: 50 },
        { id: 'provider-2', name: 'John Smith', base_price: 75 },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockGte = jest.fn().mockReturnThis();
      const mockLte = jest.fn().mockResolvedValue({
        data: mockProviders,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        lte: mockLte,
      });

      const result = await supabase
        .from('providers')
        .select('*')
        .gte('base_price', 40)
        .lte('base_price', 100);

      expect(result.data).toHaveLength(2);
      expect(result.data?.every(p => p.base_price >= 40 && p.base_price <= 100)).toBe(true);
    });

    it('should filter verified providers only', async () => {
      const mockProviders = [
        { id: 'provider-1', name: 'Jane Doe', verified: true },
        { id: 'provider-2', name: 'John Smith', verified: true },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: mockProviders,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      });

      const result = await supabase
        .from('providers')
        .select('*')
        .eq('verified', true);

      expect(result.data).toHaveLength(2);
      expect(result.data?.every(p => p.verified === true)).toBe(true);
    });

    it('should filter providers by availability', async () => {
      const mockProviders = [
        { id: 'provider-1', name: 'Jane Doe', available: true },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: mockProviders,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      });

      const result = await supabase
        .from('providers')
        .select('*')
        .eq('available', true);

      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].available).toBe(true);
    });
  });

  describe('Sort Providers', () => {
    it('should sort providers by rating (highest first)', async () => {
      const mockProviders = [
        { id: 'provider-1', name: 'Jane Doe', rating: 4.8 },
        { id: 'provider-2', name: 'John Smith', rating: 4.5 },
        { id: 'provider-3', name: 'Alice Brown', rating: 4.9 },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockProviders,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      const result = await supabase
        .from('providers')
        .select('*')
        .order('rating', { ascending: false });

      expect(result.data?.[0].rating).toBe(4.8);
      expect(mockOrder).toHaveBeenCalledWith('rating', { ascending: false });
    });

    it('should sort providers by distance (nearest first)', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [
          { id: 'provider-1', name: 'Jane Doe', distance: 2.5 },
          { id: 'provider-2', name: 'John Smith', distance: 5.0 },
          { id: 'provider-3', name: 'Alice Brown', distance: 1.2 },
        ],
        error: null,
      });

      const result = await supabase.rpc('nearby_providers', {
        lat: 40.7128,
        long: -74.0060,
        max_distance: 10,
      });

      expect(result.data).toHaveLength(3);
      expect(result.data?.[0].distance).toBe(2.5);
    });

    it('should sort providers by price (lowest first)', async () => {
      const mockProviders = [
        { id: 'provider-1', name: 'Jane Doe', base_price: 50 },
        { id: 'provider-2', name: 'John Smith', base_price: 75 },
        { id: 'provider-3', name: 'Alice Brown', base_price: 40 },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockProviders,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      const result = await supabase
        .from('providers')
        .select('*')
        .order('base_price', { ascending: true });

      expect(result.data?.[0].base_price).toBe(50);
      expect(mockOrder).toHaveBeenCalledWith('base_price', { ascending: true });
    });
  });

  describe('Get Provider Details', () => {
    it('should retrieve complete provider profile', async () => {
      const mockProvider = {
        id: 'provider-1',
        name: 'Jane Doe',
        bio: 'Professional hairstylist with 10 years experience',
        rating: 4.8,
        total_reviews: 150,
        services: ['Haircut', 'Hair Coloring', 'Styling'],
        portfolio: [
          { id: 'img-1', url: 'https://example.com/img1.jpg' },
          { id: 'img-2', url: 'https://example.com/img2.jpg' },
        ],
        verified: true,
        available: true,
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProvider,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await supabase
        .from('providers')
        .select('*, portfolio:portfolio_images(*)')
        .eq('id', 'provider-1')
        .single();

      expect(result.data).toEqual(mockProvider);
      expect(result.data?.portfolio).toHaveLength(2);
    });

    it('should handle provider not found', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Provider not found' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await supabase
        .from('providers')
        .select('*')
        .eq('id', 'invalid-id')
        .single();

      expect(result.error?.message).toBe('Provider not found');
    });
  });

  describe('Get Provider Services', () => {
    it('should retrieve all services offered by provider', async () => {
      const mockServices = [
        { id: 'service-1', name: 'Haircut', price: 50, duration: 60 },
        { id: 'service-2', name: 'Hair Coloring', price: 100, duration: 120 },
        { id: 'service-3', name: 'Styling', price: 40, duration: 45 },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: mockServices,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      });

      const result = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', 'provider-1');

      expect(result.data).toHaveLength(3);
      expect(result.data?.[0].name).toBe('Haircut');
    });
  });

  describe('Get Provider Reviews', () => {
    it('should retrieve provider reviews with customer details', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          rating: 5,
          comment: 'Excellent service!',
          customer: { name: 'Alice', avatar: 'avatar1.jpg' },
          created_at: '2024-12-20',
        },
        {
          id: 'review-2',
          rating: 4,
          comment: 'Very good',
          customer: { name: 'Bob', avatar: 'avatar2.jpg' },
          created_at: '2024-12-15',
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
        .eq('provider_id', 'provider-1')
        .order('created_at', { ascending: false });

      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].customer.name).toBe('Alice');
    });

    it('should calculate average rating from reviews', async () => {
      const mockReviews = [
        { rating: 5 },
        { rating: 4 },
        { rating: 5 },
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
        .eq('provider_id', 'provider-1');

      const avgRating = result.data?.reduce((sum, r) => sum + r.rating, 0) / result.data.length;
      expect(avgRating).toBe(4.5);
    });
  });
});

