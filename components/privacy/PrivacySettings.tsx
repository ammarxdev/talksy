/**
 * Privacy & Ads Info-only Component
 * Displays clear information and helpful links without any toggles or controls.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export function PrivacySettings() {
  const { colors } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Privacy & Ads
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Manage your privacy preferences and ad settings
        </Text>
      </View>

      {/* Only Information section remains */}

      {/* Information */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          About Privacy & Ads
        </Text>
        
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          We respect your privacy and comply with GDPR and CCPA regulations. 
          Advertisements help us keep Talksy free and continuously improve the app.
        </Text>
        
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          You can change your ad preferences at any time. If you're in the EU or California, 
          you have additional privacy rights that you can exercise through the privacy options.
        </Text>

        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          All advertisements are provided by Google AdMob and follow Google's privacy policies.
          No personal conversations or voice data are used for advertising purposes.
        </Text>

        <TouchableOpacity
          style={[styles.linkButton, { borderColor: colors.tint }]}
          onPress={() => Linking.openURL('https://adssettings.google.com').catch(() => {})}
        >
          <Text style={[styles.linkText, { color: colors.tint }]}>
            Manage Google Ad Preferences
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkButton, { borderColor: colors.tint }]}
          onPress={() => Linking.openURL('https://policies.google.com/privacy').catch(() => {})}
        >
          <Text style={[styles.linkText, { color: colors.tint }]}>
            Google Privacy Policy
          </Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>Your Controls</Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>You can manage your ad personalization and consent using the links above. If you prefer an ad‑free experience, you can disable personalized ads in your Google account and limit ad tracking in your device settings.</Text>

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>Data Handling</Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>We do not sell personal data. Voice input is processed to generate responses and is not used to target ads. Aggregated analytics may be used to improve reliability and performance.</Text>

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>Contact</Text>
        <TouchableOpacity
          style={[styles.linkButton, { borderColor: colors.tint }]}
          onPress={() => Linking.openURL('mailto:support@bytebrew.app').catch(() => {})}
        >
          <Text style={[styles.linkText, { color: colors.tint }]}>Email Support</Text>
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
    lineHeight: 20,
    marginBottom: 12,
  },
  linkButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  spacer: {
    height: 50,
  },
});

export default PrivacySettings;
