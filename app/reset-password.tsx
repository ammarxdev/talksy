/**
 * Reset Password Screen
 * Dedicated screen for password reset functionality
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/contexts/AlertContext';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const { user, resetPassword } = useAuth();
  const { showSuccess, showError, showConfirmation } = useAlert();
  
  const [email, setEmail] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);



  const handleSendResetEmail = async () => {
    if (!email.trim()) {
      showError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showError('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);

      // Call the actual Supabase resetPassword method
      const { error } = await resetPassword(email.trim());

      if (error) {
        console.error('Password reset error:', error);
        showError(error.message || 'Failed to send reset email. Please try again.');
        return;
      }

      setEmailSent(true);
      showSuccess('Password reset email sent! Check your inbox.');

    } catch (error) {
      console.error('Password reset error:', error);
      showError('Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = () => {
    showConfirmation(
      'Resend password reset email?',
      () => {
        setEmailSent(false);
        handleSendResetEmail();
      },
      undefined,
      'Resend Email'
    );
  };

  const handleBackToLogin = () => {
    router.push('/auth');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Stack.Screen
        options={{
          title: 'Reset Password',
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { color: colors.textPrimary },
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {!emailSent ? (
            <>
              {/* Instructions */}
              <View style={styles.instructionsContainer}>
                <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
                  <IconSymbol name="key.fill" size={32} color={colors.accent} />
                </View>
                <ThemedText style={[styles.instructionsTitle, { color: colors.textPrimary }]}>
                  Reset Your Password
                </ThemedText>
                <ThemedText style={[styles.instructionsText, { color: colors.textSecondary }]}>
                  Enter your email address and we'll send you a link to reset your password.
                </ThemedText>
              </View>

              {/* Email Input */}
              <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}>
                <ThemedText style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Email Address
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    }
                  ]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email address"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              {/* Send Reset Button */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.resetButton,
                    { backgroundColor: colors.buttonPrimary },
                    isLoading && { backgroundColor: colors.buttonDisabled }
                  ]}
                  onPress={handleSendResetEmail}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.resetButtonText}>Send Reset Email</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Success State */}
              <View style={styles.successContainer}>
                <View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}>
                  <IconSymbol name="checkmark.circle.fill" size={48} color={colors.success} />
                </View>
                <ThemedText style={[styles.successTitle, { color: colors.textPrimary }]}>
                  Email Sent!
                </ThemedText>
                <ThemedText style={[styles.successText, { color: colors.textSecondary }]}>
                  We've sent a password reset link to:
                </ThemedText>
                <ThemedText style={[styles.emailText, { color: colors.textPrimary }]}>
                  {email}
                </ThemedText>
                <ThemedText style={[styles.successSubtext, { color: colors.textSecondary }]}>
                  Check your inbox and follow the instructions to reset your password. The link will expire in 24 hours.
                </ThemedText>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.resendButton, { borderColor: colors.border }]}
                  onPress={handleResendEmail}
                >
                  <ThemedText style={[styles.resendButtonText, { color: colors.textPrimary }]}>
                    Resend Email
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.loginButton, { backgroundColor: colors.buttonPrimary }]}
                  onPress={handleBackToLogin}
                >
                  <Text style={styles.loginButtonText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Help Section */}
          <View style={[styles.helpContainer, { backgroundColor: colors.cardBackground }]}>
            <ThemedText style={[styles.helpTitle, { color: colors.textPrimary }]}>
              Need Help?
            </ThemedText>
            <ThemedText style={[styles.helpText, { color: colors.textSecondary }]}>
              If you don't receive the email within a few minutes, check your spam folder or contact support.
            </ThemedText>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => router.push('/contact-us')}
            >
              <ThemedText style={[styles.contactButtonText, { color: colors.accent }]}>
                Contact Support
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  instructionsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  inputContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  buttonContainer: {
    padding: 20,
  },
  resetButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    padding: 40,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  successSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButtons: {
    padding: 20,
    gap: 12,
  },
  resendButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  loginButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  contactButton: {
    alignSelf: 'flex-start',
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
