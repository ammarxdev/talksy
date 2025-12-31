/**
 * Account Settings Screen
 * Main account settings with three suboptions: profile picture, username, and password
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/contexts/AlertContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { ProfilePicture } from '@/components/profile';
import { deleteAccount as deleteAccountService } from '@/services/AccountService';

export default function AccountSettingsScreen() {
  const { colors } = useTheme();
  const { profile, isLoading } = useProfile();
  const { user } = useAuth();
  const { showConfirmation, showError, showSuccess, showWarning } = useAlert();
  const [isDeleting, setIsDeleting] = useState(false);



  const SettingsSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {title.toUpperCase()}
      </ThemedText>
      <View style={[styles.sectionContent, { backgroundColor: colors.cardBackground }]}>
        {children}
      </View>
    </View>
  );

  const SettingsItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightComponent,
    showArrow = true,
    disabled = false,
    destructive = false,
  }: {
    icon: IconSymbolName;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    showArrow?: boolean;
    disabled?: boolean;
    destructive?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.settingsItem,
        { borderBottomColor: colors.border },
        disabled && { opacity: 0.5 }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <View style={styles.settingsItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: colors.surfaceVariant }]}>
          <IconSymbol name={icon} size={20} color={destructive ? colors.error : colors.primary} />
        </View>
        <View style={styles.settingsItemText}>
          <ThemedText style={[styles.settingsItemTitle, { color: destructive ? colors.error : colors.textPrimary }]}>
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText style={[styles.settingsItemSubtitle, { color: destructive ? colors.error : colors.textSecondary }]}>
              {subtitle}
            </ThemedText>
          )}
        </View>
      </View>
      <View style={styles.settingsItemRight}>
        {rightComponent}
        {showArrow && !rightComponent && (
          <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );

  const ProfileHeader = () => (
    <View style={[styles.profileHeader, { backgroundColor: colors.cardBackground }]}>
      <ProfilePicture
        profile={profile}
        size={80}
        showBorder={true}
      />
      <View style={styles.profileInfo}>
        <ThemedText style={[styles.profileName, { color: colors.textPrimary }]}>
          {profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'User'}
        </ThemedText>
        <ThemedText style={[styles.profileEmail, { color: colors.textSecondary }]}>
          {user?.email || 'No email'}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Stack.Screen
        options={{
          title: 'Account Settings',
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { color: colors.textPrimary },
        }}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <ProfileHeader />

        {/* Profile Settings */}
        <SettingsSection title="Profile">
          <SettingsItem
            icon="camera.fill"
            title="Change Profile Picture"
            subtitle="Update your profile photo"
            onPress={() => {
              router.push('/change-profile-picture');
            }}
          />
          <SettingsItem
            icon="person.text.rectangle"
            title="Change Username"
            subtitle={profile?.username ? `Current: ${profile.username}` : "Set your username"}
            onPress={() => {
              router.push('/change-username');
            }}
          />
        </SettingsSection>

        {/* Security Settings */}
        <SettingsSection title="Security">
          <SettingsItem
            icon="key.fill"
            title="Reset Password"
            subtitle="Change your account password"
            onPress={() => {
              router.push('/reset-password');
            }}
          />
        </SettingsSection>

        {/* Danger Zone */}
        <SettingsSection title="Danger Zone">
          <SettingsItem
            icon="exclamationmark.triangle"
            title="Delete Account"
            subtitle="Permanently remove your account and data"
            destructive
            disabled={isDeleting}
            rightComponent={
              isDeleting ? (
                <ActivityIndicator 
                  size="small" 
                  color={colors.error} 
                  style={{ marginRight: 8 }} 
                />
              ) : undefined
            }
            onPress={() => {
              if (!user?.id || isDeleting) {
                if (!user?.id) {
                  showError('You need to be signed in to delete your account.', 'Not signed in');
                }
                return;
              }
              showConfirmation(
                'This will permanently delete your profile data and sign you out. This action cannot be undone. Do you want to continue?',
                async () => {
                  try {
                    setIsDeleting(true);
                    const result = await deleteAccountService(user.id!);
                    if (result.success) {
                      showSuccess('Your account has been deleted. Goodbye!', 'Account deleted');
                    } else {
                      showWarning(
                        result.error || 'Could not fully delete your account.',
                        'Partial deletion'
                      );
                    }
                  } catch (e: any) {
                    showError(e?.message || 'Failed to delete account. Please try again later.', 'Deletion failed');
                  } finally {
                    setIsDeleting(false);
                    // Regardless of result, return user to auth screen
                    router.replace('/auth');
                  }
                },
                undefined,
                'Delete Account'
              );
            }}
          />
        </SettingsSection>

        {/* Account Information */}
        <SettingsSection title="Account Information">
          <SettingsItem
            icon="envelope.fill"
            title="Email Address"
            subtitle={user?.email || 'Not set'}
            rightComponent={
              <ThemedText style={[styles.emailBadge, { color: colors.textSecondary }]}>
                {user?.email_confirmed_at ? 'Verified' : 'Unverified'}
              </ThemedText>
            }
            showArrow={false}
            disabled={true}
          />
          <SettingsItem
            icon="calendar"
            title="Member Since"
            subtitle={user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
            showArrow={false}
            disabled={true}
          />
        </SettingsSection>
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 20,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  profileEmail: {
    fontSize: 15,
    opacity: 0.8,
    letterSpacing: 0.1,
  },
  section: {
    marginTop: 32,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 16,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsItemText: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingsItemSubtitle: {
    fontSize: 14,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emailBadge: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
  },
});
