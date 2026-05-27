import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Image,
  ScrollView,
  Linking,
} from 'react-native';
import { supabase } from '../../services/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

interface VerificationDoc {
  id: string;
  document_type: string;
  document_url: string;
  document_number: string | null;
  expiry_date: string | null;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  rejection_reason: string | null;
  uploaded_at: string | null;
}

interface ProviderItem {
  id: string; // profiles.id
  first_name: string;
  last_name: string;
  business_name: string | null;
  is_verified: boolean;
  identity_verification_status: string | null;
  onboarding_completed: boolean;
  docs: VerificationDoc[];
}

const DOC_TYPE_LABELS: Record<string, string> = {
  national_id: 'National ID',
  passport: 'Passport',
  drivers_license: "Driver's Licence",
  business_license: 'Business Licence',
  insurance_certificate: 'Insurance Certificate',
  qualification_certificate: 'Qualification Certificate',
  police_check: 'Police Check',
};

function docLabel(type: string) {
  return DOC_TYPE_LABELS[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function statusColor(status: string) {
  switch (status) {
    case 'approved': return colors.success;
    case 'rejected': return colors.error;
    case 'under_review': return colors.info;
    default: return colors.warning;
  }
}

function statusBg(status: string) {
  switch (status) {
    case 'approved': return colors.successLight;
    case 'rejected': return colors.errorLight;
    case 'under_review': return colors.infoLight;
    default: return colors.warningLight;
  }
}

export default function ProviderApprovalScreen() {
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('pending');

  // Reject modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [pendingReject, setPendingReject] = useState<{ docId: string; providerId: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Image lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [signedUrlLoading, setSignedUrlLoading] = useState(false);

  const fetchProviders = useCallback(async () => {
    try {
      // Fetch all provider_profiles joined with profiles
      const { data: ppRows, error: ppErr } = await supabase
        .from('provider_profiles')
        .select(`
          id,
          is_verified,
          identity_verification_status,
          onboarding_completed,
          business_name,
          profiles!inner (
            first_name,
            last_name
          )
        `)
        .order('id');

      if (ppErr) throw ppErr;

      // Fetch all verification docs
      const { data: docRows, error: docErr } = await supabase
        .from('verification_documents')
        .select('id, document_type, document_url, document_number, expiry_date, status, rejection_reason, uploaded_at, provider_id')
        .order('uploaded_at', { ascending: false });

      if (docErr) throw docErr;

      // Group docs by provider_id
      const docsByProvider: Record<string, VerificationDoc[]> = {};
      for (const doc of docRows ?? []) {
        if (!docsByProvider[doc.provider_id]) docsByProvider[doc.provider_id] = [];
        docsByProvider[doc.provider_id].push({
          id: doc.id,
          document_type: doc.document_type,
          document_url: doc.document_url,
          document_number: doc.document_number,
          expiry_date: doc.expiry_date,
          status: doc.status,
          rejection_reason: doc.rejection_reason,
          uploaded_at: doc.uploaded_at,
        });
      }

      const items: ProviderItem[] = (ppRows ?? []).map((pp: any) => ({
        id: pp.id,
        first_name: pp.profiles?.first_name ?? '',
        last_name: pp.profiles?.last_name ?? '',
        business_name: pp.business_name ?? null,
        is_verified: pp.is_verified ?? false,
        identity_verification_status: pp.identity_verification_status ?? null,
        onboarding_completed: pp.onboarding_completed ?? false,
        docs: docsByProvider[pp.id] ?? [],
      }));

      setProviders(items);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to load providers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  const onRefresh = () => { setRefreshing(true); fetchProviders(); };

  // ── Approve a document ────────────────────────────────────────────────────
  const approveDoc = async (docId: string, providerId: string) => {
    Alert.alert('Approve Document', 'Mark this document as approved and verify the provider?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve', style: 'default',
        onPress: async () => {
          setSubmitting(true);
          try {
            const now = new Date().toISOString();

            const { error: docErr } = await supabase
              .from('verification_documents')
              .update({ status: 'approved', reviewed_at: now })
              .eq('id', docId);
            if (docErr) throw docErr;

            const { error: ppErr } = await supabase
              .from('provider_profiles')
              .update({
                identity_verification_status: 'approved',
                identity_verified_at: now,
                is_verified: true,
              })
              .eq('id', providerId);
            if (ppErr) throw ppErr;

            await fetchProviders();
          } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Failed to approve');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  // ── Reject a document ─────────────────────────────────────────────────────
  const openRejectModal = (docId: string, providerId: string) => {
    setPendingReject({ docId, providerId });
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Reason required', 'Please enter a rejection reason.');
      return;
    }
    if (!pendingReject) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();

      const { error: docErr } = await supabase
        .from('verification_documents')
        .update({ status: 'rejected', rejection_reason: rejectReason.trim(), reviewed_at: now })
        .eq('id', pendingReject.docId);
      if (docErr) throw docErr;

      const { error: ppErr } = await supabase
        .from('provider_profiles')
        .update({
          identity_verification_status: 'rejected',
          identity_verification_notes: rejectReason.trim(),
          is_verified: false,
        })
        .eq('id', pendingReject.providerId);
      if (ppErr) throw ppErr;

      setRejectModalVisible(false);
      await fetchProviders();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to reject');
    } finally {
      setSubmitting(false);
    }
  };

  // ── View document image ───────────────────────────────────────────────────
  const viewDoc = async (docUrl: string) => {
    if (!docUrl) { Alert.alert('No document', 'No file path for this document.'); return; }

    // If it's already a full URL, open directly
    if (docUrl.startsWith('http')) {
      setLightboxUrl(docUrl);
      return;
    }

    setSignedUrlLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('verification-documents')
        .createSignedUrl(docUrl, 3600);
      if (error) throw error;
      setLightboxUrl(data.signedUrl);
    } catch (err: any) {
      Alert.alert('Error', 'Could not load document: ' + (err?.message ?? 'Unknown error'));
    } finally {
      setSignedUrlLoading(false);
    }
  };

  // ── Filter providers ──────────────────────────────────────────────────────
  const filtered = providers.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'pending') {
      // Has docs pending/under_review OR not verified and has docs OR has no docs but onboarded
      const hasPendingDoc = p.docs.some(d => d.status === 'pending' || d.status === 'under_review');
      return hasPendingDoc || (!p.is_verified && p.docs.length === 0 && p.onboarding_completed);
    }
    if (filter === 'approved') return p.is_verified;
    if (filter === 'rejected') return p.identity_verification_status === 'rejected';
    return true;
  });

  const counts = {
    all: providers.length,
    pending: providers.filter(p => p.docs.some(d => d.status === 'pending' || d.status === 'under_review') || (!p.is_verified && p.docs.length === 0 && p.onboarding_completed)).length,
    approved: providers.filter(p => p.is_verified).length,
    rejected: providers.filter(p => p.identity_verification_status === 'rejected').length,
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderDoc = (doc: VerificationDoc, providerId: string) => {
    const canAct = doc.status === 'pending' || doc.status === 'under_review';
    return (
      <View key={doc.id} style={styles.docCard}>
        <View style={styles.docCardHeader}>
          <Text style={styles.docType}>{docLabel(doc.document_type)}</Text>
          <View style={[styles.badge, { backgroundColor: statusBg(doc.status) }]}>
            <Text style={[styles.badgeText, { color: statusColor(doc.status) }]}>
              {doc.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {doc.document_number ? (
          <Text style={styles.docMeta}>Doc #: {doc.document_number}</Text>
        ) : null}
        {doc.expiry_date ? (
          <Text style={styles.docMeta}>Expires: {doc.expiry_date}</Text>
        ) : null}
        {doc.uploaded_at ? (
          <Text style={styles.docMeta}>
            Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
          </Text>
        ) : null}
        {doc.rejection_reason ? (
          <Text style={[styles.docMeta, { color: colors.error }]}>
            Reason: {doc.rejection_reason}
          </Text>
        ) : null}

        <View style={styles.docActions}>
          <TouchableOpacity
            style={[styles.docBtn, styles.viewBtn]}
            onPress={() => viewDoc(doc.document_url)}
            disabled={signedUrlLoading}
          >
            <Text style={styles.viewBtnText}>
              {signedUrlLoading ? '…' : '🔍 View'}
            </Text>
          </TouchableOpacity>

          {canAct && (
            <>
              <TouchableOpacity
                style={[styles.docBtn, styles.approveBtn]}
                onPress={() => approveDoc(doc.id, providerId)}
                disabled={submitting}
              >
                <Text style={styles.approveBtnText}>✓ Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.docBtn, styles.rejectBtn]}
                onPress={() => openRejectModal(doc.id, providerId)}
                disabled={submitting}
              >
                <Text style={styles.rejectBtnText}>✗ Reject</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderProvider = ({ item }: { item: ProviderItem }) => (
    <View style={styles.providerCard}>
      <View style={styles.providerHeader}>
        <View style={styles.providerAvatar}>
          <Text style={styles.providerAvatarText}>
            {(item.first_name?.[0] ?? '?').toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.providerName}>
            {item.first_name} {item.last_name}
          </Text>
          {item.business_name ? (
            <Text style={styles.providerBusiness}>{item.business_name}</Text>
          ) : null}
        </View>
        <View style={[styles.badge, { backgroundColor: item.is_verified ? colors.successLight : colors.warningLight }]}>
          <Text style={[styles.badgeText, { color: item.is_verified ? colors.success : colors.warning }]}>
            {item.is_verified ? 'Verified' : 'Unverified'}
          </Text>
        </View>
      </View>

      {item.docs.length === 0 ? (
        <Text style={styles.noDocs}>No documents submitted yet</Text>
      ) : (
        item.docs.map(doc => renderDoc(doc, item.id))
      )}
    </View>
  );

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'pending', label: `Pending (${counts.pending})` },
    { key: 'all', label: `All (${counts.all})` },
    { key: 'approved', label: `Approved (${counts.approved})` },
    { key: 'rejected', label: `Rejected (${counts.rejected})` },
  ];

  return (
    <View style={styles.container}>
      {/* Filter bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterBtnText, filter === f.key && styles.filterBtnTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderProvider}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No providers in this category</Text>
          </View>
        }
      />

      {/* Reject modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Rejection Reason</Text>
            <Text style={styles.modalSubtitle}>
              This will be saved and the provider will be marked as rejected.
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g. Document is expired, image unclear..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              value={rejectReason}
              onChangeText={setRejectReason}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setRejectModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalRejectBtn]}
                onPress={confirmReject}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalRejectText}>Reject</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image lightbox */}
      <Modal
        visible={!!lightboxUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUrl(null)}
      >
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxUrl(null)}>
            <Text style={styles.lightboxCloseText}>✕</Text>
          </TouchableOpacity>
          {lightboxUrl && (
            <Image
              source={{ uri: lightboxUrl }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
          {lightboxUrl && (
            <TouchableOpacity
              style={styles.openBrowserBtn}
              onPress={() => Linking.openURL(lightboxUrl!)}
            >
              <Text style={styles.openBrowserText}>Open in Browser</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  filterBar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 52,
  },
  filterBarContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filterBtnActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  filterBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  filterBtnTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  providerCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  providerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerAvatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  providerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  providerBusiness: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  noDocs: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
  },
  docCard: {
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  docType: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  docMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  docActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  docBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  viewBtn: {
    backgroundColor: colors.border,
  },
  viewBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  approveBtn: {
    backgroundColor: colors.success,
  },
  approveBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  rejectBtn: {
    backgroundColor: colors.error,
  },
  rejectBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  // Reject modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalBox: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  modalRejectBtn: {
    backgroundColor: colors.error,
  },
  modalRejectText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  // Lightbox
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: spacing.sm,
  },
  lightboxCloseText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: fontWeight.bold,
  },
  lightboxImage: {
    width: '90%',
    height: '75%',
  },
  openBrowserBtn: {
    position: 'absolute',
    bottom: 50,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  openBrowserText: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
  },
});
