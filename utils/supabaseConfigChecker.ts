/**
 * Supabase Configuration Checker
 * Verifies that Supabase storage and database are properly configured
 */

import { supabase, isSupabaseConfigured } from '@/config/supabase';
import { profileLogger, LogCategory } from './profileLogger';

export interface ConfigCheckResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    database: boolean;
    storage: boolean;
    policies: boolean;
    authentication: boolean;
  };
}

/**
 * Check if the avatars storage bucket exists and is properly configured
 */
async function checkStorageBucket(): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    if (!isSupabaseConfigured || !supabase) {
      errors.push('Supabase is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
      return { isValid: false, errors, warnings };
    }
    const client = supabase;
    // Test bucket access directly (more reliable than listBuckets with anon key)
    const { data: files, error: listError } = await client.storage
      .from('avatars')
      .list('', { limit: 1 });

    if (listError) {
      // Check if it's specifically a "bucket not found" error
      if (listError.message.includes('does not exist') || listError.message.includes('not found')) {
        errors.push('Avatars storage bucket does not exist. Please run the database setup SQL script.');
        return { isValid: false, errors, warnings };
      } else {
        // Other errors might be permissions-related but bucket exists
        warnings.push(`Avatars bucket access warning: ${listError.message}`);
      }
    }

    // Test public URL generation to verify bucket is properly configured
    const { data: publicUrlData } = client.storage
      .from('avatars')
      .getPublicUrl('test-file.jpg');

    if (!publicUrlData?.publicUrl) {
      warnings.push('Unable to generate public URLs for avatars bucket');
    }

    // Try to get bucket info via listBuckets (may fail with anon key, but that's OK)
    const { data: buckets, error: bucketsError } = await client.storage.listBuckets();

    if (!bucketsError && buckets && buckets.length > 0) {
      const avatarsBucket = buckets.find(bucket => bucket.id === 'avatars');

      if (avatarsBucket) {
        // Check bucket configuration if we can access it
        if (!avatarsBucket.public) {
          warnings.push('Avatars bucket is not public. This may cause issues with image display.');
        }

        profileLogger.debug(LogCategory.UPLOAD, 'Storage bucket check passed', {
          bucketId: avatarsBucket.id,
          isPublic: avatarsBucket.public,
          fileSize: avatarsBucket.file_size_limit
        });
      }
    } else {
      // listBuckets failed (normal with anon key), but we already tested direct access
      profileLogger.debug(LogCategory.UPLOAD, 'listBuckets failed (normal with anon key), but direct bucket access works');
    }

    return { isValid: true, errors, warnings };

  } catch (error) {
    errors.push(`Storage bucket check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors, warnings };
  }
}

/**
 * Check if the profiles table exists and is accessible
 */
async function checkProfilesTable(): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    if (!isSupabaseConfigured || !supabase) {
      errors.push('Supabase is not configured. Cannot verify profiles table.');
      return { isValid: false, errors, warnings };
    }
    const client = supabase;
    // Try to query the profiles table
    const { data, error } = await client
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      if (error.message.includes('relation "profiles" does not exist')) {
        errors.push('Profiles table does not exist. Please run the database setup SQL script.');
      } else {
        errors.push(`Cannot access profiles table: ${error.message}`);
      }
      return { isValid: false, errors, warnings };
    }

    profileLogger.debug(LogCategory.UPLOAD, 'Profiles table check passed', {
      tableExists: true,
      canQuery: true
    });

    return { isValid: true, errors, warnings };

  } catch (error) {
    errors.push(`Profiles table check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors, warnings };
  }
}

/**
 * Check authentication status
 */
async function checkAuthentication(): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    if (!isSupabaseConfigured || !supabase) {
      warnings.push('Supabase is not configured. Authentication cannot be checked.');
      return { isValid: true, errors, warnings };
    }
    const client = supabase;
    const { data: { user }, error } = await client.auth.getUser();

    if (error) {
      warnings.push(`Authentication check failed: ${error.message}`);
      return { isValid: true, errors, warnings }; // Not critical for config check
    }

    if (!user) {
      warnings.push('No user is currently authenticated. Some features may not work.');
    }

    profileLogger.debug(LogCategory.UPLOAD, 'Authentication check completed', {
      hasUser: !!user,
      userId: user?.id
    });

    return { isValid: true, errors, warnings };

  } catch (error) {
    warnings.push(`Authentication check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: true, errors, warnings }; // Not critical for config check
  }
}

/**
 * Check RLS policies (basic test)
 */
async function checkPolicies(): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    if (!isSupabaseConfigured || !supabase) {
      warnings.push('Supabase is not configured. Skipping RLS policy checks.');
      return { isValid: true, errors, warnings };
    }
    const client = supabase;
    // Try to read from profiles table (should work with public read policy)
    const { error: readError } = await client
      .from('profiles')
      .select('id')
      .limit(1);

    if (readError && readError.message.includes('policy')) {
      errors.push('RLS policies may not be configured correctly for profiles table.');
      return { isValid: false, errors, warnings };
    }

    // Try to access storage (should work with public read policy)
    const { error: storageError } = await client.storage
      .from('avatars')
      .list('', { limit: 1 });

    if (storageError && storageError.message.includes('policy')) {
      errors.push('RLS policies may not be configured correctly for avatars storage.');
      return { isValid: false, errors, warnings };
    }

    profileLogger.debug(LogCategory.UPLOAD, 'RLS policies check passed');

    return { isValid: true, errors, warnings };

  } catch (error) {
    warnings.push(`RLS policies check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: true, errors, warnings }; // Not critical for basic functionality
  }
}

/**
 * Comprehensive Supabase configuration check
 */
export async function checkSupabaseConfiguration(): Promise<ConfigCheckResult> {
  profileLogger.info(LogCategory.UPLOAD, 'Starting Supabase configuration check');

  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Check each component
  const [storageCheck, tableCheck, authCheck, policiesCheck] = await Promise.all([
    checkStorageBucket(),
    checkProfilesTable(),
    checkAuthentication(),
    checkPolicies()
  ]);

  // Collect results
  allErrors.push(...storageCheck.errors, ...tableCheck.errors, ...authCheck.errors, ...policiesCheck.errors);
  allWarnings.push(...storageCheck.warnings, ...tableCheck.warnings, ...authCheck.warnings, ...policiesCheck.warnings);

  const result: ConfigCheckResult = {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    details: {
      database: tableCheck.isValid,
      storage: storageCheck.isValid,
      policies: policiesCheck.isValid,
      authentication: authCheck.isValid
    }
  };

  profileLogger.info(LogCategory.UPLOAD, 'Supabase configuration check completed', {
    isValid: result.isValid,
    errorCount: allErrors.length,
    warningCount: allWarnings.length,
    details: result.details
  });

  return result;
}

/**
 * Quick check if upload functionality should work
 */
export async function canUploadAvatars(): Promise<boolean> {
  try {
    const config = await checkSupabaseConfiguration();
    return config.details.storage && config.details.database;
  } catch (error) {
    profileLogger.error(LogCategory.ERROR, 'Failed to check upload capability', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}
