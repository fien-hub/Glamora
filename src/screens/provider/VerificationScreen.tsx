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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius } from '../../constants/theme';
import { DocumentUpload } from '../../components/DocumentUpload';
import {
  getVerificationStatus,
  getVerificationDocuments,
  DocumentType,
} from '../../services/verification';

export default function VerificationScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('pending');
  const [documents, setDocuments] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType>('drivers_license');
  const [sendingVerification, setSendingVerification] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusData, docsData] = await Promise.all([
        getVerificationStatus(),
        getVerificationDocuments(),
      ]);
      setVerificationStatus(statusData.status);
      setDocuments(docsData.documents || []);
    } catch (error) {
      console.error('Error fetching verification data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStatusInfo = () => {
    switch (verificationStatus) {
      case 'approved':
        return {
          icon: '✅',
          title: 'KYC Verified',
          description: 'Your KYC has been approved. This helps build trust with customers.',
          color: colors.success,
          bgColor: colors.successLight,
        };
      case 'under_review':
        return {
          icon: '⏳',
          title: 'Under Review',
          description: 'Your documents are being reviewed. This usually takes 1-2 business days.',
          color: colors.info,
          bgColor: colors.infoLight,
        };
      case 'rejected':
        return {
          icon: '❌',
          title: 'Verification Failed',
          description: 'Your documents were rejected. Please upload new documents.',
          color: colors.error,
          bgColor: colors.errorLight,
        };
      default:
        return {
          icon: '🆔',
          title: 'KYC Not Started',
          description: 'Upload a government-issued ID to complete KYC and increase customer trust.',
          color: colors.warning,
          bgColor: colors.warningLight,
        };
    }
  };

  const statusInfo = getStatusInfo();

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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      {/* Benefits Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why Complete KYC?</Text>
        <View style={styles.sectionCard}>
          <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>✓</Text>
            <Text style={styles.benefitText}>Build trust with customers</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>✓</Text>
            <Text style={styles.benefitText}>Get more bookings</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>✓</Text>
            <Text style={styles.benefitText}>Stand out from competitors</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>✓</Text>
            <Text style={styles.benefitText}>Show you're a legitimate business</Text>
          </View>
          </View>
        </View>
      </View>

      {/* Upload Section */}
      {(verificationStatus === 'pending' || verificationStatus === 'rejected') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload ID Document</Text>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionDescription}>
              Upload a clear photo of your government-issued ID to complete KYC.
            </Text>

            {!showUpload ? (
              <>
              {/* Document Type Selection */}
              <Text style={styles.selectLabel}>Select Document Type:</Text>
              <View style={styles.documentTypeOptions}>
                <TouchableOpacity
                  style={[
                    styles.documentTypeOption,
                    selectedDocumentType === 'drivers_license' && styles.documentTypeOptionSelected,
                  ]}
                  onPress={() => setSelectedDocumentType('drivers_license')}
                  disabled={sendingVerification}
                >
                  <Text style={styles.documentTypeIcon}>🪪</Text>
                  <Text style={[
                    styles.documentTypeText,
                    selectedDocumentType === 'drivers_license' && styles.documentTypeTextSelected,
                  ]}>Driver's License</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.documentTypeOption,
                    selectedDocumentType === 'passport' && styles.documentTypeOptionSelected,
                  ]}
                  onPress={() => setSelectedDocumentType('passport')}
                  disabled={sendingVerification}
                >
                  <Text style={styles.documentTypeIcon}>📘</Text>
                  <Text style={[
                    styles.documentTypeText,
                    selectedDocumentType === 'passport' && styles.documentTypeTextSelected,
                  ]}>Passport</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.documentTypeOption,
                    selectedDocumentType === 'national_id' && styles.documentTypeOptionSelected,
                  ]}
                  onPress={() => setSelectedDocumentType('national_id')}
                  disabled={sendingVerification}
                >
                  <Text style={styles.documentTypeIcon}>🆔</Text>
                  <Text style={[
                    styles.documentTypeText,
                    selectedDocumentType === 'national_id' && styles.documentTypeTextSelected,
                  ]}>National ID</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.documentTypeOption,
                    selectedDocumentType === 'business_license' && styles.documentTypeOptionSelected,
                  ]}
                  onPress={() => setSelectedDocumentType('business_license')}
                  disabled={sendingVerification}
                >
                  <Text style={styles.documentTypeIcon}>📄</Text>
                  <Text style={[
                    styles.documentTypeText,
                    selectedDocumentType === 'business_license' && styles.documentTypeTextSelected,
                  ]}>Business License</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.uploadButton, sendingVerification && styles.buttonDisabled]}
                onPress={() => setShowUpload(true)}
                disabled={sendingVerification}
              >
                <Text style={styles.uploadButtonText}>
                  {sendingVerification ? 'Sending...' : '📷 Take Photo or Upload'}
                </Text>
              </TouchableOpacity>
              </>
            ) : (
              <View style={styles.uploadContainer}>
                <Text style={styles.uploadingDocType}>
                  Uploading: {selectedDocumentType.replace('_', ' ').toUpperCase()}
                </Text>
                <DocumentUpload
                  documentType={selectedDocumentType}
                  onUploadStateChange={setSendingVerification}
                  onUploadSuccess={() => {
                    setSendingVerification(false);
                    setShowUpload(false);
                    fetchData();
                    Alert.alert('Success', 'Document uploaded successfully! We\'ll review it within 1-2 business days.');
                  }}
                  onUploadError={(error) => {
                    setSendingVerification(false);
                    Alert.alert('Upload Failed', error);
                  }}
                />
                <TouchableOpacity
                  style={[styles.cancelButton, sendingVerification && styles.buttonDisabled]}
                  onPress={() => setShowUpload(false)}
                  disabled={sendingVerification}
                >
                  <Text style={styles.cancelButtonText}>{sendingVerification ? 'Sending...' : 'Cancel'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Documents List */}
      {documents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uploaded Documents</Text>
          <View style={styles.documentsList}>
          {documents.map((doc) => (
            <View key={doc.id} style={styles.documentCard}>
              <View style={styles.documentInfo}>
                <Text style={styles.documentType}>
                  {doc.document_type.replace('_', ' ').toUpperCase()}
                </Text>
                <Text style={styles.documentDate}>
                  Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                </Text>
              </View>
              <View
                style={[
                  styles.documentStatus,
                  {
                    backgroundColor:
                      doc.status === 'approved'
                        ? colors.successLight
                        : doc.status === 'rejected'
                        ? colors.errorLight
                        : colors.infoLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.documentStatusText,
                    {
                      color:
                        doc.status === 'approved'
                          ? colors.success
                          : doc.status === 'rejected'
                          ? colors.error
                          : colors.info,
                    },
                  ]}
                >
                  {doc.status.toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
          </View>
        </View>
      )}

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>📋 What We Accept</Text>
        <Text style={styles.infoText}>• Driver's License</Text>
        <Text style={styles.infoText}>• Passport</Text>
        <Text style={styles.infoText}>• National ID Card</Text>
        <Text style={styles.infoText}>• Business License</Text>

        <Text style={[styles.infoTitle, { marginTop: spacing.lg }]}>🔒 Your Privacy</Text>
        <Text style={styles.infoText}>
          Your documents are encrypted and stored securely. We only use them for KYC review.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight || colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  sectionDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  benefitsList: {
    gap: spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 2,
  },
  benefitIcon: {
    fontSize: 20,
    color: colors.success,
  },
  benefitText: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  selectLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  documentTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
    marginBottom: spacing.lg,
  },
  documentTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48.2%',
    minHeight: 78,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  documentTypeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  documentTypeIcon: {
    fontSize: 22,
    marginRight: spacing.sm,
  },
  documentTypeText: {
    fontSize: fontSize.sm,
    color: colors.text,
    flexShrink: 1,
  },
  documentTypeTextSelected: {
    fontWeight: '600',
    color: colors.primaryDarker,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  uploadContainer: {
    gap: spacing.md,
  },
  uploadingDocType: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  cancelButton: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  documentsList: {
    gap: spacing.sm,
  },
  documentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentInfo: {
    flex: 1,
  },
  documentType: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  documentDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  documentStatus: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
  },
  documentStatusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  infoSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight || colors.border,
  },
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 22,
  },
});

