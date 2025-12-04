import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { useScreenTracking } from '../../hooks/useScreenTracking';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  platform_fee: number;
  refund_amount: number;
  payment_method: string;
  last_four: string;
  card_brand: string;
  created_at: string;
  booking: {
    id: string;
    scheduled_date: string;
    scheduled_time: string;
    provider: {
      business_name: string;
    };
    provider_service: {
      service: {
        name: string;
        description: string;
        service_category: {
          name: string;
        };
      };
    };
  };
}

interface PaymentStats {
  totalSpent: number;
  totalRefunded: number;
  successfulPayments: number;
  pendingPayments: number;
  thisMonthSpent: number;
  totalPayments: number;
}

export default function PaymentHistoryScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'succeeded' | 'pending' | 'refunded'>('all');

  useScreenTracking('Payment History');

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [filter]);

  const fetchPayments = async () => {
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = new URL(`${process.env.EXPO_PUBLIC_API_URL}/api/payments/customer/history`);
      if (filter !== 'all') {
        url.searchParams.append('status', filter);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setPayments(data.payments || []);
      } else {
        throw new Error(data.error || 'Failed to fetch payments');
      }
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      Alert.alert('Error', error.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/payments/customer/stats`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setStats(data);
      }
    } catch (error: any) {
      console.error('Error fetching payment stats:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPayments();
    fetchStats();
  };

  const handlePaymentPress = (payment: Payment) => {
    (navigation as any).navigate('PaymentDetails', { paymentId: payment.id });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded': return colors.success;
      case 'pending': return colors.warning;
      case 'failed': return colors.error;
      case 'refunded': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const renderPaymentItem = ({ item }: { item: Payment }) => (
    <TouchableOpacity
      style={styles.paymentCard}
      onPress={() => handlePaymentPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.paymentHeader}>
        <View style={styles.paymentHeaderLeft}>
          <Text style={styles.serviceName}>
            {item.booking?.provider_service?.service?.name || 'Service'}
          </Text>
          <Text style={styles.providerName}>
            {item.booking?.provider?.business_name || 'Provider'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.paymentDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount:</Text>
          <Text style={styles.detailValue}>{formatCurrency(item.amount)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>{formatDate(item.created_at)}</Text>
        </View>
        {item.payment_method && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment:</Text>
            <Text style={styles.detailValue}>
              {item.card_brand ? `${item.card_brand} ••••${item.last_four}` : item.payment_method}
            </Text>
          </View>
        )}
        {item.refund_amount > 0 && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.error }]}>Refunded:</Text>
            <Text style={[styles.detailValue, { color: colors.error }]}>
              {formatCurrency(item.refund_amount)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.viewDetailsButton}>
        <Text style={styles.viewDetailsText}>View Details →</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Summary */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(stats.totalSpent)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(stats.thisMonthSpent)}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.successfulPayments}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'succeeded' && styles.filterTabActive]}
          onPress={() => setFilter('succeeded')}
        >
          <Text style={[styles.filterText, filter === 'succeeded' && styles.filterTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'refunded' && styles.filterTabActive]}
          onPress={() => setFilter('refunded')}
        >
          <Text style={[styles.filterText, filter === 'refunded' && styles.filterTextActive]}>
            Refunded
          </Text>
        </TouchableOpacity>
      </View>

      {/* Payments List */}
      <FlatList
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No payments found</Text>
            <Text style={styles.emptySubtext}>
              Your payment history will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.primarySubtle,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.softPink, // Soft pink/salmon for tab buttons
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.surface,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  paymentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  paymentHeaderLeft: {
    flex: 1,
  },
  serviceName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  providerName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  paymentDetails: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  viewDetailsButton: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewDetailsText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
