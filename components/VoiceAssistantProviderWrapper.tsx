import React, { createContext, useContext, ReactNode, useState, useRef, useCallback, useEffect } from 'react';
import { Alert, AppState } from 'react-native';
import { Audio } from 'expo-av';
import { API_CONFIG } from '@/config/api';
import { useModel } from '@/contexts/ModelContext';
import { voiceSessionTracker } from '@/utils/voiceSessionTracker';
import { getSupabaseAnonKey } from '@/config/supabase';
import * as FileSystem from 'expo-file-system';
import LiveAudioStream from 'react-native-live-audio-stream';
import { Buffer } from 'buffer';

export type AssistantState = 'idle' | 'connecting' | 'calling' | 'speaking' | 'error';

export interface VoiceAssistantContextType {
  assistantState: AssistantState;
  showEndCallButton: boolean;
  startConversation: () => Promise<void>;
  stopConversation: () => Promise<void>;
  getStatusText: () => string;
  error: string | null;
  transcript: string;
  isVADActive: boolean;
  conversationHistory: any[];
  currentText: string;
  clearError: () => void;
  clearHistory: () => void;
  resetConversation: () => void;
  isInitialized: boolean; // New: Indicates if the voice assistant is ready to be used
  initializationError: string | null; // New: Tracks any initialization errors
}

const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

const createPCM16Sound = async (pcmBuffer: Buffer) => {
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;

  const wavBuffer = Buffer.alloc(44 + pcmBuffer.length);

  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(36 + pcmBuffer.length, 4);
  wavBuffer.write('WAVE', 8);
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20);
  wavBuffer.writeUInt16LE(numChannels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28);
  wavBuffer.writeUInt16LE(numChannels * bitsPerSample / 8, 32);
  wavBuffer.writeUInt16LE(bitsPerSample, 34);
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(pcmBuffer.length, 40);
  pcmBuffer.copy(wavBuffer, 44);

  const wavBase64 = wavBuffer.toString('base64');
  const uri = FileSystem.cacheDirectory + `audio_${Date.now()}_${Math.random().toString(16).slice(2)}.wav`;
  await FileSystem.writeAsStringAsync(uri, wavBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const expectedMs = Math.max(50, Math.floor((pcmBuffer.length / (sampleRate * 2)) * 1000));
  const { sound } = await Audio.Sound.createAsync({ uri });
  return { sound, uri, expectedMs };
};

const playSoundAndWait = async (sound: Audio.Sound, expectedMs: number) => {
  await sound.playAsync();
  await new Promise<void>((resolve) => {
    let finished = false;
    const safetyTimeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      resolve();
    }, expectedMs + 350);

    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(safetyTimeout);
      resolve();
    };

    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) {
        finish();
        return;
      }
      if (status.didJustFinish) {
        finish();
      }
    });
  });
};

const cleanupSound = async (sound: Audio.Sound, uri: string) => {
  try {
    await sound.unloadAsync();
  } catch {
  }
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
  }
};

export function VoiceAssistantProvider({ children }: { children: ReactNode }) {
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [showEndCallButton, setShowEndCallButton] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isVADActive, setIsVADActive] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [currentText, setCurrentText] = useState('');

  // New: Initialization state tracking
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const initializationAttemptedRef = useRef(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioPlayerRef = useRef<Audio.Sound | null>(null);
  const audioBufferRef = useRef<Buffer[]>([]);
  const isPlayingRef = useRef(false);
  const drainPromiseRef = useRef<Promise<void> | null>(null);
  const isStreamingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const isConnectingRef = useRef(false);
  const closeRequestedRef = useRef(false);
  const assistantStateRef = useRef<AssistantState>('idle');
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveAudioSubscriptionRef = useRef<{ remove?: () => void } | null>(null);
  const hadSpeechRef = useRef(false);
  const suppressAiAudioUntilMsRef = useRef(0);
  const shouldSendMicAudioRef = useRef(true);
  const localVadCountRef = useRef(0);
  const localSpeechLastMsRef = useRef(0);
  const localSpeechActiveRef = useRef(false);
  const suppressMicSendUntilMsRef = useRef(0);
  const awaitingResponseRef = useRef(false);
  const aiResponseDoneRef = useRef(false);
  const isPlaybackModeRef = useRef(false);
  const preloadedSoundRef = useRef<{ sound: Audio.Sound; uri: string; expectedMs: number } | null>(null);
  const preloadInFlightRef = useRef<Promise<void> | null>(null);
  const bargeInInProgressRef = useRef(false);
  const responseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResponseCreateTimeRef = useRef(0);
  const responseInProgressRef = useRef(false);  // Track if AI is generating a response
  const sessionIdRef = useRef<string | null>(null);  // Track current session for debugging
  const activeSessionCountRef = useRef(0);  // Track number of sessions to detect duplicates
  const { selectedModelInfo } = useModel();

  // Generate unique session ID for tracking
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Initialize voice assistant capabilities on mount
  useEffect(() => {
    const initializeVoiceAssistant = async () => {
      // Prevent multiple initialization attempts
      if (initializationAttemptedRef.current) return;
      initializationAttemptedRef.current = true;

      try {
        console.log('🔧 Initializing voice assistant...');

        // Wait for model info to be available
        if (!selectedModelInfo || !selectedModelInfo.voice) {
          console.log('⏳ Waiting for model info...');
          // Don't mark as initialized yet - will retry when model is available
          initializationAttemptedRef.current = false;
          return;
        }

        // Verify audio permissions are requestable (but don't request yet)
        // This just checks if the expo-av module is working
        try {
          const { status } = await Audio.getPermissionsAsync();
          console.log(`🔊 Audio permissions status: ${status}`);
        } catch (audioError) {
          console.warn('⚠️ Audio module check failed:', audioError);
          // Don't fail initialization, just log warning
        }

        // Verify LiveAudioStream is available
        if (typeof LiveAudioStream === 'undefined') {
          throw new Error('LiveAudioStream module not available');
        }

        console.log('✅ Voice assistant initialized successfully');
        setIsInitialized(true);
        setInitializationError(null);
      } catch (err: any) {
        console.error('❌ Voice assistant initialization failed:', err);
        setInitializationError(err.message || 'Failed to initialize voice assistant');
        setIsInitialized(false);
      }
    };

    initializeVoiceAssistant();
  }, [selectedModelInfo]);

  useEffect(() => {
    assistantStateRef.current = assistantState;
  }, [assistantState]);

  const stopPlayback = useCallback(async () => {
    audioBufferRef.current = [];
    isPlayingRef.current = false;

    if (preloadedSoundRef.current) {
      const pre = preloadedSoundRef.current;
      preloadedSoundRef.current = null;
      try {
        await cleanupSound(pre.sound, pre.uri);
      } catch {
      }
    }

    if (audioPlayerRef.current) {
      try {
        await audioPlayerRef.current.stopAsync();
      } catch {
      }
      try {
        await audioPlayerRef.current.unloadAsync();
      } catch {
      }
      audioPlayerRef.current = null;
    }
  }, []);

  const setAudioModeForMic = useCallback(async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      // Force loudspeaker on Android
      playThroughEarpieceAndroid: false,
      shouldDuckAndroid: true,
    });
  }, []);

  const setAudioModeForPlayback = useCallback(async () => {
    // Best-effort loudspeaker routing:
    // - Android: keep speaker
    // - iOS: using allowsRecordingIOS=false will use Playback category which routes to speaker.
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      playThroughEarpieceAndroid: false,
      shouldDuckAndroid: true,
    });
  }, []);

  const startMicStreaming = useCallback(() => {
    try {
      if (isStreamingRef.current) return;
      LiveAudioStream.start();
      isStreamingRef.current = true;
    } catch (e) {
      console.error('❌ Failed to start audio streaming:', e);
    }
  }, []);

  const stopMicStreaming = useCallback(() => {
    try {
      if (!isStreamingRef.current) return;
      LiveAudioStream.stop();
      isStreamingRef.current = false;
    } catch {
    }
  }, []);

  // CRITICAL: Clean up any existing session before starting new one
  // This prevents duplicate sessions and excessive token consumption
  const cleanupExistingSession = useCallback(async () => {
    const currentSession = sessionIdRef.current;
    if (currentSession) {
      console.log(`🧹 Cleaning up existing session: ${currentSession}`);
    }

    // Stop any ongoing mic streaming FIRST to prevent more audio being sent
    try {
      if (isStreamingRef.current) {
        LiveAudioStream.stop();
        isStreamingRef.current = false;
      }
    } catch {
    }

    // Remove audio listener to prevent duplicate sends
    if (liveAudioSubscriptionRef.current) {
      try {
        liveAudioSubscriptionRef.current.remove?.();
      } catch {
      }
      liveAudioSubscriptionRef.current = null;
    }

    // Clear response timeout
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }

    // Close existing WebSocket with proper cleanup
    const existingWs = wsRef.current;
    if (existingWs) {
      wsRef.current = null;  // Clear ref BEFORE closing to prevent onclose from reconnecting

      // Try to cancel any in-flight response before closing
      if (existingWs.readyState === WebSocket.OPEN) {
        try {
          existingWs.send(JSON.stringify({ type: 'response.cancel' }));
        } catch {
        }
      }

      try {
        existingWs.onclose = null;  // Prevent reconnect logic
        existingWs.onerror = null;
        existingWs.onmessage = null;
        existingWs.onopen = null;
        existingWs.close(1000, 'session_cleanup');
      } catch {
      }
    }

    // Stop audio playback (inline to avoid circular dependency)
    audioBufferRef.current = [];
    isPlayingRef.current = false;
    if (preloadedSoundRef.current) {
      try {
        await cleanupSound(preloadedSoundRef.current.sound, preloadedSoundRef.current.uri);
      } catch {
      }
      preloadedSoundRef.current = null;
    }
    if (audioPlayerRef.current) {
      try {
        await audioPlayerRef.current.stopAsync();
        await audioPlayerRef.current.unloadAsync();
      } catch {
      }
      audioPlayerRef.current = null;
    }

    // Reset all state flags
    awaitingResponseRef.current = false;
    responseInProgressRef.current = false;
    lastResponseCreateTimeRef.current = 0;
    hadSpeechRef.current = false;
    localSpeechActiveRef.current = false;
    shouldSendMicAudioRef.current = true;
    aiResponseDoneRef.current = false;
    isPlaybackModeRef.current = false;
    bargeInInProgressRef.current = false;

    sessionIdRef.current = null;
    activeSessionCountRef.current = Math.max(0, activeSessionCountRef.current - 1);

    console.log(`📊 Active sessions after cleanup: ${activeSessionCountRef.current}`);
  }, []);

  const performBargeIn = useCallback(async () => {
    if (bargeInInProgressRef.current) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (assistantStateRef.current !== 'speaking') return;

    bargeInInProgressRef.current = true;
    suppressAiAudioUntilMsRef.current = Date.now() + 750;
    shouldSendMicAudioRef.current = true;
    hadSpeechRef.current = false;

    // Clear response timeout on barge-in
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }
    responseInProgressRef.current = false;
    awaitingResponseRef.current = false;

    audioBufferRef.current = [];
    isPlayingRef.current = false;
    try {
      await stopPlayback();
    } catch {
    }
    try {
      ws.send(JSON.stringify({ type: 'response.cancel' }));
    } catch {
    }
    try {
      await setAudioModeForMic();
    } catch {
    }
    startMicStreaming();
    setAssistantState('calling');
    bargeInInProgressRef.current = false;
  }, [setAudioModeForMic, startMicStreaming, stopPlayback]);

  // Safe wrapper to send response.create with deduplication and timeout
  const safeRequestResponse = useCallback((ws: WebSocket) => {
    const now = Date.now();
    const MIN_RESPONSE_INTERVAL = 500; // Minimum 500ms between response.create calls

    // Prevent duplicate calls too close together
    if (now - lastResponseCreateTimeRef.current < MIN_RESPONSE_INTERVAL) {
      console.log('⏳ Response.create skipped - too soon since last request');
      return;
    }

    // Don't send if already awaiting or response in progress
    if (awaitingResponseRef.current || responseInProgressRef.current) {
      console.log('⏳ Response.create skipped - already awaiting/in-progress');
      return;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      console.log('⏳ Response.create skipped - WebSocket not open');
      return;
    }

    try {
      console.log('📤 Sending input_audio_buffer.commit + response.create');
      ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
      ws.send(JSON.stringify({ type: 'response.create' }));

      lastResponseCreateTimeRef.current = now;
      awaitingResponseRef.current = true;
      hadSpeechRef.current = false;

      // Set a timeout to reset stuck states (15 seconds max wait for response)
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
      }
      responseTimeoutRef.current = setTimeout(() => {
        console.warn('⚠️ Response timeout - resetting stuck state');
        awaitingResponseRef.current = false;
        responseInProgressRef.current = false;
        if (assistantStateRef.current === 'calling' && wsRef.current?.readyState === WebSocket.OPEN) {
          // System is stuck, user can try speaking again
          console.log('🔄 Ready for new input after timeout');
        }
      }, 15000);
    } catch (e) {
      console.error('❌ Failed to send response.create:', e);
      awaitingResponseRef.current = false;
    }
  }, []);

  const drainPlaybackQueue = useCallback(async () => {
    if (assistantStateRef.current === 'idle') return;
    if (drainPromiseRef.current) return drainPromiseRef.current;

    const bytesPerMs = 48; // 24kHz * 16-bit mono => 48000 bytes/sec
    const minPlayBytes = bytesPerMs * 420; // ~420ms prebuffer (more jitter tolerance)
    const maxPlayBytes = bytesPerMs * 2600; // max ~2.6s per segment (preload can keep up)

    const dequeueSegment = () => {
      if (audioBufferRef.current.length === 0) return null;

      if (!aiResponseDoneRef.current) {
        let available = 0;
        for (let i = 0; i < audioBufferRef.current.length; i += 1) {
          available += audioBufferRef.current[i].length;
          if (available >= minPlayBytes) break;
        }
        if (available < minPlayBytes) return null;
      }

      const pcmChunks: Buffer[] = [];
      let total = 0;
      while (audioBufferRef.current.length > 0 && total < maxPlayBytes) {
        const next = audioBufferRef.current[0];
        if (!next) break;
        if (!aiResponseDoneRef.current && total > 0 && total + next.length > maxPlayBytes) break;
        pcmChunks.push(next);
        total += next.length;
        audioBufferRef.current.shift();
      }
      if (pcmChunks.length === 0) return null;
      return Buffer.concat(pcmChunks);
    };

    drainPromiseRef.current = (async () => {
      if (isPlayingRef.current) return;
      isPlayingRef.current = true;

      try {
        let current = preloadedSoundRef.current;
        preloadedSoundRef.current = null;

        const tryStartPreload = () => {
          if (preloadInFlightRef.current) return;
          if (preloadedSoundRef.current) return;

          preloadInFlightRef.current = (async () => {
            while (!isStoppingRef.current && assistantStateRef.current !== 'idle') {
              const seg = dequeueSegment();
              if (seg) {
                const nextSound = await createPCM16Sound(seg);
                preloadedSoundRef.current = nextSound;
                return;
              }
              if (aiResponseDoneRef.current) return;
              await new Promise<void>((r) => setTimeout(r, 25));
            }
          })().finally(() => {
            preloadInFlightRef.current = null;
          });
        };

        while (!isStoppingRef.current && assistantStateRef.current !== 'idle') {
          if (!current) {
            const seg = dequeueSegment();
            if (!seg) {
              if (aiResponseDoneRef.current) break;
              await new Promise<void>((r) => setTimeout(r, 25));
              continue;
            }
            current = await createPCM16Sound(seg);
          }

          audioPlayerRef.current = current.sound;
          tryStartPreload();
          await playSoundAndWait(current.sound, current.expectedMs);
          await cleanupSound(current.sound, current.uri);
          if (audioPlayerRef.current === current.sound) {
            audioPlayerRef.current = null;
          }
          current = null;

          if (preloadedSoundRef.current) {
            current = preloadedSoundRef.current;
            preloadedSoundRef.current = null;
          }
        }
      } finally {
        isPlayingRef.current = false;
      }
    })().finally(() => {
      drainPromiseRef.current = null;
    });

    return drainPromiseRef.current;
  }, []);

  const getStatusText = useCallback(() => {
    switch (assistantState) {
      case 'idle': return 'Tap to connect';
      case 'connecting': return 'Connecting...';
      case 'calling': return 'Listening';
      case 'speaking': return 'Speaking';
      case 'error': return 'Connection error';
      default: return '';
    }
  }, [assistantState]);

  const stopConversation = useCallback(async () => {
    const currentSession = sessionIdRef.current;
    console.log(`🛑 Stopping conversation... (Session: ${currentSession || 'none'})`);

    isStoppingRef.current = true;
    closeRequestedRef.current = true;
    setShowEndCallButton(false);

    // Clear response timeout
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptRef.current = 0;
    isConnectingRef.current = false;

    // Reset response tracking refs
    awaitingResponseRef.current = false;
    responseInProgressRef.current = false;
    lastResponseCreateTimeRef.current = 0;

    // Clear session tracking
    sessionIdRef.current = null;

    stopMicStreaming();

    if (liveAudioSubscriptionRef.current) {
      try {
        liveAudioSubscriptionRef.current.remove?.();
      } catch {
      }
      liveAudioSubscriptionRef.current = null;
    }

    // Close WebSocket
    const wsToClose = wsRef.current;
    if (wsToClose) {
      try {
        wsToClose.close(1000, 'client_end');
      } catch (e) {
        console.error('Error closing WebSocket:', e);
      }
      // Don't clear flags here; ws.onclose will finalize and prevent reconnect.
    }

    // Stop audio playback
    await stopPlayback();

    // Clear audio buffer
    audioBufferRef.current = [];
    isPlayingRef.current = false;

    setAssistantState('idle');
    setIsVADActive(false);
    setCurrentText('');

    voiceSessionTracker.endSession();

    if (!wsToClose) {
      closeRequestedRef.current = false;
      isStoppingRef.current = false;
      wsRef.current = null;
      console.log('✅ Conversation stopped successfully');
    } else {
      console.log('✅ Conversation stop requested (awaiting socket close)');
    }
  }, [stopMicStreaming, stopPlayback]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && assistantStateRef.current !== 'idle') {
        stopConversation();
      }
    });
    return () => {
      sub.remove();
    };
  }, [stopConversation]);

  const connectToGrok = useCallback(async (mode: 'fresh' | 'reconnect') => {
    // CRITICAL: Prevent multiple parallel connection attempts
    if (isConnectingRef.current) {
      console.log('⚠️ Connection attempt blocked - already connecting');
      return;
    }
    if (mode === 'fresh' && assistantStateRef.current !== 'idle') {
      console.log('⚠️ Fresh connection blocked - not in idle state');
      return;
    }

    // Generate new session ID for tracking
    const newSessionId = generateSessionId();
    console.log(`🆕 Starting new session: ${newSessionId} (mode: ${mode})`);

    // Check for duplicate sessions (should never exceed 1)
    if (activeSessionCountRef.current > 0) {
      console.warn(`⚠️ WARNING: ${activeSessionCountRef.current} active session(s) detected! Cleaning up...`);
      await cleanupExistingSession();
    }

    // If there's an existing WebSocket in any state, clean it up first
    if (wsRef.current) {
      console.log('🧹 Cleaning up existing WebSocket before new connection');
      await cleanupExistingSession();
    }

    isConnectingRef.current = true;
    sessionIdRef.current = newSessionId;
    activeSessionCountRef.current += 1;

    console.log(`📊 Active sessions: ${activeSessionCountRef.current}`);

    if (mode === 'fresh') {
      setAssistantState('connecting');
      setError(null);
      voiceSessionTracker.startSession();
      reconnectAttemptRef.current = 0;
      setShowEndCallButton(false);
    } else {
      setAssistantState('connecting');
    }

    try {
      isStoppingRef.current = false;
      closeRequestedRef.current = false;

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        console.log('⚠️ Microphone permission denied - strictly optional');
        // Gracefully handle denial: simply show message and return to idle
        setError('Microphone access is optional');
        setAssistantState('idle');
        isConnectingRef.current = false;
        return;
      }

      await setAudioModeForMic();

      // 1. Fetch ephemeral session token from Supabase Edge Function
      const supabaseAnonKey = getSupabaseAnonKey();
      console.log('🔗 Fetching session from:', API_CONFIG.GROK.SESSION_URL);
      const sessionResponse = await fetch(API_CONFIG.GROK.SESSION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey || '',
        },
        body: JSON.stringify({
          model: API_CONFIG.GROK.MODEL,
          voice: selectedModelInfo.voice,
        }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.text();
        console.error('❌ Session creation failed:', errorData);
        throw new Error('Failed to create realtime session');
      }

      const sessionData = await sessionResponse.json();

      if (!sessionData.client_secret?.value) {
        throw new Error('No client secret received from session');
      }

      const ephemeralKey = sessionData.client_secret.value;
      console.log('✅ Ephemeral token received, connecting to WebSocket...');

      // 2. Connect to Grok Realtime WebSocket with ephemeral key
      const wsUrl = API_CONFIG.GROK.EXTERNAL_API_URL;
      console.log('🔌 Connecting to WebSocket:', wsUrl);

      // Create WebSocket with Authorization header
      // React Native WebSocket supports headers through second parameter
      const ws = new (WebSocket as any)(wsUrl, undefined, {
        headers: {
          'Authorization': `Bearer ${ephemeralKey}`,
        },
      });
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`✅ WebSocket Connected (Session: ${newSessionId})`);
        setShowEndCallButton(true);

        // Initialize session with Grok Voice Agent API format
        const sessionUpdate = {
          type: 'session.update',
          session: {
            voice: selectedModelInfo.voice,
            instructions: sessionData.instructions,
            turn_detection: {
              type: 'server_vad',
              // Increased silence duration for better speech endpoint detection
              silence_duration_ms: 400,
              // Reduced prefix padding to avoid capturing background noise before speech
              prefix_padding_ms: 80,
              // Higher threshold to reduce sensitivity to background noise
              threshold: 0.6,
            },
            audio: {
              input: {
                format: {
                  type: 'audio/pcm',
                  rate: 24000,
                },
              },
              output: {
                format: {
                  type: 'audio/pcm',
                  rate: 24000,
                },
              },
            },
          },
        };
        ws.send(JSON.stringify(sessionUpdate));

        try {
          LiveAudioStream.init({
            wavFile: 'grok_stream.wav',
            sampleRate: 24000,
            channels: 1,
            bitsPerSample: 16,
            audioSource: 7,
            bufferSize: 2048,
          });

          if (liveAudioSubscriptionRef.current) {
            try {
              liveAudioSubscriptionRef.current.remove?.();
            } catch {
            }
            liveAudioSubscriptionRef.current = null;
          }

          liveAudioSubscriptionRef.current = LiveAudioStream.on('data', (base64Audio: string) => {
            const wsNow = wsRef.current;
            if (!wsNow || wsNow.readyState !== WebSocket.OPEN || isStoppingRef.current) return;

            const nowMs = Date.now();
            const pcm = Buffer.from(base64Audio, 'base64');
            let sumSq = 0;
            const sampleCount = Math.floor(pcm.length / 2);
            for (let i = 0; i < sampleCount; i += 8) {
              const s = pcm.readInt16LE(i * 2) / 32768;
              sumSq += s * s;
            }
            const rms = Math.sqrt(sumSq / Math.max(1, Math.floor(sampleCount / 8)));

            // INCREASED threshold from 0.028 to 0.055 to reduce sensitivity to background/far-field sounds
            // This helps filter out distant voices and ambient noise
            // Only direct, close voice input should trigger speech detection
            const SPEECH_DETECTION_THRESHOLD = 0.055;
            const isSpeechLike = rms > SPEECH_DETECTION_THRESHOLD;

            if (assistantStateRef.current === 'speaking') {
              shouldSendMicAudioRef.current = false;

              // INCREASED barge-in threshold from 0.085 to 0.12 for more intentional interruptions
              // Prevents accidental interruptions from background noise
              const BARGE_IN_THRESHOLD = 0.12;
              if (rms > BARGE_IN_THRESHOLD) {
                localVadCountRef.current += 1;
              } else {
                localVadCountRef.current = 0;
              }
              // Require more consecutive frames (4 instead of 3) for barge-in
              if (localVadCountRef.current >= 4) {
                localVadCountRef.current = 0;
                performBargeIn();
              }
              return;
            }

            if (isSpeechLike) {
              localSpeechLastMsRef.current = nowMs;
              if (!localSpeechActiveRef.current) {
                localSpeechActiveRef.current = true;
                hadSpeechRef.current = true;
                setIsVADActive(true);
                setCurrentText('');
              }

              // If we detect speech while awaiting response, cancel that response
              // (user is speaking again before AI responded)
              if (awaitingResponseRef.current && !responseInProgressRef.current) {
                suppressMicSendUntilMsRef.current = 0;
                awaitingResponseRef.current = false;
                try {
                  wsNow.send(JSON.stringify({ type: 'response.cancel' }));
                } catch {
                }
              }
            } else {
              // INCREASED silence duration from 260ms to 350ms for more reliable speech endpoint
              // This prevents cutting off speech too early while filtering transient sounds
              const SILENCE_DURATION_MS = 350;
              if (localSpeechActiveRef.current && nowMs - localSpeechLastMsRef.current > SILENCE_DURATION_MS) {
                localSpeechActiveRef.current = false;
                setIsVADActive(false);

                // LOCAL VAD: Do NOT send response.create here!
                // Let the SERVER VAD (input_audio_buffer.speech_stopped event) handle it
                // This prevents duplicate response.create calls that cause stuttering
                // Only set flags to indicate speech ended, server will trigger response
                suppressMicSendUntilMsRef.current = nowMs + 800;
              }
            }

            if (nowMs < suppressMicSendUntilMsRef.current && !isSpeechLike) return;

            shouldSendMicAudioRef.current = true;
            const audioMessage = {
              type: 'input_audio_buffer.append',
              audio: base64Audio,
            };
            wsNow.send(JSON.stringify(audioMessage));
          }) as any;

          console.log('🎤 Starting live audio streaming...');
          startMicStreaming();
          setAssistantState('calling');
        } catch (streamErr) {
          console.error('❌ Failed to start audio streaming:', streamErr);
          setError('Failed to start microphone');
          setAssistantState('error');
        }
      };

      ws.onmessage = async (event: { data: string }) => {
        const msg = JSON.parse(event.data);

        const msgType = msg.type;

        // Only log non-audio events to reduce noise
        if (msgType !== 'response.output_audio.delta' && msgType !== 'response.audio.delta') {
          console.log('📥 Received event:', msg.type);
        }

        switch (msgType) {
          case 'conversation.created':
            console.log('✅ Conversation session created');
            break;
          case 'session.updated':
            console.log('✅ Session updated');
            break;
          case 'response.output_audio.delta':
          case 'response.audio.delta':
            if (Date.now() < suppressAiAudioUntilMsRef.current) break;
            if (msg.delta) {
              // Clear response timeout since we're receiving audio
              if (responseTimeoutRef.current) {
                clearTimeout(responseTimeoutRef.current);
                responseTimeoutRef.current = null;
              }
              awaitingResponseRef.current = false;
              responseInProgressRef.current = true;  // AI is actively generating response

              if (assistantStateRef.current !== 'speaking') {
                shouldSendMicAudioRef.current = false;
                hadSpeechRef.current = false;
                aiResponseDoneRef.current = false;
                if (!isPlaybackModeRef.current) {
                  isPlaybackModeRef.current = true;
                  try {
                    void setAudioModeForPlayback();
                  } catch {
                  }
                }
              }
              audioBufferRef.current.push(Buffer.from(msg.delta, 'base64'));
              setAssistantState('speaking');
              void drainPlaybackQueue();
            }
            break;
          case 'response.output_audio.done':
          case 'response.audio.done':
            aiResponseDoneRef.current = true;
            responseInProgressRef.current = false;  // AI finished generating this response

            // Clear any response timeout
            if (responseTimeoutRef.current) {
              clearTimeout(responseTimeoutRef.current);
              responseTimeoutRef.current = null;
            }

            await drainPlaybackQueue();
            // After AI finishes speaking, resume mic for hands-free realtime conversation.
            if (wsRef.current?.readyState === WebSocket.OPEN && !isStoppingRef.current) {
              shouldSendMicAudioRef.current = true;
              awaitingResponseRef.current = false;  // Ensure this is reset
              try {
                await setAudioModeForMic();
              } catch {
              }
              isPlaybackModeRef.current = false;
              startMicStreaming();
              if (assistantStateRef.current !== 'speaking') {
                setAssistantState('calling');
              }
            }
            break;
          case 'response.output_audio_transcript.delta':
            setCurrentText(prev => prev + (msg.delta || ''));
            break;
          case 'response.output_audio_transcript.done':
            console.log('📝 Transcript complete');
            break;
          case 'conversation.item.added':
            // Handle new conversation items
            if (msg.item?.role === 'assistant' && msg.item?.content?.[0]?.transcript) {
              setConversationHistory(prev => [...prev, { role: 'assistant', content: msg.item.content[0].transcript }]);
            }
            break;
          case 'conversation.item.input_audio_transcription.completed':
            console.log('🎤 User said:', msg.transcript);
            if (msg.transcript) {
              setTranscript(msg.transcript);
              setConversationHistory(prev => [...prev, { role: 'user', content: msg.transcript }]);
            }
            break;
          case 'input_audio_buffer.speech_started':
            console.log('🎤 Speech detected');
            setIsVADActive(true);
            setCurrentText('');
            hadSpeechRef.current = true;
            suppressMicSendUntilMsRef.current = 0;

            // Only cancel and barge-in if AI is actually speaking
            if (assistantStateRef.current === 'speaking') {
              performBargeIn();
            } else if (awaitingResponseRef.current && !responseInProgressRef.current) {
              // User started speaking again before AI responded - cancel pending request
              awaitingResponseRef.current = false;
              try {
                wsRef.current?.send(JSON.stringify({ type: 'response.cancel' }));
              } catch {
              }
            }
            break;
          case 'input_audio_buffer.speech_stopped':
            console.log('🎤 Speech ended');
            setIsVADActive(false);
            localSpeechActiveRef.current = false;

            // Use safeRequestResponse to prevent duplicates and handle timeouts
            if (hadSpeechRef.current && shouldSendMicAudioRef.current && wsRef.current) {
              safeRequestResponse(wsRef.current);
              suppressMicSendUntilMsRef.current = Date.now() + 800;
            }
            break;
          case 'response.created':
            console.log('🔄 Response generation started');
            aiResponseDoneRef.current = false;
            responseInProgressRef.current = true;  // AI started generating
            break;
          case 'response.done':
            console.log('✅ Response complete');
            responseInProgressRef.current = false;  // AI finished this response cycle
            // Clear timeout on response.done as well
            if (responseTimeoutRef.current) {
              clearTimeout(responseTimeoutRef.current);
              responseTimeoutRef.current = null;
            }
            break;
          case 'error':
            console.error('❌ WebSocket Error:', msg.error);
            setError(msg.error?.message || 'Unknown error');
            break;
        }
      };

      ws.onerror = (e: any) => {
        console.error('❌ WebSocket Network Error:', e);
        setError('Connection failed');
        setAssistantState('error');
      };

      ws.onclose = () => {
        console.log(`🔌 WebSocket Closed (Session: ${newSessionId})`);

        // Decrement active session count
        activeSessionCountRef.current = Math.max(0, activeSessionCountRef.current - 1);
        console.log(`📊 Active sessions after close: ${activeSessionCountRef.current}`);

        // Stop live audio streaming when WebSocket closes
        stopMicStreaming();

        if (liveAudioSubscriptionRef.current) {
          try {
            liveAudioSubscriptionRef.current.remove?.();
          } catch {
          }
          liveAudioSubscriptionRef.current = null;
        }

        // Always clear the current socket reference when the underlying socket closes.
        // This prevents stale closed sockets from blocking a fresh user-initiated connect.
        if (wsRef.current === ws) {
          wsRef.current = null;
        }

        if (closeRequestedRef.current || isStoppingRef.current) {
          closeRequestedRef.current = false;
          isStoppingRef.current = false;
          isConnectingRef.current = false;
          setShowEndCallButton(false);
          setAssistantState('idle');
          return;
        }

        const maxAttempts = 2;  // Reduced from 3 to minimize duplicate sessions
        if (reconnectAttemptRef.current < maxAttempts) {
          reconnectAttemptRef.current += 1;
          const delayMs = 800 * reconnectAttemptRef.current;  // Increased delay for cleaner reconnects
          console.log(`🔁 Reconnecting... attempt ${reconnectAttemptRef.current}/${maxAttempts} in ${delayMs}ms`);
          console.log(`⚠️ Note: Each reconnect creates a new API session`);
          setError('Connection lost. Reconnecting...');
          setAssistantState('connecting');

          // Clear playback before reconnect (fire-and-forget)
          audioBufferRef.current = [];
          isPlayingRef.current = false;
          void stopPlayback();

          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
          }
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            if (!isStoppingRef.current) {
              connectToGrok('reconnect');
            }
          }, delayMs);
        } else {
          setError('Connection lost');
          setAssistantState('error');
        }
      };

    } catch (err: any) {

      setError(err.message || 'Failed to connect');
      setAssistantState('error');
      Alert.alert('Connection Error', 'Could not establish realtime connection with Grok.');
    } finally {
      isConnectingRef.current = false;
    }
  }, [cleanupExistingSession, generateSessionId, drainPlaybackQueue, selectedModelInfo.voice, setAudioModeForMic, setAudioModeForPlayback, startMicStreaming, stopMicStreaming, stopPlayback, safeRequestResponse, performBargeIn]);

  const startConversation = useCallback(async () => {
    // Check if voice assistant is initialized
    if (!isInitialized) {
      console.warn('⚠️ Voice assistant not initialized yet. Cannot start conversation.');
      setError('Voice assistant is still initializing. Please wait a moment and try again.');
      return;
    }

    // Hard guard to prevent multiple parallel sessions (double taps, auto-start + UI start, etc.)
    if (isConnectingRef.current) return;

    // Allow user to retry from error state.
    if (assistantStateRef.current !== 'idle' && assistantStateRef.current !== 'error') return;
    if (assistantStateRef.current === 'error') {
      setError(null);
      setAssistantState('idle');
      assistantStateRef.current = 'idle';
    }

    const existingWs = wsRef.current;
    if (existingWs) {
      // If there is an active/connecting socket, do nothing.
      if (
        existingWs.readyState === WebSocket.OPEN ||
        existingWs.readyState === WebSocket.CONNECTING
      ) {
        return;
      }

      // If the socket is stale (closed/closing), clear it so a fresh connect can proceed.
      wsRef.current = null;
    }

    await connectToGrok('fresh');
  }, [connectToGrok, isInitialized]);

  const voiceAssistant: VoiceAssistantContextType = {
    assistantState,
    showEndCallButton,
    startConversation,
    stopConversation,
    getStatusText,
    error,
    transcript,
    isVADActive,
    conversationHistory,
    currentText,
    clearError: () => setError(null),
    clearHistory: () => setConversationHistory([]),
    resetConversation: () => {
      stopConversation();
      setConversationHistory([]);
      setCurrentText('');
    },
    isInitialized,
    initializationError,
  };

  return (
    <VoiceAssistantContext.Provider value={voiceAssistant}>
      {children}
    </VoiceAssistantContext.Provider>
  );
}

export function useVoiceAssistantContext() {
  const context = useContext(VoiceAssistantContext);
  if (context === undefined) {
    throw new Error('useVoiceAssistantContext must be used within a VoiceAssistantProvider');
  }
  return context;
}

export default VoiceAssistantProvider;
