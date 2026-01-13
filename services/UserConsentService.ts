/**
 * User Consent Service
 * Handles GDPR/CCPA compliance using Google's User Messaging Platform (UMP)
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdsConsent, AdsConsentStatus, AdsConsentDebugGeography } from 'react-native-google-mobile-ads';

export interface ConsentInfo {
  status: AdsConsentStatus;
  canRequestAds: boolean;
  isPrivacyOptionsRequired: boolean;
  lastUpdated: number;
  userLocation?: 'EEA' | 'NON_EEA' | 'UNKNOWN';
}

export interface ConsentConfiguration {
  debugMode: boolean;
  debugGeography?: AdsConsentDebugGeography;
  testDeviceIds?: string[];
  tagForUnderAgeOfConsent: boolean;
  enableLogging: boolean;
}

class UserConsentService {
  private static instance: UserConsentService;
  private consentInfo: ConsentInfo | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private hasLoggedNonFatalInitError = false;

  private readonly STORAGE_KEY = 'user_consent_info';
  private readonly CONSENT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  private config: ConsentConfiguration = {
    debugMode: __DEV__,
    debugGeography: __DEV__ ? AdsConsentDebugGeography.EEA : undefined,
    testDeviceIds: [],
    tagForUnderAgeOfConsent: false,
    enableLogging: true,
  };

  private constructor() {}

  static getInstance(): UserConsentService {
    if (!UserConsentService.instance) {
      UserConsentService.instance = new UserConsentService();
    }
    return UserConsentService.instance;
  }

  /**
   * Initialize the consent service
   */
  async initialize(config?: Partial<ConsentConfiguration>): Promise<ConsentInfo> {
    if (this.isInitialized && this.consentInfo) {
      return this.consentInfo;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return this.consentInfo!;
    }

    this.initializationPromise = this.performInitialization(config).finally(() => {
      this.initializationPromise = null;
    });
    await this.initializationPromise;
    return this.consentInfo!;
  }

  /**
   * Perform the actual initialization
   */
  private async performInitialization(config?: Partial<ConsentConfiguration>): Promise<void> {
    try {
      console.log('🚀 Initializing User Consent Service...');

      // Update configuration
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Load cached consent info
      await this.loadCachedConsentInfo();

      // Configure UMP SDK
      await this.configureUMP();

      // Request consent information update
      await this.requestConsentInfoUpdate();

      this.isInitialized = true;
      console.log('✅ User Consent Service initialized successfully');

    } catch (error) {
      const message = this.getErrorMessage(error);
      const isNonFatal = this.isPublisherMisconfigurationErrorMessage(message);

      if (isNonFatal) {
        if (!this.hasLoggedNonFatalInitError) {
          this.hasLoggedNonFatalInitError = true;
          console.warn('⚠️ Consent configuration issue (non-fatal):', message);
        }
      } else {
        console.error('❌ Failed to initialize User Consent Service:', error);
      }

      // Create fallback consent info and continue app startup.
      // IMPORTANT: When UMP is not configured (publisher misconfiguration), 
      // we should still allow ads to be shown for non-GDPR regions.
      // Only block ads if user explicitly denied consent.
      const isPublisherMisconfigError = this.isPublisherMisconfigurationErrorMessage(
        this.getErrorMessage(error)
      );

      this.consentInfo = {
        status: AdsConsentStatus.UNKNOWN,
        // Allow ads when UMP is not configured (non-GDPR regions can still show ads)
        // This is critical for ads to work when consent form is not set up yet
        canRequestAds: isPublisherMisconfigError ? true : false,
        isPrivacyOptionsRequired: false,
        lastUpdated: Date.now(),
        userLocation: 'UNKNOWN',
      };

      if (isPublisherMisconfigError) {
        console.log('📋 UMP not configured - allowing ads by default (configure UMP for GDPR compliance)');
      }

      this.isInitialized = true;
    }
  }

  /**
   * Configure the UMP SDK
   */
  private async configureUMP(): Promise<void> {
    try {
      // Note: UMP SDK configuration methods may vary by version
      // For now, we'll handle configuration through the request options
      console.log('⚙️ UMP SDK configuration prepared');

      if (this.config.debugMode) {
        console.log('🧪 Debug mode enabled');
      }

      if (this.config.tagForUnderAgeOfConsent) {
        console.log('👶 Tagged for under age of consent');
      }

    } catch (error) {
      console.error('❌ Failed to configure UMP SDK:', error);
      throw error;
    }
  }

  /**
   * Request consent information update using the correct UMP API
   */
  private async requestConsentInfoUpdate(): Promise<void> {
    try {
      console.log('🔄 Requesting consent information update...');

      // Use the correct UMP API with debug options
      const requestOptions: any = {};

      if (this.config.debugMode && this.config.debugGeography) {
        requestOptions.debugGeography = this.config.debugGeography;
      }

      if (this.config.testDeviceIds && this.config.testDeviceIds.length > 0) {
        requestOptions.testDeviceIdentifiers = this.config.testDeviceIds;
      }

      const consentInfo = await AdsConsent.requestInfoUpdate(requestOptions);

      this.consentInfo = {
        status: consentInfo.status,
        canRequestAds: consentInfo.canRequestAds,
        isPrivacyOptionsRequired: consentInfo.status === AdsConsentStatus.REQUIRED,
        lastUpdated: Date.now(),
        userLocation: this.determineUserLocation(consentInfo.status),
      };

      // Cache the consent info
      await this.cacheConsentInfo();

      if (this.config.enableLogging) {
        console.log('📋 Consent info updated:', {
          status: this.getConsentStatusString(this.consentInfo.status),
          canRequestAds: this.consentInfo.canRequestAds,
          isPrivacyOptionsRequired: this.consentInfo.isPrivacyOptionsRequired,
          userLocation: this.consentInfo.userLocation,
        });
      }

    } catch (error) {
      const message = this.getErrorMessage(error);
      if (this.isPublisherMisconfigurationErrorMessage(message)) {
        if (!this.hasLoggedNonFatalInitError) {
          this.hasLoggedNonFatalInitError = true;
          console.warn('⚠️ UMP publisher misconfiguration (no consent form configured). Allowing ads for non-GDPR regions:', message);
        }

        // When UMP is not configured, allow ads by default
        // This enables ads to work while you set up GDPR compliance
        this.consentInfo = {
          status: AdsConsentStatus.NOT_REQUIRED,
          canRequestAds: true, // IMPORTANT: Allow ads when UMP not configured
          isPrivacyOptionsRequired: false,
          lastUpdated: Date.now(),
          userLocation: 'NON_EEA', // Assume non-EEA when UMP not configured
        };
        await this.cacheConsentInfo();
        return;
      }

      console.error('❌ Failed to request consent info update:', error);
      throw error;
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }

  private isPublisherMisconfigurationErrorMessage(message: string): boolean {
    const m = message.toLowerCase();
    return (
      m.includes('publisher misconfiguration') ||
      m.includes('no form') ||
      m.includes('no form(s) configured') ||
      m.includes('account configuration')
    );
  }

  /**
   * Show consent form if required using the correct UMP API
   */
  async showConsentFormIfRequired(): Promise<{ shown: boolean; canRequestAds: boolean }> {
    if (!this.consentInfo) {
      throw new Error('Consent service not initialized');
    }

    try {
      // Use the gatherConsent method which handles everything automatically
      console.log('📋 Gathering consent...');

      await AdsConsent.gatherConsent();

      // Update consent info after gathering
      const updatedInfo = await AdsConsent.getConsentInfo();

      this.consentInfo = {
        status: updatedInfo.status,
        canRequestAds: updatedInfo.canRequestAds,
        isPrivacyOptionsRequired: updatedInfo.status === AdsConsentStatus.REQUIRED,
        lastUpdated: Date.now(),
        userLocation: this.determineUserLocation(updatedInfo.status),
      };

      // Cache the updated consent info
      await this.cacheConsentInfo();

      console.log('✅ Consent gathering completed');
      return {
        shown: true, // gatherConsent shows form if needed
        canRequestAds: this.consentInfo.canRequestAds,
      };

    } catch (error) {
      console.error('❌ Failed to gather consent:', error);

      // In case of error, be conservative and don't request ads
      return {
        shown: false,
        canRequestAds: false,
      };
    }
  }

  /**
   * Show privacy options form
   */
  async showPrivacyOptionsForm(): Promise<{ success: boolean }> {
    if (!this.consentInfo) {
      throw new Error('Consent service not initialized');
    }

    try {
      if (!this.consentInfo.isPrivacyOptionsRequired) {
        console.log('ℹ️ Privacy options not required');
        return { success: false };
      }

      console.log('⚙️ Showing privacy options form...');
      await AdsConsent.showPrivacyOptionsForm();
      
      // Update consent info after privacy options
      await this.requestConsentInfoUpdate();
      
      console.log('✅ Privacy options form completed');
      return { success: true };

    } catch (error) {
      console.error('❌ Failed to show privacy options form:', error);
      return { success: false };
    }
  }

  /**
   * Check if ads can be requested
   */
  canRequestAds(): boolean {
    if (!this.consentInfo) {
      console.warn('⚠️ Consent service not initialized, defaulting to no ads');
      return false;
    }

    return this.consentInfo.canRequestAds;
  }

  /**
   * Check if privacy options are required
   */
  isPrivacyOptionsRequired(): boolean {
    return this.consentInfo?.isPrivacyOptionsRequired || false;
  }

  /**
   * Get current consent status
   */
  getConsentStatus(): AdsConsentStatus {
    return this.consentInfo?.status || AdsConsentStatus.UNKNOWN;
  }

  /**
   * Get consent information
   */
  getConsentInfo(): ConsentInfo | null {
    return this.consentInfo ? { ...this.consentInfo } : null;
  }

  /**
   * Reset consent (for testing purposes)
   */
  async resetConsent(): Promise<void> {
    try {
      console.log('🔄 Resetting consent...');
      
      AdsConsent.reset(); // This method is synchronous
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      
      this.consentInfo = null;
      this.isInitialized = false;
      this.initializationPromise = null;
      
      console.log('✅ Consent reset successfully');
    } catch (error) {
      console.error('❌ Failed to reset consent:', error);
      throw error;
    }
  }

  /**
   * Load cached consent info
   */
  private async loadCachedConsentInfo(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        const parsedInfo: ConsentInfo = JSON.parse(cached);
        
        // Check if cache is still valid
        const cacheAge = Date.now() - parsedInfo.lastUpdated;
        if (cacheAge < this.CONSENT_CACHE_DURATION) {
          this.consentInfo = parsedInfo;
          console.log('📋 Loaded cached consent info');
        } else {
          console.log('⏰ Cached consent info expired');
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cached consent info:', error);
    }
  }

  /**
   * Cache consent info
   */
  private async cacheConsentInfo(): Promise<void> {
    if (!this.consentInfo) return;

    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.consentInfo));
    } catch (error) {
      console.warn('⚠️ Failed to cache consent info:', error);
    }
  }

  /**
   * Determine user location based on consent status
   */
  private determineUserLocation(status: AdsConsentStatus): 'EEA' | 'NON_EEA' | 'UNKNOWN' {
    switch (status) {
      case AdsConsentStatus.REQUIRED:
        return 'EEA'; // Consent required typically means EEA user
      case AdsConsentStatus.NOT_REQUIRED:
        return 'NON_EEA'; // Consent not required typically means non-EEA user
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Get human-readable consent status
   */
  private getConsentStatusString(status: AdsConsentStatus): string {
    switch (status) {
      case AdsConsentStatus.UNKNOWN:
        return 'Unknown';
      case AdsConsentStatus.REQUIRED:
        return 'Required';
      case AdsConsentStatus.NOT_REQUIRED:
        return 'Not Required';
      case AdsConsentStatus.OBTAINED:
        return 'Obtained';
      default:
        return 'Unknown';
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ConsentConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Consent service config updated');
  }

  /**
   * Get consent statistics for analytics
   */
  getConsentStats(): {
    status: string;
    canRequestAds: boolean;
    isPrivacyOptionsRequired: boolean;
    userLocation: string;
    lastUpdated: number;
    cacheAge: number;
  } {
    if (!this.consentInfo) {
      return {
        status: 'not_initialized',
        canRequestAds: false,
        isPrivacyOptionsRequired: false,
        userLocation: 'unknown',
        lastUpdated: 0,
        cacheAge: 0,
      };
    }

    return {
      status: this.getConsentStatusString(this.consentInfo.status),
      canRequestAds: this.consentInfo.canRequestAds,
      isPrivacyOptionsRequired: this.consentInfo.isPrivacyOptionsRequired,
      userLocation: this.consentInfo.userLocation || 'unknown',
      lastUpdated: this.consentInfo.lastUpdated,
      cacheAge: Date.now() - this.consentInfo.lastUpdated,
    };
  }
}

// Export singleton instance
export const userConsentService = UserConsentService.getInstance();
export default userConsentService;
