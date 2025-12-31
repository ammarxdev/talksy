/**
 * Profile Validation Utility
 * Validation functions for profile data and avatar uploads
 */

import {
  ProfileUpdate,
  AvatarUpload,
  ProfileValidationResult,
  ProfileField,
  PROFILE_VALIDATION,
  ProfileError,
  PROFILE_ERROR_CODES,
} from '@/types/profile';
import { ProfileErrors } from '@/components/profile/ProfileErrorHandler';
import {
  profileLogger,
  LogCategory,
  logValidationResult,
  startPerformanceTracking,
  endPerformanceTracking
} from './profileLogger';
import { detectMimeType, validateAndNormalizeMimeType } from './profileUtils';

/**
 * Validate all profile update fields
 */
export function validateProfileUpdate(updates: ProfileUpdate): ProfileValidationResult {
  const errors: Record<ProfileField, string[]> = {
    username: [],
    full_name: [],
    avatar_url: [],
    bio: [],
    website: [],
    location: [],
  };

  let isValid = true;

  // Validate username
  if (updates.username !== undefined && updates.username !== null) {
    const usernameErrors = validateUsername(updates.username);
    if (usernameErrors.length > 0) {
      errors.username = usernameErrors;
      isValid = false;
    }
  }

  // Validate full name
  if (updates.full_name !== undefined && updates.full_name !== null) {
    const fullNameErrors = validateFullName(updates.full_name);
    if (fullNameErrors.length > 0) {
      errors.full_name = fullNameErrors;
      isValid = false;
    }
  }

  // Validate bio
  if (updates.bio !== undefined && updates.bio !== null) {
    const bioErrors = validateBio(updates.bio);
    if (bioErrors.length > 0) {
      errors.bio = bioErrors;
      isValid = false;
    }
  }

  // Validate website
  if (updates.website !== undefined && updates.website !== null) {
    const websiteErrors = validateWebsite(updates.website);
    if (websiteErrors.length > 0) {
      errors.website = websiteErrors;
      isValid = false;
    }
  }

  // Validate location
  if (updates.location !== undefined && updates.location !== null) {
    const locationErrors = validateLocation(updates.location);
    if (locationErrors.length > 0) {
      errors.location = locationErrors;
      isValid = false;
    }
  }

  return { isValid, errors };
}

/**
 * Validate username field
 */
export function validateUsername(username: string): string[] {
  const errors: string[] = [];

  if (!username || username.trim().length === 0) {
    errors.push('Username is required');
    return errors;
  }

  const trimmed = username.trim();

  if (trimmed.length < PROFILE_VALIDATION.USERNAME.MIN_LENGTH) {
    errors.push(`Username must be at least ${PROFILE_VALIDATION.USERNAME.MIN_LENGTH} characters`);
  }

  if (trimmed.length > PROFILE_VALIDATION.USERNAME.MAX_LENGTH) {
    errors.push(`Username cannot exceed ${PROFILE_VALIDATION.USERNAME.MAX_LENGTH} characters`);
  }

  if (!PROFILE_VALIDATION.USERNAME.PATTERN.test(trimmed)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens');
  }

  // Check for reserved usernames
  const reservedUsernames = ['admin', 'root', 'user', 'test', 'api', 'www', 'mail', 'support'];
  if (reservedUsernames.includes(trimmed.toLowerCase())) {
    errors.push('This username is reserved and cannot be used');
  }

  return errors;
}

/**
 * Validate full name field
 */
export function validateFullName(fullName: string): string[] {
  const errors: string[] = [];

  if (!fullName || fullName.trim().length === 0) {
    return errors; // Full name is optional
  }

  const trimmed = fullName.trim();

  if (trimmed.length < PROFILE_VALIDATION.FULL_NAME.MIN_LENGTH) {
    errors.push(`Full name must be at least ${PROFILE_VALIDATION.FULL_NAME.MIN_LENGTH} character`);
  }

  if (trimmed.length > PROFILE_VALIDATION.FULL_NAME.MAX_LENGTH) {
    errors.push(`Full name cannot exceed ${PROFILE_VALIDATION.FULL_NAME.MAX_LENGTH} characters`);
  }

  // Check for inappropriate content (basic check)
  const inappropriatePatterns = [
    /\b(fuck|shit|damn|bitch)\b/i,
    /[<>{}[\]]/,  // HTML/script tags
  ];

  for (const pattern of inappropriatePatterns) {
    if (pattern.test(trimmed)) {
      errors.push('Full name contains inappropriate content');
      break;
    }
  }

  return errors;
}

/**
 * Validate bio field
 */
export function validateBio(bio: string): string[] {
  const errors: string[] = [];

  if (!bio || bio.trim().length === 0) {
    return errors; // Bio is optional
  }

  const trimmed = bio.trim();

  if (trimmed.length > PROFILE_VALIDATION.BIO.MAX_LENGTH) {
    errors.push(`Bio cannot exceed ${PROFILE_VALIDATION.BIO.MAX_LENGTH} characters`);
  }

  // Check for inappropriate content
  const inappropriatePatterns = [
    /\b(fuck|shit|damn|bitch)\b/i,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,  // Script tags
  ];

  for (const pattern of inappropriatePatterns) {
    if (pattern.test(trimmed)) {
      errors.push('Bio contains inappropriate content');
      break;
    }
  }

  return errors;
}

/**
 * Validate website field
 */
export function validateWebsite(website: string): string[] {
  const errors: string[] = [];

  if (!website || website.trim().length === 0) {
    return errors; // Website is optional
  }

  const trimmed = website.trim();

  if (!PROFILE_VALIDATION.WEBSITE.PATTERN.test(trimmed)) {
    errors.push('Website must be a valid HTTP or HTTPS URL');
  }

  // Additional URL validation
  try {
    const url = new URL(trimmed);
    
    // Check for valid protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      errors.push('Website must use HTTP or HTTPS protocol');
    }

    // Check for valid hostname
    if (!url.hostname || url.hostname.length < 3) {
      errors.push('Website must have a valid domain name');
    }

  } catch (error) {
    errors.push('Website must be a valid URL');
  }

  return errors;
}

/**
 * Validate location field
 */
export function validateLocation(location: string): string[] {
  const errors: string[] = [];

  if (!location || location.trim().length === 0) {
    return errors; // Location is optional
  }

  const trimmed = location.trim();

  if (trimmed.length > PROFILE_VALIDATION.LOCATION.MAX_LENGTH) {
    errors.push(`Location cannot exceed ${PROFILE_VALIDATION.LOCATION.MAX_LENGTH} characters`);
  }

  // Check for inappropriate content
  const inappropriatePatterns = [
    /\b(fuck|shit|damn|bitch)\b/i,
    /[<>{}[\]]/,  // HTML/script tags
  ];

  for (const pattern of inappropriatePatterns) {
    if (pattern.test(trimmed)) {
      errors.push('Location contains inappropriate content');
      break;
    }
  }

  return errors;
}

/**
 * Validate avatar upload with enhanced error handling and logging
 */
export function validateAvatarUpload(avatar: AvatarUpload): string[] {
  const operationId = `avatar_validation_${Date.now()}`;
  startPerformanceTracking(operationId, LogCategory.VALIDATION, 'Avatar upload validation');

  const errors: string[] = [];
  const validationDetails: any = {
    fileSize: avatar.size,
    mimeType: avatar.type,
    fileName: avatar.name,
    hasUri: !!avatar.uri
  };

  // Enhanced file size validation
  if (avatar.size <= 0) {
    errors.push('Invalid file: File appears to be empty or corrupted');
    validationDetails.sizeError = 'empty_file';
  } else if (avatar.size > PROFILE_VALIDATION.AVATAR.MAX_SIZE) {
    const maxSizeMB = (PROFILE_VALIDATION.AVATAR.MAX_SIZE / (1024 * 1024)).toFixed(1);
    const currentSizeMB = (avatar.size / (1024 * 1024)).toFixed(1);
    errors.push(`File too large: ${currentSizeMB}MB exceeds the ${maxSizeMB}MB limit. Please compress the image or choose a smaller file.`);
    validationDetails.sizeError = 'too_large';
    validationDetails.maxSizeMB = maxSizeMB;
    validationDetails.currentSizeMB = currentSizeMB;
  }

  // Enhanced file type validation with detailed error messages
  if (!avatar.type || avatar.type.trim().length === 0) {
    errors.push('Unknown file type: Could not determine the image format. Please ensure you\'re selecting a valid image file.');
    validationDetails.typeError = 'missing_type';
  } else if (!PROFILE_VALIDATION.AVATAR.ALLOWED_TYPES.includes(avatar.type)) {
    const allowedFormats = PROFILE_VALIDATION.AVATAR.ALLOWED_TYPES
      .map(type => type.replace('image/', '').toUpperCase())
      .join(', ');
    const currentFormat = avatar.type.replace('image/', '').toUpperCase();
    errors.push(`Unsupported format: ${currentFormat} files are not supported. Please use one of these formats: ${allowedFormats}`);
    validationDetails.typeError = 'unsupported_type';
    validationDetails.detectedType = avatar.type;
    validationDetails.allowedTypes = PROFILE_VALIDATION.AVATAR.ALLOWED_TYPES;
  }

  // Enhanced filename validation
  if (!avatar.name || avatar.name.trim().length === 0) {
    errors.push('Invalid filename: The selected file must have a valid name');
    validationDetails.nameError = 'missing_name';
  } else {
    // Check for potentially problematic filenames
    const suspiciousPatterns = [
      /[<>:"/\\|?*]/,  // Invalid filename characters
      /^\./,           // Hidden files
      /\.(exe|bat|cmd|scr|com|pif)$/i  // Executable files
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(avatar.name)) {
        errors.push('Invalid filename: The filename contains invalid characters or appears to be a non-image file');
        validationDetails.nameError = 'invalid_characters';
        break;
      }
    }
  }

  // Enhanced URI validation
  if (!avatar.uri || avatar.uri.trim().length === 0) {
    errors.push('Invalid file location: Could not access the selected file');
    validationDetails.uriError = 'missing_uri';
  } else {
    // Basic URI format validation
    try {
      const uri = avatar.uri.trim();
      if (!uri.startsWith('file://') && !uri.startsWith('content://') && !uri.startsWith('http')) {
        errors.push('Invalid file location: The file location format is not supported');
        validationDetails.uriError = 'invalid_format';
      }
    } catch (error) {
      errors.push('Invalid file location: Could not process the file location');
      validationDetails.uriError = 'processing_error';
    }
  }

  // Log validation results
  logValidationResult(
    errors.length === 0,
    errors,
    [], // No warnings in basic validation
    validationDetails
  );

  endPerformanceTracking(operationId, {
    isValid: errors.length === 0,
    errorCount: errors.length,
    validationDetails
  });

  return errors;
}

/**
 * Comprehensive avatar validation with MIME type detection and enhanced error handling
 */
export function validateAvatarUploadComprehensive(
  avatar: AvatarUpload,
  originalAssetType?: string | null,
  options: {
    enableMimeDetection?: boolean;
    enableDimensionCheck?: boolean;
    strictValidation?: boolean;
  } = {}
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    fileSize: {
      bytes: number;
      mb: string;
      isValid: boolean;
      isLarge: boolean;
    };
    mimeType: {
      detected: string;
      original?: string | null;
      confidence?: string;
      source?: string;
      isValid: boolean;
    };
    fileName: {
      name: string;
      extension?: string;
      isValid: boolean;
    };
    uri: {
      value: string;
      format: string;
      isValid: boolean;
    };
  };
} {
  const operationId = `comprehensive_validation_${Date.now()}`;
  startPerformanceTracking(operationId, LogCategory.VALIDATION, 'Comprehensive avatar validation');

  const {
    enableMimeDetection = true,
    enableDimensionCheck = false,
    strictValidation = false
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  // File size analysis
  const fileSizeDetails = {
    bytes: avatar.size,
    mb: (avatar.size / (1024 * 1024)).toFixed(2),
    isValid: true,
    isLarge: false
  };

  if (avatar.size <= 0) {
    errors.push('File appears to be empty or corrupted. Please select a different image.');
    fileSizeDetails.isValid = false;
  } else if (avatar.size > PROFILE_VALIDATION.AVATAR.MAX_SIZE) {
    const maxSizeMB = (PROFILE_VALIDATION.AVATAR.MAX_SIZE / (1024 * 1024)).toFixed(1);
    errors.push(`Image is too large (${fileSizeDetails.mb}MB). Maximum allowed size is ${maxSizeMB}MB. Please compress the image or choose a smaller file.`);
    fileSizeDetails.isValid = false;
  } else if (avatar.size > PROFILE_VALIDATION.AVATAR.MAX_SIZE * 0.8) {
    warnings.push(`Large file size (${fileSizeDetails.mb}MB). Consider using a smaller image for faster uploads.`);
    fileSizeDetails.isLarge = true;
  }

  // MIME type analysis
  let mimeTypeDetails: any = {
    detected: avatar.type,
    original: originalAssetType,
    isValid: PROFILE_VALIDATION.AVATAR.ALLOWED_TYPES.includes(avatar.type)
  };

  if (enableMimeDetection && originalAssetType !== undefined) {
    try {
      const mimeValidation = validateAndNormalizeMimeType(originalAssetType, avatar.uri, avatar.name);
      mimeTypeDetails = {
        detected: mimeValidation.mimeType,
        original: originalAssetType,
        confidence: mimeValidation.details.confidence,
        source: mimeValidation.details.source,
        isValid: mimeValidation.isValid
      };

      if (!mimeValidation.isValid) {
        const allowedFormats = PROFILE_VALIDATION.AVATAR.ALLOWED_TYPES
          .map(type => type.replace('image/', '').toUpperCase())
          .join(', ');
        errors.push(`Unsupported image format. Please use one of these formats: ${allowedFormats}`);
      }

      if (mimeValidation.details.confidence === 'low') {
        warnings.push('File type detection has low confidence. The image may not display correctly.');
      }

      if (mimeValidation.details.source === 'default-fallback') {
        warnings.push('Could not determine the exact file type. Assuming JPEG format.');
      }
    } catch (error) {
      errors.push('Unable to validate image format. Please ensure you\'re selecting a valid image file.');
      mimeTypeDetails.isValid = false;
    }
  } else if (!mimeTypeDetails.isValid) {
    const allowedFormats = PROFILE_VALIDATION.AVATAR.ALLOWED_TYPES
      .map(type => type.replace('image/', '').toUpperCase())
      .join(', ');
    const currentFormat = avatar.type.replace('image/', '').toUpperCase();
    errors.push(`Unsupported format: ${currentFormat}. Please use one of these formats: ${allowedFormats}`);
  }

  // File name analysis
  const fileNameDetails = {
    name: avatar.name || '',
    extension: avatar.name ? avatar.name.split('.').pop()?.toLowerCase() : undefined,
    isValid: true
  };

  if (!avatar.name || avatar.name.trim().length === 0) {
    if (strictValidation) {
      errors.push('File must have a valid name.');
    } else {
      warnings.push('File has no name. A default name will be generated.');
    }
    fileNameDetails.isValid = false;
  } else {
    // Check for problematic filename patterns
    const problematicPatterns = [
      { pattern: /[<>:"/\\|?*]/, message: 'Filename contains invalid characters' },
      { pattern: /^\s*$/, message: 'Filename cannot be empty or only spaces' },
      { pattern: /^\./, message: 'Hidden files are not recommended' },
      { pattern: /\.(exe|bat|cmd|scr|com|pif)$/i, message: 'File appears to be executable, not an image' }
    ];

    for (const { pattern, message } of problematicPatterns) {
      if (pattern.test(avatar.name)) {
        if (strictValidation) {
          errors.push(`Invalid filename: ${message}`);
        } else {
          warnings.push(`Filename issue: ${message}. A safe name will be generated.`);
        }
        fileNameDetails.isValid = false;
        break;
      }
    }

    // Check filename length
    if (avatar.name.length > 100) {
      warnings.push('Very long filename. Consider using a shorter name.');
    }
  }

  // URI analysis
  const uriDetails = {
    value: avatar.uri || '',
    format: 'unknown',
    isValid: true
  };

  if (!avatar.uri || avatar.uri.trim().length === 0) {
    errors.push('Invalid file location. Cannot access the selected image.');
    uriDetails.isValid = false;
  } else {
    const uri = avatar.uri.trim();
    if (uri.startsWith('file://')) {
      uriDetails.format = 'local_file';
    } else if (uri.startsWith('content://')) {
      uriDetails.format = 'content_provider';
    } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
      uriDetails.format = 'remote_url';
      if (strictValidation) {
        warnings.push('Remote URLs may have slower upload speeds.');
      }
    } else {
      uriDetails.format = 'unknown';
      if (strictValidation) {
        errors.push('Unsupported file location format.');
        uriDetails.isValid = false;
      } else {
        warnings.push('Unusual file location format detected.');
      }
    }
  }

  const result = {
    isValid: errors.length === 0,
    errors,
    warnings,
    details: {
      fileSize: fileSizeDetails,
      mimeType: mimeTypeDetails,
      fileName: fileNameDetails,
      uri: uriDetails
    }
  };

  // Log comprehensive validation results
  logValidationResult(
    result.isValid,
    errors,
    warnings,
    {
      comprehensive: true,
      enableMimeDetection,
      enableDimensionCheck,
      strictValidation,
      ...result.details
    }
  );

  endPerformanceTracking(operationId, {
    isValid: result.isValid,
    errorCount: errors.length,
    warningCount: warnings.length,
    validationMode: 'comprehensive'
  });

  return result;
}

/**
 * Validate avatar dimensions (requires image processing)
 */
export async function validateAvatarDimensions(uri: string): Promise<string[]> {
  const operationId = `dimension_validation_${Date.now()}`;
  startPerformanceTracking(operationId, LogCategory.VALIDATION, 'Avatar dimension validation');

  const errors: string[] = [];

  try {
    // This would require expo-image-manipulator or similar
    // For now, we'll skip dimension validation
    // TODO: Implement dimension validation when needed

    profileLogger.info(LogCategory.VALIDATION, 'Dimension validation skipped - not implemented', {
      uri: uri.substring(0, 50) + '...' // Log partial URI for privacy
    });

    endPerformanceTracking(operationId, { implemented: false });
    return errors;
  } catch (error) {
    const errorMessage = 'Unable to validate image dimensions';
    errors.push(errorMessage);

    profileLogger.error(LogCategory.VALIDATION, 'Dimension validation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      uri: uri.substring(0, 50) + '...'
    });

    endPerformanceTracking(operationId, { success: false, error: errorMessage });
    return errors;
  }
}

/**
 * Get validation error message for a specific field
 */
export function getFieldErrorMessage(field: ProfileField, errors: string[]): string | null {
  if (errors.length === 0) return null;
  return errors[0]; // Return first error
}

/**
 * Check if a profile update has any validation errors
 */
export function hasValidationErrors(validationResult: ProfileValidationResult): boolean {
  return !validationResult.isValid;
}

/**
 * Get all validation error messages as a flat array
 */
export function getAllErrorMessages(validationResult: ProfileValidationResult): string[] {
  const allErrors: string[] = [];
  
  Object.values(validationResult.errors).forEach(fieldErrors => {
    allErrors.push(...fieldErrors);
  });
  
  return allErrors;
}

/**
 * Sanitize profile input (remove dangerous content)
 */
export function sanitizeProfileInput(input: string): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/[<>{}[\]]/g, '') // Remove HTML/script characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Create a ProfileError from validation results
 */
export function createValidationError(validationResult: ProfileValidationResult): ProfileError {
  const allErrors = getAllErrorMessages(validationResult);
  const message = allErrors.length > 0 ? allErrors[0] : 'Validation failed';

  return new ProfileError(
    message,
    PROFILE_ERROR_CODES.VALIDATION_ERROR
  );
}

/**
 * Enhanced avatar validation with detailed error reporting and ProfileErrors integration
 */
export function validateAvatarUploadEnhanced(
  avatar: AvatarUpload,
  originalAssetType?: string | null,
  options?: {
    enableMimeDetection?: boolean;
    strictValidation?: boolean;
  }
): {
  isValid: boolean;
  errors: ReturnType<typeof ProfileErrors.validationError>[];
  warnings: ReturnType<typeof ProfileErrors.validationError>[];
  details?: any;
} {
  const operationId = `enhanced_validation_${Date.now()}`;
  startPerformanceTracking(operationId, LogCategory.VALIDATION, 'Enhanced avatar validation');

  // Use comprehensive validation
  const comprehensiveResult = validateAvatarUploadComprehensive(avatar, originalAssetType, {
    enableMimeDetection: options?.enableMimeDetection ?? true,
    strictValidation: options?.strictValidation ?? false,
    enableDimensionCheck: false
  });

  // Convert string errors/warnings to ProfileErrors format
  const errors: ReturnType<typeof ProfileErrors.validationError>[] = [];
  const warnings: ReturnType<typeof ProfileErrors.validationError>[] = [];

  // Process errors
  comprehensiveResult.errors.forEach(error => {
    if (error.includes('too large') || error.includes('empty')) {
      errors.push(ProfileErrors.validationError(error, 'Try compressing the image or selecting a different file.'));
    } else if (error.includes('format') || error.includes('type')) {
      errors.push(ProfileErrors.validationError(error, 'Please select a JPEG, PNG, WebP, or GIF image.'));
    } else if (error.includes('filename') || error.includes('name')) {
      errors.push(ProfileErrors.validationError(error, 'The file name contains invalid characters.'));
    } else if (error.includes('location') || error.includes('URI')) {
      errors.push(ProfileErrors.validationError(error, 'Please try selecting the image again.'));
    } else {
      errors.push(ProfileErrors.validationError(error));
    }
  });

  // Process warnings
  comprehensiveResult.warnings.forEach(warning => {
    if (warning.includes('Large file size')) {
      warnings.push(ProfileErrors.validationError(warning, 'Large images may take longer to upload.'));
    } else if (warning.includes('confidence') || warning.includes('detection')) {
      warnings.push(ProfileErrors.validationError(warning, 'The image should still work correctly.'));
    } else if (warning.includes('filename') || warning.includes('name')) {
      warnings.push(ProfileErrors.validationError(warning, 'A safe filename will be generated automatically.'));
    } else {
      warnings.push(ProfileErrors.validationError(warning));
    }
  });

  const result = {
    isValid: errors.length === 0,
    errors,
    warnings,
    details: comprehensiveResult.details
  };

  // Log enhanced validation results
  profileLogger.info(LogCategory.VALIDATION, 'Enhanced avatar validation completed', {
    isValid: result.isValid,
    errorCount: errors.length,
    warningCount: warnings.length,
    hasOriginalAssetType: originalAssetType !== undefined,
    enableMimeDetection: options?.enableMimeDetection ?? true,
    strictValidation: options?.strictValidation ?? false
  });

  endPerformanceTracking(operationId, {
    isValid: result.isValid,
    errorCount: errors.length,
    warningCount: warnings.length,
    validationMode: 'enhanced'
  });

  return result;
}

/**
 * Network error handler for profile operations
 */
export function handleNetworkError(error: any): ReturnType<typeof ProfileErrors.networkError> {
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('network')) {
    return ProfileErrors.networkError(
      'Please check your internet connection and try again.'
    );
  }

  if (error.code === 'TIMEOUT') {
    return ProfileErrors.networkError(
      'The request timed out. This might be due to a slow connection.'
    );
  }

  return ProfileErrors.networkError(
    error.message || 'Unable to connect to the server.'
  );
}

/**
 * Permission error handler
 */
export function handlePermissionError(permissionType: 'camera' | 'photos'): ReturnType<typeof ProfileErrors.permissionError> {
  const messages = {
    camera: 'Camera access is required to take photos for your profile picture. Please go to Settings > Privacy and enable access for this app.',
    photos: 'Photo library access is required to select images for your profile picture. Please go to Settings > Privacy and enable access for this app.',
  };

  return ProfileErrors.permissionError(messages[permissionType]);
}

/**
 * Upload error handler with retry logic
 */
export function handleUploadError(error: any, attempt: number = 1): {
  error: ReturnType<typeof ProfileErrors.uploadError>;
  shouldRetry: boolean;
  retryDelay: number;
} {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  let shouldRetry = attempt < maxRetries;
  let retryDelay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff

  if (error.code === 'STORAGE_FULL') {
    return {
      error: ProfileErrors.storageError(
        'Not enough storage space available.'
      ),
      shouldRetry: false,
      retryDelay: 0,
    };
  }

  if (error.code === 'FILE_TOO_LARGE') {
    return {
      error: ProfileErrors.validationError(
        'File is too large to upload',
        'Please compress the image or choose a smaller file.'
      ),
      shouldRetry: false,
      retryDelay: 0,
    };
  }

  return {
    error: ProfileErrors.uploadError(
      `Upload failed${attempt > 1 ? ` (attempt ${attempt})` : ''}. ${error.message || ''}`
    ),
    shouldRetry,
    retryDelay,
  };
}
