import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';

export type ProgressType = 'processing' | 'thinking' | 'speaking';

interface ProgressIndicatorProps {
  type: ProgressType;
  visible: boolean;
  progress?: number; // 0-1 for determinate progress
}

export default function ProgressIndicator({ type, visible, progress }: ProgressIndicatorProps) {
  const colorScheme = useColorScheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const dotAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // Fade in/out animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  // Progress bar animation
  useEffect(() => {
    if (progress !== undefined) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }
  }, [progress, progressAnim]);

  // Dot animation for indeterminate progress
  useEffect(() => {
    if (visible && progress === undefined) {
      const createDotAnimation = (animValue: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animValue, {
              toValue: 1,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 0,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
      };

      const animations = dotAnims.map((anim, index) => 
        createDotAnimation(anim, index * 200)
      );

      animations.forEach(animation => animation.start());

      return () => {
        animations.forEach(animation => animation.stop());
        dotAnims.forEach(anim => anim.setValue(0));
      };
    }
  }, [visible, progress, dotAnims]);

  const getColor = () => {
    const colors = {
      processing: '#FFD93D',
      thinking: '#6BCF7F',
      speaking: '#9B59B6',
    };
    return colors[type];
  };

  const getText = () => {
    const texts = {
      processing: 'Processing',
      thinking: 'Thinking',
      speaking: 'Speaking',
    };
    return texts[type];
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {progress !== undefined ? (
        // Determinate progress bar
        <View style={styles.progressContainer}>
          <ThemedText style={styles.text}>{getText()}...</ThemedText>
          <View style={[styles.progressBar, { backgroundColor: colorScheme === 'dark' ? '#333' : '#E0E0E0' }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: getColor(),
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
      ) : (
        // Indeterminate dots animation
        <View style={styles.dotsContainer}>
          <ThemedText style={styles.text}>{getText()}</ThemedText>
          <View style={styles.dots}>
            {dotAnims.map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: getColor(),
                    opacity: anim,
                    transform: [
                      {
                        scale: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  progressContainer: {
    alignItems: 'center',
    width: '100%',
  },
  dotsContainer: {
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    marginBottom: 10,
    opacity: 0.8,
  },
  progressBar: {
    width: 200,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  dots: {
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
