/**
 * Voice Assistant Banner Ad
 * Specialized banner ad component for the voice assistant screen
 * Designed to not interfere with voice interactions
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Animated, Platform, TouchableOpacity, Text } from 'react-native';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import { BannerAd } from './BannerAd';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface VoiceAssistantBannerProps {
  isVoiceActive?: boolean;
  onAdLoaded?: () => void;
  onAdError?: (error: any) => void;
  showDismiss?: boolean;
  position?: 'top' | 'bottom';
  reappearAfterMs?: number;
  onHeightChange?: (height: number) => void;
}

export function VoiceAssistantBanner({
  isVoiceActive = false,
  onAdLoaded,
  onAdError,
  showDismiss = true,
  position = 'top',
  reappearAfterMs = 5 * 60 * 1000,
  onHeightChange,
}: VoiceAssistantBannerProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const dismissTimeoutRef = React.useRef<any>(null);

  // Handle ad loaded
  const handleAdLoaded = useCallback(() => {
    setIsAdLoaded(true);
    onAdLoaded?.();
  }, [onAdLoaded]);

  // Handle ad error
  const handleAdError = useCallback((error: any) => {
    setIsAdLoaded(false);
    onAdError?.(error);
  }, [onAdError]);

  // Fade out ad when voice is active to reduce visual distractions
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isVoiceActive ? 0.3 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVoiceActive, fadeAnim]);

  // Calculate bottom margin to account for tab bar
  const bottomMargin = Platform.select({
    ios: insets.bottom + 49, // Tab bar height on iOS
    android: 60, // Tab bar height on Android
    default: 60,
  });

  // Calculate top offset to respect safe area
  const topOffset = insets.top + 8;

  // Notify parent when height changes
  useEffect(() => {
    onHeightChange?.(measuredHeight);
  }, [measuredHeight, onHeightChange]);

  // Collapse space when dismissed or when ad not loaded; restore when visible again
  useEffect(() => {
    if (dismissed || !isAdLoaded) {
      onHeightChange?.(0);
    } else if (measuredHeight > 0) {
      onHeightChange?.(measuredHeight);
    }
  }, [dismissed, isAdLoaded, measuredHeight, onHeightChange]);

  // Re-show after a delay when dismissed
  useEffect(() => {
    if (dismissed) {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
      dismissTimeoutRef.current = setTimeout(() => {
        setDismissed(false);
      }, reappearAfterMs);
    }
    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, [dismissed, reappearAfterMs]);

  if (dismissed) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'top'
          ? { top: topOffset, opacity: fadeAnim }
          : { bottom: bottomMargin, opacity: fadeAnim },
      ]}
      pointerEvents={isVoiceActive ? 'none' : 'auto'}
    >
      <View
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h !== measuredHeight) setMeasuredHeight(h);
        }}
        style={[
        styles.adContainer,
        {
          backgroundColor: colors.background,
          shadowColor: colors.text,
        },
      ]}
      >
        {showDismiss && isAdLoaded && (
          <TouchableOpacity onPress={() => setDismissed(true)} style={styles.dismissButton}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        )}
        <BannerAd
          placement="VOICE_ASSISTANT"
          size={BannerAdSize.ADAPTIVE_BANNER}
          onAdLoaded={handleAdLoaded}
          onAdFailedToLoad={handleAdError}
          style={styles.bannerAd}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  adContainer: {
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dismissButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#00000033',
    borderRadius: 10,
  },
  dismissText: {
    fontSize: 12,
    color: '#fff',
  },
  bannerAd: {
    borderTopWidth: 0, // Remove border since we have container styling
  },
});

export default VoiceAssistantBanner;
