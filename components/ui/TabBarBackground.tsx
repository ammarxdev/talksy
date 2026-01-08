import React from 'react';
import { View, StyleSheet, Dimensions, Platform, TouchableOpacity, Text, Animated } from 'react-native';
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

  // Voice assistant context for stop button functionality
  const { assistantState, isListening, stopListening } = useVoiceAssistantContext();

  // Animation for stop button
  const stopButtonScale = React.useRef(new Animated.Value(1)).current;
  const stopButtonOpacity = React.useRef(new Animated.Value(0)).current;
  const [forceHideStopButton, setForceHideStopButton] = React.useState(false);

  // Determine if stop button should be visible - only during actual microphone listening and not force hidden
  const shouldShowStopButton = isListening && !forceHideStopButton;

  // Animate stop button appearance/disappearance
  React.useEffect(() => {
    if (shouldShowStopButton) {
      Animated.parallel([
        Animated.timing(stopButtonOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(stopButtonScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(stopButtonOpacity, {
          toValue: 0,
          duration: 0, // Instant - 0ms for immediate hiding
          useNativeDriver: true,
        }),
        Animated.timing(stopButtonScale, {
          toValue: 0.8,
          duration: 0, // Instant - 0ms for immediate hiding
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [shouldShowStopButton]);

  // Get the current active route from props
  const activeRouteIndex = props.state.index ?? 0;
  const activeRouteName = props.state.routes?.[activeRouteIndex]?.name;

  // Tab configuration
  const tabs = [
    { key: 'index', name: 'Assistant', icon: 'mic.fill' as const },
    { key: 'profile', name: 'Profile', icon: 'person.fill' as const },
  ];

  const handleTabPress = (tabKey: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const route = props.state.routes.find((r) => r.name === tabKey);
    if (!route) {
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
  };

  const handleStopListening = async () => {
    // Force hide immediately
    setForceHideStopButton(true);

    // Provide haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    // Add visual feedback animation
    Animated.sequence([
      Animated.timing(stopButtonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(stopButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Immediately hide the stop button
    Animated.timing(stopButtonOpacity, {
      toValue: 0,
      duration: 0, // Instant - 0ms for immediate hiding
      useNativeDriver: true,
    }).start();

    try {
      await stopListening();
    } catch (error) {
      console.error('Error stopping voice listening:', error);
    } finally {
      // Reset force hide after stopListening completes to allow normal behavior
      // Use a small delay to ensure isListening state has fully propagated
      setTimeout(() => {
        setForceHideStopButton(false);
      }, 100);
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
                  }
                ]}
                onPress={() => {
                  handleTabPress(tab.key);
                }}
                activeOpacity={0.7}
              >
                <IconSymbol
                  name={tab.icon}
                  size={28}
                  color={iconColor}
                />
                <Text style={[
                  styles.tabLabel,
                  { color: iconColor }
                ]}>
                  {tab.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Stop Listening Button - Overlay when voice is active */}
          <Animated.View
            style={[
              styles.stopButtonContainer,
              {
                opacity: stopButtonOpacity,
                transform: [{ scale: stopButtonScale }],
                pointerEvents: shouldShowStopButton ? 'auto' : 'none',
              }
            ]}
          >
            <TouchableOpacity
              style={[
                styles.stopButton,
                {
                  backgroundColor: themeColors.accent,
                  borderColor: themeColors.primary,
                }
              ]}
              onPress={handleStopListening}
              activeOpacity={0.8}
              disabled={!shouldShowStopButton}
            >
              <IconSymbol
                name="stop.fill"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.stopButtonText}>
                Stop
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
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
  stopButtonContainer: {
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
    zIndex: 2, // Ensure stop button is above tab buttons when visible
  },
  stopButton: {
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
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
    textAlign: 'center',
  },
});
