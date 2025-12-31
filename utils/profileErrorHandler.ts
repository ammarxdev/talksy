/**
 * Profile Error Handler Utility
 * Provides enhanced error handling and user feedback for profile operations
 */

import { ProfileError, PROFILE_ERROR_CODES } from '@/types/profile';
import { profileLogger, LogCategory } from './profileLogger';
import { Platform } from 'react-native';
import * as Network from 'expo-network';

export interface UserFriendlyError {
  title: string;
  message: string;
  actionText?: string;
  actionHint?: string;
  severity: 'error' | 'warning' | 'info';
  category: 'validation' | 'network' | 'permission' | 'system' | 'user';
  recoverable: boolean;
  retryable: boolean;
  helpUrl?: string;
}

export interface ErrorContext {
  operation: string;
  fileSize?: number;
  mimeType?: string;
  fileName?: string;
  platform?: 'android' | 'ios' | 'web';
  networkStatus?: 'online' | 'offline' | 'slow';
  userId?: string;
  timestamp?: string;
  appVersion?: string;
  deviceInfo?: any;
}

export interface EnhancedErrorLog {
  errorId: string;
  timestamp: string;
  platform: string;
  operation: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  context: ErrorContext;
  networkState?: any;
  deviceInfo?: any;
  userFriendlyMessage: string;
}

/**
 * Enhanced error handler for profile picture operations
 */
export class ProfileErrorHandler {
  private static instance: ProfileErrorHandler;

  public static getInstance(): ProfileErrorHandler {
    if (!ProfileErrorHandler.instance) {
      ProfileErrorHandler.instance = new ProfileErrorHandler();
    }
    return ProfileErrorHandler.instance;
  }

  /**
   * Enhanced error logging with comprehensive context
   */
  public async logEnhancedError(
    error: Error | ProfileError | string,
    context: ErrorContext
  ): Promise<EnhancedErrorLog> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const timestamp = new Date().toISOString();

    // Get network state if available
    let networkState = null;
    try {
      if (Network && Network.getNetworkStateAsync) {
        networkState = await Network.getNetworkStateAsync();
      }
    } catch (e) {
      // Network module not available or failed
    }

    // Create enhanced error log
    const enhancedLog: EnhancedErrorLog = {
      errorId,
      timestamp,
      platform: Platform.OS,
      operation: context.operation,
      errorType: error instanceof ProfileError ? 'ProfileError' :
                error instanceof Error ? 'Error' : 'String',
      errorMessage: error instanceof Error ? error.message : String(error),
      stackTrace: error instanceof Error ? error.stack : undefined,
      context: {
        ...context,
        platform: Platform.OS as any,
        timestamp,
      },
      networkState,
      deviceInfo: {
        platform: Platform.OS,
        version: Platform.Version,
      },
      userFriendlyMessage: this.handleError(error, context).message
    };

    // Log the enhanced error
    profileLogger.error(LogCategory.ERROR, 'Enhanced error logged', enhancedLog);

    return enhancedLog;
  }

  /**
   * Convert technical errors to user-friendly messages
   */
  public handleError(
    error: Error | ProfileError | string,
    context: ErrorContext
  ): UserFriendlyError {
    profileLogger.debug(LogCategory.ERROR, 'Processing error for user feedback', {
      error: error instanceof Error ? error.message : error,
      context
    });

    // Handle ProfileError with specific error codes
    if (error instanceof ProfileError) {
      return this.handleProfileError(error, context);
    }

    // Handle generic Error objects
    if (error instanceof Error) {
      return this.handleGenericError(error, context);
    }

    // Handle string errors
    return this.handleStringError(error, context);
  }

  /**
   * Handle ProfileError with specific error codes
   */
  private handleProfileError(error: ProfileError, context: ErrorContext): UserFriendlyError {
    switch (error.code) {
      case PROFILE_ERROR_CODES.FILE_TOO_LARGE:
        return {
          title: 'Image Too Large',
          message: this.getFileSizeErrorMessage(context.fileSize),
          actionText: 'Compress Image',
          actionHint: 'Try using a photo editing app to reduce the file size, or choose a different image.',
          severity: 'error',
          category: 'validation',
          recoverable: true,
          retryable: true,
          helpUrl: '/help/image-compression'
        };

      case PROFILE_ERROR_CODES.INVALID_FILE_TYPE:
        return {
          title: 'Unsupported Image Format',
          message: this.getFormatErrorMessage(context.mimeType),
          actionText: 'Choose Different Image',
          actionHint: 'Please select a JPEG, PNG, WebP, or GIF image from your gallery.',
          severity: 'error',
          category: 'validation',
          recoverable: true,
          retryable: true,
          helpUrl: '/help/supported-formats'
        };

      case PROFILE_ERROR_CODES.UPLOAD_ERROR:
        return this.handleUploadError(error.message, context);

      case PROFILE_ERROR_CODES.NETWORK_ERROR:
        return {
          title: 'Connection Problem',
          message: 'Unable to upload your image due to a network issue.',
          actionText: 'Try Again',
          actionHint: 'Check your internet connection and try uploading again.',
          severity: 'error',
          category: 'network',
          recoverable: true,
          retryable: true,
          helpUrl: '/help/connection-issues'
        };

      case PROFILE_ERROR_CODES.PERMISSION_ERROR:
        return {
          title: 'Permission Required',
          message: this.getPermissionErrorMessage(context.platform),
          actionText: 'Grant Permission',
          actionHint: 'Go to your device settings to allow camera and photo access.',
          severity: 'error',
          category: 'permission',
          recoverable: true,
          retryable: false,
          helpUrl: '/help/permissions'
        };

      case PROFILE_ERROR_CODES.VALIDATION_ERROR:
        return {
          title: 'Image Validation Failed',
          message: error.message || 'The selected image could not be validated.',
          actionText: 'Choose Different Image',
          actionHint: 'Please select a different image and try again.',
          severity: 'error',
          category: 'validation',
          recoverable: true,
          retryable: true
        };

      default:
        return {
          title: 'Upload Failed',
          message: error.message || 'An unexpected error occurred while uploading your image.',
          actionText: 'Try Again',
          actionHint: 'Please try uploading your image again.',
          severity: 'error',
          category: 'system',
          recoverable: true,
          retryable: true
        };
    }
  }

  /**
   * Handle generic Error objects
   */
  private handleGenericError(error: Error, context: ErrorContext): UserFriendlyError {
    const message = error.message.toLowerCase();

    // Network-related errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return {
        title: 'Connection Problem',
        message: 'Unable to upload your image due to a network issue.',
        actionText: 'Try Again',
        actionHint: 'Check your internet connection and try uploading again.',
        severity: 'error',
        category: 'network',
        recoverable: true,
        retryable: true
      };
    }

    // Permission-related errors
    if (message.includes('permission') || message.includes('denied') || message.includes('access')) {
      return {
        title: 'Permission Required',
        message: this.getPermissionErrorMessage(context.platform),
        actionText: 'Grant Permission',
        actionHint: 'Go to your device settings to allow camera and photo access.',
        severity: 'error',
        category: 'permission',
        recoverable: true,
        retryable: false
      };
    }

    // File system errors
    if (message.includes('file') || message.includes('read') || message.includes('write')) {
      return {
        title: 'File Access Problem',
        message: 'Unable to access the selected image file.',
        actionText: 'Choose Different Image',
        actionHint: 'Please select a different image from your gallery.',
        severity: 'error',
        category: 'system',
        recoverable: true,
        retryable: true
      };
    }

    // Default generic error
    return {
      title: 'Upload Failed',
      message: 'An unexpected error occurred while uploading your image.',
      actionText: 'Try Again',
      actionHint: 'Please try uploading your image again.',
      severity: 'error',
      category: 'system',
      recoverable: true,
      retryable: true
    };
  }

  /**
   * Handle string errors
   */
  private handleStringError(error: string, context: ErrorContext): UserFriendlyError {
    const message = error.toLowerCase();

    if (message.includes('too large') || message.includes('size')) {
      return {
        title: 'Image Too Large',
        message: this.getFileSizeErrorMessage(context.fileSize),
        actionText: 'Compress Image',
        actionHint: 'Try using a photo editing app to reduce the file size.',
        severity: 'error',
        category: 'validation',
        recoverable: true,
        retryable: true
      };
    }

    if (message.includes('format') || message.includes('type') || message.includes('unsupported')) {
      return {
        title: 'Unsupported Image Format',
        message: this.getFormatErrorMessage(context.mimeType),
        actionText: 'Choose Different Image',
        actionHint: 'Please select a JPEG, PNG, WebP, or GIF image.',
        severity: 'error',
        category: 'validation',
        recoverable: true,
        retryable: true
      };
    }

    return {
      title: 'Upload Failed',
      message: error || 'An unexpected error occurred.',
      actionText: 'Try Again',
      actionHint: 'Please try again.',
      severity: 'error',
      category: 'system',
      recoverable: true,
      retryable: true
    };
  }

  /**
   * Handle upload-specific errors
   */
  private handleUploadError(message: string, context: ErrorContext): UserFriendlyError {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      return {
        title: 'Connection Problem',
        message: 'Your image upload was interrupted due to a network issue.',
        actionText: 'Try Again',
        actionHint: 'Check your internet connection and try uploading again.',
        severity: 'error',
        category: 'network',
        recoverable: true,
        retryable: true
      };
    }

    if (lowerMessage.includes('server') || lowerMessage.includes('500') || lowerMessage.includes('503')) {
      return {
        title: 'Server Problem',
        message: 'Our servers are temporarily unavailable.',
        actionText: 'Try Again Later',
        actionHint: 'Please wait a few minutes and try uploading again.',
        severity: 'error',
        category: 'system',
        recoverable: true,
        retryable: true
      };
    }

    if (lowerMessage.includes('timeout')) {
      return {
        title: 'Upload Timeout',
        message: 'Your image upload took too long and was cancelled.',
        actionText: 'Try Again',
        actionHint: 'Try uploading a smaller image or check your connection speed.',
        severity: 'error',
        category: 'network',
        recoverable: true,
        retryable: true
      };
    }

    return {
      title: 'Upload Failed',
      message: message || 'Unable to upload your image.',
      actionText: 'Try Again',
      actionHint: 'Please try uploading your image again.',
      severity: 'error',
      category: 'system',
      recoverable: true,
      retryable: true
    };
  }

  /**
   * Generate file size error message
   */
  private getFileSizeErrorMessage(fileSize?: number): string {
    if (fileSize) {
      const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
      return `Your image is ${sizeMB}MB, which exceeds the 5MB limit. Please choose a smaller image or compress it.`;
    }
    return 'Your image is too large. Please choose a smaller image or compress it to under 5MB.';
  }

  /**
   * Generate format error message
   */
  private getFormatErrorMessage(mimeType?: string): string {
    if (mimeType) {
      const format = mimeType.replace('image/', '').toUpperCase();
      return `${format} format is not supported. Please choose a JPEG, PNG, WebP, or GIF image.`;
    }
    return 'This image format is not supported. Please choose a JPEG, PNG, WebP, or GIF image.';
  }

  /**
   * Generate permission error message
   */
  private getPermissionErrorMessage(platform?: string): string {
    switch (platform) {
      case 'android':
        return 'This app needs permission to access your camera and photos. Please grant permission in your Android settings.';
      case 'ios':
        return 'This app needs permission to access your camera and photos. Please grant permission in your iOS settings.';
      default:
        return 'This app needs permission to access your camera and photos. Please grant permission in your device settings.';
    }
  }

  /**
   * Get success message for completed operations
   */
  public getSuccessMessage(operation: string): { title: string; message: string } {
    switch (operation) {
      case 'upload':
        return {
          title: 'Profile Picture Updated!',
          message: 'Your new profile picture has been uploaded successfully.'
        };
      case 'delete':
        return {
          title: 'Profile Picture Removed',
          message: 'Your profile picture has been removed successfully.'
        };
      default:
        return {
          title: 'Success!',
          message: 'Operation completed successfully.'
        };
    }
  }

  /**
   * Get warning message for non-critical issues
   */
  public getWarningMessage(warning: string): UserFriendlyError {
    const lowerWarning = warning.toLowerCase();

    if (lowerWarning.includes('large file') || lowerWarning.includes('size')) {
      return {
        title: 'Large File Size',
        message: 'Your image is quite large and may take longer to upload.',
        actionText: 'Continue Anyway',
        actionHint: 'You can continue with this image or choose a smaller one for faster upload.',
        severity: 'warning',
        category: 'validation',
        recoverable: true,
        retryable: false
      };
    }

    if (lowerWarning.includes('confidence') || lowerWarning.includes('detection')) {
      return {
        title: 'Image Format Detection',
        message: 'We had some difficulty detecting your image format, but it should still work.',
        severity: 'info',
        category: 'validation',
        recoverable: true,
        retryable: false
      };
    }

    return {
      title: 'Notice',
      message: warning,
      severity: 'warning',
      category: 'validation',
      recoverable: true,
      retryable: false
    };
  }
}

// Export singleton instance
export const profileErrorHandler = ProfileErrorHandler.getInstance();
