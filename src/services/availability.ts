import { supabase } from './supabase';

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface AvailabilityCheck {
  isAvailable: boolean;
  reason?: string;
}

/**
 * Check if a provider is available on a specific date and time
 */
export const checkProviderAvailability = async (
  providerId: string,
  date: string,
  time: string,
  durationMinutes: number
): Promise<AvailabilityCheck> => {
  try {
    // Parse the date and time
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday

    // Parse time (HH:MM format)
    const [hours, minutes] = time.split(':').map(Number);
    const requestedStartTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    
    // Calculate end time
    const endDate = new Date(selectedDate);
    endDate.setHours(hours, minutes + durationMinutes, 0, 0);
    const endHours = endDate.getHours();
    const endMinutes = endDate.getMinutes();
    const requestedEndTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`;

    // 1. Check if provider has general availability for this day/time
    const { data: availability, error: availError } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', providerId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true);

    if (availError) {
      console.error('Error checking availability:', availError);
      return { isAvailable: false, reason: 'Error checking availability' };
    }

    if (!availability || availability.length === 0) {
      return { 
        isAvailable: false, 
        reason: 'Provider is not available on this day of the week' 
      };
    }

    // Check if requested time falls within any availability window
    const isWithinAvailableHours = availability.some((slot) => {
      return requestedStartTime >= slot.start_time && requestedEndTime <= slot.end_time;
    });

    if (!isWithinAvailableHours) {
      return { 
        isAvailable: false, 
        reason: 'Requested time is outside provider\'s available hours' 
      };
    }

    // 2. Check if provider has time off on this date
    const { data: timeOff, error: timeOffError } = await supabase
      .from('provider_time_off')
      .select('*')
      .eq('provider_id', providerId)
      .lte('start_date', date)
      .gte('end_date', date);

    if (timeOffError) {
      console.error('Error checking time off:', timeOffError);
      return { isAvailable: false, reason: 'Error checking time off' };
    }

    if (timeOff && timeOff.length > 0) {
      return { 
        isAvailable: false, 
        reason: 'Provider is not available on this date' 
      };
    }

    // 3. Check for existing bookings (prevent double-booking)
    const { data: existingBookings, error: bookingError } = await supabase
      .from('bookings')
      .select('scheduled_time, provider_services!inner(duration_minutes)')
      .eq('provider_id', providerId)
      .eq('scheduled_date', date)
      .in('status', ['pending', 'confirmed', 'in_progress']);

    if (bookingError) {
      console.error('Error checking bookings:', bookingError);
      return { isAvailable: false, reason: 'Error checking existing bookings' };
    }

    if (existingBookings && existingBookings.length > 0) {
      // Check for time conflicts
      for (const booking of existingBookings) {
        const bookingTime = booking.scheduled_time;
        const bookingDuration = (Array.isArray(booking.provider_services) ? booking.provider_services[0]?.duration_minutes : (booking.provider_services as any)?.duration_minutes) || 60;
        
        // Parse booking time
        const [bookingHours, bookingMinutes] = bookingTime.split(':').map(Number);
        const bookingStart = `${bookingHours.toString().padStart(2, '0')}:${bookingMinutes.toString().padStart(2, '0')}:00`;
        
        // Calculate booking end time
        const bookingEndDate = new Date(selectedDate);
        bookingEndDate.setHours(bookingHours, bookingMinutes + bookingDuration, 0, 0);
        const bookingEndHours = bookingEndDate.getHours();
        const bookingEndMinutes = bookingEndDate.getMinutes();
        const bookingEnd = `${bookingEndHours.toString().padStart(2, '0')}:${bookingEndMinutes.toString().padStart(2, '0')}:00`;

        // Check for overlap
        const hasOverlap = 
          (requestedStartTime >= bookingStart && requestedStartTime < bookingEnd) ||
          (requestedEndTime > bookingStart && requestedEndTime <= bookingEnd) ||
          (requestedStartTime <= bookingStart && requestedEndTime >= bookingEnd);

        if (hasOverlap) {
          return { 
            isAvailable: false, 
            reason: 'Provider already has a booking at this time' 
          };
        }
      }
    }

    // All checks passed!
    return { isAvailable: true };
  } catch (error) {
    console.error('Error in checkProviderAvailability:', error);
    return { isAvailable: false, reason: 'Unexpected error checking availability' };
  }
};

/**
 * Get available time slots for a provider on a specific date
 */
export const getAvailableTimeSlots = async (
  providerId: string,
  date: string,
  durationMinutes: number
): Promise<TimeSlot[]> => {
  try {
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay();

    // Get provider's availability for this day
    const { data: availability, error: availError } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', providerId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)
      .order('start_time');

    if (availError || !availability || availability.length === 0) {
      return [];
    }

    // Check if provider has time off
    const { data: timeOff } = await supabase
      .from('provider_time_off')
      .select('*')
      .eq('provider_id', providerId)
      .lte('start_date', date)
      .gte('end_date', date);

    if (timeOff && timeOff.length > 0) {
      return [];
    }

    // Get existing bookings
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('scheduled_time, provider_services!inner(duration_minutes)')
      .eq('provider_id', providerId)
      .eq('scheduled_date', date)
      .in('status', ['pending', 'confirmed', 'in_progress']);

    const bookedSlots = existingBookings?.map((booking) => {
      const [hours, minutes] = booking.scheduled_time.split(':').map(Number);
      const duration = (Array.isArray(booking.provider_services) ? booking.provider_services[0]?.duration_minutes : (booking.provider_services as any)?.duration_minutes) || 60;
      return {
        start: hours * 60 + minutes,
        end: hours * 60 + minutes + duration,
      };
    }) || [];

    // Generate time slots
    const slots: TimeSlot[] = [];
    
    for (const availWindow of availability) {
      const [startHours, startMinutes] = availWindow.start_time.split(':').map(Number);
      const [endHours, endMinutes] = availWindow.end_time.split(':').map(Number);
      
      const startMinutesOfDay = startHours * 60 + startMinutes;
      const endMinutesOfDay = endHours * 60 + endMinutes;

      // Generate 30-minute intervals
      for (let minutes = startMinutesOfDay; minutes + durationMinutes <= endMinutesOfDay; minutes += 30) {
        const slotEnd = minutes + durationMinutes;
        
        // Check if this slot conflicts with any booking
        const hasConflict = bookedSlots.some((booked) => {
          return (
            (minutes >= booked.start && minutes < booked.end) ||
            (slotEnd > booked.start && slotEnd <= booked.end) ||
            (minutes <= booked.start && slotEnd >= booked.end)
          );
        });

        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

        slots.push({
          time: timeString,
          available: !hasConflict,
        });
      }
    }

    return slots;
  } catch (error) {
    console.error('Error getting available time slots:', error);
    return [];
  }
};

/**
 * Format time slot for display (e.g., "14:30" -> "2:30 PM")
 */
export const formatTimeSlot = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

