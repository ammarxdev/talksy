import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/contexts/AlertContext';
import { useTheme, useThemeMode } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { useNotifications } from '@/hooks/useNotifications';
import { useProfile } from '@/hooks/useProfile';
import { ProfilePicture } from '@/components/profile';
import { useModel } from '@/contexts/ModelContext';
import { useAdMob } from '@/hooks/useAdMob';
import { profileAdManager } from '@/utils/profileAdManager';
import { AuthGuard } from '@/components/AuthGuard';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { showConfirmation, showError, showSuccess, showInfo } = useAlert();
  const { colors, colorScheme } = useTheme();
  const { themeMode, isSystemTheme, toggleTheme } = useThemeMode();
  const { profile, isLoading: profileLoading } = useProfile();
  const { selectedModelInfo, isLoading: modelLoading } = useModel();
  const { recordInteraction } = useAdMob();

  // Notification functionality
  const {
    settings: notificationSettings,
    serviceStatus,
    isLoading: notificationLoading,
    error: notificationError,
    enableNotifications,
    disableNotifications,
    openSettings: openNotificationSettings,
  } = useNotifications();

  // Get theme display information
  const getThemeDisplayInfo = () => {
    if (isSystemTheme) {
      return {
        title: 'Theme',
        subtitle: `System (${colorScheme === 'dark' ? 'Dark' : 'Light'})`,
        value: colorScheme === 'dark',
      };
    } else {
      return {
        title: 'Dark Mode',
        subtitle: themeMode === 'dark' ? 'Dark theme enabled' : 'Light theme enabled',
        value: themeMode === 'dark',
      };
    }
  };

  const themeDisplayInfo = getThemeDisplayInfo();

  const handleLogout = () => {
    showConfirmation(
      'Are you sure you want to logout?',
      async () => {
        const { error } = await signOut();
        if (error) {
          showError('Failed to logout. Please try again.', 'Logout Error');
        }
      },
      undefined,
      'Confirm Logout'
    );
  };

  // Notification handling functions
  const handleNotificationToggle = useCallback(async (enabled: boolean) => {
    try {
      if (enabled) {
        // User wants to enable notifications
        const success = await enableNotifications();
        if (success) {
          showSuccess(
            'Notifications enabled successfully!',
            'Notifications',
            [{ text: 'OK', style: 'default' }]
          );
        } else {
          // Permission was denied
          showInfo(
            'To enable notifications, please allow permissions in your device settings.',
            'Permission Required',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                style: 'default',
                onPress: openNotificationSettings
              }
            ]
          );
        }
      } else {
        // User wants to disable notifications
        await disableNotifications();
        showInfo('Notifications have been disabled.', 'Notifications');
      }
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
      showError(
        'Failed to update notification settings. Please try again.',
        'Error'
      );
    }
  }, [enableNotifications, disableNotifications, showSuccess, showInfo, showError, openNotificationSettings]);

  const getNotificationSubtitle = useCallback(() => {
    if (notificationLoading) {
      return 'Loading...';
    }

    if (notificationError) {
      return 'Error loading settings';
    }

    if (!serviceStatus.isAvailable) {
      return 'Not available on this device';
    }

    if (!notificationSettings.enabled) {
      return 'Notifications are disabled';
    }

    switch (notificationSettings.permissionStatus) {
      case 'granted':
        return 'Notifications enabled';
      case 'denied':
        return 'Permission denied - tap to open settings';
      case 'undetermined':
        return 'Tap to enable notifications';
      default:
        return 'Receive app notifications';
    }
  }, [notificationLoading, notificationError, serviceStatus.isAvailable, notificationSettings, notificationSettings.permissionStatus]);

  const isNotificationSwitchDisabled = useCallback(() => {
    return notificationLoading || !serviceStatus.isAvailable || notificationError !== null;
  }, [notificationLoading, serviceStatus.isAvailable, notificationError]);

  const handleProfilePicturePress = () => {
    recordInteraction(); // Track user interaction for ad frequency
    profileAdManager.recordProfileInteraction(); // Track profile-specific interaction
    showInfo('Tap to manage your account settings and profile picture.');
    setTimeout(() => {
      router.push('/account-settings');
    }, 500);
  };

  const handleModelSelectionPress = () => {
    recordInteraction(); // Track user interaction for ad frequency
    router.push('/model-selection' as any);
  };

  const getModelSelectionSubtitle = () => {
    if (modelLoading) {
      return 'Loading...';
    }
    return `Current: ${selectedModelInfo.name} - ${selectedModelInfo.description}`;
  };

  const ProfileHeader = () => (
    <View style={styles.section}>
      <View style={[styles.headerContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <ProfilePicture
          profile={profileLoading ? null : profile}
          size={80}
          showBorder={true}
          onPress={handleProfilePicturePress}
          fallbackText={profileLoading ? '...' : undefined}
        />
        <View style={styles.userInfo}>
          <ThemedText style={[styles.userName, { color: colors.textPrimary }]}>
            {profileLoading
              ? 'Loading...'
              : (profile?.username || 'User')
            }
          </ThemedText>
          <ThemedText style={[styles.userEmail, { color: colors.textSecondary }]}>
            {user?.email || 'No email'}
          </ThemedText>
        </View>
      </View>
    </View>
  );

  const SettingsSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</ThemedText>
      <ThemedView style={[styles.sectionContent, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        {children}
      </ThemedView>
    </View>
  );

  const SettingsItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightComponent,
    showArrow = true,
  }: {
    icon: IconSymbolName;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingsItem, { borderBottomColor: colors.border }]}
      onPress={() => {
        recordInteraction(); // Track user interaction for ad frequency
        profileAdManager.recordProfileInteraction(); // Track profile-specific interaction
        onPress?.();
      }}
      activeOpacity={0.7}
    >
      <View style={styles.settingsItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: colors.surfaceVariant }]}>
          <IconSymbol name={icon} size={20} color={colors.primary} />
        </View>
        <View style={styles.settingsItemText}>
          <ThemedText style={[styles.settingsItemTitle, { color: colors.textPrimary }]}>{title}</ThemedText>
          {subtitle && (
            <ThemedText style={[styles.settingsItemSubtitle, { color: colors.textSecondary }]}>{subtitle}</ThemedText>
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

  return (
    <AuthGuard requireAuth={true}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        >
          <ProfileHeader />

          {/* Removed header inline ad to reduce ad density */}

          <SettingsSection title="Preferences">
            <SettingsItem
              icon="bell"
              title="Notifications"
              subtitle={getNotificationSubtitle()}
              rightComponent={
                notificationLoading ? (
                  <ActivityIndicator size="small" color="#667eea" />
                ) : (
                  <Switch
                    value={notificationSettings.enabled && serviceStatus.hasPermission}
                    onValueChange={handleNotificationToggle}
                    disabled={isNotificationSwitchDisabled()}
                    trackColor={{ false: '#767577', true: '#667eea' }}
                    thumbColor={
                      (notificationSettings.enabled && serviceStatus.hasPermission)
                        ? '#f4f3f4'
                        : '#f4f3f4'
                    }
                  />
                )
              }
              showArrow={false}
              onPress={
                notificationSettings.permissionStatus === 'denied'
                  ? openNotificationSettings
                  : undefined
              }
            />
            <SettingsItem
              icon="moon"
              title={themeDisplayInfo.title}
              subtitle={themeDisplayInfo.subtitle}
              rightComponent={
                <Switch
                  value={themeDisplayInfo.value}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#767577', true: colors.primary }}
                  thumbColor={themeDisplayInfo.value ? '#f4f3f4' : '#f4f3f4'}
                />
              }
              showArrow={false}
              onPress={toggleTheme}
            />
            <SettingsItem
              icon="person.2.fill"
              title="Voice Assistant Model"
              subtitle={getModelSelectionSubtitle()}
              onPress={handleModelSelectionPress}
              rightComponent={
                modelLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : undefined
              }
            />
            <SettingsItem
              icon="hand.raised"
              title="Privacy & Ads"
              subtitle="Manage privacy preferences and ad settings"
              onPress={() => {
                router.push('/privacy-settings' as any);
              }}
            />
          </SettingsSection>

          <SettingsSection title="Support">
            <SettingsItem
              icon="questionmark.circle"
              title="Help & FAQ"
              subtitle="Get help and support"
              onPress={() => {
                router.push('/help-faq');
              }}
            />
            <SettingsItem
              icon="envelope"
              title="Contact Us"
              subtitle="Send feedback or report issues"
              onPress={() => {
                router.push('/contact-us');
              }}
            />
            <SettingsItem
              icon="star"
              title="Rate App"
              subtitle="Rate us on the app store"
              onPress={() => {
                // TODO: Open app store rating
              }}
            />
          </SettingsSection>

          {/* Removed middle inline ad to keep only bottom ad */}

          <SettingsSection title="Account">
            <SettingsItem
              icon="person.circle"
              title="Account Settings"
              subtitle="Manage your account"
              onPress={() => {
                router.push('/account-settings');
              }}
            />

          </SettingsSection>

          <View style={styles.logoutSection}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <IconSymbol name="arrow.right.square" size={20} color="#fff" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              App v1.0.0
            </ThemedText>
            <ThemedText style={styles.footerText}>
              Made with ❤️
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
  },

  userInfo: {
    flex: 1,
    marginLeft: 20,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  userEmail: {
    fontSize: 15,
    marginBottom: 12,
    opacity: 0.8,
    letterSpacing: 0.1,
  },

  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginHorizontal: 20,
  },
  sectionContent: {
    borderRadius: 12,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  logoutSection: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#FF3B30',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  // Banner ad styles
  headerBannerAd: {
    marginHorizontal: 20,
    marginBottom: 8,
  },
  middleBannerAd: {
    marginHorizontal: 20,
    marginVertical: 8,
  },
});
