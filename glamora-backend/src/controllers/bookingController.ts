import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { awardLoyaltyPoints } from '../utils/loyaltyPoints';
import { notifyNewBooking, notifyBookingStatusChange } from '../utils/pushNotifications';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

export const createBooking = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const {
      providerServiceId,
      scheduledDate,
      scheduledTime,
      address,
      city,
      state,
      zipCode,
      latitude,
      longitude,
      notes,
    } = req.body;

    // Get customer profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({ error: 'Customer profile not found' });
    }

    // Get provider service details
    const { data: providerService, error: serviceError } = await supabase
      .from('provider_services')
      .select('*, provider:provider_profiles(id)')
      .eq('id', providerServiceId)
      .single();

    if (serviceError || !providerService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: profileData.id,
        provider_id: providerService.provider_id,
        provider_service_id: providerServiceId,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        total_price: providerService.price,
        address,
        city,
        state,
        zip_code: zipCode,
        latitude,
        longitude,
        notes,
        status: 'pending',
      })
      .select()
      .single();

    if (bookingError) {
      return res.status(400).json({ error: bookingError.message });
    }

    // Send notification to provider about new booking
    try {
      const { data: customerData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', profileData.id)
        .single();

      const { data: serviceData } = await supabase
        .from('services')
        .select('name')
        .eq('id', providerService.service_id)
        .single();

      if (customerData && serviceData) {
        const customerName = `${customerData.first_name} ${customerData.last_name}`;
        await notifyNewBooking(
          providerService.provider_id,
          customerName,
          serviceData.name,
          booking.id
        );
      }
    } catch (notifError) {
      console.error('Error sending booking notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.status(201).json({ booking });
  } catch (error: any) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBookings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError) {
      return res.status(400).json({ error: userError.message });
    }

    // Get profile ID
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    const field = userData.role === 'customer' ? 'customer_id' : 'provider_id';
    
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customer_profiles(*, profile:profiles(*)),
        provider:provider_profiles(*, profile:profiles(*)),
        provider_service:provider_services(*, service:services(*))
      `)
      .eq(field, profileData.id)
      .order('scheduled_date', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ bookings: data });
  } catch (error: any) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBookingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customer_profiles(*, profile:profiles(*)),
        provider:provider_profiles(*, profile:profiles(*)),
        provider_service:provider_services(*, service:services(*)),
        payment:payments(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ booking: data });
  } catch (error: any) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Award loyalty points if booking is completed
    if (status === 'completed') {
      await awardLoyaltyPoints(id);
    }

    // Send notification to customer about status change
    try {
      const { data: bookingData } = await supabase
        .from('bookings')
        .select(`
          customer_id,
          provider_service:provider_services(
            service:services(name)
          )
        `)
        .eq('id', id)
        .single();

      if (bookingData) {
        const serviceName = (bookingData as any).provider_service?.service?.name || 'service';
        await notifyBookingStatusChange(
          bookingData.customer_id,
          status,
          serviceName,
          id
        );
      }
    } catch (notifError) {
      console.error('Error sending status change notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({ booking: data });
  } catch (error: any) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        cancellation_reason: reason 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ booking: data });
  } catch (error: any) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

