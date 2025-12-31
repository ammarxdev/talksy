import { Platform, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

export interface PhoneCallResult {
  success: boolean;
  error?: string;
  dialerOpened: boolean;
}

export class PhoneCallService {
  /**
   * Check if the device supports phone calls
   */
  async isPhoneCallSupported(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // On Android, we assume phone calls are supported if we can launch intents
        return true;
      } else {
        // On iOS, check if we can open tel URLs
        return await Linking.canOpenURL('tel:+1234567890');
      }
    } catch (error) {
      console.error('Error checking phone call support:', error);
      return false;
    }
  }

  /**
   * Make a phone call using the most appropriate method for the platform
   */
  async makePhoneCall(phoneNumber: string): Promise<PhoneCallResult> {
    try {
      // Clean the phone number
      const cleanNumber = this.cleanPhoneNumber(phoneNumber);
      if (!cleanNumber) {
        return {
          success: false,
          error: 'Invalid phone number',
          dialerOpened: false,
        };
      }

      // Check if phone calls are supported
      const isSupported = await this.isPhoneCallSupported();
      if (!isSupported) {
        return {
          success: false,
          error: 'Phone calls are not supported on this device',
          dialerOpened: false,
        };
      }

      if (Platform.OS === 'android') {
        return await this.makeAndroidCall(cleanNumber);
      } else {
        return await this.makeIOSCall(cleanNumber);
      }
    } catch (error) {
      console.error('Error making phone call:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to make phone call',
        dialerOpened: false,
      };
    }
  }

  /**
   * Make phone call on Android using IntentLauncher
   */
  private async makeAndroidCall(phoneNumber: string): Promise<PhoneCallResult> {
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.DIAL', {
        data: `tel:${phoneNumber}`,
      });
      
      return {
        success: true,
        dialerOpened: true,
      };
    } catch (error) {
      console.error('Android call error:', error);
      
      // Fallback to Linking if IntentLauncher fails
      try {
        await Linking.openURL(`tel:${phoneNumber}`);
        return {
          success: true,
          dialerOpened: true,
        };
      } catch (linkingError) {
        return {
          success: false,
          error: 'Could not open dialer app',
          dialerOpened: false,
        };
      }
    }
  }

  /**
   * Make phone call on iOS using Linking
   */
  private async makeIOSCall(phoneNumber: string): Promise<PhoneCallResult> {
    try {
      const telUrl = `tel:${phoneNumber}`;
      
      // Check if we can open the URL
      const canOpen = await Linking.canOpenURL(telUrl);
      if (!canOpen) {
        return {
          success: false,
          error: 'Cannot open dialer on this device',
          dialerOpened: false,
        };
      }

      await Linking.openURL(telUrl);
      
      return {
        success: true,
        dialerOpened: true,
      };
    } catch (error) {
      console.error('iOS call error:', error);
      return {
        success: false,
        error: 'Could not open dialer app',
        dialerOpened: false,
      };
    }
  }

  /**
   * Clean and format phone number
   */
  private cleanPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure it starts with + or a digit
    if (!cleaned.match(/^[\d+]/)) {
      return '';
    }
    
    return cleaned;
  }

  /**
   * Get error message for user display
   */
  getUserFriendlyError(error: string): string {
    if (error.includes('permission')) {
      return 'Please grant permission to make phone calls in your device settings.';
    } else if (error.includes('not supported')) {
      return 'Your device does not support phone calls. Please use your device\'s dialer app manually.';
    } else if (error.includes('invalid')) {
      return 'The phone number appears to be invalid. Please check the number and try again.';
    } else {
      return 'Unable to open the dialer. Please try using your device\'s dialer app manually.';
    }
  }
}

// Export singleton instance
export const phoneCallService = new PhoneCallService();
export default PhoneCallService;
