# Complete User Account Hard Delete Implementation Guide

This guide provides step-by-step instructions to implement a complete user account deletion feature that removes all user data from Supabase (auth user, profile data, and storage files).

## 📋 Overview

**Hard Delete** means completely removing:
- ✅ Auth user from Supabase Auth
- ✅ Profile row from `profiles` table
- ✅ Avatar files from Supabase Storage
- ✅ Local app caches
- ✅ User session (sign out)

## 🔧 Prerequisites

- Supabase project with Auth enabled
- React Native/Expo app with Supabase integration
- Profile management system
- Avatar storage setup

## 🚀 Implementation Steps

### Step 1: Create Account Service

Create `services/AccountService.ts`:

```typescript
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
```

### Step 2: Create Edge Function

Create `supabase/functions/delete-account/index.ts`:

```typescript
// @ts-nocheck
// Supabase Edge Function: delete-account
// Fully deletes a user: storage assets, profile row, and auth user.
// Requires DATABASE_URL, ANON_KEY, and SERVICE_ROLE_KEY to be set as function secrets.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper to build JSON responses
function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    status: init.status ?? 200,
  });
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { user_id } = await req.json().catch(() => ({ user_id: undefined }));

    if (!user_id || typeof user_id !== "string") {
      return json({ error: "user_id is required" }, { status: 400 });
    }

    const supabaseUrl = Deno.env.get("DATABASE_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: "Missing DATABASE_URL, SERVICE_ROLE_KEY or ANON_KEY" }, { status: 500 });
    }

    // Verify the caller's JWT and enforce self-deletion only
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Invalid or expired token" }, { status: 401 });
    }

    if (userData.user.id !== user_id) {
      return json({ error: "Forbidden: can only delete your own account" }, { status: 403 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1) Best-effort: Delete any avatar files under avatars/<user_id>/
    try {
      const { data: files, error: listError } = await admin.storage
        .from("avatars")
        .list(user_id, { limit: 1000, offset: 0 });

      if (!listError && files && files.length > 0) {
        const paths = files.map((f: { name: string }) => `${user_id}/${f.name}`);
        await admin.storage.from("avatars").remove(paths);
      }
    } catch (_) {
      // ignore storage errors
    }

    // 2) Best-effort: Delete profile row
    try {
      await admin.from("profiles").delete().eq("id", user_id);
    } catch (_) {
      // ignore profile deletion errors
    }

    // 3) Delete auth user (authoritative)
    const { error: authError } = await admin.auth.admin.deleteUser(user_id);
    if (authError) {
      return json({ error: authError.message }, { status: 500 });
    }

    return json({ success: true }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json({ error: message }, { status: 500 });
  }
});
```

### Step 3: Update Account Settings UI

Update `app/account-settings.tsx` to include the delete account option:

```typescript
// Add imports
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useAlert } from '@/contexts/AlertContext';
import { deleteAccount as deleteAccountService } from '@/services/AccountService';

export default function AccountSettingsScreen() {
  const { colors } = useTheme();
  const { profile, isLoading } = useProfile();
  const { user } = useAuth();
  const { showConfirmation, showError, showSuccess, showWarning } = useAlert();
  const [isDeleting, setIsDeleting] = useState(false);

  // ... existing code ...

  // Update SettingsItem to support destructive styling
  const SettingsItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightComponent,
    showArrow = true,
    disabled = false,
    destructive = false,
  }: {
    icon: IconSymbolName;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    showArrow?: boolean;
    disabled?: boolean;
    destructive?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.settingsItem,
        { borderBottomColor: colors.border },
        disabled && { opacity: 0.5 }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <View style={styles.settingsItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: colors.surfaceVariant }]}>
          <IconSymbol name={icon} size={20} color={destructive ? colors.error : colors.primary} />
        </View>
        <View style={styles.settingsItemText}>
          <ThemedText style={[styles.settingsItemTitle, { color: destructive ? colors.error : colors.textPrimary }]}>
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText style={[styles.settingsItemSubtitle, { color: destructive ? colors.error : colors.textSecondary }]}>
              {subtitle}
            </ThemedText>
          )}
        </View>
      </View>
      <View style={styles.settingsItemRight}>
        {rightComponent}
        {showArrow && !rightComponent && (
          <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );

  // Add Danger Zone section (place before Account Information)
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* ... existing sections ... */}

        {/* Danger Zone */}
        <SettingsSection title="Danger Zone">
          <SettingsItem
            icon="exclamationmark.triangle"
            title="Delete Account"
            subtitle="Permanently remove your account and data"
            destructive
            disabled={isDeleting}
            rightComponent={
              isDeleting ? (
                <ActivityIndicator 
                  size="small" 
                  color={colors.error} 
                  style={{ marginRight: 8 }} 
                />
              ) : undefined
            }
            onPress={() => {
              if (!user?.id || isDeleting) {
                if (!user?.id) {
                  showError('You need to be signed in to delete your account.', 'Not signed in');
                }
                return;
              }
              showConfirmation(
                'This will permanently delete your profile data and sign you out. This action cannot be undone. Do you want to continue?',
                async () => {
                  try {
                    setIsDeleting(true);
                    const result = await deleteAccountService(user.id!);
                    if (result.success) {
                      showSuccess('Your account has been deleted. Goodbye!', 'Account deleted');
                    } else {
                      showWarning(
                        result.error || 'Could not fully delete your account.',
                        'Partial deletion'
                      );
                    }
                  } catch (e: any) {
                    showError(e?.message || 'Failed to delete account. Please try again later.', 'Deletion failed');
                  } finally {
                    setIsDeleting(false);
                    router.replace('/auth');
                  }
                },
                undefined,
                'Delete Account'
              );
            }}
          />
        </SettingsSection>

        {/* Account Information - place at the end */}
        {/* ... existing account info ... */}
      </ScrollView>
    </View>
  );
}
```

## 🛠️ Supabase CLI Setup & Deployment

### Step 1: Install Supabase CLI

**Windows (Manual Installation):**
1. Download `supabase_windows_amd64.tar.gz` from [GitHub Releases](https://github.com/supabase/cli/releases/latest)
2. Extract to `C:\supabase\`
3. Add to PATH or use full path: `C:\supabase\supabase.exe`

**Test installation:**
```powershell
supabase --version
```

### Step 2: Login to Supabase

```powershell
supabase login
```
- Browser will open automatically
- Sign in with your Supabase account
- Return to terminal and confirm "Finished supabase login"

### Step 3: Link Your Project

```powershell
supabase link --project-ref YOUR_PROJECT_REF_ID
```

**Find your Project Reference ID:**
1. Go to Supabase Dashboard → Your Project
2. Settings → General → Reference ID

### Step 4: Set Function Secrets

**Get your keys from Supabase Dashboard → Settings → API:**

```powershell
supabase secrets set DATABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
supabase secrets set ANON_KEY="your_anon_public_key"
supabase secrets set SERVICE_ROLE_KEY="your_service_role_secret_key"
```

### Step 5: Deploy Edge Function

```powershell
supabase functions deploy delete-account
```

**Expected output:**
```
Deployed Functions on project YOUR_PROJECT_REF: delete-account
You can inspect your deployment in the Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions
```

## 🧪 Testing

### Client-Side Testing
1. Start your app: `npm start` or `expo start`
2. Sign in with a test account
3. Navigate to: **Profile → Account Settings**
4. Scroll to **"Danger Zone"**
5. Tap **"Delete Account"** → Confirm

### Expected Results
- ✅ Loading spinner appears during deletion
- ✅ Success message: "Account deleted. Goodbye!"
- ✅ App navigates to login screen
- ✅ In Supabase Dashboard: auth user, profile, and avatar files are removed

### Edge Function Testing
**Test the function directly:**
```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/delete-account' \
  -H 'Authorization: Bearer YOUR_USER_JWT' \
  -H 'Content-Type: application/json' \
  -d '{"user_id": "USER_ID_TO_DELETE"}'
```

## 🔧 TypeScript Configuration

**Update `tsconfig.json` to exclude Edge Functions:**
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ],
  "exclude": [
    "supabase/functions/**"
  ]
}
```

## 🐛 Troubleshooting

### Common Issues

**1. "supabase: command not found"**
- Ensure Supabase CLI is installed and in PATH
- Use full path: `C:\supabase\supabase.exe`

**2. "Access token not provided"**
- Run `supabase login` first
- Ensure you're in the correct project directory

**3. "No package found matching input criteria" (winget)**
- Use manual download method instead
- Download from GitHub releases

**4. Edge Function deployment fails**
- Check internet connection
- Verify project is linked: `supabase status`
- Ensure Docker is not required (CLI handles this)

**5. Function returns "Missing secrets"**
- Verify secrets are set: `supabase secrets list`
- Double-check secret names match the code

**6. "Partial deletion" warning**
- Edge Function not deployed or failing
- Check Supabase Dashboard → Functions for errors
- Verify function secrets are correct

### Edge Function Debugging

**View function logs:**
```powershell
supabase functions logs delete-account
```

**Test function locally:**
```powershell
supabase functions serve delete-account
```

## 📝 Security Considerations

1. **JWT Validation**: Function verifies caller's JWT token
2. **Self-Deletion Only**: Users can only delete their own accounts
3. **Service Role Protection**: Service role key is server-side only
4. **Best-Effort Cleanup**: Graceful handling of partial failures

## 🎯 Features Implemented

- ✅ Complete user deletion (auth + data + files)
- ✅ Secure JWT-based authentication
- ✅ Loading indicators and proper UX
- ✅ Error handling and user feedback
- ✅ Graceful fallback for partial deletion
- ✅ TypeScript support with proper types
- ✅ Clean UI with destructive styling

## 📚 Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [React Native Supabase Integration](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)

---

**Last Updated:** September 2025  
**Version:** 1.0  
**Compatibility:** Expo SDK 53+, Supabase CLI 2.40+
