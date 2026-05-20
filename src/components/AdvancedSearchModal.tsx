import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
let Slider: any = View;
try { Slider = require('@react-native-community/slider').default; } catch (e) { console.warn('[AdvancedSearchModal] slider unavailable:', e); }
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';

interface AdvancedSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
  initialFilters?: SearchFilters;
}

export interface SearchFilters {
  priceRange: [number, number];
  minRating: number;
  maxDistance: number;
  availability: 'any' | 'today' | 'this_week' | 'custom';
  sortBy: 'rating' | 'price_low' | 'price_high' | 'distance' | 'popularity';
  isVerified: boolean;
}

export default function AdvancedSearchModal({
  visible,
  onClose,
  onApply,
  initialFilters,
}: AdvancedSearchModalProps) {
  const [priceRange, setPriceRange] = useState<[number, number]>(
    initialFilters?.priceRange || [0, 200]
  );
  const [minRating, setMinRating] = useState(initialFilters?.minRating || 0);
  const [maxDistance, setMaxDistance] = useState(initialFilters?.maxDistance || 50);
  const [availability, setAvailability] = useState<SearchFilters['availability']>(
    initialFilters?.availability || 'any'
  );
  const [sortBy, setSortBy] = useState<SearchFilters['sortBy']>(
    initialFilters?.sortBy || 'rating'
  );
  const [isVerified, setIsVerified] = useState(initialFilters?.isVerified || false);

  const handleApply = () => {
    onApply({
      priceRange,
      minRating,
      maxDistance,
      availability,
      sortBy,
      isVerified,
    });
    onClose();
  };

  const handleReset = () => {
    setPriceRange([0, 200]);
    setMinRating(0);
    setMaxDistance(50);
    setAvailability('any');
    setSortBy('rating');
    setIsVerified(false);
  };

  const ratingOptions = [
    { value: 0, label: 'Any' },
    { value: 3, label: '3+ ⭐' },
    { value: 4, label: '4+ ⭐' },
    { value: 4.5, label: '4.5+ ⭐' },
    { value: 5, label: '5 ⭐' },
  ];

  const availabilityOptions = [
    { value: 'any', label: 'Any Time' },
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This Week' },
    { value: 'custom', label: 'Custom Date' },
  ];

  const sortOptions = [
    { value: 'rating', label: 'Highest Rated' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'distance', label: 'Nearest First' },
    { value: 'popularity', label: 'Most Popular' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Price Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Price Range</Text>
              <View style={styles.priceLabels}>
                <Text style={styles.priceText}>${priceRange[0]}</Text>
                <Text style={styles.priceText}>${priceRange[1]}</Text>
              </View>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={500}
                  step={10}
                  value={priceRange[0]}
                  onValueChange={(value) => setPriceRange([value, priceRange[1]])}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.primary}
                />
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={500}
                  step={10}
                  value={priceRange[1]}
                  onValueChange={(value) => setPriceRange([priceRange[0], value])}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.primary}
                />
              </View>
            </View>

            {/* Rating */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Minimum Rating</Text>
              <View style={styles.optionsContainer}>
                {ratingOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      minRating === option.value && styles.optionButtonSelected,
                    ]}
                    onPress={() => setMinRating(option.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        minRating === option.value && styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Distance */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Maximum Distance</Text>
              <Text style={styles.distanceText}>{maxDistance} km</Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={100}
                step={1}
                value={maxDistance}
                onValueChange={setMaxDistance}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.primary}
              />
            </View>

            {/* Availability */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Availability</Text>
              <View style={styles.optionsContainer}>
                {availabilityOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      availability === option.value && styles.optionButtonSelected,
                    ]}
                    onPress={() => setAvailability(option.value as any)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        availability === option.value && styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort By */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sort By</Text>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sortOption,
                    sortBy === option.value && styles.sortOptionSelected,
                  ]}
                  onPress={() => setSortBy(option.value as any)}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      sortBy === option.value && styles.sortOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {sortBy === option.value && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>

            {/* Verified Only */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.verifiedToggle}
                onPress={() => setIsVerified(!isVerified)}
              >
                <View style={styles.verifiedInfo}>
                  <Text style={styles.verifiedTitle}>Verified Providers Only</Text>
                  <Text style={styles.verifiedDescription}>
                    Show only identity-verified providers
                  </Text>
                </View>
                <View style={[styles.toggle, isVerified && styles.toggleActive]}>
                  <View style={[styles.toggleThumb, isVerified && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    fontSize: fontSize.xl,
    color: colors.textSecondary,
    padding: spacing.sm,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  priceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  priceText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  sliderContainer: {
    gap: spacing.sm,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  distanceText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  optionButtonSelected: {
    backgroundColor: colors.primaryDarker,
    borderColor: colors.primaryDarker,
  },
  optionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: colors.white,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  sortOptionSelected: {
    borderColor: colors.primaryDarker,
    backgroundColor: colors.primaryDarker + '20',
  },
  sortOptionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  sortOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: 'bold',
  },
  verifiedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  verifiedInfo: {
    flex: 1,
  },
  verifiedTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  verifiedDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: borderRadius.round,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primaryDarker,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.round,
    backgroundColor: colors.white,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resetButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  applyButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
