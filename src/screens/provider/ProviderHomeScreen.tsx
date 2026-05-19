import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '../../utils/icons';
import SocialDiscoveryFeed from '../../components/SocialDiscoveryFeed';
import TrendingFeed from '../../components/TrendingFeed';
import PillTabs from '../../components/PillTabs';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import { colors, spacing, fontSize, borderRadius } from '../../constants/theme';
import { TOTAL_HEADER_HEIGHT } from '../../components/CurvedHeader';
import FadeInView from '../../components/animations/FadeInView';
import { getVerificationStatus } from '../../services/verification';

const TABS = ['For You', 'Trending'];

export default function ProviderHomeScreen() {
  useScreenTracking('Provider Home');
  const navigation = useNavigation();
  const [selectedTab, setSelectedTab] = useState('For You');
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const status = await getVerificationStatus();
      setVerificationStatus(status.status);
    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  };

  const handleVerifyPress = () => {
    (navigation as any).navigate('KYCVerification');
  };

  const needsVerification = verificationStatus && verificationStatus !== 'approved';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Verification Banner */}
        {needsVerification && showBanner && (
          <FadeInView delay={0}>
            <View style={styles.verificationBanner}>
              <View style={styles.bannerContent}>
                <Text style={styles.bannerIcon}>⚠️</Text>
                <View style={styles.bannerTextContainer}>
                  <Text style={styles.bannerTitle}>
                    {verificationStatus === 'under_review'
                      ? 'KYC Pending'
                      : 'Complete KYC'}
                  </Text>
                  <Text style={styles.bannerText}>
                    {verificationStatus === 'under_review'
                      ? 'Your KYC documents are under review. You\'ll be visible to customers once approved.'
                      : 'You\'re not visible to customers yet. Complete KYC to start receiving bookings.'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.bannerClose}
                  onPress={() => setShowBanner(false)}
                >
                  <Text style={styles.bannerCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              {verificationStatus !== 'under_review' && (
                <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyPress}>
                  <Text style={styles.verifyButtonText}>Start KYC</Text>
                </TouchableOpacity>
              )}
            </View>
          </FadeInView>
        )}

        {/* Search Bar removed as requested */}

        <FadeInView delay={needsVerification && showBanner ? 150 : 50}>
          <View style={styles.tabsContainer}>
            <PillTabs
              tabs={TABS}
              activeTab={selectedTab}
              onTabChange={setSelectedTab}
            />
          </View>
        </FadeInView>
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
    paddingTop: TOTAL_HEADER_HEIGHT,
  },
  verificationBanner: {
    backgroundColor: '#FFF3CD',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bannerIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#856404',
    marginBottom: spacing.xs,
  },
  bannerText: {
    fontSize: fontSize.sm,
    color: '#856404',
    lineHeight: 18,
  },
  bannerClose: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  bannerCloseText: {
    fontSize: fontSize.md,
    color: '#856404',
  },
  verifyButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  verifyButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
  },
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
});
