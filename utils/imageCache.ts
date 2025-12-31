/**
 * Image Cache Utility
 * Handles local image caching, offline support, and progressive loading
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

interface CachedImage {
  uri: string;
  localPath: string;
  timestamp: number;
  size: number;
  etag?: string;
}

interface ImageCacheOptions {
  maxAge?: number; // Cache duration in milliseconds
  maxSize?: number; // Max cache size in bytes
  quality?: number; // Image quality (0-1)
}

interface ProgressCallback {
  (progress: number): void;
}

export class ImageCacheService {
  private static instance: ImageCacheService;
  private readonly CACHE_DIR = `${FileSystem.documentDirectory}imageCache/`;
  private readonly CACHE_INDEX_KEY = 'IMAGE_CACHE_INDEX';
  private readonly DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly DEFAULT_MAX_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly DEFAULT_QUALITY = 0.8;

  private cacheIndex: Map<string, CachedImage> = new Map();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): ImageCacheService {
    if (!ImageCacheService.instance) {
      ImageCacheService.instance = new ImageCacheService();
    }
    return ImageCacheService.instance;
  }

  /**
   * Initialize the cache system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure cache directory exists
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
      }

      // Load cache index
      await this.loadCacheIndex();
      
      // Clean up expired entries
      await this.cleanupExpiredEntries();
      
      this.isInitialized = true;
      console.log('Image cache initialized');
    } catch (error) {
      console.error('Failed to initialize image cache:', error);
    }
  }

  /**
   * Get cached image or download and cache it
   */
  public async getCachedImage(
    imageUrl: string, 
    options: ImageCacheOptions = {},
    onProgress?: ProgressCallback
  ): Promise<string> {
    await this.initialize();

    const {
      maxAge = this.DEFAULT_MAX_AGE,
      quality = this.DEFAULT_QUALITY,
    } = options;

    try {
      const cacheKey = await this.generateCacheKey(imageUrl);
      const cachedImage = this.cacheIndex.get(cacheKey);

      // Check if we have a valid cached image
      if (cachedImage && await this.isCacheValid(cachedImage, maxAge)) {
        const fileInfo = await FileSystem.getInfoAsync(cachedImage.localPath);
        if (fileInfo.exists) {
          return cachedImage.localPath;
        }
      }

      // Download and cache the image
      return await this.downloadAndCacheImage(imageUrl, cacheKey, quality, onProgress);
    } catch (error) {
      console.error('Failed to get cached image:', error);
      // Return original URL as fallback
      return imageUrl;
    }
  }

  /**
   * Preload images for offline use
   */
  public async preloadImages(imageUrls: string[], onProgress?: ProgressCallback): Promise<void> {
    await this.initialize();

    const total = imageUrls.length;
    let completed = 0;

    for (const url of imageUrls) {
      try {
        await this.getCachedImage(url);
        completed++;
        onProgress?.(completed / total);
      } catch (error) {
        console.warn('Failed to preload image:', url, error);
        completed++;
        onProgress?.(completed / total);
      }
    }
  }

  /**
   * Check if image is cached
   */
  public async isCached(imageUrl: string): Promise<boolean> {
    await this.initialize();

    try {
      const cacheKey = await this.generateCacheKey(imageUrl);
      const cachedImage = this.cacheIndex.get(cacheKey);
      
      if (!cachedImage) return false;

      const fileInfo = await FileSystem.getInfoAsync(cachedImage.localPath);
      return fileInfo.exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  public async getCacheStats(): Promise<{
    totalSize: number;
    totalFiles: number;
    oldestEntry: number;
    newestEntry: number;
  }> {
    await this.initialize();

    let totalSize = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;

    for (const cachedImage of this.cacheIndex.values()) {
      totalSize += cachedImage.size;
      oldestEntry = Math.min(oldestEntry, cachedImage.timestamp);
      newestEntry = Math.max(newestEntry, cachedImage.timestamp);
    }

    return {
      totalSize,
      totalFiles: this.cacheIndex.size,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Clear cache
   */
  public async clearCache(): Promise<void> {
    await this.initialize();

    try {
      // Remove all cached files
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.CACHE_DIR);
        await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
      }

      // Clear cache index
      this.cacheIndex.clear();
      await AsyncStorage.removeItem(this.CACHE_INDEX_KEY);

      console.log('Image cache cleared');
    } catch (error) {
      console.error('Failed to clear image cache:', error);
    }
  }

  /**
   * Remove specific image from cache
   */
  public async removeFromCache(imageUrl: string): Promise<void> {
    await this.initialize();

    try {
      const cacheKey = await this.generateCacheKey(imageUrl);
      const cachedImage = this.cacheIndex.get(cacheKey);

      if (cachedImage) {
        // Remove file
        const fileInfo = await FileSystem.getInfoAsync(cachedImage.localPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(cachedImage.localPath);
        }

        // Remove from index
        this.cacheIndex.delete(cacheKey);
        await this.saveCacheIndex();
      }
    } catch (error) {
      console.error('Failed to remove image from cache:', error);
    }
  }

  /**
   * Download and cache image
   */
  private async downloadAndCacheImage(
    imageUrl: string,
    cacheKey: string,
    quality: number,
    onProgress?: ProgressCallback
  ): Promise<string> {
    const localPath = `${this.CACHE_DIR}${cacheKey}.jpg`;

    try {
      // Download with progress tracking
      const downloadResult = await FileSystem.downloadAsync(
        imageUrl,
        localPath,
        {
          sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
        }
      );

      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(localPath);

      // Update cache index
      const cachedImage: CachedImage = {
        uri: imageUrl,
        localPath,
        timestamp: Date.now(),
        size: (fileInfo.exists && 'size' in fileInfo) ? fileInfo.size : 0,
      };

      this.cacheIndex.set(cacheKey, cachedImage);
      await this.saveCacheIndex();

      // Check cache size and cleanup if needed
      await this.enforceMaxCacheSize();

      return localPath;
    } catch (error) {
      console.error('Failed to download and cache image:', error);
      
      // Clean up partial download
      try {
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(localPath);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup partial download:', cleanupError);
      }

      throw error;
    }
  }

  /**
   * Generate cache key from URL
   */
  private async generateCacheKey(url: string): Promise<string> {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      url,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    return hash.substring(0, 32); // Use first 32 characters
  }

  /**
   * Check if cached image is still valid
   */
  private async isCacheValid(cachedImage: CachedImage, maxAge: number): Promise<boolean> {
    const age = Date.now() - cachedImage.timestamp;
    return age < maxAge;
  }

  /**
   * Load cache index from storage
   */
  private async loadCacheIndex(): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem(this.CACHE_INDEX_KEY);
      if (indexData) {
        const index = JSON.parse(indexData);
        this.cacheIndex = new Map(Object.entries(index));
      }
    } catch (error) {
      console.warn('Failed to load cache index:', error);
      this.cacheIndex = new Map();
    }
  }

  /**
   * Save cache index to storage
   */
  private async saveCacheIndex(): Promise<void> {
    try {
      const indexObject = Object.fromEntries(this.cacheIndex);
      await AsyncStorage.setItem(this.CACHE_INDEX_KEY, JSON.stringify(indexObject));
    } catch (error) {
      console.warn('Failed to save cache index:', error);
    }
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupExpiredEntries(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, cachedImage] of this.cacheIndex.entries()) {
      if (now - cachedImage.timestamp > this.DEFAULT_MAX_AGE) {
        expiredKeys.push(key);
        
        // Remove file
        try {
          const fileInfo = await FileSystem.getInfoAsync(cachedImage.localPath);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(cachedImage.localPath);
          }
        } catch (error) {
          console.warn('Failed to delete expired cache file:', error);
        }
      }
    }

    // Remove from index
    for (const key of expiredKeys) {
      this.cacheIndex.delete(key);
    }

    if (expiredKeys.length > 0) {
      await this.saveCacheIndex();
      console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Enforce maximum cache size
   */
  private async enforceMaxCacheSize(): Promise<void> {
    const stats = await this.getCacheStats();
    
    if (stats.totalSize <= this.DEFAULT_MAX_SIZE) return;

    // Sort by timestamp (oldest first)
    const sortedEntries = Array.from(this.cacheIndex.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    let removedSize = 0;
    const targetSize = this.DEFAULT_MAX_SIZE * 0.8; // Remove to 80% of max size

    for (const [key, cachedImage] of sortedEntries) {
      if (stats.totalSize - removedSize <= targetSize) break;

      try {
        // Remove file
        const fileInfo = await FileSystem.getInfoAsync(cachedImage.localPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(cachedImage.localPath);
        }

        // Remove from index
        this.cacheIndex.delete(key);
        removedSize += cachedImage.size;
      } catch (error) {
        console.warn('Failed to remove cache file during cleanup:', error);
      }
    }

    if (removedSize > 0) {
      await this.saveCacheIndex();
      console.log(`Cache cleanup: removed ${removedSize} bytes`);
    }
  }
}

// Export singleton instance
export const imageCache = ImageCacheService.getInstance();

// Convenience functions
export const getCachedImage = (url: string, options?: ImageCacheOptions, onProgress?: ProgressCallback) =>
  imageCache.getCachedImage(url, options, onProgress);

export const preloadImages = (urls: string[], onProgress?: ProgressCallback) =>
  imageCache.preloadImages(urls, onProgress);

export const clearImageCache = () => imageCache.clearCache();

export const getImageCacheStats = () => imageCache.getCacheStats();

/**
 * Offline Support Utility
 * Manages offline behavior and network state
 */
import * as Network from 'expo-network';

interface OfflineManager {
  isOnline: boolean;
  networkType: string | null;
  isConnected: boolean;
}

class OfflineSupportService {
  private static instance: OfflineSupportService;
  private networkState: OfflineManager = {
    isOnline: true,
    networkType: null,
    isConnected: true,
  };
  private listeners: ((state: OfflineManager) => void)[] = [];

  private constructor() {
    this.initializeNetworkListener();
  }

  public static getInstance(): OfflineSupportService {
    if (!OfflineSupportService.instance) {
      OfflineSupportService.instance = new OfflineSupportService();
    }
    return OfflineSupportService.instance;
  }

  private async initializeNetworkListener(): Promise<void> {
    try {
      // Check if expo-network is available
      if (Network && Network.getNetworkStateAsync) {
        // Get initial network state
        const networkState = await Network.getNetworkStateAsync();
        this.updateNetworkState(networkState);

        // Use expo-network's event listener if available
        if (Network.addNetworkStateListener) {
          Network.addNetworkStateListener((state: Network.NetworkState) => {
            this.updateNetworkState(state);
          });
        } else {
          // Fallback to periodic checks
          this.startNetworkPolling();
        }
      } else {
        console.warn('expo-network not available, using default online state');
        // Set default state when network module is not available
        this.networkState = {
          isOnline: true,
          networkType: 'unknown',
          isConnected: true,
        };
      }
    } catch (error) {
      console.warn('Failed to initialize network listener:', error);
      // Set default state on error
      this.networkState = {
        isOnline: true,
        networkType: 'unknown',
        isConnected: true,
      };
    }
  }

  private startNetworkPolling(): void {
    // Poll network state every 10 seconds (less frequent to reduce overhead)
    setInterval(async () => {
      try {
        if (Network && Network.getNetworkStateAsync) {
          const networkState = await Network.getNetworkStateAsync();
          this.updateNetworkState(networkState);
        }
      } catch (error) {
        console.warn('Failed to poll network state:', error);
      }
    }, 10000);
  }

  private updateNetworkState(state: Network.NetworkState): void {
    const newState: OfflineManager = {
      isOnline: Boolean(state.isConnected && state.isInternetReachable),
      networkType: state.type || 'unknown',
      isConnected: Boolean(state.isConnected),
    };

    const wasOffline = !this.networkState.isOnline;
    const isNowOnline = newState.isOnline;

    this.networkState = newState;

    // Notify listeners
    this.listeners.forEach(listener => listener(newState));

    // Log network state changes
    if (wasOffline && isNowOnline) {
      console.log('Network: Back online');
    } else if (!wasOffline && !isNowOnline) {
      console.log('Network: Gone offline');
    }
  }

  public getNetworkState(): OfflineManager {
    return { ...this.networkState };
  }

  public isOnline(): boolean {
    return this.networkState.isOnline;
  }

  public addNetworkListener(listener: (state: OfflineManager) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get cached image with offline fallback
   */
  public async getImageWithOfflineSupport(
    imageUrl: string,
    options: ImageCacheOptions = {}
  ): Promise<string> {
    try {
      // Always try cache first
      const cachedUri = await imageCache.getCachedImage(imageUrl, options);

      // If we got a cached version (different from original URL), return it
      if (cachedUri !== imageUrl) {
        return cachedUri;
      }

      // If we're offline, return cached version or original URL
      if (!this.isOnline()) {
        console.log('Offline: Using cached image or original URL');
        return imageUrl;
      }

      // Online: return the result from cache (which may have downloaded it)
      return cachedUri;
    } catch (error) {
      console.error('Failed to get image with offline support:', error);
      return imageUrl;
    }
  }
}

// Export singleton
export const offlineSupport = OfflineSupportService.getInstance();

// Convenience functions
export const isOnline = () => offlineSupport.isOnline();
export const getNetworkState = () => offlineSupport.getNetworkState();
export const addNetworkListener = (listener: (state: OfflineManager) => void) =>
  offlineSupport.addNetworkListener(listener);
export const getImageWithOfflineSupport = (url: string, options?: ImageCacheOptions) =>
  offlineSupport.getImageWithOfflineSupport(url, options);
