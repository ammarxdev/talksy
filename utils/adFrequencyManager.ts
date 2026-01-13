/**
 * Ad Frequency Manager
 * Manages ad display frequency and timing to ensure good user experience
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADMOB_CONFIG } from '@/config/admob';

interface AdFrequencyData {
  lastShown: number;
  sessionCount: number;
  totalShown: number;
  userInteractions: number;
  sessionStartTime: number;
  lastInterstitialTime?: number;
  minInterval?: number;
}

interface AdTimingResult {
  canShow: boolean;
  reason?: string;
  waitTime?: number;
}

class AdFrequencyManager {
  private static instance: AdFrequencyManager;
  private readonly STORAGE_KEY = 'admob_frequency_data';
  private frequencyData: AdFrequencyData = {
    lastShown: 0,
    sessionCount: 0,
    totalShown: 0,
    userInteractions: 0,
    sessionStartTime: Date.now(),
  };

  private constructor() {
    this.loadFrequencyData();
  }

  static getInstance(): AdFrequencyManager {
    if (!AdFrequencyManager.instance) {
      AdFrequencyManager.instance = new AdFrequencyManager();
    }
    return AdFrequencyManager.instance;
  }

  /**
   * Load frequency data from storage
   */
  private async loadFrequencyData(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Check if this is a new session (more than 30 minutes since last activity)
        const timeSinceLastActivity = Date.now() - data.sessionStartTime;
        const isNewSession = timeSinceLastActivity > 30 * 60 * 1000; // 30 minutes
        
        if (isNewSession) {
          // Reset session-specific data
          this.frequencyData = {
            ...data,
            sessionCount: 0,
            userInteractions: 0,
            sessionStartTime: Date.now(),
          };
        } else {
          this.frequencyData = data;
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load ad frequency data:', error);
    }
  }

  /**
   * Save frequency data to storage
   */
  private async saveFrequencyData(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.frequencyData));
    } catch (error) {
      console.warn('⚠️ Failed to save ad frequency data:', error);
    }
  }

  /**
   * Check if an interstitial ad can be shown
   */
  canShowInterstitial(): AdTimingResult {
    const now = Date.now();
    const config = ADMOB_CONFIG.interstitialFrequency;

    // Check minimum interactions requirement
    if (this.frequencyData.userInteractions < config.minInteractionsBeforeFirst) {
      return {
        canShow: false,
        reason: `Need ${config.minInteractionsBeforeFirst - this.frequencyData.userInteractions} more interactions`,
      };
    }

    // Check session limit
    if (this.frequencyData.sessionCount >= config.maxPerSession) {
      return {
        canShow: false,
        reason: 'Session limit reached',
      };
    }

    // Check minimum interval
    const timeSinceLastAd = now - this.frequencyData.lastShown;
    if (timeSinceLastAd < config.minInterval) {
      const waitTime = config.minInterval - timeSinceLastAd;
      return {
        canShow: false,
        reason: 'Too soon since last ad',
        waitTime,
      };
    }

    return { canShow: true };
  }

  /**
   * Record that an interstitial ad was shown
   */
  recordInterstitialShown(): void {
    const now = Date.now();
    this.frequencyData.lastShown = now;
    this.frequencyData.sessionCount += 1;
    this.frequencyData.totalShown += 1;
    
    this.saveFrequencyData();
    
    console.log('📊 Interstitial ad recorded:', {
      sessionCount: this.frequencyData.sessionCount,
      totalShown: this.frequencyData.totalShown,
    });
  }

  /**
   * Record user interaction (for determining when to show first ad)
   */
  recordUserInteraction(): void {
    this.frequencyData.userInteractions += 1;
    this.saveFrequencyData();
    
    console.log('👆 User interaction recorded:', this.frequencyData.userInteractions);
  }

  /**
   * Get current frequency statistics
   */
  getStats(): AdFrequencyData {
    return { ...this.frequencyData };
  }

  /**
   * Reset session data (call when app becomes active after being backgrounded)
   */
  resetSession(): void {
    this.frequencyData.sessionCount = 0;
    this.frequencyData.userInteractions = 0;
    this.frequencyData.sessionStartTime = Date.now();
    this.saveFrequencyData();
    
    console.log('🔄 Ad frequency session reset');
  }

  /**
   * Reset all frequency data (for testing or user preference)
   */
  resetAllData(): void {
    this.frequencyData = {
      lastShown: 0,
      sessionCount: 0,
      totalShown: 0,
      userInteractions: 0,
      sessionStartTime: Date.now(),
    };
    this.saveFrequencyData();
    
    console.log('🗑️ All ad frequency data reset');
  }

  /**
   * Check if enough time has passed for banner ad refresh
   */
  shouldRefreshBanner(lastRefreshTime: number): boolean {
    const timeSinceRefresh = Date.now() - lastRefreshTime;
    return timeSinceRefresh >= ADMOB_CONFIG.bannerSettings.refreshInterval;
  }

  /**
   * Get time until next interstitial can be shown
   */
  getTimeUntilNextInterstitial(): number {
    const timingResult = this.canShowInterstitial();
    if (timingResult.canShow) {
      return 0;
    }
    return timingResult.waitTime || 0;
  }

  /**
   * Check if user is in a "heavy usage" session (many interactions)
   * This can be used to adjust ad frequency
   */
  isHeavyUsageSession(): boolean {
    const sessionDuration = Date.now() - this.frequencyData.sessionStartTime;
    const interactionsPerMinute = this.frequencyData.userInteractions / (sessionDuration / 60000);
    
    // Consider it heavy usage if more than 5 interactions per minute
    return interactionsPerMinute > 5;
  }

  /**
   * Get recommended ad placement timing based on user behavior
   */
  getRecommendedAdTiming(): {
    showInterstitialAfterInteractions: number;
    bannerRefreshInterval: number;
  } {
    const isHeavyUsage = this.isHeavyUsageSession();
    
    return {
      showInterstitialAfterInteractions: isHeavyUsage ? 8 : 5, // Show less frequently for heavy users
      bannerRefreshInterval: isHeavyUsage ? 90000 : 60000, // Refresh less frequently for heavy users
    };
  }
}

// Export singleton instance
export const adFrequencyManager = AdFrequencyManager.getInstance();
export default adFrequencyManager;
