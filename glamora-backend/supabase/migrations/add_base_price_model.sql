-- Migration: Add base price model for standardized travel fees
-- This changes from provider-set distance pricing to:
-- - Provider sets a base price
-- - Platform enforces standard travel fees per distance tier (in miles)

-- Add base_price column to provider_services
ALTER TABLE provider_services
ADD COLUMN IF NOT EXISTS base_price INTEGER DEFAULT 0;

-- Migrate existing data: use price_0_10km as the base price
-- (since that was the closest/lowest price tier)
UPDATE provider_services
SET base_price = COALESCE(price_0_10km, 0)
WHERE base_price = 0 OR base_price IS NULL;

-- Add comment explaining the pricing model
COMMENT ON COLUMN provider_services.base_price IS
'Provider base price in cents. Customer price = base_price * 1.20 (platform fee) + travel_fee';

-- Create a view for standard travel fees (for reference) - cost-based in miles
-- Fees are calculated to cover round-trip travel costs for providers
CREATE OR REPLACE VIEW standard_travel_fees AS
SELECT
  '0-3 mi' as distance_tier,
  500 as fee_cents,
  '$5 for very close (6 mi round trip)' as description
UNION ALL
SELECT
  '3-5 mi' as distance_tier,
  800 as fee_cents,
  '$8 for nearby (10 mi round trip)' as description
UNION ALL
SELECT
  '5-8 mi' as distance_tier,
  1200 as fee_cents,
  '$12 for medium distance (16 mi round trip)' as description
UNION ALL
SELECT
  '8-12 mi' as distance_tier,
  1800 as fee_cents,
  '$18 for farther (24 mi round trip)' as description
UNION ALL
SELECT
  '12-15 mi' as distance_tier,
  2200 as fee_cents,
  '$22 for far (30 mi round trip)' as description
UNION ALL
SELECT
  '15+ mi' as distance_tier,
  3000 as fee_cents,
  '$30 for special requests (40+ mi round trip)' as description;

-- Grant access to the view
GRANT SELECT ON standard_travel_fees TO authenticated;
GRANT SELECT ON standard_travel_fees TO anon;

