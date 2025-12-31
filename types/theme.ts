/**
 * Theme System Types
 * TypeScript definitions for the theme system
 */

import { Colors, ColorKey, ThemeMode, ColorScheme } from '@/constants/Colors';
import { ModelId } from './models';
import { ModelColorPalette } from '@/constants/ModelThemes';

// Re-export types from constants for external use
export type { ThemeMode, ColorScheme, ColorKey };

// Theme context state interface
export interface ThemeContextState {
  // Current theme mode (light, dark, or system)
  themeMode: ThemeMode;
  
  // Current active color scheme (light or dark)
  colorScheme: ColorScheme;
  
  // Whether the theme is currently following system preference
  isSystemTheme: boolean;
  
  // Currently selected model
  selectedModel: ModelId;
  
  // Theme switching functions
  setLightTheme: () => void;
  setDarkTheme: () => void;
  setSystemTheme: () => void;
  toggleTheme: () => void;
  
  // Color access (base theme colors)
  colors: typeof Colors.light | typeof Colors.dark;
  
  // Model-specific colors (dynamic based on selected model)
  modelColors: ModelColorPalette;
  
  // Loading state for theme initialization
  isLoading: boolean;
}

// Theme storage interface
export interface ThemeStorage {
  saveThemePreference: (mode: ThemeMode) => Promise<void>;
  loadThemePreference: () => Promise<ThemeMode | null>;
  clearThemePreference: () => Promise<void>;
}

// Theme provider props
export interface ThemeProviderProps {
  children: React.ReactNode;
}

// Hook return type for useTheme
export interface UseThemeReturn {
  themeMode: ThemeMode;
  colorScheme: ColorScheme;
  isSystemTheme: boolean;
  colors: typeof Colors.light | typeof Colors.dark;
  isLoading: boolean;
  setLightTheme: () => void;
  setDarkTheme: () => void;
  setSystemTheme: () => void;
  toggleTheme: () => void;
}

// Theme change event data
export interface ThemeChangeEvent {
  previousMode: ThemeMode;
  newMode: ThemeMode;
  previousColorScheme: ColorScheme;
  newColorScheme: ColorScheme;
  timestamp: number;
}

// Theme configuration options
export interface ThemeConfig {
  // Whether to automatically follow system theme changes
  followSystemTheme: boolean;
  
  // Default theme mode when no preference is saved
  defaultThemeMode: ThemeMode;
  
  // Whether to persist theme preference
  persistTheme: boolean;
  
  // Animation duration for theme transitions (in ms)
  transitionDuration: number;
}

// Default theme configuration
export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  followSystemTheme: true,
  defaultThemeMode: 'system',
  persistTheme: true,
  transitionDuration: 200,
};

// Theme error types
export class ThemeError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ThemeError';
  }
}

// Theme error codes
export const THEME_ERROR_CODES = {
  STORAGE_ERROR: 'STORAGE_ERROR',
  INVALID_THEME_MODE: 'INVALID_THEME_MODE',
  INITIALIZATION_ERROR: 'INITIALIZATION_ERROR',
  CONTEXT_NOT_FOUND: 'CONTEXT_NOT_FOUND',
} as const;

export type ThemeErrorCode = typeof THEME_ERROR_CODES[keyof typeof THEME_ERROR_CODES];
