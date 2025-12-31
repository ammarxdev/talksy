/**
 * Progressive Profile Picture Component
 * Loads profile pictures progressively with different quality levels
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { ProfilePictureProps } from '@/types/profile';
import { getProfileInitials, getDisplayName } from '@/utils/profileUtils';
import { getCachedImage } from '@/utils/imageCache';

interface ProgressiveProfilePictureProps extends ProfilePictureProps {
  enableProgressive?: boolean;
  lowQualityFirst?: boolean;
  animationDuration?: number;
}

interface ImageState {
  uri: string | null;
  quality: 'low' | 'high';
  loaded: boolean;
  error: boolean;
}

export const ProgressiveProfilePicture: React.FC<ProgressiveProfilePictureProps> = ({
  profile,
  size = 80,
  showBorder = false,
  onPress,
  fallbackText,
  style,
  enableProgressive = true,
  lowQualityFirst = true,
  animationDuration = 300,
}) => {
  const { colors } = useTheme();
  const [lowQualityImage, setLowQualityImage] = useState<ImageState>({
    uri: null,
    quality: 'low',
    loaded: false,
    error: false,
  });
  const [highQualityImage, setHighQualityImage] = useState<ImageState>({
    uri: null,
    quality: 'high',
    loaded: false,
    error: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Animation values
  const lowQualityOpacity = new Animated.Value(0);
  const highQualityOpacity = new Animated.Value(0);

  // Get display values
  const initials = getProfileInitials(profile, fallbackText);
  const displayName = getDisplayName(profile);
  const hasAvatar = !!profile?.avatar_url;

  // Dynamic styles based on size
  const containerSize = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const textSize = {
    fontSize: size * 0.4,
  };

  const borderStyle = showBorder ? {
    borderWidth: 3,
    borderColor: colors.border,
  } : {};

  // Generate different quality URLs
  const generateQualityUrls = useCallback((originalUrl: string) => {
    // For Supabase storage, we can add transform parameters
    const url = new URL(originalUrl);
    
    const lowQualityUrl = `${originalUrl}?width=${Math.round(size * 0.5)}&quality=60`;
    const highQualityUrl = `${originalUrl}?width=${size * 2}&quality=90`;

    return {
      lowQuality: lowQualityUrl,
      highQuality: highQualityUrl,
    };
  }, [size]);

  // Load progressive images
  const loadProgressiveImages = useCallback(async () => {
    if (!profile?.avatar_url || !enableProgressive) {
      // Load single image
      if (profile?.avatar_url) {
        setHighQualityImage({
          uri: profile.avatar_url,
          quality: 'high',
          loaded: false,
          error: false,
        });
      }
      return;
    }

    try {
      setIsLoading(true);
      const urls = generateQualityUrls(profile.avatar_url);

      // Load low quality first if enabled
      if (lowQualityFirst) {
        try {
          const lowQualityUri = await getCachedImage(urls.lowQuality, { maxAge: 24 * 60 * 60 * 1000 });
          setLowQualityImage({
            uri: lowQualityUri,
            quality: 'low',
            loaded: false,
            error: false,
          });
        } catch (error) {
          console.warn('Failed to load low quality image:', error);
        }
      }

      // Load high quality image
      try {
        const highQualityUri = await getCachedImage(urls.highQuality, { maxAge: 7 * 24 * 60 * 60 * 1000 });
        setHighQualityImage({
          uri: highQualityUri,
          quality: 'high',
          loaded: false,
          error: false,
        });
      } catch (error) {
        console.error('Failed to load high quality image:', error);
        setHighQualityImage(prev => ({ ...prev, error: true }));
      }
    } catch (error) {
      console.error('Failed to load progressive images:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.avatar_url, enableProgressive, generateQualityUrls, lowQualityFirst]);

  // Load images when profile changes
  useEffect(() => {
    if (profile?.avatar_url) {
      loadProgressiveImages();
    } else {
      setLowQualityImage({ uri: null, quality: 'low', loaded: false, error: false });
      setHighQualityImage({ uri: null, quality: 'high', loaded: false, error: false });
    }
  }, [profile?.avatar_url, loadProgressiveImages]);

  // Handle low quality image load
  const handleLowQualityLoad = useCallback(() => {
    setLowQualityImage(prev => ({ ...prev, loaded: true }));
    
    Animated.timing(lowQualityOpacity, {
      toValue: 1,
      duration: animationDuration,
      useNativeDriver: true,
    }).start();
  }, [lowQualityOpacity, animationDuration]);

  // Handle high quality image load
  const handleHighQualityLoad = useCallback(() => {
    setHighQualityImage(prev => ({ ...prev, loaded: true }));
    
    // Fade in high quality and fade out low quality
    Animated.parallel([
      Animated.timing(highQualityOpacity, {
        toValue: 1,
        duration: animationDuration,
        useNativeDriver: true,
      }),
      Animated.timing(lowQualityOpacity, {
        toValue: 0,
        duration: animationDuration,
        useNativeDriver: true,
      }),
    ]).start();
  }, [highQualityOpacity, lowQualityOpacity, animationDuration]);

  // Handle image errors
  const handleLowQualityError = useCallback(() => {
    setLowQualityImage(prev => ({ ...prev, error: true }));
  }, []);

  const handleHighQualityError = useCallback(() => {
    setHighQualityImage(prev => ({ ...prev, error: true }));
  }, []);

  const renderContent = () => {
    if (!hasAvatar || (highQualityImage.error && lowQualityImage.error)) {
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
    }

    return (
      <View style={[styles.imageContainer, containerSize]}>
        {/* Low quality image */}
        {lowQualityImage.uri && (
          <Animated.View 
            style={[
              styles.imageWrapper,
              containerSize,
              { opacity: lowQualityOpacity }
            ]}
          >
            <Image
              source={{ uri: lowQualityImage.uri }}
              style={[styles.image, containerSize]}
              onLoad={handleLowQualityLoad}
              onError={handleLowQualityError}
              resizeMode="cover"
            />
          </Animated.View>
        )}

        {/* High quality image */}
        {highQualityImage.uri && (
          <Animated.View 
            style={[
              styles.imageWrapper,
              containerSize,
              { opacity: highQualityOpacity }
            ]}
          >
            <Image
              source={{ uri: highQualityImage.uri }}
              style={[styles.image, containerSize]}
              onLoad={handleHighQualityLoad}
              onError={handleHighQualityError}
              resizeMode="cover"
            />
          </Animated.View>
        )}

        {/* Loading indicator */}
        {isLoading && !lowQualityImage.loaded && !highQualityImage.loaded && (
          <View style={[styles.loadingOverlay, containerSize]}>
            <ActivityIndicator 
              size="small" 
              color={colors.textPrimary} 
            />
          </View>
        )}

        {/* Quality indicator (for debugging) */}
        {__DEV__ && (highQualityImage.loaded || lowQualityImage.loaded) && (
          <View style={styles.qualityIndicator}>
            <Text style={styles.qualityText}>
              {highQualityImage.loaded ? 'HQ' : 'LQ'}
            </Text>
          </View>
        )}
      </View>
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
  imageContainer: {
    position: 'relative',
  },
  imageWrapper: {
    position: 'absolute',
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
  qualityIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qualityText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
});
