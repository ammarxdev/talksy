/**
 * Profile Banner Ad
 * Banner ad component optimized for profile and settings screens
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import { BannerAd } from './BannerAd';
import { useTheme } from '@/hooks/useTheme';

interface ProfileBannerProps {
  position?: 'top' | 'bottom' | 'inline';
  title?: string;
  style?: any;
  onAdLoaded?: () => void;
  onAdError?: (error: any) => void;
  showDismiss?: boolean;
  reappearAfterMs?: number;
}

export function ProfileBanner({
  position = 'bottom',
  title,
  style,
  onAdLoaded,
  onAdError,
  showDismiss = true,
  reappearAfterMs = 5 * 60 * 1000,
}: ProfileBannerProps) {
  const { colors } = useTheme();
  const [isAdVisible, setIsAdVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const dismissTimeoutRef = React.useRef<any>(null);

  // Handle ad loaded
  const handleAdLoaded = useCallback(() => {
    setIsAdVisible(true);
    onAdLoaded?.();
  }, [onAdLoaded]);

  // Handle ad error
  const handleAdError = useCallback((error: any) => {
    setIsAdVisible(false);
    onAdError?.(error);
  }, [onAdError]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  // Re-show after a delay when dismissed
  React.useEffect(() => {
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
    <View style={[
      styles.container,
      position === 'top' && styles.topContainer,
      position === 'bottom' && styles.bottomContainer,
      position === 'inline' && styles.inlineContainer,
      style,
    ]}>
      {title && isAdVisible && (
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          {title}
        </Text>
      )}

      <View style={[
        styles.adWrapper,
        {
          backgroundColor: colors.cardBackground || colors.background,
          borderColor: colors.border,
        },
      ]}>
        {showDismiss && (
          <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        )}
        <BannerAd
          placement="PROFILE"
          size={BannerAdSize.ADAPTIVE_BANNER}
          onAdLoaded={handleAdLoaded}
          onAdFailedToLoad={handleAdError}
          style={styles.bannerAd}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  topContainer: {
    marginBottom: 16,
  },
  bottomContainer: {
    marginTop: 16,
  },
  inlineContainer: {
    marginVertical: 12,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    position: 'relative',
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
    borderTopWidth: 0,
  },
});

export default ProfileBanner;
