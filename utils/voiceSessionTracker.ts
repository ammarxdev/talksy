/**
 * Voice Session Tracker
 * Tracks voice assistant sessions for optimal ad timing
 */

import { adFrequencyManager } from './adFrequencyManager';

interface VoiceSession {
  startTime: number;
  endTime?: number;
  duration?: number;
  interactions: number;
}

class VoiceSessionTracker {
  private static instance: VoiceSessionTracker;
  private currentSession: VoiceSession | null = null;
  private sessionHistory: VoiceSession[] = [];
  private readonly MAX_HISTORY = 10;
  private sessionsSinceLastAd: number = 0;
  private nextAdAfterSessions: number = 2; // randomized between 2-3 after each ad

  private constructor() {
    // Randomize initial threshold between 2 and 3
    this.nextAdAfterSessions = this.randomizeThreshold();
  }

  private randomizeThreshold(): number {
    return Math.random() < 0.5 ? 2 : 3;
  }

  static getInstance(): VoiceSessionTracker {
    if (!VoiceSessionTracker.instance) {
      VoiceSessionTracker.instance = new VoiceSessionTracker();
    }
    return VoiceSessionTracker.instance;
  }

  /**
   * Start a new voice session
   */
  startSession(): void {
    // End current session if exists
    if (this.currentSession && !this.currentSession.endTime) {
      this.endSession();
    }

    this.currentSession = {
      startTime: Date.now(),
      interactions: 0,
    };

    console.log('🎤 Voice session started');
  }

  /**
   * End the current voice session
   */
  endSession(): void {
    if (!this.currentSession) {
      return;
    }

    const now = Date.now();
    this.currentSession.endTime = now;
    this.currentSession.duration = now - this.currentSession.startTime;

    // Add to history
    this.sessionHistory.unshift(this.currentSession);
    // Increment counter for ad threshold if session was meaningful
    if ((this.currentSession.duration || 0) >= 3000) {
      this.sessionsSinceLastAd += 1;
    }
    
    // Keep only recent sessions
    if (this.sessionHistory.length > this.MAX_HISTORY) {
      this.sessionHistory = this.sessionHistory.slice(0, this.MAX_HISTORY);
    }

    console.log('🎤 Voice session ended:', {
      duration: this.currentSession.duration,
      interactions: this.currentSession.interactions,
    });

    // Record interaction for ad frequency management
    adFrequencyManager.recordUserInteraction();

    this.currentSession = null;
  }

  /**
   * Record an interaction within the current session
   */
  recordInteraction(): void {
    if (this.currentSession) {
      this.currentSession.interactions += 1;
    }
  }

  /**
   * Get current session info
   */
  getCurrentSession(): VoiceSession | null {
    return this.currentSession;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    totalSessions: number;
    averageDuration: number;
    averageInteractions: number;
    lastSessionDuration: number;
    sessionsSinceLastAd: number;
    nextAdAfterSessions: number;
  } {
    const completedSessions = this.sessionHistory.filter(s => s.duration);
    
    if (completedSessions.length === 0) {
      return {
        totalSessions: 0,
        averageDuration: 0,
        averageInteractions: 0,
        lastSessionDuration: 0,
        sessionsSinceLastAd: this.sessionsSinceLastAd,
        nextAdAfterSessions: this.nextAdAfterSessions,
      };
    }

    const totalDuration = completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalInteractions = completedSessions.reduce((sum, s) => sum + s.interactions, 0);

    return {
      totalSessions: completedSessions.length,
      averageDuration: totalDuration / completedSessions.length,
      averageInteractions: totalInteractions / completedSessions.length,
      lastSessionDuration: completedSessions[0]?.duration || 0,
      sessionsSinceLastAd: this.sessionsSinceLastAd,
      nextAdAfterSessions: this.nextAdAfterSessions,
    };
  }

  /**
   * Check if it's a good time to show an interstitial ad
   * Based on session patterns and user behavior
   */
  shouldShowInterstitialAd(): boolean {
    const stats = this.getSessionStats();
    
    // Primary rule: show after N completed sessions since the last ad
    if (this.sessionsSinceLastAd >= this.nextAdAfterSessions) {
      return true;
    }

    // Otherwise, not yet time
    return false;
  }

  /**
   * Get recommended wait time before showing next ad
   */
  getRecommendedAdWaitTime(): number {
    const stats = this.getSessionStats();
    
    // Longer wait for users with short sessions (might be frustrated)
    if (stats.averageDuration < 10000) {
      return 120000; // 2 minutes
    }

    // Normal wait for engaged users
    return 60000; // 1 minute
  }

  /**
   * Reset all session data
   */
  reset(): void {
    this.currentSession = null;
    this.sessionHistory = [];
    console.log('🗑️ Voice session data reset');
  }

  /**
   * Call when an interstitial ad has been shown to reset counters and randomize next threshold
   */
  onInterstitialAdShown(): void {
    this.sessionsSinceLastAd = 0;
    this.nextAdAfterSessions = this.randomizeThreshold();
    console.log('🔁 Next interstitial after sessions:', this.nextAdAfterSessions);
  }
}

// Export singleton instance
export const voiceSessionTracker = VoiceSessionTracker.getInstance();
export default voiceSessionTracker;
