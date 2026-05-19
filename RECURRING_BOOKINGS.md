# Recurring Bookings Feature

## Overview

The recurring bookings feature allows customers to schedule regular appointments with beauty service providers. Customers can set up bookings that repeat daily, weekly, bi-weekly, or monthly, with flexible end conditions.

## Features

### 1. **Recurring Frequency Options**
- **Daily** - Appointments every day
- **Weekly** - Appointments every week (same day of the week)
- **Bi-weekly** - Appointments every 2 weeks
- **Monthly** - Appointments every month (same day of the month)

### 2. **End Conditions**
- **After X occurrences** - Booking ends after a specific number of appointments
- **On specific date** - Booking ends on a chosen date
- **Never** - Booking continues indefinitely (up to 52 instances by default)

### 3. **Booking Management**
- View recurring booking badge on booking cards
- See instance number for each recurring appointment
- Cancel individual instances or entire recurring series
- Track all recurring bookings in the bookings screen

## Database Schema

### `recurring_bookings` Table
```sql
CREATE TABLE public.recurring_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customer_profiles(id),
    provider_id UUID REFERENCES public.provider_profiles(id),
    provider_service_id UUID REFERENCES public.provider_services(id),
    frequency recurring_frequency NOT NULL,
    interval INTEGER DEFAULT 1,
    start_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_type recurring_end_type NOT NULL DEFAULT 'never',
    end_date DATE,
    max_occurrences INTEGER,
    total_price DECIMAL(10, 2) NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `bookings` Table Updates
Added columns:
- `recurring_booking_id` - Links to parent recurring booking
- `instance_number` - The sequence number of this instance (1, 2, 3, etc.)
- `is_recurring_instance` - Boolean flag indicating if this is part of a recurring series

## Implementation Files

### Backend
- **`glamora-backend/supabase/migrations/add_recurring_bookings.sql`** - Database migration

### Frontend
- **`glamora-app/src/utils/recurringBooking.ts`** - Utility functions for recurring booking logic
- **`glamora-app/src/components/BookingModal.tsx`** - Updated to support recurring booking creation
- **`glamora-app/src/screens/customer/BookingsScreen.tsx`** - Updated to display recurring booking badges
- **`glamora-app/src/utils/analytics.ts`** - Added recurring booking analytics tracking

## Key Functions

### `generateBookingInstances(pattern, maxInstances)`
Generates all booking instances based on the recurring pattern.

**Parameters:**
- `pattern: RecurringPattern` - The recurring booking configuration
- `maxInstances: number` - Maximum number of instances to generate (default: 52)

**Returns:** Array of `RecurringBookingInstance` objects with date, time, and instance number

### `validateRecurringPattern(pattern)`
Validates a recurring booking pattern.

**Returns:** `{ isValid: boolean, error?: string }`

### `calculateRecurringTotalCost(pattern, pricePerBooking)`
Calculates the total cost for all instances in a recurring booking.

**Returns:** `{ totalInstances: number, totalCost: number }`

### `getRecurringDescription(pattern)`
Generates a human-readable description of the recurring pattern.

**Example:** "Every week, ending after 4 occurrences"

## Usage Example

### Creating a Recurring Booking

1. Customer opens the booking modal
2. Fills in booking details (date, time, address)
3. Toggles "Recurring Booking" switch to ON
4. Selects frequency (e.g., "Weekly")
5. Chooses end condition (e.g., "After 4 occurrences")
6. Reviews the preview showing schedule and total cost
7. Proceeds to payment
8. System creates:
   - One `recurring_bookings` record
   - Multiple `bookings` records (one for each instance)

### Viewing Recurring Bookings

In the Bookings screen, recurring appointments display:
- 🔄 Recurring badge
- Instance number (e.g., "#1", "#2")
- All standard booking information

## Analytics Tracking

### Events Tracked

1. **Recurring Booking Created**
   - Frequency (daily, weekly, bi-weekly, monthly)
   - Total instances
   - Total cost
   - Service type
   - Provider ID

2. **Recurring Booking Cancelled**
   - Recurring booking ID
   - Cancel type (single, all_future, all)
   - Remaining instances

3. **Recurring Booking Edited**
   - Recurring booking ID
   - Changed fields

4. **Recurring Booking Viewed**
   - Recurring booking ID
   - Total instances

## Security

### Row Level Security (RLS) Policies

**`recurring_bookings` table:**
- Customers can view their own recurring bookings
- Providers can view recurring bookings for their services
- Only customers can create recurring bookings
- Only customers can update/delete their own recurring bookings

**`bookings` table:**
- Existing RLS policies apply to recurring booking instances
- Customers can view/cancel their own booking instances
- Providers can view booking instances for their services

## Future Enhancements

### Potential Features
1. **Edit Recurring Series** - Allow customers to modify future instances
2. **Skip Instance** - Skip a single occurrence without canceling
3. **Pause/Resume** - Temporarily pause and resume recurring bookings
4. **Provider Availability Check** - Validate provider availability for all instances before creation
5. **Conflict Detection** - Check for scheduling conflicts with existing bookings
6. **Calendar Sync** - Add all recurring instances to device calendar
7. **Reminder Notifications** - Send reminders before each recurring appointment
8. **Bulk Rescheduling** - Reschedule all future instances at once

## Testing

### Test Cases

1. **Create recurring booking with "After X occurrences"**
   - Verify correct number of instances created
   - Verify dates are calculated correctly

2. **Create recurring booking with "On specific date"**
   - Verify instances stop at the specified date
   - Verify no instances created after end date

3. **Create recurring booking with "Never"**
   - Verify maximum instances (52) are created
   - Verify dates extend into the future

4. **View recurring bookings**
   - Verify recurring badge displays
   - Verify instance numbers are correct

5. **Cancel recurring booking instance**
   - Verify only selected instance is cancelled
   - Verify other instances remain active

6. **Analytics tracking**
   - Verify recurring booking creation is tracked
   - Verify correct parameters are sent

## Troubleshooting

### Common Issues

**Issue:** Recurring booking instances not created
- Check database migration was applied successfully
- Verify customer profile ID is correct
- Check RLS policies allow insertion

**Issue:** Incorrect dates generated
- Verify start date and time are in correct format
- Check timezone handling
- Validate recurring pattern before generation

**Issue:** Payment fails for recurring booking
- Ensure payment is only charged for first instance (or adjust logic as needed)
- Verify total cost calculation is correct
- Check Stripe integration handles recurring bookings

## Support

For questions or issues with recurring bookings:
1. Check the console logs for detailed error messages
2. Verify database schema matches the migration
3. Test with simple patterns first (e.g., weekly for 2 occurrences)
4. Review analytics events to track user behavior

