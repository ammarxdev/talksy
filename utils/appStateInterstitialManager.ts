/**
 * App State Interstitial Manager
 * Manages interstitial ads based on app state changes (background/foreground)
 */

import { AppState, AppStateStatus } from 'react-native';
import { interstitialAdService } from '@/services/InterstitialAdService';
import { interstitialAdTiming, type AdTimingContext } from './interstitialAdTiming';
import { voiceSessionTracker } from './voiceSessionTracker';

interface AppStateAdConfig {
  showOnAppResume: boolean;
  minBackgroundTime: number; // milliseconds
  maxAdsPerSession: number;
  cooldownBetweenAds: number; // milliseconds
}

class AppStateInterstitialManager {
  private static instance: AppStateInterstitialManager;
  private appStateSubscription: any = null;
  private backgroundTime: number = 0;
  private adsShownThisSession: number = 0;
  private lastAdTime: number = 0;
  private sessionStartTime: number = Date.now();

  private config: AppStateAdConfig = {
    showOnAppResume: true,
    minBackgroundTime: 30000, // 30 seconds
    maxAdsPerSession: 3,
    cooldownBetweenAds: 180000, // 3 minutes
  };

  private constructor() {}

  static getInstance(): AppStateInterstitialManager {
    if (!AppStateInterstitialManager.instance) {
      AppStateInterstitialManager.instance = new AppStateInterstitialManager();
    }
    return AppStateInterstitialManager.instance;
  }

  /**
   * Initialize the app state manager
   */
  initialize(config?: Partial<AppStateAdConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Set up app state listener
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    
    console.log('✅ App State Interstitial Manager initialized');
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    const now = Date.now();

    switch (nextAppState) {
      case 'background':
        this.backgroundTime = now;
        console.log('📱 App went to background');
        break;

      case 'active':
        if (this.backgroundTime > 0) {
          const timeInBackground = now - this.backgroundTime;
          console.log(`📱 App returned to foreground after ${Math.round(timeInBackground / 1000)}s`);
          
          // Check if we should show an ad on resume
          if (this.shouldShowResumeAd(timeInBackground)) {
            this.showResumeAd();
          }
        }
        this.backgroundTime = 0;
        break;

      case 'inactive':
        // iOS specific - app is transitioning
        console.log('📱 App became inactive');
        break;
    }
  };

  /**
   * Check if we should show an ad when app resumes
   */
  private shouldShowResumeAd(timeInBackground: number): boolean {
    // Check if feature is enabled
    if (!this.config.showOnAppResume) {
      return false;
    }

    // Check minimum background time
    if (timeInBackground < this.config.minBackgroundTime) {
      console.log(`⏭️ Background time too short: ${Math.round(timeInBackground / 1000)}s < ${Math.round(this.config.minBackgroundTime / 1000)}s`);
      return false;
    }

    // Check session ad limit
    if (this.adsShownThisSession >= this.config.maxAdsPerSession) {
      console.log(`⏭️ Session ad limit reached: ${this.adsShownThisSession}/${this.config.maxAdsPerSession}`);
      return false;
    }

    // Check cooldown
    const timeSinceLastAd = Date.now() - this.lastAdTime;
    if (timeSinceLastAd < this.config.cooldownBetweenAds) {
      console.log(`⏭️ Ad cooldown active: ${Math.round(timeSinceLastAd / 1000)}s < ${Math.round(this.config.cooldownBetweenAds / 1000)}s`);
      return false;
    }

    // Check if voice session is active
    const currentVoiceSession = voiceSessionTracker.getCurrentSession();
    if (currentVoiceSession) {
      console.log('⏭️ Voice session active, skipping resume ad');
      return false;
    }

    return true;
  }

  /**
   * Show interstitial ad on app resume
   */
  private async showResumeAd(): Promise<void> {
    const context: AdTimingContext = {
      screenType: 'navigation',
      userAction: 'app_background',
    };

    const decision = interstitialAdTiming.shouldShowInterstitialAd(context);
    
    if (decision.shouldShow) {
      console.log(`🎬 Showing app resume interstitial ad: ${decision.reason}`);
      
      // Add delay for better UX (let app fully load)
      setTimeout(async () => {
        try {
          const result = await interstitialAdService.showAd();
          
          if (result.success) {
            this.adsShownThisSession += 1;
            this.lastAdTime = Date.now();
            console.log(`✅ App resume ad shown (${this.adsShownThisSession}/${this.config.maxAdsPerSession} this session)`);
          } else {
            console.log(`⚠️ App resume ad not shown: ${result.reason}`);
          }
        } catch (error) {
          console.error('❌ Error showing app resume ad:', error);
        }
      }, 2000); // 2 second delay
    } else {
      console.log(`⏭️ Skipping app resume ad: ${decision.reason}`);
    }
  }

  /**
   * Get current session statistics
   */
  getSessionStats(): {
    sessionDuration: number;
    adsShownThisSession: number;
    maxAdsPerSession: number;
    lastAdTime: number;
    timeSinceLastAd: number;
    backgroundTime: number;
  } {
    return {
      sessionDuration: Date.now() - this.sessionStartTime,
      adsShownThisSession: this.adsShownThisSession,
      maxAdsPerSession: this.config.maxAdsPerSession,
      lastAdTime: this.lastAdTime,
      timeSinceLastAd: Date.now() - this.lastAdTime,
      backgroundTime: this.backgroundTime,
    };
  }

  /**
   * Reset session data
   */
  resetSession(): void {
    this.adsShownThisSession = 0;
    this.lastAdTime = 0;
    this.sessionStartTime = Date.now();
    this.backgroundTime = 0;
    console.log('🔄 App state ad session reset');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AppStateAdConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ App state ad config updated:', this.config);
  }

  /**
   * Manually trigger a resume ad (for testing)
   */
  async triggerResumeAd(): Promise<{ success: boolean; reason?: string }> {
    try {
      const result = await interstitialAdService.showAd();
      if (result.success) {
        this.adsShownThisSession += 1;
        this.lastAdTime = Date.now();
      }
      return result;
    } catch (error) {
      return { success: false, reason: `Error: ${error}` };
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    console.log('🗑️ App State Interstitial Manager destroyed');
  }
}

// Export singleton instance
export const appStateInterstitialManager = AppStateInterstitialManager.getInstance();
export default appStateInterstitialManager;
