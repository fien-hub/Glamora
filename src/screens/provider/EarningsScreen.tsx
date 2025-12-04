import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, fontSize } from '../../constants/theme';
import { getAccountStatus, createConnectedAccount, getAccountOnboardingLink } from '../../services/stripe';
import FadeInView from '../../components/animations/FadeInView';
import SlideUpView from '../../components/animations/SlideUpView';

interface EarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  paidOut: number;
  thisMonth: number;
  lastMonth: number;
}

interface Transaction {
  id: string;
  booking_id: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  status: string;
  created_at: string;
  service_name: string;
  customer_name: string;
}

export default function EarningsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<EarningsSummary>({
    totalEarnings: 0,
    pendingEarnings: 0,
    paidOut: 0,
    thisMonth: 0,
    lastMonth: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeAccountStatus, setStripeAccountStatus] = useState<any>(null);

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Check Stripe connection status
      try {
        const status = await getAccountStatus();
        setStripeAccountStatus(status);
        setStripeConnected(status.connected && status.chargesEnabled);
      } catch (error) {
        console.log('No Stripe account connected yet');
        setStripeConnected(false);
      }

      // Fetch all completed bookings with payments
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          total_price,
          created_at,
          status,
          customer:customer_profiles!customer_id (
            profiles!inner (first_name, last_name)
          ),
          provider_service:provider_services!provider_service_id (
            service:services (name)
          ),
          payment:payments (
            id,
            amount,
            platform_fee,
            status,
            created_at
          )
        `)
        .eq('provider_id', profile.id)
        .in('status', ['confirmed', 'completed'])
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Calculate earnings summary
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const lastMonthNum = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      let totalEarnings = 0;
      let pendingEarnings = 0;
      let paidOut = 0;
      let thisMonth = 0;
      let lastMonth = 0;

      const transactionsList: Transaction[] = [];

      bookingsData?.forEach((booking: any) => {
        const payment = booking.payment?.[0];
        if (!payment) return;

        const amount = payment.amount;
        const platformFee = payment.platform_fee || amount * 0.1;
        const netAmount = amount - platformFee;

        const bookingDate = new Date(booking.created_at);
        const bookingMonth = bookingDate.getMonth();
        const bookingYear = bookingDate.getFullYear();

        totalEarnings += netAmount;

        if (payment.status === 'succeeded') {
          paidOut += netAmount;
        } else if (payment.status === 'pending') {
          pendingEarnings += netAmount;
        }

        if (bookingMonth === currentMonth && bookingYear === currentYear) {
          thisMonth += netAmount;
        }

        if (bookingMonth === lastMonthNum && bookingYear === lastMonthYear) {
          lastMonth += netAmount;
        }

        transactionsList.push({
          id: payment.id,
          booking_id: booking.id,
          amount: amount,
          platform_fee: platformFee,
          net_amount: netAmount,
          status: payment.status,
          created_at: payment.created_at,
          service_name: booking.provider_service?.service?.name || 'Service',
          customer_name: `${booking.customer?.profiles?.first_name || ''} ${booking.customer?.profiles?.last_name || ''}`.trim() || 'Customer',
        });
      });

      setSummary({
        totalEarnings,
        pendingEarnings,
        paidOut,
        thisMonth,
        lastMonth,
      });

      setTransactions(transactionsList);
    } catch (error: any) {
      console.error('Error fetching earnings:', error);
      Alert.alert('Error', error.message || 'Failed to load earnings data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEarningsData();
  };

  const handleConnectStripe = async () => {
    try {
      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('user_id', user?.id)
        .single();

      const { data: providerProfile } = await supabase
        .from('provider_profiles')
        .select('business_name')
        .eq('id', profile?.id)
        .single();

      const businessName = providerProfile?.business_name || `${profile?.first_name} ${profile?.last_name}`;

      // Create Stripe Connect account
      await createConnectedAccount(user?.email || '', businessName);

      // Get onboarding link
      const { url } = await getAccountOnboardingLink();

      // Open Stripe onboarding
      await Linking.openURL(url);

      Alert.alert(
        'Stripe Connect',
        'Complete the onboarding process in your browser. Once done, return to the app and refresh this page.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error connecting Stripe:', error);
      Alert.alert('Error', error.message || 'Failed to connect Stripe account');
    }
  };

  const handleManageStripe = async () => {
    try {
      const { url } = await getAccountOnboardingLink();
      await Linking.openURL(url);
    } catch (error: any) {
      console.error('Error opening Stripe dashboard:', error);
      Alert.alert('Error', error.message || 'Failed to open Stripe dashboard');
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'failed':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'refunded':
        return 'Refunded';
      default:
        return status;
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
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      {/* Stripe Connection Status */}
      {!stripeConnected && (
        <View style={styles.stripeWarning}>
          <Text style={styles.stripeWarningTitle}>💳 Connect Stripe to Receive Payments</Text>
          <Text style={styles.stripeWarningText}>
            You need to connect your Stripe account to receive payouts for your bookings.
          </Text>
          <TouchableOpacity style={styles.connectButton} onPress={handleConnectStripe}>
            <Text style={styles.connectButtonText}>Connect Stripe Account</Text>
          </TouchableOpacity>
        </View>
      )}

      {stripeConnected && stripeAccountStatus && (
        <View style={styles.stripeConnected}>
          <Text style={styles.stripeConnectedText}>
            ✅ Stripe Connected
            {stripeAccountStatus.payoutsEnabled ? ' • Payouts Enabled' : ' • Payouts Pending'}
          </Text>
          <TouchableOpacity onPress={handleManageStripe}>
            <Text style={styles.manageLink}>Manage Account →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Earnings Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.sectionTitle}>Earnings Summary</Text>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.primaryCard]}>
            <Text style={styles.summaryLabel}>Total Earnings</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.totalEarnings)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Paid Out</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(summary.paidOut)}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>
              {formatCurrency(summary.pendingEarnings)}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.thisMonth)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Last Month</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.lastMonth)}</Text>
          </View>
        </View>
      </View>

      {/* Transaction History */}
      <View style={styles.transactionsContainer}>
        <Text style={styles.sectionTitle}>Transaction History</Text>

        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No transactions yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Your earnings will appear here once you complete bookings
            </Text>
          </View>
        ) : (
          transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionService}>{transaction.service_name}</Text>
                  <Text style={styles.transactionCustomer}>{transaction.customer_name}</Text>
                  <Text style={styles.transactionDate}>{formatDate(transaction.created_at)}</Text>
                </View>
                <View style={styles.transactionAmounts}>
                  <Text style={styles.transactionAmount}>{formatCurrency(transaction.net_amount)}</Text>
                  <Text
                    style={[
                      styles.transactionStatus,
                      { color: getStatusColor(transaction.status) },
                    ]}
                  >
                    {getStatusText(transaction.status)}
                  </Text>
                </View>
              </View>
              <View style={styles.transactionBreakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Booking Amount:</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(transaction.amount)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Platform Fee (10%):</Text>
                  <Text style={[styles.breakdownValue, { color: colors.error }]}>
                    -{formatCurrency(transaction.platform_fee)}
                  </Text>
                </View>
                <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                  <Text style={styles.breakdownLabelBold}>Your Earnings:</Text>
                  <Text style={styles.breakdownValueBold}>
                    {formatCurrency(transaction.net_amount)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
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
  stripeWarning: {
    backgroundColor: colors.warning + '15',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: 8,
  },
  stripeWarningTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  stripeWarningText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  connectButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButtonText: {
    color: colors.black,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  stripeConnected: {
    backgroundColor: colors.success + '15',
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stripeConnectedText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.success,
  },
  manageLink: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '600',
  },
  summaryContainer: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: 12,
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryCard: {
    width: '100%',
    backgroundColor: colors.primary + '10',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  transactionsContainer: {
    padding: spacing.lg,
  },
  emptyState: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  transactionCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionService: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  transactionCustomer: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  transactionDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  transactionAmounts: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  transactionStatus: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  transactionBreakdown: {
    gap: spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  breakdownTotal: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  breakdownLabelBold: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  breakdownValueBold: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.primary,
  },
});

