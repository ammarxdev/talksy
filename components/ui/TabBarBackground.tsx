import React from 'react';
import { View, StyleSheet, Dimensions, Platform, TouchableOpacity, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useModelTheme } from '@/hooks/useModelTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { IconSymbol } from './IconSymbol';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function TabBarBackground(props: BottomTabBarProps) {
  const { modelColors, colorScheme, baseColors } = useModelTheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  
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
    // Navigate via props to ensure proper integration with the tab navigator
    props.navigation.navigate(tabKey as never);
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
                style={styles.tabButton}
                onPress={() => handleTabPress(tab.key)}
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
});
