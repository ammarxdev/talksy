/**
 * Notification Service
 * Core service for handling all notification operations using expo-notifications
 */

import * as Device from 'expo-device';
import { Platform, Linking } from 'react-native';

// Conditional import for expo-notifications to handle Expo Go compatibility
let Notifications: typeof import('expo-notifications') | null = null;
let isNotificationsAvailable = false;

try {
  Notifications = require('expo-notifications');
  isNotificationsAvailable = true;
} catch (error) {
  isNotificationsAvailable = false;
}
import {
  NotificationSettings,
  NotificationContent,
  NotificationTrigger,
  ScheduledNotification,
  PermissionRequestResult,
  NotificationServiceStatus,
  NotificationPermissionStatus,
  NotificationCategory,
  NotificationPriority,
  NOTIFICATION_CHANNELS,
  NotificationError,
  NOTIFICATION_ERROR_CODES,
} from '@/types/notifications';
import { settingsStorage } from '@/utils/settingsStorage';

/**
 * Core Notification Service Class
 */
export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private notificationHandler: any | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('Initializing notification service...');

      // Check if notifications are available
      if (!isNotificationsAvailable || !Notifications) {
        console.warn('Notifications not available - running in fallback mode');
        this.isInitialized = true;
        return;
      }

      // Set up notification handler
      this.setupNotificationHandler();

      // Set up notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      this.isInitialized = true;
      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      // Don't throw error - just mark as initialized in fallback mode
      this.isInitialized = true;
      console.warn('Notification service running in fallback mode');
    }
  }

  /**
   * Check current permission status
   */
  public async checkPermissionStatus(): Promise<NotificationPermissionStatus> {
    try {
      if (!isNotificationsAvailable || !Notifications) {
        return 'undetermined';
      }
      const { status } = await Notifications.getPermissionsAsync();
      return this.mapPermissionStatus(status);
    } catch (error) {
      console.error('Failed to check permission status:', error);
      return 'undetermined';
    }
  }

  /**
   * Request notification permissions
   */
  public async requestPermissions(): Promise<PermissionRequestResult> {
    try {
      // Check if notifications are available
      if (!isNotificationsAvailable || !Notifications) {
        return {
          granted: false,
          status: 'undetermined',
          canAskAgain: false,
        };
      }

      // Check if we're on a physical device
      if (!Device.isDevice) {
        throw new NotificationError(
          'Notifications are not supported on simulators/emulators',
          NOTIFICATION_ERROR_CODES.SERVICE_UNAVAILABLE
        );
      }

      // Get current status first
      const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === 'granted') {
        return {
          granted: true,
          status: 'granted',
          canAskAgain: true,
        };
      }

      // If we can't ask again, return current status
      if (!canAskAgain) {
        return {
          granted: false,
          status: this.mapPermissionStatus(existingStatus),
          canAskAgain: false,
        };
      }

      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: true,
          allowCriticalAlerts: false,
          provideAppNotificationSettings: true,
          allowProvisional: false,
        },
      });

      const granted = status === 'granted';
      const mappedStatus = this.mapPermissionStatus(status);

      // Save permission check timestamp
      await settingsStorage.saveLastPermissionCheck();

      // Update settings with new permission status
      await settingsStorage.updateSettings({
        permissionStatus: mappedStatus,
        lastPermissionRequest: Date.now(),
      });

      return {
        granted,
        status: mappedStatus,
        canAskAgain: status !== 'denied',
      };
    } catch (error) {
      console.error('Failed to request permissions:', error);
      throw new NotificationError(
        'Failed to request notification permissions',
        NOTIFICATION_ERROR_CODES.PERMISSION_REQUIRED
      );
    }
  }

  /**
   * Get service status
   */
  public async getServiceStatus(): Promise<NotificationServiceStatus> {
    try {
      const permissionStatus = await this.checkPermissionStatus();
      const hasPermission = permissionStatus === 'granted';

      return {
        isAvailable: Device.isDevice,
        permissionStatus,
        hasPermission,
        canScheduleNotifications: hasPermission && this.isInitialized,
        pushTokenAvailable: hasPermission && Device.isDevice,
      };
    } catch (error) {
      console.error('Failed to get service status:', error);
      return {
        isAvailable: false,
        permissionStatus: 'undetermined',
        hasPermission: false,
        canScheduleNotifications: false,
        pushTokenAvailable: false,
      };
    }
  }

  /**
   * Schedule a notification
   */
  public async scheduleNotification(
    content: NotificationContent,
    trigger: NotificationTrigger = { type: 'immediate' }
  ): Promise<string> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check if notifications are available
      if (!isNotificationsAvailable || !Notifications) {
        console.log('Notifications not available - skipping notification');
        return 'fallback-id-' + Date.now();
      }

      // Check permissions
      const status = await this.checkPermissionStatus();
      if (status !== 'granted') {
        throw new NotificationError(
          'Notification permissions not granted',
          NOTIFICATION_ERROR_CODES.PERMISSION_DENIED,
          content.category
        );
      }

      // Check if notifications are enabled for this category
      const settings = await settingsStorage.loadSettings();
      if (!settings.enabled || !settings.categories[content.category]) {
        throw new NotificationError(
          `Notifications disabled for category: ${content.category}`,
          NOTIFICATION_ERROR_CODES.PERMISSION_DENIED,
          content.category
        );
      }

      // Check quiet hours
      if (this.isQuietHours(settings)) {
        console.log('Skipping notification due to quiet hours');
        throw new NotificationError(
          'Notification skipped due to quiet hours',
          NOTIFICATION_ERROR_CODES.QUIET_HOURS_ACTIVE,
          content.category
        );
      }

      // Prepare notification content
      const notificationContent: any = {
        title: content.title,
        body: content.body,
        data: content.data || {},
        sound: settings.soundEnabled && (content.sound !== false),
        badge: 1,
      };

      // Add category-specific settings
      if (Platform.OS === 'android') {
        const channelConfig = NOTIFICATION_CHANNELS[content.category];
        notificationContent.categoryIdentifier = channelConfig.id;
      }

      // Prepare trigger
      const notificationTrigger = this.prepareTrigger(trigger);

      // Schedule the notification
      const identifier = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: notificationTrigger,
      });

      console.log(`Notification scheduled with ID: ${identifier}`);
      return identifier;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      if (error instanceof NotificationError) {
        throw error;
      }
      throw new NotificationError(
        'Failed to schedule notification',
        NOTIFICATION_ERROR_CODES.SCHEDULING_FAILED,
        content.category
      );
    }
  }

  /**
   * Cancel a specific notification
   */
  public async cancelNotification(identifier: string): Promise<void> {
    try {
      if (!isNotificationsAvailable || !Notifications) {
        console.log('Notifications not available - skipping cancel');
        return;
      }
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log(`Notification cancelled: ${identifier}`);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
      throw new NotificationError(
        'Failed to cancel notification',
        NOTIFICATION_ERROR_CODES.SCHEDULING_FAILED
      );
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  public async cancelAllNotifications(): Promise<void> {
    try {
      if (!isNotificationsAvailable || !Notifications) {
        console.log('Notifications not available - skipping cancel all');
        return;
      }
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
      throw new NotificationError(
        'Failed to cancel all notifications',
        NOTIFICATION_ERROR_CODES.SCHEDULING_FAILED
      );
    }
  }

  /**
   * Get all scheduled notifications
   */
  public async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    try {
      if (!isNotificationsAvailable || !Notifications) {
        return [];
      }
      const notifications = await Notifications.getAllScheduledNotificationsAsync();

      return notifications.map(notification => ({
        id: notification.identifier,
        content: {
          title: notification.content.title || '',
          body: notification.content.body || '',
          data: notification.content.data || {},
          category: this.extractCategoryFromData(notification.content.data),
          priority: NotificationPriority.NORMAL,
          sound: notification.content.sound !== null && notification.content.sound !== undefined,
        },
        trigger: this.mapTriggerFromNotification(notification.trigger),
        createdAt: Date.now(), // We don't have the actual creation time
      }));
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Open device notification settings
   */
  public openSettings(): void {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }

  /**
   * Set up notification handler
   */
  private setupNotificationHandler(): void {
    if (!isNotificationsAvailable || !Notifications) {
      return;
    }

    this.notificationHandler = {
      handleNotification: async (_notification: any) => {
        const settings = await settingsStorage.loadSettings();

        return {
          shouldShowBanner: settings.enabled,
          shouldShowList: settings.enabled,
          shouldPlaySound: settings.soundEnabled,
          shouldSetBadge: true,
        };
      },
    };

    Notifications.setNotificationHandler(this.notificationHandler);
  }

  /**
   * Set up Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    if (Platform.OS !== 'android' || !isNotificationsAvailable || !Notifications) {
      return;
    }

    try {
      const channelPromises = Object.values(NOTIFICATION_CHANNELS).map(channel =>
        Notifications.setNotificationChannelAsync(channel.id, {
          name: channel.name,
          description: channel.description,
          importance: this.mapAndroidImportance(channel.importance),
          sound: channel.sound ? 'default' : null,
          vibrationPattern: channel.vibrate ? [0, 250, 250, 250] : undefined,
          lightColor: '#667eea',
        })
      );

      await Promise.all(channelPromises);
      console.log('Android notification channels set up successfully');
    } catch (error) {
      console.error('Failed to set up Android channels:', error);
    }
  }

  /**
   * Map permission status from expo-notifications to our type
   */
  private mapPermissionStatus(status: any): NotificationPermissionStatus {
    switch (status) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      default:
        return 'undetermined';
    }
  }

  /**
   * Map Android importance level
   */
  private mapAndroidImportance(importance: string): any {
    if (!isNotificationsAvailable || !Notifications) {
      return 3; // Default importance
    }
    switch (importance) {
      case 'high':
        return (Notifications as any).AndroidImportance.HIGH;
      case 'low':
        return (Notifications as any).AndroidImportance.LOW;
      default:
        return (Notifications as any).AndroidImportance.DEFAULT;
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(settings: NotificationSettings): boolean {
    if (!settings.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMinute] = settings.quietHours.startTime.split(':').map(Number);
    const [endHour, endMinute] = settings.quietHours.endTime.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime <= endTime) {
      // Same day range (e.g., 09:00 to 17:00)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight range (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Prepare notification trigger for expo-notifications
   */
  private prepareTrigger(trigger: NotificationTrigger): any {
    if (!isNotificationsAvailable || !Notifications) {
      return null;
    }

    switch (trigger.type) {
      case 'immediate':
        return null;
      case 'delay':
        return {
          type: (Notifications as any).SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: trigger.seconds,
          repeats: false,
        };
      case 'date':
        return {
          type: (Notifications as any).SchedulableTriggerInputTypes.DATE,
          date: trigger.date,
        };
      case 'daily':
        return {
          type: (Notifications as any).SchedulableTriggerInputTypes.DAILY,
          hour: trigger.hour,
          minute: trigger.minute,
        };
      case 'weekly':
        return {
          type: (Notifications as any).SchedulableTriggerInputTypes.WEEKLY,
          weekday: trigger.weekday,
          hour: trigger.hour,
          minute: trigger.minute,
        };
      default:
        return null;
    }
  }

  /**
   * Extract category from notification data
   */
  private extractCategoryFromData(data: any): NotificationCategory {
    return data?.category || NotificationCategory.SYSTEM;
  }

  /**
   * Map trigger from expo-notifications format
   */
  private mapTriggerFromNotification(trigger: any): NotificationTrigger {
    if (!trigger) {
      return { type: 'immediate' };
    }

    // This is a simplified mapping - expo-notifications trigger format is complex
    return { type: 'immediate' };
  }

  /**
   * Get push token for remote notifications
   */
  public async getPushToken(): Promise<string | null> {
    try {
      if (!isNotificationsAvailable || !Notifications) {
        console.log('Push tokens not available - notifications module not loaded');
        return null;
      }

      if (!Device.isDevice) {
        console.log('Push tokens are not available on simulators/emulators');
        return null;
      }

      const status = await this.checkPermissionStatus();
      if (status !== 'granted') {
        console.log('Push token requires notification permissions');
        return null;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'b6138f52-f6b1-4b67-99fc-011b3a54a28d', // Your EAS project ID
      });

      const token = tokenData.data;

      // Save token to storage
      await settingsStorage.savePushToken(token);

      console.log('Push token obtained:', token.substring(0, 20) + '...');
      return token;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Dismiss a specific notification
   */
  public async dismissNotification(identifier: string): Promise<void> {
    try {
      if (!isNotificationsAvailable || !Notifications) {
        return;
      }
      await Notifications.dismissNotificationAsync(identifier);
      console.log(`Notification dismissed: ${identifier}`);
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  }

  /**
   * Dismiss all notifications
   */
  public async dismissAllNotifications(): Promise<void> {
    try {
      if (!isNotificationsAvailable || !Notifications) {
        return;
      }
      await Notifications.dismissAllNotificationsAsync();
      console.log('All notifications dismissed');
    } catch (error) {
      console.error('Failed to dismiss all notifications:', error);
    }
  }

  /**
   * Set badge count
   */
  public async setBadgeCount(count: number): Promise<void> {
    try {
      if (!isNotificationsAvailable || !Notifications) {
        return;
      }
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }

  /**
   * Get badge count
   */
  public async getBadgeCount(): Promise<number> {
    try {
      if (!isNotificationsAvailable || !Notifications) {
        return 0;
      }
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Failed to get badge count:', error);
      return 0;
    }
  }

  /**
   * Check if notification service is available
   */
  public isAvailable(): boolean {
    return Device.isDevice && this.isInitialized;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
