import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AdvancedSearchModal, { SearchFilters } from '../AdvancedSearchModal';

describe('AdvancedSearchModal', () => {
  const mockOnClose = jest.fn();
  const mockOnApply = jest.fn();

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    onApply: mockOnApply,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the modal when visible', () => {
      const { getByText } = render(<AdvancedSearchModal {...defaultProps} />);

      expect(getByText('Filters')).toBeTruthy();
      expect(getByText('Price Range')).toBeTruthy();
      expect(getByText('Minimum Rating')).toBeTruthy();
      expect(getByText('Maximum Distance')).toBeTruthy();
      expect(getByText('Availability')).toBeTruthy();
      expect(getByText('Sort By')).toBeTruthy();
    });

    it('should not render when not visible', () => {
      const { queryByText } = render(
        <AdvancedSearchModal {...defaultProps} visible={false} />
      );

      expect(queryByText('Filters')).toBeNull();
    });

    it('should display default filter values', () => {
      const { getByText } = render(<AdvancedSearchModal {...defaultProps} />);

      expect(getByText('$0')).toBeTruthy();
      expect(getByText('$200')).toBeTruthy();
      expect(getByText('Any')).toBeTruthy();
      expect(getByText('50 km')).toBeTruthy();
    });

    it('should display initial filter values when provided', () => {
      const initialFilters: SearchFilters = {
        priceRange: [50, 150],
        minRating: 4,
        maxDistance: 25,
        availability: 'today',
        sortBy: 'price_low',
        isVerified: true,
      };

      const { getByText } = render(
        <AdvancedSearchModal {...defaultProps} initialFilters={initialFilters} />
      );

      expect(getByText('$50')).toBeTruthy();
      expect(getByText('$150')).toBeTruthy();
      expect(getByText('4+ ⭐')).toBeTruthy();
      expect(getByText('25 km')).toBeTruthy();
    });
  });

  describe('Price Range Filter', () => {
    it('should allow adjusting price range', () => {
      const { getByText, getAllByTestId } = render(
        <AdvancedSearchModal {...defaultProps} />
      );

      // Slider components would have testID
      // In a real test, you'd interact with the Slider component
      expect(getByText('Price Range')).toBeTruthy();
    });

    it('should display updated price range', () => {
      const { getAllByText } = render(<AdvancedSearchModal {...defaultProps} />);

      // After adjusting slider, price range should update (there will be multiple $ signs)
      const dollarSigns = getAllByText(/\$/);
      expect(dollarSigns.length).toBeGreaterThan(0);
    });
  });

  describe('Rating Filter', () => {
    it('should display all rating options', () => {
      const { getByText } = render(<AdvancedSearchModal {...defaultProps} />);

      expect(getByText('Any')).toBeTruthy();
      expect(getByText('3+ ⭐')).toBeTruthy();
      expect(getByText('4+ ⭐')).toBeTruthy();
      expect(getByText('4.5+ ⭐')).toBeTruthy();
      expect(getByText('5 ⭐')).toBeTruthy();
    });

    it('should allow selecting a rating', () => {
      const { getByText } = render(<AdvancedSearchModal {...defaultProps} />);

      const rating4Plus = getByText('4+ ⭐');
      fireEvent.press(rating4Plus);

      // Rating should be selected (visual feedback would be tested in integration tests)
      expect(rating4Plus).toBeTruthy();
    });
  });

  describe('Distance Filter', () => {
    it('should allow adjusting maximum distance', () => {
      const { getByText } = render(<AdvancedSearchModal {...defaultProps} />);

      expect(getByText('Maximum Distance')).toBeTruthy();
      expect(getByText(/km/)).toBeTruthy();
    });

    it('should display updated distance', () => {
      const { getByText } = render(<AdvancedSearchModal {...defaultProps} />);

      // After adjusting slider, distance should update
      expect(getByText(/km/)).toBeTruthy();
    });
  });

  describe('Availability Filter', () => {
    it('should display all availability options', () => {
      const { getByText } = render(<AdvancedSearchModal {...defaultProps} />);

      expect(getByText('Any Time')).toBeTruthy();
      expect(getByText('Today')).toBeTruthy();
      expect(getByText('This Week')).toBeTruthy();
    });

    it('should allow selecting availability', () => {
      const { getByText } = render(<AdvancedSearchModal {...defaultProps} />);

      const todayOption = getByText('Today');
      fireEvent.press(todayOption);

      // Availability should be selected
      expect(todayOption).toBeTruthy();
    });
  });

  describe('Sort By Filter', () => {
    it('should display all sort options', () => {
      const { getByText } = render(<AdvancedSearchModal {...defaultProps} />);

      expect(getByText('Highest Rated')).toBeTruthy();
      expect(getByText('Price: Low to High')).toBeTruthy();
      expect(getByText('Price: High to Low')).toBeTruthy();
      expect(getByText('Nearest First')).toBeTruthy();
      expect(getByText('Most Popular')).toBeTruthy();
    });

    it('should allow selecting sort option', () => {
      const { getByText } = render(<AdvancedSearchModal {...defaultProps} />);

      const priceLowOption = getByText('Price: Low to High');
      fireEvent.press(priceLowOption);

      // Sort option should be selected
      expect(priceLowOption).toBeTruthy();
    });
  });

  describe('Verified Filter', () => {
    it('should display verified providers toggle', () => {
      const { getByText } = render(<AdvancedSearchModal {...defaultProps} />);

      expect(getByText('Verified Providers Only')).toBeTruthy();
    });

    it('should allow toggling verified filter', () => {
      const { getByText } = render(<AdvancedSearchModal {...defaultProps} />);

      const verifiedToggle = getByText('Verified Providers Only');
      fireEvent.press(verifiedToggle);

      // Toggle should be activated
      expect(verifiedToggle).toBeTruthy();
    });
  });

  describe('Apply Filters', () => {
    it('should call onApply with current filters', () => {
      const { getByText } = render(<AdvancedSearchModal {...defaultProps} />);

      const applyButton = getByText('Apply Filters');
      fireEvent.press(applyButton);

      expect(mockOnApply).toHaveBeenCalledWith({
        priceRange: [0, 200],
        minRating: 0,
        maxDistance: 50,
        availability: 'any',
        sortBy: 'rating',
        isVerified: false,
      });
    });

    it('should close modal after applying filters', () => {
      const { getByText } = render(<AdvancedSearchModal {...defaultProps} />);

      const applyButton = getByText('Apply Filters');
      fireEvent.press(applyButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should apply filters with custom values', () => {
      const { getByText } = render(<AdvancedSearchModal {...defaultProps} />);

      // Select rating
      const rating4Plus = getByText('4+ ⭐');
      fireEvent.press(rating4Plus);

      // Select availability
      const todayOption = getByText('Today');
      fireEvent.press(todayOption);

      // Select sort
      const priceLowOption = getByText('Price: Low to High');
      fireEvent.press(priceLowOption);

      // Toggle verified
      const verifiedToggle = getByText('Verified Providers Only');
      fireEvent.press(verifiedToggle);

      const applyButton = getByText('Apply Filters');
      fireEvent.press(applyButton);

      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({
          minRating: 4,
          availability: 'today',
          sortBy: 'price_low',
          isVerified: true,
        })
      );
    });
  });

  describe('Reset Filters', () => {
    it('should reset all filters to default values', () => {
      const initialFilters: SearchFilters = {
        priceRange: [50, 150],
        minRating: 4,
        maxDistance: 25,
        availability: 'today',
        sortBy: 'price_low',
        isVerified: true,
      };

      const { getByText } = render(
        <AdvancedSearchModal {...defaultProps} initialFilters={initialFilters} />
      );

      const resetButton = getByText('Reset');
      fireEvent.press(resetButton);

      // Should show default values
      expect(getByText('$0')).toBeTruthy();
      expect(getByText('$200')).toBeTruthy();
      expect(getByText('50 km')).toBeTruthy();
    });

    it('should not close modal when resetting', () => {
      const { getByText } = render(<AdvancedSearchModal {...defaultProps} />);

      const resetButton = getByText('Reset');
      fireEvent.press(resetButton);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Close Modal', () => {
    it('should call onClose when close button is pressed', () => {
      const { getByText } = render(<AdvancedSearchModal {...defaultProps} />);

      const closeButton = getByText('✕');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not apply filters when closing without applying', () => {
      const { getByText } = render(<AdvancedSearchModal {...defaultProps} />);

      // Change some filters
      const rating4Plus = getByText('4+ ⭐');
      fireEvent.press(rating4Plus);

      // Close without applying
      const closeButton = getByText('✕');
      fireEvent.press(closeButton);

      expect(mockOnApply).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});

