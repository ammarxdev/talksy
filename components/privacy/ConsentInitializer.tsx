/**
 * Consent Initializer Component
 * Handles user consent initialization during app startup
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useUserConsent } from '@/hooks/useUserConsent';
import { AdsConsentStatus } from 'react-native-google-mobile-ads';

export interface ConsentInitializerProps {
  children: React.ReactNode;
  onConsentComplete?: (canRequestAds: boolean) => void;
  showLoadingScreen?: boolean;
}

export function ConsentInitializer({
  children,
  onConsentComplete,
  showLoadingScreen = true,
}: ConsentInitializerProps) {
  const { colors } = useTheme();
  const {
    consentInfo,
    isInitialized,
    isLoading,
    error,
    initializeConsent,
    showConsentForm,
    canRequestAds,
    needsConsentForm,
  } = useUserConsent();

  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentProcessing, setConsentProcessing] = useState(false);
  const [initializationComplete, setInitializationComplete] = useState(false);

  /**
   * Handle consent initialization
   */
  useEffect(() => {
    const handleConsentInitialization = async () => {
      try {
        // Initialize consent service
        if (!isInitialized && !isLoading) {
          console.log('🔐 Starting consent initialization...');
          await initializeConsent({
            debugMode: __DEV__,
            enableLogging: true,
            tagForUnderAgeOfConsent: false,
          });
        }
      } catch (err) {
        console.error('❌ Consent initialization failed:', err);
        // Continue with app even if consent fails
        setInitializationComplete(true);
      }
    };

    handleConsentInitialization();
  }, [isInitialized, isLoading, initializeConsent]);

  /**
   * Handle consent form requirement
   */
  useEffect(() => {
    if (isInitialized && consentInfo && !initializationComplete) {
      if (needsConsentForm()) {
        console.log('📋 Consent form required, showing modal...');
        setShowConsentModal(true);
      } else {
        console.log('✅ Consent not required or already obtained');
        setInitializationComplete(true);
        onConsentComplete?.(canRequestAds());
      }
    }
  }, [isInitialized, consentInfo, needsConsentForm, canRequestAds, onConsentComplete, initializationComplete]);

  /**
   * Handle consent form submission
   */
  const handleConsentFormSubmission = async () => {
    setConsentProcessing(true);
    try {
      console.log('📋 Showing consent form...');
      const result = await showConsentForm();
      
      if (result.shown) {
        console.log(`✅ Consent form completed. Can request ads: ${result.canRequestAds}`);
        Alert.alert(
          'Privacy Preferences Updated',
          result.canRequestAds 
            ? 'Thank you for your consent. Advertisements will help us keep Talksy free.'
            : 'Your privacy preferences have been saved. You can change them anytime in Settings.',
          [{ 
            text: 'Continue',
            onPress: () => {
              setShowConsentModal(false);
              setInitializationComplete(true);
              onConsentComplete?.(result.canRequestAds);
            }
          }]
        );
      } else {
        // Form not shown or error occurred
        setShowConsentModal(false);
        setInitializationComplete(true);
        onConsentComplete?.(canRequestAds());
      }
    } catch (err) {
      console.error('❌ Consent form submission failed:', err);
      Alert.alert(
        'Error',
        'There was an issue with the privacy form. You can update your preferences later in Settings.',
        [{ 
          text: 'Continue',
          onPress: () => {
            setShowConsentModal(false);
            setInitializationComplete(true);
            onConsentComplete?.(false); // Conservative approach
          }
        }]
      );
    } finally {
      setConsentProcessing(false);
    }
  };

  /**
   * Handle consent form dismissal
   */
  const handleConsentDismiss = () => {
    Alert.alert(
      'Privacy Notice',
      'To use Talksy, we need to understand your privacy preferences. This helps us comply with privacy laws and provide you with relevant advertisements.',
      [
        {
          text: 'Set Preferences',
          onPress: handleConsentFormSubmission,
        },
        {
          text: 'Continue Without Ads',
          style: 'cancel',
          onPress: () => {
            setShowConsentModal(false);
            setInitializationComplete(true);
            onConsentComplete?.(false);
          },
        },
      ]
    );
  };

  // Show loading screen during initialization
  if ((isLoading || !initializationComplete) && showLoadingScreen) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Initializing Privacy Settings...
        </Text>
        {error && (
          <Text style={[styles.errorText, { color: '#FF6B6B' }]}>
            {error}
          </Text>
        )}
      </View>
    );
  }

  return (
    <>
      {children}
      
      {/* Consent Modal */}
      <Modal
        visible={showConsentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleConsentDismiss}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Privacy & Advertisements
            </Text>
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.modalText, { color: colors.text }]}>
              To provide you with a free experience, Talksy shows advertisements. 
              We respect your privacy and comply with GDPR and CCPA regulations.
            </Text>

            <Text style={[styles.modalText, { color: colors.text }]}>
              Please review and accept our privacy practices to continue using the app.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.tint }]}
                onPress={handleConsentFormSubmission}
                disabled={consentProcessing}
              >
                <Text style={[styles.primaryButtonText, { color: colors.background }]}>
                  {consentProcessing ? 'Processing...' : 'Review Privacy Settings'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.tint }]}
                onPress={handleConsentDismiss}
                disabled={consentProcessing}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>
                  Continue Without Ads
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    marginTop: 30,
  },
  primaryButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ConsentInitializer;
