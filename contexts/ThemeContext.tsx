/**
 * Theme Context
 * Global theme state management with persistence and system theme detection
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback,
  ReactNode 
} from 'react';
import { useColorScheme } from 'react-native';
import { 
  ThemeContextState, 
  ThemeProviderProps, 
  ThemeMode, 
  ColorScheme,
  ThemeError,
  THEME_ERROR_CODES,
  DEFAULT_THEME_CONFIG 
} from '@/types/theme';
import { ModelId, getDefaultModel } from '@/types/models';
import { getModelColorPalette } from '@/constants/ModelThemes';
import { Colors } from '@/constants/Colors';
import { themeStorage } from '@/utils/themeStorage';

/**
 * Theme Context
 */
const ThemeContext = createContext<ThemeContextState | undefined>(undefined);

/**
 * Theme Provider Component
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // System color scheme detection
  const systemColorScheme = useColorScheme();
  
  // State
  const [themeMode, setThemeMode] = useState<ThemeMode>(DEFAULT_THEME_CONFIG.defaultThemeMode);
  const [selectedModel, setSelectedModelState] = useState<ModelId>(getDefaultModel().id);
  const [isLoading, setIsLoading] = useState(true);

  // Compute current color scheme based on theme mode
  const colorScheme: ColorScheme = themeMode === 'system' 
    ? (systemColorScheme || 'light') 
    : themeMode;

  // Get current colors
  const colors = Colors[colorScheme];
  
  // Get model-specific colors
  const modelColors = getModelColorPalette(selectedModel, colorScheme);

  // Check if currently following system theme
  const isSystemTheme = themeMode === 'system';

  /**
   * Initialize theme from storage
   */
  const initializeTheme = useCallback(async () => {
    try {
      setIsLoading(true);
      
      console.log('Initializing theme context...');
      
      // Load saved theme preference
      const savedTheme = await themeStorage.loadThemePreference();
      
      if (savedTheme) {
        setThemeMode(savedTheme);
        console.log(`Loaded saved theme: ${savedTheme}`);
      } else {
        // No saved preference, use default (system)
        setThemeMode(DEFAULT_THEME_CONFIG.defaultThemeMode);
        console.log(`Using default theme: ${DEFAULT_THEME_CONFIG.defaultThemeMode}`);
      }
    } catch (error) {
      console.error('Failed to initialize theme:', error);
      // Fallback to default theme on error
      setThemeMode(DEFAULT_THEME_CONFIG.defaultThemeMode);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update selected model (to be called by model context or components)
   */
  const updateSelectedModel = useCallback((modelId: ModelId) => {
    setSelectedModelState(modelId);
    console.log(`Theme: Updated selected model to ${modelId}`);
  }, []);

  /**
   * Save theme preference
   */
  const saveThemePreference = useCallback(async (mode: ThemeMode) => {
    try {
      await themeStorage.saveThemePreference(mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
      // Don't throw error to avoid breaking UI
    }
  }, []);

  /**
   * Set light theme
   */
  const setLightTheme = useCallback(async () => {
    setThemeMode('light');
    await saveThemePreference('light');
    console.log('Theme changed to light');
  }, [saveThemePreference]);

  /**
   * Set dark theme
   */
  const setDarkTheme = useCallback(async () => {
    setThemeMode('dark');
    await saveThemePreference('dark');
    console.log('Theme changed to dark');
  }, [saveThemePreference]);

  /**
   * Set system theme
   */
  const setSystemTheme = useCallback(async () => {
    setThemeMode('system');
    await saveThemePreference('system');
    console.log('Theme changed to system');
  }, [saveThemePreference]);

  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = useCallback(async () => {
    if (themeMode === 'system') {
      // If currently system, toggle to opposite of current system theme
      const newMode = systemColorScheme === 'dark' ? 'light' : 'dark';
      if (newMode === 'light') {
        await setLightTheme();
      } else {
        await setDarkTheme();
      }
    } else {
      // Toggle between light and dark
      if (themeMode === 'light') {
        await setDarkTheme();
      } else {
        await setLightTheme();
      }
    }
  }, [themeMode, systemColorScheme, setLightTheme, setDarkTheme]);

  // Initialize theme on mount
  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  // Log theme changes for debugging
  useEffect(() => {
    if (!isLoading) {
      console.log(`Theme state updated: mode=${themeMode}, colorScheme=${colorScheme}, isSystem=${isSystemTheme}`);
    }
  }, [themeMode, colorScheme, isSystemTheme, isLoading]);

  // Context value
  const contextValue: ThemeContextState = {
    themeMode,
    colorScheme,
    isSystemTheme,
    selectedModel,
    colors,
    modelColors,
    isLoading,
    setLightTheme,
    setDarkTheme,
    setSystemTheme,
    toggleTheme,
  };

  // Expose updateSelectedModel on the context for external use
  (contextValue as any).updateSelectedModel = updateSelectedModel;

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to use theme context
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new ThemeError(
      'useTheme must be used within a ThemeProvider',
      THEME_ERROR_CODES.CONTEXT_NOT_FOUND
    );
  }
  
  return context;
};

/**
 * Hook to get only colors (lightweight alternative)
 */
export const useThemeColors = () => {
  const { colors } = useTheme();
  return colors;
};

/**
 * Hook to get theme mode and switching functions
 */
export const useThemeMode = () => {
  const { 
    themeMode, 
    isSystemTheme, 
    setLightTheme, 
    setDarkTheme, 
    setSystemTheme, 
    toggleTheme 
  } = useTheme();
  
  return {
    themeMode,
    isSystemTheme,
    setLightTheme,
    setDarkTheme,
    setSystemTheme,
    toggleTheme,
  };
};
