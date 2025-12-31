/**
 * Model Selection Types
 * Defines types and interfaces for the model selection feature
 */

// Available model identifiers
export type ModelId = 'model1' | 'model2' | 'model3' | 'model4' | 'model5' | 'model6';

// Model information
export interface ModelInfo {
  id: ModelId;
  name: string;
  description: string;
  imagePath: any; // Imported image asset
  isDefault?: boolean;
}

// Model selection settings
export interface ModelSelectionSettings {
  selectedModel: ModelId;
  lastUpdated: string; // ISO timestamp
  version: number; // For future migrations
}

// Default model selection settings
export const DEFAULT_MODEL_SELECTION: ModelSelectionSettings = {
  selectedModel: 'model2', // Current default model
  lastUpdated: new Date().toISOString(),
  version: 1,
};

// Storage keys for AsyncStorage
export const MODEL_STORAGE_KEYS = {
  SELECTED_MODEL: '@voice_assistant/selected_model',
  MODEL_SETTINGS: '@voice_assistant/model_settings',
} as const;

// Error codes for model selection
export enum MODEL_ERROR_CODES {
  STORAGE_ERROR = 'STORAGE_ERROR',
  INVALID_MODEL = 'INVALID_MODEL',
  LOAD_FAILED = 'LOAD_FAILED',
  SAVE_FAILED = 'SAVE_FAILED',
}

// Model selection error class
export class ModelSelectionError extends Error {
  public code: MODEL_ERROR_CODES;
  public originalError?: Error;

  constructor(message: string, code: MODEL_ERROR_CODES, originalError?: Error) {
    super(message);
    this.name = 'ModelSelectionError';
    this.code = code;
    this.originalError = originalError;
  }
}

// Available models configuration
export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'model1',
    name: 'Maya',
    description: 'Friendly and approachable',
    imagePath: require('../assets/models/model1.png'),
  },
  {
    id: 'model2',
    name: 'Alex',
    description: 'Professional and reliable',
    imagePath: require('../assets/models/model2.png'),
    isDefault: true,
  },
  {
    id: 'model3',
    name: 'Sam',
    description: 'Creative and energetic',
    imagePath: require('../assets/models/model3.png'),
  },
  {
    id: 'model4',
    name: 'Jordan',
    description: 'Calm and thoughtful',
    imagePath: require('../assets/models/model4.png'),
  },
  {
    id: 'model5',
    name: 'Taylor',
    description: 'Modern and stylish',
    imagePath: require('../assets/models/model5.png'),
  },
  {
    id: 'model6',
    name: 'Riley',
    description: 'Cheerful and optimistic',
    imagePath: require('../assets/models/model6.png'),
  },
];

// Helper function to get model info by ID
export function getModelById(id: ModelId): ModelInfo | undefined {
  return AVAILABLE_MODELS.find(model => model.id === id);
}

// Helper function to get default model
export function getDefaultModel(): ModelInfo {
  return AVAILABLE_MODELS.find(model => model.isDefault) || AVAILABLE_MODELS[1];
}

// Validation function for model ID
export function isValidModelId(id: string): id is ModelId {
  return AVAILABLE_MODELS.some(model => model.id === id);
}
