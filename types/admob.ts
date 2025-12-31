/**
 * AdMob Type Definitions
 * TypeScript types for AdMob integration
 */

// Ad unit types
export type AdUnitType = 'banner' | 'interstitial' | 'rewarded' | 'app_open' | 'native';

// Ad placement positions
export type AdPosition = 'top' | 'bottom' | 'center';

// Ad sizes for banner ads
export type BannerAdSize = 
  | 'banner'           // 320x50
  | 'largeBanner'      // 320x100
  | 'mediumRectangle'  // 300x250
  | 'fullBanner'       // 468x60
  | 'leaderboard'      // 728x90
  | 'smartBanner'      // Screen width x 32|50|90
  | 'adaptiveBanner';  // Adaptive size

// Ad loading states
export type AdLoadingState = 'idle' | 'loading' | 'loaded' | 'failed' | 'showing';

// Ad error types
export interface AdError {
  code: number;
  message: string;
  domain?: string;
}

// Ad event types
export interface AdEventData {
  adUnitId: string;
  adType: AdUnitType;
  timestamp: number;
  revenue?: number;
  currency?: string;
}

// Banner ad props
export interface BannerAdProps {
  adUnitId: string;
  size?: BannerAdSize;
  position?: AdPosition;
  marginTop?: number;
  marginBottom?: number;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: AdError) => void;
  onAdOpened?: () => void;
  onAdClosed?: () => void;
  onAdClicked?: () => void;
}

// Interstitial ad configuration
export interface InterstitialAdConfig {
  adUnitId: string;
  preload?: boolean;
  showOnLoad?: boolean;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: AdError) => void;
  onAdOpened?: () => void;
  onAdClosed?: () => void;
  onAdClicked?: () => void;
}

// Rewarded ad configuration
export interface RewardedAdConfig {
  adUnitId: string;
  preload?: boolean;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: AdError) => void;
  onAdOpened?: () => void;
  onAdClosed?: () => void;
  onAdClicked?: () => void;
  onUserEarnedReward?: (reward: { type: string; amount: number }) => void;
}

// Ad placement configuration
export interface AdPlacementConfig {
  enabled: boolean;
  adUnitId: string;
  position?: AdPosition;
  marginTop?: number;
  marginBottom?: number;
  frequency?: {
    minInterval?: number;
    maxPerSession?: number;
  };
}

// Screen ad configuration
export interface ScreenAdConfig {
  banner?: AdPlacementConfig;
  interstitial?: AdPlacementConfig;
  rewarded?: AdPlacementConfig;
}

// Ad manager state
export interface AdManagerState {
  isInitialized: boolean;
  isInitializing: boolean;
  initializationError: string | null;
  bannerAds: Record<string, AdLoadingState>;
  interstitialAds: Record<string, AdLoadingState>;
  rewardedAds: Record<string, AdLoadingState>;
}

// Ad frequency data
export interface AdFrequencyData {
  lastShown: number;
  sessionCount: number;
  totalShown: number;
  userInteractions: number;
  sessionStartTime: number;
}

// Ad timing result
export interface AdTimingResult {
  canShow: boolean;
  reason?: string;
  waitTime?: number;
}

// Ad analytics event
export interface AdAnalyticsEvent {
  event: string;
  adType: AdUnitType;
  adUnitId: string;
  timestamp: number;
  parameters?: Record<string, any>;
}

// User consent status (for GDPR/CCPA compliance)
export type ConsentStatus = 'unknown' | 'required' | 'not_required' | 'obtained';

// User consent information
export interface UserConsentInfo {
  consentStatus: ConsentStatus;
  isPrivacyOptionsRequired: boolean;
  canRequestAds: boolean;
  lastUpdated: number;
}

// Ad request configuration
export interface AdRequestConfig {
  keywords?: string[];
  contentUrl?: string;
  neighboringContentUrls?: string[];
  customTargeting?: Record<string, string>;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

// Ad load result interface
export interface AdLoadResult {
  success: boolean;
  error?: string;
  errorCode?: string;
}
