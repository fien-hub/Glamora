import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import FadeInView from '../../components/animations/FadeInView';
import SlideUpView from '../../components/animations/SlideUpView';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  image: any;
  gradientColors: readonly [string, string, string];
}

// Placeholder images - Replace with actual beauty images
// See IMAGE_SETUP_INSTRUCTIONS.md for details
const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Beauty at Your Doorstep',
    description: 'Book professional beauty services that come to you. No salon visits needed.',
    image: { uri: 'https://images.unsplash.com/photo-1519415387722-a1c3bbef716c?w=1080&h=1920&fit=crop&q=80' },
    gradientColors: ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)'],
  },
  {
    id: '2',
    title: 'Verified Professionals',
    description: 'All our beauty professionals are verified, licensed, and highly rated by customers.',
    image: { uri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1080&h=1920&fit=crop&q=80' },
    gradientColors: ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)'],
  },
  {
    id: '3',
    title: 'Easy Booking',
    description: 'Browse services, check availability, and book appointments in just a few taps.',
    image: require('../../../assets/onboarding-slide-3.jpg'),
    gradientColors: ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)'],
  },
  {
    id: '4',
    title: 'Your Beauty Journey',
    description: 'Experience personalized beauty services from verified professionals, delivered right to your door.',
    image: { uri: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=1080&h=1920&fit=crop&q=80' },
    gradientColors: ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)'],
  },
];

const AUTO_SWIPE_INTERVAL = 4000; // 4 seconds per slide

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const autoSwipeTimer = useRef<NodeJS.Timeout | null>(null);

  // Auto-swipe functionality
  useEffect(() => {
    const startAutoSwipe = () => {
      autoSwipeTimer.current = setInterval(() => {
        if (!isUserInteracting) {
          setCurrentIndex((prevIndex) => {
            // Stop at the last slide, don't loop
            if (prevIndex >= slides.length - 1) {
              return prevIndex;
            }
            const nextIndex = prevIndex + 1;
            flatListRef.current?.scrollToIndex({
              index: nextIndex,
              animated: true,
            });
            return nextIndex;
          });
        }
      }, AUTO_SWIPE_INTERVAL);
    };

    startAutoSwipe();

    return () => {
      if (autoSwipeTimer.current) {
        clearInterval(autoSwipeTimer.current);
      }
    };
  }, [isUserInteracting]);

  const handleScrollBegin = () => {
    setIsUserInteracting(true);
  };

  const handleScrollEnd = () => {
    // Resume auto-swipe after 3 seconds of no interaction
    setTimeout(() => {
      setIsUserInteracting(false);
    }, 3000);
  };

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = async () => {
    await handleGetStarted();
  };

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
    navigation.navigate('RoleSelection');
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={[styles.slide, { width, height }]}>
      <ImageBackground
        source={item.image}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={item.gradientColors}
          style={styles.gradient}
          locations={[0, 0.5, 1]}
        >
          <View style={styles.slideContent}>
            <FadeInView delay={200}>
              <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            </FadeInView>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <BlurView intensity={20} tint="dark" style={styles.skipButtonBlur}>
          <Text style={styles.skipText}>Skip</Text>
        </BlurView>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        onScrollBeginDrag={handleScrollBegin}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
      />

      <View style={styles.footer}>
        <FadeInView delay={300}>
          <View style={styles.pagination}>
            {slides.map((_, index) => {
              const inputRange = [
                (index - 1) * width,
                index * width,
                (index + 1) * width,
              ];

              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 24, 8],
                extrapolate: 'clamp',
              });

              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.5, 1, 0.5],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      width: dotWidth,
                      opacity,
                      backgroundColor: colors.white,
                    },
                  ]}
                />
              );
            })}
          </View>
        </FadeInView>

        <SlideUpView delay={400}>
          <TouchableOpacity style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>
              {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </SlideUpView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  skipButton: {
    position: 'absolute',
    top: spacing.xxl + 20,
    right: spacing.xl,
    zIndex: 10,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  skipButtonBlur: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: fontSize.md,
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  slide: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 180,
  },
  textContainer: {
    paddingHorizontal: spacing.xxl,
  },
  title: {
    fontSize: 42,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  description: {
    fontSize: fontSize.lg,
    color: colors.white,
    textAlign: 'center',
    lineHeight: fontSize.lg * 1.6,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl + 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    height: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: spacing.xs,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: colors.black,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});

