/**
 * Recurring Booking Utility Functions
 * Handles calculation of recurring dates, validation, and booking instance generation
 */

export type RecurringFrequency = 'daily' | 'weekly' | 'bi_weekly' | 'monthly';
export type RecurringEndType = 'never' | 'after_occurrences' | 'on_date';

export interface RecurringPattern {
  frequency: RecurringFrequency;
  interval: number; // e.g., every 2 weeks
  startDate: string; // ISO date string
  startTime: string; // HH:MM format
  endType: RecurringEndType;
  endDate?: string; // ISO date string (for 'on_date' end type)
  maxOccurrences?: number; // (for 'after_occurrences' end type)
}

export interface RecurringBookingInstance {
  date: string; // ISO date string
  time: string; // HH:MM format
  instanceNumber: number;
}

/**
 * Calculate the next occurrence date based on frequency
 */
export function calculateNextOccurrence(
  currentDate: Date,
  frequency: RecurringFrequency,
  interval: number = 1
): Date {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + (7 * interval));
      break;
    case 'bi_weekly':
      nextDate.setDate(nextDate.getDate() + (14 * interval));
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + interval);
      break;
  }

  return nextDate;
}

/**
 * Generate all booking instances for a recurring pattern
 * @param pattern - The recurring pattern configuration
 * @param maxInstances - Maximum number of instances to generate (default: 52 for weekly bookings over a year)
 * @returns Array of booking instances
 */
export function generateBookingInstances(
  pattern: RecurringPattern,
  maxInstances: number = 52
): RecurringBookingInstance[] {
  const instances: RecurringBookingInstance[] = [];
  const startDate = new Date(pattern.startDate);
  let currentDate = new Date(startDate);
  let instanceNumber = 1;

  // Determine the maximum number of occurrences
  let maxOccurrences = maxInstances;
  if (pattern.endType === 'after_occurrences' && pattern.maxOccurrences) {
    maxOccurrences = Math.min(pattern.maxOccurrences, maxInstances);
  }

  // Generate instances
  while (instanceNumber <= maxOccurrences) {
    // Check if we've reached the end date
    if (pattern.endType === 'on_date' && pattern.endDate) {
      const endDate = new Date(pattern.endDate);
      if (currentDate > endDate) {
        break;
      }
    }

    // Add this instance
    instances.push({
      date: currentDate.toISOString().split('T')[0],
      time: pattern.startTime,
      instanceNumber,
    });

    // Calculate next occurrence
    currentDate = calculateNextOccurrence(currentDate, pattern.frequency, pattern.interval);
    instanceNumber++;
  }

  return instances;
}

/**
 * Validate a recurring pattern
 * @returns Object with isValid flag and error message if invalid
 */
export function validateRecurringPattern(pattern: RecurringPattern): {
  isValid: boolean;
  error?: string;
} {
  // Validate start date is in the future
  const startDate = new Date(pattern.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate < today) {
    return {
      isValid: false,
      error: 'Start date must be today or in the future',
    };
  }

  // Validate interval
  if (pattern.interval < 1) {
    return {
      isValid: false,
      error: 'Interval must be at least 1',
    };
  }

  // Validate end conditions
  if (pattern.endType === 'on_date') {
    if (!pattern.endDate) {
      return {
        isValid: false,
        error: 'End date is required when end type is "on_date"',
      };
    }

    const endDate = new Date(pattern.endDate);
    if (endDate <= startDate) {
      return {
        isValid: false,
        error: 'End date must be after start date',
      };
    }
  }

  if (pattern.endType === 'after_occurrences') {
    if (!pattern.maxOccurrences || pattern.maxOccurrences < 1) {
      return {
        isValid: false,
        error: 'Number of occurrences must be at least 1',
      };
    }

    if (pattern.maxOccurrences > 100) {
      return {
        isValid: false,
        error: 'Number of occurrences cannot exceed 100',
      };
    }
  }

  // Validate time format
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(pattern.startTime)) {
    return {
      isValid: false,
      error: 'Invalid time format. Use HH:MM format',
    };
  }

  return { isValid: true };
}

/**
 * Get a human-readable description of the recurring pattern
 */
export function getRecurringDescription(pattern: RecurringPattern): string {
  let description = '';

  // Frequency description
  switch (pattern.frequency) {
    case 'daily':
      description = pattern.interval === 1 ? 'Every day' : `Every ${pattern.interval} days`;
      break;
    case 'weekly':
      description = pattern.interval === 1 ? 'Every week' : `Every ${pattern.interval} weeks`;
      break;
    case 'bi_weekly':
      description = pattern.interval === 1 ? 'Every 2 weeks' : `Every ${pattern.interval * 2} weeks`;
      break;
    case 'monthly':
      description = pattern.interval === 1 ? 'Every month' : `Every ${pattern.interval} months`;
      break;
  }

  // End condition description
  if (pattern.endType === 'never') {
    description += ', ongoing';
  } else if (pattern.endType === 'after_occurrences' && pattern.maxOccurrences) {
    description += `, ${pattern.maxOccurrences} times`;
  } else if (pattern.endType === 'on_date' && pattern.endDate) {
    const endDate = new Date(pattern.endDate);
    description += `, until ${endDate.toLocaleDateString()}`;
  }

  return description;
}

/**
 * Calculate the total cost for all recurring booking instances
 */
export function calculateRecurringTotalCost(
  pattern: RecurringPattern,
  pricePerBooking: number
): {
  totalInstances: number;
  totalCost: number;
} {
  const instances = generateBookingInstances(pattern);
  return {
    totalInstances: instances.length,
    totalCost: instances.length * pricePerBooking,
  };
}

/**
 * Check if a date conflicts with existing bookings
 * @param date - Date to check
 * @param existingBookings - Array of existing booking dates
 * @returns true if there's a conflict
 */
export function hasDateConflict(
  date: string,
  existingBookings: string[]
): boolean {
  return existingBookings.includes(date);
}

/**
 * Filter out conflicting dates from booking instances
 */
export function filterConflictingInstances(
  instances: RecurringBookingInstance[],
  existingBookings: string[]
): {
  validInstances: RecurringBookingInstance[];
  conflictingDates: string[];
} {
  const validInstances: RecurringBookingInstance[] = [];
  const conflictingDates: string[] = [];

  instances.forEach((instance) => {
    if (hasDateConflict(instance.date, existingBookings)) {
      conflictingDates.push(instance.date);
    } else {
      validInstances.push(instance);
    }
  });

  return { validInstances, conflictingDates };
}

/**
 * Get the next upcoming instance from a recurring booking
 */
export function getNextUpcomingInstance(
  pattern: RecurringPattern
): RecurringBookingInstance | null {
  const instances = generateBookingInstances(pattern, 1);
  return instances.length > 0 ? instances[0] : null;
}

/**
 * Format frequency for display
 */
export function formatFrequency(frequency: RecurringFrequency): string {
  switch (frequency) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'bi_weekly':
      return 'Bi-weekly';
    case 'monthly':
      return 'Monthly';
    default:
      return frequency;
  }
}

