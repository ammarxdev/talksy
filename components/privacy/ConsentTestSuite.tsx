/**
 * Consent Test Suite
 * Testing component for user consent functionality
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
  Switch,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useUserConsent } from '@/hooks/useUserConsent';
import { AdsConsentStatus, AdsConsentDebugGeography } from 'react-native-google-mobile-ads';

export function ConsentTestSuite() {
  const { colors } = useTheme();
  const {
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
  } = useUserConsent();

  const [debugMode, setDebugMode] = useState(__DEV__);
  const [debugGeography, setDebugGeography] = useState<'EEA' | 'NON_EEA'>('EEA');
  const [underAge, setUnderAge] = useState(false);

  /**
   * Handle debug configuration update
   */
  const handleUpdateDebugConfig = () => {
    updateConfig({
      debugMode,
      debugGeography: debugGeography === 'EEA' ? AdsConsentDebugGeography.EEA : AdsConsentDebugGeography.NOT_EEA,
      tagForUnderAgeOfConsent: underAge,
      enableLogging: true,
    });

    Alert.alert(
      'Debug Config Updated',
      'Debug configuration has been updated. Reset consent to apply changes.',
      [{ text: 'OK' }]
    );
  };

  /**
   * Handle consent form test
   */
  const handleTestConsentForm = async () => {
    try {
      const result = await showConsentForm();
      Alert.alert(
        'Consent Form Result',
        `Form shown: ${result.shown}\nCan request ads: ${result.canRequestAds}`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', `Failed to show consent form: ${err}`);
    }
  };

  /**
   * Handle privacy options test
   */
  const handleTestPrivacyOptions = async () => {
    try {
      const result = await showPrivacyOptions();
      Alert.alert(
        'Privacy Options Result',
        `Success: ${result.success}`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', `Failed to show privacy options: ${err}`);
    }
  };

  /**
   * Handle consent reset
   */
  const handleResetConsent = () => {
    Alert.alert(
      'Reset Consent',
      'This will reset all consent data and reinitialize. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetConsent();
              Alert.alert('Success', 'Consent has been reset');
            } catch (err) {
              Alert.alert('Error', `Failed to reset consent: ${err}`);
            }
          },
        },
      ]
    );
  };

  /**
   * Handle manual initialization
   */
  const handleManualInit = async () => {
    try {
      await initializeConsent({
        debugMode,
        debugGeography: debugGeography === 'EEA' ? AdsConsentDebugGeography.EEA : AdsConsentDebugGeography.NOT_EEA,
        tagForUnderAgeOfConsent: underAge,
        enableLogging: true,
      });
      Alert.alert('Success', 'Consent service initialized');
    } catch (err) {
      Alert.alert('Error', `Failed to initialize: ${err}`);
    }
  };

  const stats = getConsentStats();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Consent Test Suite
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Testing user consent and privacy compliance
        </Text>
      </View>

      {/* Status Overview */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Consent Status
        </Text>
        
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Initialized: {isInitialized ? '✅ Yes' : '❌ No'}
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Loading: {isLoading ? '⏳ Yes' : '✅ No'}
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Can Request Ads: {canRequestAds() ? '✅ Yes' : '❌ No'}
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Needs Consent Form: {needsConsentForm() ? '⚠️ Yes' : '✅ No'}
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Privacy Options Required: {isPrivacyOptionsRequired() ? '⚠️ Yes' : '✅ No'}
        </Text>
        
        {consentInfo && (
          <>
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              Status: {stats.status}
            </Text>
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              User Location: {stats.userLocation}
            </Text>
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              Last Updated: {new Date(stats.lastUpdated).toLocaleString()}
            </Text>
          </>
        )}

        {error && (
          <Text style={[styles.errorText, { color: '#FF6B6B' }]}>
            Error: {error}
          </Text>
        )}
      </View>

      {/* Debug Configuration */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Debug Configuration
        </Text>
        
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>
            Debug Mode
          </Text>
          <Switch
            value={debugMode}
            onValueChange={setDebugMode}
            trackColor={{ false: '#767577', true: colors.tint }}
            thumbColor={debugMode ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>
            Debug Geography: {debugGeography}
          </Text>
          <TouchableOpacity
            style={[styles.smallButton, { borderColor: colors.tint }]}
            onPress={() => setDebugGeography(debugGeography === 'EEA' ? 'NON_EEA' : 'EEA')}
          >
            <Text style={[styles.smallButtonText, { color: colors.tint }]}>
              Toggle
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>
            Tag for Under Age
          </Text>
          <Switch
            value={underAge}
            onValueChange={setUnderAge}
            trackColor={{ false: '#767577', true: colors.tint }}
            thumbColor={underAge ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={handleUpdateDebugConfig}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Update Debug Config
          </Text>
        </TouchableOpacity>
      </View>

      {/* Test Controls */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Test Controls
        </Text>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={handleManualInit}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Manual Initialize
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint, opacity: 0.8 }]}
          onPress={handleTestConsentForm}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Test Consent Form
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint, opacity: 0.6 }]}
          onPress={handleTestPrivacyOptions}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Test Privacy Options
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#FF6B6B' }]}
          onPress={handleResetConsent}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, { color: 'white' }]}>
            Reset Consent
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  spacer: {
    height: 50,
  },
});

export default ConsentTestSuite;
