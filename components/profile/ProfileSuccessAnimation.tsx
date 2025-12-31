/**
 * Profile Success Animation Component
 * Animated success feedback for profile picture operations
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface ProfileSuccessAnimationProps {
  message?: string;
  size?: number;
  onAnimationComplete?: () => void;
  autoHide?: boolean;
  hideDelay?: number;
}

export const ProfileSuccessAnimation: React.FC<ProfileSuccessAnimationProps> = ({
  message = 'Success!',
  size = 100,
  onAnimationComplete,
  autoHide = true,
  hideDelay = 2000,
}) => {
  const { colors } = useTheme();
  
  // Animation values
  const scaleValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const slideValue = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Sequence of animations
    const animationSequence = Animated.sequence([
      // 1. Fade in and scale up the container
      Animated.parallel([
        Animated.timing(fadeValue, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(scaleValue, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideValue, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]),
      
      // 2. Animate checkmark with bounce
      Animated.spring(checkmarkScale, {
        toValue: 1,
        tension: 150,
        friction: 6,
        useNativeDriver: true,
      }),
      
      // 3. Pulse effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.05,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      ),
    ]);

    animationSequence.start(() => {
      // Auto hide after delay
      if (autoHide) {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(fadeValue, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(scaleValue, {
              toValue: 0.8,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onAnimationComplete?.();
          });
        }, hideDelay);
      } else {
        onAnimationComplete?.();
      }
    });
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeValue,
          transform: [
            { scale: scaleValue },
            { translateY: slideValue },
          ],
        },
      ]}
    >
      {/* Success circle with gradient */}
      <Animated.View
        style={[
          styles.successCircle,
          {
            width: size,
            height: size,
            transform: [{ scale: pulseValue }],
          },
        ]}
      >
        <LinearGradient
          colors={['#4facfe', '#00f2fe']}
          style={[
            styles.gradient,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Checkmark icon */}
          <Animated.View
            style={[
              styles.checkmarkContainer,
              {
                transform: [{ scale: checkmarkScale }],
              },
            ]}
          >
            <IconSymbol
              name="checkmark"
              size={size * 0.4}
              color="white"
            />
          </Animated.View>
        </LinearGradient>

        {/* Ripple effect */}
        <Animated.View
          style={[
            styles.ripple,
            {
              width: size * 1.5,
              height: size * 1.5,
              borderRadius: (size * 1.5) / 2,
              opacity: pulseValue.interpolate({
                inputRange: [1, 1.05],
                outputRange: [0.3, 0],
              }),
              transform: [
                {
                  scale: pulseValue.interpolate({
                    inputRange: [1, 1.05],
                    outputRange: [1, 1.2],
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>

      {/* Success message */}
      <Animated.Text
        style={[
          styles.successMessage,
          {
            color: colors.textPrimary,
            opacity: fadeValue,
            transform: [
              {
                translateY: slideValue.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 20],
                }),
              },
            ],
          },
        ]}
      >
        {message}
      </Animated.Text>

      {/* Decorative particles */}
      {[...Array(6)].map((_, index) => {
        const particleDelay = index * 100;
        const particleAngle = (index * 60) * (Math.PI / 180);
        const particleDistance = size * 0.8;
        
        const particleX = Math.cos(particleAngle) * particleDistance;
        const particleY = Math.sin(particleAngle) * particleDistance;

        return (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                backgroundColor: colors.accent,
                transform: [
                  {
                    translateX: scaleValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, particleX],
                    }),
                  },
                  {
                    translateY: scaleValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, particleY],
                    }),
                  },
                  {
                    scale: scaleValue.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 1, 0.5],
                    }),
                  },
                ],
                opacity: scaleValue.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 1, 0.3],
                }),
              },
            ]}
          />
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  successCircle: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  checkmarkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#4facfe',
  },
  successMessage: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
