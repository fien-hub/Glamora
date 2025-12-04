import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import {
  pickMultipleMedia,
  uploadPortfolioMedia,
  requestImagePermissions,
  MediaAsset
} from '../../utils/imageUpload';
import { colors, spacing, fontSize, borderRadius } from '../../constants/theme';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import SharePortfolioModal from '../../components/SharePortfolioModal';
import FadeInView from '../../components/animations/FadeInView';
import StaggeredList from '../../components/animations/StaggeredList';

interface PortfolioItem {
  id: string;
  provider_id: string;
  image_url: string;
  video_url: string | null;
  thumbnail_url: string | null;
  media_type: 'image' | 'video';
  video_duration_seconds: number | null;
  display_order: number;
  caption: string | null;
  tags: string[] | null;
  is_before_after: boolean;
  paired_image_id: string | null;
  view_count: number;
  like_count: number;
  provider_service_id: string | null;
  created_at: string;
}

interface ProviderService {
  id: string;
  service_id: string;
  base_price: number;
  duration_minutes: number;
  custom_service_name: string | null;
  services: {
    name: string;
  };
}

interface PendingUpload {
  asset: MediaAsset;
  caption: string;
  serviceId: string | null;
}

export default function PortfolioScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [caption, setCaption] = useState('');
  const [providerInfo, setProviderInfo] = useState<{ id: string; businessName: string } | null>(null);

  // New states for smooth upload flow
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [providerServices, setProviderServices] = useState<ProviderService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [uploadCaption, setUploadCaption] = useState('');

  // Video playback state
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const videoRef = useRef<Video>(null);

  // Track screen view
  useScreenTracking('Provider Portfolio');

  useEffect(() => {
    fetchProviderInfo();
    fetchProviderServices();
  }, []);

  // Refresh portfolio when screen comes into focus (e.g., after creating a post)
  useFocusEffect(
    useCallback(() => {
      fetchPortfolio();
    }, [])
  );

  const fetchProviderInfo = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, business_name')
        .eq('user_id', user?.id)
        .single();

      if (profileData) {
        setProviderInfo({
          id: profileData.id,
          businessName: profileData.business_name || 'My Business',
        });
      }
    } catch (error) {
      console.error('Error fetching provider info:', error);
    }
  };

  const fetchProviderServices = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profileData) return;

      const { data, error } = await supabase
        .from('provider_services')
        .select(`
          id,
          service_id,
          base_price,
          duration_minutes,
          custom_service_name,
          services (
            name
          )
        `)
        .eq('provider_id', profileData.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Format the data to match our interface
      const formattedServices = (data || []).map((ps: any) => ({
        id: ps.id,
        service_id: ps.service_id,
        base_price: ps.base_price,
        duration_minutes: ps.duration_minutes,
        custom_service_name: ps.custom_service_name,
        services: {
          name: ps.services?.name || 'Unknown Service'
        }
      }));

      setProviderServices(formattedServices);
    } catch (error) {
      console.error('Error fetching provider services:', error);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profileData) return;

      const { data, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('provider_id', profileData.id)
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Map data to include default media_type for backward compatibility
      const items = (data || []).map(item => ({
        ...item,
        media_type: item.media_type || 'image',
      }));
      setPortfolioItems(items);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedia = async () => {
    try {
      // Request permissions
      const hasPermission = await requestImagePermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload portfolio media.'
        );
        return;
      }

      // Pick multiple images and videos
      const mediaAssets = await pickMultipleMedia({ maxItems: 10, videoMaxDuration: 60 });

      if (mediaAssets.length === 0) {
        return;
      }

      // Initialize pending uploads
      const uploads: PendingUpload[] = mediaAssets.map(asset => ({
        asset,
        caption: '',
        serviceId: null,
      }));

      setPendingUploads(uploads);
      setCurrentUploadIndex(0);
      setUploadCaption('');
      setSelectedServiceId(null);
      setShowUploadModal(true);
    } catch (error: any) {
      console.error('Error selecting images:', error);
      Alert.alert('Error', error.message || 'Failed to select images');
    }
  };

  const handleNextUpload = () => {
    // Save current upload data
    const updatedUploads = [...pendingUploads];
    updatedUploads[currentUploadIndex] = {
      ...updatedUploads[currentUploadIndex],
      caption: uploadCaption,
      serviceId: selectedServiceId,
    };
    setPendingUploads(updatedUploads);

    // Move to next image or finish
    if (currentUploadIndex < pendingUploads.length - 1) {
      setCurrentUploadIndex(currentUploadIndex + 1);
      setUploadCaption('');
      setSelectedServiceId(null);
    } else {
      // All images tagged, now upload
      handleUploadAll(updatedUploads);
    }
  };

  const handleSkipUpload = () => {
    // Skip current image without saving data
    if (currentUploadIndex < pendingUploads.length - 1) {
      setCurrentUploadIndex(currentUploadIndex + 1);
      setUploadCaption('');
      setSelectedServiceId(null);
    } else {
      // Last image, upload all
      handleUploadAll(pendingUploads);
    }
  };

  const handleUploadAll = async (uploads: PendingUpload[]) => {
    setShowUploadModal(false);
    setUploading(true);

    try {
      // Get provider ID
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profileData) {
        throw new Error('Profile not found');
      }

      // Upload all media (images and videos)
      let successCount = 0;
      for (let i = 0; i < uploads.length; i++) {
        const upload = uploads[i];

        try {
          const result = await uploadPortfolioMedia(upload.asset, user?.id || '');

          if (!result.success) {
            console.error(`Failed to upload media ${i + 1}:`, result.error);
            continue;
          }

          // Insert into database with service tag
          const insertData: any = {
            provider_id: profileData.id,
            display_order: portfolioItems.length + i,
            caption: upload.caption || null,
            provider_service_id: upload.serviceId || null,
            media_type: result.mediaType,
          };

          if (result.mediaType === 'video') {
            insertData.video_url = result.videoUrl;
            insertData.thumbnail_url = result.thumbnailUrl;
            insertData.video_duration_seconds = result.duration;
            insertData.image_url = result.thumbnailUrl || ''; // Use thumbnail as fallback image
          } else {
            insertData.image_url = result.imageUrl;
          }

          const { error } = await supabase.from('portfolio_items').insert(insertData);

          if (error) {
            console.error(`Failed to save media ${i + 1}:`, error);
            continue;
          }

          successCount++;
        } catch (err) {
          console.error(`Error processing media ${i + 1}:`, err);
        }
      }

      if (successCount > 0) {
        const mediaType = uploads.some(u => u.asset.type === 'video') ? 'media' : 'image(s)';
        Alert.alert('Success', `${successCount} of ${uploads.length} ${mediaType} uploaded successfully!`);
        fetchPortfolio();
      } else {
        Alert.alert('Error', 'Failed to upload media. Please try again.');
      }
    } catch (error: any) {
      console.error('Error uploading media:', error);
      Alert.alert('Error', error.message || 'Failed to upload media');
    } finally {
      setUploading(false);
      setPendingUploads([]);
      setCurrentUploadIndex(0);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('portfolio_items')
                .delete()
                .eq('id', itemId);

              if (error) throw error;

              // Reorder remaining items
              await reorderItems();

              fetchPortfolio();
              Alert.alert('Success', 'Item deleted');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleEditCaption = (item: PortfolioItem) => {
    setSelectedItem(item);
    setCaption(item.caption || '');
    setShowCaptionModal(true);
  };

  const handleSaveCaption = async () => {
    if (!selectedItem) return;

    try {
      const { error } = await supabase
        .from('portfolio_items')
        .update({ caption })
        .eq('id', selectedItem.id);

      if (error) throw error;

      setShowCaptionModal(false);
      setSelectedItem(null);
      setCaption('');
      fetchPortfolio();
      Alert.alert('Success', 'Caption updated');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const reorderItems = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profileData) return;

      const { data: items } = await supabase
        .from('portfolio_items')
        .select('id')
        .eq('provider_id', profileData.id)
        .order('display_order', { ascending: true });

      if (!items) return;

      // Update display order
      const updates = items.map((item, index) =>
        supabase
          .from('portfolio_items')
          .update({ display_order: index })
          .eq('id', item.id)
      );

      await Promise.all(updates);
    } catch (error) {
      console.error('Error reordering items:', error);
    }
  };

  const moveItem = async (itemId: string, direction: 'up' | 'down') => {
    const currentIndex = portfolioItems.findIndex(item => item.id === itemId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= portfolioItems.length) return;

    try {
      // Swap display orders
      const currentItem = portfolioItems[currentIndex];
      const swapItem = portfolioItems[newIndex];

      await Promise.all([
        supabase
          .from('portfolio_items')
          .update({ display_order: newIndex })
          .eq('id', currentItem.id),
        supabase
          .from('portfolio_items')
          .update({ display_order: currentIndex })
          .eq('id', swapItem.id),
      ]);

      fetchPortfolio();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Format video duration as MM:SS
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Portfolio</Text>
          <Text style={styles.subtitle}>
            Showcase your best work to attract more customers
          </Text>
        </View>

        {/* Portfolio Grid */}
        {portfolioItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📸</Text>
            <Text style={styles.emptyTitle}>No Portfolio Items Yet</Text>
            <Text style={styles.emptyDescription}>
              Add photos and videos of your work to showcase your skills
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {portfolioItems.map((item, index) => (
              <View key={item.id} style={styles.portfolioItem}>
                {/* Media Display */}
                {item.media_type === 'video' ? (
                  <TouchableOpacity
                    style={styles.videoContainer}
                    onPress={() => setPlayingVideoId(playingVideoId === item.id ? null : item.id)}
                  >
                    {playingVideoId === item.id ? (
                      <Video
                        ref={videoRef}
                        source={{ uri: item.video_url || '' }}
                        style={styles.portfolioImage}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay
                        isLooping
                        useNativeControls
                      />
                    ) : (
                      <>
                        <Image
                          source={{ uri: item.thumbnail_url || item.image_url }}
                          style={styles.portfolioImage}
                          resizeMode="cover"
                        />
                        <View style={styles.videoOverlay}>
                          <Ionicons name="play-circle" size={48} color={colors.white} />
                        </View>
                        {item.video_duration_seconds && (
                          <View style={styles.durationBadge}>
                            <Text style={styles.durationText}>
                              {formatDuration(item.video_duration_seconds)}
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.portfolioImage}
                    resizeMode="cover"
                  />
                )}

                {/* Reorder Controls */}
                <View style={styles.reorderControls}>
                  {index > 0 && (
                    <TouchableOpacity
                      style={styles.reorderButton}
                      onPress={() => moveItem(item.id, 'up')}
                    >
                      <Text style={styles.reorderButtonText}>⬆️</Text>
                    </TouchableOpacity>
                  )}
                  {index < portfolioItems.length - 1 && (
                    <TouchableOpacity
                      style={styles.reorderButton}
                      onPress={() => moveItem(item.id, 'down')}
                    >
                      <Text style={styles.reorderButtonText}>⬇️</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setSelectedItem(item);
                      setShowShareModal(true);
                    }}
                  >
                    <Text style={styles.actionButtonText}>📤</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditCaption(item)}
                  >
                    <Text style={styles.actionButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteItem(item.id)}
                  >
                    <Text style={styles.actionButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>

                {/* Caption */}
                {item.caption && (
                  <View style={styles.captionContainer}>
                    <Text style={styles.captionText} numberOfLines={2}>
                      {item.caption}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Portfolio Tips</Text>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Use high-quality, well-lit photos</Text>
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Show before/after transformations</Text>
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Include variety of your services</Text>
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Update regularly with recent work</Text>
          </View>
        </View>
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('CreatePost')}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text style={styles.addButtonText}>+ Add Photos / Videos</Text>
        )}
      </TouchableOpacity>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.uploadModalContent}>
            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {pendingUploads[currentUploadIndex]?.asset.type === 'video' ? 'Video' : 'Image'} {currentUploadIndex + 1} of {pendingUploads.length}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${((currentUploadIndex + 1) / pendingUploads.length) * 100}%` }
                  ]}
                />
              </View>
            </View>

            {/* Media Preview */}
            {pendingUploads[currentUploadIndex] && (
              pendingUploads[currentUploadIndex].asset.type === 'video' ? (
                <View style={styles.uploadPreviewContainer}>
                  <Video
                    source={{ uri: pendingUploads[currentUploadIndex].asset.uri }}
                    style={styles.uploadPreviewImage}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    useNativeControls
                  />
                  <View style={styles.videoBadge}>
                    <Ionicons name="videocam" size={16} color={colors.white} />
                    <Text style={styles.videoBadgeText}>
                      {formatDuration(pendingUploads[currentUploadIndex].asset.duration || 0)}
                    </Text>
                  </View>
                </View>
              ) : (
                <Image
                  source={{ uri: pendingUploads[currentUploadIndex].asset.uri }}
                  style={styles.uploadPreviewImage}
                  resizeMode="cover"
                />
              )
            )}

            {/* Service Selection */}
            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>🏷️ Tag Service (Optional)</Text>
              <Text style={styles.uploadHint}>
                Help customers book this service directly from your post
              </Text>
              <ScrollView
                style={styles.serviceList}
                showsVerticalScrollIndicator={false}
              >
                <TouchableOpacity
                  style={[
                    styles.serviceOption,
                    selectedServiceId === null && styles.serviceOptionSelected
                  ]}
                  onPress={() => setSelectedServiceId(null)}
                >
                  <Text style={[
                    styles.serviceOptionText,
                    selectedServiceId === null && styles.serviceOptionTextSelected
                  ]}>
                    No Service Tag
                  </Text>
                </TouchableOpacity>
                {providerServices.map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    style={[
                      styles.serviceOption,
                      selectedServiceId === service.id && styles.serviceOptionSelected
                    ]}
                    onPress={() => setSelectedServiceId(service.id)}
                  >
                    <View style={styles.serviceOptionContent}>
                      <Text style={[
                        styles.serviceOptionText,
                        selectedServiceId === service.id && styles.serviceOptionTextSelected
                      ]}>
                        {service.custom_service_name || service.services.name}
                      </Text>
                      <Text style={styles.servicePrice}>
                        ${(service.base_price / 100).toFixed(2)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Caption Input */}
            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>✍️ Caption (Optional)</Text>
              <TextInput
                style={styles.uploadCaptionInput}
                value={uploadCaption}
                onChangeText={setUploadCaption}
                placeholder="Describe this work..."
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={200}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.uploadButtons}>
              <TouchableOpacity
                style={[styles.uploadButton, styles.skipButton]}
                onPress={handleSkipUpload}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.uploadButton, styles.nextButton]}
                onPress={handleNextUpload}
              >
                <Text style={styles.nextButtonText}>
                  {currentUploadIndex < pendingUploads.length - 1 ? 'Next' : 'Upload All'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Caption Modal */}
      <Modal
        visible={showCaptionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCaptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Caption</Text>
            <TextInput
              style={styles.captionInput}
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a caption..."
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={200}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCaptionModal(false);
                  setSelectedItem(null);
                  setCaption('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveCaption}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Share Portfolio Modal */}
      {selectedItem && providerInfo && (
        <SharePortfolioModal
          visible={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setSelectedItem(null);
          }}
          portfolioItem={selectedItem}
          provider={providerInfo}
        />
      )}
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
  },
  content: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
    marginTop: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
  },
  portfolioItem: {
    width: '48%',
    margin: '1%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  portfolioImage: {
    width: '100%',
    height: 150,
    backgroundColor: colors.border,
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  durationText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  reorderControls: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'column',
    gap: spacing.xs,
  },
  reorderButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderButtonText: {
    fontSize: 16,
  },
  actionButtons: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(220, 38, 38, 0.8)',
  },
  actionButtonText: {
    fontSize: 16,
  },
  captionContainer: {
    padding: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  captionText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  tipsSection: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  tipsTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  tip: {
    marginBottom: spacing.sm,
  },
  tipText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  addButton: {
    backgroundColor: colors.primary,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.black,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  captionInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.black,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  // Upload Modal Styles
  uploadModalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '90%',
    maxHeight: '85%',
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  uploadPreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  uploadPreviewImage: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  videoBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  videoBadgeText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  uploadSection: {
    marginBottom: spacing.md,
  },
  uploadLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  uploadHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  serviceList: {
    maxHeight: 150,
    marginBottom: spacing.sm,
  },
  serviceOption: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  serviceOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  serviceOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceOptionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  serviceOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  servicePrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  uploadCaptionInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  uploadButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: colors.border,
  },
  skipButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: colors.primary,
  },
  nextButtonText: {
    color: colors.black,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
