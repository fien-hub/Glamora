import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '../../utils/icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { uploadProfilePicture, pickImage, requestImagePermissions } from '../../utils/imageUpload';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import { trackProfileEdited } from '../../utils/analytics';
import { TOTAL_HEADER_HEIGHT } from '../../components/CurvedHeader';
import ScaleInView from '../../components/animations/ScaleInView';
import SlideUpView from '../../components/animations/SlideUpView';
import { VerificationStatusCard } from '../../components/VerificationBadge';
import PaymentVerificationPrompt from '../../components/PaymentVerificationPrompt';
import CachedImage, { CachedAvatarImage } from '../../components/CachedImage';
import { getUserVerificationStatus, sendEmailVerification, UserVerificationStatus } from '../../services/verification';

interface CategoryInfo {
  id: string;
  name: string;
  icon_emoji?: string;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  bio: string | null;
  locationAddress: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationZipCode: string | null;
  preferredCategories: CategoryInfo[];
  bookingTimePreference: string | null;
  budgetPreference: string | null;
  avatarUrl: string | null;
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut, switchRole } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState({ services: 0, providers: 0 });
  const [verificationStatus, setVerificationStatus] = useState<UserVerificationStatus | null>(null);
  const [sendingEmailVerification, setSendingEmailVerification] = useState(false);

  // Track screen view
  useScreenTracking('Customer Profile');

  useEffect(() => {
    fetchProfile();
    fetchVerificationStatus();
  }, [user]);

  // Refresh profile when screen gains focus (e.g., after editing)
  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
      fetchVerificationStatus();
    }, [user])
  );

  const fetchVerificationStatus = async () => {
    try {
      const status = await getUserVerificationStatus();
      setVerificationStatus(status);
    } catch (error) {
      console.error('Error fetching verification status:', error);
    }
  };

  const handleSendEmailVerification = async () => {
    if (sendingEmailVerification) return;

    setSendingEmailVerification(true);
    try {
      await sendEmailVerification();
      Alert.alert('Verification Sent', 'Please check your inbox for the verification link.');
      await fetchVerificationStatus();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to send verification email');
    } finally {
      setSendingEmailVerification(false);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;

    try {
      // First get profile ID (needed for most queries)
      const { data: profileIdData, error: profileIdError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, bio, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (profileIdError) throw profileIdError;

      const profileId = profileIdData?.id;
      if (!profileId) {
        throw new Error('Profile not found');
      }

      // Fetch customer profile data using profile ID
      const { data: customerData } = await supabase
        .from('customer_profiles')
        .select(`
          location_address,
          location_city,
          location_state,
          location_zip_code,
          preferred_categories,
          booking_time_preference,
          budget_preference
        `)
        .eq('id', profileId)
        .single();

      // Fetch category names for preferred categories
      let categoryNames: CategoryInfo[] = [];
      const preferredCategoryIds = customerData?.preferred_categories || [];
      if (preferredCategoryIds.length > 0) {
        const { data: categoriesData } = await supabase
          .from('service_categories')
          .select('id, name, icon')
          .in('id', preferredCategoryIds);

        categoryNames = (categoriesData || []).map(cat => ({
          id: cat.id,
          name: cat.name,
          icon_emoji: cat.icon,
        }));
      }

      setProfile({
        firstName: profileIdData?.first_name || '',
        lastName: profileIdData?.last_name || '',
        email: user.email || '',
        phone: profileIdData?.phone || null,
        bio: profileIdData?.bio || null,
        locationAddress: customerData?.location_address || null,
        locationCity: customerData?.location_city || null,
        locationState: customerData?.location_state || null,
        locationZipCode: customerData?.location_zip_code || null,
        preferredCategories: categoryNames,
        bookingTimePreference: customerData?.booking_time_preference || null,
        budgetPreference: customerData?.budget_preference || null,
        avatarUrl: profileIdData?.avatar_url || null,
      });

      // Fetch favorites count using profile ID
      const [servicesCount, providersCount] = await Promise.all([
        supabase
          .from('favorite_services')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', profileId),
        supabase
          .from('favorite_providers')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', profileId),
      ]);

      setFavoritesCount({
        services: servicesCount.count || 0,
        providers: providersCount.count || 0,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handlePickImage = async () => {
    if (!user) return;

    try {
      // Request permission
      const hasPermission = await requestImagePermissions();

      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload a profile picture.'
        );
        return;
      }

      // Pick image
      const uri = await pickImage({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (uri) {
        await handleUploadProfilePicture(uri);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleUploadProfilePicture = async (uri: string) => {
    if (!user) return;

    setUploadingImage(true);
    try {
      // Upload to Supabase Storage
      const result = await uploadProfilePicture(uri, user.id);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update profile with avatar URL
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: result.url })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setProfile(prev => prev ? { ...prev, avatarUrl: result.url || null } : null);

      // Track profile edit
      trackProfileEdited();

      Alert.alert('Success', 'Profile picture updated!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', error.message || 'Failed to update profile picture');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEditProfile = () => {
    (navigation as any).navigate('EditProfile');
  };

  const handleChangePassword = () => {
    (navigation as any).navigate('ChangePassword');
  };

  const handleSwitchToProvider = () => {
    Alert.alert(
      'Switch to Provider Mode',
      'You will switch to provider mode. If your provider profile is incomplete, Glamora will take you to provider onboarding.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            try {
              setSwitchingRole(true);
              await switchRole('provider');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to switch to provider mode');
            } finally {
              setSwitchingRole(false);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const getInitials = () => {
    if (!profile) return '?';
    return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
  };

  const formatPreference = (value: string | null) => {
    if (!value) return 'Not set';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const locationText = [
    profile?.locationAddress,
    profile?.locationCity,
    profile?.locationState,
    profile?.locationZipCode,
  ].filter(Boolean).join(', ');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load profile</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentWrapper}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header Section with animations */}
        <ScaleInView delay={0}>
          <View style={styles.headerCard}>
            <View style={styles.avatarContainer}>
              {profile.avatarUrl ? (
                <CachedAvatarImage uri={profile.avatarUrl} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials()}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.editAvatarButton}
                onPress={handlePickImage}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons name="camera" size={16} color={colors.white} />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.name}>
              {profile.firstName} {profile.lastName}
            </Text>
            <Text style={styles.email}>{profile.email}</Text>
          </View>
        </ScaleInView>

      {/* Verification Status Card */}
      {verificationStatus && (
        <SlideUpView delay={100}>
          <View style={styles.section}>
            <VerificationStatusCard
              emailVerified={verificationStatus.emailVerified}
              paymentVerified={verificationStatus.paymentMethodVerified}
              onVerifyEmail={() => Alert.alert(
                'Email Verification',
                'A verification link will be sent to your email address.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: sendingEmailVerification ? 'Sending...' : 'Send', onPress: handleSendEmailVerification },
                ]
              )}
              onVerifyPayment={() => navigation.navigate('PaymentMethods')}
            />

            {!verificationStatus.paymentMethodVerified && (
              <PaymentVerificationPrompt
                containerStyle={{ marginTop: spacing.sm }}
                onPress={() => navigation.navigate('PaymentMethods')}
              />
            )}
          </View>
        </SlideUpView>
      )}

      {/* Personal Information Section */}
      <SlideUpView delay={150}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <TouchableOpacity onPress={handleEditProfile} style={styles.editIconButton}>
              <Ionicons name="pencil" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRowCompact}>
            <View style={styles.infoLabelRow}>
              <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoLabel}>Email</Text>
            </View>
            <Text style={styles.infoValue}>{profile.email}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRowCompact}>
            <View style={styles.infoLabelRow}>
              <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoLabel}>Phone</Text>
            </View>
            <Text style={styles.infoValue}>
              {profile.phone || 'Not provided'}
            </Text>
          </View>

          {profile.bio && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRowCompact}>
                <View style={styles.infoLabelRow}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoLabel}>Bio</Text>
                </View>
                <Text style={styles.infoValue}>{profile.bio}</Text>
              </View>
            </>
          )}
        </View>
      </View>
      </SlideUpView>

      {/* Location Section */}
      {(profile.locationAddress || profile.locationCity) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Location</Text>
            <TouchableOpacity onPress={handleEditProfile} style={styles.editIconButton}>
              <Ionicons name="pencil" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRowCompact}>
              <View style={styles.infoLabelRow}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.infoLabel}>Address</Text>
              </View>
              <Text style={styles.infoValue}>{locationText || 'Not provided'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRowCompact}>
            <View style={styles.infoLabelRow}>
              <Ionicons name="sparkles-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoLabel}>Preferred Services</Text>
            </View>
            <View style={styles.categoriesContainer}>
              {profile.preferredCategories.length > 0 ? (
                profile.preferredCategories.map((category, index) => (
                  <View key={category.id || index} style={styles.categoryChip}>
                    <Text style={styles.categoryText}>
                      {category.icon_emoji} {category.name}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.infoValue}>Not set</Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRowCompact}>
            <View style={styles.infoLabelRow}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoLabel}>Booking Time</Text>
            </View>
            <Text style={styles.infoValue}>
              {formatPreference(profile.bookingTimePreference)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRowCompact}>
            <View style={styles.infoLabelRow}>
              <Ionicons name="wallet-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoLabel}>Budget</Text>
            </View>
            <Text style={styles.infoValue}>
              {formatPreference(profile.budgetPreference)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Switch Mode</Text>

        <View style={styles.switchCard}>
          <View style={styles.switchHeader}>
            <View style={styles.switchIconWrap}>
              <Ionicons name="swap-horizontal" size={20} color={colors.primaryDarker} />
            </View>
            <View style={styles.switchTextWrap}>
              <Text style={styles.switchTitle}>Become a Provider</Text>
              <Text style={styles.switchSubtitle}>
                Switch to provider mode to manage services, bookings, and your business profile.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.switchButton, switchingRole && styles.switchButtonDisabled]}
            onPress={handleSwitchToProvider}
            disabled={switchingRole}
          >
            {switchingRole ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Text style={styles.switchButtonText}>Switch to Provider</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.white} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
          <Ionicons name="create-outline" size={20} color={colors.primaryDarker} style={styles.actionIconIonicons} />
          <Text style={styles.actionText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Favorites')}
        >
          <Ionicons name="heart-outline" size={20} color={colors.primaryDarker} style={styles.actionIconIonicons} />
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionText}>My Favorites</Text>
            {(favoritesCount.services + favoritesCount.providers) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {favoritesCount.services + favoritesCount.providers}
                </Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('SavedPosts')}
        >
          <Ionicons name="bookmark-outline" size={20} color={colors.primaryDarker} style={styles.actionIconIonicons} />
          <Text style={styles.actionText}>Saved Posts</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleChangePassword}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.primaryDarker} style={styles.actionIconIonicons} />
          <Text style={styles.actionText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('SecuritySettings')}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primaryDarker} style={styles.actionIconIonicons} />
          <Text style={styles.actionText}>Security Settings</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => (navigation as any).navigate('PaymentHistory')}
        >
          <Ionicons name="receipt-outline" size={20} color={colors.primaryDarker} style={styles.actionIconIonicons} />
          <Text style={styles.actionText}>Payment History</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => (navigation as any).navigate('PaymentMethods')}
        >
          <Ionicons name="card-outline" size={20} color={colors.primaryDarker} style={styles.actionIconIonicons} />
          <Text style={styles.actionText}>Payment Methods</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => (navigation as any).navigate('NotificationSettings')}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.primaryDarker} style={styles.actionIconIonicons} />
          <Text style={styles.actionText}>Notification Settings</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => (navigation as any).navigate('HelpSupport')}
        >
          <Ionicons name="help-circle-outline" size={20} color={colors.primaryDarker} style={styles.actionIconIonicons} />
          <Text style={styles.actionText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => (navigation as any).navigate('AccountSettings')}
        >
          <Ionicons name="settings-outline" size={20} color={colors.primaryDarker} style={styles.actionIconIonicons} />
          <Text style={styles.actionText}>Account Settings</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Spacing */}
      <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  scrollView: {
    flex: 1,
  },
  contentWrapper: {
    paddingTop: TOTAL_HEADER_HEIGHT, // Content starts below header
    paddingBottom: 120, // Space for floating tab bar + extra padding
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundGray,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  headerCard: {
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.xxl,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  avatarText: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryDarker,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  name: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  editIconButton: {
    padding: spacing.xs,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  infoRowCompact: {
    paddingVertical: spacing.xs,
  },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  categoryChip: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.primaryLighter,
  },
  categoryText: {
    fontSize: fontSize.sm,
    color: colors.primaryDarker,
    fontWeight: fontWeight.medium,
  },
  switchCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  switchHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  switchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  switchTextWrap: {
    flex: 1,
  },
  switchTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  switchSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  switchButton: {
    backgroundColor: colors.primaryDarker,
    borderRadius: borderRadius.md,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  switchButtonDisabled: {
    opacity: 0.7,
  },
  switchButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  actionIconIonicons: {
    marginRight: spacing.sm,
    width: 24,
    textAlign: 'center',
  },
  actionTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  badge: {
    backgroundColor: colors.primaryDarker,
    borderRadius: borderRadius.round,
    minWidth: 20,
    height: 20,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.surface,
  },
  signOutButton: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  signOutButtonText: {
    color: colors.error,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});

