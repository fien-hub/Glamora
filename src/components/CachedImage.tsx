import React, { useEffect, useState } from 'react';
import {
  Image,
  ImageProps,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { imageCache, useImageCache } from '../utils/imageCache';
import { colors } from '../constants/theme';

interface CachedImageProps extends ImageProps {
  uri?: string;
  showLoader?: boolean;
  loaderColor?: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  cacheable?: boolean;
  containerStyle?: ViewStyle;
}

/**
 * CachedImage Component
 * Automatically caches remote images for faster loading on subsequent views
 * Use this component instead of regular Image for network-based images
 */
const CachedImage: React.FC<CachedImageProps> = ({
  uri,
  source,
  showLoader = true,
  loaderColor = colors.primary,
  onLoadStart,
  onLoadEnd,
  cacheable = true,
  containerStyle,
  style,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [actualSource, setActualSource] = useState(source);
  const { prefetchImage } = useImageCache();

  useEffect(() => {
    const setupImage = async () => {
      let imageSource = source;

      // Handle URI-based images
      if (uri && cacheable) {
        setIsLoading(true);
        onLoadStart?.();

        try {
          // Prefetch and cache the image
          await prefetchImage(uri);
          imageSource = { uri };
        } catch (error) {
          console.warn('Failed to cache image:', uri, error);
          imageSource = { uri };
        }

        setActualSource(imageSource);
      } else if (uri) {
        setActualSource({ uri });
      }
    };

    setupImage();
  }, [uri, cacheable]);

  const handleLoadStart = () => {
    setIsLoading(true);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
    onLoadEnd?.();
  };

  if (!actualSource && !uri) {
    return null;
  }

  return (
    <View style={[containerStyle, isLoading && showLoader && styles.loaderContainer]}>
      <Image
        source={actualSource || { uri }}
        {...props}
        style={style}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
      />
      {isLoading && showLoader && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={loaderColor} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    position: 'relative',
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
});

export default CachedImage;

/**
 * Avatar Image Component - Optimized for profile pictures
 */
export const CachedAvatarImage: React.FC<CachedImageProps> = (props) => {
  return (
    <CachedImage
      {...props}
      showLoader={false}
      cacheable={true}
    />
  );
};

/**
 * Portfolio/Post Image Component - Optimized for content images
 */
export const CachedContentImage: React.FC<CachedImageProps> = (props) => {
  return (
    <CachedImage
      {...props}
      showLoader={true}
      loaderColor={colors.primary}
      cacheable={true}
    />
  );
};

/**
 * Hero Image Component - Optimized for banner/hero images
 */
export const CachedHeroImage: React.FC<CachedImageProps> = (props) => {
  return (
    <CachedImage
      {...props}
      showLoader={true}
      loaderColor={colors.white}
      cacheable={true}
    />
  );
};
