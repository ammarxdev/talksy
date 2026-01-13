/**
 * AdMob Configuration
 * Contains test ad unit IDs and configuration for Google AdMob integration
 * 
 * IMPORTANT: Replace test IDs with your real AdMob ad unit IDs before publishing!
 */

import { Platform } from 'react-native';

// Google's official test ad unit IDs - safe to click during development
export const TEST_AD_UNIT_IDS = {
  BANNER: Platform.select({
    ios: 'ca-app-pub-3940256099942544/2934735716',
    android: 'ca-app-pub-3940256099942544/6300978111',
    default: 'ca-app-pub-3940256099942544/6300978111',
  }),
  INTERSTITIAL: Platform.select({
    ios: 'ca-app-pub-3940256099942544/4411468910',
    android: 'ca-app-pub-3940256099942544/1033173712',
    default: 'ca-app-pub-3940256099942544/1033173712',
  }),
  REWARDED: Platform.select({
    ios: 'ca-app-pub-3940256099942544/1712485313',
    android: 'ca-app-pub-3940256099942544/5224354917',
    default: 'ca-app-pub-3940256099942544/5224354917',
  }),
  APP_OPEN: Platform.select({
    ios: 'ca-app-pub-3940256099942544/5662855259',
    android: 'ca-app-pub-3940256099942544/9257395921',
    default: 'ca-app-pub-3940256099942544/9257395921',
  }),
  NATIVE: Platform.select({
    ios: 'ca-app-pub-3940256099942544/3986624511',
    android: 'ca-app-pub-3940256099942544/2247696110',
    default: 'ca-app-pub-3940256099942544/2247696110',
  }),
} as const;

// Production ad unit IDs - replace these with your real AdMob ad unit IDs
// IMPORTANT: You need to create these ad units in your AdMob console
// For iOS: Go to AdMob Console -> Apps -> Your iOS App -> Ad units -> Create ad unit
// Format: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
export const PRODUCTION_AD_UNIT_IDS = {
  BANNER: Platform.select({
    // TODO: Replace with your iOS Banner Ad Unit ID from AdMob
    ios: 'ca-app-pub-5419600451955416/REPLACE_WITH_IOS_BANNER_ID',
    android: 'ca-app-pub-5419600451955416/6835072247',
    default: 'ca-app-pub-5419600451955416/6835072247',
  }),
  INTERSTITIAL: Platform.select({
    // TODO: Replace with your iOS Interstitial Ad Unit ID from AdMob
    ios: 'ca-app-pub-5419600451955416/REPLACE_WITH_IOS_INTERSTITIAL_ID',
    android: 'ca-app-pub-5419600451955416/1262363124',
    default: 'ca-app-pub-5419600451955416/1262363124',
  }),
  REWARDED: Platform.select({
    // TODO: Replace with your iOS Rewarded Ad Unit ID from AdMob
    ios: process.env.EXPO_PUBLIC_REWARDED_AD_UNIT_ID_IOS || 'ca-app-pub-3940256099942544/1712485313',  // Test ID as fallback
    // TODO: Replace with your Android Rewarded Ad Unit ID from AdMob
    android: process.env.EXPO_PUBLIC_REWARDED_AD_UNIT_ID_ANDROID || 'ca-app-pub-3940256099942544/5224354917',  // Test ID as fallback
    default: 'ca-app-pub-3940256099942544/5224354917',
  }),
  APP_OPEN: Platform.select({
    // TODO: Replace with your iOS App Open Ad Unit ID from AdMob
    ios: 'ca-app-pub-5419600451955416/REPLACE_WITH_IOS_APP_OPEN_ID',
    // TODO: Replace with your Android App Open Ad Unit ID from AdMob
    android: 'ca-app-pub-5419600451955416/REPLACE_WITH_ANDROID_APP_OPEN_ID',
    default: 'ca-app-pub-5419600451955416/REPLACE_WITH_ANDROID_APP_OPEN_ID',
  }),
  NATIVE: Platform.select({
    // TODO: Replace with your iOS Native Ad Unit ID from AdMob
    ios: 'ca-app-pub-5419600451955416/REPLACE_WITH_IOS_NATIVE_ID',
    // TODO: Replace with your Android Native Ad Unit ID from AdMob
    android: 'ca-app-pub-5419600451955416/REPLACE_WITH_ANDROID_NATIVE_ID',
    default: 'ca-app-pub-5419600451955416/REPLACE_WITH_ANDROID_NATIVE_ID',
  }),
} as const;

// Environment configuration
export const IS_DEVELOPMENT = __DEV__;

// Control whether to use real AdMob IDs (production) vs Google's test IDs
// Set EXPO_PUBLIC_USE_REAL_ADS=true in production builds only.
const USE_REAL_ADS = process.env.EXPO_PUBLIC_USE_REAL_ADS === 'true';
export const FORCE_PRODUCTION_ADS = false; // deprecated, kept for backward compatibility

// Current ad unit IDs based on environment flag
export const AD_UNIT_IDS = USE_REAL_ADS ? PRODUCTION_AD_UNIT_IDS : TEST_AD_UNIT_IDS;

// AdMob configuration settings
export const ADMOB_CONFIG = {
  // Maximum ad content rating
  maxAdContentRating: 'PG' as const,
  
  // Tag for child-directed treatment (set to true if your app targets children)
  tagForChildDirectedTreatment: false,
  
  // Tag for users under age of consent
  tagForUnderAgeOfConsent: false,
  
  // Test device IDs (add your device ID here for testing)
  testDeviceIdentifiers: USE_REAL_ADS ? [] : ['EMULATOR'],
  
  // Ad request timeout in milliseconds
  requestTimeoutMs: 30000,
  
  // Interstitial ad frequency settings
  interstitialFrequency: {
    // Minimum time between interstitial ads (in milliseconds)
    minInterval: 45000, // 45 seconds (slightly more frequent to ensure visibility)
    
    // Maximum interstitials per session
    maxPerSession: 5,
    
    // Minimum user interactions before showing first interstitial
    minInteractionsBeforeFirst: 1,
  },
  
  // Banner ad settings
  bannerSettings: {
    // Auto-refresh interval for banner ads (in milliseconds)
    refreshInterval: 60000, // 1 minute
    
    // Enable adaptive banners
    useAdaptiveBanners: true,
  },
} as const;

// Ad placement configuration for different screens
export const AD_PLACEMENTS = {
  VOICE_ASSISTANT: {
    banner: {
      enabled: true,
      position: 'bottom' as const,
      marginBottom: 100, // Space for tab bar
    },
    interstitial: {
      enabled: true,
      triggers: ['session_end', 'after_interactions'] as const,
    },
  },
  PROFILE: {
    banner: {
      enabled: true,
      position: 'top' as const,
      marginTop: 20,
    },
    interstitial: {
      enabled: false,
    },
  },
  SETTINGS: {
    banner: {
      enabled: true,
      position: 'bottom' as const,
      marginBottom: 20,
    },
    interstitial: {
      enabled: false,
    },
  },
} as const;

// Error messages
export const AD_ERROR_MESSAGES = {
  INITIALIZATION_FAILED: 'Failed to initialize AdMob SDK',
  AD_LOAD_FAILED: 'Failed to load advertisement',
  AD_SHOW_FAILED: 'Failed to show advertisement',
  NETWORK_ERROR: 'Network error while loading ads',
  NO_FILL: 'No ads available to show',
  INVALID_REQUEST: 'Invalid ad request',
  INTERNAL_ERROR: 'Internal AdMob error occurred',
} as const;

// Analytics events for ad tracking
export const AD_ANALYTICS_EVENTS = {
  AD_LOADED: 'ad_loaded',
  AD_FAILED_TO_LOAD: 'ad_failed_to_load',
  AD_OPENED: 'ad_opened',
  AD_CLOSED: 'ad_closed',
  AD_CLICKED: 'ad_clicked',
  AD_IMPRESSION: 'ad_impression',
  AD_REWARDED: 'ad_rewarded',
} as const;

export type AdUnitType = keyof typeof AD_UNIT_IDS;
export type AdPlacement = keyof typeof AD_PLACEMENTS;
export type AdAnalyticsEvent = typeof AD_ANALYTICS_EVENTS[keyof typeof AD_ANALYTICS_EVENTS];
