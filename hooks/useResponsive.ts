import { useState, useEffect } from 'react';
import { Dimensions, PixelRatio } from 'react-native';

// Base dimensions for scaling calculations
const BASE_WIDTH = 375;  // iPhone 8/SE width as base
const BASE_HEIGHT = 667; // iPhone 8/SE height as base

export interface ScreenDimensions {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
}

export interface ResponsiveConfig {
  screenWidth: number;
  screenHeight: number;
  isSmallScreen: boolean;
  isMediumScreen: boolean;
  isLargeScreen: boolean;
  isTablet: boolean;
  orientation: 'portrait' | 'landscape';
  deviceType: 'phone' | 'tablet';
  screenCategory: 'small' | 'medium' | 'large';
}

/**
 * Hook for getting responsive screen information and utilities
 */
export function useResponsive(): ResponsiveConfig & {
  wp: (percentage: number) => number;
  hp: (percentage: number) => number;
  moderateScale: (size: number, factor?: number) => number;
  scaleFont: (size: number) => number;
  scaleSize: (size: number) => number;
  getAdaptiveValue: <T>(small: T, medium: T, large: T) => T;
} {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const { width: screenWidth, height: screenHeight } = dimensions;
  const orientation = screenWidth > screenHeight ? 'landscape' : 'portrait';
  
  // Device categorization
  const isTablet = screenWidth >= 768 || screenHeight >= 1024;
  const deviceType = isTablet ? 'tablet' : 'phone';
  
  // Screen size categorization based on width
  const isSmallScreen = screenWidth <= 375;  // iPhone SE, small phones
  const isMediumScreen = screenWidth > 375 && screenWidth <= 414;  // iPhone 8+, 11 Pro
  const isLargeScreen = screenWidth > 414;   // iPhone 11 Pro Max, larger phones, tablets
  
  const screenCategory: 'small' | 'medium' | 'large' = isSmallScreen ? 'small' : isMediumScreen ? 'medium' : 'large';

  // Width percentage
  const wp = (percentage: number): number => {
    return (screenWidth * percentage) / 100;
  };

  // Height percentage
  const hp = (percentage: number): number => {
    return (screenHeight * percentage) / 100;
  };

  // Moderate scale for responsive sizing
  const moderateScale = (size: number, factor: number = 0.5): number => {
    const scale = screenWidth / BASE_WIDTH;
    return size + (scale - 1) * factor * size;
  };

  // Font scaling with device font scale consideration
  const scaleFont = (size: number): number => {
    const scale = screenWidth / BASE_WIDTH;
    const newSize = size * scale;
    
    // Apply device font scale but cap it to prevent too large fonts
    const deviceFontScale = Math.min(PixelRatio.getFontScale(), 1.3);
    
    return Math.round(newSize * deviceFontScale);
  };

  // General size scaling
  const scaleSize = (size: number): number => {
    const scale = Math.min(screenWidth / BASE_WIDTH, screenHeight / BASE_HEIGHT);
    return Math.round(size * scale);
  };

  // Get adaptive values based on screen size
  const getAdaptiveValue = <T>(small: T, medium: T, large: T): T => {
    if (isSmallScreen) return small;
    if (isMediumScreen) return medium;
    return large;
  };

  return {
    screenWidth,
    screenHeight,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    isTablet,
    orientation,
    deviceType,
    screenCategory,
    wp,
    hp,
    moderateScale,
    scaleFont,
    scaleSize,
    getAdaptiveValue,
  };
}

/**
 * Hook for responsive spacing values
 */
export function useResponsiveSpacing() {
  const { scaleSize, getAdaptiveValue } = useResponsive();

  return {
    // Padding values
    xs: scaleSize(4),
    sm: scaleSize(8),
    md: scaleSize(16),
    lg: scaleSize(24),
    xl: scaleSize(32),
    xxl: scaleSize(48),

    // Margin values
    marginXs: scaleSize(4),
    marginSm: scaleSize(8),
    marginMd: scaleSize(16),
    marginLg: scaleSize(24),
    marginXl: scaleSize(32),
    marginXxl: scaleSize(48),

    // Adaptive spacing
    getSpacing: (small: number, medium: number, large: number) =>
      scaleSize(getAdaptiveValue(small, medium, large)),
  };
}

/**
 * Hook for responsive typography
 */
export function useResponsiveTypography() {
  const { scaleFont, getAdaptiveValue } = useResponsive();

  return {
    // Base font sizes
    caption: scaleFont(12),
    body: scaleFont(14),
    bodyLarge: scaleFont(16),
    subtitle: scaleFont(18),
    title: scaleFont(24),
    headline: scaleFont(28),
    display: scaleFont(32),

    // Adaptive font sizes
    adaptiveCaption: scaleFont(getAdaptiveValue(10, 12, 14)),
    adaptiveBody: scaleFont(getAdaptiveValue(12, 14, 16)),
    adaptiveSubtitle: scaleFont(getAdaptiveValue(14, 16, 18)),
    adaptiveTitle: scaleFont(getAdaptiveValue(20, 24, 28)),
    adaptiveHeadline: scaleFont(getAdaptiveValue(24, 28, 32)),
    adaptiveDisplay: scaleFont(getAdaptiveValue(28, 32, 36)),

    // Line heights
    getLineHeight: (fontSize: number) => Math.round(fontSize * 1.4),
  };
}

/**
 * Hook for responsive layout dimensions
 */
export function useResponsiveLayout() {
  const { wp, hp, scaleSize, getAdaptiveValue, isTablet, orientation } = useResponsive();

  // Avatar/Model viewer sizing
  const getModelViewerDimensions = () => {
    if (isTablet) {
      return {
        width: Math.min(wp(60), 500),
        height: Math.min(hp(50), 600),
      };
    }

    if (orientation === 'landscape') {
      return {
        width: Math.min(wp(45), 350),
        height: Math.min(hp(70), 400),
      };
    }

    // Portrait phone
    return {
      width: getAdaptiveValue(
        Math.min(wp(85), 280), // Small screens
        Math.min(wp(80), 320), // Medium screens  
        Math.min(wp(75), 380)  // Large screens
      ),
      height: getAdaptiveValue(
        Math.min(hp(55), 450), // Small screens
        Math.min(hp(60), 500), // Medium screens
        Math.min(hp(65), 550)  // Large screens
      ),
    };
  };

  // Container padding
  const getContainerPadding = () => {
    return getAdaptiveValue(
      scaleSize(12), // Small screens
      scaleSize(16), // Medium screens
      scaleSize(20)  // Large screens
    );
  };

  // Header card dimensions
  const getHeaderCardPadding = () => {
    return {
      vertical: getAdaptiveValue(scaleSize(16), scaleSize(20), scaleSize(24)),
      horizontal: getAdaptiveValue(scaleSize(24), scaleSize(32), scaleSize(40)),
    };
  };

  return {
    modelViewerDimensions: getModelViewerDimensions(),
    containerPadding: getContainerPadding(),
    headerCardPadding: getHeaderCardPadding(),
    
    // Border radius scaling
    borderRadius: {
      sm: scaleSize(8),
      md: scaleSize(16),
      lg: scaleSize(24),
      xl: scaleSize(32),
    },

    // Shadow scaling
    shadowRadius: getAdaptiveValue(scaleSize(12), scaleSize(16), scaleSize(20)),
    elevation: getAdaptiveValue(8, 12, 16),
  };
}
