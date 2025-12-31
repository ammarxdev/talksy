/**
 * Profile Error Handler Component
 * Enhanced error handling with retry mechanisms and user-friendly feedback
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { IconSymbol } from '@/components/ui/IconSymbol';

export interface ProfileError {
  type: 'network' | 'permission' | 'validation' | 'upload' | 'storage' | 'unknown';
  message: string;
  code?: string;
  retryable?: boolean;
  details?: string;
}

interface ProfileErrorHandlerProps {
  error: ProfileError;
  onRetry?: () => void;
  onDismiss?: () => void;
  showRetryButton?: boolean;
  showDismissButton?: boolean;
  style?: any;
}

export const ProfileErrorHandler: React.FC<ProfileErrorHandlerProps> = ({
  error,
  onRetry,
  onDismiss,
  showRetryButton = true,
  showDismissButton = true,
  style,
}) => {
  const { colors } = useTheme();
  const [isRetrying, setIsRetrying] = useState(false);

  const getErrorConfig = (errorType: ProfileError['type']) => {
    switch (errorType) {
      case 'network':
        return {
          icon: 'wifi.slash',
          color: colors.warning,
          title: 'Connection Issue',
          suggestion: 'Check your internet connection and try again.',
          retryable: true,
        };
      case 'permission':
        return {
          icon: 'lock.fill',
          color: colors.error,
          title: 'Permission Required',
          suggestion: 'Please grant the necessary permissions in your device settings.',
          retryable: false,
        };
      case 'validation':
        return {
          icon: 'exclamationmark.triangle.fill',
          color: colors.warning,
          title: 'Invalid File',
          suggestion: 'Please select a different image that meets the requirements.',
          retryable: false,
        };
      case 'upload':
        return {
          icon: 'arrow.up.circle.fill',
          color: colors.error,
          title: 'Upload Failed',
          suggestion: 'The upload was interrupted. Please try again.',
          retryable: true,
        };
      case 'storage':
        return {
          icon: 'externaldrive.fill',
          color: colors.error,
          title: 'Storage Error',
          suggestion: 'There was an issue saving your image. Please try again.',
          retryable: true,
        };
      default:
        return {
          icon: 'exclamationmark.circle.fill',
          color: colors.error,
          title: 'Something Went Wrong',
          suggestion: 'An unexpected error occurred. Please try again.',
          retryable: true,
        };
    }
  };

  const config = getErrorConfig(error.type);

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const getDetailedErrorMessage = () => {
    const baseMessage = error.message;
    const details = error.details;
    const code = error.code;

    let fullMessage = baseMessage;
    
    if (details) {
      fullMessage += `\n\n${details}`;
    }
    
    if (code) {
      fullMessage += `\n\nError Code: ${code}`;
    }

    return fullMessage;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }, style]}>
      {/* Error Icon */}
      <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
        <IconSymbol
          name={config.icon as any}
          size={32}
          color={config.color}
        />
      </View>

      {/* Error Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {config.title}
        </Text>
        
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {getDetailedErrorMessage()}
        </Text>
        
        <Text style={[styles.suggestion, { color: colors.textSecondary }]}>
          {config.suggestion}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {showRetryButton && config.retryable && (
          <TouchableOpacity
            style={[
              styles.retryButton,
              { backgroundColor: config.color },
              isRetrying && styles.retryButtonDisabled
            ]}
            onPress={handleRetry}
            disabled={isRetrying}
          >
            <Text style={styles.retryButtonText}>
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Text>
          </TouchableOpacity>
        )}
        
        {showDismissButton && (
          <TouchableOpacity
            style={[styles.dismissButton, { borderColor: colors.border }]}
            onPress={onDismiss}
          >
            <Text style={[styles.dismissButtonText, { color: colors.textSecondary }]}>
              Dismiss
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Helper function to create ProfileError objects
export const createProfileError = (
  type: ProfileError['type'],
  message: string,
  options?: {
    code?: string;
    details?: string;
    retryable?: boolean;
  }
): ProfileError => {
  return {
    type,
    message,
    code: options?.code,
    details: options?.details,
    retryable: options?.retryable ?? true,
  };
};

// Common error creators
export const ProfileErrors = {
  networkError: (details?: string) => createProfileError(
    'network',
    'Unable to connect to the server',
    { details, retryable: true }
  ),
  
  permissionError: (details?: string) => createProfileError(
    'permission',
    'Permission denied',
    { details, retryable: false }
  ),
  
  validationError: (message: string, details?: string) => createProfileError(
    'validation',
    message,
    { details, retryable: false }
  ),
  
  uploadError: (details?: string) => createProfileError(
    'upload',
    'Failed to upload image',
    { details, retryable: true }
  ),
  
  storageError: (details?: string) => createProfileError(
    'storage',
    'Failed to save image',
    { details, retryable: true }
  ),
  
  unknownError: (message?: string, details?: string) => createProfileError(
    'unknown',
    message || 'An unexpected error occurred',
    { details, retryable: true }
  ),
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 12,
    margin: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  content: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  suggestion: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  retryButtonDisabled: {
    opacity: 0.6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
