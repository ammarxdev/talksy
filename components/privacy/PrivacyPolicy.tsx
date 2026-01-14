/**
 * Privacy Policy Component
 * Displays comprehensive privacy policy information
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export function PrivacyPolicy() {
  const { colors } = useTheme();

  const handleLinkPress = (url: string) => {
    Linking.openURL(url).catch(err => {
      console.error('Failed to open link:', err);
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          Privacy Policy
        </Text>
        
        <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
          Last updated: {new Date().toLocaleDateString()}
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Information We Collect
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Talksy is designed with privacy in mind. We collect minimal information necessary to provide our voice assistant service:
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Voice recordings are processed locally on your device when possible
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • App usage analytics to improve performance and features
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Device information for compatibility and optimization
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Advertisement interaction data (when ads are enabled)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            How We Use Your Information
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Your information is used solely to:
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Provide voice assistant functionality
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Improve app performance and user experience
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Show relevant advertisements (with your consent)
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Comply with legal requirements and safety measures
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Voice Data Privacy
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Your voice is precious to us, and we protect it accordingly:
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Voice processing happens locally when possible
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Voice data is never used for advertising purposes
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Conversations are not stored permanently
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • You can delete voice data at any time
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Advertisements & Third Parties
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            Talksy uses Google AdMob to show advertisements:
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Ads are provided by Google AdMob
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Ad personalization follows your Google Ad preferences
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • You can opt out of personalized ads at any time
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • No voice conversations are shared with advertisers
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Your Rights (GDPR & CCPA)
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            If you&apos;re in the EU or California, you have additional rights:
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Right to access your personal data
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Right to delete your personal data
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Right to opt out of data sales (we don&apos;t sell data)
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Right to manage ad personalization
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Data Security
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            We implement industry-standard security measures to protect your data:
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Encryption in transit and at rest
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Regular security audits and updates
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Minimal data collection principle
          </Text>
          <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
            • Secure data processing partners
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Contact & Links
          </Text>
          
          <TouchableOpacity
            style={[styles.linkButton, { borderColor: colors.tint }]}
            onPress={() => handleLinkPress('https://policies.google.com/privacy')}
          >
            <Text style={[styles.linkText, { color: colors.tint }]}>
              Google Privacy Policy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkButton, { borderColor: colors.tint }]}
            onPress={() => handleLinkPress('https://support.google.com/admob/answer/7665968')}
          >
            <Text style={[styles.linkText, { color: colors.tint }]}>
              Google AdMob Privacy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkButton, { borderColor: colors.tint }]}
            onPress={() => handleLinkPress('https://adssettings.google.com')}
          >
            <Text style={[styles.linkText, { color: colors.tint }]}>
              Manage Google Ad Settings
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            For questions about this privacy policy or to exercise your privacy rights, 
            please contact us through the app&apos;s support section.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  lastUpdated: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 6,
    marginLeft: 8,
  },
  linkButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default PrivacyPolicy;
