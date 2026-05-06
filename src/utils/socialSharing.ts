import { Share, Platform, Linking, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';

// expo-file-system v18+ moved cacheDirectory to the legacy API
const cacheDirectory: string | null = (FileSystem as any).cacheDirectory ?? null;

export interface ShareContent {
  title?: string;
  message: string;
  url?: string;
  imageUrl?: string;
}

export interface ShareOptions {
  dialogTitle?: string;
  subject?: string;
}

/**
 * Share content using native share dialog
 */
export const shareContent = async (
  content: ShareContent,
  options?: ShareOptions
): Promise<boolean> => {
  try {
    const shareOptions: any = {
      message: content.message,
    };

    // Add title for Android
    if (Platform.OS === 'android' && content.title) {
      shareOptions.title = content.title;
    }

    // Add URL if provided
    if (content.url) {
      shareOptions.url = content.url;
    }

    // Add subject for email sharing
    if (options?.subject) {
      shareOptions.subject = options.subject;
    }

    const result = await Share.share(shareOptions, {
      dialogTitle: options?.dialogTitle || 'Share via',
    });

    if (result.action === Share.sharedAction) {
      return true;
    } else if (result.action === Share.dismissedAction) {
      return false;
    }

    return false;
  } catch (error: any) {
    console.error('Error sharing content:', error);
    Alert.alert('Error', 'Failed to share content. Please try again.');
    return false;
  }
};

/**
 * Share image with caption
 */
export const shareImage = async (
  imageUrl: string,
  caption?: string
): Promise<boolean> => {
  try {
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Error', 'Sharing is not available on this device');
      return false;
    }

    // Download image to local file system
    const fileUri = `${cacheDirectory}share_image_${Date.now()}.jpg`;
    const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

    if (downloadResult.status !== 200) {
      throw new Error('Failed to download image');
    }

    // Share the image
    await Sharing.shareAsync(downloadResult.uri, {
      dialogTitle: caption || 'Share Image',
      mimeType: 'image/jpeg',
    });

    // Clean up the temporary file
    await FileSystem.deleteAsync(fileUri, { idempotent: true });

    return true;
  } catch (error: any) {
    console.error('Error sharing image:', error);
    Alert.alert('Error', 'Failed to share image. Please try again.');
    return false;
  }
};

/**
 * Share to WhatsApp
 */
export const shareToWhatsApp = async (message: string, phoneNumber?: string): Promise<boolean> => {
  try {
    const encodedMessage = encodeURIComponent(message);
    let url = '';

    if (phoneNumber) {
      // Share to specific contact
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      url = `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
    } else {
      // Open WhatsApp with message
      url = `whatsapp://send?text=${encodedMessage}`;
    }

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    } else {
      Alert.alert('WhatsApp Not Installed', 'Please install WhatsApp to share via this method.');
      return false;
    }
  } catch (error: any) {
    console.error('Error sharing to WhatsApp:', error);
    Alert.alert('Error', 'Failed to open WhatsApp. Please try again.');
    return false;
  }
};

/**
 * Share to Facebook
 */
export const shareToFacebook = async (url: string): Promise<boolean> => {
  try {
    const encodedUrl = encodeURIComponent(url);
    const facebookUrl = `fb://facewebmodal/f?href=${encodedUrl}`;
    const webUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

    // Try to open Facebook app first
    const canOpenApp = await Linking.canOpenURL(facebookUrl);
    if (canOpenApp) {
      await Linking.openURL(facebookUrl);
      return true;
    }

    // Fallback to web browser
    const canOpenWeb = await Linking.canOpenURL(webUrl);
    if (canOpenWeb) {
      await Linking.openURL(webUrl);
      return true;
    }

    Alert.alert('Error', 'Unable to open Facebook');
    return false;
  } catch (error: any) {
    console.error('Error sharing to Facebook:', error);
    Alert.alert('Error', 'Failed to share to Facebook. Please try again.');
    return false;
  }
};

/**
 * Share to Twitter/X
 */
export const shareToTwitter = async (message: string, url?: string): Promise<boolean> => {
  try {
    const encodedMessage = encodeURIComponent(message);
    const encodedUrl = url ? encodeURIComponent(url) : '';
    
    let twitterUrl = `twitter://post?message=${encodedMessage}`;
    let webUrl = `https://twitter.com/intent/tweet?text=${encodedMessage}`;

    if (url) {
      twitterUrl += `&url=${encodedUrl}`;
      webUrl += `&url=${encodedUrl}`;
    }

    // Try to open Twitter app first
    const canOpenApp = await Linking.canOpenURL(twitterUrl);
    if (canOpenApp) {
      await Linking.openURL(twitterUrl);
      return true;
    }

    // Fallback to web browser
    const canOpenWeb = await Linking.canOpenURL(webUrl);
    if (canOpenWeb) {
      await Linking.openURL(webUrl);
      return true;
    }

    Alert.alert('Error', 'Unable to open Twitter');
    return false;
  } catch (error: any) {
    console.error('Error sharing to Twitter:', error);
    Alert.alert('Error', 'Failed to share to Twitter. Please try again.');
    return false;
  }
};

/**
 * Share to Instagram Stories (requires image)
 */
export const shareToInstagramStories = async (imageUrl: string): Promise<boolean> => {
  try {
    // Download image to local file system
    const fileUri = `${cacheDirectory}instagram_story_${Date.now()}.jpg`;
    const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

    if (downloadResult.status !== 200) {
      throw new Error('Failed to download image');
    }

    // Instagram Stories URL scheme
    const instagramUrl = `instagram-stories://share`;

    const canOpen = await Linking.canOpenURL(instagramUrl);
    if (canOpen) {
      // Note: This requires additional setup in Info.plist (iOS) and AndroidManifest.xml (Android)
      // For now, we'll show a message to the user
      Alert.alert(
        'Share to Instagram',
        'To share to Instagram Stories, please:\n1. Save the image\n2. Open Instagram\n3. Create a new story\n4. Select the saved image',
        [{ text: 'OK' }]
      );
      
      // Clean up the temporary file
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      
      return false;
    } else {
      Alert.alert('Instagram Not Installed', 'Please install Instagram to share via this method.');
      return false;
    }
  } catch (error: any) {
    console.error('Error sharing to Instagram:', error);
    Alert.alert('Error', 'Failed to share to Instagram. Please try again.');
    return false;
  }
};

/**
 * Share via SMS/iMessage
 */
export const shareViaSMS = async (message: string, phoneNumber?: string): Promise<boolean> => {
  try {
    const encodedMessage = encodeURIComponent(message);
    let url = '';

    if (Platform.OS === 'ios') {
      url = phoneNumber
        ? `sms:${phoneNumber}&body=${encodedMessage}`
        : `sms:&body=${encodedMessage}`;
    } else {
      url = phoneNumber
        ? `sms:${phoneNumber}?body=${encodedMessage}`
        : `sms:?body=${encodedMessage}`;
    }

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    } else {
      Alert.alert('Error', 'Unable to open messaging app');
      return false;
    }
  } catch (error: any) {
    console.error('Error sharing via SMS:', error);
    Alert.alert('Error', 'Failed to open messaging app. Please try again.');
    return false;
  }
};

/**
 * Share via Email
 */
export const shareViaEmail = async (
  subject: string,
  body: string,
  recipients?: string[]
): Promise<boolean> => {
  try {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const recipientString = recipients ? recipients.join(',') : '';

    const url = `mailto:${recipientString}?subject=${encodedSubject}&body=${encodedBody}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    } else {
      Alert.alert('Error', 'Unable to open email app');
      return false;
    }
  } catch (error: any) {
    console.error('Error sharing via email:', error);
    Alert.alert('Error', 'Failed to open email app. Please try again.');
    return false;
  }
};

/**
 * Copy to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', 'Content copied to clipboard');
    return true;
  } catch (error: any) {
    console.error('Error copying to clipboard:', error);
    Alert.alert('Error', 'Failed to copy to clipboard');
    return false;
  }
};

