/**
 * Profile Types
 * TypeScript definitions for user profile data and related functionality
 */

import { User } from '@supabase/supabase-js';

// Core profile data structure (matches Supabase profiles table)
export interface Profile {
  id: string; // UUID that matches auth.users.id
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Profile data for creating/updating (optional fields)
export interface ProfileUpdate {
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  website?: string | null;
  location?: string | null;
}

// Profile data with user auth information
export interface ProfileWithUser {
  profile: Profile;
  user: User;
}

// Avatar upload data
export interface AvatarUpload {
  uri: string; // Local file URI
  type: string; // MIME type
  name: string; // File name
  size: number; // File size in bytes
}

// Avatar upload result
export interface AvatarUploadResult {
  success: boolean;
  avatar_url?: string; // Public URL of uploaded avatar
  error?: string;
}

// Profile loading states
export interface ProfileLoadingState {
  loading: boolean;
  uploading: boolean;
  error: string | null;
}

// Profile cache data
export interface ProfileCache {
  profile: Profile;
  timestamp: number;
  user_id: string;
}

// Profile storage interface
export interface ProfileStorage {
  loadProfile: (userId: string) => Promise<Profile | null>;
  saveProfile: (profile: Profile) => Promise<void>;
  updateProfile: (userId: string, updates: ProfileUpdate) => Promise<Profile>;
  uploadAvatar: (userId: string, avatar: AvatarUpload) => Promise<AvatarUploadResult>;
  deleteAvatar: (userId: string) => Promise<boolean>;
  clearCache: (userId?: string) => Promise<void>;
  getCacheStatus: (userId: string) => { cached: boolean; age: number; profile: Profile | null };
}

// Profile context state
export interface ProfileContextState {
  profile: Profile | null;
  loadingState: ProfileLoadingState;
  isInitialized: boolean;
}

// Profile context actions
export interface ProfileContextActions {
  loadProfile: (userId: string, forceRefresh?: boolean) => Promise<Profile | null>;
  updateProfile: (updates: ProfileUpdate) => Promise<Profile | null>;
  uploadAvatar: (avatar: AvatarUpload) => Promise<AvatarUploadResult>;
  deleteAvatar: () => Promise<boolean>;
  refreshProfile: () => Promise<Profile | null>;
  clearProfile: () => void;
}

// Combined profile context type
export interface ProfileContextType extends ProfileContextState, ProfileContextActions {}

// Profile error types
export enum PROFILE_ERROR_CODES {
  NETWORK_ERROR = 'NETWORK_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  UPLOAD_ERROR = 'UPLOAD_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  UPDATE_FAILED = 'UPDATE_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
}

// Profile error class
export class ProfileError extends Error {
  public readonly code: PROFILE_ERROR_CODES;
  public readonly originalError?: Error;

  constructor(message: string, code: PROFILE_ERROR_CODES, originalError?: Error) {
    super(message);
    this.name = 'ProfileError';
    this.code = code;
    this.originalError = originalError;
  }
}

// Storage keys for AsyncStorage
export const PROFILE_STORAGE_KEYS = {
  PROFILE_CACHE: '@voice_assistant/profile_cache',
  AVATAR_CACHE: '@voice_assistant/avatar_cache',
  PROFILE_SETTINGS: '@voice_assistant/profile_settings',
} as const;

// Profile validation rules
export const PROFILE_VALIDATION = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_-]+$/, // Alphanumeric, underscore, hyphen only
  },
  FULL_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  BIO: {
    MAX_LENGTH: 500,
  },
  WEBSITE: {
    PATTERN: /^https?:\/\/.+/, // Must be valid HTTP/HTTPS URL
  },
  LOCATION: {
    MAX_LENGTH: 100,
  },
  AVATAR: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as string[],
    MAX_DIMENSION: 2048, // Max width/height in pixels
  },
} as const;

// Profile utility types
export type ProfileField = keyof ProfileUpdate;
export type ProfileValidationResult = {
  isValid: boolean;
  errors: Record<ProfileField, string[]>;
};

// Profile hook return type
export interface UseProfileReturn extends ProfileContextType {
  isLoading: boolean;
  isUploading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  isProfileComplete: boolean;
  hasAvatar: boolean;
}

// Profile picture component props
export interface ProfilePictureProps {
  profile: Profile | null;
  size?: number;
  showBorder?: boolean;
  onPress?: () => void;
  fallbackText?: string;
  style?: any;
}

// Profile uploader component props
export interface ProfileUploaderProps {
  onUploadSuccess?: (avatarUrl: string) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
  style?: any;
}

// Export default profile for new users
export const DEFAULT_PROFILE: Omit<Profile, 'id' | 'created_at' | 'updated_at'> = {
  username: null,
  full_name: null,
  avatar_url: null,
  bio: null,
  website: null,
  location: null,
};
