import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { supabase } from '../services/supabase';
import { decode } from 'base64-arraybuffer';

export interface ImageUploadOptions {
  bucket: 'profile-pictures' | 'portfolio-images' | 'service-images' | 'chat-images' | 'portfolio-videos';
  folder?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface MediaAsset {
  uri: string;
  type: 'image' | 'video';
  duration?: number; // Video duration in seconds
  width?: number;
  height?: number;
}

export interface VideoUploadResult {
  success: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
}

/**
 * Request camera roll permissions
 */
export const requestImagePermissions = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
};

/**
 * Pick an image from the device's library
 */
export const pickImage = async (options?: {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}): Promise<string | null> => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options?.allowsEditing ?? true,
      aspect: options?.aspect ?? [1, 1],
      quality: options?.quality ?? 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }

    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    return null;
  }
};

/**
 * Pick multiple images from the device's library
 */
export const pickMultipleImages = async (options?: {
  quality?: number;
  maxImages?: number;
}): Promise<string[]> => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: options?.quality ?? 0.8,
      selectionLimit: options?.maxImages ?? 10,
    });

    if (!result.canceled && result.assets.length > 0) {
      return result.assets.map(asset => asset.uri);
    }

    return [];
  } catch (error) {
    console.error('Error picking multiple images:', error);
    return [];
  }
};

/**
 * Pick multiple media (images and/or videos) from the device's library
 */
export const pickMultipleMedia = async (options?: {
  quality?: number;
  maxItems?: number;
  videoMaxDuration?: number; // Max video duration in seconds
}): Promise<MediaAsset[]> => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: options?.quality ?? 0.8,
      selectionLimit: options?.maxItems ?? 10,
      videoMaxDuration: options?.videoMaxDuration ?? 60, // Default 60 seconds max
    });

    if (!result.canceled && result.assets.length > 0) {
      return result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
        duration: asset.duration ? Math.round(asset.duration / 1000) : undefined, // Convert ms to seconds
        width: asset.width,
        height: asset.height,
      }));
    }

    return [];
  } catch (error) {
    console.error('Error picking multiple media:', error);
    return [];
  }
};

/**
 * Pick a single video from the device's library
 */
export const pickVideo = async (options?: {
  maxDuration?: number; // Max duration in seconds
}): Promise<MediaAsset | null> => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      videoMaxDuration: options?.maxDuration ?? 60,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      return {
        uri: asset.uri,
        type: 'video',
        duration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
        width: asset.width,
        height: asset.height,
      };
    }

    return null;
  } catch (error) {
    console.error('Error picking video:', error);
    return null;
  }
};

/**
 * Generate a thumbnail from a video
 */
export const generateVideoThumbnail = async (
  videoUri: string,
  timeMs: number = 0
): Promise<string | null> => {
  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: timeMs,
      quality: 0.8,
    });
    return uri;
  } catch (error) {
    console.error('Error generating video thumbnail:', error);
    return null;
  }
};

/**
 * Compress and optimize an image
 */
export const compressImage = async (
  uri: string,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  }
): Promise<string> => {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: options?.maxWidth ?? 1024,
            height: options?.maxHeight ?? 1024,
          },
        },
      ],
      {
        compress: options?.quality ?? 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return manipResult.uri;
  } catch (error) {
    console.error('Error compressing image:', error);
    return uri; // Return original if compression fails
  }
};

/**
 * Upload an image to Supabase Storage
 */
export const uploadImage = async (
  uri: string,
  options: ImageUploadOptions
): Promise<ImageUploadResult> => {
  try {
    // Compress the image first
    const compressedUri = await compressImage(uri, {
      maxWidth: options.maxWidth,
      maxHeight: options.maxHeight,
      quality: options.quality,
    });

    // Read the file as base64
    const response = await fetch(compressedUri);
    const blob = await response.blob();
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExt = 'jpg';
    const fileName = `${timestamp}_${randomString}.${fileExt}`;
    
    // Build the full path
    const folder = options.folder || 'uploads';
    const filePath = `${folder}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(options.bucket)
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(options.bucket)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error: any) {
    console.error('Error uploading image:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload image',
    };
  }
};

/**
 * Delete an image from Supabase Storage
 */
export const deleteImage = async (
  bucket: string,
  path: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
};

/**
 * Upload profile picture
 */
export const uploadProfilePicture = async (
  uri: string,
  userId: string
): Promise<ImageUploadResult> => {
  return uploadImage(uri, {
    bucket: 'profile-pictures',
    folder: userId,
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.8,
  });
};

/**
 * Upload portfolio image
 */
export const uploadPortfolioImage = async (
  uri: string,
  userId: string
): Promise<ImageUploadResult> => {
  return uploadImage(uri, {
    bucket: 'portfolio-images',
    folder: userId,
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.85,
  });
};

/**
 * Upload service image
 */
export const uploadServiceImage = async (
  uri: string,
  serviceId: string
): Promise<ImageUploadResult> => {
  return uploadImage(uri, {
    bucket: 'service-images',
    folder: serviceId,
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.85,
  });
};

/**
 * Upload chat image
 */
export const uploadChatImage = async (
  uri: string,
  userId: string
): Promise<ImageUploadResult> => {
  return uploadImage(uri, {
    bucket: 'chat-images',
    folder: userId,
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.8,
  });
};

/**
 * Pick and upload an image in one step
 */
export const pickAndUploadImage = async (
  options: ImageUploadOptions & {
    allowsEditing?: boolean;
    aspect?: [number, number];
  }
): Promise<ImageUploadResult> => {
  try {
    // Request permissions
    const hasPermission = await requestImagePermissions();
    if (!hasPermission) {
      return {
        success: false,
        error: 'Camera roll permission not granted',
      };
    }

    // Pick image
    const uri = await pickImage({
      allowsEditing: options.allowsEditing,
      aspect: options.aspect,
      quality: options.quality,
    });

    if (!uri) {
      return {
        success: false,
        error: 'No image selected',
      };
    }

    // Upload image
    return await uploadImage(uri, options);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to pick and upload image',
    };
  }
};

/**
 * Upload a video to Supabase Storage
 */
export const uploadVideo = async (
  uri: string,
  userId: string
): Promise<VideoUploadResult> => {
  try {
    // Read the video file
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileName = `${timestamp}_${randomString}.mp4`;
    const filePath = `${userId}/${fileName}`;

    // Upload video to Supabase Storage
    const { data, error } = await supabase.storage
      .from('portfolio-videos')
      .upload(filePath, arrayBuffer, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (error) {
      console.error('Video upload error:', error);
      return { success: false, error: error.message };
    }

    // Get video URL
    const { data: videoUrlData } = supabase.storage
      .from('portfolio-videos')
      .getPublicUrl(filePath);

    // Generate and upload thumbnail
    const thumbnailUri = await generateVideoThumbnail(uri);
    let thumbnailUrl: string | undefined;

    if (thumbnailUri) {
      const thumbResult = await uploadImage(thumbnailUri, {
        bucket: 'portfolio-images',
        folder: `${userId}/thumbnails`,
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.8,
      });
      if (thumbResult.success) {
        thumbnailUrl = thumbResult.url;
      }
    }

    return {
      success: true,
      videoUrl: videoUrlData.publicUrl,
      thumbnailUrl,
    };
  } catch (error: any) {
    console.error('Error uploading video:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload video',
    };
  }
};

/**
 * Upload portfolio media (image or video)
 */
export const uploadPortfolioMedia = async (
  asset: MediaAsset,
  userId: string
): Promise<{
  success: boolean;
  mediaType: 'image' | 'video';
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
}> => {
  if (asset.type === 'video') {
    const result = await uploadVideo(asset.uri, userId);
    return {
      success: result.success,
      mediaType: 'video',
      videoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
      duration: asset.duration,
      error: result.error,
    };
  } else {
    const result = await uploadPortfolioImage(asset.uri, userId);
    return {
      success: result.success,
      mediaType: 'image',
      imageUrl: result.url,
      error: result.error,
    };
  }
};
