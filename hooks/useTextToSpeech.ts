import { useState, useCallback, useEffect } from 'react';
import { textToSpeechService, SpeechOptions, VoiceInfo } from '@/services/TextToSpeechService';

export interface UseTextToSpeechReturn {
  speak: (text: string, options?: SpeechOptions) => Promise<void>;
  stop: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  isSpeaking: boolean;
  isAvailable: boolean | null;
  availableVoices: VoiceInfo[];
  error: string | null;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [availableVoices, setAvailableVoices] = useState<VoiceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Check availability and get voices on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const available = await textToSpeechService.isAvailable();
        setIsAvailable(available);

        if (available) {
          const voices = await textToSpeechService.getAvailableVoices();
          setAvailableVoices(voices);
        }
      } catch (err) {
        console.error('Failed to initialize text-to-speech:', err);
        setIsAvailable(false);
        setError('Failed to initialize text-to-speech service');
      }
    };

    initialize();
  }, []);

  const speak = useCallback(async (text: string, options: SpeechOptions = {}): Promise<void> => {
    try {
      setError(null);

      if (!isAvailable) {
        throw new Error('Text-to-speech is not available on this device');
      }

      if (!text.trim()) {
        throw new Error('No text provided to speak');
      }

      // Get platform-specific settings
      const platformSettings = textToSpeechService.getPlatformSettings();
      
      // Merge options with platform settings and callbacks
      const speechOptions: SpeechOptions = {
        ...platformSettings,
        ...options,
        onStart: () => {
          setIsSpeaking(true);
          options.onStart?.();
        },
        onDone: () => {
          setIsSpeaking(false);
          options.onDone?.();
        },
        onStopped: () => {
          setIsSpeaking(false);
          options.onStopped?.();
        },
        onError: (err) => {
          setIsSpeaking(false);
          setError(err.message);
          options.onError?.(err);
        },
      };

      await textToSpeechService.speak(text, speechOptions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to speak text';
      setError(errorMessage);
      setIsSpeaking(false);
      console.error('Speak error:', err);
    }
  }, [isAvailable]);

  const stop = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await textToSpeechService.stop();
      setIsSpeaking(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop speech';
      setError(errorMessage);
      console.error('Stop speech error:', err);
    }
  }, []);

  const pause = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await textToSpeechService.pause();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause speech';
      setError(errorMessage);
      console.error('Pause speech error:', err);
    }
  }, []);

  const resume = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await textToSpeechService.resume();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resume speech';
      setError(errorMessage);
      console.error('Resume speech error:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      textToSpeechService.cleanup().catch(console.error);
    };
  }, []);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isAvailable,
    availableVoices,
    error,
  };
}
