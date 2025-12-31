/**
 * Model Storage Utility
 * AsyncStorage wrapper for model selection preferences with type safety
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ModelId,
  ModelSelectionSettings,
  DEFAULT_MODEL_SELECTION,
  MODEL_STORAGE_KEYS,
  ModelSelectionError,
  MODEL_ERROR_CODES,
  isValidModelId,
  getDefaultModel,
} from '@/types/models';

/**
 * Model Storage Service
 * Handles all model selection persistence with AsyncStorage
 */
export class ModelStorageService {
  private static instance: ModelStorageService;
  private cache: ModelSelectionSettings | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ModelStorageService {
    if (!ModelStorageService.instance) {
      ModelStorageService.instance = new ModelStorageService();
    }
    return ModelStorageService.instance;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return !!(this.cache && (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION);
  }

  /**
   * Load model selection settings from storage
   */
  public async loadModelSettings(): Promise<ModelSelectionSettings> {
    try {
      // Return cached settings if still valid
      if (this.cache && this.isCacheValid()) {
        return this.cache;
      }

      const settingsJson = await AsyncStorage.getItem(MODEL_STORAGE_KEYS.MODEL_SETTINGS);
      
      if (!settingsJson) {
        // No settings found, return defaults and save them
        const defaultSettings = { ...DEFAULT_MODEL_SELECTION };
        await this.saveModelSettings(defaultSettings);
        return defaultSettings;
      }

      const settings = JSON.parse(settingsJson) as ModelSelectionSettings;
      
      // Validate and migrate settings if needed
      const validatedSettings = this.validateAndMigrateSettings(settings);
      
      // Update cache
      this.cache = validatedSettings;
      this.cacheTimestamp = Date.now();
      
      return validatedSettings;
    } catch (error) {
      console.error('Failed to load model selection settings:', error);
      throw new ModelSelectionError(
        'Failed to load model selection settings',
        MODEL_ERROR_CODES.STORAGE_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Save model selection settings to storage
   */
  public async saveModelSettings(settings: ModelSelectionSettings): Promise<void> {
    try {
      // Validate settings before saving
      const validatedSettings = this.validateAndMigrateSettings(settings);
      
      // Update timestamp
      validatedSettings.lastUpdated = new Date().toISOString();
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(
        MODEL_STORAGE_KEYS.MODEL_SETTINGS,
        JSON.stringify(validatedSettings)
      );
      
      // Update cache
      this.cache = validatedSettings;
      this.cacheTimestamp = Date.now();
      
      console.log('Model selection settings saved successfully:', validatedSettings.selectedModel);
    } catch (error) {
      console.error('Failed to save model selection settings:', error);
      throw new ModelSelectionError(
        'Failed to save model selection settings',
        MODEL_ERROR_CODES.STORAGE_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get currently selected model ID
   */
  public async getSelectedModel(): Promise<ModelId> {
    try {
      const settings = await this.loadModelSettings();
      return settings.selectedModel;
    } catch (error) {
      console.warn('Failed to load selected model, using default:', error);
      return getDefaultModel().id;
    }
  }

  /**
   * Set selected model
   */
  public async setSelectedModel(modelId: ModelId): Promise<void> {
    try {
      if (!isValidModelId(modelId)) {
        throw new ModelSelectionError(
          `Invalid model ID: ${modelId}`,
          MODEL_ERROR_CODES.INVALID_MODEL
        );
      }

      const currentSettings = await this.loadModelSettings();
      const updatedSettings: ModelSelectionSettings = {
        ...currentSettings,
        selectedModel: modelId,
        lastUpdated: new Date().toISOString(),
      };

      await this.saveModelSettings(updatedSettings);
      console.log(`Selected model updated to: ${modelId}`);
    } catch (error) {
      console.error('Failed to set selected model:', error);
      throw error instanceof ModelSelectionError 
        ? error 
        : new ModelSelectionError(
            'Failed to set selected model',
            MODEL_ERROR_CODES.SAVE_FAILED,
            error instanceof Error ? error : undefined
          );
    }
  }

  /**
   * Validate and migrate settings if needed
   */
  private validateAndMigrateSettings(settings: any): ModelSelectionSettings {
    // If settings is not an object, return defaults
    if (!settings || typeof settings !== 'object') {
      return { ...DEFAULT_MODEL_SELECTION };
    }

    const validatedSettings: ModelSelectionSettings = {
      selectedModel: isValidModelId(settings.selectedModel) 
        ? settings.selectedModel 
        : DEFAULT_MODEL_SELECTION.selectedModel,
      lastUpdated: settings.lastUpdated || new Date().toISOString(),
      version: settings.version || DEFAULT_MODEL_SELECTION.version,
    };

    // Log if migration occurred
    if (validatedSettings.selectedModel !== settings.selectedModel) {
      console.log(`Migrated invalid model selection from ${settings.selectedModel} to ${validatedSettings.selectedModel}`);
    }

    return validatedSettings;
  }

  /**
   * Clear all model selection data
   */
  public async clearModelSettings(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        MODEL_STORAGE_KEYS.MODEL_SETTINGS,
        MODEL_STORAGE_KEYS.SELECTED_MODEL,
      ]);
      
      // Clear cache
      this.cache = null;
      this.cacheTimestamp = 0;
      
      console.log('Model selection settings cleared');
    } catch (error) {
      console.error('Failed to clear model selection settings:', error);
      throw new ModelSelectionError(
        'Failed to clear model selection settings',
        MODEL_ERROR_CODES.STORAGE_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if model selection data exists
   */
  public async hasModelSettings(): Promise<boolean> {
    try {
      const settingsJson = await AsyncStorage.getItem(MODEL_STORAGE_KEYS.MODEL_SETTINGS);
      return !!settingsJson;
    } catch (error) {
      console.error('Failed to check model settings existence:', error);
      return false;
    }
  }
}

/**
 * Singleton instance for global use
 */
export const modelStorage = ModelStorageService.getInstance();

/**
 * Export default
 */
export default modelStorage;
