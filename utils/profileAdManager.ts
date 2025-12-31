/**
 * Profile Ad Manager
 * Manages ad placement and timing for profile and settings screens
 */

import { adFrequencyManager } from './adFrequencyManager';

interface ProfileAdConfig {
  showHeaderAd: boolean;
  showMiddleAd: boolean;
  showBottomAd: boolean;
  adSpacing: number;
}

class ProfileAdManager {
  private static instance: ProfileAdManager;
  private sessionInteractions = 0;
  private lastAdShown = 0;

  private constructor() {}

  static getInstance(): ProfileAdManager {
    if (!ProfileAdManager.instance) {
      ProfileAdManager.instance = new ProfileAdManager();
    }
    return ProfileAdManager.instance;
  }

  /**
   * Record user interaction in profile screens
   */
  recordProfileInteraction(): void {
    this.sessionInteractions += 1;
    adFrequencyManager.recordUserInteraction();
    console.log('👆 Profile interaction recorded:', this.sessionInteractions);
  }

  /**
   * Get optimal ad configuration for profile screen
   */
  getProfileAdConfig(): ProfileAdConfig {
    const stats = adFrequencyManager.getStats();
    const timeSinceLastAd = Date.now() - this.lastAdShown;
    
    // Base configuration
    let config: ProfileAdConfig = {
      showHeaderAd: true,
      showMiddleAd: false,
      showBottomAd: true,
      adSpacing: 16,
    };

    // Adjust based on user behavior
    if (stats.totalShown > 10) {
      // Experienced user - show fewer ads
      config.showMiddleAd = false;
    } else if (this.sessionInteractions > 5) {
      // Active session - show middle ad
      config.showMiddleAd = true;
    }

    // Don't show too many ads if user just saw one
    if (timeSinceLastAd < 30000) { // Less than 30 seconds
      config.showHeaderAd = false;
      config.showMiddleAd = false;
    }

    return config;
  }

  /**
   * Record that an ad was shown in profile
   */
  recordProfileAdShown(): void {
    this.lastAdShown = Date.now();
    console.log('📊 Profile ad shown recorded');
  }

  /**
   * Check if user is browsing settings actively
   */
  isActiveSettingsBrowser(): boolean {
    return this.sessionInteractions > 3;
  }

  /**
   * Get recommended ad placement based on screen content
   */
  getRecommendedAdPlacement(screenType: 'profile' | 'settings' | 'help'): {
    positions: ('top' | 'middle' | 'bottom')[];
    frequency: 'low' | 'medium' | 'high';
  } {
    const config = this.getProfileAdConfig();
    const positions: ('top' | 'middle' | 'bottom')[] = [];

    if (config.showHeaderAd) positions.push('top');
    if (config.showMiddleAd) positions.push('middle');
    if (config.showBottomAd) positions.push('bottom');

    let frequency: 'low' | 'medium' | 'high' = 'medium';

    switch (screenType) {
      case 'profile':
        frequency = this.isActiveSettingsBrowser() ? 'low' : 'medium';
        break;
      case 'settings':
        frequency = 'low'; // Settings screens should have fewer ads
        break;
      case 'help':
        frequency = 'high'; // Help screens can have more ads
        break;
    }

    return { positions, frequency };
  }

  /**
   * Reset session data
   */
  resetSession(): void {
    this.sessionInteractions = 0;
    console.log('🔄 Profile ad session reset');
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    interactions: number;
    lastAdShown: number;
    timeSinceLastAd: number;
  } {
    return {
      interactions: this.sessionInteractions,
      lastAdShown: this.lastAdShown,
      timeSinceLastAd: Date.now() - this.lastAdShown,
    };
  }
}

// Export singleton instance
export const profileAdManager = ProfileAdManager.getInstance();
export default profileAdManager;
