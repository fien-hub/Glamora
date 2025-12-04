-- Migration: Add payment management fields
-- Description: Adds platform_fee, refund tracking, and payment method fields to payments table

-- Add new columns to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_reason TEXT,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS last_four TEXT,
ADD COLUMN IF NOT EXISTS card_brand TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_refunded ON public.payments(refunded_at) WHERE refunded_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);

-- Add comment for documentation
COMMENT ON COLUMN public.payments.platform_fee IS 'Platform fee charged (10% of amount)';
COMMENT ON COLUMN public.payments.refund_amount IS 'Amount refunded to customer';
COMMENT ON COLUMN public.payments.refund_reason IS 'Reason for refund';
COMMENT ON COLUMN public.payments.refunded_at IS 'Timestamp when refund was processed';
COMMENT ON COLUMN public.payments.payment_method IS 'Payment method type (card, etc)';
COMMENT ON COLUMN public.payments.last_four IS 'Last 4 digits of card';
COMMENT ON COLUMN public.payments.card_brand IS 'Card brand (visa, mastercard, etc)';

