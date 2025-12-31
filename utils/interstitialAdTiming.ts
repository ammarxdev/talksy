/**
 * Interstitial Ad Timing Utility
 * Smart timing logic for showing interstitial ads based on user behavior
 */

import { adFrequencyManager } from './adFrequencyManager';
import { voiceSessionTracker } from './voiceSessionTracker';
import { profileAdManager } from './profileAdManager';

export interface AdTimingContext {
  screenType: 'voice_assistant' | 'profile' | 'settings' | 'navigation';
  userAction: 'session_end' | 'navigation' | 'settings_change' | 'app_background' | 'manual';
  sessionDuration?: number;
  interactionCount?: number;
}

export interface AdTimingDecision {
  shouldShow: boolean;
  reason: string;
  confidence: number; // 0-1, how confident we are in this decision
  suggestedDelay?: number; // milliseconds to wait before showing
}

class InterstitialAdTiming {
  private static instance: InterstitialAdTiming;

  private constructor() {}

  static getInstance(): InterstitialAdTiming {
    if (!InterstitialAdTiming.instance) {
      InterstitialAdTiming.instance = new InterstitialAdTiming();
    }
    return InterstitialAdTiming.instance;
  }

  /**
   * Determine if and when to show an interstitial ad
   */
  shouldShowInterstitialAd(context: AdTimingContext): AdTimingDecision {
    // Check basic frequency limits first
    const frequencyCheck = adFrequencyManager.canShowInterstitial();
    if (!frequencyCheck.canShow) {
      return {
        shouldShow: false,
        reason: frequencyCheck.reason || 'Frequency limit reached',
        confidence: 1.0,
      };
    }

    // Analyze based on context
    switch (context.screenType) {
      case 'voice_assistant':
        return this.analyzeVoiceAssistantTiming(context);
      
      case 'profile':
        return this.analyzeProfileTiming(context);
      
      case 'settings':
        return this.analyzeSettingsTiming(context);
      
      case 'navigation':
        return this.analyzeNavigationTiming(context);
      
      default:
        return {
          shouldShow: false,
          reason: 'Unknown screen type',
          confidence: 0.0,
        };
    }
  }

  /**
   * Analyze timing for voice assistant screen
   */
  private analyzeVoiceAssistantTiming(context: AdTimingContext): AdTimingDecision {
    const voiceStats = voiceSessionTracker.getSessionStats();
    
    // Don't show during active voice sessions or while TTS is speaking
    const currentSession = voiceSessionTracker.getCurrentSession();
    if (currentSession) {
      return {
        shouldShow: false,
        reason: 'Voice session in progress',
        confidence: 1.0,
      };
    }

    // Analyze based on user action
    switch (context.userAction) {
      case 'session_end':
        // Primary rule: show after every 2-3 meaningful sessions
        if (voiceStats.sessionsSinceLastAd >= voiceStats.nextAdAfterSessions) {
          return {
            shouldShow: true,
            reason: `Session threshold met (${voiceStats.sessionsSinceLastAd}/${voiceStats.nextAdAfterSessions})`,
            confidence: 0.9,
            suggestedDelay: 0,
          };
        }
        // Otherwise, default conservative behavior
        if (voiceStats.lastSessionDuration > 8000) {
          return {
            shouldShow: true,
            reason: 'Successful voice session completed',
            confidence: 0.6,
            suggestedDelay: 1200,
          };
        }
        return {
          shouldShow: false,
          reason: 'Threshold not met',
          confidence: 0.7,
        };

      case 'navigation':
        // Show when navigating away after multiple sessions
        if (voiceStats.totalSessions >= 2) {
          return {
            shouldShow: true,
            reason: 'Multiple voice sessions completed',
            confidence: 0.6,
            suggestedDelay: 800,
          };
        }
        break;
    }

    return {
      shouldShow: false,
      reason: 'Voice assistant timing not optimal',
      confidence: 0.5,
    };
  }

  /**
   * Analyze timing for profile screen
   */
  private analyzeProfileTiming(context: AdTimingContext): AdTimingDecision {
    const profileStats = profileAdManager.getSessionStats();
    
    // Don't show too frequently in profile
    if (profileStats.timeSinceLastAd < 60000) { // Less than 1 minute
      return {
        shouldShow: false,
        reason: 'Too soon since last profile ad',
        confidence: 0.9,
      };
    }

    // Show after user has been active in profile
    if (profileStats.interactions >= 5) {
      return {
        shouldShow: true,
        reason: 'Active profile browsing detected',
        confidence: 0.7,
        suggestedDelay: 3000, // 3 second delay
      };
    }

    return {
      shouldShow: false,
      reason: 'Insufficient profile activity',
      confidence: 0.6,
    };
  }

  /**
   * Analyze timing for settings screens
   */
  private analyzeSettingsTiming(context: AdTimingContext): AdTimingDecision {
    // Be more conservative with settings screens
    const frequencyStats = adFrequencyManager.getStats();
    
    // Only show if user has been using the app for a while
    if (frequencyStats.totalShown < 3) {
      return {
        shouldShow: false,
        reason: 'New user - avoiding settings interruption',
        confidence: 0.8,
      };
    }

    // Show after settings changes
    if (context.userAction === 'settings_change') {
      return {
        shouldShow: true,
        reason: 'Settings interaction completed',
        confidence: 0.5,
        suggestedDelay: 4000, // 4 second delay
      };
    }

    return {
      shouldShow: false,
      reason: 'Settings screen - conservative approach',
      confidence: 0.7,
    };
  }

  /**
   * Analyze timing for navigation events
   */
  private analyzeNavigationTiming(context: AdTimingContext): AdTimingDecision {
    const frequencyStats = adFrequencyManager.getStats();
    
    // Show during navigation if user is engaged
    if (frequencyStats.userInteractions >= 10) {
      return {
        shouldShow: true,
        reason: 'High user engagement detected',
        confidence: 0.6,
        suggestedDelay: 1500, // 1.5 second delay
      };
    }

    return {
      shouldShow: false,
      reason: 'Navigation timing not optimal',
      confidence: 0.4,
    };
  }

  /**
   * Get optimal timing for next interstitial ad
   */
  getOptimalAdTiming(): {
    nextOpportunity: number; // milliseconds from now
    confidence: number;
    reason: string;
  } {
    const frequencyStats = adFrequencyManager.getStats();
    const voiceStats = voiceSessionTracker.getSessionStats();
    
    // Base timing on user behavior patterns
    let nextOpportunity = 60000; // Default 1 minute
    let confidence = 0.5;
    let reason = 'Default timing';

    // Adjust based on voice session patterns
    if (voiceStats.averageDuration > 20000) {
      // User has longer sessions - can show ads more frequently
      nextOpportunity = 45000; // 45 seconds
      confidence = 0.7;
      reason = 'User has longer voice sessions';
    } else if (voiceStats.averageDuration < 5000) {
      // User has very short sessions - be more conservative
      nextOpportunity = 120000; // 2 minutes
      confidence = 0.8;
      reason = 'User has short sessions - being conservative';
    }

    // Adjust based on overall ad frequency
    if (frequencyStats.sessionCount >= 3) {
      nextOpportunity += 30000; // Add 30 seconds if many ads shown
      reason += ' (adjusted for frequency)';
    }

    return {
      nextOpportunity,
      confidence,
      reason,
    };
  }

  /**
   * Check if current app state is suitable for interstitial ads
   */
  isAppStateOptimalForAds(): boolean {
    // Don't show ads if voice session is active
    const currentVoiceSession = voiceSessionTracker.getCurrentSession();
    if (currentVoiceSession) {
      return false;
    }

    // Check if user is actively browsing (good time for ads)
    const profileStats = profileAdManager.getSessionStats();
    const frequencyStats = adFrequencyManager.getStats();
    
    // Good time if user is engaged but not in critical flow
    return (
      frequencyStats.userInteractions > 0 &&
      profileStats.timeSinceLastAd > 30000 // At least 30 seconds since last ad
    );
  }
}

// Export singleton instance
export const interstitialAdTiming = InterstitialAdTiming.getInstance();
export default interstitialAdTiming;
