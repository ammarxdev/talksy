import { useState, useCallback, useRef } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { expoSpeechToTextService, TranscriptionResult } from '@/services/ExpoSpeechToTextService';
import { usePermissionErrorHandler } from './usePermissionErrorHandler';

export interface UseNativeSpeechRecognitionReturn {
  isListening: boolean;
  isTranscribing: boolean;
  currentText: string;
  finalText: string;
  confidence: number;
  error: string | null;
  recordingUri: string | null;
  startListening: (options?: {
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
    saveRecording?: boolean;
    recordingQuality?: 'low' | 'medium' | 'high';
    preferOnDevice?: boolean;
  }) => Promise<void>;
  stopListening: () => void;
  clearError: () => void;
  clearText: () => void;
}

/**
 * Hook for native speech recognition using expo-speech-recognition's built-in recording
 * This is the recommended approach as it avoids format compatibility issues
 */
export function useNativeSpeechRecognition(): UseNativeSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  const finalResultRef = useRef<TranscriptionResult | null>(null);
  const { handleSpeechRecognitionError } = usePermissionErrorHandler();
  const transcriptRef = useRef<string>('');
  // Grace period management to avoid stopping on very short pauses
  const pendingFinalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFinalResultRef = useRef<TranscriptionResult | null>(null);
  const shouldAutoRestartOnEndRef = useRef<boolean>(false);
  const lastOptionsRef = useRef<{ lang: string; interimResults: boolean; continuous: boolean } | null>(null);
  const startingRecognitionRef = useRef<boolean>(false);
  const lastResultAtRef = useRef<number>(0);
  // Accumulates committed final segments across grace auto-restarts within one user utterance
  const accumulatedTextRef = useRef<string>('');

  // Simplified speech recognition function similar to Ai-Tutor
  const startSimplifiedSpeechRecognition = useCallback(async (options?: {
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
    saveRecording?: boolean;
    recordingQuality?: 'low' | 'medium' | 'high';
    preferOnDevice?: boolean;
  }) => {
    // Reset state
    // Only clear transcript when this is a fresh user-initiated start (not during grace auto-restart)
    if (!pendingFinalizeTimerRef.current) {
      transcriptRef.current = '';
      accumulatedTextRef.current = '';
    }
    
    // Request permissions first (like Ai-Tutor)
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm?.granted) {
      throw new Error('Microphone/Speech permissions not granted');
    }

    // Use simple configuration like Ai-Tutor - no complex Android intent options
    const lang = options?.language || 'en-US';
    
    try {
      const startOpts: any = {
        lang,
        interimResults: options?.interimResults !== false,
        continuous: options?.continuous || false, // Default to false like Ai-Tutor
      };
      lastOptionsRef.current = startOpts;
      startingRecognitionRef.current = true;
      ExpoSpeechRecognitionModule.start(startOpts);
      setIsListening(true);
      startingRecognitionRef.current = false;
    } catch (e) {
      console.log('Failed to start recognition', e);
      throw e;
    }
  }, []);

  // Add event listeners similar to Ai-Tutor
  useSpeechRecognitionEvent('result', (event: any) => {
    console.log('Speech result:', event);
    // Save latest transcript (prefer final)
    const first = event?.results?.[0];
    if (first?.transcript) {
      transcriptRef.current = first.transcript;
      lastResultAtRef.current = Date.now();
      
      if (event.isFinal) {
        // Final segment: append to accumulated text and start a grace period before committing
        const segment = (first.transcript || '').trim();
        if (segment) {
          accumulatedTextRef.current = accumulatedTextRef.current
            ? `${accumulatedTextRef.current} ${segment}`
            : segment;
        }
        const result: TranscriptionResult = {
          text: accumulatedTextRef.current,
          confidence: first.confidence || 0.8,
          duration: 0,
        };
        pendingFinalResultRef.current = result;
        finalResultRef.current = result;
        setCurrentText(result.text);
        setConfidence(result.confidence);
        setIsTranscribing(false);
        // Begin or reset grace timer
        if (pendingFinalizeTimerRef.current) {
          clearTimeout(pendingFinalizeTimerRef.current);
        }
        pendingFinalizeTimerRef.current = setTimeout(() => {
          // If no new interim results have arrived during grace, finalize now
          if (pendingFinalResultRef.current) {
            const toCommit = pendingFinalResultRef.current;
            setFinalText(toCommit.text);
            setCurrentText(toCommit.text);
            setConfidence(toCommit.confidence);
            pendingFinalResultRef.current = null;
          }
          pendingFinalizeTimerRef.current = null;
          shouldAutoRestartOnEndRef.current = false;
          // Recognition may already be stopped by 'end' event; ensure state reflects that
          try {
            // Stop any auto-restarted recognition session now that grace has expired
            ExpoSpeechRecognitionModule.stop();
          } catch {}
          setIsListening(false);
          setIsTranscribing(false);
        }, 2000);
        // Allow an auto-restart on 'end' to keep listening during grace
        shouldAutoRestartOnEndRef.current = true;
      } else {
        // Interim result: show accumulated + interim so earlier speech is preserved in UI
        const interimDisplay = accumulatedTextRef.current
          ? `${accumulatedTextRef.current} ${first.transcript}`
          : first.transcript;
        setCurrentText(interimDisplay);
        setConfidence(first.confidence || 0.8);
        // If we were planning to finalize, cancel it because user resumed speaking
        if (pendingFinalizeTimerRef.current) {
          clearTimeout(pendingFinalizeTimerRef.current);
          pendingFinalizeTimerRef.current = null;
          pendingFinalResultRef.current = null;
          shouldAutoRestartOnEndRef.current = false;
        }
      }
    }
  });

  useSpeechRecognitionEvent('end', () => {
    console.log('Speech recognition ended');
    // If we are within a grace period, try to keep listening until the timer decides
    if (pendingFinalizeTimerRef.current) {
      if (shouldAutoRestartOnEndRef.current && lastOptionsRef.current && !startingRecognitionRef.current) {
        try {
          startingRecognitionRef.current = true;
          ExpoSpeechRecognitionModule.start(lastOptionsRef.current as any);
          setIsListening(true);
        } catch (e) {
          console.log('Auto-restart after end failed', e);
        } finally {
          startingRecognitionRef.current = false;
        }
      }
      // Do not finalize yet; the grace timer will handle committing or cancelling
      return;
    }

    // No grace period pending - finalize immediately based on whatever we have
    setIsListening(false);
    setIsTranscribing(false);

    const accumulated = (accumulatedTextRef.current || '').trim();
    const spoken = accumulated || (transcriptRef.current || '').trim();
    if (spoken && !finalResultRef.current) {
      // Create final result if we don't have one
      const result: TranscriptionResult = {
        text: spoken,
        confidence: 0.8,
        duration: 0,
      };
      finalResultRef.current = result;
      setFinalText(result.text);
      setCurrentText(result.text);
      setConfidence(result.confidence);
    }
    transcriptRef.current = '';
    accumulatedTextRef.current = '';
  });

  useSpeechRecognitionEvent('error', async (event: any) => {
    console.log('STT error:', event?.error, event?.message);
    const errorMessage = (event?.message || event?.error || 'Speech recognition error').toString();
    const isNoSpeech = /no\s*-?speech/i.test(errorMessage);

    // Common state updates
    setIsListening(false);
    setIsTranscribing(false);

    // Treat 'no-speech' as a benign end-of-input signal
    if (isNoSpeech) {
      // If we are within a grace period, try to keep listening until the timer decides
      if (pendingFinalizeTimerRef.current) {
        if (shouldAutoRestartOnEndRef.current && lastOptionsRef.current && !startingRecognitionRef.current) {
          try {
            startingRecognitionRef.current = true;
            ExpoSpeechRecognitionModule.start(lastOptionsRef.current as any);
            setIsListening(true);
          } catch (e) {
            console.log('Auto-restart after no-speech failed', e);
          } finally {
            startingRecognitionRef.current = false;
          }
        }
        return; // Let grace timer handle commit/cancel
      }

      // No grace timer pending: finalize immediately based on accumulated or latest transcript
      const accumulated = (accumulatedTextRef.current || '').trim();
      const spoken = accumulated || (transcriptRef.current || '').trim();
      if (spoken && !finalResultRef.current) {
        const result: TranscriptionResult = {
          text: spoken,
          confidence: 0.8,
          duration: 0,
        };
        finalResultRef.current = result;
        setFinalText(result.text);
        setCurrentText(result.text);
        setConfidence(result.confidence);
      }
      transcriptRef.current = '';
      accumulatedTextRef.current = '';
      // Do not set error for benign no-speech
      return;
    }

    // Handle other errors gracefully like in the original implementation
    const isPermissionError = errorMessage.toLowerCase().includes('permission') ||
                             errorMessage.toLowerCase().includes('microphone') ||
                             errorMessage.toLowerCase().includes('speech recognition');

    if (isPermissionError) {
      const handled = await handleSpeechRecognitionError(new Error(errorMessage));
      if (handled) {
        setError(null);
      } else {
        setError(errorMessage);
      }
    } else {
      setError(errorMessage);
    }
  });

  const startListening = useCallback(async (options?: {
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
    saveRecording?: boolean;
    recordingQuality?: 'low' | 'medium' | 'high';
    preferOnDevice?: boolean; // New option to prefer on-device recognition
  }) => {
    try {
      setError(null);
      setCurrentText('');
      setFinalText('');
      setConfidence(0);
      setRecordingUri(null);
      finalResultRef.current = null;

      // Check if service is configured
      if (!expoSpeechToTextService.isConfigured()) {
        throw new Error('Speech recognition is not available on this device');
      }

      // Use simplified direct approach like Ai-Tutor for better Android compatibility
      await startSimplifiedSpeechRecognition(options);

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start speech recognition');

      // Handle permission errors gracefully
      const isPermissionError = error.message.toLowerCase().includes('permission') ||
                               error.message.toLowerCase().includes('microphone') ||
                               error.message.toLowerCase().includes('speech recognition');

      if (isPermissionError) {
        const handled = await handleSpeechRecognitionError(error);
        if (handled) {
          // Error was handled by showing user-friendly dialog
          setError(null);
        } else {
          setError(error.message);
        }
      } else {
        setError(error.message);
      }

      setIsListening(false);
      setIsTranscribing(false);
      console.error('Start listening error:', err);
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      setError(null);
      if (pendingFinalizeTimerRef.current) {
        clearTimeout(pendingFinalizeTimerRef.current);
        pendingFinalizeTimerRef.current = null;
        pendingFinalResultRef.current = null;
        shouldAutoRestartOnEndRef.current = false;
      }
      // Use direct module call like Ai-Tutor
      ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
      accumulatedTextRef.current = '';
      transcriptRef.current = '';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop speech recognition';
      setError(errorMessage);
      console.error('Stop listening error:', err);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearText = useCallback(() => {
    setCurrentText('');
    setFinalText('');
    setConfidence(0);
    finalResultRef.current = null;
    accumulatedTextRef.current = '';
  }, []);

  return {
    isListening,
    isTranscribing,
    currentText,
    finalText,
    confidence,
    error,
    recordingUri,
    startListening,
    stopListening,
    clearError,
    clearText,
  };
}
