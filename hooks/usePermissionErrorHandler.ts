import { useCallback } from 'react';
import { PermissionType, permissionManager } from '@/services/PermissionManager';
import { usePermissions } from '@/contexts/PermissionContext';
import { useAlert } from '@/contexts/AlertContext';

export interface PermissionErrorHandlerOptions {
  showUserFriendlyErrors?: boolean;
  autoRequestPermissions?: boolean;
  fallbackToSettings?: boolean;
}

export interface UsePermissionErrorHandlerReturn {
  handlePermissionError: (error: Error, permissionType: PermissionType, options?: PermissionErrorHandlerOptions) => Promise<boolean>;
  handleSpeechRecognitionError: (error: Error) => Promise<boolean>;
  handleContactsError: (error: Error) => Promise<boolean>;
  handleLocationError: (error: Error) => Promise<boolean>;
  handleCameraError: (error: Error) => Promise<boolean>;
  handlePhotosError: (error: Error) => Promise<boolean>;
  handleNotificationError: (error: Error) => Promise<boolean>;
}

export function usePermissionErrorHandler(): UsePermissionErrorHandlerReturn {
  const { requestPermission } = usePermissions();
  const { showError, showWarning, showInfo } = useAlert();

  const handlePermissionError = useCallback(async (
    error: Error,
    permissionType: PermissionType,
    options: PermissionErrorHandlerOptions = {}
  ): Promise<boolean> => {
    const {
      showUserFriendlyErrors = true,
      autoRequestPermissions = true,
      fallbackToSettings = true,
    } = options;

    console.error(`Permission error for ${permissionType}:`, error);

    const permissionInfo = permissionManager.getPermissionInfo(permissionType);
    const errorMessage = error.message.toLowerCase();

    // Check if it's a permission-related error
    if (!errorMessage.includes('permission') && !errorMessage.includes('access')) {
      // Not a permission error, handle as regular error
      if (showUserFriendlyErrors) {
        showError(
          `There was an issue with ${permissionInfo.title}. Please try again.`,
          'Error'
        );
      }
      return false;
    }

    // Check current permission status
    const currentStatus = await permissionManager.checkPermission(permissionType);

    if (currentStatus.granted) {
      // Permission is granted but still getting error - might be a different issue
      if (showUserFriendlyErrors) {
        showError(
          `There was an issue accessing ${permissionInfo.title}. Please try again.`,
          'Access Error'
        );
      }
      return false;
    }

    // Permission is not granted
    if (currentStatus.canAskAgain && autoRequestPermissions) {
      // Can ask for permission - show request dialog
      if (showUserFriendlyErrors) {
        showWarning(
          permissionInfo.reason,
          permissionInfo.title,
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Allow',
              onPress: async () => {
                try {
                  const result = await requestPermission(permissionType);
                  if (result.granted) {
                    showInfo('Permission granted! You can now try again.', 'Success');
                  } else if (!result.canAskAgain && fallbackToSettings) {
                    showWarning(
                      `Please enable ${permissionInfo.title} in your device settings to use this feature.`,
                      'Settings Required',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Open Settings',
                          onPress: () => permissionManager.openAppSettings(),
                        },
                      ]
                    );
                  }
                } catch (requestError) {
                  console.error('Failed to request permission:', requestError);
                  showError('Failed to request permission. Please try again.', 'Error');
                }
              },
            },
          ]
        );
      }
      return true; // Handled by showing request dialog
    } else if (!currentStatus.canAskAgain && fallbackToSettings) {
      // Can't ask again - need to go to settings
      if (showUserFriendlyErrors) {
        showWarning(
          permissionInfo.settingsHint,
          `${permissionInfo.title} Required`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => permissionManager.openAppSettings(),
            },
          ]
        );
      }
      return true; // Handled by showing settings dialog
    }

    // Default error handling
    if (showUserFriendlyErrors) {
      showError(
        `${permissionInfo.title} is required for this feature.`,
        'Permission Required'
      );
    }
    return false;
  }, [requestPermission, showError, showWarning, showInfo]);

  // Specific error handlers for common permission types
  const handleSpeechRecognitionError = useCallback(async (error: Error): Promise<boolean> => {
    // Check if it's a microphone or speech recognition error
    if (error.message.toLowerCase().includes('microphone')) {
      return await handlePermissionError(error, 'microphone');
    } else if (error.message.toLowerCase().includes('speech')) {
      return await handlePermissionError(error, 'speechRecognition');
    }
    
    // Try both permissions if unclear
    const micResult = await handlePermissionError(error, 'microphone', { showUserFriendlyErrors: false });
    if (micResult) return true;
    
    return await handlePermissionError(error, 'speechRecognition');
  }, [handlePermissionError]);

  const handleContactsError = useCallback(async (error: Error): Promise<boolean> => {
    return await handlePermissionError(error, 'contacts');
  }, [handlePermissionError]);

  const handleLocationError = useCallback(async (error: Error): Promise<boolean> => {
    return await handlePermissionError(error, 'location');
  }, [handlePermissionError]);

  const handleCameraError = useCallback(async (error: Error): Promise<boolean> => {
    return await handlePermissionError(error, 'camera');
  }, [handlePermissionError]);

  const handlePhotosError = useCallback(async (error: Error): Promise<boolean> => {
    return await handlePermissionError(error, 'photos');
  }, [handlePermissionError]);

  const handleNotificationError = useCallback(async (error: Error): Promise<boolean> => {
    return await handlePermissionError(error, 'notifications');
  }, [handlePermissionError]);

  return {
    handlePermissionError,
    handleSpeechRecognitionError,
    handleContactsError,
    handleLocationError,
    handleCameraError,
    handlePhotosError,
    handleNotificationError,
  };
}

export default usePermissionErrorHandler;
