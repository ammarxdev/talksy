/**
 * Profile Storage Utility
 * Handles profile data storage, caching, and Supabase integration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import { Platform } from 'react-native';
import { supabase } from '@/config/supabase';
import {
  Profile,
  ProfileUpdate,
  ProfileCache,
  AvatarUpload,
  AvatarUploadResult,
  ProfileError,
  PROFILE_ERROR_CODES,
  PROFILE_STORAGE_KEYS,
  PROFILE_VALIDATION,
  DEFAULT_PROFILE,
} from '@/types/profile';
import {
  profileLogger,
  LogCategory,
  logUploadStart,
  logUploadComplete,
  startPerformanceTracking,
  endPerformanceTracking
} from './profileLogger';
import { validateAvatarUploadComprehensive } from './profileValidation';
import { ProfileErrorHandler } from './profileErrorHandler';
import { checkSupabaseConfiguration } from './supabaseConfigChecker';

/**
 * Retry configuration for upload operations
 */
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};

/**
 * Check if an error is retryable (network-related)
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code?.toLowerCase() || '';

  // Network-related errors that should be retried
  const retryablePatterns = [
    'network',
    'connection',
    'timeout',
    'fetch',
    'econnreset',
    'enotfound',
    'econnrefused',
    'etimedout',
    'socket',
    'dns'
  ];

  return retryablePatterns.some(pattern =>
    errorMessage.includes(pattern) || errorCode.includes(pattern)
  );
}

/**
 * Execute a function with retry logic and exponential backoff
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      profileLogger.debug(LogCategory.UPLOAD, `Executing ${operationName} - attempt ${attempt}/${config.maxAttempts}`);

      const result = await operation();

      if (attempt > 1) {
        profileLogger.info(LogCategory.UPLOAD, `${operationName} succeeded on attempt ${attempt}`);
      }

      return result;
    } catch (error) {
      lastError = error;

      profileLogger.warn(LogCategory.UPLOAD, `${operationName} failed on attempt ${attempt}`, {
        attempt,
        maxAttempts: config.maxAttempts,
        error: error instanceof Error ? error.message : String(error),
        isRetryable: isRetryableError(error)
      });

      // If this is the last attempt or error is not retryable, throw
      if (attempt === config.maxAttempts || !isRetryableError(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );

      profileLogger.debug(LogCategory.UPLOAD, `Retrying ${operationName} in ${delay}ms`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Check network connectivity and quality
 */
async function checkNetworkConnectivity(): Promise<{
  isConnected: boolean;
  networkType: string;
  isSlowConnection: boolean;
  canUpload: boolean;
  message?: string;
}> {
  try {
    // Get network state
    const networkState = await Network.getNetworkStateAsync();

    profileLogger.debug(LogCategory.UPLOAD, 'Network state check', {
      isConnected: networkState.isConnected,
      isInternetReachable: networkState.isInternetReachable,
      type: networkState.type
    });

    // Check if connected to internet
    if (!networkState.isConnected || !networkState.isInternetReachable) {
      return {
        isConnected: false,
        networkType: networkState.type || 'unknown',
        isSlowConnection: false,
        canUpload: false,
        message: 'No internet connection. Please check your network settings and try again.'
      };
    }

    // Check connection quality
    const isSlowConnection = networkState.type === Network.NetworkStateType.CELLULAR;

    return {
      isConnected: true,
      networkType: networkState.type || 'unknown',
      isSlowConnection,
      canUpload: true,
      message: isSlowConnection ? 'Using cellular connection. Upload may take longer.' : undefined
    };

  } catch (error) {
    profileLogger.warn(LogCategory.UPLOAD, 'Failed to check network state', {
      error: error instanceof Error ? error.message : String(error)
    });

    // Assume connected if we can't check (fallback)
    return {
      isConnected: true,
      networkType: 'unknown',
      isSlowConnection: false,
      canUpload: true,
      message: 'Unable to verify network connection. Proceeding with upload.'
    };
  }
}

/**
 * Convert URI to Blob with Android compatibility
 * Handles both file:// URIs (Android) and regular URIs (Web/iOS)
 */
async function convertUriToBlob(uri: string, mimeType: string): Promise<Blob> {
  profileLogger.debug(LogCategory.UPLOAD, 'Converting URI to blob', {
    uri: uri.substring(0, 50) + '...',
    mimeType,
    platform: Platform.OS
  });

  try {
    // For Android file:// URIs, use expo-file-system with proper blob creation
    if (Platform.OS === 'android' && uri.startsWith('file://')) {
      profileLogger.debug(LogCategory.UPLOAD, 'Using FileSystem for Android file:// URI');

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create blob directly from base64 data URI (React Native compatible)
      const dataUri = `data:${mimeType};base64,${base64}`;
      const response = await fetch(dataUri);
      const blob = await response.blob();

      profileLogger.debug(LogCategory.UPLOAD, 'Successfully converted Android file:// URI to blob', {
        blobSize: blob.size,
        blobType: blob.type,
        base64Length: base64.length
      });

      return blob;
    }

    // For other platforms or regular URIs, use standard fetch
    profileLogger.debug(LogCategory.UPLOAD, 'Using standard fetch for URI conversion');
    const response = await fetch(uri);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();

    profileLogger.debug(LogCategory.UPLOAD, 'Successfully converted URI to blob via fetch', {
      blobSize: blob.size,
      blobType: blob.type
    });

    return blob;

  } catch (error) {
    profileLogger.error(LogCategory.ERROR, 'Failed to convert URI to blob', {
      uri: uri.substring(0, 50) + '...',
      mimeType,
      platform: Platform.OS,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw new ProfileError(
      'Unable to process the selected image. Please try selecting it again.',
      PROFILE_ERROR_CODES.UPLOAD_ERROR,
      error instanceof Error ? error : undefined
    );
  }
}

class ProfileStorageService {
  private static instance: ProfileStorageService;
  private cache: Map<string, ProfileCache> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): ProfileStorageService {
    if (!ProfileStorageService.instance) {
      ProfileStorageService.instance = new ProfileStorageService();
    }
    return ProfileStorageService.instance;
  }

  /**
   * Load profile from cache or Supabase
   */
  public async loadProfile(userId: string, forceRefresh = false): Promise<Profile | null> {
    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedProfile = await this.getCachedProfile(userId);
        if (cachedProfile) {
          return cachedProfile;
        }
      }

      // Load from Supabase
      if (!supabase) {
        // Supabase not configured: return null (no remote profile)
        return null;
      }
      const client = supabase;
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile not found - create default profile
          return await this.createDefaultProfile(userId);
        }
        throw new ProfileError(
          `Failed to load profile: ${error.message}`,
          PROFILE_ERROR_CODES.NETWORK_ERROR,
          error
        );
      }

      const profile = data as Profile;
      
      // Cache the profile
      await this.cacheProfile(profile);
      
      return profile;
    } catch (error) {
      console.error('Failed to load profile:', error);
      
      if (error instanceof ProfileError) {
        throw error;
      }
      
      throw new ProfileError(
        'Failed to load profile',
        PROFILE_ERROR_CODES.NETWORK_ERROR,
        error as Error
      );
    }
  }

  /**
   * Save profile to Supabase and cache
   */
  public async saveProfile(profile: Profile): Promise<void> {
    try {
      if (!supabase) {
        throw new ProfileError(
          'Profile storage is not configured. Please set up Supabase.',
          PROFILE_ERROR_CODES.STORAGE_ERROR
        );
      }
      const client = supabase;
      const { error } = await client
        .from('profiles')
        .upsert(profile, { onConflict: 'id' });

      if (error) {
        throw new ProfileError(
          `Failed to save profile: ${error.message}`,
          PROFILE_ERROR_CODES.UPDATE_FAILED,
          error
        );
      }

      // Update cache
      await this.cacheProfile(profile);
      
      console.log('Profile saved successfully');
    } catch (error) {
      console.error('Failed to save profile:', error);
      
      if (error instanceof ProfileError) {
        throw error;
      }
      
      throw new ProfileError(
        'Failed to save profile',
        PROFILE_ERROR_CODES.STORAGE_ERROR,
        error as Error
      );
    }
  }

  /**
   * Update profile with validation
   */
  public async updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile> {
    try {
      // Validate updates
      this.validateProfileUpdates(updates);

      // Load current profile
      const currentProfile = await this.loadProfile(userId);
      if (!currentProfile) {
        throw new ProfileError(
          'Profile not found',
          PROFILE_ERROR_CODES.PROFILE_NOT_FOUND
        );
      }

      // Merge updates
      const updatedProfile: Profile = {
        ...currentProfile,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Save updated profile
      await this.saveProfile(updatedProfile);
      
      return updatedProfile;
    } catch (error) {
      console.error('Failed to update profile:', error);
      
      if (error instanceof ProfileError) {
        throw error;
      }
      
      throw new ProfileError(
        'Failed to update profile',
        PROFILE_ERROR_CODES.UPDATE_FAILED,
        error as Error
      );
    }
  }

  /**
   * Upload avatar image to Supabase storage with enhanced logging and error handling
   */
  public async uploadAvatar(userId: string, avatar: AvatarUpload, originalAssetType?: string | null): Promise<AvatarUploadResult> {
    const operationId = `avatar_upload_${Date.now()}`;
    startPerformanceTracking(operationId, LogCategory.UPLOAD, 'Avatar upload to storage');

    logUploadStart(avatar);

    try {
      // Enhanced validation with original asset type
      this.validateAvatar(avatar, originalAssetType);

      // Check Supabase configuration before upload
      const configCheck = await checkSupabaseConfiguration();

      if (!configCheck.isValid) {
        const errorMessage = configCheck.errors.length > 0
          ? configCheck.errors[0]
          : 'Supabase configuration is not properly set up';

        throw new ProfileError(
          errorMessage,
          PROFILE_ERROR_CODES.STORAGE_ERROR
        );
      }

      // Log configuration warnings if any
      if (configCheck.warnings.length > 0) {
        profileLogger.warn(LogCategory.UPLOAD, 'Supabase configuration warnings', {
          warnings: configCheck.warnings
        });
      }

      // Ensure supabase client is available and narrow the type for TS (used inside closures)
      if (!supabase) {
        throw new ProfileError(
          'Supabase is not configured. Avatar upload is unavailable.',
          PROFILE_ERROR_CODES.STORAGE_ERROR
        );
      }
      const client = supabase;

      // Check network connectivity before upload
      const networkStatus = await checkNetworkConnectivity();

      if (!networkStatus.canUpload) {
        throw new ProfileError(
          networkStatus.message || 'Network connection required for upload',
          PROFILE_ERROR_CODES.NETWORK_ERROR
        );
      }

      if (networkStatus.message) {
        profileLogger.info(LogCategory.UPLOAD, 'Network status warning', {
          message: networkStatus.message,
          networkType: networkStatus.networkType,
          isSlowConnection: networkStatus.isSlowConnection
        });
      }

      profileLogger.info(LogCategory.UPLOAD, 'Starting avatar upload to Supabase storage', {
        userId,
        fileSize: avatar.size,
        mimeType: avatar.type,
        fileName: avatar.name,
        networkType: networkStatus.networkType,
        isSlowConnection: networkStatus.isSlowConnection
      });

      // Generate unique filename with better extension handling
      let fileExt = avatar.name.split('.').pop();
      if (!fileExt || fileExt.length > 10) {
        // Fallback to extension based on MIME type
        const mimeToExt: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
          'image/gif': 'gif'
        };
        fileExt = mimeToExt[avatar.type] || 'jpg';
      }

      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      profileLogger.debug(LogCategory.UPLOAD, 'Generated upload filename', {
        originalName: avatar.name,
        generatedName: fileName,
        extension: fileExt
      });

      // Upload to Supabase storage with platform-specific handling
      const uploadStartTime = Date.now();

      const uploadResult = await executeWithRetry(
        async () => {
          let uploadData;
          let uploadError;

          // Platform-specific upload approach
          if (Platform.OS === 'android') {
            // On Android, use URI directly (avoids blob conversion issues)
            profileLogger.debug(LogCategory.UPLOAD, 'Using direct URI upload for Android');

            const { data, error } = await client.storage
              .from('avatars')
              .upload(fileName, {
                uri: avatar.uri,
                name: fileName,
                type: avatar.type,
              } as any, {
                contentType: avatar.type,
                upsert: true,
              });

            uploadData = data;
            uploadError = error;
          } else {
            // On other platforms, convert to blob first
            profileLogger.debug(LogCategory.UPLOAD, 'Using blob conversion for non-Android platforms');

            const blob = await convertUriToBlob(avatar.uri, avatar.type);
            const { data, error } = await client.storage
              .from('avatars')
              .upload(fileName, blob, {
                contentType: avatar.type,
                upsert: true,
              });

            uploadData = data;
            uploadError = error;
          }

          if (uploadError) {
            // Provide more specific error messages based on error type
            let userMessage = 'Failed to upload avatar. Please try again.';
            if (uploadError.message.includes('size')) {
              userMessage = 'The image file is too large. Please compress it and try again.';
            } else if (uploadError.message.includes('type') || uploadError.message.includes('format')) {
              userMessage = 'The image format is not supported. Please use a JPEG, PNG, WebP, or GIF image.';
            } else if (uploadError.message.includes('network') || uploadError.message.includes('connection')) {
              userMessage = 'Network error. Please check your connection and try again.';
            }

            throw new ProfileError(
              userMessage,
              PROFILE_ERROR_CODES.UPLOAD_ERROR,
              uploadError
            );
          }

          return uploadData;
        },
        {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 5000,
          backoffMultiplier: 2
        },
        'supabase_storage_upload'
      );

      const uploadDuration = Date.now() - uploadStartTime;

      if (!uploadResult) {
        throw new ProfileError(
          'Upload failed - no result returned from storage.',
          PROFILE_ERROR_CODES.UPLOAD_ERROR
        );
      }

      profileLogger.info(LogCategory.UPLOAD, 'Successfully uploaded to Supabase storage', {
        fileName,
        uploadDuration,
        fileSize: avatar.size,
        path: uploadResult.path
      });

      // Get public URL with error handling
      const { data: { publicUrl } } = client.storage
        .from('avatars')
        .getPublicUrl(uploadResult.path);

      if (!publicUrl) {
        throw new ProfileError(
          'Failed to generate avatar URL. Please try again.',
          PROFILE_ERROR_CODES.UPLOAD_ERROR
        );
      }

      profileLogger.debug(LogCategory.UPLOAD, 'Generated public URL for avatar', {
        publicUrl: publicUrl.substring(0, 50) + '...',
        path: uploadResult.path
      });

      // Update profile with new avatar URL
      await this.updateProfile(userId, { avatar_url: publicUrl });

      const result = {
        success: true,
        avatar_url: publicUrl,
      };

      logUploadComplete(true, result);
      profileLogger.info(LogCategory.UPLOAD, 'Avatar upload completed successfully', {
        userId,
        publicUrl: publicUrl.substring(0, 50) + '...',
        totalDuration: Date.now() - parseInt(operationId.split('_')[2])
      });

      endPerformanceTracking(operationId, {
        success: true,
        avatarUrl: publicUrl.substring(0, 50) + '...'
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof ProfileError
        ? error.message
        : 'Failed to upload avatar';

      const result = {
        success: false,
        error: errorMessage,
      };

      // Enhanced error logging with comprehensive context
      const errorHandler = ProfileErrorHandler.getInstance();
      await errorHandler.logEnhancedError(error as Error, {
        operation: 'avatar_upload',
        userId,
        fileSize: avatar.size,
        mimeType: avatar.type,
        fileName: avatar.name,
        platform: Platform.OS as any,
        timestamp: new Date().toISOString()
      });

      logUploadComplete(false, undefined, error);
      profileLogger.error(LogCategory.ERROR, 'Avatar upload failed', {
        userId,
        error: errorMessage,
        isProfileError: error instanceof ProfileError,
        stack: error instanceof Error ? error.stack : undefined,
        fileSize: avatar.size,
        mimeType: avatar.type,
        fileName: avatar.name
      });

      endPerformanceTracking(operationId, {
        success: false,
        error: errorMessage
      });

      return result;
    }
  }

  /**
   * Delete avatar from storage and profile
   */
  public async deleteAvatar(userId: string): Promise<boolean> {
    try {
      const profile = await this.loadProfile(userId);
      if (!profile?.avatar_url) {
        return true; // No avatar to delete
      }

      // Extract file path from URL
      const url = new URL(profile.avatar_url);
      const filePath = url.pathname.split('/').slice(-2).join('/'); // Get last two segments

      // Delete from storage
      if (!supabase) {
        // If storage isn't configured, skip remote deletion and clear local reference
        await this.updateProfile(userId, { avatar_url: null });
        return true;
      }
      const client = supabase;
      const { error } = await client.storage
        .from('avatars')
        .remove([filePath]);

      if (error) {
        console.warn('Failed to delete avatar file:', error.message);
        // Continue anyway to clear the URL from profile
      }

      // Update profile to remove avatar URL
      await this.updateProfile(userId, { avatar_url: null });

      return true;
    } catch (error) {
      console.error('Failed to delete avatar:', error);
      return false;
    }
  }

  /**
   * Create default profile for new user
   */
  private async createDefaultProfile(userId: string): Promise<Profile> {
    const defaultProfile: Profile = {
      id: userId,
      ...DEFAULT_PROFILE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.saveProfile(defaultProfile);
    return defaultProfile;
  }

  /**
   * Get cached profile if valid
   */
  private async getCachedProfile(userId: string): Promise<Profile | null> {
    try {
      // Check memory cache first
      const memoryCache = this.cache.get(userId);
      if (memoryCache && this.isCacheValid(memoryCache.timestamp)) {
        return memoryCache.profile;
      }

      // Check AsyncStorage cache
      const cacheKey = `${PROFILE_STORAGE_KEYS.PROFILE_CACHE}_${userId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        const cache: ProfileCache = JSON.parse(cachedData);
        if (this.isCacheValid(cache.timestamp)) {
          // Update memory cache
          this.cache.set(userId, cache);
          return cache.profile;
        }
      }

      return null;
    } catch (error) {
      console.warn('Failed to get cached profile:', error);
      return null;
    }
  }

  /**
   * Cache profile in memory and AsyncStorage
   */
  private async cacheProfile(profile: Profile): Promise<void> {
    try {
      const cache: ProfileCache = {
        profile,
        timestamp: Date.now(),
        user_id: profile.id,
      };

      // Update memory cache
      this.cache.set(profile.id, cache);

      // Update AsyncStorage cache
      const cacheKey = `${PROFILE_STORAGE_KEYS.PROFILE_CACHE}_${profile.id}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to cache profile:', error);
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  /**
   * Validate profile updates
   */
  private validateProfileUpdates(updates: ProfileUpdate): void {
    if (updates.username !== undefined && updates.username !== null) {
      if (updates.username.length < PROFILE_VALIDATION.USERNAME.MIN_LENGTH ||
          updates.username.length > PROFILE_VALIDATION.USERNAME.MAX_LENGTH) {
        throw new ProfileError(
          `Username must be ${PROFILE_VALIDATION.USERNAME.MIN_LENGTH}-${PROFILE_VALIDATION.USERNAME.MAX_LENGTH} characters`,
          PROFILE_ERROR_CODES.VALIDATION_ERROR
        );
      }
      
      if (!PROFILE_VALIDATION.USERNAME.PATTERN.test(updates.username)) {
        throw new ProfileError(
          'Username can only contain letters, numbers, underscores, and hyphens',
          PROFILE_ERROR_CODES.VALIDATION_ERROR
        );
      }
    }

    if (updates.full_name !== undefined && updates.full_name !== null) {
      if (updates.full_name.length > PROFILE_VALIDATION.FULL_NAME.MAX_LENGTH) {
        throw new ProfileError(
          `Full name cannot exceed ${PROFILE_VALIDATION.FULL_NAME.MAX_LENGTH} characters`,
          PROFILE_ERROR_CODES.VALIDATION_ERROR
        );
      }
    }

    if (updates.bio !== undefined && updates.bio !== null) {
      if (updates.bio.length > PROFILE_VALIDATION.BIO.MAX_LENGTH) {
        throw new ProfileError(
          `Bio cannot exceed ${PROFILE_VALIDATION.BIO.MAX_LENGTH} characters`,
          PROFILE_ERROR_CODES.VALIDATION_ERROR
        );
      }
    }

    if (updates.website !== undefined && updates.website !== null) {
      if (!PROFILE_VALIDATION.WEBSITE.PATTERN.test(updates.website)) {
        throw new ProfileError(
          'Website must be a valid HTTP or HTTPS URL',
          PROFILE_ERROR_CODES.VALIDATION_ERROR
        );
      }
    }

    if (updates.location !== undefined && updates.location !== null) {
      if (updates.location.length > PROFILE_VALIDATION.LOCATION.MAX_LENGTH) {
        throw new ProfileError(
          `Location cannot exceed ${PROFILE_VALIDATION.LOCATION.MAX_LENGTH} characters`,
          PROFILE_ERROR_CODES.VALIDATION_ERROR
        );
      }
    }
  }

  /**
   * Validate avatar upload with enhanced error handling and logging
   */
  private validateAvatar(avatar: AvatarUpload, originalAssetType?: string | null): void {
    const operationId = `storage_validation_${Date.now()}`;
    startPerformanceTracking(operationId, LogCategory.VALIDATION, 'Storage avatar validation');

    try {
      // Use comprehensive validation
      const validationResult = validateAvatarUploadComprehensive(avatar, originalAssetType, {
        enableMimeDetection: true,
        strictValidation: true,
        enableDimensionCheck: false
      });

      if (!validationResult.isValid) {
        const primaryError = validationResult.errors[0];

        // Determine appropriate error code based on error type
        let errorCode = PROFILE_ERROR_CODES.VALIDATION_ERROR;
        if (primaryError.includes('too large') || primaryError.includes('size')) {
          errorCode = PROFILE_ERROR_CODES.FILE_TOO_LARGE;
        } else if (primaryError.includes('format') || primaryError.includes('type')) {
          errorCode = PROFILE_ERROR_CODES.INVALID_FILE_TYPE;
        }

        profileLogger.error(LogCategory.VALIDATION, 'Avatar validation failed in storage service', {
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          details: validationResult.details,
          errorCode
        });

        endPerformanceTracking(operationId, {
          success: false,
          errorCode,
          errorCount: validationResult.errors.length
        });

        throw new ProfileError(primaryError, errorCode);
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        profileLogger.warn(LogCategory.VALIDATION, 'Avatar validation completed with warnings', {
          warnings: validationResult.warnings,
          details: validationResult.details
        });
      }

      profileLogger.info(LogCategory.VALIDATION, 'Avatar validation passed in storage service', {
        fileSize: validationResult.details.fileSize,
        mimeType: validationResult.details.mimeType,
        warningCount: validationResult.warnings.length
      });

      endPerformanceTracking(operationId, {
        success: true,
        warningCount: validationResult.warnings.length
      });

    } catch (error) {
      if (error instanceof ProfileError) {
        throw error; // Re-throw ProfileError as-is
      }

      // Handle unexpected validation errors
      profileLogger.error(LogCategory.ERROR, 'Unexpected error during avatar validation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      endPerformanceTracking(operationId, { success: false, error: 'unexpected_error' });

      throw new ProfileError(
        'Unable to validate avatar. Please try again.',
        PROFILE_ERROR_CODES.VALIDATION_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Clear cache for specific user or all users
   */
  public async clearCache(userId?: string): Promise<void> {
    try {
      if (userId) {
        // Clear specific user cache
        this.cache.delete(userId);
        const cacheKey = `${PROFILE_STORAGE_KEYS.PROFILE_CACHE}_${userId}`;
        await AsyncStorage.removeItem(cacheKey);
      } else {
        // Clear all profile caches
        this.cache.clear();
        const keys = await AsyncStorage.getAllKeys();
        const profileKeys = keys.filter(key => key.startsWith(PROFILE_STORAGE_KEYS.PROFILE_CACHE));
        await AsyncStorage.multiRemove(profileKeys);
      }
      
      console.log('Profile cache cleared');
    } catch (error) {
      console.error('Failed to clear profile cache:', error);
    }
  }

  /**
   * Get cache status for debugging
   */
  public getCacheStatus(userId: string): { cached: boolean; age: number; profile: Profile | null } {
    const cache = this.cache.get(userId);
    return {
      cached: cache !== undefined && this.isCacheValid(cache.timestamp),
      age: cache ? Date.now() - cache.timestamp : 0,
      profile: cache?.profile || null,
    };
  }
}

// Export singleton instance
export const profileStorage = ProfileStorageService.getInstance();

// Convenience functions for direct use
export const loadProfile = (userId: string, forceRefresh?: boolean) => 
  profileStorage.loadProfile(userId, forceRefresh);

export const updateProfile = (userId: string, updates: ProfileUpdate) => 
  profileStorage.updateProfile(userId, updates);

export const uploadAvatar = (userId: string, avatar: AvatarUpload) => 
  profileStorage.uploadAvatar(userId, avatar);

export const deleteAvatar = (userId: string) => 
  profileStorage.deleteAvatar(userId);

export const clearProfileCache = (userId?: string) => 
  profileStorage.clearCache(userId);
