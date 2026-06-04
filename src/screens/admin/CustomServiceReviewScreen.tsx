import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { supabase } from '../../services/supabase';
import { colors, spacing, fontSize, borderRadius } from '../../constants/theme';

interface PendingService {
  id: string;
  provider_id: string;
  custom_service_name: string;
  description: string;
  base_price: number;
  duration_minutes: number;
  created_at: string;
  provider_name: string;
  provider_email: string;
  business_name: string;
}

export default function CustomServiceReviewScreen() {
  const [pendingServices, setPendingServices] = useState<PendingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingServices();
  }, []);

  const fetchPendingServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('provider_services')
        .select(`
          id,
          provider_id,
          custom_service_name,
          description,
          base_price,
          duration_minutes,
          created_at,
          provider_profiles!provider_id (
            business_name,
            profiles!inner (
              first_name,
              last_name
            )
          )
        `)
        .not('custom_service_name', 'is', null)
        .eq('custom_service_status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formatted = data?.map((item: any) => ({
        id: item.id,
        provider_id: item.provider_id,
        custom_service_name: item.custom_service_name,
        description: item.description || 'No description',
        base_price: item.base_price,
        duration_minutes: item.duration_minutes,
        created_at: item.created_at,
        provider_name: [
          item.provider_profiles?.profiles?.first_name,
          item.provider_profiles?.profiles?.last_name,
        ]
          .filter(Boolean)
          .join(' ') || 'Unknown',
        provider_email: 'Unknown',
        business_name: item.provider_profiles?.business_name || 'Unknown',
      })) || [];

      setPendingServices(formatted);
    } catch (error) {
      console.error('Error fetching pending services:', error);
      Alert.alert('Error', 'Failed to load pending services');
    } finally {
      setLoading(false);
    }
  };

  const approveService = async (serviceId: string) => {
    try {
      const { error } = await supabase.rpc('approve_custom_service', {
        service_id: serviceId,
      });

      if (error) throw error;

      Alert.alert('Success', 'Service approved!');
      fetchPendingServices();
    } catch (error) {
      console.error('Error approving service:', error);
      Alert.alert('Error', 'Failed to approve service');
    }
  };

  const rejectService = async (serviceId: string, reason: string) => {
    if (!reason.trim()) {
      Alert.alert('Required', 'Please provide a rejection reason');
      return;
    }

    try {
      const { error } = await supabase.rpc('reject_custom_service', {
        service_id: serviceId,
        rejection_reason: reason,
      });

      if (error) throw error;

      Alert.alert('Success', 'Service rejected');
      setSelectedServiceId(null);
      setRejectionReason('');
      fetchPendingServices();
    } catch (error) {
      console.error('Error rejecting service:', error);
      Alert.alert('Error', 'Failed to reject service');
    }
  };

  const renderService = ({ item }: { item: PendingService }) => (
    <View style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <Text style={styles.serviceName}>{item.custom_service_name}</Text>
        <Text style={styles.serviceDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.providerInfo}>
        Provider: {item.business_name} ({item.provider_name})
      </Text>
      <Text style={styles.providerEmail}>{item.provider_email}</Text>

      <Text style={styles.serviceDescription}>{item.description}</Text>

      <View style={styles.serviceDetails}>
        <Text style={styles.detailText}>
          Price: ${(item.base_price / 100).toFixed(2)}
        </Text>
        <Text style={styles.detailText}>Duration: {item.duration_minutes} min</Text>
      </View>

      {selectedServiceId === item.id ? (
        <View style={styles.rejectionContainer}>
          <TextInput
            style={styles.rejectionInput}
            value={rejectionReason}
            onChangeText={setRejectionReason}
            placeholder="Reason for rejection..."
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          <View style={styles.rejectionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setSelectedServiceId(null);
                setRejectionReason('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={() => rejectService(item.id, rejectionReason)}
            >
              <Text style={styles.rejectButtonText}>Confirm Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.approveButton]}
            onPress={() => approveService(item.id)}
          >
            <Text style={styles.approveButtonText}>✓ Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.rejectButton]}
            onPress={() => setSelectedServiceId(item.id)}
          >
            <Text style={styles.rejectButtonText}>✕ Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Custom Service Review</Text>
        <Text style={styles.subtitle}>
          {pendingServices.length} service{pendingServices.length !== 1 ? 's' : ''} pending
        </Text>
      </View>

      <FlatList
        data={pendingServices}
        renderItem={renderService}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pending services to review</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  listContainer: {
    padding: spacing.md,
  },
  serviceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  serviceName: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  serviceDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  providerInfo: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  providerEmail: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  serviceDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  serviceDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  approveButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: fontSize.md,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  rejectButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: fontSize.md,
  },
  cancelButton: {
    backgroundColor: colors.backgroundGray,
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: fontSize.md,
  },
  rejectionContainer: {
    marginTop: spacing.sm,
  },
  rejectionInput: {
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text,
    minHeight: 80,
    marginBottom: spacing.sm,
    textAlignVertical: 'top',
  },
  rejectionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

