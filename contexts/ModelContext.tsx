/**
 * Model Context
 * Global model selection state management with persistence
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback,
  ReactNode 
} from 'react';
import {
  ModelId,
  ModelInfo,
  ModelSelectionSettings,
  ModelSelectionError,
  MODEL_ERROR_CODES,
  getModelById,
  getDefaultModel,
  AVAILABLE_MODELS,
} from '@/types/models';
import { modelStorage } from '@/utils/modelStorage';

/**
 * Model Context State Interface
 */
interface ModelContextState {
  // Current state
  selectedModel: ModelId;
  selectedModelInfo: ModelInfo;
  availableModels: ModelInfo[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setSelectedModel: (modelId: ModelId) => Promise<boolean>;
  refreshModelSettings: () => Promise<void>;
  clearError: () => void;
}

/**
 * Model Provider Props
 */
interface ModelProviderProps {
  children: ReactNode;
}

/**
 * Model Context
 */
const ModelContext = createContext<ModelContextState | undefined>(undefined);

/**
 * Model Provider Component
 */
export const ModelProvider: React.FC<ModelProviderProps> = ({ children }) => {
  // State
  const [selectedModel, setSelectedModelState] = useState<ModelId>(getDefaultModel().id);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived state
  const selectedModelInfo = getModelById(selectedModel) || getDefaultModel();

  /**
   * Handle errors with user-friendly messages
   */
  const handleError = useCallback((error: any, context: string) => {
    console.error(`Model context error in ${context}:`, error);
    
    let errorMessage: string;
    
    if (error instanceof ModelSelectionError) {
      errorMessage = error.message;
    } else if (error?.message?.includes('AsyncStorage')) {
      errorMessage = 'Unable to save your model selection. Please check your device storage.';
    } else if (error?.message?.includes('Network')) {
      errorMessage = 'Network error. Your model selection will be saved when connection is restored.';
    } else {
      errorMessage = `Failed to ${context}. Please try again.`;
    }
    
    setError(errorMessage);
    return errorMessage;
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Load model settings from storage
   */
  const loadModelSettings = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Loading model selection settings...');
      
      const settings = await modelStorage.loadModelSettings();
      
      setSelectedModelState(settings.selectedModel);
      
      console.log(`Model settings loaded: ${settings.selectedModel}`);
    } catch (error) {
      const errorMessage = handleError(error, 'load model settings');
      // On error, fall back to default model
      setSelectedModelState(getDefaultModel().id);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  /**
   * Set selected model with persistence
   */
  const setSelectedModel = useCallback(async (modelId: ModelId): Promise<boolean> => {
    try {
      setError(null);
      
      console.log(`Setting selected model to: ${modelId}`);
      
      // Validate model ID
      const modelInfo = getModelById(modelId);
      if (!modelInfo) {
        throw new ModelSelectionError(
          `Invalid model ID: ${modelId}`,
          MODEL_ERROR_CODES.INVALID_MODEL
        );
      }
      
      // Save to storage
      await modelStorage.setSelectedModel(modelId);
      
      // Update local state
      setSelectedModelState(modelId);
      
      console.log(`Selected model updated successfully: ${modelId}`);
      return true;
    } catch (error) {
      handleError(error, 'set selected model');
      return false;
    }
  }, [handleError]);

  /**
   * Refresh model settings from storage
   */
  const refreshModelSettings = useCallback(async (): Promise<void> => {
    await loadModelSettings();
  }, [loadModelSettings]);

  /**
   * Initialize model settings on mount
   */
  useEffect(() => {
    loadModelSettings();
  }, [loadModelSettings]);

  // Log model state changes for debugging
  useEffect(() => {
    if (!isLoading) {
      console.log('Model state updated:', {
        selectedModel,
        selectedModelName: selectedModelInfo.name,
        isLoading,
        error,
      });
    }
  }, [selectedModel, selectedModelInfo, isLoading, error]);

  // Context value
  const contextValue: ModelContextState = {
    // Current state
    selectedModel,
    selectedModelInfo,
    availableModels: AVAILABLE_MODELS,
    
    // Loading states
    isLoading,
    error,
    
    // Actions
    setSelectedModel,
    refreshModelSettings,
    clearError,
  };

  return (
    <ModelContext.Provider value={contextValue}>
      {children}
    </ModelContext.Provider>
  );
};

/**
 * Hook to use model context
 */
export const useModel = (): ModelContextState => {
  const context = useContext(ModelContext);
  
  if (context === undefined) {
    throw new ModelSelectionError(
      'useModel must be used within a ModelProvider',
      MODEL_ERROR_CODES.STORAGE_ERROR
    );
  }
  
  return context;
};

/**
 * Hook to get only current model info (lightweight alternative)
 */
export const useCurrentModel = () => {
  const { selectedModel, selectedModelInfo } = useModel();
  return { selectedModel, selectedModelInfo };
};

/**
 * Export default
 */
export default ModelProvider;
