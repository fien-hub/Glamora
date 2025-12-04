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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { uploadProfilePicture, pickImage, requestImagePermissions } from '../../utils/imageUpload';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import { trackProfileEdited } from '../../utils/analytics';
import { TOTAL_HEADER_HEIGHT } from '../../components/CurvedHeader';
import FadeInView from '../../components/animations/FadeInView';
import ScaleInView from '../../components/animations/ScaleInView';
import SlideUpView from '../../components/animations/SlideUpView';
import { VerificationStatusCard } from '../../components/VerificationBadge';
import { getUserVerificationStatus, UserVerificationStatus } from '../../services/verification';

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
  loyaltyPoints: number;
  avatarUrl: string | null;
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState({ services: 0, providers: 0 });
  const [verificationStatus, setVerificationStatus] = useState<UserVerificationStatus | null>(null);

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

  const fetchProfile = async () => {
    if (!user) return;

    try {
      // Fetch user profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, bio, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      // Fetch customer profile data
      const { data: customerData, error: customerError } = await supabase
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
        .eq('id', profileData ? (await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()).data?.id : null)
        .single();

      // Fetch loyalty points
      const { data: loyaltyData } = await supabase
        .from('loyalty_points')
        .select('points')
        .eq('customer_id', (await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()).data?.id)
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
        firstName: profileData?.first_name || '',
        lastName: profileData?.last_name || '',
        email: user.email || '',
        phone: profileData?.phone || null,
        bio: profileData?.bio || null,
        locationAddress: customerData?.location_address || null,
        locationCity: customerData?.location_city || null,
        locationState: customerData?.location_state || null,
        locationZipCode: customerData?.location_zip_code || null,
        preferredCategories: categoryNames,
        bookingTimePreference: customerData?.booking_time_preference || null,
        budgetPreference: customerData?.budget_preference || null,
        loyaltyPoints: loyaltyData?.points || 0,
        avatarUrl: profileData?.avatar_url || null,
      });

      // Fetch favorites count
      const [servicesCount, providersCount] = await Promise.all([
        supabase
          .from('favorite_services')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', user.id),
        supabase
          .from('favorite_providers')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', user.id),
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
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
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
                <Text style={styles.editAvatarText}>
                  {uploadingImage ? '⏳' : '📷'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.name}>
              {profile.firstName} {profile.lastName}
            </Text>
            <Text style={styles.email}>{profile.email}</Text>

            {/* Loyalty Points Badge */}
            <View style={styles.loyaltyBadge}>
              <Text style={styles.loyaltyIcon}>⭐</Text>
              <Text style={styles.loyaltyPoints}>{profile.loyaltyPoints} Points</Text>
            </View>
          </View>
        </ScaleInView>

      {/* Verification Status Card */}
      {verificationStatus && (
        <SlideUpView delay={100}>
          <View style={styles.section}>
            <VerificationStatusCard
              phoneVerified={verificationStatus.phoneVerified}
              emailVerified={verificationStatus.emailVerified}
              paymentVerified={verificationStatus.paymentMethodVerified}
              onVerifyPhone={() => navigation.navigate('PhoneVerification', {
                phoneNumber: profile.phone,
                onSuccess: fetchVerificationStatus,
              })}
              onVerifyEmail={() => Alert.alert(
                'Email Verification',
                'A verification link will be sent to your email address.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Send', onPress: () => {/* TODO: Send email verification */} },
                ]
              )}
              onVerifyPayment={() => navigation.navigate('PaymentMethods')}
            />
          </View>
        </SlideUpView>
      )}

      {/* Personal Information Section with slide-up animation */}
      <SlideUpView delay={150}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <TouchableOpacity onPress={handleEditProfile} style={styles.editIconButton}>
              <Ionicons name="pencil" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📧 Email</Text>
            <Text style={styles.infoValue}>{profile.email}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📱 Phone</Text>
            <Text style={styles.infoValue}>
              {profile.phone || 'Not provided'}
            </Text>
          </View>

          {profile.bio && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>💬 Bio</Text>
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
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>📍 Address</Text>
              <Text style={styles.infoValue}>
                {profile.locationAddress}
                {'\n'}
                {profile.locationCity}, {profile.locationState} {profile.locationZipCode}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>💅 Preferred Services</Text>
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

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>⏰ Booking Time</Text>
            <Text style={styles.infoValue}>
              {formatPreference(profile.bookingTimePreference)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>💰 Budget</Text>
            <Text style={styles.infoValue}>
              {formatPreference(profile.budgetPreference)}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
          <Text style={styles.actionIcon}>✏️</Text>
          <Text style={styles.actionText}>Edit Profile</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Favorites')}
        >
          <Text style={styles.actionIcon}>❤️</Text>
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
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('SavedPosts')}
        >
          <Text style={styles.actionIcon}>🔖</Text>
          <Text style={styles.actionText}>Saved Posts</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleChangePassword}>
          <Text style={styles.actionIcon}>🔒</Text>
          <Text style={styles.actionText}>Change Password</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('SecuritySettings')}
        >
          <Text style={styles.actionIcon}>🔐</Text>
          <Text style={styles.actionText}>Security Settings</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => (navigation as any).navigate('PaymentHistory')}
        >
          <Text style={styles.actionIcon}>💳</Text>
          <Text style={styles.actionText}>Payment History</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => (navigation as any).navigate('PaymentMethods')}
        >
          <Ionicons name="card-outline" size={24} color={colors.primary} style={styles.actionIconIonicons} />
          <Text style={styles.actionText}>Payment Methods</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => (navigation as any).navigate('NotificationSettings')}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.primary} style={styles.actionIconIonicons} />
          <Text style={styles.actionText}>Notification Settings</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => (navigation as any).navigate('HelpSupport')}
        >
          <Ionicons name="help-circle-outline" size={24} color={colors.primary} style={styles.actionIconIonicons} />
          <Text style={styles.actionText}>Help & Support</Text>
          <Text style={styles.actionArrow}>›</Text>
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
  header: {
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  editAvatarText: {
    fontSize: 16,
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
  loyaltyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryDarker + '20',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.primaryDarker,
  },
  loyaltyIcon: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  loyaltyPoints: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
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
  infoRow: {
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
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
    backgroundColor: colors.secondary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.secondary + '30',
  },
  categoryText: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    fontWeight: fontWeight.medium,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  actionIconIonicons: {
    marginRight: spacing.md,
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
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    minWidth: 24,
    height: 24,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.surface,
  },
  actionArrow: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  signOutButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  signOutButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});

