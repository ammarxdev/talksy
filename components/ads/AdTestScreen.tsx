/**
 * Ad Test Screen
 * Component for testing banner ads during development
 * Remove this file before production
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import { BannerAd, VoiceAssistantBanner, ProfileBanner } from './index';
import { useTheme } from '@/hooks/useTheme';
import { useAdMob } from '@/hooks/useAdMob';

export function AdTestScreen() {
  const { colors } = useTheme();
  const { isInitialized, isInitializing, initializationError } = useAdMob();
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const handleAdLoaded = (adType: string) => {
    console.log(`✅ ${adType} ad loaded successfully`);
  };

  const handleAdError = (adType: string, error: any) => {
    console.error(`❌ ${adType} ad failed:`, error);
    Alert.alert(
      'Ad Error',
      `${adType} ad failed to load: ${error.message || 'Unknown error'}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          AdMob Test Screen
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Testing banner ad implementations
        </Text>
      </View>

      {/* AdMob Status */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          AdMob Status
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Initialized: {isInitialized ? '✅ Yes' : '❌ No'}
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Initializing: {isInitializing ? '⏳ Yes' : '✅ No'}
        </Text>
        {initializationError && (
          <Text style={[styles.errorText, { color: colors.error || '#FF6B6B' }]}>
            Error: {initializationError}
          </Text>
        )}
      </View>

      {/* Basic Banner Ad */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Basic Banner Ad
        </Text>
        <BannerAd
          placement="PROFILE"
          size={BannerAdSize.ADAPTIVE_BANNER}
          onAdLoaded={() => handleAdLoaded('Basic Banner')}
          onAdFailedToLoad={(error) => handleAdError('Basic Banner', error)}
          testMode={true}
        />
      </View>

      {/* Profile Banner Ad */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Profile Banner Ad
        </Text>
        <ProfileBanner
          position="inline"
          title="Sponsored"
          onAdLoaded={() => handleAdLoaded('Profile Banner')}
          onAdError={(error) => handleAdError('Profile Banner', error)}
        />
      </View>

      {/* Voice Assistant Banner Test */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Voice Assistant Banner
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={() => setIsVoiceActive(!isVoiceActive)}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            {isVoiceActive ? 'Stop Voice' : 'Start Voice'} (Test Fade)
          </Text>
        </TouchableOpacity>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Voice Active: {isVoiceActive ? '🎤 Yes' : '🔇 No'}
        </Text>
      </View>

      {/* Different Banner Sizes */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Different Banner Sizes
        </Text>
        
        <Text style={[styles.subsectionTitle, { color: colors.textSecondary }]}>
          Standard Banner (320x50)
        </Text>
        <BannerAd
          placement="PROFILE"
          size={BannerAdSize.BANNER}
          onAdLoaded={() => handleAdLoaded('Standard Banner')}
          onAdFailedToLoad={(error) => handleAdError('Standard Banner', error)}
          testMode={true}
        />

        <Text style={[styles.subsectionTitle, { color: colors.textSecondary }]}>
          Large Banner (320x100)
        </Text>
        <BannerAd
          placement="PROFILE"
          size={BannerAdSize.LARGE_BANNER}
          onAdLoaded={() => handleAdLoaded('Large Banner')}
          onAdFailedToLoad={(error) => handleAdError('Large Banner', error)}
          testMode={true}
        />
      </View>

      {/* Voice Assistant Banner (Positioned) */}
      <VoiceAssistantBanner
        isVoiceActive={isVoiceActive}
        onAdLoaded={() => handleAdLoaded('Voice Assistant Banner')}
        onAdError={(error) => handleAdError('Voice Assistant Banner', error)}
      />

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
  infoText: {
    fontSize: 14,
    textAlign: 'center',
  },
  spacer: {
    height: 100, // Space for the positioned voice assistant banner
  },
});

export default AdTestScreen;
