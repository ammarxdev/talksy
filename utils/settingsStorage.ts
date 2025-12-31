/**
 * Settings Storage Utility
 * AsyncStorage wrapper for notification preferences with type safety
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  STORAGE_KEYS,
  NotificationError,
  NOTIFICATION_ERROR_CODES,
} from '@/types/notifications';

/**
 * Settings Storage Service
 * Handles all notification settings persistence with AsyncStorage
 */
export class SettingsStorage {
  private static instance: SettingsStorage;
  private cache: NotificationSettings | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): SettingsStorage {
    if (!SettingsStorage.instance) {
      SettingsStorage.instance = new SettingsStorage();
    }
    return SettingsStorage.instance;
  }

  /**
   * Load notification settings from storage
   */
  public async loadSettings(): Promise<NotificationSettings> {
    try {
      // Return cached settings if still valid
      if (this.cache && this.isCacheValid()) {
        return this.cache;
      }

      const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      
      if (!settingsJson) {
        // No settings found, return defaults and save them
        const defaultSettings = { ...DEFAULT_NOTIFICATION_SETTINGS };
        await this.saveSettings(defaultSettings);
        return defaultSettings;
      }

      const settings = JSON.parse(settingsJson) as NotificationSettings;
      
      // Validate and migrate settings if needed
      const validatedSettings = this.validateAndMigrateSettings(settings);
      
      // Update cache
      this.cache = validatedSettings;
      this.cacheTimestamp = Date.now();
      
      return validatedSettings;
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      throw new NotificationError(
        'Failed to load notification settings',
        NOTIFICATION_ERROR_CODES.STORAGE_ERROR
      );
    }
  }

  /**
   * Save notification settings to storage
   */
  public async saveSettings(settings: NotificationSettings): Promise<void> {
    try {
      const settingsJson = JSON.stringify(settings);
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, settingsJson);
      
      // Update cache
      this.cache = settings;
      this.cacheTimestamp = Date.now();
      
      console.log('Notification settings saved successfully');
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      throw new NotificationError(
        'Failed to save notification settings',
        NOTIFICATION_ERROR_CODES.STORAGE_ERROR
      );
    }
  }

  /**
   * Update specific settings properties
   */
  public async updateSettings(updates: Partial<NotificationSettings>): Promise<NotificationSettings> {
    try {
      const currentSettings = await this.loadSettings();
      const updatedSettings: NotificationSettings = {
        ...currentSettings,
        ...updates,
        // Ensure nested objects are properly merged
        categories: {
          ...currentSettings.categories,
          ...(updates.categories || {}),
        },
        quietHours: {
          ...currentSettings.quietHours,
          ...(updates.quietHours || {}),
        },
      };

      await this.saveSettings(updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      throw new NotificationError(
        'Failed to update notification settings',
        NOTIFICATION_ERROR_CODES.STORAGE_ERROR
      );
    }
  }

  /**
   * Reset settings to defaults
   */
  public async resetSettings(): Promise<NotificationSettings> {
    try {
      const defaultSettings = { ...DEFAULT_NOTIFICATION_SETTINGS };
      await this.saveSettings(defaultSettings);
      return defaultSettings;
    } catch (error) {
      console.error('Failed to reset notification settings:', error);
      throw new NotificationError(
        'Failed to reset notification settings',
        NOTIFICATION_ERROR_CODES.STORAGE_ERROR
      );
    }
  }

  /**
   * Clear all notification-related storage
   */
  public async clearStorage(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.NOTIFICATION_SETTINGS),
        AsyncStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.LAST_PERMISSION_CHECK),
      ]);
      
      // Clear cache
      this.cache = null;
      this.cacheTimestamp = 0;
      
      console.log('Notification storage cleared successfully');
    } catch (error) {
      console.error('Failed to clear notification storage:', error);
      throw new NotificationError(
        'Failed to clear notification storage',
        NOTIFICATION_ERROR_CODES.STORAGE_ERROR
      );
    }
  }

  /**
   * Save push token
   */
  public async savePushToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);
      
      // Also update settings
      await this.updateSettings({ pushToken: token });
      
      console.log('Push token saved successfully');
    } catch (error) {
      console.error('Failed to save push token:', error);
      throw new NotificationError(
        'Failed to save push token',
        NOTIFICATION_ERROR_CODES.STORAGE_ERROR
      );
    }
  }

  /**
   * Load push token
   */
  public async loadPushToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
    } catch (error) {
      console.error('Failed to load push token:', error);
      return null;
    }
  }

  /**
   * Save last permission check timestamp
   */
  public async saveLastPermissionCheck(): Promise<void> {
    try {
      const timestamp = Date.now().toString();
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_PERMISSION_CHECK, timestamp);
    } catch (error) {
      console.error('Failed to save last permission check:', error);
    }
  }

  /**
   * Get last permission check timestamp
   */
  public async getLastPermissionCheck(): Promise<number | null> {
    try {
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.LAST_PERMISSION_CHECK);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      console.error('Failed to get last permission check:', error);
      return null;
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return this.cache !== null && (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION;
  }

  /**
   * Validate and migrate settings from older versions
   */
  private validateAndMigrateSettings(settings: any): NotificationSettings {
    // Start with defaults
    const validatedSettings: NotificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS };

    // Migrate from older versions
    if (settings.version === undefined || settings.version < 1) {
      // Migration from version 0 to 1
      console.log('Migrating notification settings to version 1');
      
      // Copy over valid properties
      if (typeof settings.enabled === 'boolean') {
        validatedSettings.enabled = settings.enabled;
      }
      if (typeof settings.soundEnabled === 'boolean') {
        validatedSettings.soundEnabled = settings.soundEnabled;
      }
      if (typeof settings.vibrationEnabled === 'boolean') {
        validatedSettings.vibrationEnabled = settings.vibrationEnabled;
      }
      
      validatedSettings.version = 1;
    } else {
      // Current version, validate all properties
      Object.keys(validatedSettings).forEach(key => {
        if (settings[key] !== undefined) {
          (validatedSettings as any)[key] = settings[key];
        }
      });
    }

    // Ensure all required properties exist
    validatedSettings.categories = {
      ...DEFAULT_NOTIFICATION_SETTINGS.categories,
      ...(settings.categories || {}),
    };

    validatedSettings.quietHours = {
      ...DEFAULT_NOTIFICATION_SETTINGS.quietHours,
      ...(settings.quietHours || {}),
    };

    return validatedSettings;
  }

  /**
   * Get storage usage statistics
   */
  public async getStorageStats(): Promise<{
    settingsSize: number;
    pushTokenSize: number;
    totalSize: number;
  }> {
    try {
      const [settingsJson, pushToken] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS),
        AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN),
      ]);

      const settingsSize = settingsJson ? new Blob([settingsJson]).size : 0;
      const pushTokenSize = pushToken ? new Blob([pushToken]).size : 0;

      return {
        settingsSize,
        pushTokenSize,
        totalSize: settingsSize + pushTokenSize,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return { settingsSize: 0, pushTokenSize: 0, totalSize: 0 };
    }
  }
}

// Export singleton instance
export const settingsStorage = SettingsStorage.getInstance();

// Convenience functions for direct use
export const loadNotificationSettings = () => settingsStorage.loadSettings();
export const saveNotificationSettings = (settings: NotificationSettings) => 
  settingsStorage.saveSettings(settings);
export const updateNotificationSettings = (updates: Partial<NotificationSettings>) => 
  settingsStorage.updateSettings(updates);
export const resetNotificationSettings = () => settingsStorage.resetSettings();
export const clearNotificationStorage = () => settingsStorage.clearStorage();
