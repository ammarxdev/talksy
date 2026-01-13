import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Platform, TouchableOpacity, Text, Animated, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useModelTheme } from '@/hooks/useModelTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { IconSymbol } from './IconSymbol';
import * as Haptics from 'expo-haptics';
import { useVoiceAssistantContext } from '@/components/VoiceAssistantProviderWrapper';

const { width } = Dimensions.get('window');

export default function TabBarBackground(props: BottomTabBarProps) {
  const { modelColors, colorScheme, baseColors } = useModelTheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  // Voice assistant context for call end button functionality
  const { assistantState, showEndCallButton, stopConversation, isInitialized } = useVoiceAssistantContext();

  // Debounce state to prevent multiple rapid taps
  const [isProcessingTap, setIsProcessingTap] = React.useState(false);
  const lastTapTimeRef = useRef<number>(0);
  const DEBOUNCE_DELAY = 300; // 300ms debounce

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

  const handleTabPress = useCallback((tabKey: string) => {
    // Debounce rapid taps to prevent intermittent failures
    const now = Date.now();
    if (now - lastTapTimeRef.current < DEBOUNCE_DELAY) {
      console.log('Tab press debounced - too rapid');
      return;
    }
    lastTapTimeRef.current = now;

    // Prevent processing if already handling a tap
    if (isProcessingTap) {
      console.log('Tab press ignored - already processing');
      return;
    }

    setIsProcessingTap(true);

    try {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const route = props.state.routes.find((r) => r.name === tabKey);
      if (!route) {
        setIsProcessingTap(false);
        return;
      }

      const isFocused = props.state.index === props.state.routes.indexOf(route);
      const event = props.navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        props.navigation.navigate(route.name as any);
      }
    } catch (error) {
      console.error('Error handling tab press:', error);
    } finally {
      // Reset processing state after a short delay
      setTimeout(() => {
        setIsProcessingTap(false);
      }, 100);
    }
  }, [isProcessingTap, props.state.routes, props.state.index, props.navigation]);

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
                  disabled={isProcessingTap}
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
