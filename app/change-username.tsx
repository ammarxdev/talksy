/**
 * Change Username Screen
 * Dedicated screen for username management
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
import { Stack, router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useProfile } from '@/hooks/useProfile';
import { useAlert } from '@/contexts/AlertContext';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { validateUsername } from '@/utils/profileValidation';
import { ProfileLoadingState } from '@/components/profile';

export default function ChangeUsernameScreen() {
  const { colors } = useTheme();
  const { profile, isLoading, hasError, errorMessage, updateProfile } = useProfile();
  const { showSuccess, showError } = useAlert();
  
  const [username, setUsername] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize username from profile
  useEffect(() => {
    if (profile?.username) {
      setUsername(profile.username);
    }
  }, [profile]);

  // Check for changes
  useEffect(() => {
    const currentUsername = profile?.username || '';
    setHasChanges(username !== currentUsername);
  }, [username, profile?.username]);

  // Validate username on change
  useEffect(() => {
    if (username.trim()) {
      const errors = validateUsername(username.trim());
      setValidationErrors(errors);
    } else {
      setValidationErrors([]);
    }
  }, [username]);



  const handleSave = async () => {
    if (!hasChanges) return;

    const trimmedUsername = username.trim();
    
    if (!trimmedUsername) {
      showError('Username cannot be empty');
      return;
    }

    if (validationErrors.length > 0) {
      showError(validationErrors[0]);
      return;
    }

    try {
      setIsUpdating(true);
      
      const updatedProfile = await updateProfile({ username: trimmedUsername });
      
      if (updatedProfile) {
        showSuccess('Username updated successfully!');
        router.back();
      } else {
        showError('Failed to update username. Please try again.');
      }
    } catch (error) {
      console.error('Username update error:', error);
      showError('Failed to update username. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDiscard = () => {
    setUsername(profile?.username || '');
    setValidationErrors([]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Stack.Screen
          options={{
            title: 'Change Username',
            headerShown: true,
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { color: colors.textPrimary },
          }}
        />
        <ProfileLoadingState type="loading" message="Loading your profile..." />
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Stack.Screen
          options={{
            title: 'Change Username',
            headerShown: true,
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { color: colors.textPrimary },
          }}
        />
        <ProfileLoadingState
          type="error"
          message={errorMessage || 'Failed to load profile'}
          onRetry={() => router.back()}
        />
      </View>
    );
  }

  const isValid = validationErrors.length === 0 && username.trim().length > 0;
  const canSave = hasChanges && isValid && !isUpdating;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Stack.Screen
        options={{
          title: 'Change Username',
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
          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <ThemedText style={[styles.instructionsTitle, { color: colors.textPrimary }]}>
              Choose Your Username
            </ThemedText>
            <ThemedText style={[styles.instructionsText, { color: colors.textSecondary }]}>
              Your username is how others will find and identify you. Choose something unique and memorable.
            </ThemedText>
          </View>

          {/* Username Input */}
          <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}>
            <ThemedText style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Username
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                { 
                  backgroundColor: colors.surface,
                  borderColor: validationErrors.length > 0 ? colors.error : colors.border,
                  color: colors.textPrimary,
                }
              ]}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
              editable={!isUpdating}
            />
            
            {/* Character count */}
            <View style={styles.characterCount}>
              <ThemedText style={[styles.characterCountText, { color: colors.textSecondary }]}>
                {username.length}/30
              </ThemedText>
            </View>

            {/* Validation errors */}
            {validationErrors.length > 0 && (
              <View style={styles.errorContainer}>
                {validationErrors.map((error, index) => (
                  <View key={index} style={styles.errorRow}>
                    <IconSymbol name="exclamationmark.circle.fill" size={16} color={colors.error} />
                    <ThemedText style={[styles.errorText, { color: colors.error }]}>
                      {error}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Guidelines */}
          <View style={[styles.guidelinesContainer, { backgroundColor: colors.cardBackground }]}>
            <ThemedText style={[styles.guidelinesTitle, { color: colors.textPrimary }]}>
              Username Requirements
            </ThemedText>
            
            <View style={styles.guideline}>
              <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
              <ThemedText style={[styles.guidelineText, { color: colors.textSecondary }]}>
                3-30 characters long
              </ThemedText>
            </View>
            
            <View style={styles.guideline}>
              <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
              <ThemedText style={[styles.guidelineText, { color: colors.textSecondary }]}>
                Letters, numbers, underscores, and hyphens only
              </ThemedText>
            </View>
            
            <View style={styles.guideline}>
              <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
              <ThemedText style={[styles.guidelineText, { color: colors.textSecondary }]}>
                Cannot use reserved words
              </ThemedText>
            </View>
          </View>

          {/* Action Buttons */}
          {hasChanges && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.discardButton, { borderColor: colors.border }]}
                onPress={handleDiscard}
                disabled={isUpdating}
              >
                <ThemedText style={[styles.discardButtonText, { color: colors.textSecondary }]}>
                  Discard Changes
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save Button */}
      <View style={[styles.saveContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: canSave ? colors.buttonPrimary : colors.buttonDisabled }
          ]}
          onPress={handleSave}
          disabled={!canSave || isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[
              styles.saveButtonText,
              { color: '#fff' }
            ]}>
              Save Changes
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  saveContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 50,
    borderTopWidth: 1,
    marginTop: 20,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  instructionsContainer: {
    padding: 20,
    alignItems: 'center',
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
  characterCount: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  characterCountText: {
    fontSize: 12,
  },
  errorContainer: {
    marginTop: 12,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  guidelinesContainer: {
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
  guidelinesTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  guideline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  guidelineText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  actionButtons: {
    padding: 20,
  },
  discardButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  discardButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
