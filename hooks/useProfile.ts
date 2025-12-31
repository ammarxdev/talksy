/**
 * Profile Hook
 * Enhanced hook for profile management with computed values and utilities
 */

import { useMemo } from 'react';
import { useProfile as useProfileContext } from '@/contexts/ProfileContext';
import { UseProfileReturn } from '@/types/profile';
import {
  getDisplayName,
  getProfileInitials,
  isProfileComplete,
  hasAvatar,
  getProfileCompletionPercentage,
  formatProfileForDisplay,
} from '@/utils/profileUtils';

/**
 * Enhanced profile hook with computed values
 */
export const useProfile = (): UseProfileReturn => {
  const context = useProfileContext();

  // Computed values
  const computedValues = useMemo(() => {
    const { profile, loadingState } = context;

    return {
      // Loading states
      isLoading: loadingState.loading,
      isUploading: loadingState.uploading,
      hasError: !!loadingState.error,
      errorMessage: loadingState.error,

      // Profile status
      isProfileComplete: isProfileComplete(profile),
      hasAvatar: hasAvatar(profile),

      // Display values
      displayName: getDisplayName(profile),
      initials: getProfileInitials(profile),
      completionPercentage: getProfileCompletionPercentage(profile),

      // Formatted profile data
      formattedProfile: formatProfileForDisplay(profile),
    };
  }, [context.profile, context.loadingState]);

  return {
    ...context,
    ...computedValues,
  };
};

/**
 * Hook for profile display data only (lightweight)
 */
export const useProfileDisplay = () => {
  const { profile } = useProfileContext();

  return useMemo(() => formatProfileForDisplay(profile), [profile]);
};

/**
 * Hook for profile loading states only
 */
export const useProfileLoading = () => {
  const { loadingState } = useProfileContext();

  return useMemo(() => ({
    isLoading: loadingState.loading,
    isUploading: loadingState.uploading,
    hasError: !!loadingState.error,
    errorMessage: loadingState.error,
  }), [loadingState]);
};

/**
 * Hook for profile actions only
 */
export const useProfileActions = () => {
  const {
    loadProfile,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    refreshProfile,
    clearProfile,
  } = useProfileContext();

  return {
    loadProfile,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    refreshProfile,
    clearProfile,
  };
};

/**
 * Hook for profile status checks
 */
export const useProfileStatus = () => {
  const { profile, isInitialized } = useProfileContext();

  return useMemo(() => ({
    isInitialized,
    hasProfile: !!profile,
    isComplete: isProfileComplete(profile),
    hasAvatar: hasAvatar(profile),
    completionPercentage: getProfileCompletionPercentage(profile),
  }), [profile, isInitialized]);
};
