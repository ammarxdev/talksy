/**
 * Enhanced Profile Picture Uploader Component
 * Advanced profile picture uploader with progress tracking and preview modal
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/hooks/useTheme';
import { useProfile } from '@/hooks/useProfile';
import { useAlert } from '@/contexts/AlertContext';
import { ProfileUploaderProps } from '@/types/profile';
import { createAvatarUploadWithValidation, formatFileSize } from '@/utils/profileUtils';
import { ProfilePicture } from './ProfilePicture';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThemedText } from '@/components/ThemedText';

const { width: screenWidth } = Dimensions.get('window');

interface UploadProgress {
  progress: number;
  stage: 'selecting' | 'validating' | 'uploading' | 'complete';
  message: string;
}

export const ProfilePictureUploaderEnhanced: React.FC<ProfileUploaderProps> = ({
  onUploadSuccess,
  onUploadError,
  disabled = false,
  style,
}) => {
  const { colors } = useTheme();
  const { profile, isUploading, uploadAvatar, deleteAvatar } = useProfile();
  const { showAlert, showConfirmation, showError, showSuccess } = useAlert();
  
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    stage: 'selecting',
    message: 'Ready to upload',
  });

  const updateProgress = (progress: number, stage: UploadProgress['stage'], message: string) => {
    setUploadProgress({ progress, stage, message });
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      showAlert({
        title: 'Permission Required',
        message: 'We need access to your photo library to change your profile picture.',
        type: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => {
              showAlert({
                title: 'Open Settings',
                message: 'Please go to Settings > Privacy > Photos and enable access for this app.',
                type: 'info',
              });
            }
          },
        ],
      });
      return false;
    }
    
    return true;
  };

  const pickImage = async () => {
    if (disabled || isUploading) return;

    updateProgress(10, 'selecting', 'Opening photo library...');

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      updateProgress(0, 'selecting', 'Permission denied');
      return;
    }

    try {
      updateProgress(20, 'selecting', 'Selecting image...');

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setLocalImageUri(asset.uri);

        updateProgress(40, 'validating', 'Validating image...');

        // Create avatar upload object with enhanced validation
        const { avatar, validation } = createAvatarUploadWithValidation(result);

        if (!avatar) {
          showError('Failed to process selected image. Please try again.');
          setLocalImageUri(null);
          updateProgress(0, 'selecting', 'Processing failed');
          onUploadError?.('Failed to process image');
          return;
        }

        // Check validation results
        if (!validation.isValid) {
          const errorMessage = validation.errors[0] || 'Invalid image format';
          showError(errorMessage);
          setLocalImageUri(null);
          updateProgress(0, 'selecting', 'Validation failed');
          onUploadError?.(errorMessage);
          return;
        }

        // Show warnings if any
        if (validation.warnings.length > 0) {
          console.warn('Image upload warnings:', validation.warnings);
          updateProgress(50, 'validating', 'Image validated with warnings');
        } else {
          updateProgress(60, 'validating', 'Image validated successfully');
        }

        // Log validation details for debugging
        console.log('Enhanced validation details:', validation.details);

        // Show preview modal
        setShowPreviewModal(true);
      } else {
        updateProgress(0, 'selecting', 'Selection cancelled');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showError('Failed to select image. Please try again.');
      setLocalImageUri(null);
      updateProgress(0, 'selecting', 'Selection failed');
      onUploadError?.('Failed to select image');
    }
  };

  const handleConfirmUpload = async () => {
    if (!localImageUri) return;

    setShowPreviewModal(false);
    
    try {
      updateProgress(70, 'uploading', 'Preparing upload...');
      
      // Create avatar upload object again
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        exif: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        updateProgress(0, 'selecting', 'Upload cancelled');
        return;
      }

      // Create avatar upload object with enhanced validation
      const { avatar, validation } = createAvatarUploadWithValidation(result);
      if (!avatar || !validation.isValid) {
        const errorMessage = validation.errors[0] || 'Failed to prepare upload';
        showError(errorMessage);
        updateProgress(0, 'selecting', 'Upload preparation failed');
        return;
      }

      updateProgress(80, 'uploading', 'Uploading to server...');
      
      const uploadResult = await uploadAvatar(avatar);
      
      if (uploadResult.success) {
        updateProgress(100, 'complete', 'Upload complete!');
        showSuccess('Profile picture updated successfully!');
        setLocalImageUri(null);
        onUploadSuccess?.(uploadResult.avatar_url!);
        
        // Reset progress after delay
        setTimeout(() => {
          updateProgress(0, 'selecting', 'Ready to upload');
        }, 2000);
      } else {
        showError(uploadResult.error || 'Failed to upload profile picture');
        setLocalImageUri(null);
        updateProgress(0, 'selecting', 'Upload failed');
        onUploadError?.(uploadResult.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showError('Failed to upload profile picture. Please try again.');
      setLocalImageUri(null);
      updateProgress(0, 'selecting', 'Upload failed');
      onUploadError?.('Upload failed');
    }
  };

  const handleCancelPreview = () => {
    setShowPreviewModal(false);
    setLocalImageUri(null);
    updateProgress(0, 'selecting', 'Ready to upload');
  };

  const takePhoto = async () => {
    if (disabled || isUploading) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      showAlert({
        title: 'Permission Required',
        message: 'We need access to your camera to take a profile picture.',
        type: 'warning',
      });
      return;
    }

    try {
      updateProgress(20, 'selecting', 'Opening camera...');

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setLocalImageUri(asset.uri);

        updateProgress(40, 'validating', 'Validating captured photo...');

        // Create avatar upload object with enhanced validation
        const { avatar, validation } = createAvatarUploadWithValidation(result);

        if (!avatar) {
          showError('Failed to process captured photo. Please try again.');
          setLocalImageUri(null);
          updateProgress(0, 'selecting', 'Processing failed');
          onUploadError?.('Failed to process photo');
          return;
        }

        // Check validation results
        if (!validation.isValid) {
          const errorMessage = validation.errors[0] || 'Invalid photo format';
          showError(errorMessage);
          setLocalImageUri(null);
          updateProgress(0, 'selecting', 'Validation failed');
          onUploadError?.(errorMessage);
          return;
        }

        // Show warnings if any
        if (validation.warnings.length > 0) {
          console.warn('Photo capture warnings:', validation.warnings);
        }

        // Log validation details for debugging
        console.log('Camera validation details:', validation.details);

        setShowPreviewModal(true);
        updateProgress(60, 'validating', 'Photo captured and validated successfully');
      } else {
        updateProgress(0, 'selecting', 'Photo cancelled');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showError('Failed to take photo. Please try again.');
      updateProgress(0, 'selecting', 'Camera failed');
      onUploadError?.('Failed to take photo');
    }
  };

  const showImageOptions = () => {
    if (disabled || isUploading) return;

    showAlert({
      title: 'Change Profile Picture',
      message: 'Choose how you\'d like to update your profile picture:',
      type: 'info',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        ...(profile?.avatar_url ? [{ 
          text: 'Remove Current', 
          onPress: () => {
            showConfirmation(
              'Are you sure you want to remove your profile picture?',
              async () => {
                const success = await deleteAvatar();
                if (success) {
                  showSuccess('Profile picture removed successfully!');
                } else {
                  showError('Failed to remove profile picture.');
                }
              }
            );
          },
          style: 'destructive' as const
        }] : []),
      ],
    });
  };

  const ProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View 
          style={[
            styles.progressFill, 
            { 
              backgroundColor: colors.accent,
              width: `${uploadProgress.progress}%`
            }
          ]} 
        />
      </View>
      <ThemedText style={[styles.progressText, { color: colors.textSecondary }]}>
        {uploadProgress.message}
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.pictureContainer}
        onPress={showImageOptions}
        disabled={disabled || isUploading}
        activeOpacity={0.8}
      >
        <ProfilePicture
          profile={profile}
          size={120}
          showBorder={true}
        />
        
        {/* Upload overlay */}
        <View style={[styles.overlay, { backgroundColor: colors.surface + '80' }]}>
          <IconSymbol 
            name="camera.fill" 
            size={24} 
            color={colors.textPrimary} 
          />
        </View>
      </TouchableOpacity>

      {/* Progress indicator */}
      {(isUploading || uploadProgress.progress > 0) && <ProgressBar />}

      <TouchableOpacity
        style={[
          styles.changeButton,
          { backgroundColor: colors.buttonPrimary },
          (disabled || isUploading) && { backgroundColor: colors.buttonDisabled }
        ]}
        onPress={showImageOptions}
        disabled={disabled || isUploading}
      >
        <Text style={[styles.changeButtonText, { color: '#fff' }]}>
          {isUploading ? 'Uploading...' : 'Change Picture'}
        </Text>
      </TouchableOpacity>

      {/* Preview Modal */}
      <Modal
        visible={showPreviewModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelPreview}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <ThemedText style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Preview Profile Picture
            </ThemedText>
            
            {localImageUri && (
              <Image 
                source={{ uri: localImageUri }} 
                style={styles.previewImage}
                resizeMode="cover"
              />
            )}
            
            <ThemedText style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              This is how your profile picture will appear to others.
            </ThemedText>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={handleCancelPreview}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textPrimary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.buttonPrimary }]}
                onPress={handleConfirmUpload}
              >
                <Text style={styles.confirmButtonText}>
                  Upload
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  pictureContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  changeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: screenWidth - 40,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  previewImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
    // backgroundColor set dynamically
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
