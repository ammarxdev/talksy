/**
 * useRewardedAd Hook
 * Custom hook for managing rewarded video ads
 */

import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { rewardedAdService } from '@/services/RewardedAdService';
import { adFrequencyManager } from '@/utils/adFrequencyManager';
import { networkMonitor } from '@/utils/networkMonitor';

export interface UseRewardedAdResult {
  // Ad state
  adState: {
    isLoaded: boolean;
    isLoading: boolean;
    isShowing: boolean;
    error: string | null;
  };

  // Control functions
  showAd: () => Promise<{ success: boolean; reason?: string }>;
  preloadAd: (testMode?: boolean) => Promise<void>;
  canShowAd: () => { canShow: boolean; reason?: string };

  // Utility functions
  getTimeUntilNextAd: () => number;
  getAdStats: () => any;
  forceReload: (testMode?: boolean) => Promise<void>;
}

export const useRewardedAd = (): UseRewardedAdResult => {
  const [adState, setAdState] = useState(() => rewardedAdService.getState());

  // Update local state when service state changes
  const updateAdState = useCallback(() => {
    setAdState(rewardedAdService.getState());
  }, []);

  // Preload ad with error handling
  const preloadAd = useCallback(async (testMode: boolean = false): Promise<void> => {
    try {
      await rewardedAdService.preloadAd(testMode);
      updateAdState();
    } catch (error) {
      console.error('Error preloading rewarded ad:', error);
    }
  }, [updateAdState]);

  // Show ad
  const showAd = useCallback(async (): Promise<{ success: boolean; reason?: string }> => {
    const result = await rewardedAdService.showAd();
    updateAdState();
    return result;
  }, [updateAdState]);

  // Check if ad can be shown
  const canShowAd = useCallback((): { canShow: boolean; reason?: string } => {
    return rewardedAdService.canShowAd();
  }, []);

  // Get time until next ad can be shown (based on frequency management)
  const getTimeUntilNextAd = useCallback((): number => {
    return adFrequencyManager.getTimeUntilNextInterstitial();
  }, []);

  // Get ad frequency statistics
  const getAdStats = useCallback(() => {
    return {
      frequency: adFrequencyManager.getStats(),
      adState: adState,
      networkState: networkMonitor.getState(),
    };
  }, [adState]);

  // Force reload ad
  const forceReload = useCallback(async (testMode: boolean = false): Promise<void> => {
    await rewardedAdService.forceReload(testMode);
    updateAdState();
  }, [updateAdState]);

  // Initialize service and set up state updates
  useEffect(() => {
    // Initialize the service
    rewardedAdService.initialize();

    // Set up periodic state updates
    const interval = setInterval(updateAdState, 5000); // Update every 5 seconds

    return () => {
      clearInterval(interval);
    };
  }, [updateAdState]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App became active - update state and potentially preload
        updateAdState();

        // Preload if not loaded and not loading
        const currentState = rewardedAdService.getState();
        if (!currentState.isLoaded && !currentState.isLoading) {
          setTimeout(() => {
            preloadAd();
          }, 2000); // Wait 2 seconds after app becomes active
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [updateAdState, preloadAd]);

  return {
    adState,
    showAd,
    preloadAd,
    canShowAd,
    getTimeUntilNextAd,
    getAdStats,
    forceReload,
  };
};

export default useRewardedAd;