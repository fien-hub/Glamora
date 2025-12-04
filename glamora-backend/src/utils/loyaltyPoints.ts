import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

/**
 * Award loyalty points to a customer when a booking is completed
 * Rule: 1 point per $1 spent
 */
export const awardLoyaltyPoints = async (bookingId: string): Promise<void> => {
  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('customer_id, total_price')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found for loyalty points:', bookingError);
      return;
    }

    // Calculate points: 1 point per $1 (total_price is in dollars)
    const pointsToAward = Math.floor(booking.total_price);

    if (pointsToAward <= 0) {
      console.log('No points to award for booking:', bookingId);
      return;
    }

    // Check if loyalty points record exists for customer
    const { data: existingPoints } = await supabase
      .from('loyalty_points')
      .select('id, points, lifetime_points')
      .eq('customer_id', booking.customer_id)
      .single();

    if (existingPoints) {
      // Update existing loyalty points
      await supabase
        .from('loyalty_points')
        .update({
          points: existingPoints.points + pointsToAward,
          lifetime_points: existingPoints.lifetime_points + pointsToAward,
          updated_at: new Date().toISOString(),
        })
        .eq('customer_id', booking.customer_id);
    } else {
      // Create new loyalty points record
      await supabase
        .from('loyalty_points')
        .insert({
          customer_id: booking.customer_id,
          points: pointsToAward,
          lifetime_points: pointsToAward,
        });
    }

    // Create transaction record
    await supabase
      .from('loyalty_transactions')
      .insert({
        customer_id: booking.customer_id,
        points: pointsToAward,
        transaction_type: 'earned',
        description: `Earned ${pointsToAward} points from booking`,
        booking_id: bookingId,
      });

    console.log(`Awarded ${pointsToAward} loyalty points for booking ${bookingId}`);
  } catch (error) {
    console.error('Error awarding loyalty points:', error);
    // Don't throw error - loyalty points failure shouldn't break booking flow
  }
};

/**
 * Redeem loyalty points for a discount
 * Rule: 100 points = $10 discount
 */
export const redeemLoyaltyPoints = async (
  customerId: string,
  pointsToRedeem: number
): Promise<{ success: boolean; discountAmount: number; error?: string }> => {
  try {
    // Get customer's current points
    const { data: loyaltyData, error: loyaltyError } = await supabase
      .from('loyalty_points')
      .select('points')
      .eq('customer_id', customerId)
      .single();

    if (loyaltyError || !loyaltyData) {
      return { success: false, discountAmount: 0, error: 'Loyalty points not found' };
    }

    if (loyaltyData.points < pointsToRedeem) {
      return { success: false, discountAmount: 0, error: 'Insufficient points' };
    }

    // Calculate discount: 100 points = $10
    const discountAmount = (pointsToRedeem / 100) * 10;

    // Deduct points
    await supabase
      .from('loyalty_points')
      .update({
        points: loyaltyData.points - pointsToRedeem,
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', customerId);

    // Create transaction record
    await supabase
      .from('loyalty_transactions')
      .insert({
        customer_id: customerId,
        points: -pointsToRedeem,
        transaction_type: 'redeemed',
        description: `Redeemed ${pointsToRedeem} points for $${discountAmount.toFixed(2)} discount`,
      });

    return { success: true, discountAmount };
  } catch (error) {
    console.error('Error redeeming loyalty points:', error);
    return { success: false, discountAmount: 0, error: 'Failed to redeem points' };
  }
};

