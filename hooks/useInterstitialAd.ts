/**
 * useInterstitialAd Hook
 * React hook for managing interstitial ads in components
 */

import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { interstitialAdService, type InterstitialAdState } from '@/services/InterstitialAdService';
import { textToSpeechService } from '@/services/TextToSpeechService';
import { adFrequencyManager } from '@/utils/adFrequencyManager';
import { voiceSessionTracker } from '@/utils/voiceSessionTracker';

export interface UseInterstitialAdResult {
  // Ad state
  adState: InterstitialAdState;
  
  // Control functions
  showAd: () => Promise<{ success: boolean; reason?: string }>;
  preloadAd: (testMode?: boolean) => Promise<void>;
  canShowAd: () => { canShow: boolean; reason?: string };
  
  // Utility functions
  getTimeUntilNextAd: () => number;
  getAdStats: () => any;
  forceReload: (testMode?: boolean) => Promise<void>;
}

export function useInterstitialAd(): UseInterstitialAdResult {
  const [adState, setAdState] = useState<InterstitialAdState>(
    interstitialAdService.getState()
  );

  /**
   * Update ad state from service
   */
  const updateAdState = useCallback(() => {
    setAdState(interstitialAdService.getState());
  }, []);

  /**
   * Show interstitial ad
   */
  const showAd = useCallback(async (): Promise<{ success: boolean; reason?: string }> => {
    // Avoid showing if TTS is still speaking
    if (textToSpeechService.getSpeechStatus().isSpeaking) {
      return { success: false, reason: 'Assistant speaking' };
    }
    const result = await interstitialAdService.showAd();
    updateAdState();
    
    if (result.success) {
      console.log('✅ Interstitial ad shown successfully');
    } else {
      console.log('⚠️ Interstitial ad not shown:', result.reason);
    }
    
    return result;
  }, [updateAdState]);

  /**
   * Preload interstitial ad
   */
  const preloadAd = useCallback(async (testMode: boolean = false): Promise<void> => {
    await interstitialAdService.preloadAd(testMode);
    updateAdState();
  }, [updateAdState]);

  /**
   * Check if ad can be shown
   */
  const canShowAd = useCallback((): { canShow: boolean; reason?: string } => {
    return interstitialAdService.canShowAd();
  }, []);

  /**
   * Get time until next ad can be shown
   */
  const getTimeUntilNextAd = useCallback((): number => {
    return adFrequencyManager.getTimeUntilNextInterstitial();
  }, []);

  /**
   * Get ad frequency statistics
   */
  const getAdStats = useCallback(() => {
    return {
      frequency: adFrequencyManager.getStats(),
      voiceSession: voiceSessionTracker.getSessionStats(),
      adState: adState,
    };
  }, [adState]);

  /**
   * Force reload ad
   */
  const forceReload = useCallback(async (testMode: boolean = false): Promise<void> => {
    await interstitialAdService.forceReload(testMode);
    updateAdState();
  }, [updateAdState]);

  /**
   * Initialize service and set up state updates
   */
  useEffect(() => {
    // Initialize the service
    interstitialAdService.initialize();

    // Set up periodic state updates
    const interval = setInterval(updateAdState, 5000); // Update every 5 seconds

    return () => {
      clearInterval(interval);
    };
  }, [updateAdState]);

  /**
   * Handle app state changes
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App became active - update state and potentially preload
        updateAdState();
        
        // Preload if not loaded and not loading
        const currentState = interstitialAdService.getState();
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
}

export default useInterstitialAd;
