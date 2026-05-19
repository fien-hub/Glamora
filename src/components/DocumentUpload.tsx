import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';
import { DocumentType, uploadVerificationDocument } from '../services/verification';

interface DocumentUploadProps {
  documentType: DocumentType;
  onUploadSuccess?: () => void;
  onUploadError?: (error: string) => void;
  onUploadStateChange?: (uploading: boolean) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  documentType,
  onUploadSuccess,
  onUploadError,
  onUploadStateChange,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Camera and photo library permissions are required to upload documents.'
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async (useCamera: boolean) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select a document to upload');
      return;
    }

    setUploading(true);
    onUploadStateChange?.(true);

    try {
      const fileName = selectedImage.split('/').pop() || 'document.jpg';
      const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

      await uploadVerificationDocument(
        {
          uri: selectedImage,
          name: fileName,
          type: fileType,
        },
        documentType
      );

      Alert.alert('Success', 'Document uploaded successfully');
      setSelectedImage(null);
      onUploadSuccess?.();
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error.message || 'Failed to upload document';
      Alert.alert('Error', errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setUploading(false);
      onUploadStateChange?.(false);
    }
  };

  const showImageSourceOptions = () => {
    Alert.alert(
      'Select Document',
      'Choose how you want to provide your document',
      [
        {
          text: 'Take Photo',
          onPress: () => pickImage(true),
        },
        {
          text: 'Choose from Library',
          onPress: () => pickImage(false),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {selectedImage ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.preview} />
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.changeButton}
              onPress={showImageSourceOptions}
              disabled={uploading}
            >
              <Text style={styles.changeButtonText}>Change</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={colors.black} />
              ) : (
                <Text style={styles.uploadButtonText}>Upload</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.selectButton}
          onPress={showImageSourceOptions}
          disabled={uploading}
        >
          <Text style={styles.selectButtonIcon}>📷</Text>
          <Text style={styles.selectButtonText}>Select Document</Text>
          <Text style={styles.selectButtonHint}>Take a photo or choose from library</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  previewContainer: {
    width: '100%',
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.medium,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.medium,
  },
  changeButton: {
    flex: 1,
    backgroundColor: colors.lightGray,
    paddingVertical: spacing.medium,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
  },
  changeButtonText: {
    fontSize: fontSize.medium,
    color: colors.darkGray,
    fontWeight: '600',
  },
  uploadButton: {
    flex: 1,
    backgroundColor: colors.gold,
    paddingVertical: spacing.medium,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: fontSize.medium,
    color: colors.black,
    fontWeight: '600',
  },
  selectButton: {
    width: '100%',
    backgroundColor: colors.lightGray,
    paddingVertical: spacing.extraLarge,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.mediumGray,
    borderStyle: 'dashed',
  },
  selectButtonIcon: {
    fontSize: 48,
    marginBottom: spacing.small,
  },
  selectButtonText: {
    fontSize: fontSize.large,
    color: colors.darkGray,
    fontWeight: '600',
    marginBottom: spacing.tiny,
  },
  selectButtonHint: {
    fontSize: fontSize.small,
    color: colors.mediumGray,
  },
});

