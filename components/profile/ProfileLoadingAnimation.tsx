/**
 * Profile Loading Animation Component
 * Enhanced loading states with smooth animations for profile picture operations
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { IconSymbol } from '@/components/ui/IconSymbol';

const { width: screenWidth } = Dimensions.get('window');

interface ProfileLoadingAnimationProps {
  type: 'uploading' | 'processing' | 'saving' | 'loading';
  progress?: number; // 0-100
  message?: string;
  size?: number;
  showProgress?: boolean;
}

export const ProfileLoadingAnimation: React.FC<ProfileLoadingAnimationProps> = ({
  type = 'loading',
  progress = 0,
  message,
  size = 120,
  showProgress = true,
}) => {
  const { colors } = useTheme();
  
  // Animation values
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const progressValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  // Start animations on mount
  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Continuous spin animation
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    spinAnimation.start();
    pulseAnimation.start();

    return () => {
      spinAnimation.stop();
      pulseAnimation.stop();
    };
  }, []);

  // Update progress animation
  useEffect(() => {
    Animated.timing(progressValue, {
      toValue: progress / 100,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Animation interpolations
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressWidth = progressValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, size - 20],
  });

  // Get icon and colors based on type
  const getTypeConfig = () => {
    switch (type) {
      case 'uploading':
        return {
          icon: 'arrow.up.circle.fill',
          color: colors.accent,
          gradientColors: ['#667eea', '#764ba2'] as const,
          message: message || 'Uploading image...',
        };
      case 'processing':
        return {
          icon: 'gear',
          color: colors.warning,
          gradientColors: ['#f093fb', '#f5576c'] as const,
          message: message || 'Processing image...',
        };
      case 'saving':
        return {
          icon: 'checkmark.circle.fill',
          color: colors.success,
          gradientColors: ['#4facfe', '#00f2fe'] as const,
          message: message || 'Saving changes...',
        };
      default:
        return {
          icon: 'arrow.clockwise',
          color: colors.textSecondary,
          gradientColors: ['#667eea', '#764ba2'] as const,
          message: message || 'Loading...',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <Animated.View 
      style={[
        styles.container, 
        { opacity: fadeValue }
      ]}
    >
      {/* Main loading circle */}
      <View style={[styles.loadingCircle, { width: size, height: size }]}>
        <LinearGradient
          colors={config.gradientColors}
          style={[styles.gradient, { width: size, height: size, borderRadius: size / 2 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [
                  { rotate: type === 'loading' ? spin : '0deg' },
                  { scale: pulseValue },
                ],
              },
            ]}
          >
            <IconSymbol
              name={config.icon as any}
              size={size * 0.3}
              color="white"
            />
          </Animated.View>
        </LinearGradient>

        {/* Progress ring overlay */}
        {showProgress && progress > 0 && (
          <View style={[styles.progressRing, { width: size + 10, height: size + 10 }]}>
            <View style={[styles.progressTrack, { borderColor: colors.border }]} />
            <Animated.View
              style={[
                styles.progressFill,
                {
                  borderColor: config.color,
                  transform: [
                    { rotate: `${(progress / 100) * 360 - 90}deg` },
                  ],
                },
              ]}
            />
          </View>
        )}
      </View>

      {/* Progress bar */}
      {showProgress && progress > 0 && (
        <View style={[styles.progressBarContainer, { width: size }]}>
          <View style={[styles.progressBarTrack, { backgroundColor: colors.border }]}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressWidth,
                  backgroundColor: config.color,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {Math.round(progress)}%
          </Text>
        </View>
      )}

      {/* Loading message */}
      <Text style={[styles.loadingMessage, { color: colors.textPrimary }]}>
        {config.message}
      </Text>

      {/* Animated dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2].map((index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: config.color,
                transform: [
                  {
                    scale: pulseValue.interpolate({
                      inputRange: [1, 1.1],
                      outputRange: [0.8, 1.2],
                    }),
                  },
                ],
                opacity: pulseValue.interpolate({
                  inputRange: [1, 1.1],
                  outputRange: [0.5, 1],
                }),
              },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingCircle: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 1000,
    borderWidth: 3,
    opacity: 0.3,
  },
  progressFill: {
    position: 'absolute',
    width: '50%',
    height: '50%',
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderRadius: 1000,
    borderTopRightRadius: 1000,
  },
  progressBarContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingMessage: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 15,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});
