/**
 * Profile Upload Feedback Component
 * Provides enhanced user feedback for profile picture upload operations
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { UserFriendlyError } from '@/utils/profileErrorHandler';

interface ProfileUploadFeedbackProps {
  error?: UserFriendlyError | null;
  warning?: UserFriendlyError | null;
  success?: { title: string; message: string } | null;
  uploadProgress?: number;
  uploadStage?: 'idle' | 'uploading' | 'processing' | 'success';
  onRetry?: () => void;
  onDismiss?: () => void;
  onAction?: () => void;
  style?: any;
}

export const ProfileUploadFeedback: React.FC<ProfileUploadFeedbackProps> = ({
  error,
  warning,
  success,
  uploadProgress = 0,
  uploadStage = 'idle',
  onRetry,
  onDismiss,
  onAction,
  style
}) => {
  const { colors } = useTheme();
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (error || warning || success) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [error, warning, success, fadeAnim]);

  const getProgressMessage = () => {
    switch (uploadStage) {
      case 'uploading':
        return `Uploading... ${Math.round(uploadProgress)}%`;
      case 'processing':
        return 'Processing your image...';
      case 'success':
        return 'Upload complete!';
      default:
        return '';
    }
  };

  const getProgressColor = () => {
    switch (uploadStage) {
      case 'uploading':
        return colors.primary;
      case 'processing':
        return colors.text;
      case 'success':
        return '#4CAF50';
      default:
        return colors.text;
    }
  };

  const renderError = () => {
    if (!error) return null;

    const getErrorIcon = () => {
      switch (error.category) {
        case 'network':
          return 'wifi-outline';
        case 'permission':
          return 'lock-closed-outline';
        case 'validation':
          return 'alert-circle-outline';
        default:
          return 'warning-outline';
      }
    };

    const getErrorColor = () => {
      switch (error.severity) {
        case 'error':
          return '#F44336';
        case 'warning':
          return '#FF9800';
        default:
          return colors.text;
      }
    };

    return (
      <Animated.View 
        style={[
          styles.feedbackContainer, 
          { backgroundColor: getErrorColor() + '15', borderColor: getErrorColor() },
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.feedbackHeader}>
          <Ionicons 
            name={getErrorIcon()} 
            size={24} 
            color={getErrorColor()} 
            style={styles.feedbackIcon}
          />
          <View style={styles.feedbackContent}>
            <Text style={[styles.feedbackTitle, { color: getErrorColor() }]}>
              {error.title}
            </Text>
            <Text style={[styles.feedbackMessage, { color: colors.text }]}>
              {error.message}
            </Text>
            {error.actionHint && (
              <Text style={[styles.feedbackHint, { color: colors.text + '80' }]}>
                {error.actionHint}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={20} color={colors.text + '60'} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.feedbackActions}>
          {error.retryable && onRetry && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.retryButton, { borderColor: getErrorColor() }]}
              onPress={onRetry}
            >
              <Ionicons name="refresh" size={16} color={getErrorColor()} />
              <Text style={[styles.actionButtonText, { color: getErrorColor() }]}>
                Try Again
              </Text>
            </TouchableOpacity>
          )}
          
          {error.actionText && onAction && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton, { backgroundColor: getErrorColor() }]}
              onPress={onAction}
            >
              <Text style={[styles.actionButtonText, { color: 'white' }]}>
                {error.actionText}
              </Text>
            </TouchableOpacity>
          )}
          
          {error.helpUrl && (
            <TouchableOpacity
              style={[styles.actionButton, styles.helpButton]}
              onPress={() => {
                // Navigate to help URL or show help modal
                // TODO: Implement help navigation
              }}
            >
              <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                Get Help
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderWarning = () => {
    if (!warning || error) return null; // Don't show warning if there's an error

    return (
      <Animated.View 
        style={[
          styles.feedbackContainer, 
          { backgroundColor: '#FF9800' + '15', borderColor: '#FF9800' },
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.feedbackHeader}>
          <Ionicons 
            name="warning-outline" 
            size={24} 
            color="#FF9800" 
            style={styles.feedbackIcon}
          />
          <View style={styles.feedbackContent}>
            <Text style={[styles.feedbackTitle, { color: '#FF9800' }]}>
              {warning.title}
            </Text>
            <Text style={[styles.feedbackMessage, { color: colors.text }]}>
              {warning.message}
            </Text>
            {warning.actionHint && (
              <Text style={[styles.feedbackHint, { color: colors.text + '80' }]}>
                {warning.actionHint}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={20} color={colors.text + '60'} />
          </TouchableOpacity>
        </View>
        
        {warning.actionText && onAction && (
          <View style={styles.feedbackActions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton, { backgroundColor: '#FF9800' }]}
              onPress={onAction}
            >
              <Text style={[styles.actionButtonText, { color: 'white' }]}>
                {warning.actionText}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    );
  };

  const renderSuccess = () => {
    if (!success || error || warning) return null;

    return (
      <Animated.View 
        style={[
          styles.feedbackContainer, 
          { backgroundColor: '#4CAF50' + '15', borderColor: '#4CAF50' },
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.feedbackHeader}>
          <Ionicons 
            name="checkmark-circle" 
            size={24} 
            color="#4CAF50" 
            style={styles.feedbackIcon}
          />
          <View style={styles.feedbackContent}>
            <Text style={[styles.feedbackTitle, { color: '#4CAF50' }]}>
              {success.title}
            </Text>
            <Text style={[styles.feedbackMessage, { color: colors.text }]}>
              {success.message}
            </Text>
          </View>
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={20} color={colors.text + '60'} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderProgress = () => {
    if (uploadStage === 'idle' || error) return null;

    const progressMessage = getProgressMessage();
    const progressColor = getProgressColor();

    return (
      <View style={[styles.progressContainer, { backgroundColor: colors.card }]}>
        <View style={styles.progressHeader}>
          <Ionicons 
            name={uploadStage === 'success' ? 'checkmark-circle' : 'cloud-upload-outline'} 
            size={20} 
            color={progressColor} 
          />
          <Text style={[styles.progressText, { color: progressColor }]}>
            {progressMessage}
          </Text>
        </View>
        
        {uploadStage === 'uploading' && (
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: progressColor,
                  width: `${uploadProgress}%`
                }
              ]} 
            />
          </View>
        )}
        
        {uploadStage === 'processing' && (
          <View style={styles.processingIndicator}>
            <View style={[styles.processingDot, { backgroundColor: progressColor }]} />
            <View style={[styles.processingDot, { backgroundColor: progressColor }]} />
            <View style={[styles.processingDot, { backgroundColor: progressColor }]} />
          </View>
        )}
      </View>
    );
  };

  if (!error && !warning && !success && uploadStage === 'idle') {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {renderProgress()}
      {renderError()}
      {renderWarning()}
      {renderSuccess()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  feedbackContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginVertical: 4,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  feedbackIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  feedbackContent: {
    flex: 1,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  feedbackMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  feedbackHint: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
  feedbackActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  retryButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  helpButton: {
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  processingIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  processingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.6,
  },
});

export default ProfileUploadFeedback;
