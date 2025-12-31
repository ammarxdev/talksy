import { createClient, type User, type Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';

// Read env from process.env (build-time) or Constants (runtime fallback)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Expose whether Supabase is configured so callers can guard usage
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Do NOT throw on startup if not configured; fail gracefully instead
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : undefined;

// Configure WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

// Create redirect URL for OAuth
const redirectUrl = makeRedirectUri({
  scheme: 'voiceassistent',
  path: 'auth/callback',
});

// Function to create session from OAuth redirect URL or handle password reset
export const createSessionFromUrl = async (url: string) => {
  if (!isSupabaseConfigured || !supabase) {
    // When auth is not configured, simply no-op
    return undefined;
  }

  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  const { access_token, refresh_token, token_hash, type } = params;

  // Handle password reset flow
  if (token_hash && type === 'recovery') {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type: 'recovery' });
    if (error) throw error;
    return data.session;
  }

  // Handle OAuth flow
  if (!access_token) return undefined;

  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
  return data.session;
};

// Export types for TypeScript
export type { User, Session };

// Export redirect URL for use in auth context
export { redirectUrl };
