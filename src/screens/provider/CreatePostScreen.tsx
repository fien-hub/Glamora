import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Dimensions,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
// expo-av is lazy-loaded to prevent module-level native crashes in New Arch builds.
let _ExpoAv: typeof import('expo-av') | null = null;
function getExpoAv() {
  if (_ExpoAv) return _ExpoAv;
  try { _ExpoAv = require('expo-av') as typeof import('expo-av'); } catch { /* unavailable */ }
  return _ExpoAv;
}
// Stable wrapper component — resolves the real expo-av Video at render time.
const Video = React.forwardRef((props: any, ref: any) => {
  const av = getExpoAv();
  if (!av?.Video) return null;
  return React.createElement(av.Video, { ref, ...props });
});
const ResizeMode = { CONTAIN: 'contain' as const, COVER: 'cover' as const, STRETCH: 'stretch' as const };
import { Ionicons } from '../../utils/icons';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from '../../utils/linearGradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import {
  pickMultipleMedia,
  uploadPortfolioMedia,
  requestImagePermissions,
  MediaAsset,
} from '../../utils/imageUpload';
import { colors, spacing, fontSize, borderRadius, fontWeight } from '../../constants/theme';
import FadeInView from '../../components/animations/FadeInView';
import SlideUpView from '../../components/animations/SlideUpView';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ITEM_SIZE = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 2) / 3;

// Step definitions
const STEPS = [
  { id: 1, title: 'Select Media', icon: 'images-outline' },
  { id: 2, title: 'Add Details', icon: 'create-outline' },
  { id: 3, title: 'Review & Post', icon: 'checkmark-circle-outline' },
];

interface SelectedMedia extends MediaAsset {
  id: string;
  caption: string;
  serviceId: string | null;
  serviceName: string | null;
  hashtags: string[];
}

interface ProviderService {
  id: string;
  service_id: string;
  base_price: number;
  custom_service_name: string | null;
  services: {
    name: string;
  };
}

export default function CreatePostScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  // Step state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [providerInfo, setProviderInfo] = useState<{ id: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Animation values
  const stepProgress = useSharedValue(1);
  const contentOpacity = useSharedValue(1);

  useEffect(() => {
    loadProviderData();
    requestImagePermissions();
  }, []);

  // Animate step change
  useEffect(() => {
    stepProgress.value = withSpring(currentStep, { damping: 15, stiffness: 100 });
  }, [currentStep]);

  const loadProviderData = async () => {
    if (!user) return;
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        setProviderInfo({ id: profileData.id });
        
        const { data: servicesData } = await supabase
          .from('provider_services')
          .select(`id, service_id, base_price, custom_service_name, services(name)`)
          .eq('provider_id', profileData.id)
          .eq('is_active', true);

        if (servicesData) {
          setServices(servicesData as unknown as ProviderService[]);
        }
      }
    } catch (error) {
      console.error('Error loading provider data:', error);
    }
  };

  // Format video duration
  const formatDuration = (seconds: number | undefined): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle media selection - only one at a time
  const handleSelectMedia = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const assets = await pickMultipleMedia({ maxItems: 1 });

    if (assets.length > 0) {
      // Replace existing media with the new one (only allow one)
      const newMedia: SelectedMedia = {
        ...assets[0],
        id: `${Date.now()}-0`,
        caption: '',
        serviceId: null,
        serviceName: null,
        hashtags: [],
      };
      setSelectedMedia([newMedia]);
      setCurrentMediaIndex(0);
    }
  };

  // Remove media item
  const handleRemoveMedia = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMedia(selectedMedia.filter(m => m.id !== id));
    if (currentMediaIndex >= selectedMedia.length - 1) {
      setCurrentMediaIndex(Math.max(0, selectedMedia.length - 2));
    }
  };

  // Update media details
  const updateMediaDetails = (id: string, updates: Partial<SelectedMedia>) => {
    setSelectedMedia(selectedMedia.map(m =>
      m.id === id ? { ...m, ...updates } : m
    ));
  };

  // Navigate steps
  const goToNextStep = () => {
    if (currentStep < 3) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      contentOpacity.value = withTiming(0, { duration: 150 }, () => {
        contentOpacity.value = withTiming(1, { duration: 150 });
      });
      setTimeout(() => setCurrentStep(currentStep + 1), 150);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      contentOpacity.value = withTiming(0, { duration: 150 }, () => {
        contentOpacity.value = withTiming(1, { duration: 150 });
      });
      setTimeout(() => setCurrentStep(currentStep - 1), 150);
    }
  };

  // Handle post upload
  const handlePost = async () => {
    if (!providerInfo || selectedMedia.length === 0) return;

    // Validate that all media has a service tagged
    const untaggedMedia = selectedMedia.find(m => !m.serviceId);
    if (untaggedMedia) {
      Alert.alert('Service Required', 'Please select a service for your post so customers can book directly.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      for (let i = 0; i < selectedMedia.length; i++) {
        const media = selectedMedia[i];
        setUploadProgress(((i) / selectedMedia.length) * 100);

        const result = await uploadPortfolioMedia(
          media,
          providerInfo.id
        );

        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }

        setUploadProgress(((i + 1) / selectedMedia.length) * 100);
      }

      Alert.alert('Success! ✨', 'Your post has been published!', [
        { text: 'View Portfolio', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Please try again');
    } finally {
      setUploading(false);
    }
  };

  // Animated styles
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: interpolate(contentOpacity.value, [0, 1], [0.95, 1]) }],
  }));

  // Step indicator component
  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {STEPS.map((step, index) => {
        const isActive = currentStep >= step.id;
        const isCurrent = currentStep === step.id;
        return (
          <React.Fragment key={step.id}>
            <TouchableOpacity
              style={[
                styles.stepDot,
                isActive && styles.stepDotActive,
                isCurrent && styles.stepDotCurrent,
              ]}
              onPress={() => {
                if (step.id < currentStep || (step.id === 2 && selectedMedia.length > 0) || step.id === currentStep) {
                  setCurrentStep(step.id);
                }
              }}
            >
              <Ionicons
                name={step.icon as any}
                size={20}
                color={isActive ? colors.black : colors.textSecondary}
              />
            </TouchableOpacity>
            {index < STEPS.length - 1 && (
              <View style={[styles.stepLine, isActive && styles.stepLineActive]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  // Step 1: Media Selection
  const renderMediaSelection = () => (
    <Animated.View style={contentAnimatedStyle}>
      <FadeInView delay={0}>
        <Text style={styles.stepTitle}>Select Your Best Work</Text>
        <Text style={styles.stepSubtitle}>
          Choose a photo or video that showcases your skills
        </Text>
      </FadeInView>

      <SlideUpView delay={100}>
        <View style={styles.mediaGrid}>
          {/* Add Media Button - only show if no media selected */}
          {selectedMedia.length === 0 && (
            <TouchableOpacity style={styles.addMediaButton} onPress={handleSelectMedia}>
              <LinearGradient
                colors={[colors.primary, '#FF69B4']}
                style={styles.addMediaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add" size={32} color={colors.black} />
                <Text style={styles.addMediaText}>Select Media</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Selected Media */}
          {selectedMedia.map((media, index) => (
            <Animated.View
              key={media.id}
              style={styles.mediaItem}
              entering={FadeIn.delay(index * 50)}
            >
              <Image
                source={{ uri: media.type === 'video' ? media.uri : media.uri }}
                style={styles.mediaThumbnail}
              />
              {media.type === 'video' && (
                <View style={styles.videoIndicator}>
                  <Ionicons name="play-circle" size={24} color={colors.white} />
                  <Text style={styles.videoDuration}>{formatDuration(media.duration)}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.removeMediaButton}
                onPress={() => handleRemoveMedia(media.id)}
              >
                <Ionicons name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </SlideUpView>

      {selectedMedia.length > 0 && (
        <SlideUpView delay={200}>
          <View style={styles.selectedCountContainer}>
            <Text style={styles.selectedCount}>Media selected</Text>
            <TouchableOpacity style={styles.replaceMediaButton} onPress={handleSelectMedia}>
              <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
              <Text style={styles.replaceMediaText}>Replace</Text>
            </TouchableOpacity>
          </View>
        </SlideUpView>
      )}
    </Animated.View>
  );

  // Step 2: Add Details
  const renderAddDetails = () => {
    const currentMedia = selectedMedia[currentMediaIndex];
    if (!currentMedia) return null;

    return (
      <Animated.View style={contentAnimatedStyle}>
        <FadeInView delay={0}>
          <Text style={styles.stepTitle}>Add Details</Text>
          <Text style={styles.stepSubtitle}>
            Tag your service to let customers book directly
          </Text>
        </FadeInView>

        <SlideUpView delay={100}>
          {/* Media Preview */}
          <View style={styles.detailsPreviewContainer}>
            {currentMedia.type === 'video' ? (
              <Video
                source={{ uri: currentMedia.uri }}
                style={styles.detailsPreview}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                useNativeControls
              />
            ) : (
              <Image source={{ uri: currentMedia.uri }} style={styles.detailsPreview} />
            )}
          </View>

          {/* Media Navigation */}
          {selectedMedia.length > 1 && (
            <View style={styles.mediaNavigation}>
              <TouchableOpacity
                style={[styles.mediaNavButton, currentMediaIndex === 0 && styles.mediaNavButtonDisabled]}
                onPress={() => currentMediaIndex > 0 && setCurrentMediaIndex(currentMediaIndex - 1)}
                disabled={currentMediaIndex === 0}
              >
                <Ionicons name="chevron-back" size={24} color={currentMediaIndex === 0 ? colors.textLight : colors.text} />
              </TouchableOpacity>
              <View style={styles.mediaDots}>
                {selectedMedia.map((_, idx) => (
                  <View
                    key={idx}
                    style={[styles.mediaDot, idx === currentMediaIndex && styles.mediaDotActive]}
                  />
                ))}
              </View>
              <TouchableOpacity
                style={[styles.mediaNavButton, currentMediaIndex === selectedMedia.length - 1 && styles.mediaNavButtonDisabled]}
                onPress={() => currentMediaIndex < selectedMedia.length - 1 && setCurrentMediaIndex(currentMediaIndex + 1)}
                disabled={currentMediaIndex === selectedMedia.length - 1}
              >
                <Ionicons name="chevron-forward" size={24} color={currentMediaIndex === selectedMedia.length - 1 ? colors.textLight : colors.text} />
              </TouchableOpacity>
            </View>
          )}
        </SlideUpView>

        <SlideUpView delay={150}>
          {/* Caption Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Caption</Text>
            <TextInput
              style={styles.captionInput}
              placeholder="Write a caption..."
              placeholderTextColor={colors.textLight}
              value={currentMedia.caption}
              onChangeText={(text) => updateMediaDetails(currentMedia.id, { caption: text })}
              multiline
              maxLength={500}
            />
            <Text style={styles.charCount}>{currentMedia.caption.length}/500</Text>
          </View>
        </SlideUpView>

        <SlideUpView delay={200}>
          {/* Service Tag - Required */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Select a Service *</Text>
            <Text style={styles.inputHint}>Customers can book this service directly from your post</Text>
            {services.length === 0 ? (
              <View style={styles.noServicesWarning}>
                <Ionicons name="warning-outline" size={20} color={colors.warning} />
                <Text style={styles.noServicesText}>
                  You need to add services first before creating a portfolio post
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceScroll}>
                {services.map((service) => {
                  const isSelected = currentMedia.serviceId === service.id;
                  return (
                    <TouchableOpacity
                      key={service.id}
                      style={[styles.serviceChip, isSelected && styles.serviceChipSelected]}
                      onPress={() => {
                        if (isSelected) {
                          // Deselect if already selected
                          updateMediaDetails(currentMedia.id, {
                            serviceId: null,
                            serviceName: null,
                          });
                        } else {
                          // Select if not selected
                          updateMediaDetails(currentMedia.id, {
                            serviceId: service.id,
                            serviceName: service.custom_service_name || service.services.name,
                          });
                        }
                      }}
                    >
                      <View style={styles.checkboxContainer}>
                        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                          {isSelected && (
                            <Ionicons name="checkmark" size={14} color={colors.white} />
                          )}
                        </View>
                      </View>
                      <Text style={[styles.serviceChipText, isSelected && styles.serviceChipTextSelected]}>
                        {service.custom_service_name || service.services.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </SlideUpView>
      </Animated.View>
    );
  };

  // Step 3: Review & Post
  const renderReviewPost = () => (
    <Animated.View style={contentAnimatedStyle}>
      <FadeInView delay={0}>
        <Text style={styles.stepTitle}>Ready to Post! ✨</Text>
        <Text style={styles.stepSubtitle}>
          Review your content before publishing
        </Text>
      </FadeInView>

      <SlideUpView delay={100}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewScroll}>
          {selectedMedia.map((media, index) => (
            <Animated.View key={media.id} style={styles.reviewCard} entering={FadeIn.delay(index * 100)}>
              <Image
                source={{ uri: media.uri }}
                style={styles.reviewImage}
              />
              {media.type === 'video' && (
                <View style={styles.reviewVideoIcon}>
                  <Ionicons name="play-circle" size={32} color={colors.white} />
                </View>
              )}
              {media.caption && (
                <View style={styles.reviewCaptionContainer}>
                  <Text style={styles.reviewCaption} numberOfLines={2}>{media.caption}</Text>
                </View>
              )}
              {media.serviceName && (
                <View style={styles.reviewServiceTag}>
                  <Ionicons name="pricetag" size={12} color={colors.primary} />
                  <Text style={styles.reviewServiceText}>{media.serviceName}</Text>
                </View>
              )}
            </Animated.View>
          ))}
        </ScrollView>
      </SlideUpView>

      <SlideUpView delay={200}>
        <View style={styles.reviewSummary}>
          <View style={styles.summaryRow}>
            <Ionicons name="images-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.summaryText}>
              {selectedMedia.filter(m => m.type === 'image').length} photos,{' '}
              {selectedMedia.filter(m => m.type === 'video').length} videos
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="pricetag-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.summaryText}>
              {selectedMedia.filter(m => m.serviceId).length} tagged with services
            </Text>
          </View>
        </View>
      </SlideUpView>

      {uploading && (
        <SlideUpView delay={0}>
          <View style={styles.uploadingContainer}>
            <View style={styles.uploadProgressBar}>
              <View style={[styles.uploadProgressFill, { width: `${uploadProgress}%` }]} />
            </View>
            <Text style={styles.uploadingText}>Uploading... {Math.round(uploadProgress)}%</Text>
          </View>
        </SlideUpView>
      )}
    </Animated.View>
  );

  // Main render
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{STEPS[currentStep - 1].title}</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {currentStep === 1 && renderMediaSelection()}
          {currentStep === 2 && renderAddDetails()}
          {currentStep === 3 && renderReviewPost()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {currentStep > 1 ? (
          <TouchableOpacity style={styles.backButton} onPress={goToPrevStep}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}

        {currentStep < 3 ? (
          <TouchableOpacity
            style={[styles.nextButton, selectedMedia.length === 0 && styles.nextButtonDisabled]}
            onPress={goToNextStep}
            disabled={selectedMedia.length === 0}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={24} color={colors.black} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.postButton, (uploading || !selectedMedia[0]?.serviceId) && styles.postButtonDisabled]}
            onPress={handlePost}
            disabled={uploading || !selectedMedia[0]?.serviceId}
          >
            {uploading ? (
              <ActivityIndicator color={colors.black} />
            ) : (
              <>
                <Text style={styles.postButtonText}>Post Now</Text>
                <Ionicons name="sparkles" size={20} color={colors.black} />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
  },
  closeButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerRight: {
    width: 44,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepDotCurrent: {
    transform: [{ scale: 1.1 }],
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  stepLine: {
    width: 40,
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  stepTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  addMediaButton: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: spacing.xs,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  addMediaGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMediaText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.black,
    marginTop: spacing.xs,
  },
  mediaItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: spacing.xs,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  videoDuration: {
    color: colors.white,
    fontSize: fontSize.xs,
    marginLeft: spacing.xs,
  },
  removeMediaButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  selectedCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  selectedCount: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  replaceMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  replaceMediaText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  noServicesWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  noServicesText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
  },
  // Step 2 styles
  detailsPreviewContainer: {
    width: '100%',
    height: 250,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  detailsPreview: {
    width: '100%',
    height: '100%',
  },
  mediaNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  mediaNavButton: {
    padding: spacing.sm,
  },
  mediaNavButtonDisabled: {
    opacity: 0.3,
  },
  mediaDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  mediaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  mediaDotActive: {
    backgroundColor: colors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  inputHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  captionInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  serviceScroll: {
    marginTop: spacing.sm,
  },
  serviceChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxContainer: {
    marginRight: spacing.sm,
    zIndex: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  serviceChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    paddingRight: spacing.lg,
  },
  serviceChipTextSelected: {
    color: colors.black,
  },
  // Step 3 styles
  reviewScroll: {
    marginBottom: spacing.lg,
  },
  reviewCard: {
    width: 200,
    marginRight: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  reviewImage: {
    width: '100%',
    height: 200,
  },
  reviewVideoIcon: {
    position: 'absolute',
    top: 80,
    left: 84,
  },
  reviewCaptionContainer: {
    padding: spacing.sm,
  },
  reviewCaption: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  reviewServiceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  reviewServiceText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  reviewSummary: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  uploadingContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  uploadProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  uploadProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  uploadingText: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  // Bottom navigation
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    width: 100,
  },
  backButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.xs,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.round,
    gap: spacing.sm,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.black,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.round,
    gap: spacing.sm,
  },
  postButtonDisabled: {
    opacity: 0.7,
  },
  postButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.black,
  },
});

