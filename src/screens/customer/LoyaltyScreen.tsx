import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
let Clipboard: typeof import('expo-clipboard') = {} as any;
try { Clipboard = require('expo-clipboard'); } catch (e) { console.warn('[LoyaltyScreen] expo-clipboard unavailable:', e); }
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { colors, spacing, fontSize, borderRadius } from '../../constants/theme';
import { useScreenTracking } from '../../hooks/useScreenTracking';

interface LoyaltyPoints {
  points: number;
  lifetimePoints: number;
}

interface Transaction {
  id: string;
  points: number;
  transactionType: 'earned' | 'redeemed' | 'expired';
  description: string;
  createdAt: string;
}

interface PromoCode {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
}

export default function LoyaltyScreen() {
  const { user } = useAuth();
  const [loyaltyPoints, setLoyaltyPoints] = useState<LoyaltyPoints | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applyingCode, setApplyingCode] = useState(false);

  // Track screen view
  useScreenTracking('Loyalty & Rewards');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get profile id
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profileData) return;

      // Fetch loyalty points
      const { data: pointsData } = await supabase
        .from('loyalty_points')
        .select('points, lifetime_points')
        .eq('customer_id', profileData.id)
        .single();

      if (pointsData) {
        setLoyaltyPoints({
          points: pointsData.points,
          lifetimePoints: pointsData.lifetime_points,
        });
      } else {
        // Create loyalty points record if doesn't exist
        await supabase.from('loyalty_points').insert({
          customer_id: profileData.id,
          points: 0,
          lifetime_points: 0,
        });
        setLoyaltyPoints({ points: 0, lifetimePoints: 0 });
      }

      // Fetch transactions
      const { data: transactionsData } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('customer_id', profileData.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setTransactions(transactionsData || []);

      // Fetch active promo codes
      const { data: promoData } = await supabase
        .from('promo_codes')
        .select('code, description, discount_type, discount_value')
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .limit(5);

      setPromoCodes(promoData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleApplyPromoCode = async () => {
    if (!promoCodeInput.trim()) {
      Alert.alert('Error', 'Please enter a promo code');
      return;
    }

    setApplyingCode(true);
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCodeInput.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        Alert.alert('Invalid Code', 'This promo code is not valid or has expired');
        return;
      }

      // Check if already used
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profileData) {
        const { data: usageData } = await supabase
          .from('promo_code_usage')
          .select('id')
          .eq('promo_code_id', data.id)
          .eq('customer_id', profileData.id);

        if (usageData && usageData.length > 0) {
          Alert.alert('Already Used', 'You have already used this promo code');
          return;
        }
      }

      Alert.alert(
        'Valid Code!',
        `${data.description}\n\nDiscount: ${
          data.discount_type === 'percentage'
            ? `${data.discount_value}%`
            : `$${data.discount_value}`
        }\n\nThis code will be applied at checkout.`,
        [{ text: 'OK' }]
      );
      setPromoCodeInput('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to validate promo code');
    } finally {
      setApplyingCode(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return '✅';
      case 'redeemed':
        return '🎁';
      case 'expired':
        return '⏰';
      default:
        return '•';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earned':
        return colors.success;
      case 'redeemed':
        return colors.primary;
      case 'expired':
        return colors.error;
      default:
        return colors.textSecondary;
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
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Points Card */}
      <View style={styles.pointsCard}>
        <View style={styles.pointsHeader}>
          <Text style={styles.pointsLabel}>Your Points</Text>
          <Text style={styles.pointsValue}>{loyaltyPoints?.points || 0}</Text>
        </View>
        <View style={styles.pointsDivider} />
        <View style={styles.lifetimePoints}>
          <Text style={styles.lifetimeLabel}>Lifetime Points Earned</Text>
          <Text style={styles.lifetimeValue}>{loyaltyPoints?.lifetimePoints || 0}</Text>
        </View>
        <Text style={styles.pointsInfo}>
          💡 Earn 1 point for every $1 spent. Redeem 100 points for $10 off!
        </Text>
      </View>

      {/* Promo Code Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Have a Promo Code?</Text>
        <View style={styles.promoInputContainer}>
          <TextInput
            style={styles.promoInput}
            value={promoCodeInput}
            onChangeText={(text) => setPromoCodeInput(text.toUpperCase())}
            placeholder="Enter code"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApplyPromoCode}
            disabled={applyingCode}
          >
            {applyingCode ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.applyButtonText}>Apply</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Available Promo Codes */}
      {promoCodes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Offers</Text>
          {promoCodes.map((promo, index) => (
            <View key={index} style={styles.promoCard}>
              <View style={styles.promoIcon}>
                <Text style={styles.promoIconText}>🎟️</Text>
              </View>
              <View style={styles.promoInfo}>
                <Text style={styles.promoCode}>{promo.code}</Text>
                <Text style={styles.promoDescription}>{promo.description}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={async () => {
                  await Clipboard.setStringAsync(promo.code);
                  setPromoCodeInput(promo.code);
                  Alert.alert('Copied!', `Code ${promo.code} copied to clipboard`);
                }}
              >
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Transaction History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Points History</Text>
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionIcon}>
                <Text style={styles.transactionIconText}>
                  {getTransactionIcon(transaction.transactionType)}
                </Text>
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDescription}>
                  {transaction.description}
                </Text>
                <Text style={styles.transactionDate}>
                  {new Date(transaction.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text
                style={[
                  styles.transactionPoints,
                  { color: getTransactionColor(transaction.transactionType) },
                ]}
              >
                {transaction.transactionType === 'earned' ? '+' : '-'}
                {transaction.points}
              </Text>
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
  },
  pointsCard: {
    backgroundColor: colors.primary,
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
  },
  pointsHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pointsLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: fontSize.md,
    marginBottom: spacing.xs,
  },
  pointsValue: {
    color: colors.black,
    fontSize: 48,
    fontWeight: 'bold',
  },
  pointsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginVertical: spacing.md,
  },
  lifetimePoints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  lifetimeLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: fontSize.sm,
  },
  lifetimeValue: {
    color: colors.black,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  pointsInfo: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  promoInputContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  promoInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  applyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  applyButtonText: {
    color: colors.black,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promoIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  promoIconText: {
    fontSize: fontSize.xl,
  },
  promoInfo: {
    flex: 1,
  },
  promoCode: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  promoDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  copyButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  copyButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  transactionIconText: {
    fontSize: fontSize.lg,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  transactionDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  transactionPoints: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
