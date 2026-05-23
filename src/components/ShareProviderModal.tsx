import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
let Clipboard: typeof import('expo-clipboard') = {} as any;
try { Clipboard = require('expo-clipboard'); } catch (e) { console.warn('[ShareProviderModal] expo-clipboard unavailable:', e); }
import { supabase } from '../services/supabase';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';
import {
  shareContent,
  shareToWhatsApp,
  shareToFacebook,
  shareToTwitter,
  shareViaSMS,
  copyToClipboard as copyText,
} from '../utils/socialSharing';
import { trackProviderShared, trackReferralCodeCopied } from '../utils/analytics';

interface ShareProviderModalProps {
  visible: boolean;
  onClose: () => void;
  provider: {
    id: string;
    businessName: string;
    rating: number;
    totalReviews: number;
  };
}

export default function ShareProviderModal({
  visible,
  onClose,
  provider,
}: ShareProviderModalProps) {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);

  const generateReferralCode = async () => {
    setGeneratingCode(true);
    try {
      // Get user's profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('user_id', user?.id)
        .single();

      if (!profileData) throw new Error('Profile not found');

      // Generate unique referral code
      const code = `${profileData.first_name.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-6)}`;

      // Check if referral already exists
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('referral_code')
        .eq('referrer_id', profileData.id)
        .eq('status', 'pending')
        .single();

      if (existingReferral) {
        setReferralCode(existingReferral.referral_code);
      } else {
        // Create new referral
        const { data: newReferral, error } = await supabase
          .from('referrals')
          .insert({
            referrer_id: profileData.id,
            referral_code: code,
            status: 'pending',
            reward_amount: 1000, // $10 reward in cents
          })
          .select()
          .single();

        if (error) throw error;
        setReferralCode(newReferral.referral_code);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate referral code');
    } finally {
      setGeneratingCode(false);
    }
  };

  const getShareMessage = () => {
    return `Check out ${provider.businessName} on Eve Beauty! ⭐ ${provider.rating}/5 (${provider.totalReviews} reviews)\n\nBook beauty services at home with verified professionals.\n\n${referralCode ? `Use my referral code: ${referralCode} for $10 off your first booking!` : 'Download Eve Beauty now!'}\n\nhttps://glamora.app/provider/${provider.id}`;
  };

  const getShareUrl = () => {
    return `https://glamora.app/provider/${provider.id}${referralCode ? `?ref=${referralCode}` : ''}`;
  };

  const handleShare = async (platform: 'general' | 'whatsapp' | 'facebook' | 'twitter' | 'sms' | 'copy') => {
    const message = getShareMessage();
    const url = getShareUrl();

    try {
      let success = false;

      switch (platform) {
        case 'whatsapp':
          success = await shareToWhatsApp(message);
          break;
        case 'facebook':
          success = await shareToFacebook(url);
          break;
        case 'twitter':
          success = await shareToTwitter(
            `Check out ${provider.businessName} on Eve Beauty! ⭐ ${provider.rating}/5`,
            url
          );
          break;
        case 'sms':
          success = await shareViaSMS(message);
          break;
        case 'copy':
          success = await copyText(url);
          break;
        case 'general':
        default:
          success = await shareContent({
            title: `Check out ${provider.businessName} on Eve Beauty`,
            message,
            url,
          });
          break;
      }

      if (success) {
        // Track sharing event
        trackProviderShared(provider.id, platform, !!referralCode);
        console.log(`Shared provider ${provider.id} via ${platform}`);
      }
    } catch (error: any) {
      console.error('Error sharing:', error);
    }
  };

  const copyReferralCode = async () => {
    if (referralCode) {
      await Clipboard.setStringAsync(referralCode);
      trackReferralCodeCopied(referralCode);
      Alert.alert('Copied!', 'Referral code copied to clipboard');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Share Provider</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Provider Info */}
            <View style={styles.providerCard}>
              <Text style={styles.providerName}>{provider.businessName}</Text>
              <View style={styles.ratingContainer}>
                <Text style={styles.rating}>⭐ {provider.rating}</Text>
                <Text style={styles.reviews}>({provider.totalReviews} reviews)</Text>
              </View>
            </View>

            {/* Referral Section */}
            <View style={styles.referralSection}>
              <Text style={styles.sectionTitle}>🎁 Earn Rewards</Text>
              <Text style={styles.sectionDescription}>
                Share with friends and earn $10 when they book their first service!
              </Text>

              {!referralCode ? (
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={generateReferralCode}
                  disabled={generatingCode}
                >
                  <Text style={styles.generateButtonText}>
                    {generatingCode ? 'Generating...' : 'Generate Referral Code'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.codeContainer}>
                  <TextInput
                    style={styles.codeInput}
                    value={referralCode}
                    editable={false}
                  />
                  <TouchableOpacity style={styles.copyButton} onPress={copyReferralCode}>
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Share Options */}
            <View style={styles.shareSection}>
              <Text style={styles.sectionTitle}>Share via</Text>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleShare('whatsapp')}
              >
                <Text style={styles.shareIcon}>💚</Text>
                <View style={styles.shareInfo}>
                  <Text style={styles.shareTitle}>WhatsApp</Text>
                  <Text style={styles.shareDescription}>
                    Share via WhatsApp
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleShare('facebook')}
              >
                <Text style={styles.shareIcon}>📘</Text>
                <View style={styles.shareInfo}>
                  <Text style={styles.shareTitle}>Facebook</Text>
                  <Text style={styles.shareDescription}>
                    Share on Facebook
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleShare('twitter')}
              >
                <Text style={styles.shareIcon}>🐦</Text>
                <View style={styles.shareInfo}>
                  <Text style={styles.shareTitle}>Twitter / X</Text>
                  <Text style={styles.shareDescription}>
                    Share on Twitter
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleShare('sms')}
              >
                <Text style={styles.shareIcon}>💬</Text>
                <View style={styles.shareInfo}>
                  <Text style={styles.shareTitle}>Message</Text>
                  <Text style={styles.shareDescription}>
                    Send via text message
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleShare('copy')}
              >
                <Text style={styles.shareIcon}>📋</Text>
                <View style={styles.shareInfo}>
                  <Text style={styles.shareTitle}>Copy Link</Text>
                  <Text style={styles.shareDescription}>
                    Copy link to clipboard
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleShare('general')}
              >
                <Text style={styles.shareIcon}>📱</Text>
                <View style={styles.shareInfo}>
                  <Text style={styles.shareTitle}>More Options</Text>
                  <Text style={styles.shareDescription}>
                    Share via other apps
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    fontSize: fontSize.xl,
    color: colors.textSecondary,
    padding: spacing.sm,
  },
  content: {
    padding: spacing.lg,
  },
  providerCard: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  providerName: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rating: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  reviews: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  referralSection: {
    backgroundColor: colors.warningLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  generateButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  generateButtonText: {
    color: colors.black,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  codeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  codeInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
  },
  copyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyButtonText: {
    color: colors.black,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  shareSection: {
    marginTop: spacing.md,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  shareIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  shareInfo: {
    flex: 1,
  },
  shareTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  shareDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
