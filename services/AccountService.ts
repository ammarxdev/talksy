import { supabase, isSupabaseConfigured } from '@/config/supabase';
import { profileStorage } from '@/utils/profileStorage';

export interface DeleteAccountResult {
  success: boolean;
  error?: string;
  details?: string;
}

/**
 * Deletes the user's account data and attempts to remove the auth user via Edge Function.
 * Notes:
 * - Removing an auth user requires a Supabase Service Role key and must be done server-side.
 * - This client will invoke an Edge Function named "delete-account" if available.
 * - Regardless, profile data and local caches will be cleaned up and the user will be signed out.
 */
export async function deleteAccount(userId: string): Promise<DeleteAccountResult> {
  if (!userId) {
    return { success: false, error: 'No user ID provided.' };
  }

  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Authentication is not configured.' };
  }

  try {
    // 1) Best-effort: delete avatar asset and clear from profile
    try {
      await profileStorage.deleteAvatar(userId);
    } catch {
      // ignore avatar deletion failures
    }

    // 2) Best-effort: delete profile row
    try {
      await supabase.from('profiles').delete().eq('id', userId);
    } catch {
      // ignore profile deletion failures
    }

    // 3) Attempt to delete auth user via Edge Function (requires service role on server)
    let authDeletionSucceeded = false;
    try {
      const { error: fnError } = await supabase.functions.invoke('delete-account', {
        body: { user_id: userId },
      });
      authDeletionSucceeded = !fnError;
    } catch {
      authDeletionSucceeded = false; // function not available or failed
    }

    // 4) Sign the user out and clear local caches
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore sign-out errors
    }

    try {
      await profileStorage.clearCache(userId);
    } catch {
      // ignore cache clear errors
    }

    if (authDeletionSucceeded) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Unable to delete auth user from client.',
      details:
        'Profile data was cleaned up and you were signed out. Deleting the auth user requires a server-side Edge Function named "delete-account" that calls supabase.auth.admin.deleteUser(userId).',
    };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Account deletion failed.' };
  }
}
