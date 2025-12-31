/**
 * Theme Storage Utility
 * AsyncStorage wrapper for theme preferences with type safety and error handling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  ThemeMode, 
  ThemeStorage, 
  ThemeError, 
  THEME_ERROR_CODES 
} from '@/types/theme';
import { THEME_STORAGE_KEY } from '@/constants/Colors';

/**
 * Theme Storage Service
 * Handles all theme preference persistence with AsyncStorage
 */
export class ThemeStorageService implements ThemeStorage {
  private static instance: ThemeStorageService;
  private cache: ThemeMode | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ThemeStorageService {
    if (!ThemeStorageService.instance) {
      ThemeStorageService.instance = new ThemeStorageService();
    }
    return ThemeStorageService.instance;
  }

  /**
   * Save theme preference to storage
   */
  public async saveThemePreference(mode: ThemeMode): Promise<void> {
    try {
      // Validate theme mode
      if (!this.isValidThemeMode(mode)) {
        throw new ThemeError(
          `Invalid theme mode: ${mode}`,
          THEME_ERROR_CODES.INVALID_THEME_MODE
        );
      }

      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      
      // Update cache
      this.cache = mode;
      this.cacheTimestamp = Date.now();
      
      console.log(`Theme preference saved: ${mode}`);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
      
      if (error instanceof ThemeError) {
        throw error;
      }
      
      throw new ThemeError(
        'Failed to save theme preference',
        THEME_ERROR_CODES.STORAGE_ERROR,
        error as Error
      );
    }
  }

  /**
   * Load theme preference from storage
   */
  public async loadThemePreference(): Promise<ThemeMode | null> {
    try {
      // Return cached preference if still valid
      if (this.cache && this.isCacheValid()) {
        return this.cache;
      }

      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      
      if (!savedMode) {
        console.log('No theme preference found in storage');
        return null;
      }

      // Validate the loaded theme mode
      if (!this.isValidThemeMode(savedMode as ThemeMode)) {
        console.warn(`Invalid theme mode found in storage: ${savedMode}`);
        await this.clearThemePreference();
        return null;
      }

      const themeMode = savedMode as ThemeMode;
      
      // Update cache
      this.cache = themeMode;
      this.cacheTimestamp = Date.now();
      
      console.log(`Theme preference loaded: ${themeMode}`);
      return themeMode;
    } catch (error) {
      console.error('Failed to load theme preference:', error);
      throw new ThemeError(
        'Failed to load theme preference',
        THEME_ERROR_CODES.STORAGE_ERROR,
        error as Error
      );
    }
  }

  /**
   * Clear theme preference from storage
   */
  public async clearThemePreference(): Promise<void> {
    try {
      await AsyncStorage.removeItem(THEME_STORAGE_KEY);
      
      // Clear cache
      this.cache = null;
      this.cacheTimestamp = 0;
      
      console.log('Theme preference cleared');
    } catch (error) {
      console.error('Failed to clear theme preference:', error);
      throw new ThemeError(
        'Failed to clear theme preference',
        THEME_ERROR_CODES.STORAGE_ERROR,
        error as Error
      );
    }
  }

  /**
   * Check if cached value is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION;
  }

  /**
   * Validate theme mode
   */
  private isValidThemeMode(mode: string): mode is ThemeMode {
    return ['light', 'dark', 'system'].includes(mode);
  }

  /**
   * Get cache status for debugging
   */
  public getCacheStatus(): { cached: boolean; age: number; value: ThemeMode | null } {
    return {
      cached: this.cache !== null && this.isCacheValid(),
      age: Date.now() - this.cacheTimestamp,
      value: this.cache,
    };
  }

  /**
   * Force cache refresh
   */
  public clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}

// Export singleton instance
export const themeStorage = ThemeStorageService.getInstance();

// Convenience functions for direct use
export const saveThemePreference = (mode: ThemeMode) => 
  themeStorage.saveThemePreference(mode);

export const loadThemePreference = () => 
  themeStorage.loadThemePreference();

export const clearThemePreference = () => 
  themeStorage.clearThemePreference();

/**
 * Migration utility for existing theme preferences
 * Can be used to migrate from old theme storage formats
 */
export const migrateThemePreference = async (): Promise<void> => {
  try {
    // Check for any legacy theme storage keys and migrate if needed
    // This is a placeholder for future migrations
    console.log('Theme preference migration check completed');
  } catch (error) {
    console.error('Theme preference migration failed:', error);
  }
};
