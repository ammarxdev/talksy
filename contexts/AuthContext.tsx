import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  supabase,
  User,
  Session,
  redirectUrl,
  resetPasswordRedirectUrl,
  createSessionFromUrl,
  isSupabaseConfigured,
  clearSupabaseAuthStorage,
} from '../config/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

// Define the shape of our authentication context
interface AuthContextType {
  // Current user data
  user: User | null;
  session: Session | null;

  // Loading states
  loading: boolean;

  // Password reset state
  isPasswordResetFlow: boolean;

  // Authentication methods
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;

  // Email verification and password reset
  resendVerification: (email: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  clearPasswordResetFlow: () => void;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordResetFlow, setIsPasswordResetFlow] = useState(false);

  const waitForSession = async (timeoutMs: number = 6000, intervalMs: number = 250) => {
    if (!isSupabaseConfigured || !supabase) return null;

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return session;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    return null;
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error: any) {
        const message = String(error?.message ?? error);
        if (message.includes('Invalid Refresh Token')) {
          // Stored session is corrupted/expired. Clear it and force fresh login.
          await clearSupabaseAuthStorage();
          setSession(null);
          setUser(null);
        } else {
          console.error('Error getting initial session:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes (only when Supabase is configured)
    const subscription = (isSupabaseConfigured && supabase)
      ? supabase.auth.onAuthStateChange(async (event, session) => {
          const eventName = String(event);
          if (eventName === 'TOKEN_REFRESH_FAILED') {
            await clearSupabaseAuthStorage();
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }).data.subscription
      : undefined;

    // Handle deep linking for OAuth redirects and password reset (official Supabase approach)
    const handleDeepLink = async (url: string) => {
      if (
        url &&
        (
          url.includes('access_token=') ||
          url.includes('refresh_token=') ||
          url.includes('token_hash=') ||
          url.includes('type=recovery')
        )
      ) {
        try {
          await createSessionFromUrl(url);

          // If this is a password reset flow, set the flag and navigate
          if (url.includes('type=recovery')) {
            setIsPasswordResetFlow(true);

            // Import router dynamically to avoid circular dependencies
            const { router } = await import('expo-router');

            // Add a small delay to ensure session state is updated
            setTimeout(() => {
              router.replace('/reset-password-complete' as any);
            }, 500);
          }
        } catch (error) {
          console.error('Error creating session from URL:', error);
        }
      }
    };

    // Listen for URL changes (for OAuth redirects)
    const urlSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Check if app was opened with a URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription?.unsubscribe?.();
      urlSubscription?.remove();
    };
  }, []);

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      if (!isSupabaseConfigured || !supabase) return { error: new Error('Auth not configured') };
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      return { error };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      if (!isSupabaseConfigured || !supabase) return { error: new Error('Auth not configured') };
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google using official Supabase approach
  const signInWithGoogle = async () => {
    try {
      setLoading(true);

      if (Platform.OS === 'web') {
        // Web OAuth flow
        if (!isSupabaseConfigured || !supabase) return { error: new Error('Auth not configured') };
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'http://localhost:8081/auth',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
        return { error };
      } else {
        // Mobile OAuth flow using official Supabase approach
        if (!isSupabaseConfigured || !supabase) return { error: new Error('Auth not configured') } as any;
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true, // This is key for mobile
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });

        if (error) {
          return { error };
        }

        // Open the OAuth URL in browser using official pattern
        if (data?.url) {
          const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectUrl
          );

          if (result.type === 'success') {
            // Create session from the redirect URL (official Supabase approach)
            const { url } = result;
            await createSessionFromUrl(url);
            return { error: null };
          }

          // On Android, the browser may close/dismiss while the deep-link handler still
          // successfully creates a session. Avoid showing a false "failed" popup.
          const sessionAfter = await waitForSession();
          if (sessionAfter) {
            return { error: null };
          }

          return { error: new Error('OAuth cancelled or failed') };
        }

        return { error: new Error('No OAuth URL received') };
      }
    } catch (error) {
      console.error('Google OAuth error:', error);

      // If the session was created via deep link despite an exception, treat as success.
      const sessionAfter = await waitForSession();
      if (sessionAfter) {
        return { error: null };
      }

      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      if (!isSupabaseConfigured || !supabase) return { error: new Error('Auth not configured') };
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Resend email verification
  const resendVerification = async (email: string) => {
    try {
      if (!isSupabaseConfigured || !supabase) return { error: new Error('Auth not configured') };
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      if (!isSupabaseConfigured || !supabase) return { error: new Error('Auth not configured') };
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetPasswordRedirectUrl,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Update password (for authenticated users)
  const updatePassword = async (newPassword: string) => {
    try {
      if (!isSupabaseConfigured || !supabase) return { error: new Error('Auth not configured') };
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Clear password reset flow state
  const clearPasswordResetFlow = () => {
    setIsPasswordResetFlow(false);
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    isPasswordResetFlow,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resendVerification,
    resetPassword,
    updatePassword,
    clearPasswordResetFlow,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
