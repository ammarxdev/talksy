/**
 * ProfileLoadingState Component
 * Displays loading, error, and empty states for profile components
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

interface ProfileLoadingStateProps {
  type: 'loading' | 'error' | 'empty' | 'uploading';
  message?: string;
  onRetry?: () => void;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export const ProfileLoadingState: React.FC<ProfileLoadingStateProps> = ({
  type,
  message,
  onRetry,
  size = 'medium',
  style,
}) => {
  const { colors } = useTheme();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: { padding: 16 },
          icon: 24,
          title: 16,
          subtitle: 14,
          button: { paddingHorizontal: 16, paddingVertical: 8 },
        };
      case 'large':
        return {
          container: { padding: 40 },
          icon: 48,
          title: 24,
          subtitle: 16,
          button: { paddingHorizontal: 24, paddingVertical: 12 },
        };
      default: // medium
        return {
          container: { padding: 24 },
          icon: 32,
          title: 20,
          subtitle: 16,
          button: { paddingHorizontal: 20, paddingVertical: 10 },
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const getContent = () => {
    switch (type) {
      case 'loading':
        return {
          icon: <ActivityIndicator size="large" color={colors.accent} />,
          title: 'Loading Profile',
          subtitle: message || 'Please wait while we load your profile...',
          showRetry: false,
        };

      case 'uploading':
        return {
          icon: <ActivityIndicator size="large" color={colors.accent} />,
          title: 'Uploading',
          subtitle: message || 'Uploading your profile picture...',
          showRetry: false,
        };

      case 'error':
        return {
          icon: (
            <IconSymbol 
              name="exclamationmark.triangle.fill" 
              size={sizeStyles.icon} 
              color={colors.error} 
            />
          ),
          title: 'Something went wrong',
          subtitle: message || 'Failed to load profile. Please try again.',
          showRetry: true,
        };

      case 'empty':
        return {
          icon: (
            <IconSymbol 
              name="person.circle" 
              size={sizeStyles.icon} 
              color={colors.textSecondary} 
            />
          ),
          title: 'No Profile Found',
          subtitle: message || 'Create your profile to get started.',
          showRetry: false,
        };

      default:
        return {
          icon: null,
          title: '',
          subtitle: '',
          showRetry: false,
        };
    }
  };

  const content = getContent();

  return (
    <ThemedView style={[styles.container, sizeStyles.container, style]}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          {content.icon}
        </View>

        {/* Title */}
        <ThemedText 
          style={[
            styles.title,
            { fontSize: sizeStyles.title, color: colors.textPrimary }
          ]}
        >
          {content.title}
        </ThemedText>

        {/* Subtitle */}
        <ThemedText 
          style={[
            styles.subtitle,
            { fontSize: sizeStyles.subtitle, color: colors.textSecondary }
          ]}
        >
          {content.subtitle}
        </ThemedText>

        {/* Retry Button */}
        {content.showRetry && onRetry && (
          <TouchableOpacity
            style={[
              styles.retryButton,
              sizeStyles.button,
              { backgroundColor: colors.buttonPrimary }
            ]}
            onPress={onRetry}
          >
            <IconSymbol 
              name="arrow.clockwise" 
              size={16} 
              color="#fff" 
              style={styles.retryIcon}
            />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
