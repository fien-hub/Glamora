/**
 * Travel Settings Screen
 *
 * Shows providers the platform's standardized travel fee policy.
 * Travel fees are set by the platform, not by individual providers.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, fontSize, borderRadius, fontWeight } from '../../constants/theme';
import { STANDARD_TRAVEL_FEES } from '../../components/AddServiceModal';

export default function TravelSettingsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acceptsOver15Miles, setAcceptsOver15Miles] = useState(false);

  useEffect(() => {
    loadTravelSettings();
  }, []);

  const loadTravelSettings = async () => {
    try {
      setLoading(true);

      const { data: profile, error } = await supabase
        .from('provider_profiles')
        .select('accepts_over_25km')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (profile) {
        setAcceptsOver15Miles(profile.accepts_over_25km || false);
      }
    } catch (error) {
      console.error('Error loading travel settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTravelSettings = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('provider_profiles')
        .update({
          accepts_over_25km: acceptsOver15Miles,
        })
        .eq('id', user?.id);

      if (error) throw error;

      Alert.alert('Success', 'Travel settings saved successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving travel settings:', error);
      Alert.alert('Error', 'Failed to save travel settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Travel & Distance Policy</Text>
        <Text style={styles.description}>
          Travel fees are standardized by Glamora to ensure fair and transparent pricing for all customers.
        </Text>

        {/* Platform Travel Fee Policy */}
        <View style={styles.policyCard}>
          <View style={styles.policyHeader}>
            <Ionicons name="car-outline" size={24} color={colors.primary} />
            <Text style={styles.policyTitle}>Standard Travel Fees</Text>
          </View>
          <Text style={styles.policySubtitle}>
            These fees are automatically added to your base price based on customer distance:
          </Text>

          <View style={styles.feesList}>
            <View style={styles.feeItem}>
              <Text style={styles.feeDistance}>0-3 miles</Text>
              <Text style={styles.feeAmount}>+${STANDARD_TRAVEL_FEES['0-3 mi']}</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeDistance}>3-5 miles</Text>
              <Text style={styles.feeAmount}>+${STANDARD_TRAVEL_FEES['3-5 mi']}</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeDistance}>5-8 miles</Text>
              <Text style={styles.feeAmount}>+${STANDARD_TRAVEL_FEES['5-8 mi']}</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeDistance}>8-12 miles</Text>
              <Text style={styles.feeAmount}>+${STANDARD_TRAVEL_FEES['8-12 mi']}</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeDistance}>12-15 miles</Text>
              <Text style={styles.feeAmount}>+${STANDARD_TRAVEL_FEES['12-15 mi']}</Text>
            </View>
            <View style={[styles.feeItem, styles.feeItemLast]}>
              <Text style={styles.feeDistance}>15+ miles</Text>
              <Text style={styles.feeAmountSpecial}>+${STANDARD_TRAVEL_FEES['15+ mi']} (Special)</Text>
            </View>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={24} color={colors.info} />
            <Text style={styles.infoTitle}>How It Works</Text>
          </View>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.infoText}>Travel fees go 100% to you (no commission)</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.infoText}>Fees are calculated based on round-trip distance</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.infoText}>Customers see the total price upfront</Text>
            </View>
          </View>
        </View>

        {/* 15+ Miles Toggle */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleContent}>
            <View style={styles.toggleHeader}>
              <Ionicons name="navigate-outline" size={24} color={colors.primary} />
              <Text style={styles.toggleTitle}>Accept 15+ Mile Requests</Text>
            </View>
            <Text style={styles.toggleDescription}>
              Enable this to receive booking requests from customers more than 15 miles away. These are special requests with higher travel fees.
            </Text>
          </View>
          <Switch
            value={acceptsOver15Miles}
            onValueChange={setAcceptsOver15Miles}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={acceptsOver15Miles ? colors.primary : colors.textSecondary}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveTravelSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.black} />
          ) : (
            <Text style={styles.saveButtonText}>Save Settings</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  policyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  policyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  policySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  feesList: {
    gap: spacing.xs,
  },
  feeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  feeItemLast: {
    borderBottomWidth: 0,
  },
  feeDistance: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  feeAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  feeAmountSpecial: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.info,
  },
  infoList: {
    gap: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  toggleCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  toggleTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  toggleDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  saveButtonText: {
    color: colors.black,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});

