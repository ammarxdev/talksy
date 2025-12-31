/**
 * Resilient Banner Ad Component
 * Enhanced banner ad with comprehensive error handling and fallbacks
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { BannerAd as GoogleBannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useTheme } from '@/hooks/useTheme';
import { adErrorHandler } from '@/services/AdErrorHandler';
import { networkMonitor } from '@/utils/networkMonitor';
import { AD_UNIT_IDS } from '@/config/admob';
import type { AdLoadResult } from '@/types/admob';

export interface ResilientBannerAdProps {
  placement: string;
  size?: BannerAdSize;
  testMode?: boolean;
  maxRetryAttempts?: number;
  retryDelay?: number;
  showErrorUI?: boolean;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: any) => void;
  onRetrySuccess?: () => void;
  style?: any;
}

type AdState = 'loading' | 'loaded' | 'error' | 'retrying' | 'disabled';

export function ResilientBannerAd({
  placement,
  size = BannerAdSize.BANNER,
  testMode = false,
  maxRetryAttempts = 3,
  retryDelay = 5000,
  showErrorUI = true,
  onAdLoaded,
  onAdFailedToLoad,
  onRetrySuccess,
  style,
}: ResilientBannerAdProps) {
  const { colors } = useTheme();
  const [adState, setAdState] = useState<AdState>('loading');
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [networkSuitable, setNetworkSuitable] = useState(true);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const retryTimeoutRef = useRef<any>(null);

  // Get ad unit ID
  const getAdUnitId = useCallback(() => {
    if (testMode) {
      return TestIds.BANNER;
    }

    // For now, use the same banner ad unit ID for all placements
    // In production, you can create separate ad units for different placements
    return AD_UNIT_IDS.BANNER;
  }, [testMode]);

  /**
   * Handle ad load success
   */
  const handleAdLoaded = useCallback(() => {
    console.log(`✅ Resilient banner ad loaded: ${placement}`);
    setAdState('loaded');
    setRetryAttempts(0);
    setErrorMessage('');
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    onAdLoaded?.();
  }, [placement, fadeAnim, onAdLoaded]);

  /**
   * Handle ad load failure with smart retry logic
   */
  const handleAdFailedToLoad = useCallback((error: any) => {
    const errorInfo = adErrorHandler.handleError(error, 'banner', getAdUnitId(), placement);
    
    console.log(`❌ Resilient banner ad failed: ${placement} - ${errorInfo.userFriendlyMessage}`);
    
    setErrorMessage(errorInfo.userFriendlyMessage);
    onAdFailedToLoad?.(error);

    // Check if we should retry
    if (errorInfo.shouldRetry && retryAttempts < maxRetryAttempts) {
      setAdState('retrying');
      
      // Clear any existing retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      // Schedule retry
      retryTimeoutRef.current = setTimeout(() => {
        console.log(`🔄 Retrying banner ad: ${placement} (attempt ${retryAttempts + 1}/${maxRetryAttempts})`);
        setRetryAttempts(prev => prev + 1);
        setAdState('loading');
      }, errorInfo.retryDelay || retryDelay);
    } else {
      // No more retries or shouldn't retry
      setAdState('error');
      
      if (retryAttempts >= maxRetryAttempts) {
        console.log(`⚠️ Banner ad max retries reached: ${placement}`);
      } else {
        console.log(`⚠️ Banner ad retry not recommended: ${placement} - ${errorInfo.message}`);
      }
    }
  }, [placement, getAdUnitId, retryAttempts, maxRetryAttempts, retryDelay, onAdFailedToLoad]);

  /**
   * Manual retry function
   */
  const handleManualRetry = useCallback(() => {
    console.log(`🔄 Manual retry for banner ad: ${placement}`);
    setRetryAttempts(0);
    setAdState('loading');
    setErrorMessage('');
  }, [placement]);

  /**
   * Check network suitability for ads
   */
  useEffect(() => {
    const checkNetwork = () => {
      const suitability = networkMonitor.isNetworkSuitableForAds();
      
      setNetworkSuitable(suitability.suitable);
      
      if (!suitability.suitable && adState === 'loading') {
        setAdState('error');
        setErrorMessage(suitability.reason);
      }
    };

    // Initial check
    checkNetwork();

    // Subscribe to network changes
    const unsubscribe = networkMonitor.addListener(checkNetwork);

    return unsubscribe;
  }, [adState]);

  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Reset state when key props change
   */
  useEffect(() => {
    setAdState('loading');
    setRetryAttempts(0);
    setErrorMessage('');
    fadeAnim.setValue(0);
  }, [placement, testMode, fadeAnim]);

  // Don't render anything if network is not suitable and we're not showing error UI
  if (!networkSuitable && !showErrorUI) {
    return null;
  }

  // Render error state
  if (adState === 'error' && showErrorUI) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.cardBackground || colors.background }, style]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {errorMessage || 'Unable to load advertisement'}
        </Text>
        {retryAttempts < maxRetryAttempts && (
          <TouchableOpacity
            style={[styles.retryButton, { borderColor: colors.tint }]}
            onPress={handleManualRetry}
          >
            <Text style={[styles.retryButtonText, { color: colors.tint }]}>
              Retry
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Render loading state
  if (adState === 'loading' || adState === 'retrying') {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.cardBackground || colors.background }, style]}>
        <ActivityIndicator size="small" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {adState === 'retrying' ? `Retrying... (${retryAttempts}/${maxRetryAttempts})` : 'Loading ad...'}
        </Text>
      </View>
    );
  }

  // Render disabled state (network not suitable)
  if (!networkSuitable) {
    return null;
  }

  // Render actual ad
  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      <GoogleBannerAd
        unitId={getAdUnitId()}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailedToLoad}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    fontSize: 12,
    marginLeft: 8,
  },
});

export default ResilientBannerAd;
