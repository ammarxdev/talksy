/**
 * Notification Context
 * React context for managing notification state and providing notification methods
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  NotificationSettings,
  NotificationContent,
  NotificationTrigger,
  ScheduledNotification,
  PermissionRequestResult,
  NotificationServiceStatus,
  NotificationPermissionStatus,
  NotificationCategory,
  NotificationContextType,
  DEFAULT_NOTIFICATION_SETTINGS,
  NotificationError,
  NOTIFICATION_ERROR_CODES,
} from '@/types/notifications';
import { notificationService } from '@/services/NotificationService';
import { settingsStorage } from '@/utils/settingsStorage';

/**
 * Notification Context
 */
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Notification Provider Props
 */
interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * Notification Provider Component
 */
export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  // State
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [serviceStatus, setServiceStatus] = useState<NotificationServiceStatus>({
    isAvailable: false,
    permissionStatus: 'undetermined',
    hasPermission: false,
    canScheduleNotifications: false,
    pushTokenAvailable: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notification listeners
  const [notificationListener, setNotificationListener] = useState<Notifications.EventSubscription | null>(null);
  const [responseListener, setResponseListener] = useState<Notifications.EventSubscription | null>(null);

  /**
   * Initialize the notification system
   */
  const initialize = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Initializing notification context...');

      // Initialize the notification service
      await notificationService.initialize();

      // Load settings from storage
      const loadedSettings = await settingsStorage.loadSettings();
      setSettings(loadedSettings);

      // Get service status
      const status = await notificationService.getServiceStatus();
      setServiceStatus(status);

      // Set up notification listeners
      setupNotificationListeners();

      console.log('Notification context initialized successfully');
    } catch (err) {
      console.error('Failed to initialize notification context:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Set up notification event listeners
   */
  const setupNotificationListeners = useCallback(() => {
    // Clean up existing listeners
    if (notificationListener) {
      notificationListener.remove();
    }
    if (responseListener) {
      responseListener.remove();
    }

    // Set up new listeners
    const newNotificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Handle incoming notification
      handleNotificationReceived(notification);
    });

    const newResponseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      // Handle notification interaction
      handleNotificationResponse(response);
    });

    setNotificationListener(newNotificationListener);
    setResponseListener(newResponseListener);
  }, [notificationListener, responseListener]);

  /**
   * Handle incoming notification
   */
  const handleNotificationReceived = useCallback((notification: Notifications.Notification) => {
    console.log('Notification received in foreground:', {
      title: notification.request.content.title,
      body: notification.request.content.body,
      data: notification.request.content.data,
    });

    // Update badge count
    notificationService.getBadgeCount().then(count => {
      notificationService.setBadgeCount(count + 1);
    });

    // You can add custom logic here based on notification category
    const category = notification.request.content.data?.category;
    if (category) {
      console.log(`Received ${category} notification`);
    }
  }, []);

  /**
   * Handle notification response (user interaction)
   */
  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    console.log('User interacted with notification:', {
      actionIdentifier: response.actionIdentifier,
      data: response.notification.request.content.data,
    });

    const data = response.notification.request.content.data;
    const category = data?.category;

    // Handle different notification categories
    switch (category) {
      case 'ai_response':
        // Navigate to conversation or show AI response
        console.log('User tapped AI response notification');
        break;
      case 'error':
        // Show error details or navigate to error screen
        console.log('User tapped error notification');
        break;
      case 'reminder':
        // Handle reminder action
        console.log('User tapped reminder notification');
        break;
      default:
        console.log('User tapped notification with unknown category:', category);
    }

    // Clear badge count when user interacts with notification
    notificationService.setBadgeCount(0);
  }, []);

  /**
   * Update notification settings
   */
  const updateSettings = useCallback(async (updates: Partial<NotificationSettings>): Promise<void> => {
    try {
      setError(null);
      const updatedSettings = await settingsStorage.updateSettings(updates);
      setSettings(updatedSettings);

      // Update service status if permission-related changes
      if (updates.permissionStatus || updates.enabled !== undefined) {
        const status = await notificationService.getServiceStatus();
        setServiceStatus(status);
      }

      console.log('Notification settings updated:', updates);
    } catch (err) {
      console.error('Failed to update notification settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      throw err;
    }
  }, []);

  /**
   * Reset notification settings
   */
  const resetSettings = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const defaultSettings = await settingsStorage.resetSettings();
      setSettings(defaultSettings);

      const status = await notificationService.getServiceStatus();
      setServiceStatus(status);

      console.log('Notification settings reset to defaults');
    } catch (err) {
      console.error('Failed to reset notification settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset settings');
      throw err;
    }
  }, []);

  /**
   * Request notification permissions
   */
  const requestPermissions = useCallback(async (): Promise<PermissionRequestResult> => {
    try {
      setError(null);
      const result = await notificationService.requestPermissions();

      // Update settings with new permission status
      await updateSettings({
        permissionStatus: result.status,
        lastPermissionRequest: Date.now(),
      });

      return result;
    } catch (err) {
      console.error('Failed to request permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to request permissions');
      throw err;
    }
  }, [updateSettings]);

  /**
   * Check current permission status
   */
  const checkPermissions = useCallback(async (): Promise<NotificationPermissionStatus> => {
    try {
      const status = await notificationService.checkPermissionStatus();
      
      // Update settings if status changed
      if (status !== settings.permissionStatus) {
        await updateSettings({ permissionStatus: status });
      }

      return status;
    } catch (err) {
      console.error('Failed to check permissions:', err);
      return 'undetermined';
    }
  }, [settings.permissionStatus, updateSettings]);

  /**
   * Open device notification settings
   */
  const openSettings = useCallback(() => {
    notificationService.openSettings();
  }, []);

  /**
   * Schedule a notification
   */
  const scheduleNotification = useCallback(async (
    content: NotificationContent,
    trigger: NotificationTrigger = { type: 'immediate' }
  ): Promise<string> => {
    try {
      setError(null);
      return await notificationService.scheduleNotification(content, trigger);
    } catch (err) {
      console.error('Failed to schedule notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to schedule notification');
      throw err;
    }
  }, []);

  /**
   * Cancel a notification
   */
  const cancelNotification = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await notificationService.cancelNotification(id);
    } catch (err) {
      console.error('Failed to cancel notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel notification');
      throw err;
    }
  }, []);

  /**
   * Cancel all notifications
   */
  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await notificationService.cancelAllNotifications();
    } catch (err) {
      console.error('Failed to cancel all notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel all notifications');
      throw err;
    }
  }, []);

  /**
   * Get scheduled notifications
   */
  const getScheduledNotifications = useCallback(async (): Promise<ScheduledNotification[]> => {
    try {
      return await notificationService.getScheduledNotifications();
    } catch (err) {
      console.error('Failed to get scheduled notifications:', err);
      return [];
    }
  }, []);

  /**
   * Check if currently in quiet hours
   */
  const isQuietHours = useCallback((): boolean => {
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
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  }, [settings.quietHours]);

  /**
   * Check if notifications can be sent for a category
   */
  const canSendNotification = useCallback((category: NotificationCategory): boolean => {
    return (
      settings.enabled &&
      settings.categories[category] &&
      serviceStatus.hasPermission &&
      !isQuietHours()
    );
  }, [settings, serviceStatus.hasPermission, isQuietHours]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App became active, check if permissions changed
        checkPermissions().catch(console.error);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [checkPermissions]);

  // Initialize on mount
  useEffect(() => {
    initialize();

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener) {
        notificationListener.remove();
      }
      if (responseListener) {
        responseListener.remove();
      }
    };
  }, [initialize]);

  // Context value
  const contextValue: NotificationContextType = {
    // Settings
    settings,
    updateSettings,
    resetSettings,
    
    // Permissions
    requestPermissions,
    checkPermissions,
    openSettings,
    
    // Notifications
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    getScheduledNotifications,
    
    // Status
    serviceStatus,
    isLoading,
    error,
    
    // Utility methods
    isQuietHours,
    canSendNotification,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Hook to use notification context
 */
export const useNotificationContext = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationProvider;
