/**
 * Price Breakdown Component
 * 
 * Displays transparent pricing breakdown including:
 * - Service price
 * - Travel fee (if applicable)
 * - Total price
 * - Distance information
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';

interface PriceBreakdownProps {
  serviceName: string;
  servicePriceCents: number;
  travelFeeCents: number;
  distanceKm: number;
  travelFeeType?: 'flat' | 'per_km' | 'none';
  freeRadiusKm?: number;
  showDetails?: boolean;
}

export default function PriceBreakdown({
  serviceName,
  servicePriceCents,
  travelFeeCents,
  distanceKm,
  travelFeeType = 'none',
  freeRadiusKm = 0,
  showDetails = true,
}: PriceBreakdownProps) {
  const totalCents = servicePriceCents + travelFeeCents;

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getTravelFeeDescription = () => {
    if (travelFeeType === 'none' || travelFeeCents === 0) {
      return 'No travel fee';
    }

    if (distanceKm <= freeRadiusKm) {
      return `Within free travel radius (${freeRadiusKm} km)`;
    }

    if (travelFeeType === 'flat') {
      return `Flat travel fee`;
    }

    if (travelFeeType === 'per_km') {
      const chargeableDistance = Math.max(0, distanceKm - freeRadiusKm);
      return `Travel fee (${chargeableDistance.toFixed(1)} km)`;
    }

    return 'Travel fee';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Price Breakdown</Text>

      {/* Distance Info */}
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>📍 Distance</Text>
        <Text style={styles.infoValue}>{distanceKm.toFixed(1)} km</Text>
      </View>

      {showDetails && (
        <>
          {/* Service Price */}
          <View style={styles.row}>
            <Text style={styles.label}>{serviceName}</Text>
            <Text style={styles.value}>{formatPrice(servicePriceCents)}</Text>
          </View>

          {/* Travel Fee */}
          <View style={styles.row}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Travel Fee</Text>
              <Text style={styles.sublabel}>{getTravelFeeDescription()}</Text>
            </View>
            <Text style={[styles.value, travelFeeCents === 0 && styles.freeValue]}>
              {travelFeeCents === 0 ? 'FREE' : formatPrice(travelFeeCents)}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />
        </>
      )}

      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatPrice(totalCents)}</Text>
      </View>

      {/* Note about platform commission */}
      {travelFeeCents > 0 && (
        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>
            💡 Travel fees go directly to the provider. Platform commission only applies to service price.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  infoLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  sublabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  value: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  freeValue: {
    color: colors.success,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  noteContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  noteText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
});

