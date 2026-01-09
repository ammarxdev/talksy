/**
 * useUserConsent Hook
 * React hook for managing user consent and privacy compliance
 */

import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { userConsentService, type ConsentInfo, type ConsentConfiguration } from '@/services/UserConsentService';
import { AdsConsentStatus } from 'react-native-google-mobile-ads';

export interface UseUserConsentResult {
  // Consent state
  consentInfo: ConsentInfo | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Control functions
  initializeConsent: (config?: Partial<ConsentConfiguration>) => Promise<ConsentInfo>;
  showConsentForm: () => Promise<{ shown: boolean; canRequestAds: boolean }>;
  showPrivacyOptions: () => Promise<{ success: boolean }>;
  resetConsent: () => Promise<void>;
  
  // Status checks
  canRequestAds: () => boolean;
  isPrivacyOptionsRequired: () => boolean;
  needsConsentForm: () => boolean;
  
  // Utilities
  getConsentStats: () => any;
  updateConfig: (config: Partial<ConsentConfiguration>) => void;
}

export function useUserConsent(): UseUserConsentResult {
  const [consentInfo, setConsentInfo] = useState<ConsentInfo | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitFailed, setHasInitFailed] = useState(false);

  /**
   * Initialize consent service
   */
  const initializeConsent = useCallback(async (config?: Partial<ConsentConfiguration>): Promise<ConsentInfo> => {
    if (isLoading) {
      throw new Error('Consent initialization already in progress');
    }

    setIsLoading(true);
    setError(null);

    try {
      const info = await userConsentService.initialize(config);
      setConsentInfo(info);
      setIsInitialized(true);
      setHasInitFailed(false);
      
      console.log('✅ Consent initialized via hook');
      return info;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize consent';
      setError(errorMessage);
      setHasInitFailed(true);

      if (errorMessage.toLowerCase().includes('publisher misconfiguration')) {
        console.warn('⚠️ Consent initialization skipped (non-fatal):', errorMessage);
      } else {
        console.error('❌ Consent initialization failed via hook:', err);
      }

      // Mark initialized to stop auto-retrying/spamming; service will provide safe defaults.
      setIsInitialized(true);
      const fallback = userConsentService.getConsentInfo();
      return fallback || {
        status: AdsConsentStatus.UNKNOWN,
        canRequestAds: false,
        isPrivacyOptionsRequired: false,
        lastUpdated: Date.now(),
        userLocation: 'UNKNOWN',
      };
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  /**
   * Show consent form
   */
  const showConsentForm = useCallback(async (): Promise<{ shown: boolean; canRequestAds: boolean }> => {
    try {
      const result = await userConsentService.showConsentFormIfRequired();
      
      // Update local state
      const updatedInfo = userConsentService.getConsentInfo();
      setConsentInfo(updatedInfo);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to show consent form';
      setError(errorMessage);
      console.error('❌ Failed to show consent form via hook:', err);
      
      return { shown: false, canRequestAds: false };
    }
  }, []);

  /**
   * Show privacy options
   */
  const showPrivacyOptions = useCallback(async (): Promise<{ success: boolean }> => {
    try {
      const result = await userConsentService.showPrivacyOptionsForm();
      
      // Update local state
      const updatedInfo = userConsentService.getConsentInfo();
      setConsentInfo(updatedInfo);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to show privacy options';
      setError(errorMessage);
      console.error('❌ Failed to show privacy options via hook:', err);
      
      return { success: false };
    }
  }, []);

  /**
   * Reset consent
   */
  const resetConsent = useCallback(async (): Promise<void> => {
    try {
      await userConsentService.resetConsent();
      setConsentInfo(null);
      setIsInitialized(false);
      setError(null);
      
      console.log('✅ Consent reset via hook');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset consent';
      setError(errorMessage);
      console.error('❌ Failed to reset consent via hook:', err);
      throw err;
    }
  }, []);

  /**
   * Check if ads can be requested
   */
  const canRequestAds = useCallback((): boolean => {
    return userConsentService.canRequestAds();
  }, []);

  /**
   * Check if privacy options are required
   */
  const isPrivacyOptionsRequired = useCallback((): boolean => {
    return userConsentService.isPrivacyOptionsRequired();
  }, []);

  /**
   * Check if consent form needs to be shown
   */
  const needsConsentForm = useCallback((): boolean => {
    return consentInfo?.status === AdsConsentStatus.REQUIRED;
  }, [consentInfo]);

  /**
   * Get consent statistics
   */
  const getConsentStats = useCallback(() => {
    return userConsentService.getConsentStats();
  }, []);

  /**
   * Update configuration
   */
  const updateConfig = useCallback((config: Partial<ConsentConfiguration>) => {
    userConsentService.updateConfig(config);
  }, []);

  /**
   * Auto-initialize on mount
   */
  useEffect(() => {
    if (!isInitialized && !isLoading && !hasInitFailed) {
      initializeConsent({
        debugMode: __DEV__,
        enableLogging: true,
        tagForUnderAgeOfConsent: false,
      }).catch(err => {
        console.error('Auto-initialization failed:', err);
      });
    }
  }, [isInitialized, isLoading, hasInitFailed, initializeConsent]);

  /**
   * Handle app state changes
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isInitialized) {
        // App became active - refresh consent info if it's old
        const info = userConsentService.getConsentInfo();
        if (info) {
          const cacheAge = Date.now() - info.lastUpdated;
          if (cacheAge > 60 * 60 * 1000) { // 1 hour
            console.log('🔄 Refreshing consent info due to app state change');
            userConsentService.initialize().then(updatedInfo => {
              setConsentInfo(updatedInfo);
            }).catch(err => {
              console.error('Failed to refresh consent info:', err);
            });
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isInitialized]);

  /**
   * Periodic consent info updates
   */
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      const info = userConsentService.getConsentInfo();
      if (info && JSON.stringify(info) !== JSON.stringify(consentInfo)) {
        setConsentInfo(info);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isInitialized, consentInfo]);

  return {
    consentInfo,
    isInitialized,
    isLoading,
    error,
    initializeConsent,
    showConsentForm,
    showPrivacyOptions,
    resetConsent,
    canRequestAds,
    isPrivacyOptionsRequired,
    needsConsentForm,
    getConsentStats,
    updateConfig,
  };
}

export default useUserConsent;
