/**
 * Change Profile Picture Screen
 * Dedicated screen for profile picture management
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useProfile } from '@/hooks/useProfile';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ProfilePictureUploader, ProfileLoadingState } from '@/components/profile';

export default function ChangeProfilePictureScreen() {
  const { colors } = useTheme();
  const { profile, isLoading, hasError, errorMessage } = useProfile();



  const handleUploadSuccess = (avatarUrl: string) => {
    // Show success feedback and optionally navigate back
    setTimeout(() => {
      router.back();
    }, 1500); // Give user time to see success message
  };

  const handleUploadError = (error: string) => {
    // Error is already handled by ProfilePictureUploader component
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Stack.Screen
          options={{
            title: 'Change Profile Picture',
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
            title: 'Change Profile Picture',
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

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Stack.Screen
        options={{
          title: 'Change Profile Picture',
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { color: colors.textPrimary },
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <ThemedText style={[styles.instructionsTitle, { color: colors.textPrimary }]}>
            Update Your Profile Picture
          </ThemedText>
          <ThemedText style={[styles.instructionsText, { color: colors.textSecondary }]}>
            Choose a photo that represents you. Your profile picture will be visible to other users and helps personalize your account.
          </ThemedText>
        </View>

        {/* Profile Picture Uploader */}
        <View style={styles.uploaderContainer}>
          <ProfilePictureUploader
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        </View>

        {/* Guidelines */}
        <View style={[styles.guidelinesContainer, { backgroundColor: colors.cardBackground }]}>
          <ThemedText style={[styles.guidelinesTitle, { color: colors.textPrimary }]}>
            Photo Guidelines
          </ThemedText>
          
          <View style={styles.guideline}>
            <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
            <ThemedText style={[styles.guidelineText, { color: colors.textSecondary }]}>
              Use a clear, high-quality photo
            </ThemedText>
          </View>
          
          <View style={styles.guideline}>
            <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
            <ThemedText style={[styles.guidelineText, { color: colors.textSecondary }]}>
              Square photos work best (1:1 ratio)
            </ThemedText>
          </View>
          
          <View style={styles.guideline}>
            <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
            <ThemedText style={[styles.guidelineText, { color: colors.textSecondary }]}>
              Maximum file size: 5MB
            </ThemedText>
          </View>
          
          <View style={styles.guideline}>
            <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
            <ThemedText style={[styles.guidelineText, { color: colors.textSecondary }]}>
              Supported formats: JPEG, PNG, WebP, GIF
            </ThemedText>
          </View>
        </View>

        {/* Current Status */}
        {profile && (
          <View style={[styles.statusContainer, { backgroundColor: colors.cardBackground }]}>
            <ThemedText style={[styles.statusTitle, { color: colors.textPrimary }]}>
              Current Status
            </ThemedText>
            <View style={styles.statusRow}>
              <ThemedText style={[styles.statusLabel, { color: colors.textSecondary }]}>
                Profile Picture:
              </ThemedText>
              <ThemedText style={[styles.statusValue, { color: colors.textPrimary }]}>
                {profile.avatar_url ? 'Set' : 'Not set'}
              </ThemedText>
            </View>
            {profile.avatar_url && (
              <View style={styles.statusRow}>
                <ThemedText style={[styles.statusLabel, { color: colors.textSecondary }]}>
                  Last Updated:
                </ThemedText>
                <ThemedText style={[styles.statusValue, { color: colors.textPrimary }]}>
                  {new Date(profile.updated_at).toLocaleDateString()}
                </ThemedText>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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

  uploaderContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
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
  statusContainer: {
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
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});
