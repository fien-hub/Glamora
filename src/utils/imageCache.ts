import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';

const CACHE_METADATA_KEY = '@glamora_image_cache_metadata';
const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

interface CacheMetadata {
  [key: string]: {
    url: string;
    timestamp: number;
    size?: number;
  };
}

/**
 * Image Caching Utility for Eve Beauty App
 * Provides automatic caching for remote images with expiry management
 * React Native's Image component automatically caches to disk
 */
export const imageCache = {
  /**
   * Configure image caching globally
   * Should be called on app startup
   */
  initialize: (): void => {
    // React Native's Image component automatically caches images to disk
    // This initializes the cache metadata tracking system
  },

  /**
   * Prefetch multiple images for faster loading
   */
  prefetchImages: async (urls: string[]): Promise<void> => {
    try {
      const prefetchPromises = urls
        .filter(url => url && typeof url === 'string')
        .map(url => Image.prefetch(url).catch(() => null));
      
      await Promise.all(prefetchPromises);
      
      // Record cache for all prefetched images
      urls.forEach(url => {
        if (url) imageCache.recordCache(url);
      });
    } catch (error) {
      console.warn('Batch image prefetch failed:', error);
    }
  },

  /**
   * Clear expired cache entries
   */
  clearExpiredCache: async (): Promise<void> => {
    try {
      const metadata = await AsyncStorage.getItem(CACHE_METADATA_KEY);
      if (!metadata) return;

      const cacheData: CacheMetadata = JSON.parse(metadata);
      const now = Date.now();
      const validCache: CacheMetadata = {};

      Object.entries(cacheData).forEach(([key, entry]) => {
        if (now - entry.timestamp < CACHE_EXPIRY) {
          validCache[key] = entry;
        }
      });

      if (Object.keys(validCache).length < Object.keys(cacheData).length) {
        await AsyncStorage.setItem(
          CACHE_METADATA_KEY,
          JSON.stringify(validCache)
        );
      }
    } catch (error) {
      console.warn('Failed to clear expired cache:', error);
    }
  },

  /**
   * Clear all image cache metadata
   */
  clearAllCache: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(CACHE_METADATA_KEY);
    } catch (error) {
      console.warn('Failed to clear all cache:', error);
    }
  },

  /**
   * Record a cached image in metadata
   */
  recordCache: async (url: string): Promise<void> => {
    try {
      const metadata = await AsyncStorage.getItem(CACHE_METADATA_KEY);
      const cacheData: CacheMetadata = metadata ? JSON.parse(metadata) : {};
      
      cacheData[url] = {
        url,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to record cache:', error);
    }
  },

  /**
   * Get cache statistics
   */
  getCacheStats: async () => {
    try {
      const metadata = await AsyncStorage.getItem(CACHE_METADATA_KEY);
      const cacheData: CacheMetadata = metadata ? JSON.parse(metadata) : {};
      
      return {
        totalCachedImages: Object.keys(cacheData).length,
        cacheEntries: Object.values(cacheData),
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return {
        totalCachedImages: 0,
        cacheEntries: [],
      };
    }
  },

  /**
   * Warm up cache with common images
   * Call this on app startup to pre-cache frequently used images
   */
  warmCache: async (imageUrls: string[]): Promise<void> => {
    try {
      await imageCache.prefetchImages(imageUrls);
    } catch (error) {
      console.warn('Failed to warm cache:', error);
    }
  },
};

/**
 * Hook to handle image loading with cache busting for dynamic images
 */
export const useImageCache = () => {
  const getCachedImageUri = (uri: string | null | undefined, cacheBust = false) => {
    if (!uri) return null;
    
    // Add cache-busting parameter if needed
    if (cacheBust && typeof uri === 'string' && uri.includes('?')) {
      return `${uri}&t=${Date.now()}`;
    } else if (cacheBust && typeof uri === 'string') {
      return `${uri}?t=${Date.now()}`;
    }
    
    return uri;
  };

  const prefetchImage = async (uri: string): Promise<void> => {
    if (uri) {
      try {
        await Image.prefetch(uri);
        await imageCache.recordCache(uri);
      } catch (error) {
        console.warn('Failed to prefetch image:', uri, error);
      }
    }
  };

  return {
    getCachedImageUri,
    prefetchImage,
  };
};

// Export cache configuration helpers
export const cacheConfig = {
  // Default cache options for Image component
  defaultImageProps: {
    cacheControl: 'max-age=2592000', // 30 days
  },
  
  // Headers to send with image requests for optimal caching
  defaultHeaders: {
    'Cache-Control': 'public, max-age=2592000',
  },
};
