/**
 * ProfilePictureUploader Component
 * Handles profile picture upload with image picker integration
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/hooks/useTheme';
import { useProfile } from '@/hooks/useProfile';
import { useAlert } from '@/contexts/AlertContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { ProfileUploaderProps } from '@/types/profile';
import { createAvatarUploadWithValidation, formatFileSize } from '@/utils/profileUtils';
import {
  profileLogger,
  LogCategory,
  logUserAction,
  logUploadStart,
  logUploadProgress,
  logUploadComplete,
  startPerformanceTracking,
  endPerformanceTracking
} from '@/utils/profileLogger';
import { profileErrorHandler, UserFriendlyError } from '@/utils/profileErrorHandler';
import ProfileUploadFeedback from './ProfileUploadFeedback';
import { ProfilePicture } from './ProfilePicture';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ProfileLoadingAnimation } from './ProfileLoadingAnimation';
import { ProfileSuccessAnimation } from './ProfileSuccessAnimation';

export const ProfilePictureUploader: React.FC<ProfileUploaderProps> = ({
  onUploadSuccess,
  onUploadError,
  disabled = false,
  style,
}) => {
  const { colors } = useTheme();
  const { profile, isUploading, uploadAvatar, deleteAvatar } = useProfile();
  const { showAlert, showConfirmation, showError, showSuccess } = useAlert();
  const { requestPermission } = usePermissions();
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'processing' | 'success'>('idle');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [currentError, setCurrentError] = useState<UserFriendlyError | null>(null);
  const [currentWarning, setCurrentWarning] = useState<UserFriendlyError | null>(null);
  const [currentSuccess, setCurrentSuccess] = useState<{ title: string; message: string } | null>(null);

  // Helper functions for enhanced error handling
  const handleEnhancedError = (error: Error | string, operation: string, context: any = {}) => {
    const errorContext = {
      operation,
      fileSize: context.fileSize,
      mimeType: context.mimeType,
      fileName: context.fileName,
      platform: Platform.OS as 'android' | 'ios',
      ...context
    };

    const userFriendlyError = profileErrorHandler.handleError(error, errorContext);
    setCurrentError(userFriendlyError);
    setCurrentWarning(null);
    setCurrentSuccess(null);

    // Also log to traditional error system for backward compatibility
    const errorMessage = userFriendlyError.message;
    showError(errorMessage);
    onUploadError?.(errorMessage);

    profileLogger.error(LogCategory.ERROR, 'Enhanced error handled', {
      originalError: error instanceof Error ? error.message : error,
      userFriendlyError,
      context: errorContext
    });
  };

  const handleEnhancedWarning = (warning: string) => {
    const userFriendlyWarning = profileErrorHandler.getWarningMessage(warning);
    setCurrentWarning(userFriendlyWarning);
    setCurrentError(null);

    profileLogger.warn(LogCategory.VALIDATION, 'Enhanced warning displayed', {
      warning,
      userFriendlyWarning
    });
  };

  const handleEnhancedSuccess = (operation: string) => {
    const successMessage = profileErrorHandler.getSuccessMessage(operation);
    setCurrentSuccess(successMessage);
    setCurrentError(null);
    setCurrentWarning(null);

    showSuccess(successMessage.message);

    profileLogger.info(LogCategory.USER_ACTION, 'Enhanced success displayed', {
      operation,
      successMessage
    });
  };

  const clearFeedback = () => {
    setCurrentError(null);
    setCurrentWarning(null);
    setCurrentSuccess(null);
  };

  const requestPermissions = async () => {
    try {
      // Use the new permission system for consistent permission handling
      const result = await requestPermission('photos');
      return result.granted;
    } catch (error) {
      console.error('Failed to request photos permission:', error);
      return false;
    }
  };

  const pickImage = async () => {
    if (disabled || isUploading) return;

    const operationId = `pick_image_${Date.now()}`;
    startPerformanceTracking(operationId, LogCategory.USER_ACTION, 'Pick image from gallery');

    logUserAction('pick_image_gallery', {
      disabled,
      isUploading,
      hasExistingAvatar: !!profile?.avatar_url
    });

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      profileLogger.warn(LogCategory.USER_ACTION, 'Gallery permission denied');
      endPerformanceTracking(operationId, { success: false, reason: 'permission_denied' });
      return;
    }

    try {
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

        // Create avatar upload object with enhanced validation
        const { avatar, validation } = createAvatarUploadWithValidation(result);

        if (!avatar) {
          handleEnhancedError(
            'Failed to process selected image',
            'image_processing',
            { fileName: asset.fileName, fileSize: asset.fileSize }
          );
          setLocalImageUri(null);
          return;
        }

        // Check validation results
        if (!validation.isValid) {
          const errorMessage = validation.errors[0] || 'Invalid image format';
          handleEnhancedError(
            errorMessage,
            'image_validation',
            {
              fileName: avatar.name,
              fileSize: avatar.size,
              mimeType: avatar.type,
              validationErrors: validation.errors
            }
          );
          setLocalImageUri(null);
          return;
        }

        // Show warnings if any (but still allow upload)
        if (validation.warnings.length > 0) {
          handleEnhancedWarning(validation.warnings[0]);
          profileLogger.warn(LogCategory.VALIDATION, 'Image upload warnings detected', {
            warnings: validation.warnings,
            warningCount: validation.warnings.length
          });
        }

        // Log successful image processing
        profileLogger.info(LogCategory.USER_ACTION, 'Image processed successfully for upload', {
          mimeType: avatar.type,
          size: avatar.size,
          confidence: validation.details.confidence,
          source: validation.details.source
        });

        // Show confirmation with enhanced file details
        const confidenceText = validation.details.confidence === 'high' ? '' :
          `\n⚠️ File type detection: ${validation.details.confidence} confidence`;

        showConfirmation(
          `Upload this image as your profile picture?\n\nSize: ${formatFileSize(avatar.size)}\nType: ${avatar.type}${confidenceText}`,
          async () => {
            await handleUpload(avatar);
          },
          () => {
            setLocalImageUri(null);
          },
          'Confirm Upload'
        );
      } else {
        profileLogger.info(LogCategory.USER_ACTION, 'Image selection cancelled by user');
        endPerformanceTracking(operationId, { success: false, reason: 'user_cancelled' });
      }
    } catch (error) {
      profileLogger.error(LogCategory.ERROR, 'Error picking image from gallery', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      showError('Failed to select image. Please try again.');
      setLocalImageUri(null);
      onUploadError?.('Failed to select image');
      endPerformanceTracking(operationId, { success: false, reason: 'error', error });
    }
  };

  const handleUpload = async (avatar: any) => {
    const operationId = `upload_avatar_${Date.now()}`;
    startPerformanceTracking(operationId, LogCategory.UPLOAD, 'Avatar upload process');

    logUploadStart(avatar);

    try {
      // Start upload animation
      setUploadStage('uploading');
      setUploadProgress(0);

      // Simulate progress updates (in real implementation, this would come from upload progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev >= 90 ? 90 : prev + 10;
          logUploadProgress(newProgress, 'uploading', `Upload progress: ${newProgress}%`);

          if (newProgress >= 90) {
            clearInterval(progressInterval);
          }
          return newProgress;
        });
      }, 200);

      const result = await uploadAvatar(avatar);

      // Clear progress interval
      clearInterval(progressInterval);

      if (result.success) {
        // Complete progress and show processing
        setUploadProgress(100);
        setUploadStage('processing');

        logUploadComplete(true, { avatarUrl: result.avatar_url });
        profileLogger.info(LogCategory.USER_ACTION, 'Profile picture upload completed successfully', {
          avatarUrl: result.avatar_url,
          fileSize: avatar.size,
          mimeType: avatar.type
        });

        // Brief processing delay for better UX
        setTimeout(() => {
          setUploadStage('success');
          setShowSuccessAnimation(true);

          // Hide success animation and reset after delay
          setTimeout(() => {
            setShowSuccessAnimation(false);
            setUploadStage('idle');
            setUploadProgress(0);
            setLocalImageUri(null);
          }, 2000);
        }, 500);

        handleEnhancedSuccess('upload');
        onUploadSuccess?.(result.avatar_url!);
        endPerformanceTracking(operationId, { success: true, avatarUrl: result.avatar_url });
      } else {
        const errorMessage = result.error || 'Failed to upload profile picture';

        logUploadComplete(false, undefined, errorMessage);

        setUploadStage('idle');
        setUploadProgress(0);
        handleEnhancedError(
          errorMessage,
          'upload',
          {
            fileSize: avatar.size,
            mimeType: avatar.type,
            fileName: avatar.name
          }
        );
        setLocalImageUri(null);
        endPerformanceTracking(operationId, { success: false, error: errorMessage });
      }
    } catch (error) {
      logUploadComplete(false, undefined, error);

      setUploadStage('idle');
      setUploadProgress(0);
      handleEnhancedError(
        error instanceof Error ? error : 'Unknown upload error',
        'upload_exception',
        {
          fileSize: avatar.size,
          mimeType: avatar.type,
          fileName: avatar.name,
          stack: error instanceof Error ? error.stack : undefined
        }
      );
      setLocalImageUri(null);
      endPerformanceTracking(operationId, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      });
    }
  };

  const handleDeleteAvatar = () => {
    if (disabled || isUploading || !profile?.avatar_url) return;

    showConfirmation(
      'Are you sure you want to remove your profile picture?',
      async () => {
        const success = await deleteAvatar();
        
        if (success) {
          handleEnhancedSuccess('delete');
        } else {
          handleEnhancedError(
            'Failed to remove profile picture',
            'delete',
            {}
          );
        }
      },
      undefined,
      'Remove Profile Picture'
    );
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
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setLocalImageUri(asset.uri);

        // Create avatar upload object with enhanced validation
        const { avatar, validation } = createAvatarUploadWithValidation(result);

        if (!avatar) {
          showError('Failed to process captured photo. Please try again.');
          setLocalImageUri(null);
          onUploadError?.('Failed to process photo');
          return;
        }

        // Check validation results
        if (!validation.isValid) {
          const errorMessage = validation.errors[0] || 'Invalid photo format';
          showError(errorMessage);
          setLocalImageUri(null);
          onUploadError?.(errorMessage);
          return;
        }

        // Show warnings if any
        if (validation.warnings.length > 0) {
          console.warn('Photo capture warnings:', validation.warnings);
        }

        // Log validation details for debugging
        console.log('Photo validation details:', validation.details);

        await handleUpload(avatar);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showError('Failed to take photo. Please try again.');
      setLocalImageUri(null);
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
          onPress: handleDeleteAvatar,
          style: 'destructive' as const
        }] : []),
      ],
    });
  };

  // Show loading animation during upload
  if (uploadStage !== 'idle' && !showSuccessAnimation) {
    return (
      <View style={[styles.container, style]}>
        <ProfileLoadingAnimation
          type={uploadStage === 'uploading' ? 'uploading' : uploadStage === 'processing' ? 'processing' : 'saving'}
          progress={uploadProgress}
          size={120}
          showProgress={true}
        />
      </View>
    );
  }

  // Show success animation
  if (showSuccessAnimation) {
    return (
      <View style={[styles.container, style]}>
        <ProfileSuccessAnimation
          message="Profile picture updated!"
          size={120}
          onAnimationComplete={() => {
            setShowSuccessAnimation(false);
            setUploadStage('idle');
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.pictureContainer}
        onPress={showImageOptions}
        disabled={disabled || isUploading}
        activeOpacity={0.8}
      >
        <ProfilePicture
          profile={localImageUri ? { ...profile, avatar_url: localImageUri } as any : profile}
          size={120}
          showBorder={true}
        />

        {/* Upload overlay */}
        <View style={[styles.overlay, { backgroundColor: colors.surface + '80' }]}>
          {isUploading ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <IconSymbol
              name="camera.fill"
              size={24}
              color={colors.textPrimary}
            />
          )}
        </View>
      </TouchableOpacity>

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

      {/* Enhanced feedback component */}
      <ProfileUploadFeedback
        error={currentError}
        warning={currentWarning}
        success={currentSuccess}
        uploadProgress={uploadProgress}
        uploadStage={uploadStage}
        onRetry={() => {
          clearFeedback();
          // Retry the last operation based on context
          if (currentError?.category === 'validation') {
            showImageOptions();
          } else {
            // For upload errors, we could retry the upload if we had the avatar data
            showImageOptions();
          }
        }}
        onDismiss={clearFeedback}
        onAction={() => {
          clearFeedback();
          showImageOptions();
        }}
        style={styles.feedback}
      />
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
  feedback: {
    marginTop: 16,
    width: '100%',
  },
});
