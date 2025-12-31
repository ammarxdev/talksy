/**
 * Enhanced Theme Hooks
 * Custom hooks for accessing theme data and utility functions
 */

import { useCallback, useMemo } from 'react';
import { StatusBarStyle } from 'expo-status-bar';
import { useTheme as useThemeContext, useThemeColors, useThemeMode } from '@/contexts/ThemeContext';
import { Colors, ColorKey } from '@/constants/Colors';
import { ColorScheme, ThemeMode } from '@/types/theme';

/**
 * Main theme hook - re-export from context for convenience
 */
export { useTheme, useThemeColors, useThemeMode } from '@/contexts/ThemeContext';

/**
 * Hook for getting specific color values with fallback
 */
export const useThemeColor = (
  props: { light?: string; dark?: string },
  colorName: ColorKey
) => {
  const { colorScheme, colors } = useThemeContext();
  const colorFromProps = props[colorScheme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return colors[colorName];
  }
};

/**
 * Hook for status bar styling based on theme
 */
export const useStatusBarStyle = (): StatusBarStyle => {
  const { colors } = useThemeContext();
  return colors.statusBarStyle;
};

/**
 * Hook for theme-aware styling
 */
export const useThemedStyles = <T extends Record<string, any>>(
  styleCreator: (colors: typeof Colors.light | typeof Colors.dark, colorScheme: ColorScheme) => T
) => {
  const { colors, colorScheme } = useThemeContext();

  return useMemo(() => {
    return styleCreator(colors, colorScheme);
  }, [colors, colorScheme, styleCreator]);
};

/**
 * Hook for conditional theme values
 */
export const useThemeValue = <T>(lightValue: T, darkValue: T): T => {
  const { colorScheme } = useThemeContext();
  return colorScheme === 'dark' ? darkValue : lightValue;
};

/**
 * Hook for theme transition animations
 */
export const useThemeTransition = () => {
  const { colorScheme } = useThemeContext();
  
  const getTransitionConfig = useCallback(() => ({
    duration: 200,
    useNativeDriver: false,
  }), []);

  const createColorTransition = useCallback((
    lightColor: string,
    darkColor: string
  ) => {
    return colorScheme === 'dark' ? darkColor : lightColor;
  }, [colorScheme]);

  return {
    getTransitionConfig,
    createColorTransition,
  };
};

/**
 * Hook for theme debugging information
 */
export const useThemeDebug = () => {
  const { themeMode, colorScheme, isSystemTheme, isLoading } = useThemeContext();
  
  return useMemo(() => ({
    themeMode,
    colorScheme,
    isSystemTheme,
    isLoading,
    debugInfo: {
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    },
  }), [themeMode, colorScheme, isSystemTheme, isLoading]);
};

/**
 * Hook for theme-aware component variants
 */
export const useThemeVariant = <T extends Record<string, any>>(
  variants: { light: T; dark: T }
) => {
  const { colorScheme } = useThemeContext();
  return variants[colorScheme];
};

/**
 * Hook for accessibility-aware theming
 */
export const useAccessibleTheme = () => {
  const { colors, colorScheme } = useThemeContext();
  
  const getContrastColor = useCallback((backgroundColor: string) => {
    // Simple contrast calculation - in production, you might want a more sophisticated algorithm
    return colorScheme === 'dark' ? colors.textPrimary : colors.textPrimary;
  }, [colors, colorScheme]);

  const getAccessibleColors = useCallback(() => ({
    highContrast: {
      text: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      background: colorScheme === 'dark' ? '#000000' : '#FFFFFF',
    },
    focus: {
      border: colors.accent,
      background: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
  }), [colors, colorScheme]);

  return {
    getContrastColor,
    getAccessibleColors,
  };
};

/**
 * Hook for theme persistence utilities
 */
export const useThemePersistence = () => {
  const { themeMode, setLightTheme, setDarkTheme, setSystemTheme } = useThemeContext();
  
  const applyThemeMode = useCallback((mode: ThemeMode) => {
    switch (mode) {
      case 'light':
        setLightTheme();
        break;
      case 'dark':
        setDarkTheme();
        break;
      case 'system':
        setSystemTheme();
        break;
      default:
        console.warn(`Unknown theme mode: ${mode}`);
    }
  }, [setLightTheme, setDarkTheme, setSystemTheme]);

  const getThemeDisplayName = useCallback((mode: ThemeMode) => {
    switch (mode) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'Unknown';
    }
  }, []);

  return {
    currentMode: themeMode,
    applyThemeMode,
    getThemeDisplayName,
  };
};

/**
 * Utility function to create theme-aware styles
 */
export const createThemedStyles = <T extends Record<string, any>>(
  styleCreator: (colors: typeof Colors.light, isDark: boolean) => T
) => {
  return (colors: typeof Colors.light, colorScheme: ColorScheme) => {
    return styleCreator(colors, colorScheme === 'dark');
  };
};
