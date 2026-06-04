import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { supabase } from '../../services/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';

interface AnalyticsStats {
  completedBookings: number;
  pendingBookings: number;
  approvedProviders: number;
  pendingCustomServices: number;
}

export default function AdminAnalyticsScreen() {
  const [stats, setStats] = useState<AnalyticsStats>({
    completedBookings: 0,
    pendingBookings: 0,
    approvedProviders: 0,
    pendingCustomServices: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const [completed, pending, approvedProviders, pendingCustomServices] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['pending', 'confirmed']),
        supabase.from('provider_profiles').select('id', { count: 'exact', head: true }).eq('is_verified', true),
        supabase.from('provider_services').select('id', { count: 'exact', head: true }).eq('custom_service_status', 'pending'),
      ]);

      setStats({
        completedBookings: completed.count || 0,
        pendingBookings: pending.count || 0,
        approvedProviders: approvedProviders.count || 0,
        pendingCustomServices: pendingCustomServices.count || 0,
      });
    } catch (error) {
      console.error('Failed to load admin analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
        setRefreshing(true);
        fetchAnalytics();
      }} />}
    >
      <Text style={styles.title}>Analytics Snapshot</Text>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.value}>{stats.completedBookings}</Text>
          <Text style={styles.label}>Completed Bookings</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.value}>{stats.pendingBookings}</Text>
          <Text style={styles.label}>Pending Bookings</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.value}>{stats.approvedProviders}</Text>
          <Text style={styles.label}>Approved Providers</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.value}>{stats.pendingCustomServices}</Text>
          <Text style={styles.label}>Pending Custom Services</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  content: {
    padding: spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  value: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});