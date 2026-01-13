import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated as RNAnimated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import ModelViewer from '@/components/ModelViewer';
import { ThemedText } from '@/components/ThemedText';
import VoiceAssistantBanner from '@/components/ads/VoiceAssistantBanner';

import { useTheme } from '@/hooks/useTheme';
import { useModelTheme } from '@/hooks/useModelTheme';
import { useVoiceAssistantContext } from '@/components/VoiceAssistantProviderWrapper';
import { useResponsive, useResponsiveSpacing, useResponsiveTypography, useResponsiveLayout } from '@/hooks/useResponsive';

export default function VoiceAssistantScreen() {
  const [bannerHeight, setBannerHeight] = useState(0);
  const { colorScheme, colors } = useTheme();
  const { modelColors } = useModelTheme();
  const isDark = colorScheme === 'dark';

  const responsive = useResponsive();
  const spacing = useResponsiveSpacing();
  const typography = useResponsiveTypography();
  const layout = useResponsiveLayout();

  const styles = createStyles(responsive, spacing, typography, layout, colors);

  const {
    assistantState,
    getStatusText,
    startConversation,
    isInitialized,
    initializationError,
    error: voiceError,
  } = useVoiceAssistantContext();

  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const floatAnim = useRef(new RNAnimated.Value(0)).current;
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const glowAnim = useRef(new RNAnimated.Value(0)).current;
  const breatheAnim = useRef(new RNAnimated.Value(1)).current;

  // Get the status text, with initialization state handling
  const getDisplayStatusText = () => {
    if (!isInitialized) {
      return 'Initializing...';
    }
    if (initializationError) {
      return 'Initialization Error';
    }
    return getStatusText();
  };

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      RNAnimated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
    ]).start();

    const floatingAnimation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(floatAnim, { toValue: -8, duration: 3000, useNativeDriver: true }),
        RNAnimated.timing(floatAnim, { toValue: 8, duration: 3000, useNativeDriver: true }),
      ])
    );

    const pulsingAnimation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 1.02, duration: 2000, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );

    floatingAnimation.start();
    pulsingAnimation.start();

    return () => {
      floatingAnimation.stop();
      pulsingAnimation.stop();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <LinearGradient
          colors={[modelColors.gradientStart, modelColors.gradientMiddle, modelColors.gradientEnd, modelColors.surface]}
          locations={[0, 0.5, 0.9, 1]}
          style={styles.gradientBackground}
        />

        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <RNAnimated.ScrollView
            contentContainerStyle={[
              styles.contentContainer,
              {
                paddingTop: spacing.md + bannerHeight,
                paddingHorizontal: layout.containerPadding,
                paddingBottom: spacing.lg,
              },
            ]}
            style={{ flex: 1, opacity: fadeAnim as any }}
          >
            <RNAnimated.View style={[
              styles.headerCard,
              {
                backgroundColor: modelColors.cardBackground,
                borderColor: modelColors.primary,
                borderWidth: responsive.scaleSize(1.5),
                shadowColor: modelColors.glow,
                opacity: glowAnim,
              }
            ]}>
              <View style={styles.headerContent}>
                <ThemedText type="title" style={[styles.title, { color: isDark ? colors.textPrimary : modelColors.primaryDark }]}>
                  Voice Assistant
                </ThemedText>
                <ThemedText type="subtitle" style={[styles.subtitle, { color: isDark ? colors.textSecondary : modelColors.primary }]}>
                  {getDisplayStatusText()}
                </ThemedText>
              </View>
            </RNAnimated.View>

            <RNAnimated.View style={[
              styles.avatarWrapper,
              { transform: [{ translateY: floatAnim }, { scale: assistantState === 'idle' ? breatheAnim : pulseAnim }] }
            ]}>
              <ModelViewer
                onPress={() => {
                  // Only allow starting conversation if initialized and idle
                  if (!isInitialized) {
                    console.log('Cannot start conversation - not initialized yet');
                    return;
                  }
                  if (assistantState === 'idle') {
                    startConversation();
                  }
                }}
                width={layout.modelViewerDimensions.width}
                height={layout.modelViewerDimensions.height}
                gradientColors={[modelColors.gradientStart, modelColors.gradientMiddle, modelColors.gradientEnd, modelColors.surface] as any}
                borderColor={!isInitialized ? colors.textSecondary : (assistantState === 'calling' ? colors.success : modelColors.primary)}
                shadowColor={!isInitialized ? colors.textSecondary : (assistantState === 'calling' ? colors.success : modelColors.glow)}
              />

              {assistantState === 'speaking' && (
                <RNAnimated.View style={[styles.speakingIndicator, { backgroundColor: modelColors.accent, opacity: pulseAnim }]} />
              )}
            </RNAnimated.View>
          </RNAnimated.ScrollView>
        </SafeAreaView>

        <VoiceAssistantBanner
          position="top"
          isVoiceActive={assistantState === 'calling'}
          onHeightChange={(height) => setBannerHeight(height)}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const createStyles = (responsive: any, spacing: any, typography: any, layout: any, colors: any) => StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  gradientBackground: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  safeArea: { flex: 1 },
  contentContainer: { alignItems: 'center', justifyContent: 'flex-start', flexGrow: 1 },
  headerCard: {
    alignItems: 'center',
    marginHorizontal: spacing.xs,
    marginTop: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: layout.borderRadius.lg,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
  },
  headerContent: { alignItems: 'center' },
  title: { fontWeight: '700', textAlign: 'center', fontSize: typography.adaptiveTitle },
  subtitle: { textAlign: 'center', fontSize: typography.adaptiveSubtitle, marginTop: spacing.xs },
  avatarWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: spacing.xl,
    flex: 1,
    minHeight: responsive.hp(70),
  },
  speakingIndicator: {
    position: 'absolute',
    bottom: responsive.scaleSize(-20),
    width: responsive.scaleSize(12),
    height: responsive.scaleSize(12),
    borderRadius: 6,
  },
  endCallContainer: { alignItems: 'center', marginVertical: spacing.lg, width: '100%' },
  endCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 100,
    elevation: 8,
    gap: spacing.md,
  },
  endCallText: { color: 'white', fontWeight: 'bold', fontSize: typography.adaptiveSubtitle },
});
