import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';

interface WaveformAnimationProps {
  isActive: boolean;
  color?: string;
  barCount?: number;
  size?: 'small' | 'medium' | 'large';
}

export default function WaveformAnimation({ 
  isActive, 
  color, 
  barCount = 5, 
  size = 'medium' 
}: WaveformAnimationProps) {
  const colorScheme = useColorScheme();
  const barAnims = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.3))
  ).current;

  const getSizeConfig = () => {
    const configs = {
      small: { barWidth: 3, maxHeight: 20, spacing: 2 },
      medium: { barWidth: 4, maxHeight: 30, spacing: 3 },
      large: { barWidth: 6, maxHeight: 40, spacing: 4 },
    };
    return configs[size];
  };

  const sizeConfig = getSizeConfig();

  useEffect(() => {
    if (isActive) {
      const createBarAnimation = (animValue: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animValue, {
              toValue: 1,
              duration: 300 + Math.random() * 200, // Randomize duration for natural effect
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
            Animated.timing(animValue, {
              toValue: 0.3,
              duration: 300 + Math.random() * 200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
          ])
        );
      };

      const animations = barAnims.map((anim, index) => 
        createBarAnimation(anim, index * 100)
      );

      animations.forEach(animation => animation.start());

      return () => {
        animations.forEach(animation => animation.stop());
      };
    } else {
      // Reset to idle state
      barAnims.forEach(anim => {
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
    }
  }, [isActive, barAnims]);

  const getBarColor = () => {
    if (color) return color;
    return colorScheme === 'dark' ? '#FF6B6B' : '#FF4444';
  };

  return (
    <View style={[styles.container, { height: sizeConfig.maxHeight }]}>
      {barAnims.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              width: sizeConfig.barWidth,
              backgroundColor: getBarColor(),
              marginHorizontal: sizeConfig.spacing / 2,
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [sizeConfig.maxHeight * 0.3, sizeConfig.maxHeight],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    borderRadius: 2,
  },
});
