/**
 * ProfilePictureSelector Component
 * Compact profile picture selector with quick actions
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/hooks/useTheme';
import { useProfile } from '@/hooks/useProfile';
import { useAlert } from '@/contexts/AlertContext';
import { createAvatarUploadWithValidation } from '@/utils/profileUtils';
import { ProfilePicture } from './ProfilePicture';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface ProfilePictureSelectorProps {
  size?: number;
  showLabel?: boolean;
  onUploadSuccess?: (avatarUrl: string) => void;
  onUploadError?: (error: string) => void;
  style?: any;
}

export const ProfilePictureSelector: React.FC<ProfilePictureSelectorProps> = ({
  size = 80,
  showLabel = true,
  onUploadSuccess,
  onUploadError,
  style,
}) => {
  const { colors } = useTheme();
  const { profile, isUploading, uploadAvatar } = useProfile();
  const { showError, showSuccess } = useAlert();

  const handleImagePicker = async () => {
    if (isUploading) return;

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        showError('Permission required to access photo library');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        // Create avatar upload object with enhanced validation
        const { avatar, validation } = createAvatarUploadWithValidation(result);

        if (!avatar) {
          showError('Failed to process selected image. Please try again.');
          onUploadError?.('Failed to process image');
          return;
        }

        // Check validation results
        if (!validation.isValid) {
          const errorMessage = validation.errors[0] || 'Invalid image format';
          showError(errorMessage);
          onUploadError?.(errorMessage);
          return;
        }

        // Show warnings if any
        if (validation.warnings.length > 0) {
          console.warn('Image selection warnings:', validation.warnings);
        }

        // Log validation details for debugging
        console.log('Selector validation details:', validation.details);

        // Upload avatar
        const uploadResult = await uploadAvatar(avatar);

        if (uploadResult.success) {
          showSuccess('Profile picture updated!');
          onUploadSuccess?.(uploadResult.avatar_url!);
        } else {
          showError(uploadResult.error || 'Upload failed');
          onUploadError?.(uploadResult.error || 'Upload failed');
        }
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      showError('Failed to select image');
      onUploadError?.('Failed to select image');
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.pictureContainer}
        onPress={handleImagePicker}
        disabled={isUploading}
        activeOpacity={0.8}
      >
        <ProfilePicture
          profile={profile}
          size={size}
          showBorder={true}
        />
        
        {/* Edit indicator */}
        <View style={[
          styles.editIndicator,
          { backgroundColor: colors.buttonPrimary }
        ]}>
          <IconSymbol 
            name={isUploading ? "clock" : "pencil"} 
            size={12} 
            color="#fff" 
          />
        </View>
      </TouchableOpacity>

      {showLabel && (
        <TouchableOpacity
          onPress={handleImagePicker}
          disabled={isUploading}
          style={styles.labelContainer}
        >
          <Text style={[
            styles.label,
            { color: colors.accent },
            isUploading && { color: colors.textDisabled }
          ]}>
            {isUploading ? 'Uploading...' : 'Change Photo'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  pictureContainer: {
    position: 'relative',
  },
  editIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  labelContainer: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
