import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';

interface Customer {
  id: string;
  profile: {
    first_name: string;
    last_name: string;
    phone: string | null;
    avatar_url: string | null;
  };
  totalBookings: number;
  completedBookings: number;
  totalSpent: number;
  lastBookingDate: string | null;
  note?: string;
  isFavorite: boolean;
}

type FilterType = 'all' | 'favorites' | 'recent' | 'top_spenders';
type SortType = 'name' | 'bookings' | 'spent' | 'recent';

export default function CustomersScreen() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('name');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [customers, searchQuery, filter, sort]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      // Fetch all bookings with customer and payment data
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          customer_id,
          status,
          created_at,
          customer:customer_profiles!bookings_customer_id_fkey(
            id,
            profile:profiles(first_name, last_name, phone, avatar_url)
          ),
          payment:payments(amount, status)
        `)
        .eq('provider_id', profile.id);

      if (error) throw error;

      // Fetch customer notes
      const { data: notes } = await supabase
        .from('customer_notes')
        .select('customer_id, note, is_favorite')
        .eq('provider_id', profile.id);

      // Process customer data
      const customerMap = new Map<string, Customer>();

      bookings?.forEach((booking: any) => {
        const customerId = booking.customer_id;
        const existing = customerMap.get(customerId);
        const payment = booking.payment?.[0];
        const amount = payment?.status === 'succeeded' ? payment.amount : 0;

        if (existing) {
          existing.totalBookings += 1;
          if (booking.status === 'completed') existing.completedBookings += 1;
          existing.totalSpent += amount;
          if (!existing.lastBookingDate || booking.created_at > existing.lastBookingDate) {
            existing.lastBookingDate = booking.created_at;
          }
        } else {
          const customerNote = notes?.find((n) => n.customer_id === customerId);
          customerMap.set(customerId, {
            id: customerId,
            profile: booking.customer.profile,
            totalBookings: 1,
            completedBookings: booking.status === 'completed' ? 1 : 0,
            totalSpent: amount,
            lastBookingDate: booking.created_at,
            note: customerNote?.note,
            isFavorite: customerNote?.is_favorite || false,
          });
        }
      });

      setCustomers(Array.from(customerMap.values()));
    } catch (error) {
      console.error('Error fetching customers:', error);
      Alert.alert('Error', 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...customers];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.profile.first_name.toLowerCase().includes(query) ||
          c.profile.last_name.toLowerCase().includes(query) ||
          c.profile.phone?.includes(query)
      );
    }

    // Apply filter
    if (filter === 'favorites') {
      filtered = filtered.filter((c) => c.isFavorite);
    } else if (filter === 'recent') {
      filtered = filtered.filter((c) => {
        if (!c.lastBookingDate) return false;
        const daysSince = (Date.now() - new Date(c.lastBookingDate).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 30;
      });
    } else if (filter === 'top_spenders') {
      filtered = filtered.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);
    }

    // Apply sort
    if (sort === 'name') {
      filtered.sort((a, b) => a.profile.first_name.localeCompare(b.profile.first_name));
    } else if (sort === 'bookings') {
      filtered.sort((a, b) => b.totalBookings - a.totalBookings);
    } else if (sort === 'spent') {
      filtered.sort((a, b) => b.totalSpent - a.totalSpent);
    } else if (sort === 'recent') {
      filtered.sort((a, b) => {
        if (!a.lastBookingDate) return 1;
        if (!b.lastBookingDate) return -1;
        return new Date(b.lastBookingDate).getTime() - new Date(a.lastBookingDate).getTime();
      });
    }

    setFilteredCustomers(filtered);
  };

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailsModalVisible(true);
  };

  const handleAddNote = (customer: Customer) => {
    setSelectedCustomer(customer);
    setNoteText(customer.note || '');
    setNoteModalVisible(true);
  };

  const handleSaveNote = async () => {
    if (!selectedCustomer) return;

    try {
      setSavingNote(true);

      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      // Upsert note
      const { error } = await supabase
        .from('customer_notes')
        .upsert({
          provider_id: profile.id,
          customer_id: selectedCustomer.id,
          note: noteText.trim(),
          is_favorite: selectedCustomer.isFavorite,
        });

      if (error) throw error;

      Alert.alert('Success', 'Note saved successfully');
      setNoteModalVisible(false);
      await fetchCustomers();
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleToggleFavorite = async (customer: Customer) => {
    try {
      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      // Upsert favorite status
      const { error } = await supabase
        .from('customer_notes')
        .upsert({
          provider_id: profile.id,
          customer_id: customer.id,
          note: customer.note || '',
          is_favorite: !customer.isFavorite,
        });

      if (error) throw error;

      await fetchCustomers();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filters */}
      <View style={styles.controlsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {(['all', 'favorites', 'recent', 'top_spenders'] as FilterType[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, filter === f && styles.filterButtonActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterButtonText, filter === f && styles.filterButtonTextActive]}>
                {f === 'all' ? 'All' : f === 'favorites' ? '⭐ Favorites' : f === 'recent' ? '🕐 Recent' : '💰 Top Spenders'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort:</Text>
          {(['name', 'bookings', 'spent', 'recent'] as SortType[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sortButton, sort === s && styles.sortButtonActive]}
              onPress={() => setSort(s)}
            >
              <Text style={[styles.sortButtonText, sort === s && styles.sortButtonTextActive]}>
                {s === 'name' ? 'Name' : s === 'bookings' ? 'Bookings' : s === 'spent' ? 'Spent' : 'Recent'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Customer List */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={styles.countText}>
          {filteredCustomers.length} {filteredCustomers.length === 1 ? 'Customer' : 'Customers'}
        </Text>

        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No customers found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Your customers will appear here'}
            </Text>
          </View>
        ) : (
          filteredCustomers.map((customer) => (
            <View key={customer.id} style={styles.customerCard}>
              <View style={styles.customerHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{customer.profile.first_name[0]}</Text>
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>
                    {customer.profile.first_name} {customer.profile.last_name}
                  </Text>
                  {customer.profile.phone && (
                    <Text style={styles.customerPhone}>{customer.profile.phone}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleToggleFavorite(customer)}>
                  <Text style={styles.favoriteIcon}>{customer.isFavorite ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.customerStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{customer.totalBookings}</Text>
                  <Text style={styles.statLabel}>Bookings</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{customer.completedBookings}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatCurrency(customer.totalSpent)}</Text>
                  <Text style={styles.statLabel}>Total Spent</Text>
                </View>
              </View>

              <Text style={styles.lastBooking}>Last booking: {formatDate(customer.lastBookingDate)}</Text>

              {customer.note && (
                <View style={styles.notePreview}>
                  <Text style={styles.notePreviewText} numberOfLines={2}>
                    📝 {customer.note}
                  </Text>
                </View>
              )}

              <View style={styles.customerActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleViewDetails(customer)}
                >
                  <Text style={styles.actionButtonText}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={() => handleAddNote(customer)}
                >
                  <Text style={styles.actionButtonTextSecondary}>
                    {customer.note ? 'Edit Note' : 'Add Note'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Note Modal */}
      <Modal
        visible={noteModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setNoteModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Customer Note</Text>
            <View style={styles.modalPlaceholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedCustomer && (
              <View style={styles.modalCustomerInfo}>
                <Text style={styles.modalCustomerName}>
                  {selectedCustomer.profile.first_name} {selectedCustomer.profile.last_name}
                </Text>
              </View>
            )}

            <View style={styles.noteInputContainer}>
              <Text style={styles.noteInputLabel}>Note</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Add notes about this customer (preferences, allergies, etc.)"
                value={noteText}
                onChangeText={setNoteText}
                multiline
                numberOfLines={8}
                maxLength={1000}
              />
              <Text style={styles.charCount}>{noteText.length}/1000</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, savingNote && styles.saveButtonDisabled]}
              onPress={handleSaveNote}
              disabled={savingNote}
            >
              {savingNote ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Save Note</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setDetailsModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Customer Details</Text>
            <View style={styles.modalPlaceholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedCustomer && (
              <>
                <View style={styles.detailsHeader}>
                  <View style={styles.detailsAvatar}>
                    <Text style={styles.detailsAvatarText}>
                      {selectedCustomer.profile.first_name[0]}
                    </Text>
                  </View>
                  <Text style={styles.detailsName}>
                    {selectedCustomer.profile.first_name} {selectedCustomer.profile.last_name}
                  </Text>
                  {selectedCustomer.profile.phone && (
                    <Text style={styles.detailsPhone}>{selectedCustomer.profile.phone}</Text>
                  )}
                </View>

                <View style={styles.detailsStatsContainer}>
                  <View style={styles.detailsStatCard}>
                    <Text style={styles.detailsStatValue}>{selectedCustomer.totalBookings}</Text>
                    <Text style={styles.detailsStatLabel}>Total Bookings</Text>
                  </View>
                  <View style={styles.detailsStatCard}>
                    <Text style={styles.detailsStatValue}>{selectedCustomer.completedBookings}</Text>
                    <Text style={styles.detailsStatLabel}>Completed</Text>
                  </View>
                  <View style={styles.detailsStatCard}>
                    <Text style={styles.detailsStatValue}>
                      {formatCurrency(selectedCustomer.totalSpent)}
                    </Text>
                    <Text style={styles.detailsStatLabel}>Total Spent</Text>
                  </View>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Last Booking</Text>
                  <Text style={styles.detailsSectionText}>
                    {formatDate(selectedCustomer.lastBookingDate)}
                  </Text>
                </View>

                {selectedCustomer.note && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsSectionTitle}>Notes</Text>
                    <Text style={styles.detailsSectionText}>{selectedCustomer.note}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.editNoteButton}
                  onPress={() => {
                    setDetailsModalVisible(false);
                    handleAddNote(selectedCustomer);
                  }}
                >
                  <Text style={styles.editNoteButtonText}>
                    {selectedCustomer.note ? '✏️ Edit Note' : '📝 Add Note'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
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
  searchContainer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
  },
  searchInput: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  controlsContainer: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filtersScroll: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.background,
    marginRight: spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.primaryDarker,
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  sortLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  sortButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    marginRight: spacing.xs,
  },
  sortButtonActive: {
    backgroundColor: colors.secondary + '20',
  },
  sortButtonText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  sortButtonTextActive: {
    color: colors.secondary,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  countText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyState: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
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
  customerCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.white,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  customerPhone: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  favoriteIcon: {
    fontSize: 24,
  },
  customerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  lastBooking: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  notePreview: {
    backgroundColor: colors.primary + '08',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  notePreviewText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  customerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.white,
  },
  actionButtonTextSecondary: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 24,
    color: colors.text,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalPlaceholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  modalCustomerInfo: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  modalCustomerName: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  noteInputContainer: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  noteInputLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.white,
  },
  detailsHeader: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  detailsAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailsAvatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.white,
  },
  detailsName: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  detailsPhone: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  detailsStatsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  detailsStatCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  detailsStatValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  detailsStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  detailsSection: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  detailsSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  detailsSectionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  editNoteButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  editNoteButtonText: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.white,
  },
});

