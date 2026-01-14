import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text, Animated, InteractionManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useModelTheme } from '@/hooks/useModelTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions, TabActions } from '@react-navigation/native';
import { router } from 'expo-router';
import { IconSymbol } from './IconSymbol';
import * as Haptics from 'expo-haptics';
import { useVoiceAssistantContext } from '@/components/VoiceAssistantProviderWrapper';



export default function TabBarBackground(props: BottomTabBarProps) {
  const { modelColors, colorScheme, baseColors } = useModelTheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const BUILD_MARKER = 'TABBAR_PROFILE_NAV_FIX_2026_01_13_C';

  // Track if navigation is ready (first mount delay)
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const navigationReadyRef = useRef(false);
  const mountedRef = useRef(false);

  // Force re-render trigger for navigation
  const [, forceUpdate] = useState(0);

  // Voice assistant context for call end button functionality
  const { assistantState, showEndCallButton, stopConversation } = useVoiceAssistantContext();

  // Debounce state to prevent multiple rapid taps
  const [isProcessingTap, setIsProcessingTap] = React.useState(false);
  const lastTapTimeRef = useRef<number>(0);
  const navStateRef = useRef(props.state);
  const pendingTabKeyRef = useRef<{ tabKey: string; attempts: number; startedAt: number } | null>(null);
  const DEBOUNCE_DELAY = 300; // 300ms debounce
  const MAX_NAVIGATION_ATTEMPTS = 200;
  const MAX_NAVIGATION_DURATION_MS = 5000;

  // Animation for call end button
  const callEndButtonScale = React.useRef(new Animated.Value(1)).current;
  const callEndButtonOpacity = React.useRef(new Animated.Value(0)).current;

  // End Call shows only after the call has successfully connected at least once, and stays until manual stop.
  const shouldShowCallEndButton = showEndCallButton;
  // Enforce: never render tab buttons during an active/connecting call session.
  const shouldHideTabButtons = assistantState !== 'idle' || showEndCallButton;

  // Animate call end button appearance/disappearance
  React.useEffect(() => {
    if (shouldShowCallEndButton) {
      Animated.parallel([
        Animated.timing(callEndButtonOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(callEndButtonScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(callEndButtonOpacity, {
          toValue: 0,
          duration: 0, // Instant - 0ms for immediate hiding
          useNativeDriver: true,
        }),
        Animated.timing(callEndButtonScale, {
          toValue: 0.8,
          duration: 0, // Instant - 0ms for immediate hiding
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [shouldShowCallEndButton]);

  // Get the current active route from props
  const activeRouteIndex = props.state.index ?? 0;
  const activeRouteName = props.state.routes?.[activeRouteIndex]?.name;

  // Tab configuration
  const tabs = [
    { key: 'index', name: 'Assistant', icon: 'mic.fill' as const },
    { key: 'profile', name: 'Profile', icon: 'person.fill' as const },
  ];

  React.useEffect(() => {
    navStateRef.current = props.state;
  }, [props.state]);

  // Initialize navigation readiness after mount with proper delay
  useEffect(() => {
    mountedRef.current = true;

    // Use InteractionManager to wait for all interactions to complete
    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      // Additional delay to ensure expo-router is fully initialized
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          navigationReadyRef.current = true;
          setIsNavigationReady(true);
          console.log(`[${BUILD_MARKER}] navigation_ready`);
        }
      }, 500);

      return () => clearTimeout(timer);
    });

    return () => {
      mountedRef.current = false;
      interactionHandle.cancel();
    };
  }, []);

  React.useEffect(() => {
    console.log(`[${BUILD_MARKER}] mounted`);
  }, []);

  const isTabFocused = useCallback((tabKey: string) => {
    const state = navStateRef.current;
    const idx = state?.index ?? 0;
    const currentName = state?.routes?.[idx]?.name;
    return currentName === tabKey;
  }, []);

  const attemptNavigateToTab = useCallback((tabKey: string) => {
    if (isTabFocused(tabKey)) {
      pendingTabKeyRef.current = null;
      return;
    }

    const pending = pendingTabKeyRef.current;
    if (pending && Date.now() - pending.startedAt > MAX_NAVIGATION_DURATION_MS) {
      pendingTabKeyRef.current = null;
      return;
    }
    if (pending && pending.attempts >= MAX_NAVIGATION_ATTEMPTS) {
      pendingTabKeyRef.current = null;
      return;
    }

    const state = navStateRef.current;
    const targetKey = state?.key;
    const resetRoutes = (state?.routes?.map((r) => ({ name: r.name as any })) ?? [
      { name: 'index' as any },
      { name: 'profile' as any },
    ]);
    const resetIndex = Math.max(0, resetRoutes.findIndex((r) => r.name === (tabKey as any)));

    try {
      props.navigation.navigate(tabKey as any);
    } catch (e) {
      console.error(`[${BUILD_MARKER}] navigation.navigate failed:`, e);
    }

    try {
      props.navigation.dispatch(CommonActions.navigate({ name: tabKey as any } as any));
    } catch (e) {
      console.error(`[${BUILD_MARKER}] CommonActions.navigate dispatch failed:`, e);
    }

    try {
      props.navigation.dispatch(TabActions.jumpTo(tabKey as any));
    } catch (e) {
      console.error(`[${BUILD_MARKER}] TabActions.jumpTo dispatch failed:`, e);
    }

    try {
      (props.navigation as any).jumpTo?.(tabKey);
    } catch (e) {
      console.error(`[${BUILD_MARKER}] navigation.jumpTo failed:`, e);
    }

    if (targetKey) {
      try {
        props.navigation.dispatch({
          ...TabActions.jumpTo(tabKey as any),
          target: targetKey,
        } as any);
      } catch (e) {
        console.error(`[${BUILD_MARKER}] TabActions.jumpTo(target) dispatch failed:`, e);
      }

      try {
        props.navigation.dispatch({
          ...CommonActions.navigate({ name: tabKey as any } as any),
          target: targetKey,
        } as any);
      } catch (e) {
        console.error(`[${BUILD_MARKER}] CommonActions.navigate(target) dispatch failed:`, e);
      }

      if (pending && pending.attempts > 0 && pending.attempts % 5 === 0) {
        try {
          props.navigation.dispatch({
            ...CommonActions.reset({
              index: resetIndex,
              routes: resetRoutes,
            }),
            target: targetKey,
          } as any);
        } catch (e) {
          console.error(`[${BUILD_MARKER}] CommonActions.reset(target) dispatch failed:`, e);
        }
      }
    }

    const current = pendingTabKeyRef.current;
    const nextAttempts = (current?.attempts ?? 0) + 1;
    pendingTabKeyRef.current = {
      tabKey,
      attempts: nextAttempts,
      startedAt: current?.startedAt ?? Date.now(),
    };

    setTimeout(() => {
      const stillPending = pendingTabKeyRef.current;
      if (!stillPending || stillPending.tabKey !== tabKey) return;
      if (isTabFocused(tabKey)) {
        pendingTabKeyRef.current = null;
        return;
      }
      attemptNavigateToTab(tabKey);
    }, 50);
  }, [isTabFocused, props.navigation]);

  React.useEffect(() => {
    const pending = pendingTabKeyRef.current;
    if (!pending) return;
    if (isTabFocused(pending.tabKey)) {
      pendingTabKeyRef.current = null;
      return;
    }
    setTimeout(() => {
      const stillPending = pendingTabKeyRef.current;
      if (!stillPending) return;
      attemptNavigateToTab(stillPending.tabKey);
    }, 0);
  }, [props.state, isTabFocused, attemptNavigateToTab]);

  const handleTabPress = useCallback((tabKey: string) => {
    // PROFILE TAB: Immediate synchronous navigation - no async, no delays, no retries
    if (tabKey === 'profile') {
      if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.navigate('/(tabs)/profile');
      return;
    }

    // === NON-PROFILE TABS: Use existing debounced logic ===

    // Debounce rapid taps to prevent intermittent failures
    const now = Date.now();
    if (now - lastTapTimeRef.current < DEBOUNCE_DELAY) {
      return;
    }
    lastTapTimeRef.current = now;

    // Prevent processing if already handling a tap
    if (isProcessingTap) {
      return;
    }

    setIsProcessingTap(true);

    try {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      pendingTabKeyRef.current = { tabKey, attempts: 0, startedAt: Date.now() };
      attemptNavigateToTab(tabKey);
    } catch (error) {
      pendingTabKeyRef.current = { tabKey, attempts: 0, startedAt: Date.now() };
      console.error('Error handling tab press:', error);
    } finally {
      // Reset processing state after a short delay
      setTimeout(() => {
        setIsProcessingTap(false);
      }, 100);
    }
  }, [isProcessingTap, attemptNavigateToTab, props.state.routes, props.state.key, props.navigation]);

  const handleEndCall = async () => {
    // Provide haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    // Add visual feedback animation
    Animated.sequence([
      Animated.timing(callEndButtonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(callEndButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      await stopConversation();
    } catch (error) {
      console.error('Error stopping voice listening:', error);
    }
  };

  // Determine colors based on active tab
  const getThemeColors = () => {
    if (activeRouteName === 'profile') {
      // Use profile-specific theme colors
      return {
        cardBackground: isDark ? baseColors.cardBackground : '#F8F9FA',
        primary: isDark ? '#6C63FF' : '#5A52D5',
        accent: isDark ? '#FF6B6B' : '#E85D5D',
        glow: isDark ? '#6C63FF' : '#5A52D5',
      };
    }
    // Default to model colors for other tabs
    return modelColors;
  };

  const themeColors = getThemeColors();

  // Get tab colors
  const getActiveTabColor = () => {
    if (isDark) {
      return '#FFFFFF'; // White for dark mode
    }
    // Light mode - use theme colors
    if (activeRouteName === 'profile') {
      return '#5A52D5'; // Profile theme color
    }
    return modelColors.primary; // Character theme color
  };

  const getInactiveTabColor = () => {
    // Both dark and light mode - use grey for inactive tabs
    return isDark ? '#6B7280' : '#9CA3AF';
  };

  return (
    <View style={[styles.container, { paddingBottom: 0, bottom: Math.max(insets.bottom, 8) + 8 }]}>
      {/* Main floating container */}
      <View style={[
        styles.floatingContainer,
        {
          shadowColor: themeColors.glow || themeColors.primary,
          backgroundColor: themeColors.cardBackground,
          // Match other containers' border treatment
          borderColor: themeColors.primary,
          borderTopColor: themeColors.accent,
          borderTopWidth: 2,
          borderLeftWidth: 2,
        }
      ]}>
        {/* Gradient overlay */}
        <LinearGradient
          colors={[
            `${themeColors.primary}15`,
            `${themeColors.accent}08`,
            `${themeColors.primary}05`,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientOverlay}
        />

        {/* Custom Tab Icons */}
        {!shouldHideTabButtons && (
          <View style={styles.tabIconsContainer}>
            {tabs.map((tab) => {
              const isActive = activeRouteName === tab.key;
              const iconColor = isActive ? getActiveTabColor() : getInactiveTabColor();

              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabButton,
                    {
                      backgroundColor: isActive ? `${iconColor}20` : 'transparent',
                      opacity: isProcessingTap ? 0.7 : 1,
                    }
                  ]}
                  onPress={() => {
                    handleTabPress(tab.key);
                  }}
                  activeOpacity={0.7}
                  disabled={tab.key === 'profile' ? false : isProcessingTap}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <IconSymbol
                    name={tab.icon}
                    size={24}
                    color={iconColor}
                  />
                  <Text style={[styles.tabLabel, { color: iconColor }]}>
                    {tab.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {/* Call End Button - Overlay when voice is active */}
        {shouldShowCallEndButton && (
          <Animated.View
            style={[
              styles.callEndButtonContainer,
              {
                opacity: callEndButtonOpacity,
                transform: [{ scale: callEndButtonScale }],
              }
            ]}
          >
            <TouchableOpacity
              style={[
                styles.callEndButton,
                {
                  backgroundColor: themeColors.accent,
                  borderColor: themeColors.primary,
                }
              ]}
              onPress={handleEndCall}
              activeOpacity={0.8}
            >
              <IconSymbol
                name="phone.down.fill"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.callEndButtonText}>
                End Call
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

export function useBottomTabOverflow() {
  return 24; // Account for the floating tab bar spacing
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  floatingContainer: {
    height: 68,
    marginHorizontal: 8,
    borderRadius: 36,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
    // Glassmorphism effect
    backdropFilter: 'blur(20px)',
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 36,
  },
  innerContainer: {
    flex: 1,
    borderRadius: 36,
  },
  tabIconsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    zIndex: 1, // Ensure tab buttons are on top
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 12,
    borderRadius: 28,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  callEndButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0, // Remove padding to allow full width
    backgroundColor: 'transparent',
    zIndex: 2, // Ensure call end button is above tab buttons when visible
  },
  callEndButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%', // Take full width
    height: '100%', // Take full height
    borderRadius: 36, // Match floating container border radius
    borderWidth: 0, // Remove border to blend seamlessly
    shadowColor: 'transparent', // Remove shadow as it's inside the container
    elevation: 0,
  },
  callEndButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
    textAlign: 'center',
  },
});
