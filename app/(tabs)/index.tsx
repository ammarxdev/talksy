import ModelViewer from '@/components/ModelViewer';
import { ThemedText } from '@/components/ThemedText';
import WaveformAnimation from '@/components/WaveformAnimation';
import { VoiceAssistantBanner } from '@/components/ads';

import { useTheme } from '@/contexts/ThemeContext';
import { useModelTheme } from '@/hooks/useModelTheme';
import { useAdMob } from '@/hooks/useAdMob';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';
import { voiceSessionTracker } from '@/utils/voiceSessionTracker';
import { queryAdCounter } from '@/utils/queryAdCounter';

import { useVoiceAssistantFlowNative } from '@/hooks/useVoiceAssistantFlowNative';
import { useResponsive, useResponsiveSpacing, useResponsiveTypography, useResponsiveLayout } from '@/hooks/useResponsive';
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VoiceAssistantScreen() {
  const [bannerHeight, setBannerHeight] = useState(0);
  const { colorScheme, colors } = useTheme();
  const { modelColors, selectedModel, modelName } = useModelTheme();
  const { recordInteraction } = useAdMob();
  const { showAd: showInterstitialAd } = useInterstitialAd();
  const isDark = colorScheme === 'dark';
  
  // Responsive hooks
  const responsive = useResponsive();
  const spacing = useResponsiveSpacing();
  const typography = useResponsiveTypography();
  const layout = useResponsiveLayout();
  
  // Create responsive styles
  const styles = createStyles(responsive, spacing, typography, layout);

  // Debug logging removed

  const {
    assistantState,
    startConversation,
    stopConversation,
    getStatusText,
    isVADActive,
    currentVolume,
  } = useVoiceAssistantFlowNative();



  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;
  // Tap debounce to avoid rapid re-triggers
  const tapLockRef = useRef(false);
  const lastTapTimeRef = useRef(0);

  // Premium entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating animation for avatar container
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 8,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle pulsing animation
    const pulsingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    // Shimmer effect for premium feel
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );

    // Breathing animation for idle state
    const breathingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.01,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    );

    floatingAnimation.start();
    pulsingAnimation.start();
    shimmerAnimation.start();
    breathingAnimation.start();

    return () => {
      floatingAnimation.stop();
      pulsingAnimation.stop();
      shimmerAnimation.stop();
      breathingAnimation.stop();
    };
  }, []);

  // Track voice sessions and trigger interstitials after random 1–5 queries
  useEffect(() => {
    switch (assistantState) {
      case 'listening':
        // Start voice session when listening begins
        voiceSessionTracker.startSession();
        break;
      case 'processing':
        // Record interaction during processing
        voiceSessionTracker.recordInteraction();
        break;
      case 'idle':
        // End voice session when returning to idle
        voiceSessionTracker.endSession();
        // Defer triggering to the next tick to ensure TTS fully completed
        setTimeout(async () => {
          const result = queryAdCounter.recordQuery();
          if (result.shouldShow) {
            const showResult = await showInterstitialAd();
            if (!showResult.success) {
              console.log(`⚠️ Interstitial ad not shown: ${showResult.reason}`);
            }
          } else {
            console.log(`⏭️ Skipping interstitial ad: ${result.count}/${result.threshold}`);
          }
        }, 100);
        break;
    }
  }, [assistantState]);

  const handleAvatarPress = useCallback(async () => {
    // Debounce ultra-rapid taps (UI-level guard)
    const now = Date.now();
    if (tapLockRef.current && now - lastTapTimeRef.current < 300) {
      return;
    }
    tapLockRef.current = true;
    lastTapTimeRef.current = now;
    setTimeout(() => {
      tapLockRef.current = false;
    }, 300);
    // Record user interaction for ad frequency management
    recordInteraction();

    if (assistantState === 'idle') {
      // Start conversation - VAD will automatically stop when user stops speaking
      await startConversation();
    } else if (assistantState === 'listening') {
      // With VAD active, don't allow manual stop - let VAD handle it automatically
      // Only allow manual stop if VAD is not working (fallback mode)
      if (!isVADActive) {
        await stopConversation();
      }
      // If VAD is active, ignore the tap - let VAD automatically detect speech end
    } else if (assistantState === 'speaking') {
      // Stop AI speaking
      await stopConversation();
      // No interstitial trigger here; we trigger on completed query when state returns to idle
    }
    // Note: With VAD, users typically only need to tap once to start speaking
  }, [assistantState, isVADActive, startConversation, stopConversation, recordInteraction]);




  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Dynamic Gradient Background based on Model */}
        <LinearGradient
          colors={[modelColors.gradientStart, modelColors.gradientMiddle, modelColors.gradientEnd, modelColors.surface]}
          locations={[0, 0.5, 0.9, 1]}
          style={styles.gradientBackground}
        />
        
        {/* Layered Background for 3D Depth */}
        <View style={[styles.backgroundLayer1, { backgroundColor: modelColors.surface, opacity: 0.1 }]} />
        <View style={[styles.backgroundLayer2, { backgroundColor: modelColors.surfaceVariant, opacity: 0.05 }]} />

        {/* Floating Background Elements with Model Colors */}
        <Animated.View
          style={[
            styles.floatingElement1,
            {
              backgroundColor: modelColors.primary,
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: isDark ? [0.12, 0.18] : [0.08, 0.15]
              }),
              transform: [
                {
                  translateY: floatAnim.interpolate({
                    inputRange: [-8, 8],
                    outputRange: [responsive.scaleSize(-12), responsive.scaleSize(12)]
                  })
                },
                {
                  rotate: floatAnim.interpolate({
                    inputRange: [-8, 8],
                    outputRange: ['-2deg', '2deg']
                  })
                }
              ]
            }
          ]}
        />
        <Animated.View
          style={[
            styles.floatingElement2,
            {
              backgroundColor: modelColors.accent,
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: isDark ? [0.08, 0.14] : [0.05, 0.12]
              }),
              transform: [
                {
                  translateY: floatAnim.interpolate({
                    inputRange: [-8, 8],
                    outputRange: [8, -8]
                  })
                },
                {
                  rotate: floatAnim.interpolate({
                    inputRange: [-8, 8],
                    outputRange: ['1deg', '-1deg']
                  })
                }
              ]
            }
          ]}
        />

        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Animated.ScrollView
            contentContainerStyle={[
              styles.contentContainer,
              { 
                paddingTop: spacing.md + bannerHeight,
                paddingHorizontal: layout.containerPadding,
                paddingBottom: spacing.lg,
              },
            ]}
            style={{ flex: 1, opacity: fadeAnim as any, transform: [{ translateY: slideAnim as any }, { scale: scaleAnim as any }] as any }}
            showsVerticalScrollIndicator={false}
          >
            {/* Floating Header Card with Model Colors */}
            <Animated.View
              style={[
                styles.headerCard,
                {
                  backgroundColor: modelColors.cardBackground,
                  borderColor: modelColors.primary,
                  borderWidth: responsive.scaleSize(1.5),
                  shadowColor: modelColors.glow,
                  opacity: glowAnim,
                  paddingVertical: layout.headerCardPadding.vertical,
                  paddingHorizontal: layout.headerCardPadding.horizontal,
                  borderRadius: layout.borderRadius.lg,
                  shadowRadius: layout.shadowRadius,
                  elevation: layout.elevation,
                }
              ]}
            >
              <View style={styles.headerContent}>
                <ThemedText type="title" style={[styles.title, { 
                  color: isDark ? colors.textPrimary : modelColors.primaryDark,
                  fontSize: typography.adaptiveTitle,
                  lineHeight: typography.getLineHeight(typography.adaptiveTitle),
                }]}>
                  Voice Assistant
                </ThemedText>
                <ThemedText type="subtitle" style={[styles.subtitle, { 
                  color: isDark ? colors.textSecondary : modelColors.primary,
                  fontSize: typography.adaptiveSubtitle,
                  lineHeight: typography.getLineHeight(typography.adaptiveSubtitle),
                  marginTop: spacing.xs,
                }]}>
                  {responsive.isSmallScreen ? 'Tap to speak' : 'Tap the avatar to start speaking'}
                </ThemedText>
              </View>
            </Animated.View>

            {/* Premium Floating Avatar with Breathing */}
            <Animated.View
              style={[
                styles.avatarWrapper,
                {
                  transform: [
                    { translateY: floatAnim },
                    { scale: assistantState === 'idle' ? breatheAnim : pulseAnim }
                  ],
                },
              ]}
            >


              <ModelViewer
                onPress={handleAvatarPress}
                width={layout.modelViewerDimensions.width}
                height={layout.modelViewerDimensions.height}
                gradientColors={[
                  modelColors.gradientStart,
                  modelColors.gradientMiddle,
                  modelColors.gradientEnd,
                  modelColors.surface
                ] as [string, string, ...string[]]}
                gradientLocations={[0, 0.3, 0.7, 1] as [number, number, ...number[]]}
                borderColor={
                  assistantState === 'listening'
                    ? colors.success
                    : assistantState === 'speaking'
                    ? modelColors.accent
                    : modelColors.primary
                }
                shadowColor={
                  assistantState === 'listening'
                    ? colors.success
                    : assistantState === 'speaking'
                    ? modelColors.accent
                    : modelColors.glow
                }
              />

              {/* Enhanced Waveform Animation */}
              {assistantState === 'listening' && (
                <View style={styles.waveformContainer}>
                  <WaveformAnimation
                    isActive={true}
                    size="large"
                    color={colors.success}
                  />
                </View>
              )}

              {/* Voice Activity Indicator */}
              {assistantState === 'speaking' && (
                <Animated.View
                  style={[
                    styles.speakingIndicator,
                    {
                      backgroundColor: modelColors.accent,
                      shadowColor: modelColors.glow,
                      opacity: pulseAnim,
                      transform: [{ scale: pulseAnim }]
                    }
                  ]}
                />
              )}
            </Animated.View>


          </Animated.ScrollView>
        </SafeAreaView>

        {/* Voice Assistant Banner Ad - moved to top with dismiss option */}
        <VoiceAssistantBanner
          position="top"
          isVoiceActive={assistantState === 'listening' || assistantState === 'speaking'}
          onAdLoaded={() => console.log('✅ Voice Assistant banner ad loaded')}
          onAdError={(error) => console.warn('⚠️ Voice Assistant banner ad error:', error)}
          showDismiss
          onHeightChange={(height) => setBannerHeight(height)}
        />
      </View>
    </GestureHandlerRootView>
  );
}

// Create responsive styles outside the component
const createStyles = (responsive: any, spacing: any, typography: any, layout: any) => StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  // 3D Layered Background Elements
  backgroundLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.02,
  },
  backgroundLayer2: {
    position: 'absolute',
    top: '10%',
    left: '5%',
    right: '5%',
    bottom: '10%',
    borderRadius: layout.borderRadius.xl,
    opacity: 0.03,
  },
  // Floating 3D Elements for Depth
  floatingElement1: {
    position: 'absolute',
    top: '15%',
    right: '10%',
    width: responsive.scaleSize(120),
    height: responsive.scaleSize(120),
    borderRadius: responsive.scaleSize(60),
    shadowOffset: {
      width: 0,
      height: responsive.scaleSize(8),
    },
    shadowOpacity: 0.1,
    shadowRadius: responsive.scaleSize(16),
    elevation: responsive.scaleSize(8),
  },
  floatingElement2: {
    position: 'absolute',
    bottom: '25%',
    left: '8%',
    width: responsive.scaleSize(80),
    height: responsive.scaleSize(80),
    borderRadius: responsive.scaleSize(40),
    shadowOffset: {
      width: 0,
      height: responsive.scaleSize(6),
    },
    shadowOpacity: 0.08,
    shadowRadius: responsive.scaleSize(12),
    elevation: responsive.scaleSize(6),
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexGrow: 1,
    minHeight: responsive.screenHeight - responsive.scaleSize(120),
  },
  // Floating Header Card with glassmorphism
  headerCard: {
    alignItems: 'center',
    marginHorizontal: spacing.xs,
    marginTop: spacing.xs,
    shadowOffset: {
      width: 0,
      height: responsive.scaleSize(8),
    },
    shadowOpacity: 0.12,
    // Glassmorphism effect
    backdropFilter: 'blur(20px)',
    // backgroundColor, borderColor, shadowColor will be set dynamically via theme
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    // fontSize, lineHeight, color will be set dynamically via responsive and theme
  },
  subtitle: {
    textAlign: 'center',
    fontWeight: '400',
    // fontSize, lineHeight, color will be set dynamically via responsive and theme
  },
  avatarWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: responsive.scaleSize(-25),
    marginBottom: spacing.xxl,
    marginHorizontal: spacing.xs,
    flex: 1,
    minHeight: responsive.hp(responsive.orientation === 'landscape' ? 60 : 70),
  },

  speakingIndicator: {
    position: 'absolute',
    bottom: responsive.scaleSize(-40),
    alignSelf: 'center',
    width: responsive.scaleSize(12),
    height: responsive.scaleSize(12),
    borderRadius: responsive.scaleSize(6),
    shadowOffset: {
      width: 0,
      height: responsive.scaleSize(4),
    },
    shadowOpacity: 0.4,
    shadowRadius: responsive.scaleSize(8),
    elevation: responsive.scaleSize(6),
  },
  waveformContainer: {
    position: 'absolute',
    bottom: responsive.scaleSize(-60),
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: responsive.scaleSize(-6),
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: layout.borderRadius.lg,
    marginHorizontal: spacing.xs,
    // Premium floating effect
    shadowOffset: {
      width: 0,
      height: responsive.scaleSize(12),
    },
    shadowOpacity: 0.12,
    shadowRadius: responsive.scaleSize(24),
    elevation: layout.elevation,
    borderWidth: responsive.scaleSize(1.5),
    // Glassmorphism effect
    backdropFilter: 'blur(25px)',
    // Subtle inner glow
    borderTopWidth: responsive.scaleSize(2),
    // backgroundColor, borderColor, shadowColor will be set dynamically via theme
  },
  statusContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIndicator: {
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingDot: {
    width: responsive.scaleSize(12),
    height: responsive.scaleSize(12),
    borderRadius: responsive.scaleSize(6),
    shadowOffset: {
      width: 0,
      height: responsive.scaleSize(2),
    },
    shadowOpacity: 0.3,
    shadowRadius: responsive.scaleSize(4),
    elevation: responsive.scaleSize(4),
  },
  thinkingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinkingDot: {
    width: responsive.scaleSize(6),
    height: responsive.scaleSize(6),
    borderRadius: responsive.scaleSize(3),
    marginHorizontal: responsive.scaleSize(2),
    shadowOffset: {
      width: 0,
      height: responsive.scaleSize(1),
    },
    shadowOpacity: 0.2,
    shadowRadius: responsive.scaleSize(2),
    elevation: responsive.scaleSize(2),
  },
  speakingWave: {
    width: responsive.scaleSize(24),
    height: responsive.scaleSize(4),
    borderRadius: responsive.scaleSize(2),
    shadowOffset: {
      width: 0,
      height: responsive.scaleSize(1),
    },
    shadowOpacity: 0.2,
    shadowRadius: responsive.scaleSize(2),
    elevation: responsive.scaleSize(2),
  },
  statusText: {
    fontSize: typography.adaptiveSubtitle,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
    lineHeight: typography.getLineHeight(typography.adaptiveSubtitle),
    // color will be set dynamically via theme
  },

  // Premium Shimmer Effect
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: layout.borderRadius.lg,
    width: responsive.scaleSize(100),
    transform: [{ skewX: '-20deg' }],
    // backgroundColor will be set dynamically via theme
  },

  // New styles for VAD instruction text
  instructionText: {
    fontSize: typography.adaptiveBody,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    lineHeight: typography.getLineHeight(typography.adaptiveBody),
    fontWeight: '400',
  },

  debugText: {
    fontSize: typography.adaptiveCaption,
    textAlign: 'center',
    marginTop: spacing.xs / 2,
    fontFamily: 'monospace',
  },
});
