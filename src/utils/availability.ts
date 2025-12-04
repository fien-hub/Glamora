import { supabase } from '../services/supabase';

export interface AvailabilityInfo {
  isAvailableToday: boolean;
  isAvailableTomorrow: boolean;
  nextAvailableSlot: string | null;
  displayText: string;
  urgency: 'immediate' | 'today' | 'tomorrow' | 'later' | 'unavailable';
  availableDays?: string[];
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Get the available days for a provider
 */
export async function getProviderAvailableDays(providerId: string): Promise<string[]> {
  try {
    const { data: scheduleData } = await supabase
      .from('availability')
      .select('day_of_week')
      .eq('provider_id', providerId)
      .eq('is_available', true)
      .order('day_of_week');

    if (!scheduleData || scheduleData.length === 0) {
      return [];
    }

    // Get unique days and convert to day names
    const uniqueDays = [...new Set(scheduleData.map(s => s.day_of_week))];
    return uniqueDays.map(day => DAY_NAMES[day]);
  } catch (error) {
    console.error('Error getting available days:', error);
    return [];
  }
}

/**
 * Format available days into a readable string
 */
export function formatAvailableDays(days: string[]): string {
  if (days.length === 0) return '';
  if (days.length === 7) return 'Available every day';
  if (days.length === 1) return `Available ${DAY_NAMES_FULL[DAY_NAMES.indexOf(days[0])]}s`;

  // Check for weekdays only (Mon-Fri)
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  if (days.length === 5 && weekdays.every(d => days.includes(d))) {
    return 'Mon - Fri';
  }

  // Check for consecutive days
  const dayIndices = days.map(d => DAY_NAMES.indexOf(d)).sort((a, b) => a - b);
  const isConsecutive = dayIndices.every((val, i, arr) =>
    i === 0 || val === arr[i - 1] + 1
  );

  if (isConsecutive && days.length >= 3) {
    return `${days[0]} - ${days[days.length - 1]}`;
  }

  return days.join(', ');
}

/**
 * Calculate provider availability based on their schedule and existing bookings
 * @param providerId - The provider's profile ID
 * @returns Availability information with display text
 */
export async function getProviderAvailability(providerId: string): Promise<AvailabilityInfo> {
  try {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const tomorrowDay = (currentDay + 1) % 7;

    // Get ALL available days for the provider (for display)
    const { data: allScheduleData } = await supabase
      .from('availability')
      .select('day_of_week')
      .eq('provider_id', providerId)
      .eq('is_available', true)
      .order('day_of_week');

    const uniqueDays = allScheduleData
      ? [...new Set(allScheduleData.map(s => s.day_of_week))]
      : [];
    const availableDays = uniqueDays.map(day => DAY_NAMES[day]);

    // Check if provider is on time off today or tomorrow
    const { data: timeOffData } = await supabase
      .from('provider_time_off')
      .select('start_date, end_date')
      .eq('provider_id', providerId)
      .or(`and(start_date.lte.${today},end_date.gte.${today}),and(start_date.lte.${tomorrow},end_date.gte.${tomorrow})`);

    const isOnTimeOffToday = timeOffData?.some(
      (t) => t.start_date <= today && t.end_date >= today
    );
    const isOnTimeOffTomorrow = timeOffData?.some(
      (t) => t.start_date <= tomorrow && t.end_date >= tomorrow
    );

    // Get provider's availability schedule for today/tomorrow
    const { data: scheduleData } = await supabase
      .from('availability')
      .select('day_of_week, start_time, end_time, is_available')
      .eq('provider_id', providerId)
      .eq('is_available', true)
      .in('day_of_week', [currentDay, tomorrowDay])
      .order('day_of_week')
      .order('start_time');

    if (!scheduleData || scheduleData.length === 0) {
      // Show available days instead of "Contact for availability"
      const daysText = availableDays.length > 0
        ? formatAvailableDays(availableDays)
        : '';
      return {
        isAvailableToday: false,
        isAvailableTomorrow: false,
        nextAvailableSlot: null,
        displayText: daysText,
        urgency: 'unavailable',
        availableDays,
      };
    }

    // Get today's bookings to check for available slots
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('appointment_date, appointment_time, service_duration_minutes')
      .eq('provider_id', providerId)
      .in('appointment_date', [today, tomorrow])
      .in('status', ['pending', 'confirmed']);

    const bookedSlots = new Set(
      bookingsData?.map((b) => `${b.appointment_date}_${b.appointment_time}`) || []
    );

    // Check today's availability
    const todaySchedule = scheduleData.filter((s) => s.day_of_week === currentDay);
    let isAvailableToday = false;
    let nextAvailableSlot: string | null = null;

    if (!isOnTimeOffToday && todaySchedule.length > 0) {
      for (const slot of todaySchedule) {
        // Check if current time is before the end of this slot
        if (currentTime < slot.end_time) {
          // Check if there's at least 1 hour available in this slot
          const slotStart = currentTime > slot.start_time ? currentTime : slot.start_time;
          const slotKey = `${today}_${slotStart}`;
          
          if (!bookedSlots.has(slotKey)) {
            isAvailableToday = true;
            nextAvailableSlot = formatTimeSlot(slotStart);
            break;
          }
        }
      }
    }

    // Check tomorrow's availability
    const tomorrowSchedule = scheduleData.filter((s) => s.day_of_week === tomorrowDay);
    const isAvailableTomorrow = !isOnTimeOffTomorrow && tomorrowSchedule.length > 0;

    // Determine urgency and display text
    if (isAvailableToday && nextAvailableSlot) {
      const hour = parseInt(nextAvailableSlot.split(':')[0]);
      const currentHour = now.getHours();

      if (hour - currentHour <= 2) {
        return {
          isAvailableToday: true,
          isAvailableTomorrow,
          nextAvailableSlot,
          displayText: 'Available Now',
          urgency: 'immediate',
          availableDays,
        };
      } else {
        return {
          isAvailableToday: true,
          isAvailableTomorrow,
          nextAvailableSlot,
          displayText: `Available Today at ${nextAvailableSlot}`,
          urgency: 'today',
          availableDays,
        };
      }
    } else if (isAvailableTomorrow && tomorrowSchedule.length > 0) {
      const firstSlot = tomorrowSchedule[0].start_time;
      return {
        isAvailableToday: false,
        isAvailableTomorrow: true,
        nextAvailableSlot: firstSlot,
        displayText: `Available Tomorrow at ${formatTimeSlot(firstSlot)}`,
        urgency: 'tomorrow',
        availableDays,
      };
    } else {
      // Show available days instead of "Contact for availability"
      const daysText = formatAvailableDays(availableDays);
      return {
        isAvailableToday: false,
        isAvailableTomorrow: false,
        nextAvailableSlot: null,
        displayText: daysText,
        urgency: 'later',
        availableDays,
      };
    }
  } catch (error) {
    console.error('Error calculating availability:', error);
    return {
      isAvailableToday: false,
      isAvailableTomorrow: false,
      nextAvailableSlot: null,
      displayText: '',
      urgency: 'unavailable',
      availableDays: [],
    };
  }
}

/**
 * Format time from HH:MM:SS to 12-hour format
 */
function formatTimeSlot(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}

