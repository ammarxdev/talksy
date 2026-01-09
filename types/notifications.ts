/**
 * Notification Types and Interfaces
 * Defines all TypeScript interfaces for the notification system
 */

import { PermissionStatus } from 'expo-notifications';

// Core notification permission states
export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

// Notification categories for different types of notifications
export enum NotificationCategory {
  SYSTEM = 'system',

  REMINDER = 'reminder',
  ERROR = 'error',

}

// Notification priority levels
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Main notification settings interface
export interface NotificationSettings {
  // Global notification toggle
  enabled: boolean;

  // Permission status
  permissionStatus: NotificationPermissionStatus;

  // Last time permission was requested (timestamp)
  lastPermissionRequest: number | null;

  // Sound and vibration preferences
  soundEnabled: boolean;
  vibrationEnabled: boolean;

  // Category-specific settings
  categories: {
    [NotificationCategory.SYSTEM]: boolean;

    [NotificationCategory.REMINDER]: boolean;
    [NotificationCategory.ERROR]: boolean;

  };

  // Advanced settings
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string;   // HH:MM format
  };

  // Push notification token (for future push notifications)
  pushToken: string | null;

  // Settings version for migration purposes
  version: number;
}

// Default notification settings
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  permissionStatus: 'undetermined',
  lastPermissionRequest: null,
  soundEnabled: true,
  vibrationEnabled: true,
  categories: {
    [NotificationCategory.SYSTEM]: true,

    [NotificationCategory.REMINDER]: true,
    [NotificationCategory.ERROR]: true,

  },
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
  },
  pushToken: null,
  version: 1,
};

// Notification content interface
export interface NotificationContent {
  title: string;
  body: string;
  data?: Record<string, any>;
  category: NotificationCategory;
  priority: NotificationPriority;
  sound?: boolean;
  vibrate?: boolean;
}

// Scheduled notification interface
export interface ScheduledNotification {
  id: string;
  content: NotificationContent;
  trigger: NotificationTrigger;
  createdAt: number;
}

// Notification trigger types
export type NotificationTrigger =
  | { type: 'immediate' }
  | { type: 'delay'; seconds: number }
  | { type: 'date'; date: Date }
  | { type: 'daily'; hour: number; minute: number }
  | { type: 'weekly'; weekday: number; hour: number; minute: number };

// Permission request result
export interface PermissionRequestResult {
  granted: boolean;
  status: NotificationPermissionStatus;
  canAskAgain: boolean;
}

// Notification service status
export interface NotificationServiceStatus {
  isAvailable: boolean;
  permissionStatus: NotificationPermissionStatus;
  hasPermission: boolean;
  canScheduleNotifications: boolean;
  pushTokenAvailable: boolean;
}

// Notification event types
export interface NotificationReceivedEvent {
  notification: {
    request: {
      identifier: string;
      content: NotificationContent;
    };
  };
}

export interface NotificationResponseEvent {
  notification: NotificationReceivedEvent['notification'];
  actionIdentifier: string;
  userText?: string;
}

// Context interface for notification provider
export interface NotificationContextType {
  // Settings
  settings: NotificationSettings;
  updateSettings: (updates: Partial<NotificationSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;

  // Permissions
  requestPermissions: () => Promise<PermissionRequestResult>;
  checkPermissions: () => Promise<NotificationPermissionStatus>;
  openSettings: () => void;

  // Notifications
  scheduleNotification: (content: NotificationContent, trigger?: NotificationTrigger) => Promise<string>;
  cancelNotification: (id: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  getScheduledNotifications: () => Promise<ScheduledNotification[]>;

  // Status
  serviceStatus: NotificationServiceStatus;
  isLoading: boolean;
  error: string | null;

  // Utility methods
  isQuietHours: () => boolean;
  canSendNotification: (category: NotificationCategory) => boolean;
}

// Hook return type
export interface UseNotificationsReturn extends NotificationContextType {
  // Additional convenience methods
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => Promise<void>;
  toggleCategory: (category: NotificationCategory, enabled: boolean) => Promise<void>;

  // Quick notification methods
  showSystemNotification: (title: string, body: string, data?: Record<string, any>) => Promise<void>;

  showErrorNotification: (title: string, body: string, data?: Record<string, any>) => Promise<void>;
  showReminderNotification: (title: string, body: string, trigger?: NotificationTrigger, data?: Record<string, any>) => Promise<string | null>;


  // Additional utility methods
  getNotificationStatus: () => {
    enabled: boolean;
    hasPermission: boolean;
    canSchedule: boolean;
    permissionStatus: NotificationPermissionStatus;
    scheduledCount: number;
    lastPermissionRequest: number | null;
  };
  scheduleDelayedNotification: (content: NotificationContent, delaySeconds: number) => Promise<string>;
  isNotificationEnabled: (category: NotificationCategory) => boolean;
  ensurePermissions: () => Promise<boolean>;
  updateQuietHours: (enabled: boolean, startTime?: string, endTime?: string) => Promise<void>;
}

// Storage keys for AsyncStorage
export const STORAGE_KEYS = {
  NOTIFICATION_SETTINGS: '@voice_assistant/notification_settings',
  PUSH_TOKEN: '@voice_assistant/push_token',
  LAST_PERMISSION_CHECK: '@voice_assistant/last_permission_check',
} as const;

// Notification channel configurations for Android
export const NOTIFICATION_CHANNELS = {
  [NotificationCategory.SYSTEM]: {
    id: 'system',
    name: 'System Notifications',
    description: 'Important system notifications and updates',
    importance: 'high' as const,
    sound: true,
    vibrate: true,
  },

  [NotificationCategory.REMINDER]: {
    id: 'reminder',
    name: 'Reminders',
    description: 'Conversation and task reminders',
    importance: 'normal' as const,
    sound: true,
    vibrate: true,
  },
  [NotificationCategory.ERROR]: {
    id: 'error',
    name: 'Error Notifications',
    description: 'Error alerts and warnings',
    importance: 'high' as const,
    sound: true,
    vibrate: true,
  },

} as const;

// Error types for notification system
export class NotificationError extends Error {
  constructor(
    message: string,
    public code: string,
    public category?: NotificationCategory
  ) {
    super(message);
    this.name = 'NotificationError';
  }
}

export const NOTIFICATION_ERROR_CODES = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  PERMISSION_REQUIRED: 'PERMISSION_REQUIRED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INVALID_CONTENT: 'INVALID_CONTENT',
  SCHEDULING_FAILED: 'SCHEDULING_FAILED',
  STORAGE_ERROR: 'STORAGE_ERROR',
  QUIET_HOURS_ACTIVE: 'QUIET_HOURS_ACTIVE',
} as const;
