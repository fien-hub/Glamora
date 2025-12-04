import { Platform, Share, Linking, Alert } from 'react-native';
import * as Clipboard from '@react-native-clipboard/clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  shareContent,
  shareImage,
  shareToWhatsApp,
  shareToFacebook,
  shareToTwitter,
  shareToInstagramStories,
  shareViaSMS,
  shareViaEmail,
  copyToClipboard,
} from '../socialSharing';

// Mock dependencies
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Share: {
    share: jest.fn(),
    sharedAction: 'sharedAction',
    dismissedAction: 'dismissedAction',
  },
  Linking: { openURL: jest.fn(), canOpenURL: jest.fn() },
  Alert: { alert: jest.fn() },
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  default: {
    setString: jest.fn(),
  },
  setString: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

describe('socialSharing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('shareContent', () => {
    it('should share content using native share dialog', async () => {
      (Share.share as jest.Mock).mockResolvedValue({ action: 'sharedAction' });

      const result = await shareContent({
        message: 'Test message',
        url: 'https://example.com',
      });

      expect(Share.share).toHaveBeenCalledWith(
        {
          message: 'Test message',
          url: 'https://example.com',
        },
        { dialogTitle: 'Share via' }
      );
      expect(result).toBe(true);
    });

    it('should handle share dismissal', async () => {
      (Share.share as jest.Mock).mockResolvedValue({ action: 'dismissedAction' });

      const result = await shareContent('Test message');

      expect(result).toBe(false);
    });

    it('should handle share errors', async () => {
      (Share.share as jest.Mock).mockRejectedValue(new Error('Share failed'));

      const result = await shareContent({ message: 'Test message' });

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to share content. Please try again.');
    });
  });

  describe('shareImage', () => {
    it('should share image with caption', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        uri: 'file:///path/to/downloaded.jpg',
      });
      (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue({});

      const result = await shareImage('https://example.com/image.jpg', 'Test caption');

      expect(FileSystem.downloadAsync).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///path/to/downloaded.jpg', {
        dialogTitle: 'Test caption',
        mimeType: 'image/jpeg',
      });
      expect(FileSystem.deleteAsync).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle sharing not available', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

      const result = await shareImage('file:///path/to/image.jpg');

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Sharing is not available on this device');
      expect(result).toBe(false);
    });

    it('should handle share errors', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Sharing.shareAsync as jest.Mock).mockRejectedValue(new Error('Share failed'));

      const result = await shareImage('file:///path/to/image.jpg');

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to share image. Please try again.');
    });
  });

  describe('shareToWhatsApp', () => {
    it('should share to WhatsApp on iOS', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      const result = await shareToWhatsApp('Test message');

      expect(Linking.canOpenURL).toHaveBeenCalledWith('whatsapp://send?text=Test%20message');
      expect(Linking.openURL).toHaveBeenCalledWith('whatsapp://send?text=Test%20message');
      expect(result).toBe(true);
    });

    it('should fallback to web WhatsApp if app not installed', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);

      const result = await shareToWhatsApp('Test message');

      expect(Alert.alert).toHaveBeenCalledWith('WhatsApp Not Installed', 'Please install WhatsApp to share via this method.');
      expect(result).toBe(false);
    });

    it('should handle errors', async () => {
      (Linking.canOpenURL as jest.Mock).mockRejectedValue(new Error('Failed'));

      const result = await shareToWhatsApp('Test message');

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to open WhatsApp. Please try again.');
    });
  });

  describe('shareToFacebook', () => {
    it('should share to Facebook', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      const result = await shareToFacebook('https://example.com');

      expect(Linking.openURL).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle errors', async () => {
      (Linking.openURL as jest.Mock).mockRejectedValue(new Error('Failed'));

      const result = await shareToFacebook('https://example.com');

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to share to Facebook. Please try again.');
    });
  });

  describe('shareToTwitter', () => {
    it('should share to Twitter with text and URL', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      const result = await shareToTwitter('Test tweet', 'https://example.com');

      expect(Linking.openURL).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle errors', async () => {
      (Linking.openURL as jest.Mock).mockRejectedValue(new Error('Failed'));

      const result = await shareToTwitter('Test tweet');

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to share to Twitter. Please try again.');
    });
  });

  describe('shareViaSMS', () => {
    it('should open SMS with message on iOS', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      const result = await shareViaSMS('Test message');

      expect(Linking.openURL).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle errors', async () => {
      (Linking.canOpenURL as jest.Mock).mockRejectedValue(new Error('Failed'));

      const result = await shareViaSMS('Test message');

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to open messaging app. Please try again.');
    });
  });

  describe('shareViaEmail', () => {
    it('should open email with subject and body', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      const result = await shareViaEmail('Test subject', 'Test body');

      expect(Linking.openURL).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle errors', async () => {
      (Linking.canOpenURL as jest.Mock).mockRejectedValue(new Error('Failed'));

      const result = await shareViaEmail('Test subject', 'Test body');

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to open email app. Please try again.');
    });
  });

  describe('copyToClipboard', () => {
    beforeEach(() => {
      // Reset the mock before each test
      const ClipboardModule = require('@react-native-clipboard/clipboard');
      if (ClipboardModule.default && ClipboardModule.default.setString) {
        (ClipboardModule.default.setString as jest.Mock).mockClear();
        (ClipboardModule.default.setString as jest.Mock).mockImplementation(() => {});
      }
    });

    it('should copy text to clipboard', async () => {
      const result = await copyToClipboard('Test text');

      expect(Alert.alert).toHaveBeenCalledWith('Copied!', 'Content copied to clipboard');
      expect(result).toBe(true);
    });

    it('should handle errors', async () => {
      // Mock setString to throw an error
      const ClipboardModule = require('@react-native-clipboard/clipboard');
      (ClipboardModule.default.setString as jest.Mock).mockImplementation(() => {
        throw new Error('Failed');
      });

      const result = await copyToClipboard('Test text');

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to copy to clipboard');
    });
  });
});

