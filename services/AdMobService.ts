/**
 * AdMob Service
 * Handles Google AdMob SDK initialization and provides centralized ad management
 */

import mobileAds, {
  MaxAdContentRating,
  RequestConfiguration
} from 'react-native-google-mobile-ads';
import {
  ADMOB_CONFIG,
  AD_ERROR_MESSAGES,
  AD_ANALYTICS_EVENTS,
  type AdAnalyticsEvent
} from '@/config/admob';
import { userConsentService } from './UserConsentService';

export interface AdMobInitializationResult {
  success: boolean;
  adapterStatuses?: any;
  error?: string;
}

export interface AdLoadResult {
  success: boolean;
  error?: string;
  errorCode?: string;
}

class AdMobService {
  private static instance: AdMobService;
  private isInitialized = false;
  private initializationPromise: Promise<AdMobInitializationResult> | null = null;
  private adapterStatuses: any = {};

  private constructor() {}

  static getInstance(): AdMobService {
    if (!AdMobService.instance) {
      AdMobService.instance = new AdMobService();
    }
    return AdMobService.instance;
  }

  /**
   * Initialize the Google Mobile Ads SDK
   */
  async initialize(): Promise<AdMobInitializationResult> {
    // Return existing initialization promise if already in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Return success if already initialized
    if (this.isInitialized) {
      return { success: true, adapterStatuses: this.adapterStatuses };
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<AdMobInitializationResult> {
    try {
      console.log('🚀 Initializing AdMob SDK...');

      // Configure request settings before initialization
      await this.configureRequestSettings();

      // Initialize the Mobile Ads SDK
      const adapterStatuses = await mobileAds().initialize();

      this.adapterStatuses = adapterStatuses;
      this.isInitialized = true;

      console.log('✅ AdMob SDK initialized successfully');
      console.log('📊 Adapter statuses:', adapterStatuses);

      // Log successful initialization
      this.logAnalyticsEvent('admob_initialized', {
        success: true,
        adapters_count: Object.keys(adapterStatuses).length,
      });

      return {
        success: true,
        adapterStatuses,
      };
    } catch (error) {
      console.error('❌ AdMob SDK initialization failed:', error);

      const errorMessage = error instanceof Error ? error.message : AD_ERROR_MESSAGES.INITIALIZATION_FAILED;

      // Log failed initialization
      this.logAnalyticsEvent('admob_initialization_failed', {
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Configure request settings for AdMob
   */
  private async configureRequestSettings(): Promise<void> {
    try {
      const requestConfiguration: RequestConfiguration = {
        maxAdContentRating: MaxAdContentRating[ADMOB_CONFIG.maxAdContentRating],
        tagForChildDirectedTreatment: ADMOB_CONFIG.tagForChildDirectedTreatment,
        tagForUnderAgeOfConsent: ADMOB_CONFIG.tagForUnderAgeOfConsent,
        testDeviceIdentifiers: ADMOB_CONFIG.testDeviceIdentifiers,
      };

      await mobileAds().setRequestConfiguration(requestConfiguration);
      console.log('⚙️ AdMob request configuration set:', requestConfiguration);
    } catch (error) {
      console.warn('⚠️ Failed to set AdMob request configuration:', error);
    }
  }

  /**
   * Check if AdMob SDK is initialized
   */
  isSDKInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get adapter statuses
   */
  getAdapterStatuses(): any {
    return this.adapterStatuses;
  }

  /**
   * Get initialization status for a specific adapter
   */
  getAdapterStatus(adapterName: string): any {
    return this.adapterStatuses[adapterName];
  }

  /**
   * Log analytics events for ad tracking
   */
  private logAnalyticsEvent(event: string, parameters?: Record<string, any>): void {
    try {
      // In a real app, you would integrate with your analytics service here
      // For now, we'll just log to console
      console.log(`📊 AdMob Analytics: ${event}`, parameters);
      
      // TODO: Integrate with Firebase Analytics or your preferred analytics service
      // Example:
      // analytics().logEvent(event, parameters);
    } catch (error) {
      console.warn('⚠️ Failed to log analytics event:', error);
    }
  }

  /**
   * Log ad-related analytics events
   */
  logAdEvent(event: AdAnalyticsEvent, adType: string, additionalParams?: Record<string, any>): void {
    this.logAnalyticsEvent(event, {
      ad_type: adType,
      timestamp: Date.now(),
      ...additionalParams,
    });
  }

  /**
   * Handle ad loading errors and provide user-friendly messages
   */
  handleAdError(error: any, adType: string): AdLoadResult {
    let errorMessage: string = AD_ERROR_MESSAGES.AD_LOAD_FAILED;
    let errorCode = 'UNKNOWN';

    if (error && typeof error === 'object') {
      if (error.code) {
        errorCode = error.code.toString();
        
        // Map common error codes to user-friendly messages
        switch (error.code) {
          case 0:
            errorMessage = AD_ERROR_MESSAGES.INTERNAL_ERROR;
            break;
          case 1:
            errorMessage = AD_ERROR_MESSAGES.INVALID_REQUEST;
            break;
          case 2:
            errorMessage = AD_ERROR_MESSAGES.NETWORK_ERROR;
            break;
          case 3:
            errorMessage = AD_ERROR_MESSAGES.NO_FILL;
            break;
          default:
            errorMessage = error.message || AD_ERROR_MESSAGES.AD_LOAD_FAILED;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
    }

    console.error(`❌ ${adType} ad error:`, { errorCode, errorMessage, originalError: error });

    // Log error analytics
    this.logAdEvent(AD_ANALYTICS_EVENTS.AD_FAILED_TO_LOAD, adType, {
      error_code: errorCode,
      error_message: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
      errorCode,
    };
  }

  /**
   * Check if ads should be shown based on user preferences, consent, and app state
   */
  shouldShowAds(): boolean {
    // Check if SDK is initialized
    if (!this.isSDKInitialized()) {
      return false;
    }

    // Check user consent (GDPR/CCPA compliance)
    const canRequestAds = userConsentService.canRequestAds();
    if (!canRequestAds) {
      return false;
    }

    // Add your business logic here
    // For example, check if user has premium subscription, parental controls, etc.

    // For now, show ads if consent is given and SDK is ready
    return true;
  }

  /**
   * Get test device ID for debugging
   * This helps identify your device for testing purposes
   */
  async getTestDeviceId(): Promise<string | null> {
    try {
      // This would typically be logged in the console during development
      // You can add your device ID to ADMOB_CONFIG.testDeviceIdentifiers
      return null;
    } catch (error) {
      console.warn('⚠️ Failed to get test device ID:', error);
      return null;
    }
  }
}

// Export singleton instance
export const adMobService = AdMobService.getInstance();
export default adMobService;
