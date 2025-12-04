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
          title: 'Identity Verified',
          description: 'Your identity has been verified. This helps build trust with customers.',
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
          title: 'Not Verified',
          description: 'Upload a government-issued ID to verify your identity and increase customer trust.',
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      {/* Status Card */}
      <View style={[styles.statusCard, { backgroundColor: statusInfo.bgColor }]}>
        <Text style={styles.statusIcon}>{statusInfo.icon}</Text>
        <Text style={[styles.statusTitle, { color: statusInfo.color }]}>{statusInfo.title}</Text>
        <Text style={styles.statusDescription}>{statusInfo.description}</Text>
      </View>

      {/* Benefits Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why Verify Your Identity?</Text>
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

      {/* Upload Section */}
      {(verificationStatus === 'pending' || verificationStatus === 'rejected') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload ID Document</Text>
          <Text style={styles.sectionDescription}>
            Upload a clear photo of your government-issued ID to verify your identity.
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
                >
                  <Text style={styles.documentTypeIcon}>📄</Text>
                  <Text style={[
                    styles.documentTypeText,
                    selectedDocumentType === 'business_license' && styles.documentTypeTextSelected,
                  ]}>Business License</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => setShowUpload(true)}
              >
                <Text style={styles.uploadButtonText}>📷 Take Photo or Upload</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.uploadContainer}>
              <Text style={styles.uploadingDocType}>
                Uploading: {selectedDocumentType.replace('_', ' ').toUpperCase()}
              </Text>
              <DocumentUpload
                documentType={selectedDocumentType}
                onUploadSuccess={() => {
                  setShowUpload(false);
                  fetchData();
                  Alert.alert('Success', 'Document uploaded successfully! We\'ll review it within 1-2 business days.');
                }}
                onUploadError={(error) => {
                  Alert.alert('Upload Failed', error);
                }}
              />
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowUpload(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Documents List */}
      {documents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uploaded Documents</Text>
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
          Your documents are encrypted and stored securely. We only use them to verify your identity.
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  statusCard: {
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  statusTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  statusDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    margin: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
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
  },
  benefitIcon: {
    fontSize: 20,
    color: colors.success,
  },
  benefitText: {
    fontSize: fontSize.md,
    color: colors.text,
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
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  documentTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  documentTypeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  documentTypeIcon: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  documentTypeText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  documentTypeTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
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
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  documentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
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
    borderRadius: borderRadius.sm,
  },
  documentStatusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  infoSection: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
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

