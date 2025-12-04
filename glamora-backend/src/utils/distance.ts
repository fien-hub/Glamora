/**
 * Distance and Travel Fee Calculation Utilities
 * 
 * This module provides utilities for calculating distances between locations
 * and determining travel fees based on provider settings.
 */

export interface Location {
  latitude: number;
  longitude: number;
}

export interface TravelFeeConfig {
  travel_fee_type: 'flat' | 'per_km' | 'none';
  travel_fee_flat_rate: number; // in cents
  travel_fee_per_km: number; // in cents per km
  max_travel_distance_km: number;
  free_travel_radius_km: number;
}

export interface TravelFeeResult {
  distance_km: number;
  travel_fee_cents: number;
  within_range: boolean;
  breakdown: {
    service_price_cents: number;
    travel_fee_cents: number;
    total_cents: number;
    service_price_display: string;
    travel_fee_display: string;
    total_display: string;
  };
}

/**
 * Calculate distance between two points using Haversine formula
 * @param point1 First location (provider)
 * @param point2 Second location (customer)
 * @returns Distance in kilometers
 */
export function calculateDistance(point1: Location, point2: Location): number {
  const EARTH_RADIUS_KM = 6371;

  const lat1Rad = toRadians(point1.latitude);
  const lat2Rad = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLon = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate travel fee based on provider settings and distance
 * @param config Provider's travel fee configuration
 * @param distance_km Distance in kilometers
 * @returns Travel fee in cents
 */
export function calculateTravelFee(
  config: TravelFeeConfig,
  distance_km: number
): number {
  // Check if within free travel radius
  if (distance_km <= config.free_travel_radius_km) {
    return 0;
  }

  // Calculate based on fee type
  switch (config.travel_fee_type) {
    case 'none':
      return 0;

    case 'flat':
      return config.travel_fee_flat_rate;

    case 'per_km':
      // Only charge for distance beyond free radius
      const chargeableDistance = Math.max(
        0,
        distance_km - config.free_travel_radius_km
      );
      return Math.round(chargeableDistance * config.travel_fee_per_km);

    default:
      return 0;
  }
}

/**
 * Calculate complete travel fee result including breakdown
 * @param providerLocation Provider's location
 * @param customerLocation Customer's location
 * @param config Provider's travel fee configuration
 * @param servicePriceCents Service price in cents
 * @returns Complete travel fee result with breakdown
 */
export function calculateTravelFeeResult(
  providerLocation: Location,
  customerLocation: Location,
  config: TravelFeeConfig,
  servicePriceCents: number
): TravelFeeResult {
  const distance_km = calculateDistance(providerLocation, customerLocation);
  const within_range = distance_km <= config.max_travel_distance_km;
  const travel_fee_cents = within_range
    ? calculateTravelFee(config, distance_km)
    : 0;
  const total_cents = servicePriceCents + travel_fee_cents;

  return {
    distance_km: Math.round(distance_km * 100) / 100, // Round to 2 decimal places
    travel_fee_cents,
    within_range,
    breakdown: {
      service_price_cents: servicePriceCents,
      travel_fee_cents,
      total_cents,
      service_price_display: formatCurrency(servicePriceCents),
      travel_fee_display: formatCurrency(travel_fee_cents),
      total_display: formatCurrency(total_cents),
    },
  };
}

/**
 * Format cents to currency string
 * @param cents Amount in cents
 * @returns Formatted currency string (e.g., "$50.00")
 */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Check if customer is within provider's service area
 * @param providerLocation Provider's location
 * @param customerLocation Customer's location
 * @param maxDistanceKm Maximum travel distance
 * @returns True if within service area
 */
export function isWithinServiceArea(
  providerLocation: Location,
  customerLocation: Location,
  maxDistanceKm: number
): boolean {
  const distance = calculateDistance(providerLocation, customerLocation);
  return distance <= maxDistanceKm;
}

