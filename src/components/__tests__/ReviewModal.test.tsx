import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ReviewModal from '../ReviewModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';

// Mock dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('../../utils/analytics');

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('ReviewModal', () => {
  const mockBooking = {
    id: 'booking-1',
    provider_id: 'provider-1',
    provider_profiles: {
      business_name: 'Test Salon',
    },
    services: {
      name: 'Haircut',
    },
  };

  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'customer-1', email: 'customer@test.com' },
    });

    // Mock Supabase responses
    const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });
    const mockSelect = jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({
        data: [{ rating: 5 }, { rating: 4 }],
        error: null,
      }),
    }));
    const mockUpdate = jest.fn(() => ({
      eq: mockEq,
    }));
    const mockInsert = jest.fn(() => Promise.resolve({ data: null, error: null }));

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'reviews') {
        return {
          insert: mockInsert,
          select: mockSelect,
        };
      }
      if (table === 'provider_profiles') {
        return {
          update: mockUpdate,
        };
      }
      return {
        insert: mockInsert,
        select: mockSelect,
        update: mockUpdate,
        eq: mockEq,
      };
    });

    // Mock Alert.alert to automatically call the onPress callback
    (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
      if (buttons && buttons[0] && buttons[0].onPress) {
        buttons[0].onPress();
      }
    });
  });

  describe('Rendering', () => {
    it('should render the modal when visible', () => {
      const { getByText } = render(
        <ReviewModal
          visible={true}
          onClose={mockOnClose}
          booking={mockBooking}
          onSuccess={mockOnSuccess}
        />
      );

      expect(getByText('Write a Review')).toBeTruthy();
      expect(getByText(mockBooking.provider_profiles.business_name)).toBeTruthy();
      expect(getByText(mockBooking.services.name)).toBeTruthy();
    });

    it('should not render when not visible', () => {
      const { queryByText } = render(
        <ReviewModal
          visible={false}
          onClose={mockOnClose}
          booking={mockBooking}
          onSuccess={mockOnSuccess}
        />
      );

      expect(queryByText('Write a Review')).toBeNull();
    });

    it('should display all 5 star rating options', () => {
      const { getAllByText } = render(
        <ReviewModal
          visible={true}
          onClose={mockOnClose}
          booking={mockBooking}
          onSuccess={mockOnSuccess}
        />
      );

      const stars = getAllByText('☆');
      expect(stars.length).toBe(5);
    });
  });

  describe('Rating Selection', () => {
    it('should allow selecting a rating', () => {
      const { getAllByText, getByText } = render(
        <ReviewModal
          visible={true}
          onClose={mockOnClose}
          booking={mockBooking}
          onSuccess={mockOnSuccess}
        />
      );

      const stars = getAllByText('☆');
      fireEvent.press(stars[3]); // Select 4 stars

      // Should show rating text
      expect(getByText('Very Good')).toBeTruthy();
    });

    it('should allow changing rating', () => {
      const { getAllByText, getByText } = render(
        <ReviewModal
          visible={true}
          onClose={mockOnClose}
          booking={mockBooking}
          onSuccess={mockOnSuccess}
        />
      );

      const stars = getAllByText('☆');
      fireEvent.press(stars[2]); // Select 3 stars
      fireEvent.press(stars[4]); // Change to 5 stars

      expect(getByText('Excellent')).toBeTruthy();
    });
  });

  describe('Comment Input', () => {
    it('should allow entering a comment', () => {
      const { getByPlaceholderText } = render(
        <ReviewModal
          visible={true}
          onClose={mockOnClose}
          booking={mockBooking}
          onSuccess={mockOnSuccess}
        />
      );

      const commentInput = getByPlaceholderText('Share details about your experience...');
      fireEvent.changeText(commentInput, 'Great service!');

      expect(commentInput.props.value).toBe('Great service!');
    });

    it('should respect character limit', () => {
      const { getByPlaceholderText } = render(
        <ReviewModal
          visible={true}
          onClose={mockOnClose}
          booking={mockBooking}
          onSuccess={mockOnSuccess}
        />
      );

      const commentInput = getByPlaceholderText('Share details about your experience...');
      expect(commentInput.props.maxLength).toBe(500);
    });
  });

  describe('Validation', () => {
    it('should show error when rating is not selected', () => {
      const { getByText } = render(
        <ReviewModal
          visible={true}
          onClose={mockOnClose}
          booking={mockBooking}
          onSuccess={mockOnSuccess}
        />
      );

      const submitButton = getByText('Submit Review');
      fireEvent.press(submitButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Rating Required',
        'Please select a rating'
      );
    });

    it('should allow submitting with rating only (no comment)', async () => {
      const { getAllByText, getByText } = render(
        <ReviewModal
          visible={true}
          onClose={mockOnClose}
          booking={mockBooking}
          onSuccess={mockOnSuccess}
        />
      );

      // Select rating
      const stars = getAllByText('☆');
      fireEvent.press(stars[4]); // 5 stars

      const submitButton = getByText('Submit Review');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('reviews');
      });
    });
  });

  describe('Submission', () => {
    it('should submit review with rating and comment', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockSelect = jest.fn().mockResolvedValue({
        data: [{ rating: 5 }, { rating: 4 }],
        error: null,
      });
      const mockUpdate = jest.fn().mockResolvedValue({ data: null, error: null });

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'reviews') {
          return {
            insert: mockInsert,
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ rating: 5 }, { rating: 4 }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'provider_profiles') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        return {};
      });

      const { getAllByText, getByText, getByPlaceholderText } = render(
        <ReviewModal
          visible={true}
          onClose={mockOnClose}
          booking={mockBooking}
          onSuccess={mockOnSuccess}
        />
      );

      // Select rating
      const stars = getAllByText('☆');
      fireEvent.press(stars[4]); // 5 stars

      // Enter comment
      const commentInput = getByPlaceholderText('Share details about your experience...');
      fireEvent.changeText(commentInput, 'Excellent service!');

      // Submit
      const submitButton = getByText('Submit Review');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show loading state while submitting', async () => {
      // Mock a slow submission to test loading state
      const mockInsert = jest.fn(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 100))
      );
      const mockSelect = jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({
          data: [{ rating: 5 }],
          error: null,
        }),
      }));
      const mockUpdate = jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'reviews') {
          return {
            insert: mockInsert,
            select: mockSelect,
          };
        }
        if (table === 'provider_profiles') {
          return {
            update: mockUpdate,
          };
        }
        return {};
      });

      const { getAllByText, getByText, queryByText } = render(
        <ReviewModal
          visible={true}
          onClose={mockOnClose}
          booking={mockBooking}
          onSuccess={mockOnSuccess}
        />
      );

      // Select rating
      const stars = getAllByText('☆');
      fireEvent.press(stars[4]);

      const submitButton = getByText('Submit Review');
      fireEvent.press(submitButton);

      // Should not show "Submit Review" text anymore (replaced by ActivityIndicator)
      await waitFor(() => {
        expect(queryByText('Submit Review')).toBeNull();
      });
    });

    it('should handle submission errors', async () => {
      const mockError = { message: 'Submission failed' };
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: mockError });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'reviews') {
          return {
            insert: mockInsert,
          };
        }
        return {};
      });

      const { getAllByText, getByText } = render(
        <ReviewModal
          visible={true}
          onClose={mockOnClose}
          booking={mockBooking}
          onSuccess={mockOnSuccess}
        />
      );

      // Select rating
      const stars = getAllByText('☆');
      fireEvent.press(stars[4]);

      const submitButton = getByText('Submit Review');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Submission failed'
        );
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Close Modal', () => {
    it('should call onClose when close button is pressed', () => {
      const { getByText } = render(
        <ReviewModal
          visible={true}
          onClose={mockOnClose}
          booking={mockBooking}
          onSuccess={mockOnSuccess}
        />
      );

      const closeButton = getByText('✕');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should reset form when closed', () => {
      const { getAllByText, getByText, getByPlaceholderText, rerender } = render(
        <ReviewModal
          visible={true}
          onClose={mockOnClose}
          booking={mockBooking}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill in form
      const stars = getAllByText('☆');
      fireEvent.press(stars[4]);
      const commentInput = getByPlaceholderText('Share details about your experience...');
      fireEvent.changeText(commentInput, 'Test comment');

      // Close modal
      const closeButton = getByText('✕');
      fireEvent.press(closeButton);

      // Reopen modal
      rerender(
        <ReviewModal
          visible={false}
          onClose={mockOnClose}
          booking={mockBooking}
          onSuccess={mockOnSuccess}
        />
      );
      rerender(
        <ReviewModal
          visible={true}
          onClose={mockOnClose}
          booking={mockBooking}
          onSuccess={mockOnSuccess}
        />
      );

      // Form should be reset
      const newCommentInput = getByPlaceholderText('Share details about your experience...');
      expect(newCommentInput.props.value).toBe('');
    });
  });
});

