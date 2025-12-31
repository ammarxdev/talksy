/**
 * Profile Utility Functions
 * Common helper functions for profile operations
 */

import { Profile, ProfileUpdate, AvatarUpload } from '@/types/profile';
import {
  profileLogger,
  LogCategory,
  logMimeDetection,
  logValidationResult,
  startPerformanceTracking,
  endPerformanceTracking
} from './profileLogger';

/**
 * MIME Type Detection Utility
 * Comprehensive mapping of file extensions to MIME types for image files
 */

// Comprehensive file extension to MIME type mapping
const FILE_EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  // JPEG formats
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'jpe': 'image/jpeg',
  'jfif': 'image/jpeg',

  // PNG formats
  'png': 'image/png',

  // WebP formats
  'webp': 'image/webp',

  // GIF formats
  'gif': 'image/gif',

  // Additional image formats (for future support)
  'bmp': 'image/bmp',
  'tiff': 'image/tiff',
  'tif': 'image/tiff',
  'svg': 'image/svg+xml',
  'ico': 'image/x-icon',
  'heic': 'image/heic',
  'heif': 'image/heif',
  'avif': 'image/avif',
};

// Supported MIME types for avatar uploads (matches PROFILE_VALIDATION.AVATAR.ALLOWED_TYPES)
const SUPPORTED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
];

/**
 * Extract file extension from URI or filename
 */
function extractFileExtension(uriOrFilename: string): string | null {
  try {
    // Remove query parameters and fragments
    const cleanUri = uriOrFilename.split('?')[0].split('#')[0];

    // Extract filename from URI
    const filename = cleanUri.split('/').pop() || '';

    // Get extension
    const parts = filename.split('.');
    if (parts.length > 1) {
      return parts.pop()?.toLowerCase() || null;
    }

    return null;
  } catch (error) {
    console.warn('Failed to extract file extension:', error);
    return null;
  }
}

/**
 * Detect MIME type from file extension
 */
function getMimeTypeFromExtension(extension: string): string | null {
  const normalizedExt = extension.toLowerCase().trim();
  return FILE_EXTENSION_TO_MIME_TYPE[normalizedExt] || null;
}

/**
 * Detect MIME type from URI
 */
function getMimeTypeFromUri(uri: string): string | null {
  const extension = extractFileExtension(uri);
  if (!extension) return null;

  return getMimeTypeFromExtension(extension);
}

/**
 * Validate if MIME type is supported for avatar uploads
 */
function isSupportedAvatarMimeType(mimeType: string): boolean {
  return SUPPORTED_AVATAR_MIME_TYPES.includes(mimeType.toLowerCase());
}

/**
 * Enhanced MIME type detection with multiple fallback strategies
 */
export function detectMimeType(
  assetType: string | null | undefined,
  uri: string,
  filename?: string | null
): { mimeType: string; confidence: 'high' | 'medium' | 'low'; source: string } {

  const operationId = `mime_detection_${Date.now()}`;
  startPerformanceTracking(operationId, LogCategory.MIME_DETECTION, 'MIME type detection');

  // Strategy 1: Use asset.type if available and supported
  if (assetType && typeof assetType === 'string' && assetType.trim()) {
    const normalizedType = assetType.toLowerCase().trim();
    if (isSupportedAvatarMimeType(normalizedType)) {
      const result = {
        mimeType: normalizedType,
        confidence: 'high' as const,
        source: 'asset.type'
      };

      logMimeDetection(assetType, result.mimeType, result.confidence, result.source, uri, {
        strategy: 1,
        success: true
      });

      endPerformanceTracking(operationId, { result, strategy: 1 });
      return result;
    }
  }

  // Strategy 2: Detect from filename if provided
  if (filename && typeof filename === 'string') {
    const extension = extractFileExtension(filename);
    if (extension) {
      const mimeType = getMimeTypeFromExtension(extension);
      if (mimeType && isSupportedAvatarMimeType(mimeType)) {
        const result = {
          mimeType,
          confidence: 'medium' as const,
          source: 'filename'
        };

        logMimeDetection(assetType, result.mimeType, result.confidence, result.source, uri, {
          strategy: 2,
          filename,
          extension,
          success: true
        });

        endPerformanceTracking(operationId, { result, strategy: 2 });
        return result;
      }
    }
  }

  // Strategy 3: Detect from URI
  const uriMimeType = getMimeTypeFromUri(uri);
  if (uriMimeType && isSupportedAvatarMimeType(uriMimeType)) {
    const result = {
      mimeType: uriMimeType,
      confidence: 'medium' as const,
      source: 'uri'
    };

    logMimeDetection(assetType, result.mimeType, result.confidence, result.source, uri, {
      strategy: 3,
      success: true
    });

    endPerformanceTracking(operationId, { result, strategy: 3 });
    return result;
  }

  // Strategy 4: Fallback based on common patterns in URI
  const lowerUri = uri.toLowerCase();
  let patternResult: { mimeType: string; confidence: 'low'; source: string } | null = null;

  if (lowerUri.includes('jpeg') || lowerUri.includes('jpg')) {
    patternResult = { mimeType: 'image/jpeg', confidence: 'low', source: 'uri-pattern' };
  } else if (lowerUri.includes('png')) {
    patternResult = { mimeType: 'image/png', confidence: 'low', source: 'uri-pattern' };
  } else if (lowerUri.includes('webp')) {
    patternResult = { mimeType: 'image/webp', confidence: 'low', source: 'uri-pattern' };
  } else if (lowerUri.includes('gif')) {
    patternResult = { mimeType: 'image/gif', confidence: 'low', source: 'uri-pattern' };
  }

  if (patternResult) {
    logMimeDetection(assetType, patternResult.mimeType, patternResult.confidence, patternResult.source, uri, {
      strategy: 4,
      pattern: 'uri-pattern',
      success: true
    });

    endPerformanceTracking(operationId, { result: patternResult, strategy: 4 });
    return patternResult;
  }

  // Final fallback: Default to JPEG (most common format)
  const fallbackResult = {
    mimeType: 'image/jpeg',
    confidence: 'low' as const,
    source: 'default-fallback'
  };

  logMimeDetection(assetType, fallbackResult.mimeType, fallbackResult.confidence, fallbackResult.source, uri, {
    strategy: 5,
    fallback: true,
    warning: 'Could not determine MIME type, using default'
  });

  endPerformanceTracking(operationId, { result: fallbackResult, strategy: 5, fallback: true });
  return fallbackResult;
}

/**
 * Get file extension from MIME type (reverse lookup)
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const normalizedType = mimeType.toLowerCase().trim();

  switch (normalizedType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/bmp':
      return 'bmp';
    case 'image/tiff':
      return 'tiff';
    case 'image/svg+xml':
      return 'svg';
    case 'image/x-icon':
      return 'ico';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    case 'image/avif':
      return 'avif';
    default:
      return 'jpg'; // Default fallback
  }
}

/**
 * Validate and normalize MIME type for avatar uploads
 */
export function validateAndNormalizeMimeType(
  assetType: string | null | undefined,
  uri: string,
  filename?: string | null
): { isValid: boolean; mimeType: string; details: any } {

  const operationId = `validation_${Date.now()}`;
  startPerformanceTracking(operationId, LogCategory.VALIDATION, 'MIME type validation');

  const detection = detectMimeType(assetType, uri, filename);
  const isValid = isSupportedAvatarMimeType(detection.mimeType);

  const details = {
    confidence: detection.confidence,
    source: detection.source,
    originalAssetType: assetType,
    supportedTypes: SUPPORTED_AVATAR_MIME_TYPES,
    detectedFromUri: getMimeTypeFromUri(uri),
    extractedExtension: extractFileExtension(uri),
  };

  // Log validation result
  logValidationResult(
    isValid,
    isValid ? [] : [`Unsupported MIME type: ${detection.mimeType}`],
    detection.confidence === 'low' ? ['Low confidence MIME type detection'] : [],
    details
  );

  endPerformanceTracking(operationId, { isValid, mimeType: detection.mimeType });

  return {
    isValid,
    mimeType: detection.mimeType,
    details
  };
}

/**
 * Generate initials from profile data
 */
export function getProfileInitials(profile: Profile | null, fallback = 'U'): string {
  if (!profile) return fallback;

  // Try full name first
  if (profile.full_name && typeof profile.full_name === 'string') {
    const trimmedFullName = profile.full_name.trim();
    if (trimmedFullName) {
      const names = trimmedFullName.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
  }

  // Try username
  if (profile.username && typeof profile.username === 'string') {
    return profile.username[0].toUpperCase();
  }

  // Fallback to user ID first character
  if (profile.id) {
    return profile.id[0].toUpperCase();
  }

  return fallback;
}

/**
 * Get display name from profile
 */
export function getDisplayName(profile: Profile | null, fallback = 'User'): string {
  if (!profile) return fallback;

  // Priority: full_name > username > fallback
  if (profile.full_name && typeof profile.full_name === 'string') {
    const trimmedFullName = profile.full_name.trim();
    if (trimmedFullName) {
      return trimmedFullName;
    }
  }

  if (profile.username && typeof profile.username === 'string') {
    const trimmedUsername = profile.username.trim();
    if (trimmedUsername) {
      return trimmedUsername;
    }
  }

  return fallback;
}

/**
 * Check if profile is complete (has basic required info)
 */
export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false;

  // Consider profile complete if it has either username or full_name
  const hasUsername = profile.username && typeof profile.username === 'string' && profile.username.trim();
  const hasFullName = profile.full_name && typeof profile.full_name === 'string' && profile.full_name.trim();
  return !!(hasUsername || hasFullName);
}

/**
 * Check if profile has avatar
 */
export function hasAvatar(profile: Profile | null): boolean {
  return !!(profile?.avatar_url && typeof profile.avatar_url === 'string' && profile.avatar_url.trim());
}

/**
 * Get profile completion percentage
 */
export function getProfileCompletionPercentage(profile: Profile | null): number {
  if (!profile) return 0;

  const fields = [
    profile.username,
    profile.full_name,
    profile.avatar_url,
    profile.bio,
    profile.website,
    profile.location,
  ];

  const completedFields = fields.filter(field => field && typeof field === 'string' && field.trim()).length;
  return Math.round((completedFields / fields.length) * 100);
}

/**
 * Get missing profile fields
 */
export function getMissingProfileFields(profile: Profile | null): string[] {
  if (!profile) return ['username', 'full_name', 'avatar', 'bio', 'website', 'location'];

  const missing: string[] = [];

  if (!(profile.username && typeof profile.username === 'string' && profile.username.trim())) missing.push('username');
  if (!(profile.full_name && typeof profile.full_name === 'string' && profile.full_name.trim())) missing.push('full_name');
  if (!(profile.avatar_url && typeof profile.avatar_url === 'string' && profile.avatar_url.trim())) missing.push('avatar');
  if (!(profile.bio && typeof profile.bio === 'string' && profile.bio.trim())) missing.push('bio');
  if (!(profile.website && typeof profile.website === 'string' && profile.website.trim())) missing.push('website');
  if (!(profile.location && typeof profile.location === 'string' && profile.location.trim())) missing.push('location');

  return missing;
}

/**
 * Format profile data for display
 */
export function formatProfileForDisplay(profile: Profile | null) {
  if (!profile) {
    return {
      displayName: 'User',
      initials: 'U',
      hasAvatar: false,
      isComplete: false,
      completionPercentage: 0,
    };
  }

  return {
    displayName: getDisplayName(profile),
    initials: getProfileInitials(profile),
    hasAvatar: hasAvatar(profile),
    isComplete: isProfileComplete(profile),
    completionPercentage: getProfileCompletionPercentage(profile),
    bio: (profile.bio && typeof profile.bio === 'string' && profile.bio.trim()) || null,
    website: (profile.website && typeof profile.website === 'string' && profile.website.trim()) || null,
    location: (profile.location && typeof profile.location === 'string' && profile.location.trim()) || null,
    joinedDate: profile.created_at ? new Date(profile.created_at) : null,
    lastUpdated: profile.updated_at ? new Date(profile.updated_at) : null,
  };
}

/**
 * Create avatar upload object from image picker result with enhanced MIME type detection
 */
export function createAvatarUpload(imageResult: any): AvatarUpload | null {
  if (!imageResult || imageResult.canceled) {
    return null;
  }

  const asset = imageResult.assets?.[0];
  if (!asset) {
    return null;
  }

  // Enhanced MIME type detection
  const mimeDetection = detectMimeType(asset.type, asset.uri, asset.fileName);

  // Generate appropriate filename with correct extension
  const detectedExtension = getExtensionFromMimeType(mimeDetection.mimeType);
  const defaultFileName = `avatar_${Date.now()}.${detectedExtension}`;

  // Enhanced logging for avatar creation
  profileLogger.info(LogCategory.UPLOAD, 'Avatar upload object created', {
    originalType: asset.type,
    detectedType: mimeDetection.mimeType,
    confidence: mimeDetection.confidence,
    source: mimeDetection.source,
    fileName: asset.fileName,
    generatedFileName: defaultFileName,
    fileSize: asset.fileSize || 0
  });

  return {
    uri: asset.uri,
    type: mimeDetection.mimeType,
    name: asset.fileName || defaultFileName,
    size: asset.fileSize || 0,
  };
}

/**
 * Enhanced avatar upload creation with validation
 */
export function createAvatarUploadWithValidation(imageResult: any): {
  avatar: AvatarUpload | null;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    details: any;
  };
} {
  const operationId = `avatar_creation_${Date.now()}`;
  startPerformanceTracking(operationId, LogCategory.UPLOAD, 'Avatar upload creation with validation');

  // Create basic avatar upload
  const avatar = createAvatarUpload(imageResult);

  if (!avatar) {
    const errorResult = {
      avatar: null,
      validation: {
        isValid: false,
        errors: ['Failed to create avatar upload object from image result'],
        warnings: [],
        details: { imageResult }
      }
    };

    profileLogger.error(LogCategory.UPLOAD, 'Failed to create avatar upload object', {
      imageResult: imageResult ? 'provided' : 'null',
      canceled: imageResult?.canceled,
      hasAssets: !!imageResult?.assets?.length
    });

    endPerformanceTracking(operationId, { success: false });
    return errorResult;
  }

  // Validate MIME type
  const mimeValidation = validateAndNormalizeMimeType(
    imageResult.assets?.[0]?.type,
    avatar.uri,
    avatar.name
  );

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!mimeValidation.isValid) {
    errors.push(`Unsupported file type: ${avatar.type}. Supported types: ${SUPPORTED_AVATAR_MIME_TYPES.join(', ')}`);
  }

  // Check confidence level and add warnings
  if (mimeValidation.details.confidence === 'low') {
    warnings.push('MIME type detection has low confidence. File type was determined using fallback methods.');
  }

  if (mimeValidation.details.source === 'default-fallback') {
    warnings.push('Could not determine file type from image data. Using default JPEG format.');
  }

  const result = {
    avatar,
    validation: {
      isValid: errors.length === 0,
      errors,
      warnings,
      details: mimeValidation.details
    }
  };

  // Log the validation result
  profileLogger.info(LogCategory.VALIDATION, 'Avatar upload validation completed', {
    isValid: result.validation.isValid,
    errorCount: errors.length,
    warningCount: warnings.length,
    mimeType: avatar.type,
    confidence: mimeValidation.details.confidence,
    source: mimeValidation.details.source
  });

  endPerformanceTracking(operationId, {
    success: true,
    isValid: result.validation.isValid,
    errorCount: errors.length,
    warningCount: warnings.length
  });

  return result;
}

/**
 * Generate avatar filename
 */
export function generateAvatarFilename(userId: string, originalName?: string): string {
  const timestamp = Date.now();
  const extension = originalName?.split('.').pop() || 'jpg';
  return `${userId}/avatar_${timestamp}.${extension}`;
}

/**
 * Check if two profiles are equal (for change detection)
 */
export function areProfilesEqual(profile1: Profile | null, profile2: Profile | null): boolean {
  if (profile1 === profile2) return true;
  if (!profile1 || !profile2) return false;

  return (
    profile1.id === profile2.id &&
    profile1.username === profile2.username &&
    profile1.full_name === profile2.full_name &&
    profile1.avatar_url === profile2.avatar_url &&
    profile1.bio === profile2.bio &&
    profile1.website === profile2.website &&
    profile1.location === profile2.location
  );
}

/**
 * Get changed fields between two profiles
 */
export function getChangedFields(oldProfile: Profile | null, newProfile: Profile | null): string[] {
  if (!oldProfile || !newProfile) return [];

  const changes: string[] = [];

  if (oldProfile.username !== newProfile.username) changes.push('username');
  if (oldProfile.full_name !== newProfile.full_name) changes.push('full_name');
  if (oldProfile.avatar_url !== newProfile.avatar_url) changes.push('avatar_url');
  if (oldProfile.bio !== newProfile.bio) changes.push('bio');
  if (oldProfile.website !== newProfile.website) changes.push('website');
  if (oldProfile.location !== newProfile.location) changes.push('location');

  return changes;
}

/**
 * Create profile update object with only changed fields
 */
export function createProfileUpdate(oldProfile: Profile, newProfile: Partial<Profile>): ProfileUpdate {
  const update: ProfileUpdate = {};

  if (newProfile.username !== undefined && newProfile.username !== oldProfile.username) {
    update.username = newProfile.username;
  }
  if (newProfile.full_name !== undefined && newProfile.full_name !== oldProfile.full_name) {
    update.full_name = newProfile.full_name;
  }
  if (newProfile.avatar_url !== undefined && newProfile.avatar_url !== oldProfile.avatar_url) {
    update.avatar_url = newProfile.avatar_url;
  }
  if (newProfile.bio !== undefined && newProfile.bio !== oldProfile.bio) {
    update.bio = newProfile.bio;
  }
  if (newProfile.website !== undefined && newProfile.website !== oldProfile.website) {
    update.website = newProfile.website;
  }
  if (newProfile.location !== undefined && newProfile.location !== oldProfile.location) {
    update.location = newProfile.location;
  }

  return update;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get avatar URL with fallback
 */
export function getAvatarUrl(profile: Profile | null, fallbackUrl?: string): string | null {
  if (profile?.avatar_url && typeof profile.avatar_url === 'string' && profile.avatar_url.trim()) {
    return profile.avatar_url;
  }
  return fallbackUrl || null;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string | null, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format date for profile display
 */
export function formatProfileDate(dateString: string | null): string {
  if (!dateString) return 'Unknown';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Get time since profile creation
 */
export function getTimeSinceCreation(createdAt: string | null): string {
  if (!createdAt) return 'Unknown';

  try {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }
    
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  } catch (error) {
    return 'Unknown';
  }
}
