/**
 * Interstitial Ad Service
 * Manages full-screen interstitial ads with smart timing and frequency control
 */

import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { adMobService } from './AdMobService';
import { adErrorHandler } from './AdErrorHandler';
import { adFrequencyManager } from '@/utils/adFrequencyManager';
import { voiceSessionTracker } from '@/utils/voiceSessionTracker';
import { networkMonitor } from '@/utils/networkMonitor';
import { AD_UNIT_IDS, AD_ANALYTICS_EVENTS } from '@/config/admob';

import type { AdLoadResult } from '@/types/admob';

export interface InterstitialAdState {
  isLoaded: boolean;
  isLoading: boolean;
  isShowing: boolean;
  lastLoadTime: number;
  loadAttempts: number;
  error: string | null;
}

class InterstitialAdService {
  private static instance: InterstitialAdService;
  private interstitialAd: InterstitialAd | null = null;
  private state: InterstitialAdState = {
    isLoaded: false,
    isLoading: false,
    isShowing: false,
    lastLoadTime: 0,
    loadAttempts: 0,
    error: null,
  };

  private readonly MAX_LOAD_ATTEMPTS = 3;
  private readonly PRELOAD_DELAY = 3000; // 3 seconds after app start (faster readiness)
  private readonly RELOAD_DELAY = 20000; // 20 seconds between reload attempts

  private constructor() { }

  static getInstance(): InterstitialAdService {
    if (!InterstitialAdService.instance) {
      InterstitialAdService.instance = new InterstitialAdService();
    }
    return InterstitialAdService.instance;
  }

  /**
   * Initialize the interstitial ad service
   */
  async initialize(): Promise<void> {
    if (!adMobService.isSDKInitialized()) {
      console.warn('⚠️ AdMob SDK not initialized, waiting...');
      await adMobService.initialize();
    }

    // Start preloading after a delay
    setTimeout(() => {
      this.preloadAd();
    }, this.PRELOAD_DELAY);

    console.log('✅ Interstitial Ad Service initialized');
  }

  /**
   * Preload an interstitial ad with enhanced error handling
   */
  async preloadAd(testMode: boolean = false): Promise<AdLoadResult> {
    if (this.state.isLoading || this.state.isLoaded) {
      return { success: true };
    }

    // Check network suitability first
    const networkCheck = networkMonitor.isNetworkSuitableForAds();
    if (!networkCheck.suitable) {
      console.log(`📶 Network not suitable for ads: ${networkCheck.reason}`);
      return {
        success: false,
        error: `Network issue: ${networkCheck.reason}`,
      };
    }

    if (this.state.loadAttempts >= this.MAX_LOAD_ATTEMPTS) {
      const timeSinceLastAttempt = Date.now() - this.state.lastLoadTime;
      if (timeSinceLastAttempt < this.RELOAD_DELAY) {
        return {
          success: false,
          error: 'Maximum load attempts reached, waiting for cooldown',
        };
      }
      // Reset attempts after cooldown
      this.state.loadAttempts = 0;
    }

    this.state.isLoading = true;
    this.state.error = null;
    this.state.loadAttempts += 1;

    try {
      const adUnitId = testMode ? TestIds.INTERSTITIAL : AD_UNIT_IDS.INTERSTITIAL;

      // Create new interstitial ad
      this.interstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      // Set up event listeners
      this.setupEventListeners();

      // Load the ad with timeout
      console.log('🔄 Loading interstitial ad...');
      await Promise.race([
        this.interstitialAd.load(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Ad load timeout')), 30000)
        )
      ]);

      this.state.isLoaded = true;
      this.state.isLoading = false;
      this.state.lastLoadTime = Date.now();

      // Log analytics
      adMobService.logAdEvent(AD_ANALYTICS_EVENTS.AD_LOADED, 'interstitial', {
        ad_unit_id: adUnitId,
        load_attempts: this.state.loadAttempts,
        network_type: networkMonitor.getState().type,
        network_strength: networkMonitor.getState().strength,
      });

      console.log('✅ Interstitial ad loaded successfully');
      return { success: true };

    } catch (error) {
      this.state.isLoading = false;

      // Use enhanced error handler
      const errorInfo = adErrorHandler.handleError(error, 'interstitial', testMode ? TestIds.INTERSTITIAL : AD_UNIT_IDS.INTERSTITIAL);
      this.state.error = errorInfo.userFriendlyMessage;

      console.error('❌ Failed to load interstitial ad:', error);

      // Schedule auto-retry if recommended
      if (errorInfo.shouldRetry && this.state.loadAttempts < this.MAX_LOAD_ATTEMPTS) {
        setTimeout(() => {
          if (!this.state.isLoaded && !this.state.isLoading) {
            console.log(`🔄 Auto-retrying interstitial ad (attempt ${this.state.loadAttempts + 1})`);
            this.preloadAd(testMode);
          }
        }, errorInfo.retryDelay || this.RELOAD_DELAY);
      }

      return {
        success: false,
        error: errorInfo.userFriendlyMessage,
        errorCode: errorInfo.code.toString(),
      };
    }
  }

  /**
   * Set up event listeners for the interstitial ad
   */
  private setupEventListeners(): void {
    if (!this.interstitialAd) return;

    this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      console.log('📱 Interstitial ad loaded event');
    });

    this.interstitialAd.addAdEventListener(AdEventType.OPENED, () => {
      console.log('👁️ Interstitial ad opened');
      this.state.isShowing = true;

      adMobService.logAdEvent(AD_ANALYTICS_EVENTS.AD_OPENED, 'interstitial');
    });

    this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('❌ Interstitial ad closed');
      this.state.isShowing = false;
      this.state.isLoaded = false;

      // Record that ad was shown for frequency management
      adFrequencyManager.recordInterstitialShown();
      // Reset voice-session-based session counter and randomize next threshold (2-3)
      voiceSessionTracker.onInterstitialAdShown?.();

      // Preload next ad
      setTimeout(() => {
        this.preloadAd();
      }, 2000);

      adMobService.logAdEvent(AD_ANALYTICS_EVENTS.AD_CLOSED, 'interstitial');
    });

    this.interstitialAd.addAdEventListener(AdEventType.CLICKED, () => {
      console.log('👆 Interstitial ad clicked');
      adMobService.logAdEvent(AD_ANALYTICS_EVENTS.AD_CLICKED, 'interstitial');
    });
  }

  /**
   * Show the interstitial ad if conditions are met with enhanced error handling
   */
  async showAd(): Promise<{ success: boolean; reason?: string }> {
    try {
      // Check if AdMob is initialized
      if (!adMobService.isSDKInitialized()) {
        return { success: false, reason: 'AdMob SDK not initialized' };
      }

      // Check if ads should be shown
      if (!adMobService.shouldShowAds()) {
        return { success: false, reason: 'Ads disabled by user preference' };
      }

      // Do not interrupt if TTS is speaking. Defer briefly and re-check.
      // If TTS is speaking, do not show; we'll be called again after state returns to idle


      // Check network suitability
      const networkCheck = networkMonitor.isNetworkSuitableForAds();
      if (!networkCheck.suitable) {
        return { success: false, reason: `Network issue: ${networkCheck.reason}` };
      }

      // Check if ad is loaded
      if (!this.state.isLoaded || !this.interstitialAd) {
        console.log('⚠️ Interstitial ad not loaded, attempting to load...');
        const loadResult = await this.preloadAd();
        if (!loadResult.success) {
          return { success: false, reason: loadResult.error || 'Failed to load ad' };
        }

        // Wait a moment for the ad to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (!this.state.isLoaded || !this.interstitialAd) {
          return { success: false, reason: 'Ad still not ready after loading' };
        }
      }

      // Simplified logic: do not gate by frequency/session timing here.

      // Final safety check
      if (this.state.isShowing) {
        return { success: false, reason: 'Ad is already showing' };
      }

      console.log('🎬 Showing interstitial ad...');

      // Show with timeout protection
      await Promise.race([
        this.interstitialAd!.show(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Ad show timeout')), 10000)
        )
      ]);

      adMobService.logAdEvent(AD_ANALYTICS_EVENTS.AD_IMPRESSION, 'interstitial', {
        network_type: networkMonitor.getState().type,
        network_strength: networkMonitor.getState().strength,
        load_attempts: this.state.loadAttempts,
      });

      return { success: true };

    } catch (error) {
      console.error('❌ Failed to show interstitial ad:', error);

      // Use enhanced error handler
      const errorInfo = adErrorHandler.handleError(error, 'interstitial', AD_UNIT_IDS.INTERSTITIAL);

      // Reset state if show failed
      this.state.isShowing = false;

      return { success: false, reason: errorInfo.userFriendlyMessage };
    }
  }

  /**
   * Check if an interstitial ad can be shown
   */
  canShowAd(): { canShow: boolean; reason?: string } {
    if (!adMobService.isSDKInitialized()) {
      return { canShow: false, reason: 'AdMob SDK not initialized' };
    }

    if (!adMobService.shouldShowAds()) {
      return { canShow: false, reason: 'Ads disabled' };
    }

    if (!this.state.isLoaded) {
      return { canShow: false, reason: 'Ad not loaded' };
    }

    if (this.state.isShowing) {
      return { canShow: false, reason: 'Ad already showing' };
    }

    // Simplified: if loaded and not showing, allow.

    return { canShow: true };
  }

  /**
   * Get current ad state
   */
  getState(): InterstitialAdState {
    return { ...this.state };
  }

  /**
   * Force reload the ad (for testing or recovery)
   */
  async forceReload(testMode: boolean = false): Promise<AdLoadResult> {
    this.state.isLoaded = false;
    this.state.isLoading = false;
    this.state.loadAttempts = 0;
    this.state.error = null;

    return this.preloadAd(testMode);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.interstitialAd) {
      // Remove event listeners and clean up
      this.interstitialAd = null;
    }

    this.state = {
      isLoaded: false,
      isLoading: false,
      isShowing: false,
      lastLoadTime: 0,
      loadAttempts: 0,
      error: null,
    };

    console.log('🗑️ Interstitial Ad Service destroyed');
  }
}

// Export singleton instance
export const interstitialAdService = InterstitialAdService.getInstance();
export default interstitialAdService;
