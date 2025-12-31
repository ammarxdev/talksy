/**
 * Interstitial Ad Test Component
 * Component for testing interstitial ads during development
 * Remove this file before production
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';
import { interstitialAdTiming, type AdTimingContext } from '@/utils/interstitialAdTiming';

export function InterstitialAdTest() {
  const { colors } = useTheme();
  const {
    adState,
    showAd,
    preloadAd,
    canShowAd,
    getTimeUntilNextAd,
    getAdStats,
    forceReload,
  } = useInterstitialAd();

  const [lastShowResult, setLastShowResult] = useState<string>('');
  const [timingAnalysis, setTimingAnalysis] = useState<string>('');

  // Update timing analysis periodically
  useEffect(() => {
    const updateAnalysis = () => {
      const context: AdTimingContext = {
        screenType: 'voice_assistant',
        userAction: 'session_end',
      };
      
      const decision = interstitialAdTiming.shouldShowInterstitialAd(context);
      const optimal = interstitialAdTiming.getOptimalAdTiming();
      
      setTimingAnalysis(
        `Decision: ${decision.shouldShow ? '✅ Show' : '❌ Don\'t Show'}\n` +
        `Reason: ${decision.reason}\n` +
        `Confidence: ${(decision.confidence * 100).toFixed(0)}%\n` +
        `Next Opportunity: ${Math.round(optimal.nextOpportunity / 1000)}s\n` +
        `Optimal Reason: ${optimal.reason}`
      );
    };

    updateAnalysis();
    const interval = setInterval(updateAnalysis, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleShowAd = async () => {
    try {
      const result = await showAd();
      const message = result.success 
        ? '✅ Ad shown successfully!' 
        : `❌ Failed: ${result.reason}`;
      
      setLastShowResult(message);
      
      if (!result.success) {
        Alert.alert('Ad Not Shown', result.reason || 'Unknown error');
      }
    } catch (error) {
      const message = `❌ Error: ${error}`;
      setLastShowResult(message);
      Alert.alert('Error', `Failed to show ad: ${error}`);
    }
  };

  const handlePreloadAd = async () => {
    try {
      await preloadAd(true); // Use test mode
      Alert.alert('Success', 'Ad preloaded successfully!');
    } catch (error) {
      Alert.alert('Error', `Failed to preload ad: ${error}`);
    }
  };

  const handleForceReload = async () => {
    try {
      await forceReload(true); // Use test mode
      Alert.alert('Success', 'Ad reloaded successfully!');
    } catch (error) {
      Alert.alert('Error', `Failed to reload ad: ${error}`);
    }
  };

  const handleTestTiming = (screenType: AdTimingContext['screenType'], userAction: AdTimingContext['userAction']) => {
    const context: AdTimingContext = { screenType, userAction };
    const decision = interstitialAdTiming.shouldShowInterstitialAd(context);
    
    Alert.alert(
      'Timing Analysis',
      `Screen: ${screenType}\n` +
      `Action: ${userAction}\n\n` +
      `Should Show: ${decision.shouldShow ? 'Yes' : 'No'}\n` +
      `Reason: ${decision.reason}\n` +
      `Confidence: ${(decision.confidence * 100).toFixed(0)}%` +
      (decision.suggestedDelay ? `\nDelay: ${decision.suggestedDelay}ms` : '')
    );
  };

  const canShow = canShowAd();
  const timeUntilNext = getTimeUntilNextAd();
  const stats = getAdStats();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Interstitial Ad Test
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Testing interstitial ad functionality
        </Text>
      </View>

      {/* Ad State */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Ad State
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Loaded: {adState.isLoaded ? '✅ Yes' : '❌ No'}
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Loading: {adState.isLoading ? '⏳ Yes' : '✅ No'}
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Showing: {adState.isShowing ? '📱 Yes' : '❌ No'}
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Load Attempts: {adState.loadAttempts}
        </Text>
        {adState.error && (
          <Text style={[styles.errorText, { color: colors.error || '#FF6B6B' }]}>
            Error: {adState.error}
          </Text>
        )}
      </View>

      {/* Can Show Analysis */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Can Show Analysis
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Can Show: {canShow.canShow ? '✅ Yes' : '❌ No'}
        </Text>
        {canShow.reason && (
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Reason: {canShow.reason}
          </Text>
        )}
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Time Until Next: {Math.round(timeUntilNext / 1000)}s
        </Text>
      </View>

      {/* Timing Analysis */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Smart Timing Analysis
        </Text>
        <Text style={[styles.analysisText, { color: colors.textSecondary }]}>
          {timingAnalysis}
        </Text>
      </View>

      {/* Control Buttons */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Controls
        </Text>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={handleShowAd}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Show Interstitial Ad
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint, opacity: 0.7 }]}
          onPress={handlePreloadAd}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Preload Ad (Test Mode)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint, opacity: 0.5 }]}
          onPress={handleForceReload}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Force Reload
          </Text>
        </TouchableOpacity>

        {lastShowResult && (
          <Text style={[styles.resultText, { color: colors.textSecondary }]}>
            Last Result: {lastShowResult}
          </Text>
        )}
      </View>

      {/* Timing Tests */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Timing Tests
        </Text>
        
        <TouchableOpacity
          style={[styles.smallButton, { borderColor: colors.tint }]}
          onPress={() => handleTestTiming('voice_assistant', 'session_end')}
        >
          <Text style={[styles.smallButtonText, { color: colors.tint }]}>
            Voice Session End
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.smallButton, { borderColor: colors.tint }]}
          onPress={() => handleTestTiming('profile', 'navigation')}
        >
          <Text style={[styles.smallButtonText, { color: colors.tint }]}>
            Profile Navigation
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.smallButton, { borderColor: colors.tint }]}
          onPress={() => handleTestTiming('settings', 'settings_change')}
        >
          <Text style={[styles.smallButtonText, { color: colors.tint }]}>
            Settings Change
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
  statusText: {
    fontSize: 14,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
  },
  analysisText: {
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 20,
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
  resultText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  spacer: {
    height: 50,
  },
});

export default InterstitialAdTest;
