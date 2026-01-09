// API Configuration for Voice Assistant
import Constants from 'expo-constants';

export const API_CONFIG = {
  // AssemblyAI Configuration
  ASSEMBLYAI: {
    API_KEY: Constants.expoConfig?.extra?.ASSEMBLYAI_API_KEY || 'your_actual_assemblyai_api_key_here',
    BASE_URL: 'https://api.assemblyai.com/v2',
    UPLOAD_URL: 'https://api.assemblyai.com/v2/upload',
    TRANSCRIPT_URL: 'https://api.assemblyai.com/v2/transcript',
  },


  // OpenWeatherMap Configuration
  WEATHER: {
    API_KEY: Constants.expoConfig?.extra?.OPENWEATHER_API_KEY || 'your_openweather_api_key_here',
    BASE_URL: 'https://api.openweathermap.org/data/2.5',
    GEOCODING_URL: 'https://api.openweathermap.org/geo/1.0',
  },

  // Grok Realtime Configuration
  GROK: {
    // Use Supabase Edge Function for session creation (no localhost needed)
    get SESSION_URL(): string {
      const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ||
        process.env.EXPO_PUBLIC_SUPABASE_URL ||
        'https://tqkygmcsiillcrswdaja.supabase.co';
      return `${supabaseUrl}/functions/v1/realtime-session`;
    },
    EXTERNAL_API_URL: 'wss://api.x.ai/v1/realtime',
    MODEL: 'grok-2-audio', // Model for voice agent
  } as {
    readonly SESSION_URL: string;
    EXTERNAL_API_URL: string;
    MODEL: string;
  },

  // Audio Configuration
  AUDIO: {
    RECORDING_OPTIONS: {
      android: {
        extension: '.m4a',
        outputFormat: 'mpeg4',
        audioEncoder: 'aac',
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: 'mpeg4',
        audioEncoder: 'aac',
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
      },
    },
  },
};

// Validation function to check if API keys are configured
export const validateApiKeys = () => {
  const errors: string[] = [];

  if (!API_CONFIG.ASSEMBLYAI.API_KEY ||
    API_CONFIG.ASSEMBLYAI.API_KEY === 'your_actual_assemblyai_api_key_here' ||
    API_CONFIG.ASSEMBLYAI.API_KEY === 'your_assemblyai_api_key_here') {
    errors.push('ASSEMBLYAI_API_KEY is not configured. Please get your API key from https://www.assemblyai.com/ and set it in .env file');
  }

  // CRITICAL: Grok/xAI API keys are managed via Supabase Edge Functions.
  // API keys are loaded ONLY from server-side .env (Supabase secrets).
  // NEVER fetch, store, or read API keys from Supabase database.
  // No client-side API key validation here.

  if (!API_CONFIG.WEATHER.API_KEY || API_CONFIG.WEATHER.API_KEY === 'your_openweather_api_key_here') {
    errors.push('OPENWEATHER_API_KEY is not configured. Please get your API key from https://openweathermap.org/api and set it in .env file');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
