import { useCallback, useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import { useAIResponse } from './useAIResponse';
import { useNativeSpeechRecognition } from './useNativeSpeechRecognition';
import { useTextToSpeech } from './useTextToSpeech';
import { useNotifications } from './useNotifications';
import { useAlert } from '@/contexts/AlertContext';
import { ContactSearchResult, PhoneNumberInfo } from '@/services/ContactCallingService';
import * as Linking from 'expo-linking';
import { phoneCallService } from '@/services/PhoneCallService';
import { usePermissions } from '@/contexts/PermissionContext';
import { useCurrentModel } from '@/contexts/ModelContext';
import { AVAILABLE_MODELS } from '@/types/models';

export type VoiceAssistantState = 'idle' | 'listening' | 'processing' | 'thinking' | 'speaking';

export interface ConversationTurn {
  id: string;
  userText: string;
  aiResponse: string;
  timestamp: Date;
  duration: {
    total: number;
    speech: number;
    aiGeneration: number;
    tts: number;
  };
  confidence: number;
  recordingUri?: string;
}

export interface UseVoiceAssistantFlowReturn {
  // State
  assistantState: VoiceAssistantState;
  currentTurn: ConversationTurn | null;
  conversationHistory: ConversationTurn[];
  isListening: boolean;
  currentText: string;
  confidence: number;
  error: string | null;
  isReady: boolean;

  // Actions
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  clearError: () => void;
  clearHistory: () => void;

  // Compatibility with main app interface
  startConversation: () => Promise<void>;
  stopConversation: () => Promise<void>;
  resetConversation: () => void;
  getStatusText: () => string;

  // Mock VAD properties for compatibility
  isVADActive: boolean;
  currentVolume: number;

  // Mock service status for compatibility
  servicesReady: {
    recording: boolean;
    transcription: boolean;
    ai: boolean;
    tts: boolean;
    vad: boolean;
  };
}

/**
 * Enhanced Voice Assistant Flow using native speech recognition
 * This version eliminates the "no-speech" error by using expo-speech-recognition's built-in recording
 */
export function useVoiceAssistantFlowNative(): UseVoiceAssistantFlowReturn {
  // State
  const [assistantState, setAssistantState] = useState<VoiceAssistantState>('idle');
  const [currentTurn, setCurrentTurn] = useState<ConversationTurn | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [error, setError] = useState<string | null>(null);

  
  // Refs for timing
  const turnStartTime = useRef<Date | null>(null);
  const speechStartTime = useRef<Date | null>(null);
  const aiStartTime = useRef<Date | null>(null);
  const ttsStartTime = useRef<Date | null>(null);
  const waitingForTTSDoneRef = useRef<boolean>(false);
  // Track last processed transcript to avoid double-processing and to process even if assistantState changed
  const lastProcessedFinalTextRef = useRef<string>('');
  // Retry management to gracefully handle Android BUSY/cooldown internally
  const pendingStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef<number>(0);
  const MAX_BUSY_RETRIES = 6;
  
  // Hooks
  const speechRecognition = useNativeSpeechRecognition();
  const aiResponse = useAIResponse();
  const textToSpeech = useTextToSpeech();
  const notifications = useNotifications();
  const alert = useAlert();
  const { requestPermission } = usePermissions();
  const { selectedModel } = useCurrentModel();

  // Compute character-specific TTS voice settings based on selected model and available voices
  const getCharacterVoiceOptions = useCallback((): {
    voice?: string;
    pitch?: number;
    rate?: number;
  } => {
    try {
      // Determine a stable index for the selected model
      const modelIndex = Math.max(0, AVAILABLE_MODELS.findIndex(m => m.id === (selectedModel as any)));

      // Prefer English voices first; fallback to all voices if not enough variety
      const allVoices = textToSpeech.availableVoices || [];
      const enVoices = allVoices.filter(v => v.language?.toLowerCase().startsWith('en'));
      const candidateVoices = enVoices.length >= 2 ? enVoices : (allVoices.length > 0 ? allVoices : []);

      let chosenVoice: string | undefined = undefined;
      if (candidateVoices.length > 0) {
        const idx = modelIndex % candidateVoices.length;
        chosenVoice = candidateVoices[idx].identifier;
      }

      // Distinct fallback profiles to keep characters sounding different even with same base voice
      const fallbackProfiles = [
        { pitch: 1.15, rate: 0.95 }, // model 0
        { pitch: 0.95, rate: 0.90 }, // model 1
        { pitch: 1.20, rate: 1.00 }, // model 2
        { pitch: 0.90, rate: 0.80 }, // model 3
        { pitch: 1.05, rate: 1.05 }, // model 4
        { pitch: 1.30, rate: 0.90 }, // model 5
      ];

      const profile = fallbackProfiles[modelIndex % fallbackProfiles.length];
      return { voice: chosenVoice, pitch: profile.pitch, rate: profile.rate };
    } catch (e) {
      // Safe fallback
      return { pitch: 1.0, rate: 0.9 };
    }
  }, [selectedModel, textToSpeech.availableVoices]);

  // Helper to ensure every TTS call respects the currently selected character's voice profile
  const speakWithCharacter = useCallback(async (text: string, options?: Parameters<typeof textToSpeech.speak>[1]) => {
    const voiceOpts = getCharacterVoiceOptions();
    // Ensure our character voice overrides defaults while still allowing callbacks from options
    await textToSpeech.speak(text, { language: 'en-US', ...(options || {}), ...voiceOpts });
  }, [getCharacterVoiceOptions, textToSpeech]);

  // Create new conversation turn
  const createNewTurn = useCallback((): ConversationTurn => {
    return {
      id: `turn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      userText: '',
      aiResponse: '',
      timestamp: new Date(),
      duration: {
        total: 0,
        speech: 0,
        aiGeneration: 0,
        tts: 0,
      },
      confidence: 0,
    };
  }, []);

  // Start listening for speech
  const startListening = useCallback(async () => {
    try {
      setError(null);
      // Clear any pending retry
      if (pendingStartTimeoutRef.current) {
        clearTimeout(pendingStartTimeoutRef.current);
        pendingStartTimeoutRef.current = null;
      }

      // Reset retry counter for a fresh explicit start
      retryCountRef.current = 0;
      // Reset last processed transcript tracker on fresh start
      lastProcessedFinalTextRef.current = '';

      setAssistantState('listening');
      
      // Create new turn and start timing
      const newTurn = createNewTurn();
      setCurrentTurn(newTurn);
      turnStartTime.current = new Date();
      speechStartTime.current = new Date();

      await speechRecognition.startListening({
        language: 'en-US',
        continuous: false, // Removed continuous mode
        interimResults: true,
        saveRecording: true,
        recordingQuality: 'high',
        preferOnDevice: false, // Use cloud recognition for better accuracy
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start listening';

      // Check if it's a cooldown error
      const isCooldownError = (err as any).isCooldown === true;

      if (isCooldownError) {
        // Silent, fast auto-retry to bypass BUSY state
        if (retryCountRef.current < MAX_BUSY_RETRIES) {
          const attempt = ++retryCountRef.current;
          const delay = 60 + attempt * 60; // 60ms, 120ms, ... ~ up to ~420ms
          pendingStartTimeoutRef.current = setTimeout(() => {
            pendingStartTimeoutRef.current = null;
            startListening();
          }, delay);
          // Keep UI state as-is (typically 'listening') to avoid flicker
          return;
        }
      } else {
        // Handle other errors normally
        setError(errorMessage);
        alert.showAlert({
          title: 'Error',
          message: errorMessage,
          type: 'error'
        });
      }

      // Only revert UI to idle after non-busy failures or exhausted retries
      if (!isCooldownError || retryCountRef.current >= MAX_BUSY_RETRIES) {
        setAssistantState('idle');
      }
    }
  }, [speechRecognition, createNewTurn, alert]);

  // Stop listening
  const stopListening = useCallback(async () => {
    speechRecognition.stopListening();
  }, [speechRecognition]);

  // Process final speech result
  const processFinalResult = useCallback(async (text: string, confidence: number, recordingUri?: string) => {
    if (!currentTurn || !text.trim()) {
      setAssistantState('idle');
      return;
    }

    try {
      setAssistantState('processing');
      
      // Calculate speech duration
      const speechDuration = speechStartTime.current 
        ? Date.now() - speechStartTime.current.getTime() 
        : 0;

      // Update turn with speech results
      const updatedTurn: ConversationTurn = {
        ...currentTurn,
        userText: text,
        confidence,
        recordingUri,
        duration: {
          ...currentTurn.duration,
          speech: speechDuration,
        },
      };
      setCurrentTurn(updatedTurn);

      // Generate AI response
      setAssistantState('thinking');
      aiStartTime.current = new Date();
      
      const aiResult = await aiResponse.generateResponse(text);
      
      if (!aiResult) {
        throw new Error('Failed to generate AI response');
      }

      const aiDuration = aiStartTime.current 
        ? Date.now() - aiStartTime.current.getTime() 
        : 0;

      // Update turn with AI response
      const turnWithAI: ConversationTurn = {
        ...updatedTurn,
        aiResponse: aiResult.text,
        duration: {
          ...updatedTurn.duration,
          aiGeneration: aiDuration,
        },
      };
      setCurrentTurn(turnWithAI);

      // Check if this is a contacts permission request
      if (aiResult.text === 'CONTACTS_PERMISSION_REQUIRED') {
        try {
          setAssistantState('idle');

          // Request contacts permission using the new permission system
          const permissionResult = await requestPermission('contacts');

          if (permissionResult.granted) {
            // Permission granted, speak confirmation and retry the call command
            await speakWithCharacter('Contacts permission granted! Please repeat your call command.');
          } else {
            // Permission denied, provide helpful feedback
            await speakWithCharacter('I need contacts permission to help you make calls. You can grant this permission in your device settings.');
          }

          return; // Don't continue with normal TTS
        } catch (error) {
          console.error('Error handling contacts permission request:', error);
          // Fall through to normal TTS with error message
        }
      }

      // Check if this is a call command response with contacts
      if (aiResult.text.startsWith('CALL_CONTACTS_FOUND:')) {
        try {
          const callData = JSON.parse(aiResult.text.replace('CALL_CONTACTS_FOUND:', ''));
          const { query, contacts } = callData;

          // Show contact picker instead of speaking
          setAssistantState('idle');

          alert.showContactPicker(
            contacts,
            query,
            async (selectedContact: ContactSearchResult, selectedPhone: PhoneNumberInfo) => {
              try {
                // Format phone number for dialing
                const phoneNumber = selectedPhone.formattedNumber;
                const telUrl = `tel:${phoneNumber}`;

                try {
                  const result = await phoneCallService.makePhoneCall(selectedPhone.number);
                  
                  if (result.success) {
                    // Speak confirmation with more natural language
                    const confirmationMessage = selectedPhone.label.toLowerCase() === 'mobile'
                      ? `Calling ${selectedContact.name} on their mobile phone.`
                      : `Calling ${selectedContact.name} at their ${selectedPhone.label.toLowerCase()} number.`;

                    await speakWithCharacter(confirmationMessage);
                  } else {
                    const errorMessage = phoneCallService.getUserFriendlyError(result.error || 'Unknown error');
                    alert.showError(errorMessage, 'Call Error');

                    // Also speak the error for voice feedback
                    await speakWithCharacter(errorMessage);
                  }
                } catch (error) {
                  console.error('Error making phone call:', error);
                  const errorMessage = 'Sorry, I cannot open the dialer on this device. Please try using your phone\'s dialer app.';
                  alert.showError(errorMessage, 'Call Error');

                  // Speak error feedback
                  await speakWithCharacter(errorMessage);
                }
              } catch (error) {
                console.error('Error parsing call data:', error);
                // Fall through to normal TTS
              }
            },
            `Call ${query}`,
            async () => {
              // Handle cancellation - provide voice feedback
              await speakWithCharacter('Call cancelled.');
            }
          );

          // Update turn with a user-friendly message for history
          const finalTurn: ConversationTurn = {
            ...turnWithAI,
            aiResponse: `I found ${contacts.length} contact${contacts.length !== 1 ? 's' : ''} for "${query}". Please select the one you'd like to call.`,
            duration: {
              ...turnWithAI.duration,
              tts: 0,
              total: turnStartTime.current ? Date.now() - turnStartTime.current.getTime() : 0,
            },
          };

          // Add to conversation history and reset
          setConversationHistory(prev => [...prev, finalTurn]);
          setCurrentTurn(null);
          return;

        } catch (error) {
          console.error('Error parsing call data:', error);
          // Fall through to normal TTS
        }
      }

      // Send notification if app is backgrounded
      if (AppState.currentState !== 'active') {
        notifications.showAIResponseNotification(
          'AI Response Ready',
          aiResult.text.length > 100
            ? aiResult.text.substring(0, 100) + '...'
            : aiResult.text
        );
      }

      // Speak the response
      setAssistantState('speaking');
      ttsStartTime.current = new Date();
      waitingForTTSDoneRef.current = true;

      await speakWithCharacter(aiResult.text, {
        onStart: () => {
          waitingForTTSDoneRef.current = true;
        },
        onDone: () => {
          waitingForTTSDoneRef.current = false;
        },
        onStopped: () => {
          waitingForTTSDoneRef.current = false;
        },
        onError: () => {
          waitingForTTSDoneRef.current = false;
        },
      });
      
      const ttsDuration = ttsStartTime.current 
        ? Date.now() - ttsStartTime.current.getTime() 
        : 0;

      // Calculate total duration and finalize turn
      const totalDuration = turnStartTime.current 
        ? Date.now() - turnStartTime.current.getTime() 
        : 0;

      const finalTurn: ConversationTurn = {
        ...turnWithAI,
        duration: {
          ...turnWithAI.duration,
          tts: ttsDuration,
          total: totalDuration,
        },
      };

      // Add to history and reset
      setConversationHistory(prev => [finalTurn, ...prev]);
      setCurrentTurn(null);
      setAssistantState('idle');

      // Conversation completed - no auto-restart needed

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process speech';

      // Check if it's a cooldown error
      const isCooldownError = (err as any).isCooldown === true;

      if (isCooldownError) {
        // Show custom cooldown alert
        alert.showAlert({
          title: '🎤 Voice Assistant Cooldown',
          message: 'Please wait a moment before speaking again. The voice recognition service needs a brief cooldown period to ensure optimal performance.',
          type: 'warning',
          buttons: [
            {
              text: 'Got it!',
              style: 'default'
            }
          ]
        });
      } else {
        // Handle other errors normally
        setError(errorMessage);
        alert.showAlert({
          title: 'Error',
          message: errorMessage,
          type: 'error'
        });
      }

      setAssistantState('idle');
    }
  }, [currentTurn, aiResponse, textToSpeech, notifications, alert, startListening, assistantState]);

  // Handle speech recognition events
  useEffect(() => {
    if (speechRecognition.finalText && speechRecognition.finalText !== lastProcessedFinalTextRef.current) {
      lastProcessedFinalTextRef.current = speechRecognition.finalText;
      processFinalResult(
        speechRecognition.finalText,
        speechRecognition.confidence,
        speechRecognition.recordingUri || undefined
      );
    }
  }, [speechRecognition.finalText, speechRecognition.confidence, speechRecognition.recordingUri, assistantState, processFinalResult]);

  // Reset retry counter when we successfully start listening
  useEffect(() => {
    if (speechRecognition.isListening) {
      retryCountRef.current = 0;
    }
  }, [speechRecognition.isListening]);

  // Handle speech recognition errors
  useEffect(() => {
    if (speechRecognition.error) {
      // Check if it's a cooldown error
      const isCooldownError = speechRecognition.error.startsWith('COOLDOWN_ERROR:');
      const isNoSpeechError = /no\s*-?speech/i.test(speechRecognition.error);

      if (isCooldownError) {
        // Silently clear cooldown errors; auto-retry logic in startListening will handle it
        speechRecognition.clearError();
      } else if (isNoSpeechError) {
        // Treat 'no-speech' as benign: clear without changing assistant state
        speechRecognition.clearError();
      } else {
        // Handle other errors normally
        setError(speechRecognition.error);
        setAssistantState('idle');
      }
    }
  }, [speechRecognition.error, alert, speechRecognition]);

  // Handle TTS completion
  useEffect(() => {
    if (
      assistantState === 'speaking' &&
      !textToSpeech.isSpeaking &&
      !waitingForTTSDoneRef.current
    ) {
      setAssistantState('idle');
    }
  }, [assistantState, textToSpeech.isSpeaking]);

  // Cleanup any queued starts on unmount
  useEffect(() => {
    return () => {
      if (pendingStartTimeoutRef.current) {
        clearTimeout(pendingStartTimeoutRef.current);
        pendingStartTimeoutRef.current = null;
      }
    };
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
    speechRecognition.clearError();
  }, [speechRecognition]);

  // Clear history
  const clearHistory = useCallback(() => {
    setConversationHistory([]);
  }, []);

  // Compatibility methods
  const getStatusText = useCallback(() => {
    switch (assistantState) {
      case 'idle':
        return 'Tap the avatar to start speaking';
      case 'listening':
        return 'Listening... Speak naturally';
      case 'processing':
        return 'Processing your speech...';
      case 'thinking':
        return 'Generating response...';
      case 'speaking':
        return 'Speaking... (Tap to stop)';
      default:
        return 'Ready';
    }
  }, [assistantState]);

  const resetConversation = useCallback(() => {
    clearHistory();
    clearError();
    setCurrentTurn(null);
    setAssistantState('idle');
  }, [clearHistory, clearError]);

  return {
    // State
    assistantState,
    currentTurn,
    conversationHistory,
    isListening: speechRecognition.isListening,
    currentText: speechRecognition.currentText,
    confidence: speechRecognition.confidence,
    error: error || (speechRecognition.error && !speechRecognition.error.startsWith('COOLDOWN_ERROR:') ? speechRecognition.error : null),
    isReady: true, // Native speech recognition is always ready

    // Actions
    startListening,
    stopListening,
    clearError,
    clearHistory,

    // Compatibility with main app interface
    startConversation: startListening, // Same functionality
    stopConversation: stopListening,   // Same functionality
    resetConversation,
    getStatusText,

    // Mock VAD properties for compatibility (not used in native approach)
    isVADActive: false,
    currentVolume: 0,

    // Mock service status for compatibility
    servicesReady: {
      recording: true,
      transcription: true,
      ai: true,
      tts: true,
      vad: false, // We don't use VAD in native approach
    },
  };
}
