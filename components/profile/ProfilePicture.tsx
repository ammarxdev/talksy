/**
 * ProfilePicture Component
 * Displays user profile picture with fallback to initials
 */

import React, { useState } from 'react';
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

export const ProfilePicture: React.FC<ProfilePictureProps> = ({
  profile,
  size = 80,
  showBorder = false,
  onPress,
  fallbackText,
  style,
}) => {
  const { colors } = useTheme();
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

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

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const handleImageLoadStart = () => {
    setImageLoading(true);
    setImageError(false);
  };

  const renderContent = () => {
    if (hasAvatar && profile?.avatar_url) {
      return (
        <>
          <Image
            source={{ uri: profile.avatar_url }}
            style={[styles.image, containerSize]}
            onLoad={handleImageLoad}
            onError={handleImageError}
            onLoadStart={handleImageLoadStart}
            resizeMode="cover"
          />
          {imageLoading && (
            <View style={[styles.loadingOverlay, containerSize]}>
              <ActivityIndicator 
                size="small" 
                color={colors.textPrimary} 
              />
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

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[
        styles.container,
        containerSize,
        borderStyle,
        style,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      accessible={true}
      accessibilityLabel={`Profile picture for ${displayName}`}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityHint={onPress ? 'Tap to change profile picture' : undefined}
    >
      {renderContent()}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
});
