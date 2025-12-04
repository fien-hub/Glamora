# Distance-Based Pricing System (Travel Fee System)

## Overview

This document describes the comprehensive distance-based pricing system that allows beauty service providers to define their own travel policies within the Glamora platform.

## Goals

1. **Provider Flexibility**: Each provider can set their own travel policy
2. **Customer Transparency**: Clear pricing breakdown before booking
3. **Fair Compensation**: Providers are compensated for travel time and costs
4. **Automated Matching**: System automatically filters providers based on distance
5. **Reduced Disputes**: Clear expectations reduce cancellations and conflicts

## System Architecture

### Database Schema

#### Provider Profiles Table Extensions
```sql
ALTER TABLE provider_profiles ADD COLUMN:
- travel_fee_type: 'flat' | 'per_km' | 'none'
- travel_fee_flat_rate: INTEGER (cents)
- travel_fee_per_km: INTEGER (cents per km)
- max_travel_distance_km: INTEGER
- free_travel_radius_km: INTEGER
```

#### Bookings Table Extensions
```sql
ALTER TABLE bookings ADD COLUMN:
- service_price: INTEGER (cents)
- travel_fee: INTEGER (cents)
- distance_km: DECIMAL(10, 2)
- provider_latitude: DECIMAL(10, 8)
- provider_longitude: DECIMAL(11, 8)
```

#### Payments Table Extensions
```sql
ALTER TABLE payments ADD COLUMN:
- service_amount: INTEGER (cents)
- travel_fee_amount: INTEGER (cents)
```

### Travel Fee Types

#### 1. None
- No travel fee charged
- Provider covers all travel costs
- Good for building initial customer base

#### 2. Flat Rate
- Fixed fee regardless of distance
- Simple and predictable for customers
- Example: $10 flat fee for any booking

#### 3. Per Kilometer
- Fee calculated based on actual distance
- Fair for both short and long distances
- Example: $1.00 per km beyond free radius

### Free Travel Radius

Providers can set a radius within which travel is free:
- Example: First 5 km free, then $1/km after
- Encourages local bookings
- Rewards nearby customers

### Maximum Travel Distance

Providers set the furthest they're willing to travel:
- Prevents unreasonable booking requests
- System automatically filters out-of-range customers
- Example: Maximum 20 km from provider location

## Pricing Calculation

### Formula

```
Total Price = Service Price + Travel Fee

Where Travel Fee is calculated as:
- If distance <= free_radius_km: Travel Fee = 0
- If travel_fee_type = 'none': Travel Fee = 0
- If travel_fee_type = 'flat': Travel Fee = flat_rate
- If travel_fee_type = 'per_km': 
    Travel Fee = (distance - free_radius_km) × per_km_rate
```

### Distance Calculation

Uses Haversine formula for accurate distance:
```typescript
distance = 2 × R × arcsin(√(sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)))
```
Where R = Earth's radius (6371 km)

## Platform Commission

**Important**: Platform commission only applies to service price, NOT travel fees.

```
Provider Earnings = Service Price × (1 - commission_rate) + Travel Fee
Platform Fee = Service Price × commission_rate
```

Example:
- Service Price: $50.00
- Travel Fee: $10.00
- Platform Commission: 20%
- Provider Receives: ($50 × 0.80) + $10 = $50.00
- Platform Receives: $50 × 0.20 = $10.00

## User Flows

### Provider Setup Flow

1. Provider goes to Settings → Travel Settings
2. Sets maximum travel distance (e.g., 15 km)
3. Sets free travel radius (e.g., 5 km)
4. Chooses travel fee type:
   - None: No travel fee
   - Flat: Enter flat rate (e.g., $10.00)
   - Per km: Enter rate per km (e.g., $1.50/km)
5. Saves settings

### Customer Booking Flow

1. Customer enters their location
2. System calculates distance to each provider
3. Filters out providers beyond max_travel_distance
4. For each provider, calculates:
   - Distance
   - Travel fee
   - Total price
5. Displays providers with price breakdown:
   ```
   Service: Haircut - $50.00
   Travel Fee: $7.50 (5 km)
   Total: $57.50
   ```
6. Customer sees transparent pricing before booking
7. On booking confirmation, shows full breakdown

### Booking Creation

1. System captures:
   - Service price
   - Travel fee
   - Distance
   - Provider location (at time of booking)
   - Customer location
2. Stores all data in bookings table
3. Creates payment record with breakdown

## API Endpoints

### POST /api/pricing/calculate
Calculate price including travel fee

**Request:**
```json
{
  "provider_id": "uuid",
  "service_id": "uuid",
  "customer_latitude": 40.7128,
  "customer_longitude": -74.0060
}
```

**Response:**
```json
{
  "success": true,
  "distance_km": 7.5,
  "within_range": true,
  "pricing": {
    "service_price_cents": 5000,
    "travel_fee_cents": 750,
    "total_cents": 5750,
    "service_price_display": "$50.00",
    "travel_fee_display": "$7.50",
    "total_display": "$57.50"
  },
  "travel_policy": {
    "type": "per_km",
    "max_distance_km": 15,
    "free_radius_km": 5,
    "per_km_rate": 100
  }
}
```

## Benefits

### For Providers
✅ Fair compensation for travel time and costs
✅ Control over service area
✅ Flexible pricing models
✅ Reduced unprofitable bookings
✅ Travel fees paid directly (no commission)

### For Customers
✅ Transparent pricing upfront
✅ No surprise fees
✅ Clear distance information
✅ Fair pricing based on location
✅ Can compare providers easily

### For Platform
✅ Reduced disputes and cancellations
✅ Automated provider matching
✅ Scalable system
✅ Increased trust and satisfaction
✅ Better provider retention

## Implementation Checklist

- [x] Database migration created
- [x] Distance calculation utilities
- [x] Price calculation API
- [x] Provider travel settings screen
- [x] Price breakdown component
- [ ] Run database migration
- [ ] Integrate pricing API in backend
- [ ] Add travel settings to provider profile
- [ ] Update booking flow to show price breakdown
- [ ] Update provider search to filter by distance
- [ ] Add travel fee to payment processing
- [ ] Update booking confirmation to show breakdown
- [ ] Add travel policy to provider profile display
- [ ] Test end-to-end flow

## Next Steps

1. **Run the migration**: Execute `add_travel_fee_system.sql`
2. **Integrate pricing API**: Add to backend routes
3. **Update provider onboarding**: Add travel settings step
4. **Update booking flow**: Show price breakdown
5. **Test thoroughly**: Various scenarios and edge cases
6. **Deploy**: Roll out to production

## Testing Scenarios

1. Provider with no travel fee
2. Provider with flat rate
3. Provider with per km rate
4. Customer within free radius
5. Customer beyond max distance
6. Edge cases (0 km, exact max distance, etc.)

