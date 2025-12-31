import * as FileSystem from 'expo-file-system';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { permissionManager } from './PermissionManager';

// Permission-related interfaces
export interface SpeechPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined' | 'restricted';
  restricted?: boolean; // iOS only
  expires?: 'never' | number;
}

export interface DetailedPermissionStatus {
  microphone: SpeechPermissionStatus;
  speechRecognition: SpeechPermissionStatus;
  overall: SpeechPermissionStatus;
}

// Audio recording interfaces
export interface AudioRecordingResult {
  uri: string;
  duration: number;
  size: number;
}

export interface RecordingOptions {
  saveToFile?: boolean;
  filename?: string;
  quality?: 'low' | 'medium' | 'high';
}

// Re-export the same interface for compatibility
export interface TranscriptionResult {
  text: string;
  confidence: number;
  duration: number;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export class ExpoSpeechToTextService {
  private _isListening: boolean = false;
  private currentTranscription: string = '';
  private startTime: number = 0;
  private currentListeners: any[] | null = null;

  // Audio recording properties
  private audioRecording: Audio.Recording | null = null;
  private _isRecording: boolean = false;
  private recordingStartTime: number = 0;

  constructor() {
    // No API key needed for expo-speech-recognition
  }

  /**
   * Proactively reset the native recognizer to avoid ERROR_RECOGNIZER_BUSY when starting again
   * Especially important on Android where rapid start/stop can leave the service in a BUSY state
   */
  private async resetRecognizerBeforeStart(): Promise<void> {
    try {
      // Abort any ongoing session and clear listeners
      ExpoSpeechRecognitionModule.abort();
      this.stopRealTimeRecognition();
      // Small delay to let the native service settle, Android only
      if (Platform.OS === 'android') {
        await new Promise((r) => setTimeout(r, 150));
      }
    } catch (e) {
      // Non-fatal; continue to attempt start
    }
  }

  /**
   * Check current permission status for both microphone and speech recognition
   */
  async checkPermissions(): Promise<DetailedPermissionStatus> {
    try {
      // Use the new permission manager for consistent permission handling
      const microphoneResult = await permissionManager.checkPermission('microphone');
      const speechResult = await permissionManager.checkPermission('speechRecognition');

      // Map to our interface
      const microphoneStatus: SpeechPermissionStatus = {
        granted: microphoneResult.granted,
        canAskAgain: microphoneResult.canAskAgain,
        status: microphoneResult.status,
        expires: microphoneResult.expires,
      };

      const speechRecognitionStatus: SpeechPermissionStatus = {
        granted: speechResult.granted,
        canAskAgain: speechResult.canAskAgain,
        status: speechResult.status,
        expires: speechResult.expires,
      };

      // Overall status is granted only if both are granted
      const overallStatus: SpeechPermissionStatus = {
        granted: microphoneResult.granted && speechResult.granted,
        canAskAgain: microphoneResult.canAskAgain || speechResult.canAskAgain,
        status: (microphoneResult.granted && speechResult.granted) ? 'granted' : 'denied',
        expires: microphoneResult.expires,
      };

      return {
        microphone: microphoneStatus,
        speechRecognition: speechRecognitionStatus,
        overall: overallStatus,
      };
    } catch (error) {
      console.error('Failed to check permissions:', error);

      // Return default denied status on error
      const defaultStatus: SpeechPermissionStatus = {
        granted: false,
        canAskAgain: true,
        status: 'undetermined',
      };

      return {
        microphone: defaultStatus,
        speechRecognition: defaultStatus,
        overall: defaultStatus,
      };
    }
  }

  /**
   * Request permissions for microphone and speech recognition
   * This method should not be called directly - use the PermissionContext instead
   * @deprecated Use PermissionContext.requestPermission() instead
   */
  async requestPermissions(): Promise<SpeechPermissionStatus> {
    try {
      console.log('Requesting speech recognition permissions...');

      // Check if speech recognition is available first
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        throw new Error('Speech recognition is not available on this device');
      }

      // Use the new permission manager for consistent permission handling
      const microphoneResult = await permissionManager.requestPermission('microphone');
      const speechResult = await permissionManager.requestPermission('speechRecognition');

      // Return overall status based on both permissions
      const overallGranted = microphoneResult.granted && speechResult.granted;
      const overallCanAskAgain = microphoneResult.canAskAgain || speechResult.canAskAgain;

      const permissionStatus: SpeechPermissionStatus = {
        granted: overallGranted,
        canAskAgain: overallCanAskAgain,
        status: overallGranted ? 'granted' : 'denied',
        expires: microphoneResult.expires,
      };

      console.log('Permission request result:', permissionStatus);
      return permissionStatus;

    } catch (error) {
      console.error('Failed to request permissions:', error);

      // Return denied status on error
      return {
        granted: false,
        canAskAgain: true,
        status: 'denied',
      };
    }
  }

  /**
   * Check if permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    try {
      const permissions = await this.checkPermissions();
      return permissions.overall.granted;
    } catch (error) {
      console.error('Failed to check if permissions are granted:', error);
      return false;
    }
  }

  /**
   * Request permissions if not already granted
   * This method should not be called directly - use the PermissionContext instead
   * @deprecated Use PermissionContext.requestPermission() instead
   */
  async ensurePermissions(): Promise<boolean> {
    try {
      const hasPerms = await this.hasPermissions();
      if (hasPerms) {
        return true;
      }

      // Use the new permission manager
      const microphoneResult = await permissionManager.requestPermission('microphone');
      const speechResult = await permissionManager.requestPermission('speechRecognition');

      return microphoneResult.granted && speechResult.granted;
    } catch (error) {
      console.error('Failed to ensure permissions:', error);
      return false;
    }
  }

  /**
   * Map permission status from expo-speech-recognition to our standard format
   */
  private mapPermissionStatus(status: string): 'granted' | 'denied' | 'undetermined' {
    switch (status) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      case 'undetermined':
      default:
        return 'undetermined';
    }
  }

  /**
   * Get permission status as a user-friendly string
   */
  async getPermissionStatusText(): Promise<string> {
    try {
      const permissions = await this.checkPermissions();

      if (permissions.overall.granted) {
        return 'All permissions granted';
      }

      if (!permissions.microphone.granted && !permissions.speechRecognition.granted) {
        return 'Microphone and speech recognition permissions required';
      }

      if (!permissions.microphone.granted) {
        return 'Microphone permission required';
      }

      if (!permissions.speechRecognition.granted) {
        return 'Speech recognition permission required';
      }

      return 'Permissions status unknown';
    } catch (error) {
      return 'Unable to check permissions';
    }
  }

  /**
   * Setup audio recording configuration
   */
  private async setupAudioRecording(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.error('Failed to setup audio recording:', error);
      throw new Error('Audio recording setup failed');
    }
  }

  /**
   * Start audio recording
   */
  async startRecording(options?: RecordingOptions): Promise<void> {
    try {
      if (this._isRecording) {
        console.warn('Recording is already in progress');
        return;
      }

      // Ensure permissions are granted
      const hasPermissions = await this.ensurePermissions();
      if (!hasPermissions) {
        throw new Error('Audio recording permissions not granted');
      }

      // Setup audio recording
      await this.setupAudioRecording();

      // Create new recording
      this.audioRecording = new Audio.Recording();

      // Prepare recording options based on quality setting
      const quality = options?.quality || 'high';
      const recordingOptions = this.getRecordingOptions(quality);

      await this.audioRecording.prepareToRecordAsync(recordingOptions);
      await this.audioRecording.startAsync();

      this._isRecording = true;
      this.recordingStartTime = Date.now();
      console.log('Audio recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      this._isRecording = false;
      this.audioRecording = null;
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop audio recording and return the result
   */
  async stopRecording(): Promise<AudioRecordingResult> {
    try {
      if (!this.audioRecording || !this._isRecording) {
        throw new Error('No active recording to stop');
      }

      await this.audioRecording.stopAndUnloadAsync();
      const uri = this.audioRecording.getURI();

      if (!uri) {
        throw new Error('Recording URI is null');
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const duration = (Date.now() - this.recordingStartTime) / 1000;

      const result: AudioRecordingResult = {
        uri,
        duration,
        size: fileInfo.exists ? fileInfo.size || 0 : 0,
      };

      this._isRecording = false;
      this.audioRecording = null;

      console.log('Audio recording stopped:', result);
      return result;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this._isRecording = false;
      this.audioRecording = null;
      throw new Error(`Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel audio recording and delete the file
   */
  async cancelRecording(): Promise<void> {
    try {
      if (this.audioRecording && this._isRecording) {
        await this.audioRecording.stopAndUnloadAsync();
        const uri = this.audioRecording.getURI();

        // Delete the recording file
        if (uri) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      }

      this._isRecording = false;
      this.audioRecording = null;
      console.log('Audio recording cancelled');
    } catch (error) {
      console.error('Failed to cancel recording:', error);
      this._isRecording = false;
      this.audioRecording = null;
    }
  }

  /**
   * Check if currently recording audio
   */
  isRecording(): boolean {
    return this._isRecording;
  }

  /**
   * Get current recording duration in milliseconds
   */
  async getRecordingDuration(): Promise<number> {
    try {
      if (this.audioRecording && this._isRecording) {
        const status = await this.audioRecording.getStatusAsync();
        if (status.isRecording) {
          return status.durationMillis || 0;
        }
      }
      return 0;
    } catch (error) {
      console.error('Failed to get recording duration:', error);
      return 0;
    }
  }

  /**
   * Get recording options based on quality setting - Optimized for speech recognition
   */
  private getRecordingOptions(quality: 'low' | 'medium' | 'high') {
    // Use formats that are more compatible with speech recognition
    const baseOptions = {
      android: {
        extension: '.wav', // WAV is more universally supported for speech recognition
        outputFormat: Audio.AndroidOutputFormat.DEFAULT,
        audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
      },
      ios: {
        extension: '.wav',
        outputFormat: Audio.IOSOutputFormat.LINEARPCM,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/wav',
      },
    };

    switch (quality) {
      case 'low':
        return {
          ...baseOptions,
          android: {
            ...baseOptions.android,
            sampleRate: 16000, // Standard for speech recognition
            numberOfChannels: 1, // Mono for speech
            bitRate: 64000,
          },
          ios: {
            ...baseOptions.ios,
            audioQuality: Audio.IOSAudioQuality.LOW,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 64000,
          },
          web: {
            ...baseOptions.web,
            bitsPerSecond: 64000,
          },
        };
      case 'medium':
        return {
          ...baseOptions,
          android: {
            ...baseOptions.android,
            sampleRate: 16000, // Keep 16kHz for speech recognition
            numberOfChannels: 1,
            bitRate: 96000,
          },
          ios: {
            ...baseOptions.ios,
            audioQuality: Audio.IOSAudioQuality.MEDIUM,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 96000,
          },
          web: {
            ...baseOptions.web,
            bitsPerSecond: 96000,
          },
        };
      case 'high':
      default:
        return {
          ...baseOptions,
          android: {
            ...baseOptions.android,
            sampleRate: 16000, // 16kHz is optimal for speech recognition
            numberOfChannels: 1, // Mono for speech
            bitRate: 128000,
          },
          ios: {
            ...baseOptions.ios,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          web: {
            ...baseOptions.web,
            bitsPerSecond: 128000,
          },
        };
    }
  }

  /**
   * Start recording and real-time transcription simultaneously
   */
  async startRecordingWithTranscription(options?: {
    recordingOptions?: RecordingOptions;
    transcriptionOptions?: {
      onInterimResult?: (text: string, confidence: number) => void;
      onFinalResult?: (result: TranscriptionResult) => void;
      onError?: (error: Error) => void;
      onStart?: () => void;
      onEnd?: () => void;
      language?: string;
      continuous?: boolean;
      interimResults?: boolean;
    };
  }): Promise<void> {
    try {
      console.log('Starting recording with real-time transcription');

      // Start audio recording first
      await this.startRecording(options?.recordingOptions);

      // Then start real-time transcription
      await this.startRealTimeRecognition(options?.transcriptionOptions);

      console.log('Recording and transcription started successfully');
    } catch (error) {
      // If either fails, clean up both
      await this.cancelRecording();
      this.abortRealTimeRecognition();
      throw error;
    }
  }

  /**
   * Start speech recognition with built-in recording (recommended approach)
   * This uses expo-speech-recognition's native recording capabilities instead of expo-av
   */
  async startNativeRecognitionWithRecording(options?: {
    onInterimResult?: (text: string, confidence: number) => void;
    onFinalResult?: (result: TranscriptionResult) => void;
    onError?: (error: Error) => void;
    onStart?: () => void;
    onEnd?: () => void;
    onAudioStart?: (uri?: string) => void;
    onAudioEnd?: (uri?: string) => void;
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
    saveRecording?: boolean;
    recordingQuality?: 'low' | 'medium' | 'high';
    preferOnDevice?: boolean;
  }): Promise<void> {
    try {
      console.log('Starting native speech recognition with recording');

      // Check if speech recognition is available
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        throw new Error('Speech recognition is not available on this device');
      }

      // Ensure permissions are granted
      const hasPermissions = await this.ensurePermissions();
      if (!hasPermissions) {
        const statusText = await this.getPermissionStatusText();
        throw new Error(`Speech recognition permissions not granted: ${statusText}`);
      }

      // Proactively reset to avoid busy/cooldown, then clean any listeners
      await this.resetRecognizerBeforeStart();
      this.stopRealTimeRecognition();

      // Set up event listeners
      const startListener = ExpoSpeechRecognitionModule.addListener('start', () => {
        console.log('Native speech recognition started');
        this._isListening = true;
        this.startTime = Date.now();
        options?.onStart?.();
      });

      const audioStartListener = ExpoSpeechRecognitionModule.addListener('audiostart', (event) => {
        console.log('Audio recording started:', event.uri);
        options?.onAudioStart?.(event.uri || undefined);
      });

      const audioEndListener = ExpoSpeechRecognitionModule.addListener('audioend', (event) => {
        console.log('Audio recording ended:', event.uri);
        options?.onAudioEnd?.(event.uri || undefined);
      });

      const resultListener = ExpoSpeechRecognitionModule.addListener('result', (event) => {
        console.log('Native speech result:', event);
        if (event.results && event.results.length > 0) {
          const result = event.results[0];

          if (event.isFinal) {
            // Final result
            const transcriptionResult: TranscriptionResult = {
              text: result.transcript || '',
              confidence: result.confidence || 0.8,
              duration: (Date.now() - this.startTime) / 1000,
              words: result.segments?.map((segment: any) => ({
                text: segment.text || '',
                start: segment.start || 0,
                end: segment.end || 0,
                confidence: segment.confidence || 0.8,
              })),
            };
            options?.onFinalResult?.(transcriptionResult);
          } else if (options?.interimResults !== false) {
            // Interim result
            options?.onInterimResult?.(result.transcript || '', result.confidence || 0.8);
          }
        }
      });

      const endListener = ExpoSpeechRecognitionModule.addListener('end', () => {
        console.log('Native speech recognition ended');
        this._isListening = false;
        this.cleanupListeners(startListener, audioStartListener, audioEndListener, resultListener, endListener, errorListener);
        options?.onEnd?.();
      });

      const errorListener = ExpoSpeechRecognitionModule.addListener('error', (event) => {
        this._isListening = false;
        this.cleanupListeners(startListener, audioStartListener, audioEndListener, resultListener, endListener, errorListener);

        let errorMessage = `Speech recognition failed: ${event.error}`;
        if (event.message) {
          errorMessage += ` - ${event.message}`;
        }

        // Check for cooldown/rate limiting errors first
        const isCooldownError = this.isCooldownError(event.error, event.message);

        // Only log non-cooldown errors to avoid React Native error overlay
        if (!isCooldownError) {
          console.error('Native speech recognition error:', event);
        }

        // Map common errors to user-friendly messages
        if (event.error === 'no-speech') {
          errorMessage = 'No speech detected';
        } else if (event.error === 'not-allowed') {
          errorMessage = 'Speech recognition permissions not granted';
        } else if (event.error === 'service-not-allowed') {
          errorMessage = 'Speech recognition service is not available';
        } else if (isCooldownError) {
          // Create a special error type for cooldown - handle gracefully
          const cooldownError = new Error(errorMessage);
          (cooldownError as any).isCooldown = true;

          // Use try-catch to prevent React Native error overlay
          try {
            options?.onError?.(cooldownError);
          } catch (e) {
            // Silently handle any errors from the error handler
          }
          return;
        }

        // For non-cooldown errors, also wrap in try-catch
        try {
          options?.onError?.(new Error(errorMessage));
        } catch (e) {
          // Fallback error handling
          console.error('Error in error handler:', e);
        }
      });

      // Store listeners for cleanup
      this.currentListeners = [startListener, audioStartListener, audioEndListener, resultListener, endListener, errorListener];

      // Configure recording options if saving is enabled
      const recordingOptions = options?.saveRecording ? {
        persist: true,
        outputDirectory: undefined, // Use default cache directory
        outputFileName: `speech_recording_${Date.now()}.wav`,
        outputSampleRate: 16000, // Optimal for speech recognition
      } : undefined;

      // Start native recognition with recording
      ExpoSpeechRecognitionModule.start({
        lang: options?.language || 'en-US',
        interimResults: options?.interimResults !== false,
        continuous: options?.continuous !== false,
        requiresOnDeviceRecognition: options?.preferOnDevice || false, // Use on-device when preferred to avoid network issues
        addsPunctuation: true,
        maxAlternatives: 1,
        recordingOptions,
        // Android-specific options for better speech recognition and network stability
        androidIntentOptions: {
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 5000, // Longer timeout for network stability
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 3000,
          EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 500,
        },
      });

    } catch (error) {
      console.error('Failed to start native recognition with recording:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to start native recognition: ${error.message}`);
      } else {
        throw new Error('Failed to start native recognition with unknown error');
      }
    }
  }

  /**
   * Stop both recording and transcription, return both results
   */
  async stopRecordingWithTranscription(): Promise<{
    recording: AudioRecordingResult;
    transcription?: TranscriptionResult;
  }> {
    try {
      // Stop real-time transcription first
      this.stopRealTimeRecognition();

      // Then stop recording
      const recordingResult = await this.stopRecording();

      return {
        recording: recordingResult,
        // Note: Final transcription result would come through the callback
        // This is just the recording result
      };
    } catch (error) {
      // Ensure cleanup on error
      await this.cancelRecording();
      this.abortRealTimeRecognition();
      throw error;
    }
  }

  /**
   * Convert audio file to base64 for API upload (utility method)
   */
  async audioFileToBase64(uri: string): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      console.error('Failed to convert audio to base64:', error);
      throw new Error('Failed to convert audio file to base64');
    }
  }

  /**
   * Get audio file information
   */
  async getAudioFileInfo(uri: string): Promise<{
    exists: boolean;
    size: number;
    modificationTime?: number;
  }> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return {
        exists: fileInfo.exists,
        size: fileInfo.exists ? fileInfo.size || 0 : 0,
        modificationTime: fileInfo.exists ? fileInfo.modificationTime : undefined,
      };
    } catch (error) {
      console.error('Failed to get audio file info:', error);
      return {
        exists: false,
        size: 0,
      };
    }
  }

  /**
   * Delete audio file
   */
  async deleteAudioFile(uri: string): Promise<boolean> {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      return true;
    } catch (error) {
      console.error('Failed to delete audio file:', error);
      return false;
    }
  }

  /**
   * Transcribe audio file using expo-speech-recognition
   */
  async transcribeAudio(audioUri: string): Promise<TranscriptionResult> {
    try {
      console.log('Starting transcription for:', audioUri);

      // Validate the audio file first
      const isValid = await this.validateAudioFile(audioUri);
      if (!isValid) {
        throw new Error('Invalid audio file');
      }

      // Check if speech recognition is available
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        throw new Error('Speech recognition is not available on this device');
      }

      // Ensure permissions are granted
      const hasPermissions = await this.ensurePermissions();
      if (!hasPermissions) {
        const statusText = await this.getPermissionStatusText();
        throw new Error(`Speech recognition permissions not granted: ${statusText}`);
      }

      // Check if file transcription is supported
      const supportsRecording = ExpoSpeechRecognitionModule.supportsRecording();
      if (!supportsRecording) {
        throw new Error('File transcription is not supported on this device. Requires Android 13+ or iOS.');
      }

      // Return a promise that resolves when transcription is complete
      return new Promise((resolve, reject) => {
        let finalResult: TranscriptionResult | null = null;
        let hasResolved = false;

        // Set up event listeners
        const startListener = ExpoSpeechRecognitionModule.addListener('start', () => {
          console.log('Speech recognition started');
          this._isListening = true;
          this.startTime = Date.now();
        });

        const resultListener = ExpoSpeechRecognitionModule.addListener('result', (event) => {
          console.log('Speech result:', event);
          if (event.results && event.results.length > 0) {
            const result = event.results[0];

            // Create the transcription result
            const transcriptionResult: TranscriptionResult = {
              text: result.transcript || '',
              confidence: result.confidence || 0.8, // Default confidence if not provided
              duration: (Date.now() - this.startTime) / 1000,
              words: result.segments?.map((segment: any) => ({
                text: segment.text || '',
                start: segment.start || 0,
                end: segment.end || 0,
                confidence: segment.confidence || 0.8,
              })),
            };

            // Update the final result
            finalResult = transcriptionResult;

            // If this is a final result, resolve immediately
            if (event.isFinal && !hasResolved) {
              hasResolved = true;
              this.cleanupListeners(startListener, resultListener, endListener, errorListener);
              resolve(finalResult);
            }
          }
        });

        const endListener = ExpoSpeechRecognitionModule.addListener('end', () => {
          console.log('Speech recognition ended');
          this._isListening = false;

          // If we have a result and haven't resolved yet, resolve now
          if (finalResult && !hasResolved) {
            hasResolved = true;
            this.cleanupListeners(startListener, resultListener, endListener, errorListener);
            resolve(finalResult);
          } else if (!hasResolved) {
            // No result was captured
            hasResolved = true;
            this.cleanupListeners(startListener, resultListener, endListener, errorListener);
            reject(new Error('No text was transcribed from the audio'));
          }
        });

        const errorListener = ExpoSpeechRecognitionModule.addListener('error', (event) => {
          console.error('Speech recognition error:', event);
          this._isListening = false;

          if (!hasResolved) {
            hasResolved = true;
            this.cleanupListeners(startListener, resultListener, endListener, errorListener);

            // Handle specific error cases
            let errorMessage = `Speech recognition failed: ${event.error}`;
            if (event.message) {
              errorMessage += ` - ${event.message}`;
            }

            // Check for cooldown/rate limiting errors
            const isCooldownError = this.isCooldownError(event.error, event.message);

            // Map common errors to user-friendly messages
            if (event.error === 'no-speech') {
              errorMessage = 'No text was transcribed from the audio';
            } else if (event.error === 'not-allowed') {
              errorMessage = 'Speech recognition permissions not granted';
            } else if (event.error === 'service-not-allowed') {
              errorMessage = 'Speech recognition service is not available';
            } else if (isCooldownError) {
              // Create a special error type for cooldown
              const cooldownError = new Error(errorMessage);
              (cooldownError as any).isCooldown = true;
              reject(cooldownError);
              return;
            }

            reject(new Error(errorMessage));
          }
        });

        // Start transcription with audio file - Enhanced configuration for better compatibility
        try {
          const audioSourceConfig: any = {
            uri: audioUri,
          };

          // Add Android-specific audio configuration for better compatibility
          if (Platform.OS === 'android') {
            audioSourceConfig.audioChannels = 1; // Mono for better speech recognition
            audioSourceConfig.sampleRate = 16000; // Standard sample rate for speech recognition
            audioSourceConfig.audioEncoding = 2; // ENCODING_PCM_16BIT
            audioSourceConfig.chunkDelayMillis = 100; // Slower chunk processing for file transcription
          }

          ExpoSpeechRecognitionModule.start({
            lang: 'en-US',
            interimResults: false,
            continuous: false,
            requiresOnDeviceRecognition: false,
            addsPunctuation: true,
            maxAlternatives: 1,
            audioSource: audioSourceConfig,
            // Android-specific options for better file transcription
            androidIntentOptions: {
              EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2000,
              EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2000,
              EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 500,
            },
          });
        } catch (startError) {
          hasResolved = true;
          this.cleanupListeners(startListener, resultListener, endListener, errorListener);
          reject(new Error(`Failed to start speech recognition: ${startError}`));
        }

        // Set a timeout to prevent hanging
        setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            this.cleanupListeners(startListener, resultListener, endListener, errorListener);
            ExpoSpeechRecognitionModule.abort();
            reject(new Error('Speech recognition timed out'));
          }
        }, 60000); // 60 second timeout
      });

    } catch (error) {
      console.error('Transcription error:', error);
      if (error instanceof Error) {
        throw new Error(`Transcription failed: ${error.message}`);
      } else {
        throw new Error('Transcription failed with unknown error');
      }
    }
  }

  /**
   * Check if an error is related to cooldown/rate limiting
   */
  private isCooldownError(errorCode: string, errorMessage?: string): boolean {
    const cooldownPatterns = [
      'rate limit',
      'rate-limit',
      'too many requests',
      'cooldown',
      'cool down',
      'wait',
      'throttle',
      'throttled',
      'quota exceeded',
      'service unavailable',
      'temporarily unavailable',
      'try again later',
      'busy',
      'overloaded',
      'server disconnected',
      'disconnected'
    ];

    const errorText = `${errorCode} ${errorMessage || ''}`.toLowerCase();

    // Special case: network errors with "server disconnected" are often rate limiting
    if (errorCode === 'network' && errorMessage && errorMessage.toLowerCase().includes('server disconnected')) {
      return true;
    }

    return cooldownPatterns.some(pattern => errorText.includes(pattern));
  }

  /**
   * Clean up event listeners
   */
  private cleanupListeners(...listeners: any[]) {
    listeners.forEach(listener => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    });
  }

  /**
   * Start real-time speech recognition (live microphone input)
   */
  async startRealTimeRecognition(options?: {
    onInterimResult?: (text: string, confidence: number) => void;
    onFinalResult?: (result: TranscriptionResult) => void;
    onError?: (error: Error) => void;
    onStart?: () => void;
    onEnd?: () => void;
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
  }): Promise<void> {
    try {
      console.log('Starting real-time speech recognition');

      // Check if speech recognition is available
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        throw new Error('Speech recognition is not available on this device');
      }

      // Ensure permissions are granted
      const hasPermissions = await this.ensurePermissions();
      if (!hasPermissions) {
        const statusText = await this.getPermissionStatusText();
        throw new Error(`Speech recognition permissions not granted: ${statusText}`);
      }

      // Proactively reset to avoid busy/cooldown, then clean any listeners
      await this.resetRecognizerBeforeStart();
      this.stopRealTimeRecognition();

      // Set up event listeners for real-time recognition
      const startListener = ExpoSpeechRecognitionModule.addListener('start', () => {
        console.log('Real-time speech recognition started');
        this._isListening = true;
        this.startTime = Date.now();
        options?.onStart?.();
      });

      const resultListener = ExpoSpeechRecognitionModule.addListener('result', (event) => {
        console.log('Real-time speech result:', event);
        if (event.results && event.results.length > 0) {
          const result = event.results[0];

          if (event.isFinal) {
            // Final result
            const transcriptionResult: TranscriptionResult = {
              text: result.transcript || '',
              confidence: result.confidence || 0.8,
              duration: (Date.now() - this.startTime) / 1000,
              words: result.segments?.map((segment: any) => ({
                text: segment.text || '',
                start: segment.start || 0,
                end: segment.end || 0,
                confidence: segment.confidence || 0.8,
              })),
            };
            options?.onFinalResult?.(transcriptionResult);
          } else if (options?.interimResults !== false) {
            // Interim result
            options?.onInterimResult?.(result.transcript || '', result.confidence || 0.8);
          }
        }
      });

      const endListener = ExpoSpeechRecognitionModule.addListener('end', () => {
        console.log('Real-time speech recognition ended');
        this._isListening = false;
        this.cleanupListeners(startListener, resultListener, endListener, errorListener);
        options?.onEnd?.();
      });

      const errorListener = ExpoSpeechRecognitionModule.addListener('error', (event) => {
        console.error('Real-time speech recognition error:', event);
        this._isListening = false;
        this.cleanupListeners(startListener, resultListener, endListener, errorListener);

        let errorMessage = `Speech recognition failed: ${event.error}`;
        if (event.message) {
          errorMessage += ` - ${event.message}`;
        }

        // Check for cooldown/rate limiting errors
        const isCooldownError = this.isCooldownError(event.error, event.message);

        // Map common errors to user-friendly messages
        if (event.error === 'no-speech') {
          errorMessage = 'No speech detected';
        } else if (event.error === 'not-allowed') {
          errorMessage = 'Speech recognition permissions not granted';
        } else if (event.error === 'service-not-allowed') {
          errorMessage = 'Speech recognition service is not available';
        } else if (isCooldownError) {
          // Create a special error type for cooldown
          const cooldownError = new Error(errorMessage);
          (cooldownError as any).isCooldown = true;
          options?.onError?.(cooldownError);
          return;
        }

        options?.onError?.(new Error(errorMessage));
      });

      // Store listeners for cleanup
      this.currentListeners = [startListener, resultListener, endListener, errorListener];

      // Start real-time recognition
      ExpoSpeechRecognitionModule.start({
        lang: options?.language || 'en-US',
        interimResults: options?.interimResults !== false,
        continuous: options?.continuous !== false,
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
      });

    } catch (error) {
      console.error('Failed to start real-time recognition:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to start real-time recognition: ${error.message}`);
      } else {
        throw new Error('Failed to start real-time recognition with unknown error');
      }
    }
  }

  /**
   * Stop real-time speech recognition
   */
  stopRealTimeRecognition(): void {
    try {
      if (this._isListening) {
        ExpoSpeechRecognitionModule.stop();
      }

      // Clean up listeners
      if (this.currentListeners) {
        this.cleanupListeners(...this.currentListeners);
        this.currentListeners = null;
      }

      this._isListening = false;
    } catch (error) {
      console.error('Error stopping real-time recognition:', error);
    }
  }

  /**
   * Abort real-time speech recognition
   */
  abortRealTimeRecognition(): void {
    try {
      if (this._isListening) {
        ExpoSpeechRecognitionModule.abort();
      }

      // Clean up listeners
      if (this.currentListeners) {
        this.cleanupListeners(...this.currentListeners);
        this.currentListeners = null;
      }

      this._isListening = false;
    } catch (error) {
      console.error('Error aborting real-time recognition:', error);
    }
  }

  /**
   * Transcribe audio with real-time streaming (legacy method for compatibility)
   */
  async transcribeRealTime(audioUri: string): Promise<TranscriptionResult> {
    // For file-based transcription, use the regular method
    // This maintains compatibility with existing code
    return this.transcribeAudio(audioUri);
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    // expo-speech-recognition doesn't need API keys, just check if it's available
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  }

  /**
   * Check if real-time recognition is supported
   */
  supportsRealTimeRecognition(): boolean {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    // expo-speech-recognition supports common audio formats
    return [
      'wav', 'mp3', 'm4a', 'aac', 'flac', 'ogg'
    ];
  }

  /**
   * Validate audio file before transcription
   */
  async validateAudioFile(audioUri: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      
      if (!fileInfo.exists) {
        throw new Error('Audio file does not exist');
      }
      
      if (!fileInfo.size || fileInfo.size === 0) {
        throw new Error('Audio file is empty');
      }
      
      // Check file size (reasonable limit for mobile processing)
      const maxSizeBytes = 50 * 1024 * 1024; // 50MB
      if (fileInfo.size > maxSizeBytes) {
        throw new Error('Audio file is too large (max 50MB)');
      }
      
      return true;
    } catch (error) {
      console.error('Audio file validation failed:', error);
      return false;
    }
  }

  /**
   * Check if currently listening
   */
  isListening(): boolean {
    return this._isListening;
  }

  /**
   * Stop current transcription (both file-based and real-time) and recording
   */
  stop(): void {
    if (this._isListening) {
      ExpoSpeechRecognitionModule.stop();
    }
    this.stopRealTimeRecognition();
  }

  /**
   * Abort current transcription (both file-based and real-time) and cancel recording
   */
  abort(): void {
    if (this._isListening) {
      ExpoSpeechRecognitionModule.abort();
    }
    this.abortRealTimeRecognition();
    this.cancelRecording();
  }

  /**
   * Complete cleanup of all resources
   */
  async cleanup(): Promise<void> {
    try {
      // Stop any active transcription
      this.abort();

      // Cancel any active recording
      await this.cancelRecording();

      console.log('ExpoSpeechToTextService cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup ExpoSpeechToTextService:', error);
    }
  }
}

// Singleton instance
export const expoSpeechToTextService = new ExpoSpeechToTextService();
