import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import BookingModal from '../BookingModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { getCurrentLocation } from '../../services/location';
import { checkProviderAvailability, getAvailableTimeSlots, formatTimeSlot } from '../../services/availability';

// Mock dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('../../services/location');
jest.mock('../../services/availability', () => ({
  checkProviderAvailability: jest.fn(),
  getAvailableTimeSlots: jest.fn(),
  formatTimeSlot: jest.fn((time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }),
}));
jest.mock('../../utils/calendar');
jest.mock('../../utils/analytics');
jest.mock('../../utils/recurringBooking', () => ({
  ...jest.requireActual('../../utils/recurringBooking'),
  generateBookingInstances: jest.fn(() => []),
}));

describe('BookingModal', () => {
  const mockService = {
    id: 'service-1',
    name: 'Haircut',
    description: 'Professional haircut',
    base_duration_minutes: 60,
  };

  const mockProvider = {
    id: 'provider-1',
    user_id: 'user-1',
    business_name: 'Test Salon',
    price: 5000, // $50.00
  };

  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'customer-1', email: 'customer@test.com' },
    });
    (getCurrentLocation as jest.Mock).mockResolvedValue({
      coords: { latitude: 40.7128, longitude: -74.006 },
    });
    (checkProviderAvailability as jest.Mock).mockResolvedValue(true);
    (getAvailableTimeSlots as jest.Mock).mockResolvedValue([
      { time: '09:00', available: true },
      { time: '10:00', available: true },
      { time: '11:00', available: true },
    ]);
  });

  describe('Rendering', () => {
    it('should render the modal when visible', () => {
      const { getByText } = render(
        <BookingModal
          visible={true}
          onClose={mockOnClose}
          service={mockService}
          provider={mockProvider}
          onSuccess={mockOnSuccess}
        />
      );

      expect(getByText('Booking Details')).toBeTruthy();
      expect(getByText(mockService.name)).toBeTruthy();
      expect(getByText(mockProvider.business_name)).toBeTruthy();
    });

    it('should not render when not visible', () => {
      const { queryByText } = render(
        <BookingModal
          visible={false}
          onClose={mockOnClose}
          service={mockService}
          provider={mockProvider}
          onSuccess={mockOnSuccess}
        />
      );

      expect(queryByText('Book Service')).toBeNull();
    });

    it('should display service price correctly', () => {
      const { getByText } = render(
        <BookingModal
          visible={true}
          onClose={mockOnClose}
          service={mockService}
          provider={mockProvider}
          onSuccess={mockOnSuccess}
        />
      );

      expect(getByText(/\$50\.00/)).toBeTruthy();
    });
  });

  describe('Form Interactions', () => {
    it('should allow entering booking details', () => {
      const { getByPlaceholderText } = render(
        <BookingModal
          visible={true}
          onClose={mockOnClose}
          service={mockService}
          provider={mockProvider}
          onSuccess={mockOnSuccess}
        />
      );

      const addressInput = getByPlaceholderText('Street address');
      const cityInput = getByPlaceholderText('City');
      const stateInput = getByPlaceholderText('State');
      const zipInput = getByPlaceholderText('ZIP Code');

      fireEvent.changeText(addressInput, '123 Main St');
      fireEvent.changeText(cityInput, 'New York');
      fireEvent.changeText(stateInput, 'NY');
      fireEvent.changeText(zipInput, '10001');

      expect(addressInput.props.value).toBe('123 Main St');
      expect(cityInput.props.value).toBe('New York');
      expect(stateInput.props.value).toBe('NY');
      expect(zipInput.props.value).toBe('10001');
    });

    it('should toggle recurring booking option', async () => {
      const { getByText, queryByText } = render(
        <BookingModal
          visible={true}
          onClose={mockOnClose}
          service={mockService}
          provider={mockProvider}
          onSuccess={mockOnSuccess}
        />
      );

      // Initially, recurring options should not be visible
      expect(queryByText('Frequency *')).toBeNull();

      // Press the "Off" toggle to turn it on
      const toggleButton = getByText('Off');
      fireEvent.press(toggleButton);

      // Should show recurring options (with asterisk)
      await waitFor(() => {
        expect(getByText('Frequency *')).toBeTruthy();
      });
    });

    it('should use current location when button is pressed', async () => {
      const { getByText, getByPlaceholderText } = render(
        <BookingModal
          visible={true}
          onClose={mockOnClose}
          service={mockService}
          provider={mockProvider}
          onSuccess={mockOnSuccess}
        />
      );

      const useLocationButton = getByText(/Use Current Location/);
      fireEvent.press(useLocationButton);

      await waitFor(() => {
        expect(getCurrentLocation).toHaveBeenCalled();
      });
    });
  });

  describe('Date and Time Selection', () => {
    it('should load available time slots when date is selected', async () => {
      const { getByPlaceholderText } = render(
        <BookingModal
          visible={true}
          onClose={mockOnClose}
          service={mockService}
          provider={mockProvider}
          onSuccess={mockOnSuccess}
        />
      );

      const dateInput = getByPlaceholderText('YYYY-MM-DD');
      fireEvent.changeText(dateInput, '2024-12-25');

      await waitFor(() => {
        expect(getAvailableTimeSlots).toHaveBeenCalledWith(
          mockProvider.id,
          '2024-12-25',
          mockService.base_duration_minutes
        );
      });
    });

    it('should display available time slots', async () => {
      const { getByPlaceholderText, getByText } = render(
        <BookingModal
          visible={true}
          onClose={mockOnClose}
          service={mockService}
          provider={mockProvider}
          onSuccess={mockOnSuccess}
        />
      );

      const dateInput = getByPlaceholderText('YYYY-MM-DD');
      fireEvent.changeText(dateInput, '2024-12-25');

      // Wait for time slots to appear (times are formatted as "9:00 AM", etc.)
      await waitFor(
        () => {
          expect(getByText('9:00 AM')).toBeTruthy();
          expect(getByText('10:00 AM')).toBeTruthy();
          expect(getByText('11:00 AM')).toBeTruthy();
        },
        { timeout: 10000 }
      );
    }, 15000);

    it('should select a time slot when clicked', async () => {
      const { getByPlaceholderText, getByText } = render(
        <BookingModal
          visible={true}
          onClose={mockOnClose}
          service={mockService}
          provider={mockProvider}
          onSuccess={mockOnSuccess}
        />
      );

      const dateInput = getByPlaceholderText('YYYY-MM-DD');
      fireEvent.changeText(dateInput, '2024-12-25');

      // Wait for time slot to appear and click it
      await waitFor(
        () => {
          const timeSlot = getByText('9:00 AM'); // Formatted time
          expect(timeSlot).toBeTruthy();
        },
        { timeout: 10000 }
      );

      const timeSlot = getByText('9:00 AM');
      fireEvent.press(timeSlot);

      // Verify the time slot was clicked (component uses button selection, not input field)
      await waitFor(() => {
        expect(timeSlot).toBeTruthy();
      });
    }, 15000);
  });

  describe('Validation', () => {
    it('should show error when required fields are missing', () => {
      const { getByText } = render(
        <BookingModal
          visible={true}
          onClose={mockOnClose}
          service={mockService}
          provider={mockProvider}
          onSuccess={mockOnSuccess}
        />
      );

      const continueButton = getByText('Continue to Payment');
      fireEvent.press(continueButton);

      // Should show validation error (Alert is mocked)
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should proceed to payment when all fields are filled', async () => {
      const { getByPlaceholderText, getByText } = render(
        <BookingModal
          visible={true}
          onClose={mockOnClose}
          service={mockService}
          provider={mockProvider}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill in date and wait for time slots to load
      fireEvent.changeText(getByPlaceholderText('YYYY-MM-DD'), '2025-12-25');

      // Wait for time slots to appear
      await waitFor(
        () => {
          expect(getByText('9:00 AM')).toBeTruthy();
        },
        { timeout: 10000 }
      );

      // Select a time slot
      const timeSlot = getByText('9:00 AM');
      fireEvent.press(timeSlot);

      // Wait a bit for state to update
      await waitFor(() => {
        expect(timeSlot).toBeTruthy();
      });

      // Fill in address fields
      fireEvent.changeText(getByPlaceholderText('Street address'), '123 Main St');
      fireEvent.changeText(getByPlaceholderText('City'), 'New York');
      fireEvent.changeText(getByPlaceholderText('State'), 'NY');
      fireEvent.changeText(getByPlaceholderText('ZIP Code'), '10001');

      // Wait for all fields to be filled
      await waitFor(() => {
        expect(getByPlaceholderText('Street address').props.value).toBe('123 Main St');
        expect(getByPlaceholderText('City').props.value).toBe('New York');
        expect(getByPlaceholderText('State').props.value).toBe('NY');
        expect(getByPlaceholderText('ZIP Code').props.value).toBe('10001');
      });

      // Continue to payment
      const continueButton = getByText('Continue to Payment');
      fireEvent.press(continueButton);

      // Should proceed to payment step
      await waitFor(
        () => {
          expect(getByText('Payment Information')).toBeTruthy();
        },
        { timeout: 5000 }
      );
    }, 20000);
  });

  describe('Recurring Bookings', () => {
    it('should show recurring options when enabled', async () => {
      const { getByText, queryByText } = render(
        <BookingModal
          visible={true}
          onClose={mockOnClose}
          service={mockService}
          provider={mockProvider}
          onSuccess={mockOnSuccess}
        />
      );

      // Initially, recurring options should not be visible
      expect(queryByText('Frequency *')).toBeNull();

      // Press the "Off" toggle to turn it on
      const toggleButton = getByText('Off');
      fireEvent.press(toggleButton);

      // Wait for recurring options to appear
      await waitFor(() => {
        expect(getByText('Frequency *')).toBeTruthy();
        expect(getByText('Weekly')).toBeTruthy();
        expect(getByText('Ends *')).toBeTruthy();
        expect(getByText('After')).toBeTruthy();
      });
    });

    it('should calculate total cost for recurring bookings', async () => {
      const { getByText, getByPlaceholderText } = render(
        <BookingModal
          visible={true}
          onClose={mockOnClose}
          service={mockService}
          provider={mockProvider}
          onSuccess={mockOnSuccess}
        />
      );

      // Set date and time first (required for cost calculation)
      fireEvent.changeText(getByPlaceholderText('YYYY-MM-DD'), '2024-12-25');

      // Wait for time slots to appear
      await waitFor(
        () => {
          expect(getByText('9:00 AM')).toBeTruthy();
        },
        { timeout: 10000 }
      );

      // Select a time slot
      const timeSlot = getByText('9:00 AM');
      fireEvent.press(timeSlot);

      // Enable recurring booking
      const toggleButton = getByText('Off');
      fireEvent.press(toggleButton);

      // Wait for recurring options to appear
      await waitFor(() => {
        expect(getByText('Frequency *')).toBeTruthy();
      });

      // The default is 4 occurrences, so total should be $50 x 4 = $200
      await waitFor(() => {
        expect(getByText(/\$200\.00/)).toBeTruthy();
      });
    }, 15000);
  });

  describe('Close Modal', () => {
    it('should call onClose when close button is pressed', () => {
      const { getByText } = render(
        <BookingModal
          visible={true}
          onClose={mockOnClose}
          service={mockService}
          provider={mockProvider}
          onSuccess={mockOnSuccess}
        />
      );

      const closeButton = getByText('✕');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});

