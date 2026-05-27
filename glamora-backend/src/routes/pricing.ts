/**
 * Pricing API Routes
 *
 * Handles price calculations based on base price + standard travel fees
 */

import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { calculateDistance, Location } from '../utils/distance';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

const router = express.Router();

// Platform commission rate (20%)
const PLATFORM_COMMISSION_RATE = 0.20;

// Conversion: 1 mile = 1.60934 km
const KM_TO_MILES = 0.621371;

// Import shared travel fee table (in dollars)
import { STANDARD_TRAVEL_FEES } from '../config/travelFees';

// Convert to cents for backend usage
const STANDARD_TRAVEL_FEES_CENTS = Object.fromEntries(
  Object.entries(STANDARD_TRAVEL_FEES).map(([tier, dollars]) => [tier, dollars * 100])
);

/**
 * Get travel fee and tier based on distance
 * @param distance_km Distance in kilometers (converted to miles internally)
 * @param accepts_over_15mi Whether provider accepts 15+ miles requests
 * @returns Travel fee in cents, tier name, and whether within range
 */
function getTravelFeeForDistance(
  distance_km: number,
  accepts_over_15mi: boolean
): { travel_fee_cents: number; tier: string; within_range: boolean; distance_miles: number } {
  const distance_miles = distance_km * KM_TO_MILES;

  if (distance_miles <= 3) {
    return { travel_fee_cents: STANDARD_TRAVEL_FEES_CENTS['0-3 mi'], tier: '0-3 mi', within_range: true, distance_miles };
  } else if (distance_miles <= 5) {
    return { travel_fee_cents: STANDARD_TRAVEL_FEES_CENTS['3-5 mi'], tier: '3-5 mi', within_range: true, distance_miles };
  } else if (distance_miles <= 8) {
    return { travel_fee_cents: STANDARD_TRAVEL_FEES_CENTS['5-8 mi'], tier: '5-8 mi', within_range: true, distance_miles };
  } else if (distance_miles <= 12) {
    return { travel_fee_cents: STANDARD_TRAVEL_FEES_CENTS['8-12 mi'], tier: '8-12 mi', within_range: true, distance_miles };
  } else if (distance_miles <= 15) {
    return { travel_fee_cents: STANDARD_TRAVEL_FEES_CENTS['12-15 mi'], tier: '12-15 mi', within_range: true, distance_miles };
  } else {
    // Over 15 miles - check if provider accepts special requests
    return {
      travel_fee_cents: STANDARD_TRAVEL_FEES_CENTS['15+ mi'],
      tier: '15+ mi',
      within_range: accepts_over_15mi,
      distance_miles,
    };
  }
}

/**
 * Calculate total customer price
 * @param base_price_cents Provider's base price in cents
 * @param travel_fee_cents Travel fee in cents
 * @returns Total price breakdown
 */
function calculateTotalPrice(base_price_cents: number, travel_fee_cents: number) {
  // Platform takes 20% commission on base price only
  const platform_fee_cents = Math.round(base_price_cents * PLATFORM_COMMISSION_RATE);

  // Total = base price + platform fee + travel fee
  const total_cents = base_price_cents + platform_fee_cents + travel_fee_cents;

  // Provider earns base price + travel fee (they do the traveling!)
  const provider_earnings_cents = base_price_cents + travel_fee_cents;

  return {
    base_price_cents,
    platform_fee_cents,
    travel_fee_cents,
    total_cents,
    provider_earnings_cents,
  };
}

/**
 * POST /api/pricing/calculate
 * Calculate total price based on customer distance
 *
 * Body:
 * - provider_id: UUID
 * - service_id: UUID (provider_service_id)
 * - customer_latitude: number
 * - customer_longitude: number
 */
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const {
      provider_id,
      service_id,
      customer_latitude,
      customer_longitude,
    } = req.body;

    // Validate input
    if (!provider_id || !service_id || !customer_latitude || !customer_longitude) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['provider_id', 'service_id', 'customer_latitude', 'customer_longitude'],
      });
    }

    // Get provider location
    const { data: provider, error: providerError } = await supabase
      .from('provider_profiles')
      .select('latitude, longitude')
      .eq('id', provider_id)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    if (!provider.latitude || !provider.longitude) {
      return res.status(400).json({
        error: 'Provider location not set',
        message: 'Provider must set their location before accepting bookings',
      });
    }

    // Get service with base price
    const { data: service, error: serviceError } = await supabase
      .from('provider_services')
      .select(`
        duration_minutes,
        base_price,
        accepts_over_25km,
        travel_fee_over_25km,
        services(name)
      `)
      .eq('id', service_id)
      .eq('provider_id', provider_id)
      .single();

    if (serviceError || !service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const serviceData = service as any;

    // Calculate distance
    const providerLocation: Location = {
      latitude: parseFloat(provider.latitude),
      longitude: parseFloat(provider.longitude),
    };

    const customerLocation: Location = {
      latitude: parseFloat(customer_latitude),
      longitude: parseFloat(customer_longitude),
    };

    const distance_km = calculateDistance(providerLocation, customerLocation);

    // Get travel fee for distance tier (accepts_over_15mi is stored as accepts_over_25km in DB)
    const travelResult = getTravelFeeForDistance(
      distance_km,
      serviceData.accepts_over_25km || false
    );

    // Use provider's custom 25+ km fee if set, otherwise keep the standard fee
    if (travelResult.tier === '15+ mi' && serviceData.travel_fee_over_25km != null) {
      travelResult.travel_fee_cents = serviceData.travel_fee_over_25km;
    }

    // Calculate total price
    const priceBreakdown = calculateTotalPrice(
      serviceData.base_price || 0,
      travelResult.travel_fee_cents
    );

    // Return result with distance in miles
    return res.json({
      success: true,
      provider_id,
      service_id,
      service_name: serviceData.services?.name || 'Service',
      duration_minutes: serviceData.duration_minutes,
      distance_miles: Math.round(travelResult.distance_miles * 10) / 10,
      within_range: travelResult.within_range,
      distance_tier: travelResult.tier,
      pricing: {
        base_price_cents: priceBreakdown.base_price_cents,
        platform_fee_cents: priceBreakdown.platform_fee_cents,
        travel_fee_cents: priceBreakdown.travel_fee_cents,
        total_cents: priceBreakdown.total_cents,
        provider_earnings_cents: priceBreakdown.provider_earnings_cents,
      },
      requires_special_request: travelResult.distance_miles > 15 && travelResult.within_range,
      accepts_over_15mi: serviceData.accepts_over_25km,
    });
  } catch (error) {
    console.error('Error calculating price:', error);
    return res.status(500).json({
      error: 'Failed to calculate price',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/pricing/providers-in-range
 * Find providers within range of customer location
 *
 * Query params:
 * - latitude: number
 * - longitude: number
 * - max_distance: number (optional, default: 50 km)
 */
router.get('/providers-in-range', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, max_distance = '50' } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['latitude', 'longitude'],
      });
    }

    const customerLat = parseFloat(latitude as string);
    const customerLon = parseFloat(longitude as string);
    const maxDist = parseFloat(max_distance as string);

    // Get all providers with location set
    const { data: providers, error } = await supabase
      .from('provider_profiles')
      .select('id, business_name, latitude, longitude, max_travel_distance_km')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error) {
      throw error;
    }

    // Filter providers within range
    const providersInRange = providers?.filter((provider: any) => {
      const distance = calculateDistance(
        { latitude: parseFloat(provider.latitude), longitude: parseFloat(provider.longitude) },
        { latitude: customerLat, longitude: customerLon }
      );
      return distance <= Math.min(provider.max_travel_distance_km || 10, maxDist);
    }) || [];

    return res.json({ success: true, providers: providersInRange, count: providersInRange.length });
  } catch (error) {
    console.error('Error finding providers:', error);
    return res.status(500).json({
      error: 'Failed to find providers',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

