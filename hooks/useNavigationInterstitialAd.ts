/**
 * useNavigationInterstitialAd Hook
 * Manages interstitial ads during navigation events
 */

import { useEffect, useCallback, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useInterstitialAd } from './useInterstitialAd';
import { interstitialAdTiming, type AdTimingContext } from '@/utils/interstitialAdTiming';
import { voiceSessionTracker } from '@/utils/voiceSessionTracker';

interface NavigationAdConfig {
  enableTabSwitchAds: boolean;
  enableScreenNavigationAds: boolean;
  minNavigationsBeforeAd: number;
  cooldownBetweenAds: number; // milliseconds
}

const DEFAULT_CONFIG: NavigationAdConfig = {
  enableTabSwitchAds: true,
  enableScreenNavigationAds: true,
  minNavigationsBeforeAd: 3,
  cooldownBetweenAds: 120000, // 2 minutes
};

export function useNavigationInterstitialAd(config: Partial<NavigationAdConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { showAd: showInterstitialAd } = useInterstitialAd();
  const segments = useSegments();
  
  const navigationCount = useRef(0);
  const lastAdTime = useRef(0);
  const previousSegments = useRef<string[]>([]);

  /**
   * Check if enough time has passed since last ad
   */
  const isInCooldown = useCallback((): boolean => {
    const timeSinceLastAd = Date.now() - lastAdTime.current;
    return timeSinceLastAd < finalConfig.cooldownBetweenAds;
  }, [finalConfig.cooldownBetweenAds]);

  /**
   * Check if we should show an ad based on navigation
   */
  const shouldShowNavigationAd = useCallback((): boolean => {
    // Check cooldown
    if (isInCooldown()) {
      return false;
    }

    // Check minimum navigation count
    if (navigationCount.current < finalConfig.minNavigationsBeforeAd) {
      return false;
    }

    // Check if voice session is active (don't interrupt)
    const currentVoiceSession = voiceSessionTracker.getCurrentSession();
    if (currentVoiceSession) {
      return false;
    }

    return true;
  }, [finalConfig.minNavigationsBeforeAd, isInCooldown]);

  /**
   * Show interstitial ad with navigation context
   */
  const showNavigationAd = useCallback(async (
    navigationType: 'tab_switch' | 'screen_navigation'
  ) => {
    if (!shouldShowNavigationAd()) {
      return;
    }

    const context: AdTimingContext = {
      screenType: 'navigation',
      userAction: 'navigation',
    };

    const decision = interstitialAdTiming.shouldShowInterstitialAd(context);
    
    if (decision.shouldShow) {
      // Add a small delay for better UX
      setTimeout(async () => {
        const result = await showInterstitialAd();
        if (result.success) {
          lastAdTime.current = Date.now();
          navigationCount.current = 0; // Reset counter after showing ad
        }
      }, 1500); // 1.5 second delay for smooth navigation
    }
  }, [shouldShowNavigationAd, showInterstitialAd]);

  /**
   * Handle navigation changes
   */
  useEffect(() => {
    const currentSegments = segments;
    const previousSegs = previousSegments.current;

    // Skip initial load
    if (previousSegs.length === 0) {
      previousSegments.current = currentSegments;
      return;
    }

    // Check if navigation actually occurred
    const hasNavigated = JSON.stringify(currentSegments) !== JSON.stringify(previousSegs);
    
    if (hasNavigated) {
      navigationCount.current += 1;

      // Determine navigation type
      const isTabSwitch = (
        currentSegments.length === 2 && 
        previousSegs.length === 2 &&
        currentSegments[0] === '(tabs)' && 
        previousSegs[0] === '(tabs)' &&
        currentSegments[1] !== previousSegs[1]
      );

      if (isTabSwitch && finalConfig.enableTabSwitchAds) {
        showNavigationAd('tab_switch');
      } else if (!isTabSwitch && finalConfig.enableScreenNavigationAds) {
        showNavigationAd('screen_navigation');
      }

      previousSegments.current = currentSegments;
    }
  }, [segments, finalConfig.enableTabSwitchAds, finalConfig.enableScreenNavigationAds, showNavigationAd]);

  /**
   * Get navigation statistics
   */
  const getNavigationStats = useCallback(() => {
    return {
      navigationCount: navigationCount.current,
      lastAdTime: lastAdTime.current,
      timeSinceLastAd: Date.now() - lastAdTime.current,
      isInCooldown: isInCooldown(),
      canShowAd: shouldShowNavigationAd(),
    };
  }, [isInCooldown, shouldShowNavigationAd]);

  /**
   * Reset navigation tracking
   */
  const resetNavigationTracking = useCallback(() => {
    navigationCount.current = 0;
    lastAdTime.current = 0;
    previousSegments.current = [];
  }, []);

  /**
   * Force show navigation ad (for testing)
   */
  const forceShowNavigationAd = useCallback(async () => {
    const result = await showInterstitialAd();
    if (result.success) {
      lastAdTime.current = Date.now();
      navigationCount.current = 0;
    }
    return result;
  }, [showInterstitialAd]);

  return {
    getNavigationStats,
    resetNavigationTracking,
    forceShowNavigationAd,
    isInCooldown,
    shouldShowNavigationAd,
  };
}

export default useNavigationInterstitialAd;
