-- Migration: Add commission tracking columns to bookings
-- Stores the actual platform fee and provider payout at the time of booking,
-- so earnings calculations remain accurate even if the commission rate changes.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS platform_fee    DECIMAL(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS provider_payout DECIMAL(10, 2) DEFAULT NULL;

COMMENT ON COLUMN public.bookings.platform_fee    IS 'Platform commission collected (20% of base service price)';
COMMENT ON COLUMN public.bookings.provider_payout IS 'Amount owed to provider (base price + travel fee, no commission)';

-- Back-fill existing bookings with approximate values where total_price is known.
-- Formula: platform_fee ≈ total_price × (0.20 / 1.20)
-- This approximation assumes zero travel fee on historical bookings.
UPDATE public.bookings
SET
  platform_fee    = ROUND((total_price * 0.20 / 1.20)::numeric, 2),
  provider_payout = ROUND((total_price - (total_price * 0.20 / 1.20))::numeric, 2)
WHERE
  platform_fee IS NULL
  AND total_price IS NOT NULL
  AND total_price > 0
  AND status IN ('confirmed', 'completed', 'in_progress');
