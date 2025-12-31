/**
 * Cached Profile Picture Component
 * Enhanced ProfilePicture with image caching and offline support
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { ProfilePictureProps } from '@/types/profile';
import { getProfileInitials, getDisplayName } from '@/utils/profileUtils';
import { getCachedImage } from '@/utils/imageCache';

interface CachedProfilePictureProps extends ProfilePictureProps {
  enableCaching?: boolean;
  cacheMaxAge?: number;
  showProgress?: boolean;
  onCacheHit?: () => void;
  onCacheMiss?: () => void;
}

export const CachedProfilePicture: React.FC<CachedProfilePictureProps> = ({
  profile,
  size = 80,
  showBorder = false,
  onPress,
  fallbackText,
  style,
  enableCaching = true,
  cacheMaxAge = 7 * 24 * 60 * 60 * 1000, // 7 days
  showProgress = true,
  onCacheHit,
  onCacheMiss,
}) => {
  const { colors } = useTheme();
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [cachedImageUri, setCachedImageUri] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Get display values
  const initials = getProfileInitials(profile, fallbackText);
  const displayName = getDisplayName(profile);
  const hasAvatar = !!(profile?.avatar_url && !imageError);

  // Dynamic styles based on size
  const containerSize = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const textSize = {
    fontSize: size * 0.4, // 40% of container size
  };

  const borderStyle = showBorder ? {
    borderWidth: 3,
    borderColor: colors.border,
  } : {};

  // Load cached image
  const loadCachedImage = useCallback(async () => {
    if (!profile?.avatar_url || !enableCaching) {
      setCachedImageUri(profile?.avatar_url || null);
      return;
    }

    try {
      setImageLoading(true);
      setDownloadProgress(0);

      const cachedUri = await getCachedImage(
        profile.avatar_url,
        { maxAge: cacheMaxAge },
        (progress) => {
          setDownloadProgress(progress);
        }
      );

      // Check if we got a cached version or original URL
      if (cachedUri !== profile.avatar_url) {
        onCacheHit?.();
      } else {
        onCacheMiss?.();
      }

      setCachedImageUri(cachedUri);
    } catch (error) {
      console.error('Failed to load cached image:', error);
      setCachedImageUri(profile.avatar_url);
      setImageError(true);
      onCacheMiss?.();
    } finally {
      setImageLoading(false);
      setDownloadProgress(0);
    }
  }, [profile?.avatar_url, enableCaching, cacheMaxAge, onCacheHit, onCacheMiss]);

  // Load image when profile changes
  useEffect(() => {
    if (profile?.avatar_url) {
      loadCachedImage();
    } else {
      setCachedImageUri(null);
      setImageError(false);
    }
  }, [profile?.avatar_url, loadCachedImage]);

  // Image event handlers
  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
    setImageError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
    setCachedImageUri(null);
  }, []);

  const handleImageLoadStart = useCallback(() => {
    if (!enableCaching) {
      setImageLoading(true);
    }
  }, [enableCaching]);

  const renderContent = () => {
    if (hasAvatar && cachedImageUri) {
      return (
        <>
          <Image
            source={{ uri: cachedImageUri }}
            style={[styles.image, containerSize]}
            onLoad={handleImageLoad}
            onError={handleImageError}
            onLoadStart={handleImageLoadStart}
            resizeMode="cover"
          />
          {(imageLoading || downloadProgress > 0) && showProgress && (
            <View style={[styles.loadingOverlay, containerSize]}>
              <ActivityIndicator 
                size="small" 
                color={colors.textPrimary} 
              />
              {downloadProgress > 0 && downloadProgress < 1 && (
                <Text style={[styles.progressText, { color: colors.textPrimary }]}>
                  {Math.round(downloadProgress * 100)}%
                </Text>
              )}
            </View>
          )}
        </>
      );
    }

    // Fallback to initials with gradient
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={[styles.gradient, containerSize]}
      >
        <Text style={[styles.initialsText, textSize]}>
          {initials}
        </Text>
      </LinearGradient>
    );
  };

  const containerStyle = [
    styles.container,
    containerSize,
    borderStyle,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Profile picture for ${displayName}`}
        accessibilityHint="Tap to view profile options"
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return (
    <View 
      style={containerStyle}
      accessibilityRole="image"
      accessibilityLabel={`Profile picture for ${displayName}`}
    >
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    position: 'absolute',
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
});
