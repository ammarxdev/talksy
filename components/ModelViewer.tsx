import { Asset } from 'expo-asset';
import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Image, TouchableOpacity, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { useModel } from '@/contexts/ModelContext';



// Beautiful Loading Indicator Component
function LoadingIndicator({
  backgroundColor,
  borderColor,
  gradientColors,
  gradientLocations
}: {
  backgroundColor?: string;
  borderColor?: string;
  gradientColors?: [string, string, ...string[]];
  gradientLocations?: [number, number, ...number[]];
}) {
  const { colors } = useTheme();
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.timing(fadeValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Spinning animation
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    // Pulsing animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
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

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const useGradient = gradientColors && gradientColors.length > 0;

  const renderLoadingContainer = (children: React.ReactNode) => {
    if (useGradient) {
      return (
        <Animated.View style={[
          styles.loadingContainer,
          {
            borderColor: borderColor || colors.borderLight,
            opacity: fadeValue,
            backgroundColor: 'transparent',
          }
        ]}>
          <LinearGradient
            colors={gradientColors}
            locations={gradientLocations || [0, 0.3, 0.7, 1] as [number, number, ...number[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 40,
            }}
          />
          {/* Subtle overlay for depth */}
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'transparent', 'rgba(0,0,0,0.05)']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 40,
            }}
          />
          {children}
        </Animated.View>
      );
    } else {
      return (
        <Animated.View style={[
          styles.loadingContainer,
          {
            backgroundColor: backgroundColor || colors.cardBackground,
            borderColor: borderColor || colors.borderLight,
            opacity: fadeValue,
          }
        ]}>
          {children}
        </Animated.View>
      );
    }
  };

  return renderLoadingContainer(
    <>
      {/* Outer spinning ring */}
      <Animated.View style={[
        styles.loadingRing,
        {
          borderColor: colors.primary,
          transform: [{ rotate: spin }, { scale: pulseValue }],
        }
      ]} />

      {/* Inner spinning ring */}
      <Animated.View style={[
        styles.loadingRingInner,
        {
          borderColor: colors.accent,
          transform: [{ rotate: spinValue.interpolate({
            inputRange: [0, 1],
            outputRange: ['360deg', '0deg'],
          }) }],
        }
      ]} />

      {/* Center dot */}
      <Animated.View style={[
        styles.loadingDot,
        {
          backgroundColor: colors.primary,
          transform: [{ scale: pulseValue }],
        }
      ]} />

      {/* Loading text */}
      <Animated.View style={[
        styles.loadingTextContainer,
        { opacity: fadeValue }
      ]}>
        <ThemedText type="subtitle" style={[
          styles.loadingText,
          { color: colors.textPrimary }
        ]}>
          Loading Your Assistant...
        </ThemedText>
        <ThemedText type="default" style={[
          styles.loadingSubtext,
          { color: colors.textSecondary }
        ]}>
          Preparing your selected model
        </ThemedText>
      </Animated.View>
    </>
  );
}

// Suppress console errors globally for texture loading issues
const originalError = console.error;
const originalLog = console.log;

console.error = (...args: any[]) => {
  const message = args[0];
  if (typeof message === 'string' &&
      (message.includes('GLTFLoader: Couldn\'t load texture') ||
       message.includes('Creating blobs from \'ArrayBuffer\'') ||
       message.includes('ArrayBufferView'))) {
    // Suppress these specific texture errors
    return;
  }
  originalError.apply(console, args);
};

console.log = (...args: any[]) => {
  const message = args[0];
  if (typeof message === 'string' &&
      message.includes('EXGL: gl.pixelStorei()')) {
    // Suppress repetitive EXGL warnings
    return;
  }
  originalLog.apply(console, args);
};

// Simple Avatar Image Component
function AvatarImage({ uri, width, height }: { uri: string; width: number; height: number }) {
  return (
    <Image
      source={{ uri }}
      style={{
        width: width * 1.5, // Make image 50% larger than container
        height: height * 1.5, // Make image 50% larger than container
        resizeMode: 'contain',
      }}
      onLoad={() => console.log('Avatar image loaded successfully')}
      onError={(error) => console.error('Avatar image load error:', error)}
    />
  );
}

interface ModelViewerProps {
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  size?: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  borderColor?: string;
  shadowColor?: string;
  // New gradient props
  gradientColors?: [string, string, ...string[]];
  gradientLocations?: [number, number, ...number[]];
}

export default function ModelViewer({
  onPress,
  onPressIn,
  onPressOut,
  size = 200,
  width,
  height,
  backgroundColor,
  borderColor,
  shadowColor,
  gradientColors,
  gradientLocations
}: ModelViewerProps) {
  const { selectedModelInfo, isLoading: modelContextLoading } = useModel();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      // Wait for model context to load first
      if (modelContextLoading || !selectedModelInfo) {
        setIsLoading(true);
        return;
      }

      try {
        setIsLoading(true);
        setLoadError(false);
        // Clear previous image to ensure smooth transition
        setImageUri(null);

        console.log(`Loading selected model: ${selectedModelInfo.name} (${selectedModelInfo.id})`);

        // Try to load the PNG asset from the selected model
        const asset = Asset.fromModule(selectedModelInfo.imagePath);
        await asset.downloadAsync();

        console.log('Selected avatar image loaded:', asset.uri);
        setImageUri(asset.uri);
      } catch (error) {
        console.error('Error loading selected avatar image:', error);
        setLoadError(true);

        // Fallback: try to use the image path directly
        try {
          console.log('Trying fallback image path:', selectedModelInfo.imagePath);
          setImageUri(selectedModelInfo.imagePath);
          setLoadError(false);
        } catch (fallbackError) {
          console.error('Fallback image loading failed:', fallbackError);
          setLoadError(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [selectedModelInfo, modelContextLoading]);



  const containerWidth = width || size;
  const containerHeight = height || size;

  // Determine if we should use gradient or solid background
  const useGradient = gradientColors && gradientColors.length > 0;
  const hasBackground = useGradient || backgroundColor;

  const containerStyle = {
    width: containerWidth,
    height: containerHeight,
    borderRadius: 40,
    borderColor: borderColor,
    borderWidth: hasBackground ? 2 : 0,
    borderTopWidth: hasBackground ? 3 : 0,
    borderLeftWidth: hasBackground ? 3 : 0,
    shadowColor: shadowColor,
    shadowOffset: {
      width: 0,
      height: 16,
    },
    shadowOpacity: hasBackground ? 0.15 : 0,
    shadowRadius: 32,
    elevation: hasBackground ? 20 : 0,
  };

  const renderContainer = (children: React.ReactNode) => {
    if (useGradient) {
      return (
        <LinearGradient
          colors={gradientColors}
          locations={gradientLocations || [0, 0.3, 0.7, 1] as [number, number, ...number[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={containerStyle}
        >
          {/* Add a subtle overlay for depth */}
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'transparent', 'rgba(0,0,0,0.05)']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 40,
            }}
          />
          {children}
        </LinearGradient>
      );
    } else {
      return (
        <View style={[containerStyle, { backgroundColor: backgroundColor }]}>
          {children}
        </View>
      );
    }
  };

  return renderContainer(
    <>
      {imageUri && !isLoading && !modelContextLoading && !loadError ? (
        <TouchableOpacity
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={0.8}
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 40,
          }}
        >
          <AvatarImage
            uri={imageUri}
            width={containerWidth}
            height={containerHeight}
          />
        </TouchableOpacity>
      ) : (
        <LoadingIndicator
          backgroundColor={useGradient ? 'transparent' : backgroundColor}
          borderColor={borderColor}
          gradientColors={useGradient ? gradientColors : undefined}
          gradientLocations={useGradient ? gradientLocations : undefined}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 40,
    borderWidth: 2,
    position: 'relative',
    shadowOffset: {
      width: 0,
      height: 16,
    },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 20,
  },
  loadingRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    position: 'absolute',
  },
  loadingRingInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    position: 'absolute',
  },
  loadingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute',
  },
  loadingTextContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 20,
  },
});