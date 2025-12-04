import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import AddPaymentMethodModal from '../../components/AddPaymentMethodModal';

interface PaymentMethod {
  id: string;
  card_brand: string;
  last_four: string;
  exp_month: number;
  exp_year: number;
  cardholder_name: string | null;
  is_default: boolean;
  created_at: string;
}

export default function PaymentMethodsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/payment-methods`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setPaymentMethods(data.paymentMethods || []);
      } else {
        throw new Error(data.error || 'Failed to fetch payment methods');
      }
    } catch (error: any) {
      console.error('Error fetching payment methods:', error);
      Alert.alert('Error', error.message || 'Failed to load payment methods');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPaymentMethods();
  };

  const handleAddPaymentMethod = () => {
    setShowAddModal(true);
  };

  const handleAddSuccess = () => {
    fetchPaymentMethods();
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/payment-methods/${paymentMethodId}/default`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Default payment method updated');
        fetchPaymentMethods();
      } else {
        throw new Error(data.error || 'Failed to set default payment method');
      }
    } catch (error: any) {
      console.error('Error setting default payment method:', error);
      Alert.alert('Error', error.message || 'Failed to update default payment method');
    }
  };

  const handleDelete = async (paymentMethodId: string, isDefault: boolean) => {
    if (isDefault) {
      Alert.alert(
        'Cannot Delete',
        'You cannot delete your default payment method. Please set another card as default first.'
      );
      return;
    }

    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;

              const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/api/payment-methods/${paymentMethodId}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                  },
                }
              );

              const data = await response.json();

              if (response.ok) {
                Alert.alert('Success', 'Payment method deleted');
                fetchPaymentMethods();
              } else {
                throw new Error(data.error || 'Failed to delete payment method');
              }
            } catch (error: any) {
              console.error('Error deleting payment method:', error);
              Alert.alert('Error', error.message || 'Failed to delete payment method');
            }
          },
        },
      ]
    );
  };

  const getCardBrandIcon = (brand: string) => {
    const brandLower = brand.toLowerCase();
    if (brandLower === 'visa') return '💳';
    if (brandLower === 'mastercard') return '💳';
    if (brandLower === 'amex') return '💳';
    if (brandLower === 'discover') return '💳';
    return '💳';
  };

  const renderPaymentMethod = ({ item }: { item: PaymentMethod }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardIcon}>{getCardBrandIcon(item.card_brand)}</Text>
          <View style={styles.cardDetails}>
            <Text style={styles.cardBrand}>
              {item.card_brand.charAt(0).toUpperCase() + item.card_brand.slice(1)} •••• {item.last_four}
            </Text>
            <Text style={styles.cardExpiry}>
              Expires {item.exp_month.toString().padStart(2, '0')}/{item.exp_year}
            </Text>
            {item.cardholder_name && (
              <Text style={styles.cardHolder}>{item.cardholder_name}</Text>
            )}
          </View>
        </View>
        {item.is_default && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultText}>Default</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        {!item.is_default && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSetDefault(item.id)}
          >
            <Text style={styles.actionButtonText}>Set as Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id, item.is_default)}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading payment methods...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Methods</Text>
        <Text style={styles.subtitle}>Manage your saved payment methods</Text>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleAddPaymentMethod}>
        <Text style={styles.addButtonIcon}>+</Text>
        <Text style={styles.addButtonText}>Add Payment Method</Text>
      </TouchableOpacity>

      {paymentMethods.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💳</Text>
          <Text style={styles.emptyTitle}>No Payment Methods</Text>
          <Text style={styles.emptyText}>
            Add a payment method to make booking services easier
          </Text>
        </View>
      ) : (
        <FlatList
          data={paymentMethods}
          renderItem={renderPaymentMethod}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
            />
          }
        />
      )}

      <AddPaymentMethodModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.small,
  },
  addButtonIcon: {
    fontSize: fontSize.xl,
    color: colors.black,
    marginRight: spacing.sm,
    fontWeight: fontWeight.bold,
  },
  addButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  listContainer: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  cardDetails: {
    flex: 1,
  },
  cardBrand: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardExpiry: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  cardHolder: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  defaultBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  defaultText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  deleteButton: {
    borderColor: colors.error,
  },
  deleteButtonText: {
    color: colors.error,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

