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
  const { selectedModelInfo } = useModel();

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

  const performBargeIn = useCallback(async () => {
    if (bargeInInProgressRef.current) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (assistantStateRef.current !== 'speaking') return;

    bargeInInProgressRef.current = true;
    suppressAiAudioUntilMsRef.current = Date.now() + 750;
    shouldSendMicAudioRef.current = true;
    hadSpeechRef.current = false;

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
    console.log('🛑 Stopping conversation...');

    isStoppingRef.current = true;
    closeRequestedRef.current = true;
    setShowEndCallButton(false);

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptRef.current = 0;
    isConnectingRef.current = false;

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
    if (isConnectingRef.current) return;
    if (mode === 'fresh' && assistantStateRef.current !== 'idle') return;
    if (mode === 'fresh' && wsRef.current) return;

    isConnectingRef.current = true;

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
        throw new Error('Microphone permission not granted');
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
        console.log('✅ WebSocket Connected');
        setShowEndCallButton(true);

        // Initialize session with Grok Voice Agent API format
        const sessionUpdate = {
          type: 'session.update',
          session: {
            voice: selectedModelInfo.voice,
            instructions: sessionData.instructions,
            turn_detection: {
              type: 'server_vad',
              silence_duration_ms: 250,
              prefix_padding_ms: 120,
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
            const isSpeechLike = rms > 0.028;

            if (assistantStateRef.current === 'speaking') {
              shouldSendMicAudioRef.current = false;

              if (rms > 0.085) {
                localVadCountRef.current += 1;
              } else {
                localVadCountRef.current = 0;
              }
              if (localVadCountRef.current >= 3) {
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

              if (awaitingResponseRef.current) {
                suppressMicSendUntilMsRef.current = 0;
                awaitingResponseRef.current = false;
                try {
                  wsNow.send(JSON.stringify({ type: 'response.cancel' }));
                } catch {
                }
              }
            } else {
              if (localSpeechActiveRef.current && nowMs - localSpeechLastMsRef.current > 260) {
                localSpeechActiveRef.current = false;
                setIsVADActive(false);

                if (
                  !awaitingResponseRef.current &&
                  hadSpeechRef.current &&
                  shouldSendMicAudioRef.current &&
                  wsNow.readyState === WebSocket.OPEN
                ) {
                  hadSpeechRef.current = false;
                  awaitingResponseRef.current = true;
                  suppressMicSendUntilMsRef.current = nowMs + 800;
                  try {
                    wsNow.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
                    wsNow.send(JSON.stringify({ type: 'response.create' }));
                  } catch {
                  }
                }
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
              awaitingResponseRef.current = false;
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
            await drainPlaybackQueue();
            // After AI finishes speaking, resume mic for hands-free realtime conversation.
            if (wsRef.current?.readyState === WebSocket.OPEN && !isStoppingRef.current) {
              shouldSendMicAudioRef.current = true;
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
            awaitingResponseRef.current = false;
            suppressMicSendUntilMsRef.current = 0;
            if (assistantStateRef.current === 'speaking') {
              performBargeIn();
            }
            break;
          case 'input_audio_buffer.speech_stopped':
            console.log('🎤 Speech ended');
            setIsVADActive(false);
            localSpeechActiveRef.current = false;
            if (!awaitingResponseRef.current && hadSpeechRef.current && shouldSendMicAudioRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              hadSpeechRef.current = false;
              awaitingResponseRef.current = true;
              suppressMicSendUntilMsRef.current = Date.now() + 800;
              wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
              wsRef.current.send(JSON.stringify({ type: 'response.create' }));
            }
            break;
          case 'response.created':
            console.log('🔄 Response generation started');
            aiResponseDoneRef.current = false;
            break;
          case 'response.done':
            console.log('✅ Response complete');
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
        console.log('🔌 WebSocket Closed');
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

        const maxAttempts = 3;
        if (reconnectAttemptRef.current < maxAttempts) {
          reconnectAttemptRef.current += 1;
          const delayMs = 400 * reconnectAttemptRef.current;
          console.log(`🔁 Reconnecting... attempt ${reconnectAttemptRef.current}/${maxAttempts} in ${delayMs}ms`);
          setError('Connection lost. Reconnecting...');
          setAssistantState('connecting');
          stopPlayback();

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
      console.error('❌ Failed to start conversation:', err);
      setError(err.message || 'Failed to connect');
      setAssistantState('error');
      Alert.alert('Connection Error', 'Could not establish realtime connection with Grok.');
    } finally {
      isConnectingRef.current = false;
    }
  }, [drainPlaybackQueue, selectedModelInfo.voice, setAudioModeForMic, setAudioModeForPlayback, startMicStreaming, stopMicStreaming, stopPlayback]);

  const startConversation = useCallback(async () => {
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
  }, [connectToGrok]);

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
