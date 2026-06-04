import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { FLOATING_TAB_BAR_TOTAL_HEIGHT } from '../../components/FloatingTabBar';

interface Stats {
  totalUsers: number;
  totalProviders: number;
  totalCustomers: number;
  pendingVerifications: number;
  totalBookings: number;
  totalRevenue: number;
  activeBookings: number;
}

export default function AdminDashboardScreen() {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProviders: 0,
    totalCustomers: 0,
    pendingVerifications: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeBookings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch provider accounts (signup-level source of truth)
      const { data: providerUsers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'provider');

      const totalProviders = providerUsers?.length || 0;

      // Fetch customers
      const { count: totalCustomers } = await supabase
        .from('customer_profiles')
        .select('*', { count: 'exact', head: true });

      // Count pending verifications: all provider accounts minus verified ones
      // This includes newly signed-up providers that haven't created profiles yet
      let pendingVerifications = totalProviders;

      // Subtract verified providers from the count
      const { count: verifiedCount } = await supabase
        .from('provider_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_verified', true);

      pendingVerifications = Math.max(0, pendingVerifications - (verifiedCount || 0));

      // Fetch total bookings
      const { count: totalBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      // Fetch active bookings
      const { count: activeBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'confirmed']);

      // Fetch total revenue
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'succeeded');

      const totalRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

      setStats({
        totalUsers: totalUsers || 0,
        totalProviders: totalProviders || 0,
        totalCustomers: totalCustomers || 0,
        pendingVerifications,
        totalBookings: totalBookings || 0,
        totalRevenue,
        activeBookings: activeBookings || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      bounces={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>Platform Overview</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.primaryCard]}>
          <Text style={styles.statValue}>{stats.totalUsers}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>

        <View style={[styles.statCard, styles.successCard]}>
          <Text style={styles.statValue}>{stats.totalProviders}</Text>
          <Text style={styles.statLabel}>Providers</Text>
        </View>

        <View style={[styles.statCard, styles.infoCard]}>
          <Text style={styles.statValue}>{stats.totalCustomers}</Text>
          <Text style={styles.statLabel}>Customers</Text>
        </View>

        <View style={[styles.statCard, styles.warningCard]}>
          <Text style={styles.statValue}>{stats.pendingVerifications}</Text>
          <Text style={styles.statLabel}>Pending Verifications</Text>
        </View>
      </View>

      {/* Bookings & Revenue */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bookings & Revenue</Text>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Total Bookings</Text>
            <Text style={styles.cardValue}>{stats.totalBookings}</Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Active Bookings</Text>
            <Text style={[styles.cardValue, styles.successText]}>
              {stats.activeBookings}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Total Revenue</Text>
            <Text style={[styles.cardValue, styles.primaryText]}>
              ${(stats.totalRevenue / 100).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CustomServiceReview')}
        >
          <Text style={styles.actionButtonText}>🧾 Review Custom Services</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ProviderApproval')}
        >
          <Text style={styles.actionButtonText}>
            🔍 Review Pending Verifications ({stats.pendingVerifications})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AdminUsers')}
        >
          <Text style={styles.actionButtonText}>👥 Manage Users</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AdminAnalytics')}
        >
          <Text style={styles.actionButtonText}>📊 View Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AdminProfile')}
        >
          <Text style={styles.actionButtonText}>⚙️ Platform Settings</Text>
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
  contentContainer: {
    paddingBottom: FLOATING_TAB_BAR_TOTAL_HEIGHT + spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
  },
  header: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.md,
  },
  statCard: {
    width: '48%',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  primaryCard: {
    backgroundColor: colors.primary + '15',
  },
  successCard: {
    backgroundColor: colors.success + '15',
  },
  infoCard: {
    backgroundColor: colors.info + '15',
  },
  warningCard: {
    backgroundColor: colors.warning + '15',
  },
  statValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cardLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  cardValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  successText: {
    color: colors.success,
  },
  primaryText: {
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
});

