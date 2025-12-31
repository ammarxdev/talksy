import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

export interface SpeechOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  voice?: string;
  volume?: number;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
}

export interface VoiceInfo {
  identifier: string;
  name: string;
  quality: string;
  language: string;
}

export class TextToSpeechService {
  private isSpeaking = false;
  private currentSpeechId: string | null = null;

  constructor() {
    // Initialize the service
  }

  /**
   * Speak the given text
   */
  async speak(text: string, options: SpeechOptions = {}): Promise<void> {
    try {
      console.log('Speaking text:', text);

      // Stop any current speech
      if (this.isSpeaking) {
        await this.stop();
      }

      // Default options
      const defaultOptions: SpeechOptions = {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.8, // Slightly slower for better comprehension
        volume: 1.0,
      };

      const speechOptions = { ...defaultOptions, ...options };

      // Wrap the speech lifecycle in a promise so callers can await completion
      await new Promise<void>((resolve, reject) => {
        // Create speech configuration
        const speechConfig: Speech.SpeechOptions = {
          language: speechOptions.language,
          pitch: speechOptions.pitch,
          rate: speechOptions.rate,
          voice: speechOptions.voice,
          volume: speechOptions.volume,
          onStart: () => {
            this.isSpeaking = true;
            console.log('Speech started');
            speechOptions.onStart?.();
          },
          onDone: () => {
            this.isSpeaking = false;
            this.currentSpeechId = null;
            console.log('Speech completed');
            speechOptions.onDone?.();
            resolve();
          },
          onStopped: () => {
            this.isSpeaking = false;
            this.currentSpeechId = null;
            console.log('Speech stopped');
            speechOptions.onStopped?.();
            resolve();
          },
          onError: (error) => {
            this.isSpeaking = false;
            this.currentSpeechId = null;
            console.error('Speech error:', error);
            const err = new Error(error.toString());
            speechOptions.onError?.(err);
            reject(err);
          },
        };

        // Start speaking
        Speech.speak(text, speechConfig);

        // Generate a unique ID for this speech instance
        this.currentSpeechId = `speech_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      });
    } catch (error) {
      this.isSpeaking = false;
      this.currentSpeechId = null;
      console.error('Failed to speak text:', error);
      throw new Error('Failed to speak text');
    }
  }

  /**
   * Stop current speech
   */
  async stop(): Promise<void> {
    try {
      if (this.isSpeaking) {
        await Speech.stop();
        this.isSpeaking = false;
        this.currentSpeechId = null;
        console.log('Speech stopped');
      }
    } catch (error) {
      console.error('Failed to stop speech:', error);
      this.isSpeaking = false;
      this.currentSpeechId = null;
    }
  }

  /**
   * Pause current speech
   */
  async pause(): Promise<void> {
    try {
      if (this.isSpeaking) {
        await Speech.pause();
        console.log('Speech paused');
      }
    } catch (error) {
      console.error('Failed to pause speech:', error);
    }
  }

  /**
   * Resume paused speech
   */
  async resume(): Promise<void> {
    try {
      await Speech.resume();
      console.log('Speech resumed');
    } catch (error) {
      console.error('Failed to resume speech:', error);
    }
  }

  /**
   * Get current speech status
   */
  getSpeechStatus(): { isSpeaking: boolean; speechId: string | null } {
    return {
      isSpeaking: this.isSpeaking,
      speechId: this.currentSpeechId,
    };
  }

  /**
   * Get available voices
   */
  async getAvailableVoices(): Promise<VoiceInfo[]> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices.map(voice => ({
        identifier: voice.identifier,
        name: voice.name,
        quality: voice.quality,
        language: voice.language,
      }));
    } catch (error) {
      console.error('Failed to get available voices:', error);
      return [];
    }
  }

  /**
   * Get the best voice for a given language
   */
  async getBestVoiceForLanguage(language: string = 'en-US'): Promise<string | undefined> {
    try {
      const voices = await this.getAvailableVoices();
      
      // Filter voices by language
      const languageVoices = voices.filter(voice => 
        voice.language.toLowerCase().startsWith(language.toLowerCase().split('-')[0])
      );

      if (languageVoices.length === 0) {
        return undefined;
      }

      // Prefer high quality voices
      const highQualityVoices = languageVoices.filter(voice => 
        voice.quality === 'Enhanced' || voice.quality === 'Premium'
      );

      if (highQualityVoices.length > 0) {
        return highQualityVoices[0].identifier;
      }

      // Fallback to any voice in the language
      return languageVoices[0].identifier;
    } catch (error) {
      console.error('Failed to get best voice for language:', error);
      return undefined;
    }
  }

  /**
   * Check if text-to-speech is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Try to get available voices as a test
      const voices = await Speech.getAvailableVoicesAsync();
      return voices.length > 0;
    } catch (error) {
      console.error('Text-to-speech not available:', error);
      return false;
    }
  }

  /**
   * Get platform-specific speech settings
   */
  getPlatformSettings(): Partial<SpeechOptions> {
    if (Platform.OS === 'ios') {
      return {
        rate: 0.5, // iOS tends to speak faster
        pitch: 1.0,
      };
    } else if (Platform.OS === 'android') {
      return {
        rate: 0.8,
        pitch: 1.0,
      };
    }
    return {};
  }

  /**
   * Cleanup method
   */
  async cleanup(): Promise<void> {
    try {
      if (this.isSpeaking) {
        await this.stop();
      }
    } catch (error) {
      console.error('Failed to cleanup text-to-speech service:', error);
    }
  }
}

// Singleton instance
export const textToSpeechService = new TextToSpeechService();
