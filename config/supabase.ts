import { createClient, type User, type Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';

// Read env from process.env (build-time) or Constants (runtime fallback)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const getSupabaseUrl = () => supabaseUrl;
export const getSupabaseAnonKey = () => supabaseAnonKey;

// Expose whether Supabase is configured so callers can guard usage
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Use a stable, app-specific storage key so we can reliably clear corrupted sessions.
const SUPABASE_STORAGE_KEY = 'talksy:supabase-auth';

// Do NOT throw on startup if not configured; fail gracefully instead
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        storageKey: SUPABASE_STORAGE_KEY,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : undefined;

export const clearSupabaseAuthStorage = async () => {
  try {
    // Remove the current storage key
    await AsyncStorage.removeItem(SUPABASE_STORAGE_KEY);

    // Best-effort cleanup of legacy Supabase keys (project-ref specific)
    const keys = await AsyncStorage.getAllKeys();
    const legacyKeys = keys.filter(
      (key) =>
        key === 'supabase.auth.token' ||
        /^sb-[a-z0-9]+-auth-token$/i.test(key)
    );
    if (legacyKeys.length) {
      await AsyncStorage.multiRemove(legacyKeys);
    }
  } catch {
    // ignore cleanup errors
  }
};

// Configure WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

// Create redirect URL for OAuth
const redirectUrl = makeRedirectUri({
  scheme: 'voiceassistent',
  // Must match an existing expo-router route. We have `app/auth.tsx` ("/auth"),
  // but not "/auth/callback".
  path: 'auth',
});

// Dedicated redirect URL for password recovery links
const resetPasswordRedirectUrl = makeRedirectUri({
  scheme: 'voiceassistent',
  path: 'reset-password-complete',
});

export { resetPasswordRedirectUrl };

// Function to create session from OAuth redirect URL or handle password reset
export const createSessionFromUrl = async (url: string) => {
  if (!isSupabaseConfigured || !supabase) {
    // When auth is not configured, simply no-op
    return undefined;
  }

  // Supabase often returns access_token in the URL fragment (#...).
  // Ensure QueryParams can see them by converting fragment -> query.
  const normalizedUrl = url.includes('#')
    ? url.replace('#', url.includes('?') ? '&' : '?')
    : url;

  const { params, errorCode } = QueryParams.getQueryParams(normalizedUrl);
  if (errorCode) throw new Error(errorCode);

  const { access_token, refresh_token, token_hash, type } = params;

  // Handle password reset flow
  const isRecoveryType = type === 'recovery' || (!type && normalizedUrl.includes('reset-password-complete'));

  if (token_hash && isRecoveryType) {
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
