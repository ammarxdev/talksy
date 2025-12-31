/**
 * useAdMob Hook
 * React hook for managing AdMob functionality in components
 */

import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { adMobService, type AdMobInitializationResult } from '@/services/AdMobService';
import { adFrequencyManager } from '@/utils/adFrequencyManager';
import { AD_ANALYTICS_EVENTS } from '@/config/admob';

export interface UseAdMobResult {
  // Initialization state
  isInitialized: boolean;
  isInitializing: boolean;
  initializationError: string | null;
  
  // Ad control functions
  initialize: () => Promise<void>;
  canShowInterstitial: () => boolean;
  recordInteraction: () => void;
  recordAdShown: (adType: string) => void;
  
  // Utility functions
  shouldShowAds: () => boolean;
  getAdStats: () => any;
  resetAdData: () => void;
}

export function useAdMob(): UseAdMobResult {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  /**
   * Initialize AdMob SDK
   */
  const initialize = useCallback(async () => {
    if (isInitialized || isInitializing) {
      return;
    }

    setIsInitializing(true);
    setInitializationError(null);

    try {
      console.log('🚀 Starting AdMob initialization...');
      const result: AdMobInitializationResult = await adMobService.initialize();

      if (result.success) {
        setIsInitialized(true);
        console.log('✅ AdMob initialized successfully');
      } else {
        setInitializationError(result.error || 'Unknown initialization error');
        console.error('❌ AdMob initialization failed:', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
      setInitializationError(errorMessage);
      console.error('❌ AdMob initialization error:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [isInitialized, isInitializing]);

  /**
   * Check if interstitial ad can be shown
   */
  const canShowInterstitial = useCallback((): boolean => {
    if (!isInitialized) {
      return false;
    }

    const timingResult = adFrequencyManager.canShowInterstitial();
    return timingResult.canShow;
  }, [isInitialized]);

  /**
   * Record user interaction for ad frequency management
   */
  const recordInteraction = useCallback(() => {
    adFrequencyManager.recordUserInteraction();
  }, []);

  /**
   * Record that an ad was shown
   */
  const recordAdShown = useCallback((adType: string) => {
    if (adType === 'interstitial') {
      adFrequencyManager.recordInterstitialShown();
    }
    
    // Log analytics event
    adMobService.logAdEvent(AD_ANALYTICS_EVENTS.AD_IMPRESSION, adType);
  }, []);

  /**
   * Check if ads should be shown
   */
  const shouldShowAds = useCallback((): boolean => {
    return adMobService.shouldShowAds();
  }, []);

  /**
   * Get ad frequency statistics
   */
  const getAdStats = useCallback(() => {
    return adFrequencyManager.getStats();
  }, []);

  /**
   * Reset ad frequency data
   */
  const resetAdData = useCallback(() => {
    adFrequencyManager.resetAllData();
  }, []);

  /**
   * Handle app state changes
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App became active - reset session if needed
        adFrequencyManager.resetSession();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  /**
   * Auto-initialize on mount
   */
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    isInitialized,
    isInitializing,
    initializationError,
    initialize,
    canShowInterstitial,
    recordInteraction,
    recordAdShown,
    shouldShowAds,
    getAdStats,
    resetAdData,
  };
}

export default useAdMob;
