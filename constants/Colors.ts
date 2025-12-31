/**
 * Theme Types and Color System
 * Comprehensive color definitions for light and dark modes with enhanced theming support
 */

// Theme mode types
export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'light' | 'dark';

// Theme preference storage key
export const THEME_STORAGE_KEY = '@app_theme_preference';

// Enhanced color system with modern clean design approach
export const Colors = {
  light: {
    // Basic colors - Clean and modern
    text: '#1a1a1a',
    background: '#ffffff',
    tint: '#2563eb', // Modern blue
    icon: '#6b7280',
    tabIconDefault: '#9ca3af',
    tabIconSelected: '#2563eb',

    // Extended color palette - Professional and clean
    primary: '#2563eb',        // Modern blue - professional and trustworthy
    secondary: '#64748b',      // Slate gray - sophisticated
    accent: '#3b82f6',         // Bright blue for highlights
    success: '#10b981',        // Modern green
    warning: '#f59e0b',        // Amber warning
    error: '#ef4444',          // Clean red
    info: '#06b6d4',           // Cyan info

    // Surface colors - Clean hierarchy
    surface: '#f8fafc',        // Very light gray background
    surfaceVariant: '#f1f5f9', // Slightly darker for cards
    cardBackground: '#ffffff', // Pure white for cards
    modalBackground: '#ffffff',

    // Text variations - Better contrast and readability
    textPrimary: '#0f172a',    // Almost black for primary text
    textSecondary: '#475569',  // Medium gray for secondary text
    textTertiary: '#94a3b8',   // Light gray for tertiary text
    textDisabled: '#cbd5e1',   // Very light gray for disabled

    // Border and divider colors - Subtle and clean
    border: '#e2e8f0',         // Light border
    borderLight: '#f1f5f9',    // Very light border
    divider: '#e2e8f0',        // Clean dividers

    // Interactive states
    buttonPrimary: '#667eea',
    buttonSecondary: '#F2F2F7',
    buttonDisabled: '#E5E5EA',

    // Status bar
    statusBarStyle: 'dark' as const,
  },
  dark: {
    // Basic colors - Modern dark theme
    text: '#f8fafc',
    background: '#0f172a',       // Deep slate background
    tint: '#3b82f6',             // Modern blue for dark theme
    icon: '#94a3b8',
    tabIconDefault: '#64748b',
    tabIconSelected: '#3b82f6',

    // Extended color palette - Dark theme optimized
    primary: '#3b82f6',          // Bright blue for dark backgrounds
    secondary: '#64748b',        // Slate gray
    accent: '#60a5fa',           // Lighter blue for accents
    success: '#22c55e',          // Bright green for dark theme
    warning: '#fbbf24',          // Bright amber
    error: '#f87171',            // Bright red for dark theme
    info: '#22d3ee',             // Bright cyan

    // Surface colors - Modern dark hierarchy
    surface: '#0f172a',          // Main background - deep slate
    surfaceVariant: '#1e293b',   // Card backgrounds - lighter slate
    cardBackground: '#1e293b',   // Cards with subtle elevation
    modalBackground: '#1e293b',  // Modal backgrounds

    // Text variations - Optimized for dark backgrounds
    textPrimary: '#f8fafc',      // Almost white for primary text
    textSecondary: '#cbd5e1',    // Light gray for secondary text
    textTertiary: '#94a3b8',     // Medium gray for tertiary text
    textDisabled: '#64748b',     // Darker gray for disabled

    // Border and divider colors - Subtle dark theme borders
    border: '#334155',           // Visible but subtle borders
    borderLight: '#1e293b',      // Very subtle borders
    divider: '#334155',          // Clean dividers for dark theme

    // Interactive states
    buttonPrimary: '#3b82f6',    // Primary buttons - modern blue
    buttonSecondary: '#1e293b',  // Secondary buttons
    buttonDisabled: '#475569',   // Disabled buttons

    // Status bar
    statusBarStyle: 'light' as const,
  },
};

// Type for accessing color keys
export type ColorKey = keyof typeof Colors.light;
