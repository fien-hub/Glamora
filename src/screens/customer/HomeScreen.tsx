import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import SocialDiscoveryFeed from '../../components/SocialDiscoveryFeed';
import TrendingFeed from '../../components/TrendingFeed';
import PillTabs from '../../components/PillTabs';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import { colors, spacing } from '../../constants/theme';
import { TOTAL_HEADER_HEIGHT } from '../../components/CurvedHeader';
import FadeInView from '../../components/animations/FadeInView';

const TABS = ['For You', 'Trending'];

export default function HomeScreen() {
  useScreenTracking('Home');
  const [selectedTab, setSelectedTab] = useState('For You');

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Feed Tabs with fade-in animation */}
        <FadeInView delay={0}>
          <View style={styles.tabsContainer}>
            <PillTabs
              tabs={TABS}
              activeTab={selectedTab}
              onTabChange={setSelectedTab}
            />
          </View>
        </FadeInView>

        {/* Feed Content */}
        {selectedTab === 'For You' ? <SocialDiscoveryFeed /> : <TrendingFeed />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingTop: TOTAL_HEADER_HEIGHT, // Content starts below header
  },
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
});

// Old PersonalizedHome implementation moved to archive
// import PersonalizedHome from '../../components/PersonalizedHome';
// return <PersonalizedHome />;

// Old implementation kept for reference
/*
interface Category {
  id: string;
  name: string;
  description: string;
  icon_emoji: string;
}

interface Provider {
  id: string;
  user_id: string;
  business_name: string;
  bio: string;
  average_rating: number;
  total_reviews: number;
}

function OldHomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProviders, setFeaturedProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryColors = [
    colors.primaryDark,
    colors.infoLight,
    colors.warningLight,
    colors.successLight,
    colors.primaryLight,
    colors.primarySubtle,
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('service_categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch featured providers (top rated, only identity verified)
      const { data: providersData, error: providersError } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('identity_verification_status', 'approved')
        .order('average_rating', { ascending: false })
        .limit(5);

      if (providersError) throw providersError;
      setFeaturedProviders(providersData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = (category: Category) => {
    // Navigate to services list for this category
    (navigation as any).navigate('Search', { categoryId: category.id, categoryName: category.name });
  };

  const handleProviderPress = (provider: Provider) => {
    // Navigate to provider details
    Alert.alert('Provider Details', `View ${provider.business_name} - Coming soon!`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello! 👋</Text>
        <Text style={styles.subtitle}>What service are you looking for today?</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.categoriesGrid}>
          {categories.map((category, index) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryCard, { backgroundColor: categoryColors[index % categoryColors.length] }]}
              onPress={() => handleCategoryPress(category)}
            >
              <Text style={styles.categoryIcon}>{category.icon_emoji || '✨'}</Text>
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Providers</Text>
        {featuredProviders.length === 0 ? (
          <Text style={styles.comingSoon}>No providers available yet</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {featuredProviders.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                style={styles.providerCard}
                onPress={() => handleProviderPress(provider)}
              >
                <View style={styles.providerAvatar}>
                  <Text style={styles.providerInitial}>
                    {provider.business_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.providerName} numberOfLines={1}>
                  {provider.business_name}
                </Text>
                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingText}>⭐ {provider.average_rating.toFixed(1)}</Text>
                  <Text style={styles.reviewsText}>({provider.total_reviews})</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  header: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
  greeting: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  section: {
    padding: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  categoryCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  categoryName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  comingSoon: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  providerCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginRight: spacing.md,
    width: 140,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  providerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  providerInitial: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.black,
  },
  providerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  reviewsText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
*/
