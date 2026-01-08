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

  // Gemini AI Configuration
  GEMINI: {
    // NOTE: Gemini API key is now expected to be stored server-side in Supabase (see docs).
    // This value is kept only for backward compatibility and should not be relied on in the client.
    API_KEY: Constants.expoConfig?.extra?.GEMINI_API_KEY || 'your_gemini_api_key_here',
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
    MODEL: 'gemini-2.5-flash-lite',
  },

  // OpenWeatherMap Configuration
  WEATHER: {
    API_KEY: Constants.expoConfig?.extra?.OPENWEATHER_API_KEY || 'your_openweather_api_key_here',
    BASE_URL: 'https://api.openweathermap.org/data/2.5',
    GEOCODING_URL: 'https://api.openweathermap.org/geo/1.0',
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

  // Gemini credentials are managed via Supabase Edge Function (gemini-proxy).
  // No client-side GEMINI_API_KEY validation here.

  if (!API_CONFIG.WEATHER.API_KEY || API_CONFIG.WEATHER.API_KEY === 'your_openweather_api_key_here') {
    errors.push('OPENWEATHER_API_KEY is not configured. Please get your API key from https://openweathermap.org/api and set it in .env file');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
