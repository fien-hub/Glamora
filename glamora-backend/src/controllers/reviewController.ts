import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

export const createReview = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { bookingId, rating, comment } = req.body;

    // Get customer profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({ error: 'Profile not found' });
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('customer_id', profileData.id)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'Can only review completed bookings' });
    }

    // Create review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        booking_id: bookingId,
        customer_id: profileData.id,
        provider_id: booking.provider_id,
        rating,
        comment,
      })
      .select()
      .single();

    if (reviewError) {
      return res.status(400).json({ error: reviewError.message });
    }

    // Update provider rating
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('provider_id', booking.provider_id);

    if (reviews && reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      
      await supabase
        .from('provider_profiles')
        .update({
          rating: avgRating.toFixed(2),
          total_reviews: reviews.length,
        })
        .eq('id', booking.provider_id);
    }

    res.status(201).json({ review });
  } catch (error: any) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProviderReviews = async (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        customer:customer_profiles(*, profile:profiles(*)),
        booking:bookings(provider_service:provider_services(service:services(*)))
      `)
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ reviews: data });
  } catch (error: any) {
    console.error('Get provider reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

