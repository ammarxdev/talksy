import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

export type ErrorType = 
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'RECORDING_ERROR'
  | 'TRANSCRIPTION_ERROR'
  | 'AI_ERROR'
  | 'TTS_ERROR'
  | 'UNKNOWN_ERROR';

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  details?: string;
  timestamp: Date;
  recoverable: boolean;
  retryAction?: () => Promise<void>;
}

export interface UseErrorHandlerReturn {
  currentError: ErrorInfo | null;
  showError: (error: ErrorInfo) => void;
  clearError: () => void;
  handleError: (error: unknown, type: ErrorType, context?: string) => void;
  isRecoverable: boolean;
  retry: () => Promise<void>;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [currentError, setCurrentError] = useState<ErrorInfo | null>(null);

  const getErrorMessage = (type: ErrorType, originalMessage?: string): string => {
    const errorMessages: Record<ErrorType, string> = {
      PERMISSION_DENIED: 'Microphone permission is required to use the voice assistant. Please enable it in your device settings.',
      NETWORK_ERROR: 'Network connection failed. Please check your internet connection and try again.',
      API_ERROR: 'Service temporarily unavailable. Please try again in a moment.',
      RECORDING_ERROR: 'Failed to record audio. Please check your microphone and try again.',
      TRANSCRIPTION_ERROR: 'Failed to convert speech to text. Please speak clearly and try again.',
      AI_ERROR: 'AI service is temporarily unavailable. Please try again later.',
      TTS_ERROR: 'Failed to speak the response. Please check your audio settings.',
      UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
    };

    return originalMessage || errorMessages[type];
  };

  const isErrorRecoverable = (type: ErrorType): boolean => {
    const recoverableErrors: ErrorType[] = [
      'NETWORK_ERROR',
      'API_ERROR',
      'RECORDING_ERROR',
      'TRANSCRIPTION_ERROR',
      'AI_ERROR',
      'TTS_ERROR',
    ];
    return recoverableErrors.includes(type);
  };

  const showError = useCallback((error: ErrorInfo) => {
    setCurrentError(error);

    // Show appropriate UI feedback
    if (error.type === 'PERMISSION_DENIED') {
      Alert.alert(
        'Permission Required',
        error.message,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Settings',
            onPress: () => {
              // In a real app, you would open device settings
              // Settings action placeholder
            }
          },
        ]
      );
    } else if (!error.recoverable) {
      Alert.alert(
        'Error',
        error.message,
        [{ text: 'OK', onPress: () => setCurrentError(null) }]
      );
    } else {
      // For recoverable errors, show toast or inline error
      // Recoverable error handled silently
    }
  }, []);

  const clearError = useCallback(() => {
    setCurrentError(null);
  }, []);

  const handleError = useCallback((error: unknown, type: ErrorType, context?: string) => {
    console.error(`Error in ${context || 'unknown context'}:`, error);

    let message = getErrorMessage(type);
    let details: string | undefined;

    if (error instanceof Error) {
      details = error.message;
      
      // Enhance error messages based on specific error types
      if (error.message.includes('network') || error.message.includes('fetch')) {
        type = 'NETWORK_ERROR';
        message = getErrorMessage('NETWORK_ERROR');
      } else if (error.message.includes('permission')) {
        type = 'PERMISSION_DENIED';
        message = getErrorMessage('PERMISSION_DENIED');
      } else if (error.message.includes('API') || error.message.includes('401') || error.message.includes('403')) {
        type = 'API_ERROR';
        message = getErrorMessage('API_ERROR');
      }
    }

    const errorInfo: ErrorInfo = {
      type,
      message,
      details,
      timestamp: new Date(),
      recoverable: isErrorRecoverable(type),
    };

    showError(errorInfo);
  }, [showError]);

  const retry = useCallback(async () => {
    if (currentError?.retryAction) {
      try {
        await currentError.retryAction();
        clearError();
      } catch (error) {
        handleError(error, currentError.type, 'retry');
      }
    }
  }, [currentError, clearError, handleError]);

  return {
    currentError,
    showError,
    clearError,
    handleError,
    isRecoverable: currentError?.recoverable || false,
    retry,
  };
}
