/**
 * Banner Ad Component
 * Reusable banner ad component with loading states and error handling
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  ActivityIndicator,
  TouchableOpacity,
  Platform 
} from 'react-native';
import { BannerAd as RNBannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useTheme } from '@/hooks/useTheme';
import { useAdMob } from '@/hooks/useAdMob';
import { AD_UNIT_IDS, AD_PLACEMENTS, type AdPlacement } from '@/config/admob';
import { adMobService } from '@/services/AdMobService';
import { AD_ANALYTICS_EVENTS } from '@/config/admob';
import type { BannerAdProps, AdError } from '@/types/admob';

const { width: screenWidth } = Dimensions.get('window');

interface TalksyBannerAdProps {
  placement: AdPlacement;
  size?: BannerAdSize;
  style?: any;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: AdError) => void;
  onAdOpened?: () => void;
  onAdClosed?: () => void;
  testMode?: boolean;
}

export function BannerAd({
  placement,
  size = BannerAdSize.ADAPTIVE_BANNER,
  style,
  onAdLoaded,
  onAdFailedToLoad,
  onAdOpened,
  onAdClosed,
  testMode = false,
}: TalksyBannerAdProps) {
  const { colors } = useTheme();
  const { isInitialized, shouldShowAds } = useAdMob();
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Get placement configuration
  const placementConfig = AD_PLACEMENTS[placement];
  const bannerConfig = placementConfig?.banner;

  // Determine ad unit ID
  const getAdUnitId = useCallback(() => {
    if (testMode) {
      return TestIds.BANNER;
    }
    return AD_UNIT_IDS.BANNER;
  }, [testMode]);

  // Handle ad loaded
  const handleAdLoaded = useCallback(() => {
    console.log('✅ Banner ad loaded successfully');
    setIsLoading(false);
    setHasError(false);
    setIsVisible(true);
    retryCountRef.current = 0;
    
    // Log analytics
    adMobService.logAdEvent(AD_ANALYTICS_EVENTS.AD_LOADED, 'banner', {
      placement,
      ad_unit_id: getAdUnitId(),
    });
    
    onAdLoaded?.();
  }, [placement, getAdUnitId, onAdLoaded]);

  // Handle ad load failure
  const handleAdFailedToLoad = useCallback((error: any) => {
    console.error('❌ Banner ad failed to load:', error);
    
    const adError = adMobService.handleAdError(error, 'banner');
    setIsLoading(false);
    setHasError(true);
    setErrorMessage(adError.error || 'Failed to load ad');
    setIsVisible(false);
    
    // Log analytics
    adMobService.logAdEvent(AD_ANALYTICS_EVENTS.AD_FAILED_TO_LOAD, 'banner', {
      placement,
      ad_unit_id: getAdUnitId(),
      error_code: adError.errorCode,
      error_message: adError.error,
      retry_count: retryCountRef.current,
    });
    
    // Map string error codes (e.g., 'googleMobileAds/error-code-no-fill') to numeric for consumers expecting numbers
    const mapErrorCodeToNumber = (code?: string): number => {
      if (!code) return -1;
      const numeric = Number(code);
      if (Number.isFinite(numeric)) return numeric as number;
      const normalized = code.toLowerCase();
      if (normalized.includes('no-fill')) return 3; // ERROR_CODE_NO_FILL
      if (normalized.includes('network')) return 2; // ERROR_CODE_NETWORK_ERROR
      if (normalized.includes('invalid') || normalized.includes('request')) return 1; // ERROR_CODE_INVALID_REQUEST
      if (normalized.includes('internal')) return 0; // ERROR_CODE_INTERNAL_ERROR
      return -1; // Unknown
    };

    onAdFailedToLoad?.({
      code: mapErrorCodeToNumber(adError.errorCode),
      message: adError.error || 'Unknown error',
    });
  }, [placement, getAdUnitId, onAdFailedToLoad]);

  // Handle ad opened
  const handleAdOpened = useCallback(() => {
    console.log('👆 Banner ad opened');
    
    // Log analytics
    adMobService.logAdEvent(AD_ANALYTICS_EVENTS.AD_OPENED, 'banner', {
      placement,
      ad_unit_id: getAdUnitId(),
    });
    
    onAdOpened?.();
  }, [placement, getAdUnitId, onAdOpened]);

  // Handle ad closed
  const handleAdClosed = useCallback(() => {
    console.log('❌ Banner ad closed');
    
    // Log analytics
    adMobService.logAdEvent(AD_ANALYTICS_EVENTS.AD_CLOSED, 'banner', {
      placement,
      ad_unit_id: getAdUnitId(),
    });
    
    onAdClosed?.();
  }, [placement, getAdUnitId, onAdClosed]);

  // Retry loading ad
  const retryLoadAd = useCallback(() => {
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current += 1;
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');
      console.log(`🔄 Retrying banner ad load (attempt ${retryCountRef.current}/${maxRetries})`);
    }
  }, []);

  // Check if banner should be shown
  const shouldShowBanner = useCallback(() => {
    return (
      isInitialized &&
      shouldShowAds() &&
      bannerConfig?.enabled &&
      !hasError
    );
  }, [isInitialized, shouldShowAds, bannerConfig?.enabled, hasError]);

  // Reset state when placement changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    setIsVisible(false);
    retryCountRef.current = 0;
  }, [placement]);

  // Don't render if conditions aren't met
  if (!shouldShowBanner()) {
    return null;
  }

  // Calculate container height based on ad size
  const getContainerHeight = () => {
    switch (size) {
      case BannerAdSize.BANNER:
        return 50;
      case BannerAdSize.LARGE_BANNER:
        return 100;
      case BannerAdSize.MEDIUM_RECTANGLE:
        return 250;
      case BannerAdSize.FULL_BANNER:
        return 60;
      case BannerAdSize.LEADERBOARD:
        return 90;
      case BannerAdSize.ADAPTIVE_BANNER:
        return Platform.OS === 'ios' ? 50 : 60;
      default:
        return 50;
    }
  };

  const containerHeight = getContainerHeight();

  return (
    <View style={[
      styles.container,
      {
        height: containerHeight,
        backgroundColor: colors.background,
        borderTopColor: colors.border,
      },
      style,
    ]}>
      {isLoading && (
        <View style={[styles.loadingContainer, { height: containerHeight }]}>
          <ActivityIndicator size="small" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading ad...
          </Text>
        </View>
      )}

      {hasError && (
        <View style={[styles.errorContainer, { height: containerHeight }]}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {errorMessage}
          </Text>
          {retryCountRef.current < maxRetries && (
            <TouchableOpacity
              style={[styles.retryButton, { borderColor: colors.tint }]}
              onPress={retryLoadAd}
            >
              <Text style={[styles.retryText, { color: colors.tint }]}>
                Retry
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {shouldShowBanner() && (
        <RNBannerAd
          unitId={getAdUnitId()}
          size={size}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdLoaded={handleAdLoaded}
          onAdFailedToLoad={handleAdFailedToLoad}
          onAdOpened={handleAdOpened}
          onAdClosed={handleAdClosed}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
    flex: 1,
  },
  retryButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 4,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default BannerAd;
