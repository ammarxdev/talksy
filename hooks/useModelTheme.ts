/**
 * Model Theme Hook
 * Integrates model selection and theme context for dynamic theming
 */

import { useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useModel } from '@/contexts/ModelContext';
import { ModelId } from '@/types/models';
import { getModelColorPalette, getModelGradient } from '@/constants/ModelThemes';

/**
 * Hook return interface
 */
export interface UseModelThemeReturn {
  // Model information
  selectedModel: ModelId;
  modelName: string;
  
  // Theme information
  themeMode: 'light' | 'dark' | 'system';
  colorScheme: 'light' | 'dark';
  
  // Colors
  baseColors: any; // Base theme colors
  modelColors: any; // Model-specific colors
  
  // Gradient helper
  gradient: string;
  
  // Actions
  setSelectedModel: (modelId: ModelId) => Promise<boolean>;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook that combines model selection and theme context
 * Provides all necessary data for dynamic model-based theming
 */
export const useModelTheme = (): UseModelThemeReturn => {
  // Get model context
  const {
    selectedModel,
    selectedModelInfo,
    setSelectedModel,
    isLoading: modelLoading,
    error: modelError,
  } = useModel();

  // Get theme context
  const {
    themeMode,
    colorScheme,
    colors: baseColors,
    modelColors,
    isLoading: themeLoading,
  } = useTheme();

  // Access the hidden updateSelectedModel function
  const themeContext = useTheme() as any;
  const updateThemeModel = themeContext.updateSelectedModel;

  // Sync model changes with theme context
  useEffect(() => {
    if (updateThemeModel && selectedModel) {
      updateThemeModel(selectedModel);
    }
  }, [selectedModel, updateThemeModel]);

  // Enhanced set model function that updates both contexts
  const enhancedSetSelectedModel = useCallback(
    async (modelId: ModelId): Promise<boolean> => {
      const success = await setSelectedModel(modelId);
      
      // If successful, also update theme context
      if (success && updateThemeModel) {
        updateThemeModel(modelId);
      }
      
      return success;
    },
    [setSelectedModel, updateThemeModel]
  );

  // Get model gradient string
  const gradient = getModelGradient(selectedModel, colorScheme);

  // Combine loading states
  const isLoading = modelLoading || themeLoading;

  return {
    // Model information
    selectedModel,
    modelName: selectedModelInfo?.name || 'Unknown',
    
    // Theme information
    themeMode,
    colorScheme,
    
    // Colors
    baseColors,
    modelColors,
    
    // Gradient helper
    gradient,
    
    // Actions
    setSelectedModel: enhancedSetSelectedModel,
    
    // Loading states
    isLoading,
    error: modelError,
  };
};

/**
 * Lightweight hook that only returns model colors for the current theme
 */
export const useModelColors = () => {
  const { selectedModel } = useModel();
  const { colorScheme } = useTheme();
  
  return getModelColorPalette(selectedModel, colorScheme);
};

/**
 * Hook that returns gradient string for current model and theme
 */
export const useModelGradient = () => {
  const { selectedModel } = useModel();
  const { colorScheme } = useTheme();
  
  return getModelGradient(selectedModel, colorScheme);
};

/**
 * Hook for accessing combined theme and model state (read-only)
 */
export const useThemeState = () => {
  const { selectedModel, selectedModelInfo } = useModel();
  const { themeMode, colorScheme, colors, modelColors } = useTheme();
  
  return {
    selectedModel,
    modelName: selectedModelInfo?.name || 'Unknown',
    themeMode,
    colorScheme,
    baseColors: colors,
    modelColors,
    gradient: getModelGradient(selectedModel, colorScheme),
  };
};
