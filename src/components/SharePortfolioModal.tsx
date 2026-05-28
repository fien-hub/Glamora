import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';
import {
  shareImage,
  shareContent,
  shareToWhatsApp,
  shareToFacebook,
  shareToTwitter,
  copyToClipboard,
} from '../utils/socialSharing';
import { trackPortfolioShared } from '../utils/analytics';

interface SharePortfolioModalProps {
  visible: boolean;
  onClose: () => void;
  portfolioItem: {
    id: string;
    image_url: string;
    caption?: string | null;
  };
  provider: {
    id: string;
    businessName: string;
  };
}

export default function SharePortfolioModal({
  visible,
  onClose,
  portfolioItem,
  provider,
}: SharePortfolioModalProps) {
  const getShareMessage = () => {
    return `Check out this work by ${provider.businessName} on Glamora! 💅\n\n${portfolioItem.caption || 'Beautiful work!'}\n\nBook beauty services at home with verified professionals.\n\nhttps://glamora.app/provider/${provider.id}`;
  };

  const getShareUrl = () => {
    return `https://glamora.app/provider/${provider.id}/portfolio/${portfolioItem.id}`;
  };

  const handleShare = async (platform: 'image' | 'whatsapp' | 'facebook' | 'twitter' | 'copy' | 'general') => {
    const message = getShareMessage();
    const url = getShareUrl();

    try {
      let success = false;

      switch (platform) {
        case 'image':
          // Share the actual image with caption
          success = await shareImage(portfolioItem.image_url, message);
          break;
        case 'whatsapp':
          success = await shareToWhatsApp(message);
          break;
        case 'facebook':
          success = await shareToFacebook(url);
          break;
        case 'twitter':
          success = await shareToTwitter(
            `Check out this work by ${provider.businessName} on Glamora! 💅`,
            url
          );
          break;
        case 'copy':
          success = await copyToClipboard(url);
          break;
        case 'general':
        default:
          success = await shareContent({
            title: `${provider.businessName} - Portfolio`,
            message,
            url,
          });
          break;
      }

      if (success) {
        // Track sharing event
        trackPortfolioShared(portfolioItem.id, provider.id, platform);
        console.log(`Shared portfolio item ${portfolioItem.id} via ${platform}`);
        if (platform !== 'copy') {
          onClose();
        }
      }
    } catch (error: any) {
      console.error('Error sharing portfolio:', error);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Share Portfolio</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Portfolio Preview */}
            <View style={styles.previewCard}>
              <Image
                source={{ uri: portfolioItem.image_url }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              {portfolioItem.caption && (
                <Text style={styles.caption}>{portfolioItem.caption}</Text>
              )}
              <Text style={styles.providerName}>{provider.businessName}</Text>
            </View>

            {/* Share Options */}
            <View style={styles.shareSection}>
              <Text style={styles.sectionTitle}>Share via</Text>
              
              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleShare('image')}
              >
                <Text style={styles.shareIcon}>📸</Text>
                <View style={styles.shareInfo}>
                  <Text style={styles.shareTitle}>Share Image</Text>
                  <Text style={styles.shareDescription}>
                    Share the image directly
                  </Text>
                </View>
              </TouchableOpacity>

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
  previewCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  caption: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  providerName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  shareSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
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

