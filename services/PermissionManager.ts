import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { openSettings } from 'expo-linking';

// Permission types
export type PermissionType =
  | 'microphone'
  | 'camera'
  | 'contacts'
  | 'location'
  | 'notifications'
  | 'photos'
  | 'speechRecognition';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'restricted';

export interface PermissionResult {
  status: PermissionStatus;
  granted: boolean;
  canAskAgain: boolean;
  expires?: 'never' | number;
}

export interface PermissionInfo {
  type: PermissionType;
  title: string;
  description: string;
  reason: string;
  settingsHint: string;
  icon: string;
  required: boolean;
}

// Permission configurations
const PERMISSION_CONFIGS: Record<PermissionType, PermissionInfo> = {
  microphone: {
    type: 'microphone',
    title: 'Microphone Access',
    description: 'Allow Talksy to access your microphone',
    reason: 'We need microphone access to listen to your voice commands and provide voice assistant functionality.',
    settingsHint: Platform.OS === 'ios'
      ? 'Go to Settings > Privacy & Security > Microphone > Talksy and enable access.'
      : 'Go to Settings > Apps > Talksy > Permissions > Microphone and enable access.',
    icon: 'mic.fill',
    required: true,
  },

  camera: {
    type: 'camera',
    title: 'Camera Access',
    description: 'Allow Talksy to access your camera',
    reason: 'We need camera access to let you take profile pictures and photos.',
    settingsHint: Platform.OS === 'ios'
      ? 'Go to Settings > Privacy & Security > Camera > Talksy and enable access.'
      : 'Go to Settings > Apps > Talksy > Permissions > Camera and enable access.',
    icon: 'camera.fill',
    required: false,
  },

  contacts: {
    type: 'contacts',
    title: 'Contacts Access',
    description: 'Allow Talksy to access your contacts',
    reason: 'We need contacts access to help you make calls and send messages through voice commands.',
    settingsHint: Platform.OS === 'ios'
      ? 'Go to Settings > Privacy & Security > Contacts > Talksy and enable access.'
      : 'Go to Settings > Apps > Talksy > Permissions > Contacts and enable access.',
    icon: 'person.circle',
    required: false,
  },
  location: {
    type: 'location',
    title: 'Location Access',
    description: 'Allow Talksy to access your location',
    reason: 'We need location access to provide location-based services and weather information.',
    settingsHint: Platform.OS === 'ios'
      ? 'Go to Settings > Privacy & Security > Location Services > Talksy and enable access.'
      : 'Go to Settings > Apps > Talksy > Permissions > Location and enable access.',
    icon: 'magnifyingglass',
    required: false,
  },
  notifications: {
    type: 'notifications',
    title: 'Notification Access',
    description: 'Allow Talksy to send you notifications',
    reason: 'We need notification access to send you reminders and important updates.',
    settingsHint: Platform.OS === 'ios'
      ? 'Go to Settings > Notifications > Talksy and enable notifications.'
      : 'Go to Settings > Apps > Talksy > Notifications and enable notifications.',
    icon: 'bell',
    required: false,
  },
  photos: {
    type: 'photos',
    title: 'Photos Access',
    description: 'Allow Talksy to access your photos',
    reason: 'We need photos access to let you select images from your gallery.',
    settingsHint: Platform.OS === 'ios'
      ? 'Go to Settings > Privacy & Security > Photos > Talksy and enable access.'
      : 'Go to Settings > Apps > Talksy > Permissions > Storage and enable access.',
    icon: 'photo',
    required: false,
  },
  speechRecognition: {
    type: 'speechRecognition',
    title: 'Speech Recognition Access',
    description: 'Allow Talksy to use speech recognition',
    reason: 'We need speech recognition access to process your voice commands and provide accurate responses.',
    settingsHint: Platform.OS === 'ios'
      ? 'Go to Settings > Privacy & Security > Speech Recognition > Talksy and enable access.'
      : 'Go to Settings > Apps > Talksy > Permissions > Microphone and enable access.',
    icon: 'waveform',
    required: true,
  },
};

export class PermissionManager {
  private static instance: PermissionManager;
  private permissionCache: Map<PermissionType, { result: PermissionResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 1000; // 30 seconds

  private constructor() { }

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * Get permission configuration
   */
  public getPermissionInfo(type: PermissionType): PermissionInfo {
    return PERMISSION_CONFIGS[type];
  }

  /**
   * Get all permission configurations
   */
  public getAllPermissionInfos(): PermissionInfo[] {
    return Object.values(PERMISSION_CONFIGS);
  }

  /**
   * Check if permission result is cached and valid
   */
  private isCacheValid(type: PermissionType): boolean {
    const cached = this.permissionCache.get(type);
    if (!cached) return false;

    const now = Date.now();
    return (now - cached.timestamp) < this.CACHE_DURATION;
  }

  /**
   * Cache permission result
   */
  private cacheResult(type: PermissionType, result: PermissionResult): void {
    this.permissionCache.set(type, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear permission cache
   */
  public clearCache(type?: PermissionType): void {
    if (type) {
      this.permissionCache.delete(type);
    } else {
      this.permissionCache.clear();
    }
  }

  /**
   * Map native permission status to our standard format
   */
  private mapPermissionStatus(status: any): PermissionStatus {
    if (typeof status === 'string') {
      switch (status.toLowerCase()) {
        case 'granted':
          return 'granted';
        case 'denied':
          return 'denied';
        case 'undetermined':
        case 'undetermined':
          return 'undetermined';
        case 'restricted':
          return 'restricted';
        default:
          return 'undetermined';
      }
    }

    // Handle Expo permission status enums
    if (status === Location.PermissionStatus.GRANTED) return 'granted';
    if (status === Location.PermissionStatus.DENIED) return 'denied';
    if (status === Location.PermissionStatus.UNDETERMINED) return 'undetermined';

    return 'undetermined';
  }

  /**
   * Open device settings for the app
   */
  public async openAppSettings(): Promise<void> {
    try {
      await openSettings();
    } catch (error) {
      console.error('Failed to open app settings:', error);
      throw new Error('Unable to open settings. Please manually go to your device settings and find Talksy to manage permissions.');
    }
  }

  /**
   * Check permission status without requesting
   */
  public async checkPermission(type: PermissionType): Promise<PermissionResult> {
    // Return cached result if valid
    if (this.isCacheValid(type)) {
      return this.permissionCache.get(type)!.result;
    }

    try {
      let result: PermissionResult;

      switch (type) {
        case 'microphone':
          const audioPermission = await Audio.getPermissionsAsync();
          result = {
            status: this.mapPermissionStatus(audioPermission.status),
            granted: audioPermission.granted,
            canAskAgain: audioPermission.canAskAgain,
            expires: audioPermission.expires,
          };
          break;



        case 'camera':
          const cameraPermission = await ImagePicker.getCameraPermissionsAsync();
          result = {
            status: this.mapPermissionStatus(cameraPermission.status),
            granted: cameraPermission.granted,
            canAskAgain: cameraPermission.canAskAgain,
            expires: cameraPermission.expires,
          };
          break;



        case 'contacts':
          const contactsPermission = await Contacts.getPermissionsAsync();
          result = {
            status: this.mapPermissionStatus(contactsPermission.status),
            granted: contactsPermission.granted,
            canAskAgain: contactsPermission.canAskAgain,
          };
          break;

        case 'location':
          const locationPermission = await Location.getForegroundPermissionsAsync();
          result = {
            status: this.mapPermissionStatus(locationPermission.status),
            granted: locationPermission.granted,
            canAskAgain: locationPermission.canAskAgain,
          };
          break;

        case 'notifications':
          const notificationPermission = await Notifications.getPermissionsAsync();
          result = {
            status: this.mapPermissionStatus(notificationPermission.status),
            granted: notificationPermission.granted,
            canAskAgain: notificationPermission.canAskAgain,
            expires: notificationPermission.expires,
          };
          break;

        case 'photos':
          const photosPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
          result = {
            status: this.mapPermissionStatus(photosPermission.status),
            granted: photosPermission.granted,
            canAskAgain: photosPermission.canAskAgain,
            expires: photosPermission.expires,
          };
          break;

        case 'speechRecognition':
          // Speech recognition uses microphone permissions on most platforms
          const speechPermission = await Audio.getPermissionsAsync();
          result = {
            status: this.mapPermissionStatus(speechPermission.status),
            granted: speechPermission.granted,
            canAskAgain: speechPermission.canAskAgain,
            expires: speechPermission.expires,
          };
          break;

        default:
          throw new Error(`Unknown permission type: ${type}`);
      }

      // Cache the result
      this.cacheResult(type, result);
      return result;

    } catch (error) {
      console.error(`Failed to check ${type} permission:`, error);

      // Return default denied status on error
      const defaultResult: PermissionResult = {
        status: 'denied',
        granted: false,
        canAskAgain: true,
      };

      this.cacheResult(type, defaultResult);
      return defaultResult;
    }
  }

  /**
   * Request permission from user
   */
  public async requestPermission(type: PermissionType): Promise<PermissionResult> {
    try {
      // Clear cache to get fresh result
      this.clearCache(type);

      let result: PermissionResult;

      switch (type) {
        case 'microphone':
          const audioPermission = await Audio.requestPermissionsAsync();
          result = {
            status: this.mapPermissionStatus(audioPermission.status),
            granted: audioPermission.granted,
            canAskAgain: audioPermission.canAskAgain,
            expires: audioPermission.expires,
          };
          break;



        case 'camera':
          const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
          result = {
            status: this.mapPermissionStatus(cameraPermission.status),
            granted: cameraPermission.granted,
            canAskAgain: cameraPermission.canAskAgain,
            expires: cameraPermission.expires,
          };
          break;



        case 'contacts':
          const contactsPermission = await Contacts.requestPermissionsAsync();
          result = {
            status: this.mapPermissionStatus(contactsPermission.status),
            granted: contactsPermission.granted,
            canAskAgain: contactsPermission.canAskAgain,
          };
          break;

        case 'location':
          const locationPermission = await Location.requestForegroundPermissionsAsync();
          result = {
            status: this.mapPermissionStatus(locationPermission.status),
            granted: locationPermission.granted,
            canAskAgain: locationPermission.canAskAgain,
          };
          break;

        case 'notifications':
          const notificationPermission = await Notifications.requestPermissionsAsync();
          result = {
            status: this.mapPermissionStatus(notificationPermission.status),
            granted: notificationPermission.granted,
            canAskAgain: notificationPermission.canAskAgain,
            expires: notificationPermission.expires,
          };
          break;

        case 'photos':
          const photosPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          result = {
            status: this.mapPermissionStatus(photosPermission.status),
            granted: photosPermission.granted,
            canAskAgain: photosPermission.canAskAgain,
            expires: photosPermission.expires,
          };
          break;

        case 'speechRecognition':
          // Speech recognition uses microphone permissions on most platforms
          const speechPermission = await Audio.requestPermissionsAsync();
          result = {
            status: this.mapPermissionStatus(speechPermission.status),
            granted: speechPermission.granted,
            canAskAgain: speechPermission.canAskAgain,
            expires: speechPermission.expires,
          };
          break;

        default:
          throw new Error(`Unknown permission type: ${type}`);
      }

      // Cache the result
      this.cacheResult(type, result);
      return result;

    } catch (error) {
      console.error(`Failed to request ${type} permission:`, error);

      // Return default denied status on error
      const defaultResult: PermissionResult = {
        status: 'denied',
        granted: false,
        canAskAgain: true,
      };

      this.cacheResult(type, defaultResult);
      return defaultResult;
    }
  }

  /**
   * Check multiple permissions at once
   */
  public async checkMultiplePermissions(types: PermissionType[]): Promise<Record<PermissionType, PermissionResult>> {
    const results: Record<string, PermissionResult> = {};

    await Promise.all(
      types.map(async (type) => {
        results[type] = await this.checkPermission(type);
      })
    );

    return results as Record<PermissionType, PermissionResult>;
  }

  /**
   * Request multiple permissions at once
   */
  public async requestMultiplePermissions(types: PermissionType[]): Promise<Record<PermissionType, PermissionResult>> {
    const results: Record<string, PermissionResult> = {};

    // Request permissions sequentially to avoid overwhelming the user
    for (const type of types) {
      results[type] = await this.requestPermission(type);
    }

    return results as Record<PermissionType, PermissionResult>;
  }

  /**
   * Check if all required permissions are granted
   */
  public async areRequiredPermissionsGranted(): Promise<boolean> {
    const requiredPermissions = Object.values(PERMISSION_CONFIGS)
      .filter(config => config.required)
      .map(config => config.type);

    const results = await this.checkMultiplePermissions(requiredPermissions);

    return Object.values(results).every(result => result.granted);
  }

  /**
   * Get all missing required permissions
   */
  public async getMissingRequiredPermissions(): Promise<PermissionType[]> {
    const requiredPermissions = Object.values(PERMISSION_CONFIGS)
      .filter(config => config.required)
      .map(config => config.type);

    const results = await this.checkMultiplePermissions(requiredPermissions);

    return Object.entries(results)
      .filter(([_, result]) => !result.granted)
      .map(([type, _]) => type as PermissionType);
  }

  /**
   * Get all permissions that can be requested (not permanently denied)
   */
  public async getRequestablePermissions(types: PermissionType[]): Promise<PermissionType[]> {
    const results = await this.checkMultiplePermissions(types);

    return Object.entries(results)
      .filter(([_, result]) => !result.granted && result.canAskAgain)
      .map(([type, _]) => type as PermissionType);
  }

  /**
   * Get all permissions that are permanently denied (need settings)
   */
  public async getPermanentlyDeniedPermissions(types: PermissionType[]): Promise<PermissionType[]> {
    const results = await this.checkMultiplePermissions(types);

    return Object.entries(results)
      .filter(([_, result]) => !result.granted && !result.canAskAgain)
      .map(([type, _]) => type as PermissionType);
  }

  /**
   * Check if a specific permission is required for the app to function
   */
  public isPermissionRequired(type: PermissionType): boolean {
    return PERMISSION_CONFIGS[type].required;
  }

  /**
   * Get permission status summary for debugging
   */
  public async getPermissionStatusSummary(): Promise<Record<PermissionType, PermissionResult>> {
    const allTypes = Object.keys(PERMISSION_CONFIGS) as PermissionType[];
    return await this.checkMultiplePermissions(allTypes);
  }
}

// Export singleton instance
export const permissionManager = PermissionManager.getInstance();
