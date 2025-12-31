/**
 * Ad Fallback Component
 * Shows when ads fail to load, providing graceful degradation
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export interface AdFallbackProps {
  adType: 'banner' | 'interstitial';
  errorMessage?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showRetryButton?: boolean;
  showDismissButton?: boolean;
  style?: any;
}

export function AdFallback({
  adType,
  errorMessage = 'Unable to load advertisement',
  onRetry,
  onDismiss,
  showRetryButton = true,
  showDismissButton = false,
  style,
}: AdFallbackProps) {
  const { colors } = useTheme();

  // Different styling for different ad types
  const containerStyle = adType === 'banner' 
    ? styles.bannerContainer 
    : styles.interstitialContainer;

  const textStyle = adType === 'banner'
    ? styles.bannerText
    : styles.interstitialText;

  return (
    <View style={[
      containerStyle,
      { 
        backgroundColor: colors.cardBackground || colors.background,
        borderColor: colors.border || colors.textSecondary + '20',
      },
      style
    ]}>
      {adType === 'interstitial' && (
        <View style={styles.interstitialHeader}>
          <Text style={[styles.interstitialTitle, { color: colors.text }]}>
            Advertisement
          </Text>
          {showDismissButton && onDismiss && (
            <TouchableOpacity
              style={[styles.dismissButton, { backgroundColor: colors.textSecondary + '20' }]}
              onPress={onDismiss}
            >
              <Text style={[styles.dismissButtonText, { color: colors.text }]}>
                ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.content}>
        <Text style={[textStyle, { color: colors.textSecondary }]}>
          {errorMessage}
        </Text>

        {showRetryButton && onRetry && (
          <TouchableOpacity
            style={[
              styles.retryButton,
              { 
                borderColor: colors.tint,
                backgroundColor: colors.tint + '10',
              }
            ]}
            onPress={onRetry}
          >
            <Text style={[styles.retryButtonText, { color: colors.tint }]}>
              Retry
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {adType === 'banner' && (
        <View style={[styles.bannerIndicator, { backgroundColor: colors.textSecondary + '30' }]}>
          <Text style={[styles.bannerIndicatorText, { color: colors.textSecondary }]}>
            Ad Space
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Minimal fallback for when we want to maintain layout but hide ad errors
 */
export function MinimalAdFallback({ style }: { style?: any }) {
  return <View style={[styles.minimalFallback, style]} />;
}

/**
 * Loading placeholder for ads
 */
export function AdLoadingPlaceholder({ 
  adType, 
  style 
}: { 
  adType: 'banner' | 'interstitial';
  style?: any;
}) {
  const { colors } = useTheme();

  const containerStyle = adType === 'banner' 
    ? styles.bannerContainer 
    : styles.interstitialContainer;

  return (
    <View style={[
      containerStyle,
      { 
        backgroundColor: colors.cardBackground || colors.background,
        borderColor: colors.border || colors.textSecondary + '20',
      },
      style
    ]}>
      <View style={styles.loadingContent}>
        <View style={[styles.loadingBar, { backgroundColor: colors.tint + '30' }]}>
          <View style={[styles.loadingProgress, { backgroundColor: colors.tint }]} />
        </View>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading advertisement...
        </Text>
      </View>
    </View>
  );
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  // Banner fallback styles
  bannerContainer: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
    overflow: 'hidden',
  },
  bannerText: {
    fontSize: 12,
    textAlign: 'center',
  },
  bannerIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bannerIndicatorText: {
    fontSize: 8,
    fontWeight: '500',
  },

  // Interstitial fallback styles
  interstitialContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  interstitialHeader: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  interstitialTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  interstitialText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Common styles
  content: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Minimal fallback
  minimalFallback: {
    height: 1,
    backgroundColor: 'transparent',
  },

  // Loading placeholder styles
  loadingContent: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBar: {
    width: 100,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    width: '60%',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 12,
  },
});

export default AdFallback;
