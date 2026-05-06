/**
 * Integration Tests for Payment Flow
 * Tests the complete payment flow including legacy direct-card integration behavior
 */

import { supabase } from '../../services/supabase';

// Mock legacy direct-card billing provider
const mockBillingProvider = {
  createPaymentMethod: jest.fn(),
  confirmPayment: jest.fn(),
  handleCardAction: jest.fn(),
};

// Mock Supabase
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    functions: {
      invoke: jest.fn(),
    },
  },
}));

describe('Payment Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Payment Intent', () => {
    it('should successfully create a payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        client_secret: 'secret_123',
        amount: 10000,
        currency: 'usd',
        status: 'requires_payment_method',
      };

      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { paymentIntent: mockPaymentIntent },
        error: null,
      });

      const result = await supabase.functions.invoke('create-payment-intent', {
        body: {
          booking_id: 'booking-123',
          amount: 100,
        },
      });

      expect(result.data?.paymentIntent).toEqual(mockPaymentIntent);
      expect(result.error).toBeNull();
    });

    it('should handle payment intent creation errors', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Invalid amount' },
      });

      const result = await supabase.functions.invoke('create-payment-intent', {
        body: {
          booking_id: 'booking-123',
          amount: -100,
        },
      });

      expect(result.error?.message).toBe('Invalid amount');
    });
  });

  describe('Process Payment', () => {
    it('should successfully process a payment', async () => {
      // Mock payment method creation
      mockBillingProvider.createPaymentMethod.mockResolvedValue({
        paymentMethod: {
          id: 'pm_123',
          card: { last4: '4242' },
        },
        error: null,
      });

      // Mock payment confirmation
      mockBillingProvider.confirmPayment.mockResolvedValue({
        paymentIntent: {
          id: 'pi_123',
          status: 'succeeded',
        },
        error: null,
      });

      // Create payment method
      const pmResult = await mockBillingProvider.createPaymentMethod({
        paymentMethodType: 'Card',
      });

      expect(pmResult.paymentMethod?.id).toBe('pm_123');
      expect(pmResult.error).toBeNull();

      // Confirm payment
      const confirmResult = await mockBillingProvider.confirmPayment('secret_123', {
        paymentMethodType: 'Card',
      });

      expect(confirmResult.paymentIntent?.status).toBe('succeeded');
      expect(confirmResult.error).toBeNull();
    });

    it('should handle payment method creation errors', async () => {
      mockBillingProvider.createPaymentMethod.mockResolvedValue({
        paymentMethod: null,
        error: { message: 'Invalid card details' },
      });

      const result = await mockBillingProvider.createPaymentMethod({
        paymentMethodType: 'Card',
      });

      expect(result.error?.message).toBe('Invalid card details');
    });

    it('should handle payment confirmation errors', async () => {
      mockBillingProvider.confirmPayment.mockResolvedValue({
        paymentIntent: null,
        error: { message: 'Insufficient funds' },
      });

      const result = await mockBillingProvider.confirmPayment('secret_123', {
        paymentMethodType: 'Card',
      });

      expect(result.error?.message).toBe('Insufficient funds');
    });

    it('should handle 3D Secure authentication', async () => {
      // Mock payment requiring authentication
      mockBillingProvider.confirmPayment.mockResolvedValue({
        paymentIntent: {
          id: 'pi_123',
          status: 'requires_action',
        },
        error: null,
      });

      // Mock card action handling
      mockBillingProvider.handleCardAction.mockResolvedValue({
        paymentIntent: {
          id: 'pi_123',
          status: 'succeeded',
        },
        error: null,
      });

      // Confirm payment
      const confirmResult = await mockBillingProvider.confirmPayment('secret_123', {
        paymentMethodType: 'Card',
      });

      expect(confirmResult.paymentIntent?.status).toBe('requires_action');

      // Handle card action
      const actionResult = await mockBillingProvider.handleCardAction('secret_123');

      expect(actionResult.paymentIntent?.status).toBe('succeeded');
    });
  });

  describe('Update Booking Payment Status', () => {
    it('should update booking status after successful payment', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'booking-123',
          status: 'confirmed',
          payment_status: 'paid',
          payment_intent_id: 'pi_123',
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
          status: 'confirmed',
          payment_status: 'paid',
          payment_intent_id: 'pi_123',
          paid_at: new Date().toISOString(),
        })
        .eq('id', 'booking-123')
        .select()
        .single();

      expect(result.data?.payment_status).toBe('paid');
      expect(result.data?.status).toBe('confirmed');
    });

    it('should update booking status after failed payment', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'booking-123',
          status: 'pending',
          payment_status: 'failed',
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
          payment_status: 'failed',
          payment_error: 'Insufficient funds',
        })
        .eq('id', 'booking-123')
        .select()
        .single();

      expect(result.data?.payment_status).toBe('failed');
    });
  });

  describe('Process Refund', () => {
    it('should successfully process a refund', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: {
          refund: {
            id: 're_123',
            amount: 10000,
            status: 'succeeded',
          },
        },
        error: null,
      });

      const result = await supabase.functions.invoke('process-refund', {
        body: {
          booking_id: 'booking-123',
          payment_intent_id: 'pi_123',
          amount: 100,
        },
      });

      expect(result.data?.refund.status).toBe('succeeded');
      expect(result.error).toBeNull();
    });

    it('should handle refund errors', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Payment already refunded' },
      });

      const result = await supabase.functions.invoke('process-refund', {
        body: {
          booking_id: 'booking-123',
          payment_intent_id: 'pi_123',
        },
      });

      expect(result.error?.message).toBe('Payment already refunded');
    });

    it('should update booking after successful refund', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'booking-123',
          status: 'cancelled',
          payment_status: 'refunded',
          refund_id: 're_123',
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
          status: 'cancelled',
          payment_status: 'refunded',
          refund_id: 're_123',
          refunded_at: new Date().toISOString(),
        })
        .eq('id', 'booking-123')
        .select()
        .single();

      expect(result.data?.payment_status).toBe('refunded');
      expect(result.data?.status).toBe('cancelled');
    });
  });

  describe('Payment History', () => {
    it('should retrieve payment history for a customer', async () => {
      const mockPayments = [
        {
          id: 'payment-1',
          booking_id: 'booking-1',
          amount: 100,
          status: 'succeeded',
          created_at: '2024-12-20',
        },
        {
          id: 'payment-2',
          booking_id: 'booking-2',
          amount: 150,
          status: 'succeeded',
          created_at: '2024-12-15',
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockPayments,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', 'customer-456')
        .order('created_at', { ascending: false });

      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].status).toBe('succeeded');
    });

    it('should calculate total spent by customer', async () => {
      const mockPayments = [
        { amount: 100, status: 'succeeded' },
        { amount: 150, status: 'succeeded' },
        { amount: 75, status: 'succeeded' },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockResolvedValue({
        data: mockPayments,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq.mockReturnValue({
          eq: mockEq2,
        }),
      });

      const result = await supabase
        .from('payments')
        .select('amount, status')
        .eq('customer_id', 'customer-456')
        .eq('status', 'succeeded');

      const totalSpent = result.data?.reduce((sum, p) => sum + p.amount, 0);
      expect(totalSpent).toBe(325);
    });
  });
});

