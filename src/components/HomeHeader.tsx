import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../constants/theme';
import NotificationBell from './NotificationBell';
import { supabase } from '../services/supabase';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 0);
const HEADER_HEIGHT = 118; // Taller to accommodate larger search bar
export const HOME_HEADER_HEIGHT = STATUS_BAR_HEIGHT + HEADER_HEIGHT;

interface HomeHeaderProps {
  onSearchPress?: () => void;
  onFilterPress?: () => void;
  onLocationPress?: () => void;
}

export default function HomeHeader({
  onSearchPress,
  onFilterPress,
  onLocationPress,
}: HomeHeaderProps) {
  const [locationCity, setLocationCity] = useState<string>('');
  const [locationState, setLocationState] = useState<string>('');

  const fetchLocation = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.id) {
        setLocationCity('');
        setLocationState('');
        return;
      }

      const { data } = await supabase
        .from('customer_profiles')
        .select('location_city, location_state')
        .eq('id', profile.id)
        .single();

      if (data) {
        setLocationCity(data.location_city || '');
        setLocationState(data.location_state || '');
      } else {
        setLocationCity('');
        setLocationState('');
      }
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  useFocusEffect(
    useCallback(() => {
      fetchLocation();
    }, [fetchLocation])
  );

  const locationLabel =
    locationCity
      ? `${locationCity}${locationState ? `, ${locationState}` : ''}`
      : 'Set your location';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Row 1: Location + Notification Bell */}
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.locationContainer} onPress={onLocationPress} activeOpacity={0.7}>
            <Text style={styles.locationLabel}>Your location</Text>
            <View style={styles.locationValueRow}>
              <Ionicons name="location-sharp" size={14} color={colors.primaryDarker} />
              <Text style={styles.locationValue} numberOfLines={1}>
                {locationLabel}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <NotificationBell />
        </View>

        {/* Row 2: Search bar + Filter button */}
        <View style={styles.searchRow}>
          <TouchableOpacity style={styles.searchBar} onPress={onSearchPress} activeOpacity={0.8}>
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.searchPlaceholder}>Search services, providers…</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterButton} onPress={onFilterPress} activeOpacity={0.8}>
            <Ionicons name="options-outline" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HOME_HEADER_HEIGHT,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 1000,
    ...shadows.sm,
  },
  content: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationContainer: {
    flex: 1,
    paddingRight: spacing.md,
  },
  locationLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  locationValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.full,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  searchPlaceholder: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    flex: 1,
  },
  filterButton: {
    backgroundColor: colors.primaryDarker,
    borderRadius: borderRadius.md,
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
