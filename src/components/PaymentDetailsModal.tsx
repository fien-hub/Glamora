import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../constants/theme';

interface PaymentDetailsModalProps {
  visible: boolean;
  paymentId: string | null;
  onClose: () => void;
  onRefundRequest?: () => void;
}

interface PaymentDetails {
  id: string;
  amount: number;
  currency: string;
  status: string;
  platform_fee: number;
  refund_amount: number;
  refund_reason: string | null;
  payment_method: string;
  last_four: string;
  card_brand: string;
  created_at: string;
  refunded_at: string | null;
  booking: {
    id: string;
    scheduled_date: string;
    scheduled_time: string;
    total_price: number;
    status: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    customer: {
      profiles: {
        first_name: string;
        last_name: string;
      };
    };
    provider: {
      business_name: string;
      profiles: {
        first_name: string;
        last_name: string;
      };
    };
    provider_service: {
      service: {
        name: string;
        description: string;
        service_category: {
          name: string;
        };
      };
      duration_minutes: number;
      base_price: number;
    };
  };
}

export default function PaymentDetailsModal({
  visible,
  paymentId,
  onClose,
  onRefundRequest,
}: PaymentDetailsModalProps) {
  const { user } = useAuth();
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && paymentId) {
      fetchPaymentDetails();
    }
  }, [visible, paymentId]);

  const fetchPaymentDetails = async () => {
    if (!paymentId) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/payments/details/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setPayment(data.payment);
      } else {
        throw new Error(data.error || 'Failed to fetch payment details');
      }
    } catch (error: any) {
      console.error('Error fetching payment details:', error);
      Alert.alert('Error', error.message || 'Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRefund = () => {
    Alert.alert(
      'Request Refund',
      'Are you sure you want to request a refund for this payment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Refund',
          style: 'destructive',
          onPress: () => {
            onClose();
            onRefundRequest?.();
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Payment Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : payment ? (
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Status Badge */}
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payment.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(payment.status) }]}>
                  {payment.status.toUpperCase()}
                </Text>
              </View>

              {/* Amount Section */}
              <View style={styles.section}>
                <Text style={styles.amountLabel}>Total Amount</Text>
                <Text style={styles.amountValue}>{formatCurrency(payment.amount)}</Text>
              </View>

              {/* Service Details */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Service Details</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Service:</Text>
                  <Text style={styles.detailValue}>
                    {payment.booking?.provider_service?.service?.name || 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Category:</Text>
                  <Text style={styles.detailValue}>
                    {payment.booking?.provider_service?.service?.service_category?.name || 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Duration:</Text>
                  <Text style={styles.detailValue}>
                    {payment.booking?.provider_service?.duration_minutes || 0} minutes
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Provider:</Text>
                  <Text style={styles.detailValue}>
                    {payment.booking?.provider?.business_name || 'N/A'}
                  </Text>
                </View>
              </View>

              {/* Booking Details */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Booking Details</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>
                    {payment.booking?.scheduled_date || 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Time:</Text>
                  <Text style={styles.detailValue}>
                    {payment.booking?.scheduled_time || 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={[styles.detailValue, { flex: 1, textAlign: 'right' }]}>
                    {payment.booking?.address}, {payment.booking?.city}, {payment.booking?.state} {payment.booking?.zip_code}
                  </Text>
                </View>
              </View>

              {/* Payment Details */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Payment Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(payment.created_at)}</Text>
                </View>
                {payment.payment_method && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment Method:</Text>
                    <Text style={styles.detailValue}>
                      {payment.card_brand ? `${payment.card_brand} ••••${payment.last_four}` : payment.payment_method}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Transaction ID:</Text>
                  <Text style={[styles.detailValue, { fontSize: fontSize.xs }]}>
                    {payment.id.substring(0, 8)}...
                  </Text>
                </View>
              </View>

              {/* Price Breakdown */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Price Breakdown</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Service Price:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(payment.amount)}</Text>
                </View>
                {payment.platform_fee > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Platform Fee:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(payment.platform_fee)}</Text>
                  </View>
                )}
                <View style={[styles.detailRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Paid:</Text>
                  <Text style={styles.totalValue}>{formatCurrency(payment.amount)}</Text>
                </View>
              </View>

              {/* Refund Information */}
              {payment.refund_amount > 0 && (
                <View style={[styles.section, styles.refundSection]}>
                  <Text style={styles.sectionTitle}>Refund Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Refund Amount:</Text>
                    <Text style={[styles.detailValue, { color: colors.error }]}>
                      {formatCurrency(payment.refund_amount)}
                    </Text>
                  </View>
                  {payment.refund_reason && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Reason:</Text>
                      <Text style={[styles.detailValue, { flex: 1, textAlign: 'right' }]}>
                        {payment.refund_reason}
                      </Text>
                    </View>
                  )}
                  {payment.refunded_at && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Refunded On:</Text>
                      <Text style={styles.detailValue}>{formatDate(payment.refunded_at)}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Request Refund Button */}
              {payment.status === 'succeeded' && payment.refund_amount === 0 && onRefundRequest && (
                <TouchableOpacity
                  style={styles.refundButton}
                  onPress={handleRequestRefund}
                >
                  <Text style={styles.refundButtonText}>Request Refund</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load payment details</Text>
            </View>
          )}
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    fontSize: fontSize.xl,
    color: colors.textSecondary,
  },
  loadingContainer: {
    padding: spacing.xxl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
  },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    marginBottom: spacing.lg,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  amountLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  amountValue: {
    fontSize: fontSize.xxl * 1.5,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: 'right',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  refundSection: {
    backgroundColor: colors.error + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  refundButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  refundButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.surface,
  },
  errorContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
  },
});
