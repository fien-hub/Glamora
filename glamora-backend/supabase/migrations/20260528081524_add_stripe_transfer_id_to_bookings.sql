-- Track the Stripe Transfer ID on completed bookings so we never double-pay a provider
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;

-- Index for idempotency checks
CREATE UNIQUE INDEX IF NOT EXISTS bookings_stripe_transfer_id_key
  ON bookings (stripe_transfer_id)
  WHERE stripe_transfer_id IS NOT NULL;
