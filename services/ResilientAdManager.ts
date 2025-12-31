/**
 * Resilient Ad Manager
 * Coordinates all ad services with comprehensive error handling and fallbacks
 */

import { AppState, AppStateStatus } from 'react-native';
import { adMobService } from './AdMobService';
import { interstitialAdService } from './InterstitialAdService';
import { adErrorHandler } from './AdErrorHandler';
import { networkMonitor } from '@/utils/networkMonitor';
import { adFrequencyManager } from '@/utils/adFrequencyManager';

export interface AdManagerState {
  isHealthy: boolean;
  errorRate: number;
  networkSuitable: boolean;
  adMobInitialized: boolean;
  lastHealthCheck: number;
  recommendedAction: 'continue' | 'reduce_frequency' | 'disable_ads' | 'check_network';
}

export interface HealthCheckResult {
  overall: 'healthy' | 'degraded' | 'critical';
  issues: string[];
  recommendations: string[];
  canShowAds: boolean;
}

class ResilientAdManager {
  private static instance: ResilientAdManager;
  private healthCheckInterval: any = null;
  private appStateSubscription: any = null;
  private networkSubscription: (() => void) | null = null;
  
  private state: AdManagerState = {
    isHealthy: true,
    errorRate: 0,
    networkSuitable: true,
    adMobInitialized: false,
    lastHealthCheck: 0,
    recommendedAction: 'continue',
  };

  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly CRITICAL_ERROR_RATE = 10; // errors per hour
  private readonly DEGRADED_ERROR_RATE = 5; // errors per hour

  private constructor() {}

  static getInstance(): ResilientAdManager {
    if (!ResilientAdManager.instance) {
      ResilientAdManager.instance = new ResilientAdManager();
    }
    return ResilientAdManager.instance;
  }

  /**
   * Initialize the resilient ad manager
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Resilient Ad Manager...');

      // Initialize network monitoring
      await networkMonitor.initialize();

      // Set up network state listener
      this.networkSubscription = networkMonitor.addListener(this.handleNetworkChange);

      // Set up app state listener
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

      // Start health monitoring
      this.startHealthMonitoring();

      // Initial health check
      await this.performHealthCheck();

      console.log('✅ Resilient Ad Manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Resilient Ad Manager:', error);
      adErrorHandler.handleError(error, 'manager', undefined, 'initialization');
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';

    try {
      // Check AdMob initialization
      const adMobInitialized = adMobService.isSDKInitialized();
      this.state.adMobInitialized = adMobInitialized;
      
      if (!adMobInitialized) {
        issues.push('AdMob SDK not initialized');
        recommendations.push('Restart app or check network connection');
        overall = 'critical';
      }

      // Check network suitability
      const networkCheck = networkMonitor.isNetworkSuitableForAds();
      this.state.networkSuitable = networkCheck.suitable;
      
      if (!networkCheck.suitable) {
        issues.push(`Network issue: ${networkCheck.reason}`);
        recommendations.push('Check internet connection');
        if (overall !== 'critical') overall = 'degraded';
      }

      // Check error rate
      const errorStats = adErrorHandler.getErrorStats();
      this.state.errorRate = errorStats.errorRate;
      
      if (errorStats.errorRate > this.CRITICAL_ERROR_RATE) {
        issues.push(`Critical error rate: ${errorStats.errorRate} errors/24h`);
        recommendations.push('Consider disabling ads temporarily');
        overall = 'critical';
      } else if (errorStats.errorRate > this.DEGRADED_ERROR_RATE) {
        issues.push(`High error rate: ${errorStats.errorRate} errors/24h`);
        recommendations.push('Reduce ad frequency');
        if (overall !== 'critical') overall = 'degraded';
      }

      // Check interstitial ad state
      const interstitialState = interstitialAdService.getState();
      if (interstitialState.error) {
        issues.push(`Interstitial ad error: ${interstitialState.error}`);
        recommendations.push('Reload interstitial ads');
        if (overall !== 'critical') overall = 'degraded';
      }

      // Update overall health
      this.state.isHealthy = overall === 'healthy';
      this.state.lastHealthCheck = Date.now();

      // Get recommended action
      const actionRecommendation = adErrorHandler.getRecommendedAction();
      this.state.recommendedAction = actionRecommendation.action;

      if (actionRecommendation.action !== 'continue') {
        recommendations.push(`Recommended: ${actionRecommendation.reason}`);
      }

      const result: HealthCheckResult = {
        overall,
        issues,
        recommendations,
        canShowAds: this.state.isHealthy && this.state.networkSuitable && this.state.adMobInitialized,
      };

      console.log(`🏥 Health check completed: ${overall} (${issues.length} issues)`);
      return result;

    } catch (error) {
      console.error('❌ Health check failed:', error);
      adErrorHandler.handleError(error, 'manager', undefined, 'health_check');
      
      return {
        overall: 'critical',
        issues: ['Health check failed'],
        recommendations: ['Restart ad services'],
        canShowAds: false,
      };
    }
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange = (networkState: any) => {
    const wasNetworkSuitable = this.state.networkSuitable;
    const networkCheck = networkMonitor.isNetworkSuitableForAds();
    this.state.networkSuitable = networkCheck.suitable;

    // If network became suitable, try to reload ads
    if (!wasNetworkSuitable && networkCheck.suitable) {
      console.log('📶 Network restored, attempting to reload ads...');
      this.recoverFromNetworkIssues();
    }
  };

  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App became active - perform health check
      setTimeout(() => {
        this.performHealthCheck();
      }, 2000);
    }
  };

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Recover from network issues
   */
  private async recoverFromNetworkIssues(): Promise<void> {
    try {
      // Try to reload interstitial ads
      const interstitialState = interstitialAdService.getState();
      if (!interstitialState.isLoaded && !interstitialState.isLoading) {
        await interstitialAdService.forceReload();
      }

      console.log('🔄 Recovery from network issues completed');
    } catch (error) {
      console.error('❌ Failed to recover from network issues:', error);
      adErrorHandler.handleError(error, 'manager', undefined, 'network_recovery');
    }
  }

  /**
   * Get current manager state
   */
  getState(): AdManagerState {
    return { ...this.state };
  }

  /**
   * Check if ads should be shown based on health
   */
  shouldShowAds(): boolean {
    return (
      this.state.isHealthy &&
      this.state.networkSuitable &&
      this.state.adMobInitialized &&
      adMobService.shouldShowAds()
    );
  }

  /**
   * Get comprehensive status report
   */
  async getStatusReport(): Promise<{
    health: HealthCheckResult;
    network: any;
    errors: any;
    frequency: any;
    recommendations: string[];
  }> {
    const health = await this.performHealthCheck();
    const network = networkMonitor.getState();
    const errors = adErrorHandler.getErrorStats();
    const frequency = adFrequencyManager.getStats();

    const recommendations: string[] = [];

    // Generate recommendations based on current state
    if (!this.state.adMobInitialized) {
      recommendations.push('Initialize AdMob SDK');
    }

    if (!this.state.networkSuitable) {
      recommendations.push('Check network connection');
    }

    if (this.state.errorRate > this.DEGRADED_ERROR_RATE) {
      recommendations.push('Reduce ad frequency or investigate error causes');
    }

    if (errors.errorsByCode[2] > 3) { // Network errors
      recommendations.push('Implement better network error handling');
    }

    return {
      health,
      network,
      errors,
      frequency,
      recommendations,
    };
  }

  /**
   * Emergency disable ads
   */
  emergencyDisableAds(reason: string): void {
    console.warn(`🚨 Emergency ad disable: ${reason}`);
    
    // Update error handler config to stop showing ads
    adErrorHandler.updateConfig({
      showUserAlerts: false,
      enableAutoRetry: false,
    });

    // Log the emergency disable
    adMobService.logAdEvent('ad_failed_to_load', 'manager', {
      reason,
      timestamp: Date.now(),
      error_rate: this.state.errorRate,
    });

    this.state.isHealthy = false;
    this.state.recommendedAction = 'disable_ads';
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (this.networkSubscription) {
      this.networkSubscription();
      this.networkSubscription = null;
    }

    console.log('🗑️ Resilient Ad Manager destroyed');
  }
}

// Export singleton instance
export const resilientAdManager = ResilientAdManager.getInstance();
export default resilientAdManager;
