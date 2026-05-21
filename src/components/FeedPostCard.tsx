import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
let Image: any = View;
try { Image = require('expo-image').Image; } catch (e) { console.warn('[FeedPostCard] expo-image unavailable:', e); }
import { Ionicons } from '../utils/icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../constants/theme';

interface FeedPostCardProps {
  providerName: string;
  providerAvatar?: string;
  postImage: string;
  serviceName: string;
  servicePrice?: number;
  distance?: string;
  caption?: string;
  likeCount?: number;
  viewCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  isVerified?: boolean;
  availabilityText?: string;
  availabilityUrgency?: 'immediate' | 'today' | 'tomorrow' | 'later' | 'unavailable';
  hasServiceTag?: boolean;
  onPress: () => void;
  onBookPress?: () => void;
  onLikePress?: () => void;
  onSavePress?: () => void;
}

export default function FeedPostCard({
  providerName,
  providerAvatar,
  postImage,
  serviceName,
  servicePrice,
  distance,
  caption,
  likeCount = 0,
  viewCount = 0,
  isLiked = false,
  isSaved = false,
  isVerified = false,
  availabilityText,
  availabilityUrgency,
  hasServiceTag = false,
  onPress,
  onBookPress,
  onLikePress,
  onSavePress,
}: FeedPostCardProps) {
  const providerAvatarSource = providerAvatar
    ? { uri: providerAvatar }
    : require('../../assets/icon.png');

  // Removed animations to avoid native/JS driver conflicts
  // The like/save functionality works perfectly without animations

  return (
    <TouchableOpacity
      style={[styles.card, shadows.md]}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Image Container - wraps image and all overlays */}
      <View style={styles.imageContainer}>
        {/* Post Image */}
        <Image
          source={{ uri: postImage }}
          style={styles.postImage}
          contentFit="cover"
          transition={200}
          placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
          cachePolicy="memory-disk"
        />

        {/* Distance Tag — only shown when distance is known */}
        {!!distance && (
          <View style={styles.distanceTag}>
            <Ionicons name="location" size={14} color={colors.white} />
            <Text style={styles.distanceText}>{distance}</Text>
          </View>
        )}



        {/* Availability Badge */}
        {availabilityText && (
          <View style={[
            styles.availabilityBadge,
            availabilityUrgency === 'immediate' && styles.availabilityBadgeImmediate,
            availabilityUrgency === 'today' && styles.availabilityBadgeToday,
          ]}>
            <Ionicons
              name={availabilityUrgency === 'immediate' ? 'flash' : 'time'}
              size={12}
              color={availabilityUrgency === 'immediate' ? colors.white : colors.white}
            />
            <Text style={styles.availabilityText}>{availabilityText}</Text>
          </View>
        )}

        {/* Engagement Buttons (Like & Save) */}
        <View style={styles.engagementButtons}>
          {onLikePress && (
            <TouchableOpacity
              style={[styles.engagementButton, styles.engagementButtonRow]}
              onPress={(e) => {
                e.stopPropagation();
                onLikePress();
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={isLiked ? colors.error : colors.white}
              />
              {likeCount > 0 && (
                <Text style={styles.engagementCount}>{likeCount}</Text>
              )}
            </TouchableOpacity>
          )}
          {onSavePress && (
            <TouchableOpacity
              style={styles.engagementButton}
              onPress={(e) => {
                e.stopPropagation();
                onSavePress();
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={colors.white}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Provider Info */}
        <View style={styles.providerInfo}>
          <Image
            source={providerAvatarSource}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
          <View style={styles.providerNameContainer}>
            <Text style={styles.providerName} numberOfLines={1}>{providerName}</Text>
            {isVerified && (
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
            )}
          </View>
        </View>

        {/* Caption */}
        {caption && (
          <Text style={styles.caption} numberOfLines={2}>
            {caption}
          </Text>
        )}

        {/* Service Info & CTA */}
        <View style={styles.footer}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{serviceName}</Text>
          </View>

          {onBookPress && (
            <TouchableOpacity
              style={styles.bookButton}
              onPress={(e) => {
                e.stopPropagation();
                onBookPress();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.bookButtonText}>Book</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primaryDarker} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 3 / 4, // Portrait aspect ratio for grid
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundGray,
  },
  distanceTag: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    gap: 2,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  availabilityBadge: {
    position: 'absolute',
    top: spacing.sm + 24, // Below distance tag
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.9)', // Green with transparency
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    gap: 2,
  },
  availabilityBadgeImmediate: {
    backgroundColor: colors.primaryDarker, // Bright pink for immediate availability
  },
  availabilityBadgeToday: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)', // Green for today
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  serviceTagBadge: {
    position: 'absolute',
    top: spacing.sm + 30,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    gap: 4,
    ...shadows.sm,
  },
  serviceTagText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  engagementButtons: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'column',
    gap: spacing.xs,
  },
  engagementButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    minWidth: 36,
    height: 36,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 8,
    ...shadows.sm,
  },
  engagementButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  engagementCount: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    padding: spacing.sm,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.round,
    marginRight: spacing.xs,
    backgroundColor: colors.backgroundGray,
  },
  providerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  providerName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  caption: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  servicePrice: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primaryDarker, // High contrast pink for visibility
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    gap: 4,
  },
  bookButtonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
});

