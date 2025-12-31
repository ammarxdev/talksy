/**
 * AdMob Test Suite
 * Comprehensive testing component for all AdMob functionality
 * Remove this file before production
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAdMob } from '@/hooks/useAdMob';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';
import { useNavigationInterstitialAd } from '@/hooks/useNavigationInterstitialAd';
import { BannerAd, VoiceAssistantBanner, ProfileBanner } from './index';
import { adMobService } from '@/services/AdMobService';
import { adFrequencyManager } from '@/utils/adFrequencyManager';
import { voiceSessionTracker } from '@/utils/voiceSessionTracker';
import { profileAdManager } from '@/utils/profileAdManager';
import { appStateInterstitialManager } from '@/utils/appStateInterstitialManager';
import { BannerAdSize } from 'react-native-google-mobile-ads';

export function AdMobTestSuite() {
  const { colors } = useTheme();
  const {
    isInitialized,
    isInitializing,
    initializationError,
    shouldShowAds,
    getAdStats,
    resetAdData,
  } = useAdMob();

  const {
    adState: interstitialState,
    showAd: showInterstitialAd,
    preloadAd: preloadInterstitialAd,
    canShowAd: canShowInterstitialAd,
    getTimeUntilNextAd,
    forceReload: forceReloadInterstitial,
  } = useInterstitialAd();

  const {
    getNavigationStats,
    resetNavigationTracking,
    forceShowNavigationAd,
  } = useNavigationInterstitialAd();

  const [testMode, setTestMode] = useState(true);
  const [showVoiceBanner, setShowVoiceBanner] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<string>('');

  // Update test results periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = getAdStats();
      const navStats = getNavigationStats();
      const appStateStats = appStateInterstitialManager.getSessionStats();
      
      setLastTestResult(
        `AdMob: ${isInitialized ? '✅' : '❌'} | ` +
        `Interstitial: ${interstitialState.isLoaded ? '✅' : '❌'} | ` +
        `Frequency: ${stats.frequency.sessionCount}/${stats.frequency.totalShown} | ` +
        `Nav: ${navStats.navigationCount} | ` +
        `AppState: ${appStateStats.adsShownThisSession}/${appStateStats.maxAdsPerSession}`
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [isInitialized, interstitialState.isLoaded, getAdStats, getNavigationStats]);

  const handleShowInterstitial = async () => {
    try {
      const result = await showInterstitialAd();
      Alert.alert(
        'Interstitial Result',
        result.success ? '✅ Ad shown successfully!' : `❌ ${result.reason}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to show interstitial: ${error}`);
    }
  };

  const handlePreloadInterstitial = async () => {
    try {
      await preloadInterstitialAd(testMode);
      Alert.alert('Success', 'Interstitial ad preloaded!');
    } catch (error) {
      Alert.alert('Error', `Failed to preload: ${error}`);
    }
  };

  const handleForceNavigationAd = async () => {
    try {
      const result = await forceShowNavigationAd();
      Alert.alert(
        'Navigation Ad Result',
        result.success ? '✅ Ad shown successfully!' : `❌ ${result.reason}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to show navigation ad: ${error}`);
    }
  };

  const handleTestVoiceSession = () => {
    // Simulate a voice session
    voiceSessionTracker.startSession();
    setTimeout(() => {
      voiceSessionTracker.recordInteraction();
    }, 1000);
    setTimeout(() => {
      voiceSessionTracker.endSession();
      Alert.alert('Voice Session', 'Simulated voice session completed!');
    }, 3000);
  };

  const handleResetAllData = () => {
    Alert.alert(
      'Reset All Data',
      'This will reset all ad frequency data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetAdData();
            resetNavigationTracking();
            adFrequencyManager.resetAllData();
            voiceSessionTracker.reset();
            profileAdManager.resetSession();
            appStateInterstitialManager.resetSession();
            Alert.alert('Success', 'All ad data reset!');
          },
        },
      ]
    );
  };

  const handleTestAppStateAd = async () => {
    try {
      const result = await appStateInterstitialManager.triggerResumeAd();
      Alert.alert(
        'App State Ad Result',
        result.success ? '✅ Ad shown successfully!' : `❌ ${result.reason}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to show app state ad: ${error}`);
    }
  };

  const canShowInterstitial = canShowInterstitialAd();
  const timeUntilNext = getTimeUntilNextAd();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          AdMob Test Suite
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Comprehensive ad testing and debugging
        </Text>
      </View>

      {/* Status Overview */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          System Status
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          AdMob Initialized: {isInitialized ? '✅ Yes' : '❌ No'}
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Initializing: {isInitializing ? '⏳ Yes' : '✅ No'}
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Should Show Ads: {shouldShowAds() ? '✅ Yes' : '❌ No'}
        </Text>
        {initializationError && (
          <Text style={[styles.errorText, { color: colors.error || '#FF6B6B' }]}>
            Error: {initializationError}
          </Text>
        )}
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Live Status: {lastTestResult}
        </Text>
      </View>

      {/* Test Mode Toggle */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Test Configuration
        </Text>
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>
            Test Mode (Use Test Ad IDs)
          </Text>
          <Switch
            value={testMode}
            onValueChange={setTestMode}
            trackColor={{ false: '#767577', true: colors.tint }}
            thumbColor={testMode ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Banner Ad Tests */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Banner Ad Tests
        </Text>
        
        <Text style={[styles.subsectionTitle, { color: colors.textSecondary }]}>
          Standard Banner
        </Text>
        <BannerAd
          placement="PROFILE"
          size={BannerAdSize.BANNER}
          testMode={testMode}
          onAdLoaded={() => console.log('✅ Test banner loaded')}
          onAdFailedToLoad={(error) => console.log('❌ Test banner failed:', error)}
        />

        <Text style={[styles.subsectionTitle, { color: colors.textSecondary }]}>
          Profile Banner
        </Text>
        <ProfileBanner
          position="inline"
          title="Test Ad"
          onAdLoaded={() => console.log('✅ Test profile banner loaded')}
          onAdError={(error) => console.log('❌ Test profile banner failed:', error)}
        />

        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>
            Show Voice Assistant Banner
          </Text>
          <Switch
            value={showVoiceBanner}
            onValueChange={setShowVoiceBanner}
            trackColor={{ false: '#767577', true: colors.tint }}
            thumbColor={showVoiceBanner ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>

        {showVoiceBanner && (
          <>
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>
                Simulate Voice Active
              </Text>
              <Switch
                value={isVoiceActive}
                onValueChange={setIsVoiceActive}
                trackColor={{ false: '#767577', true: colors.tint }}
                thumbColor={isVoiceActive ? '#f4f3f4' : '#f4f3f4'}
              />
            </View>
            <VoiceAssistantBanner
              isVoiceActive={isVoiceActive}
              onAdLoaded={() => console.log('✅ Test voice banner loaded')}
              onAdError={(error) => console.log('❌ Test voice banner failed:', error)}
            />
          </>
        )}
      </View>

      {/* Interstitial Ad Tests */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Interstitial Ad Tests
        </Text>
        
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Loaded: {interstitialState.isLoaded ? '✅ Yes' : '❌ No'}
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Can Show: {canShowInterstitial.canShow ? '✅ Yes' : '❌ No'}
        </Text>
        {canShowInterstitial.reason && (
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Reason: {canShowInterstitial.reason}
          </Text>
        )}
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Time Until Next: {Math.round(timeUntilNext / 1000)}s
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={handleShowInterstitial}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Show Interstitial Ad
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint, opacity: 0.7 }]}
          onPress={handlePreloadInterstitial}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Preload Interstitial
          </Text>
        </TouchableOpacity>
      </View>

      {/* Advanced Tests */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Advanced Tests
        </Text>

        <TouchableOpacity
          style={[styles.smallButton, { borderColor: colors.tint }]}
          onPress={handleTestVoiceSession}
        >
          <Text style={[styles.smallButtonText, { color: colors.tint }]}>
            Simulate Voice Session
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.smallButton, { borderColor: colors.tint }]}
          onPress={handleForceNavigationAd}
        >
          <Text style={[styles.smallButtonText, { color: colors.tint }]}>
            Force Navigation Ad
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.smallButton, { borderColor: colors.tint }]}
          onPress={handleTestAppStateAd}
        >
          <Text style={[styles.smallButtonText, { color: colors.tint }]}>
            Test App State Ad
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.smallButton, { borderColor: '#FF6B6B' }]}
          onPress={handleResetAllData}
        >
          <Text style={[styles.smallButtonText, { color: '#FF6B6B' }]}>
            Reset All Data
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  toggleLabel: {
    fontSize: 16,
    flex: 1,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  smallButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 6,
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  spacer: {
    height: 100,
  },
});

export default AdMobTestSuite;
