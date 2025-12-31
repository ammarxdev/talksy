/**
 * Reset Password Complete Screen
 * This screen is shown when users click the reset password link in their email
 * It allows them to enter a new password
 */

import React, { useState, useEffect } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/contexts/AlertContext';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function ResetPasswordCompleteScreen() {
  const { colors } = useTheme();
  const { updatePassword, user, loading: authLoading, isPasswordResetFlow, clearPasswordResetFlow } = useAuth();
  const { showSuccess, showError } = useAlert();
  const params = useLocalSearchParams();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);

  useEffect(() => {
    // Check if user is authenticated and this is a password reset flow
    if (user && isPasswordResetFlow) {
      setIsValidSession(true);
    } else if (user && !isPasswordResetFlow) {
      // User is authenticated but not in password reset flow, redirect to main app
      router.replace('/(tabs)');
    } else if (!authLoading && !user) {
      // Only redirect if we're not loading and there's no user
      setTimeout(() => {
        showError('Invalid or expired reset link. Please request a new password reset.');
        router.replace('/auth');
      }, 3000); // Increased delay to allow for session establishment
    }
  }, [user, authLoading, isPasswordResetFlow]);

  const handleGoBack = () => {
    router.back();
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      showError('Please enter a new password');
      return;
    }

    if (!confirmPassword.trim()) {
      showError('Please confirm your new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      showError(passwordError);
      return;
    }

    try {
      setIsLoading(true);
      
      const { error } = await updatePassword(newPassword);
      
      if (error) {
        console.error('Password update error:', error);
        showError(error.message || 'Failed to update password. Please try again.');
        return;
      }
      
      showSuccess('Password updated successfully!');

      // Clear the password reset flow state
      clearPasswordResetFlow();

      // Redirect to main app after successful password update
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1500);
      
    } catch (error) {
      console.error('Password update error:', error);
      showError('Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidSession) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
            Verifying reset link...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Set New Password
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}>
              <IconSymbol name="checkmark.shield.fill" size={32} color={colors.success} />
            </View>
            <ThemedText style={[styles.instructionsTitle, { color: colors.textPrimary }]}>
              Create New Password
            </ThemedText>
            <ThemedText style={[styles.instructionsText, { color: colors.textSecondary }]}>
              Your identity has been verified. Please enter a new secure password for your account.
            </ThemedText>
          </View>

          {/* New Password Input */}
          <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}>
            <ThemedText style={[styles.inputLabel, { color: colors.textPrimary }]}>
              New Password
            </ThemedText>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  }
                ]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <IconSymbol 
                  name={showPassword ? "eye.slash" : "eye"} 
                  size={20} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}>
            <ThemedText style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Confirm New Password
            </ThemedText>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  }
                ]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <IconSymbol 
                  name={showConfirmPassword ? "eye.slash" : "eye"} 
                  size={20} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Requirements */}
          <View style={[styles.requirementsContainer, { backgroundColor: colors.cardBackground }]}>
            <ThemedText style={[styles.requirementsTitle, { color: colors.textPrimary }]}>
              Password Requirements:
            </ThemedText>
            <ThemedText style={[styles.requirementText, { color: colors.textSecondary }]}>
              • At least 6 characters long
            </ThemedText>
            <ThemedText style={[styles.requirementText, { color: colors.textSecondary }]}>
              • Contains uppercase and lowercase letters
            </ThemedText>
            <ThemedText style={[styles.requirementText, { color: colors.textSecondary }]}>
              • Contains at least one number
            </ThemedText>
          </View>

          {/* Update Password Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.updateButton,
                { backgroundColor: colors.buttonPrimary },
                isLoading && { backgroundColor: colors.buttonDisabled }
              ]}
              onPress={handleUpdatePassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.updateButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  instructionsContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  requirementsContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    marginBottom: 4,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  updateButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
