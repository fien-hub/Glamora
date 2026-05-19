// expo-calendar calls native calendar module at module-evaluation time
// and can throw in New Architecture builds.
let Calendar: typeof import('expo-calendar') = {} as any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Calendar = require('expo-calendar');
} catch (e) { console.warn('[calendar.ts] expo-calendar unavailable:', e); }
import { Platform, Alert } from 'react-native';

export interface CalendarEventDetails {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  alarms?: number[]; // Minutes before event
}

/**
 * Request calendar permissions
 */
export const requestCalendarPermissions = async (): Promise<boolean> => {
  try {
    console.log('[Calendar] Requesting calendar permissions...');
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    console.log('[Calendar] Permission status:', status);

    if (status === 'granted') {
      console.log('[Calendar] ✅ Calendar permission granted');
      return true;
    } else {
      console.log('[Calendar] ❌ Calendar permission denied or not granted');
      return false;
    }
  } catch (error) {
    console.error('[Calendar] Error requesting calendar permissions:', error);
    return false;
  }
};

/**
 * Get the default calendar for the device
 */
export const getDefaultCalendar = async (): Promise<string | null> => {
  try {
    console.log('[Calendar] Fetching available calendars...');
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

    console.log('[Calendar] Found', calendars.length, 'calendars');

    if (calendars.length === 0) {
      console.log('[Calendar] ❌ No calendars found on device');
      return null;
    }

    // Try to find the primary calendar
    let defaultCalendar = calendars.find(cal => cal.isPrimary);

    // If no primary calendar, use the first one that allows modifications
    if (!defaultCalendar) {
      defaultCalendar = calendars.find(cal => cal.allowsModifications);
    }

    // If still no calendar, just use the first one
    if (!defaultCalendar) {
      defaultCalendar = calendars[0];
    }

    console.log('[Calendar] Using calendar:', {
      id: defaultCalendar.id,
      title: defaultCalendar.title,
      isPrimary: defaultCalendar.isPrimary,
      allowsModifications: defaultCalendar.allowsModifications,
    });

    return defaultCalendar.id;
  } catch (error) {
    console.error('[Calendar] Error getting default calendar:', error);
    return null;
  }
};

/**
 * Create a calendar event
 */
export const createCalendarEvent = async (
  eventDetails: CalendarEventDetails
): Promise<{ success: boolean; eventId?: string; error?: string }> => {
  try {
    // Request permissions
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) {
      return {
        success: false,
        error: 'Calendar permission not granted',
      };
    }

    // Get default calendar
    const calendarId = await getDefaultCalendar();
    if (!calendarId) {
      return {
        success: false,
        error: 'No calendar found',
      };
    }

    // Create the event
    const eventId = await Calendar.createEventAsync(calendarId, {
      title: eventDetails.title,
      startDate: eventDetails.startDate,
      endDate: eventDetails.endDate,
      location: eventDetails.location,
      notes: eventDetails.notes,
      // Don't specify timeZone - let it use the device's default timezone
      alarms: eventDetails.alarms?.map(minutes => ({
        relativeOffset: -minutes,
        method: Calendar.AlarmMethod.ALERT,
      })) || [
        { relativeOffset: -60, method: Calendar.AlarmMethod.ALERT }, // 1 hour before
        { relativeOffset: -1440, method: Calendar.AlarmMethod.ALERT }, // 1 day before
      ],
    });

    return {
      success: true,
      eventId,
    };
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    return {
      success: false,
      error: error.message || 'Failed to create calendar event',
    };
  }
};

/**
 * Update a calendar event
 */
export const updateCalendarEvent = async (
  eventId: string,
  eventDetails: Partial<CalendarEventDetails>
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Request permissions
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) {
      return {
        success: false,
        error: 'Calendar permission not granted',
      };
    }

    // Update the event
    await Calendar.updateEventAsync(eventId, {
      title: eventDetails.title,
      startDate: eventDetails.startDate,
      endDate: eventDetails.endDate,
      location: eventDetails.location,
      notes: eventDetails.notes,
    });

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error updating calendar event:', error);
    return {
      success: false,
      error: error.message || 'Failed to update calendar event',
    };
  }
};

/**
 * Delete a calendar event
 */
export const deleteCalendarEvent = async (
  eventId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Request permissions
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) {
      return {
        success: false,
        error: 'Calendar permission not granted',
      };
    }

    // Delete the event
    await Calendar.deleteEventAsync(eventId);

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error deleting calendar event:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete calendar event',
    };
  }
};

/**
 * Create a booking calendar event with proper formatting
 */
export const createBookingCalendarEvent = async (booking: {
  serviceName: string;
  providerName: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number; // in minutes
  address: string;
  city: string;
  state: string;
  notes?: string;
}): Promise<{ success: boolean; eventId?: string; error?: string }> => {
  try {
    console.log('[Calendar] Creating booking calendar event...');
    console.log('[Calendar] Booking details:', {
      service: booking.serviceName,
      provider: booking.providerName,
      date: booking.scheduledDate,
      time: booking.scheduledTime,
    });

    // Parse date and time
    const [year, month, day] = booking.scheduledDate.split('-').map(Number);
    const [hours, minutes] = booking.scheduledTime.split(':').map(Number);

    console.log('[Calendar] Parsed date/time:', { year, month, day, hours, minutes });

    const startDate = new Date(year, month - 1, day, hours, minutes);
    const endDate = new Date(startDate.getTime() + booking.duration * 60000);

    console.log('[Calendar] Event times:', {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });

    // Format location
    const location = `${booking.address}, ${booking.city}, ${booking.state}`;

    // Format notes
    const notes = [
      `Service: ${booking.serviceName}`,
      `Provider: ${booking.providerName}`,
      booking.notes ? `Notes: ${booking.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    // Create event
    const result = await createCalendarEvent({
      title: `${booking.serviceName} with ${booking.providerName}`,
      startDate,
      endDate,
      location,
      notes,
      alarms: [60, 1440], // 1 hour and 1 day before
    });

    if (result.success) {
      console.log('[Calendar] ✅ Calendar event created successfully:', result.eventId);
    } else {
      console.log('[Calendar] ❌ Failed to create calendar event:', result.error);
    }

    return result;
  } catch (error: any) {
    console.error('[Calendar] Error creating booking calendar event:', error);
    return {
      success: false,
      error: error.message || 'Failed to create calendar event',
    };
  }
};

/**
 * Prompt user to add booking to calendar
 */
export const promptAddToCalendar = (
  onConfirm: () => void,
  onCancel?: () => void
) => {
  Alert.alert(
    'Add to Calendar',
    'Would you like to add this booking to your calendar?',
    [
      {
        text: 'Not Now',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: 'Add to Calendar',
        onPress: onConfirm,
      },
    ]
  );
};

