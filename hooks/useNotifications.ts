/**
 * useNotifications Hook
 * Convenient wrapper for the notification context with additional utility methods
 */

import { useCallback } from 'react';
import { useNotificationContext } from '@/contexts/NotificationContext';
import {
  UseNotificationsReturn,
  NotificationCategory,
  NotificationPriority,
  NotificationContent,
  NotificationTrigger,
} from '@/types/notifications';

/**
 * Custom hook for notification functionality
 * Provides easy-to-use methods for common notification operations
 */
export const useNotifications = (): UseNotificationsReturn => {
  const context = useNotificationContext();

  /**
   * Enable notifications (request permissions and update settings)
   */
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    try {
      // Request permissions first
      const permissionResult = await context.requestPermissions();

      if (permissionResult.granted) {
        // Update settings to enable notifications
        await context.updateSettings({ enabled: true });
        return true;
      } else {
        // Permission denied, but still update settings to reflect user intent
        await context.updateSettings({
          enabled: false,
          permissionStatus: permissionResult.status
        });
        return false;
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      return false;
    }
  }, [context]);

  /**
   * Disable notifications
   */
  const disableNotifications = useCallback(async (): Promise<void> => {
    try {
      // Cancel all scheduled notifications
      await context.cancelAllNotifications();

      // Update settings to disable notifications
      await context.updateSettings({ enabled: false });
    } catch (error) {
      console.error('Failed to disable notifications:', error);
      throw error;
    }
  }, [context]);

  /**
   * Toggle a specific notification category
   */
  const toggleCategory = useCallback(async (
    category: NotificationCategory,
    enabled: boolean
  ): Promise<void> => {
    try {
      await context.updateSettings({
        categories: {
          ...context.settings.categories,
          [category]: enabled,
        },
      });
    } catch (error) {
      console.error(`Failed to toggle category ${category}:`, error);
      throw error;
    }
  }, [context]);

  /**
   * Show a system notification
   */
  const showSystemNotification = useCallback(async (
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> => {
    try {
      if (!context.canSendNotification(NotificationCategory.SYSTEM)) {
        console.log('System notifications are disabled or not permitted');
        return;
      }

      const content: NotificationContent = {
        title,
        body,
        data: { ...data, category: NotificationCategory.SYSTEM },
        category: NotificationCategory.SYSTEM,
        priority: NotificationPriority.HIGH,
        sound: true,
        vibrate: true,
      };

      await context.scheduleNotification(content);
    } catch (error) {
      console.error('Failed to show system notification:', error);
      throw error;
    }
  }, [context]);



  /**
   * Show an error notification
   */
  const showErrorNotification = useCallback(async (
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> => {
    try {
      if (!context.canSendNotification(NotificationCategory.ERROR)) {
        console.log('Error notifications are disabled or not permitted');
        return;
      }

      const content: NotificationContent = {
        title,
        body,
        data: { ...data, category: NotificationCategory.ERROR },
        category: NotificationCategory.ERROR,
        priority: NotificationPriority.HIGH,
        sound: true,
        vibrate: true,
      };

      await context.scheduleNotification(content);
    } catch (error) {
      console.error('Failed to show error notification:', error);
      throw error;
    }
  }, [context]);

  /**
   * Show a reminder notification
   */
  const showReminderNotification = useCallback(async (
    title: string,
    body: string,
    trigger: NotificationTrigger = { type: 'immediate' },
    data?: Record<string, any>
  ): Promise<string | null> => {
    try {
      if (!context.canSendNotification(NotificationCategory.REMINDER)) {
        console.log('Reminder notifications are disabled or not permitted');
        return null;
      }

      const content: NotificationContent = {
        title,
        body,
        data: { ...data, category: NotificationCategory.REMINDER },
        category: NotificationCategory.REMINDER,
        priority: NotificationPriority.NORMAL,
        sound: true,
        vibrate: true,
      };

      return await context.scheduleNotification(content, trigger);
    } catch (error) {
      console.error('Failed to show reminder notification:', error);
      throw error;
    }
  }, [context]);



  /**
   * Schedule a delayed notification
   */
  const scheduleDelayedNotification = useCallback(async (
    content: NotificationContent,
    delaySeconds: number
  ): Promise<string> => {
    try {
      if (!context.canSendNotification(content.category)) {
        console.log(`${content.category} notifications are disabled or not permitted`);
        throw new Error(`${content.category} notifications are disabled or not permitted`);
      }

      const trigger: NotificationTrigger = {
        type: 'delay',
        seconds: delaySeconds,
      };

      return await context.scheduleNotification(content, trigger);
    } catch (error) {
      console.error('Failed to schedule delayed notification:', error);
      throw error;
    }
  }, [context]);

  /**
   * Check if notifications are fully enabled and permitted
   */
  const isNotificationEnabled = useCallback((): boolean => {
    return (
      context.settings.enabled &&
      context.serviceStatus.hasPermission &&
      context.serviceStatus.canScheduleNotifications
    );
  }, [context.settings.enabled, context.serviceStatus]);

  /**
   * Get notification status summary
   */
  const getNotificationStatus = useCallback(() => {
    return {
      enabled: context.settings.enabled,
      hasPermission: context.serviceStatus.hasPermission,
      canSchedule: context.serviceStatus.canScheduleNotifications,
      permissionStatus: context.settings.permissionStatus,
      scheduledCount: 0, // Note: Actual count requires async call to getScheduledNotifications()
      lastPermissionRequest: context.settings.lastPermissionRequest,
    };
  }, [context]);

  /**
   * Quick permission check and request if needed
   */
  const ensurePermissions = useCallback(async (): Promise<boolean> => {
    try {
      // Check current status
      const currentStatus = await context.checkPermissions();

      if (currentStatus === 'granted') {
        return true;
      }

      if (currentStatus === 'denied') {
        // Permission was denied, can't request again
        return false;
      }

      // Permission is undetermined, request it
      const result = await context.requestPermissions();
      return result.granted;
    } catch (error) {
      console.error('Failed to ensure permissions:', error);
      return false;
    }
  }, [context]);

  /**
   * Update quiet hours settings
   */
  const updateQuietHours = useCallback(async (
    enabled: boolean,
    startTime?: string,
    endTime?: string
  ): Promise<void> => {
    try {
      const updates: any = {
        quietHours: {
          ...context.settings.quietHours,
          enabled,
        },
      };

      if (startTime) {
        updates.quietHours.startTime = startTime;
      }
      if (endTime) {
        updates.quietHours.endTime = endTime;
      }

      await context.updateSettings(updates);
    } catch (error) {
      console.error('Failed to update quiet hours:', error);
      throw error;
    }
  }, [context]);

  // Return all context methods plus additional convenience methods
  return {
    // Context methods
    ...context,

    // Additional convenience methods
    enableNotifications,
    disableNotifications,
    toggleCategory,
    showSystemNotification,

    showErrorNotification,
    showReminderNotification,

    scheduleDelayedNotification,
    isNotificationEnabled,
    getNotificationStatus,
    ensurePermissions,
    updateQuietHours,
  };
};

export default useNotifications;
