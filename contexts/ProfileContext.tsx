/**
 * Profile Context
 * Global profile state management with Supabase integration and local caching
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback,
  ReactNode 
} from 'react';
import { useAuth } from './AuthContext';
import {
  Profile,
  ProfileUpdate,
  AvatarUpload,
  AvatarUploadResult,
  ProfileContextType,
  ProfileLoadingState,
  ProfileError,
  PROFILE_ERROR_CODES,
  DEFAULT_PROFILE,
} from '@/types/profile';
import { profileStorage } from '@/utils/profileStorage'; // Uses supabase internally
import { validateProfileUpdate } from '@/utils/profileValidation';

/**
 * Profile Context
 */
const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

/**
 * Profile Provider Props
 */
interface ProfileProviderProps {
  children: ReactNode;
}

/**
 * Profile Provider Component
 */
export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const { user, session, loading: authLoading } = useAuth();
  
  // State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingState, setLoadingState] = useState<ProfileLoadingState>({
    loading: false,
    uploading: false,
    error: null,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Set loading state helper
   */
  const updateLoadingState = useCallback((updates: Partial<ProfileLoadingState>) => {
    setLoadingState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Handle profile errors
   */
  const handleError = useCallback((error: any, context: string) => {
    console.error(`Profile error in ${context}:`, error);
    
    const errorMessage = error instanceof ProfileError 
      ? error.message 
      : error?.message || `Failed to ${context}`;
    
    updateLoadingState({ error: errorMessage, loading: false, uploading: false });
    return errorMessage;
  }, [updateLoadingState]);

  /**
   * Load profile for current user
   */
  const loadProfile = useCallback(async (userId: string, forceRefresh = false): Promise<Profile | null> => {
    if (!userId) {
      console.warn('Cannot load profile: no user ID provided');
      return null;
    }

    try {
      updateLoadingState({ loading: true, error: null });
      
      console.log(`Loading profile for user: ${userId}${forceRefresh ? ' (force refresh)' : ''}`);
      
      const loadedProfile = await profileStorage.loadProfile(userId, forceRefresh);
      
      if (loadedProfile) {
        setProfile(loadedProfile);
        console.log('Profile loaded successfully:', {
          id: loadedProfile.id,
          username: loadedProfile.username,
          hasAvatar: !!loadedProfile.avatar_url,
        });
      } else {
        console.log('No profile found for user');
        setProfile(null);
      }
      
      updateLoadingState({ loading: false });
      return loadedProfile;
    } catch (error) {
      handleError(error, 'load profile');
      return null;
    }
  }, [updateLoadingState, handleError]);

  /**
   * Update profile with validation
   */
  const updateProfile = useCallback(async (updates: ProfileUpdate): Promise<Profile | null> => {
    if (!user?.id) {
      const error = 'Cannot update profile: user not authenticated';
      updateLoadingState({ error });
      return null;
    }

    try {
      updateLoadingState({ loading: true, error: null });
      
      console.log('Updating profile with:', updates);
      
      // Validate updates
      const validation = validateProfileUpdate(updates);
      if (!validation.isValid) {
        const firstError = Object.values(validation.errors)
          .flat()
          .find(error => error);
        throw new ProfileError(
          firstError || 'Validation failed',
          PROFILE_ERROR_CODES.VALIDATION_ERROR
        );
      }
      
      // Update profile
      const updatedProfile = await profileStorage.updateProfile(user.id, updates);
      
      setProfile(updatedProfile);
      updateLoadingState({ loading: false });
      
      console.log('Profile updated successfully');
      return updatedProfile;
    } catch (error) {
      handleError(error, 'update profile');
      return null;
    }
  }, [user?.id, updateLoadingState, handleError]);

  /**
   * Upload avatar image
   */
  const uploadAvatar = useCallback(async (avatar: AvatarUpload): Promise<AvatarUploadResult> => {
    if (!user?.id) {
      return {
        success: false,
        error: 'Cannot upload avatar: user not authenticated',
      };
    }

    try {
      updateLoadingState({ uploading: true, error: null });
      
      console.log('Uploading avatar:', {
        type: avatar.type,
        size: `${Math.round(avatar.size / 1024)}KB`,
      });
      
      const result = await profileStorage.uploadAvatar(user.id, avatar);
      
      if (result.success && result.avatar_url) {
        // Update local profile state
        setProfile(prev => prev ? {
          ...prev,
          avatar_url: result.avatar_url!,
          updated_at: new Date().toISOString(),
        } : null);
        
        console.log('Avatar uploaded successfully');
      }
      
      updateLoadingState({ uploading: false });
      return result;
    } catch (error) {
      const errorMessage = handleError(error, 'upload avatar');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [user?.id, updateLoadingState, handleError]);

  /**
   * Delete avatar
   */
  const deleteAvatar = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      updateLoadingState({ error: 'Cannot delete avatar: user not authenticated' });
      return false;
    }

    try {
      updateLoadingState({ loading: true, error: null });
      
      console.log('Deleting avatar');
      
      const success = await profileStorage.deleteAvatar(user.id);
      
      if (success) {
        // Update local profile state
        setProfile(prev => prev ? {
          ...prev,
          avatar_url: null,
          updated_at: new Date().toISOString(),
        } : null);
        
        console.log('Avatar deleted successfully');
      }
      
      updateLoadingState({ loading: false });
      return success;
    } catch (error) {
      handleError(error, 'delete avatar');
      return false;
    }
  }, [user?.id, updateLoadingState, handleError]);

  /**
   * Refresh profile from server
   */
  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    if (!user?.id) return null;
    return await loadProfile(user.id, true);
  }, [user?.id, loadProfile]);

  /**
   * Clear profile state
   */
  const clearProfile = useCallback(() => {
    console.log('Clearing profile state');
    setProfile(null);
    setLoadingState({
      loading: false,
      uploading: false,
      error: null,
    });
    setIsInitialized(false);
  }, []);

  /**
   * Initialize profile when user changes
   */
  const initializeProfile = useCallback(async () => {
    if (authLoading) {
      // Wait for auth to finish loading
      return;
    }

    if (!user?.id) {
      // User not authenticated, clear profile
      clearProfile();
      setIsInitialized(true);
      return;
    }

    if (isInitialized && profile?.id === user.id) {
      // Already initialized for this user
      return;
    }

    try {
      console.log('Initializing profile for user:', user.id);
      await loadProfile(user.id);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize profile:', error);
      setIsInitialized(true);
    }
  }, [authLoading, user?.id, isInitialized, profile?.id, loadProfile, clearProfile]);

  // Initialize profile when auth state changes
  useEffect(() => {
    initializeProfile();
  }, [initializeProfile]);

  // Clear profile when user signs out
  useEffect(() => {
    if (!authLoading && !user) {
      clearProfile();
    }
  }, [authLoading, user, clearProfile]);

  // Log profile state changes for debugging
  useEffect(() => {
    if (isInitialized) {
      console.log('Profile state updated:', {
        hasProfile: !!profile,
        profileId: profile?.id,
        username: profile?.username,
        hasAvatar: !!profile?.avatar_url,
        loading: loadingState.loading,
        uploading: loadingState.uploading,
        error: loadingState.error,
      });
    }
  }, [profile, loadingState, isInitialized]);

  // Context value
  const contextValue: ProfileContextType = {
    // State
    profile,
    loadingState,
    isInitialized,
    
    // Actions
    loadProfile,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    refreshProfile,
    clearProfile,
  };

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
};

/**
 * Hook to use profile context
 */
export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

/**
 * Export default
 */
export default ProfileProvider;
