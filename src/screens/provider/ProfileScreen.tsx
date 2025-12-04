import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, dbService } from '../../services/supabase';
import { uploadProfilePicture, pickImage, requestImagePermissions } from '../../utils/imageUpload';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import { trackProfileEdited } from '../../utils/analytics';
import { getVerificationStatus } from '../../services/verification';
import { TOTAL_HEADER_HEIGHT } from '../../components/CurvedHeader';
import ScaleInView from '../../components/animations/ScaleInView';
import SlideUpView from '../../components/animations/SlideUpView';
import StaggeredList from '../../components/animations/StaggeredList';

interface DashboardStats {
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  totalEarnings: number;
  monthlyEarnings: number;
  averageRating: number;
  totalReviews: number;
}

interface PortfolioItem {
  id: string;
  image_url: string;
  caption: string | null;
  like_count: number;
  view_count: number;
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    totalEarnings: 0,
    monthlyEarnings: 0,
    averageRating: 0,
    totalReviews: 0,
  });
  const [verificationStatus, setVerificationStatus] = useState<string>('pending');

  // Track screen view
  useScreenTracking('Provider Profile');

  useEffect(() => {
    fetchProfile();
    fetchDashboardData();
    fetchPortfolioItems();
    fetchVerificationStatus();
  }, []);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setAvatarUrl(data?.avatar_url || null);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolioItems = async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) return;

      const { data, error } = await supabase
        .from('portfolio_items')
        .select('id, image_url, caption, like_count, view_count')
        .eq('provider_id', profileData.id)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setPortfolioItems(data || []);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    }
  };

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch bookings
      const { data: bookingsData, error: bookingsError } = await dbService.getBookings(user.id, 'provider');

      if (bookingsError) throw bookingsError;

      const bookings = bookingsData || [];

      // Calculate stats
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const upcoming = bookings.filter((b: any) =>
        b.status === 'confirmed' && new Date(b.scheduled_date) > now
      );

      const completed = bookings.filter((b: any) => b.status === 'completed');

      // Fetch payments for earnings
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, created_at')
        .in('booking_id', bookings.map((b: any) => b.id))
        .eq('status', 'succeeded');

      const totalEarnings = payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;

      const monthlyPayments = payments?.filter((p: any) =>
        new Date(p.created_at) >= firstDayOfMonth
      ) || [];
      const monthlyEarnings = monthlyPayments.reduce((sum: number, p: any) => sum + p.amount, 0);

      // Fetch reviews
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', user.id);

      const avgRating = reviews && reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
        : 0;

      setStats({
        totalBookings: bookings.length,
        upcomingBookings: upcoming.length,
        completedBookings: completed.length,
        totalEarnings: totalEarnings / 100, // Convert from cents
        monthlyEarnings: monthlyEarnings / 100,
        averageRating: avgRating,
        totalReviews: reviews?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchVerificationStatus = async () => {
    try {
      const status = await getVerificationStatus();
      setVerificationStatus(status.status);
    } catch (error) {
      console.error('Error fetching verification status:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    fetchDashboardData();
    fetchPortfolioItems();
    fetchVerificationStatus();
  };

  const handlePickImage = async () => {
    if (!user) return;

    try {
      const hasPermission = await requestImagePermissions();

      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload a profile picture.'
        );
        return;
      }

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
      const result = await uploadProfilePicture(uri, user.id);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: result.url })
        .eq('user_id', user.id);

      if (error) throw error;

      setAvatarUrl(result.url || null);

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
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScaleInView delay={0}>
        <View style={styles.content}>
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>👤</Text>
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
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.role}>Service Provider</Text>
        </View>
      </ScaleInView>

      {/* Dashboard Stats */}
      <SlideUpView delay={150}>
        <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Performance Overview</Text>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.primary + '15' }]}>
            <Text style={styles.statValue}>{stats.upcomingBookings}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.success + '15' }]}>
            <Text style={styles.statValue}>{stats.completedBookings}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.secondary + '15' }]}>
            <Text style={styles.statValue}>{stats.averageRating.toFixed(1)} ⭐</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.tertiary + '15' }]}>
            <Text style={styles.statValue}>{stats.totalReviews}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>

        {/* Earnings Summary */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsTitle}>Earnings Summary</Text>
          <View style={styles.earningsRow}>
            <Text style={styles.earningsLabel}>Total Earnings</Text>
            <Text style={styles.earningsValue}>${stats.totalEarnings.toFixed(2)}</Text>
          </View>
          <View style={styles.earningsRow}>
            <Text style={styles.earningsLabel}>This Month</Text>
            <Text style={[styles.earningsValue, { color: colors.success }]}>
              ${stats.monthlyEarnings.toFixed(2)}
            </Text>
          </View>
          <View style={styles.earningsRow}>
            <Text style={styles.earningsLabel}>Total Bookings</Text>
            <Text style={styles.earningsValue}>{stats.totalBookings}</Text>
          </View>
        </View>
      </View>
      </SlideUpView>

      {/* Portfolio Section */}
      <View style={styles.portfolioSection}>
        <View style={styles.portfolioHeader}>
          <Text style={styles.sectionTitle}>My Portfolio</Text>
          <TouchableOpacity
            style={styles.createPostButton}
            onPress={() => navigation.navigate('Portfolio' as never)}
          >
            <Text style={styles.createPostButtonText}>+ Create Post</Text>
          </TouchableOpacity>
        </View>

        {portfolioItems.length === 0 ? (
          <View style={styles.emptyPortfolio}>
            <Text style={styles.emptyPortfolioIcon}>📸</Text>
            <Text style={styles.emptyPortfolioText}>No portfolio posts yet</Text>
            <Text style={styles.emptyPortfolioSubtext}>
              Showcase your work to attract more customers
            </Text>
            <TouchableOpacity
              style={styles.emptyPortfolioButton}
              onPress={() => navigation.navigate('Portfolio' as never)}
            >
              <Text style={styles.emptyPortfolioButtonText}>Create Your First Post</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.portfolioGrid}>
              {portfolioItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.portfolioItem}
                  onPress={() => navigation.navigate('Portfolio' as never)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: item.image_url }} style={styles.portfolioImage} />
                  <View style={styles.portfolioOverlay}>
                    <View style={styles.portfolioStats}>
                      <Text style={styles.portfolioStatText}>❤️ {item.like_count}</Text>
                      <Text style={styles.portfolioStatText}>👁️ {item.view_count}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('Portfolio' as never)}
            >
              <Text style={styles.viewAllButtonText}>View All Posts →</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Business Management Section */}
      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Business Management</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('EditProfile' as never)}
        >
          <Text style={styles.primaryButtonText}>✏️ Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Availability' as never)}
        >
          <Text style={styles.secondaryButtonText}>📅 Manage Availability</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Earnings' as never)}
        >
          <Text style={styles.secondaryButtonText}>💰 Earnings & Payouts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('KYCVerification' as never)}
        >
          <View style={styles.verificationButtonContent}>
            <Text style={styles.secondaryButtonText}>
              {verificationStatus === 'approved' ? '✓' : '🆔'} Identity Verification
            </Text>
            {verificationStatus === 'pending' && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>Not Verified</Text>
              </View>
            )}
            {verificationStatus === 'under_review' && (
              <View style={styles.reviewBadge}>
                <Text style={styles.reviewBadgeText}>Under Review</Text>
              </View>
            )}
            {verificationStatus === 'approved' && (
              <View style={styles.approvedBadge}>
                <Text style={styles.approvedBadgeText}>Verified</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Reviews' as never)}
        >
          <Text style={styles.secondaryButtonText}>⭐ Reviews</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Customers' as never)}
        >
          <Text style={styles.secondaryButtonText}>👥 Customers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Location' as never)}
        >
          <Text style={styles.secondaryButtonText}>📍 Location & Service Area</Text>
        </TouchableOpacity>
      </View>

      {/* Account Settings Section */}
      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Account Settings</Text>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('NotificationSettings' as never)}
        >
          <Text style={styles.secondaryButtonText}>🔔 Notification Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('BusinessSettings' as never)}
        >
          <Text style={styles.secondaryButtonText}>⚙️ Business Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('TravelSettings' as never)}
        >
          <Text style={styles.secondaryButtonText}>🚗 Travel & Distance Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('SecuritySettings')}
        >
          <Text style={styles.secondaryButtonText}>🔐 Security Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('ChangePassword')}
        >
          <Text style={styles.secondaryButtonText}>🔒 Change Password</Text>
        </TouchableOpacity>
      </View>

      {/* My Bookings as Customer Section */}
      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>As a Customer</Text>
        <Text style={styles.menuSectionSubtitle}>
          Services you've booked from other providers
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('MyCustomerBookings' as never)}
        >
          <Text style={styles.primaryButtonText}>📅 My Bookings</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleSignOut}>
          <Text style={styles.primaryButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  scrollContent: {
    paddingTop: TOTAL_HEADER_HEIGHT, // Content starts below header
    paddingBottom: 120, // Space for floating tab bar + extra padding
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  content: {
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.backgroundGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 50,
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
    borderColor: colors.primary,
  },
  editAvatarText: {
    fontSize: 16,
  },
  email: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  role: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  statsSection: {
    padding: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '47%',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  earningsCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  earningsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundGray,
  },
  earningsLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  earningsValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  menuSection: {
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
  menuSectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  menuSectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  primaryButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.secondary,
    ...shadows.sm,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  portfolioSection: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  createPostButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  createPostButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  portfolioItem: {
    width: '31.33%',
    aspectRatio: 1,
    margin: spacing.xs,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.backgroundGray,
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
  },
  portfolioOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    padding: spacing.xs,
  },
  portfolioStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  portfolioStatText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  viewAllButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  emptyPortfolio: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyPortfolioIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyPortfolioText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyPortfolioSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyPortfolioButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  emptyPortfolioButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  verificationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  pendingBadge: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  pendingBadgeText: {
    color: colors.warning,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  reviewBadge: {
    backgroundColor: colors.infoLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  reviewBadgeText: {
    color: colors.info,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  approvedBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  approvedBadgeText: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});

