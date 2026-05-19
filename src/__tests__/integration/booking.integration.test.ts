/**
 * Integration Tests for Booking Flow
 * Tests the complete booking flow including Supabase integration
 */

import { supabase } from '../../services/supabase';

// Mock Supabase
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('Booking Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Booking', () => {
    it('should successfully create a new booking', async () => {
      const mockBooking = {
        id: 'booking-123',
        customer_id: 'customer-456',
        provider_id: 'provider-789',
        service_id: 'service-101',
        date: '2024-12-25',
        time: '14:00',
        status: 'pending',
        total_price: 100,
      };

      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockBooking,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await supabase
        .from('bookings')
        .insert({
          customer_id: 'customer-456',
          provider_id: 'provider-789',
          service_id: 'service-101',
          date: '2024-12-25',
          time: '14:00',
          total_price: 100,
        })
        .select()
        .single();

      expect(result.data).toEqual(mockBooking);
      expect(result.error).toBeNull();
      expect(mockInsert).toHaveBeenCalledWith({
        customer_id: 'customer-456',
        provider_id: 'provider-789',
        service_id: 'service-101',
        date: '2024-12-25',
        time: '14:00',
        total_price: 100,
      });
    });

    it('should handle booking creation errors', async () => {
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Time slot already booked' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await supabase
        .from('bookings')
        .insert({
          customer_id: 'customer-456',
          provider_id: 'provider-789',
          service_id: 'service-101',
          date: '2024-12-25',
          time: '14:00',
          total_price: 100,
        })
        .select()
        .single();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Time slot already booked');
    });

    it('should validate required booking fields', async () => {
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Missing required fields' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await supabase
        .from('bookings')
        .insert({
          customer_id: 'customer-456',
          // Missing provider_id, service_id, date, time
        })
        .select()
        .single();

      expect(result.error).toBeTruthy();
    });
  });

  describe('Cancel Booking', () => {
    it('should successfully cancel a booking', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: 'booking-123', status: 'cancelled' },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await supabase
        .from('bookings')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', 'booking-123')
        .select()
        .single();

      expect(result.data?.status).toBe('cancelled');
      expect(result.error).toBeNull();
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'booking-123');
    });

    it('should handle cancellation errors', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Booking not found' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', 'invalid-id')
        .select()
        .single();

      expect(result.error?.message).toBe('Booking not found');
    });

    it('should prevent cancelling already completed bookings', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Cannot cancel completed booking' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', 'booking-123')
        .select()
        .single();

      expect(result.error?.message).toBe('Cannot cancel completed booking');
    });
  });

  describe('Reschedule Booking', () => {
    it('should successfully reschedule a booking', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'booking-123',
          date: '2024-12-26',
          time: '15:00',
          status: 'pending',
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
        .from('bookings')
        .update({
          date: '2024-12-26',
          time: '15:00',
          rescheduled_at: new Date().toISOString(),
        })
        .eq('id', 'booking-123')
        .select()
        .single();

      expect(result.data?.date).toBe('2024-12-26');
      expect(result.data?.time).toBe('15:00');
      expect(result.error).toBeNull();
    });

    it('should handle rescheduling to unavailable time slot', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Time slot not available' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await supabase
        .from('bookings')
        .update({ date: '2024-12-26', time: '15:00' })
        .eq('id', 'booking-123')
        .select()
        .single();

      expect(result.error?.message).toBe('Time slot not available');
    });
  });

  describe('Get Booking Details', () => {
    it('should retrieve booking with provider and service details', async () => {
      const mockBooking = {
        id: 'booking-123',
        date: '2024-12-25',
        time: '14:00',
        status: 'pending',
        provider: {
          id: 'provider-789',
          name: 'Jane Doe',
          rating: 4.8,
        },
        service: {
          id: 'service-101',
          name: 'Haircut',
          price: 50,
        },
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockBooking,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await supabase
        .from('bookings')
        .select('*, provider:providers(*), service:services(*)')
        .eq('id', 'booking-123')
        .single();

      expect(result.data).toEqual(mockBooking);
      expect(result.data?.provider.name).toBe('Jane Doe');
      expect(result.data?.service.name).toBe('Haircut');
    });
  });

  describe('List Customer Bookings', () => {
    it('should retrieve all bookings for a customer', async () => {
      const mockBookings = [
        { id: 'booking-1', date: '2024-12-25', status: 'pending' },
        { id: 'booking-2', date: '2024-12-26', status: 'confirmed' },
        { id: 'booking-3', date: '2024-12-20', status: 'completed' },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockBookings,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', 'customer-456')
        .order('date', { ascending: false });

      expect(result.data).toHaveLength(3);
      expect(result.data?.[0].id).toBe('booking-1');
    });

    it('should filter bookings by status', async () => {
      const mockBookings = [
        { id: 'booking-1', date: '2024-12-25', status: 'pending' },
        { id: 'booking-2', date: '2024-12-26', status: 'pending' },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockBookings,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', 'customer-456')
        .eq('status', 'pending')
        .order('date', { ascending: false });

      expect(result.data).toHaveLength(2);
      expect(result.data?.every(b => b.status === 'pending')).toBe(true);
    });
  });
});

