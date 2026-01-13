/**
 * Rewarded Ad Service
 * Handles Google AdMob Rewarded Video Ads implementation
 */

import { RewardedAd, AdEventType, RewardedAdEventType } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS, AD_ERROR_MESSAGES } from '@/config/admob';
import { adErrorHandler } from './AdErrorHandler';
import { adMobService } from './AdMobService';
import { adFrequencyManager } from '@/utils/adFrequencyManager';
import { networkMonitor } from '@/utils/networkMonitor';

export interface RewardedAdState {
  isLoaded: boolean;
  isLoading: boolean;
  isShowing: boolean;
  lastLoadTime: number;
  loadAttempts: number;
  error: string | null;
}

export interface AdLoadResult {
  success: boolean;
  error?: string;
  errorCode?: string;
}

export interface RewardedAdReward {
  type: string;
  amount: number;
}

class RewardedAdService {
  private static instance: RewardedAdService;
  private rewardedAd: RewardedAd | null = null;
  private state: RewardedAdState = {
    isLoaded: false,
    isLoading: false,
    isShowing: false,
    lastLoadTime: 0,
    loadAttempts: 0,
    error: null,
  };

  private readonly MAX_LOAD_ATTEMPTS = 3;
  private readonly PRELOAD_DELAY = 3000; // 3 seconds after app start
  private readonly RELOAD_DELAY = 20000; // 20 seconds between reload attempts

  private onUserEarnedRewardCallback: ((reward: RewardedAdReward) => void) | null = null;
  private onAdClosedCallback: (() => void) | null = null;

  private constructor() { }

  static getInstance(): RewardedAdService {
    if (!RewardedAdService.instance) {
      RewardedAdService.instance = new RewardedAdService();
    }
    return RewardedAdService.instance;
  }

  /**
   * Initialize the rewarded ad service
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

    console.log('✅ Rewarded Ad Service initialized');
  }

  /**
   * Preload a rewarded ad with enhanced error handling
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
      const adUnitId = testMode ? 'ca-app-pub-3940256099942544/1712485313' : AD_UNIT_IDS.REWARDED;

      // Create new rewarded ad
      this.rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      // Set up event listeners
      this.setupEventListeners();

      // Load the ad with timeout
      console.log('🔄 Loading rewarded ad...');
      await Promise.race([
        this.rewardedAd.load(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Ad load timeout')), 30000)
        )
      ]);

      this.state.isLoaded = true;
      this.state.isLoading = false;
      this.state.lastLoadTime = Date.now();

      // Log analytics
      adMobService.logAdEvent('ad_loaded', 'rewarded', {
        ad_unit_id: adUnitId,
        load_attempts: this.state.loadAttempts,
        network_type: networkMonitor.getState().type,
        network_strength: networkMonitor.getState().strength,
      });

      console.log('✅ Rewarded ad loaded successfully');
      return { success: true };

    } catch (error) {
      this.state.isLoading = false;

      // Use enhanced error handler
      const errorInfo = adErrorHandler.handleError(error, 'rewarded', testMode ? 'ca-app-pub-3940256099942544/1712485313' : AD_UNIT_IDS.REWARDED);
      this.state.error = errorInfo.userFriendlyMessage;

      console.error('❌ Failed to load rewarded ad:', error);

      // Schedule auto-retry if recommended
      if (errorInfo.shouldRetry && this.state.loadAttempts < this.MAX_LOAD_ATTEMPTS) {
        setTimeout(() => {
          if (!this.state.isLoaded && !this.state.isLoading) {
            console.log(`🔄 Auto-retrying rewarded ad (attempt ${this.state.loadAttempts + 1})`);
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
   * Set up event listeners for the rewarded ad
   */
  private setupEventListeners(): void {
    if (!this.rewardedAd) return;

    this.rewardedAd.addAdEventListener(AdEventType.LOADED, () => {
      console.log('📱 Rewarded ad loaded event');
    });

    this.rewardedAd.addAdEventListener(AdEventType.OPENED, () => {
      console.log('👁️ Rewarded ad opened');
      this.state.isShowing = true;

      adMobService.logAdEvent('ad_opened', 'rewarded');
    });

    this.rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('❌ Rewarded ad closed');
      this.state.isShowing = false;
      this.state.isLoaded = false;

      // Record that ad was shown for frequency management
      adFrequencyManager.recordInterstitialShown(); // Using same counter for rewarded ads

      // Preload next ad
      setTimeout(() => {
        this.preloadAd();
      }, 2000);

      // Call the closed callback if available
      if (this.onAdClosedCallback) {
        this.onAdClosedCallback();
      }

      adMobService.logAdEvent('ad_closed', 'rewarded');
    });

    this.rewardedAd.addAdEventListener(AdEventType.CLICKED, () => {
      console.log('👆 Rewarded ad clicked');
      adMobService.logAdEvent('ad_clicked', 'rewarded');
    });

    this.rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (rewardInfo) => {
      console.log('💰 User earned reward:', rewardInfo);
      
      // Call the reward callback if available
      if (this.onUserEarnedRewardCallback) {
        this.onUserEarnedRewardCallback(rewardInfo as RewardedAdReward);
      }

      adMobService.logAdEvent('ad_rewarded', 'rewarded', {
        reward_type: rewardInfo.type,
        reward_amount: rewardInfo.amount,
      });
    });
  }

  /**
   * Show the rewarded ad if conditions are met with enhanced error handling
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

      // Check network suitability
      const networkCheck = networkMonitor.isNetworkSuitableForAds();
      if (!networkCheck.suitable) {
        return { success: false, reason: `Network issue: ${networkCheck.reason}` };
      }

      // Check if ad is loaded
      if (!this.state.isLoaded || !this.rewardedAd) {
        console.log('⚠️ Rewarded ad not loaded, attempting to load...');
        const loadResult = await this.preloadAd();
        if (!loadResult.success) {
          return { success: false, reason: loadResult.error || 'Failed to load ad' };
        }

        // Wait a moment for the ad to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (!this.state.isLoaded || !this.rewardedAd) {
          return { success: false, reason: 'Ad still not ready after loading' };
        }
      }

      // Final safety check
      if (this.state.isShowing) {
        return { success: false, reason: 'Ad is already showing' };
      }

      console.log('🎬 Showing rewarded ad...');

      // Show with timeout protection
      await Promise.race([
        this.rewardedAd!.show(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Ad show timeout')), 10000)
        )
      ]);

      adMobService.logAdEvent('ad_impression', 'rewarded', {
        network_type: networkMonitor.getState().type,
        network_strength: networkMonitor.getState().strength,
        load_attempts: this.state.loadAttempts,
      });

      return { success: true };

    } catch (error) {
      console.error('❌ Failed to show rewarded ad:', error);

      // Use enhanced error handler
      const errorInfo = adErrorHandler.handleError(error, 'rewarded', AD_UNIT_IDS.REWARDED);

      // Reset state if show failed
      this.state.isShowing = false;

      return { success: false, reason: errorInfo.userFriendlyMessage };
    }
  }

  /**
   * Check if a rewarded ad can be shown
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

    return { canShow: true };
  }

  /**
   * Get current ad state
   */
  getState(): RewardedAdState {
    return { ...this.state };
  }

  /**
   * Set callback for when user earns reward
   */
  setOnUserEarnedReward(callback: (reward: RewardedAdReward) => void): void {
    this.onUserEarnedRewardCallback = callback;
  }

  /**
   * Set callback for when ad is closed
   */
  setOnAdClosed(callback: () => void): void {
    this.onAdClosedCallback = callback;
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
    if (this.rewardedAd) {
      // Remove event listeners and clean up
      this.rewardedAd = null;
    }

    this.state = {
      isLoaded: false,
      isLoading: false,
      isShowing: false,
      lastLoadTime: 0,
      loadAttempts: 0,
      error: null,
    };

    console.log('🗑️ Rewarded Ad Service destroyed');
  }
}

// Export singleton instance
export const rewardedAdService = RewardedAdService.getInstance();
export default rewardedAdService;