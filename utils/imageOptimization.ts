/**
 * Image Optimization Utilities
 * Performance optimization for profile picture handling
 */

import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat, ImageResult } from 'expo-image-manipulator';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: SaveFormat;
  compress?: boolean;
}

export interface OptimizedImage {
  uri: string;
  width: number;
  height: number;
  size: number;
  originalSize: number;
  compressionRatio: number;
}

/**
 * Default optimization settings for profile pictures
 */
export const PROFILE_IMAGE_OPTIMIZATION: ImageOptimizationOptions = {
  maxWidth: 512,
  maxHeight: 512,
  quality: 0.8,
  format: SaveFormat.JPEG,
  compress: true,
};

/**
 * Optimize image for profile picture use
 */
export async function optimizeProfileImage(
  imageUri: string,
  options: ImageOptimizationOptions = PROFILE_IMAGE_OPTIMIZATION
): Promise<OptimizedImage> {
  try {
    // Get original file info
    const originalInfo = await FileSystem.getInfoAsync(imageUri);
    const originalSize = (originalInfo.exists && 'size' in originalInfo) ? originalInfo.size || 0 : 0;

    // Prepare manipulation actions
    const actions = [];

    // Resize if needed
    if (options.maxWidth || options.maxHeight) {
      actions.push({
        resize: {
          width: options.maxWidth,
          height: options.maxHeight,
        },
      });
    }

    // Manipulate image
    const result: ImageResult = await manipulateAsync(
      imageUri,
      actions,
      {
        compress: options.quality || 0.8,
        format: options.format || SaveFormat.JPEG,
      }
    );

    // Get optimized file info
    const optimizedInfo = await FileSystem.getInfoAsync(result.uri);
    const optimizedSize = (optimizedInfo.exists && 'size' in optimizedInfo) ? optimizedInfo.size || 0 : 0;

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      size: optimizedSize,
      originalSize,
      compressionRatio: originalSize > 0 ? optimizedSize / originalSize : 1,
    };
  } catch (error) {
    console.error('Image optimization failed:', error);
    throw new Error('Failed to optimize image');
  }
}

/**
 * Create multiple sizes for progressive loading
 */
export async function createImageSizes(
  imageUri: string
): Promise<{
  thumbnail: OptimizedImage;
  medium: OptimizedImage;
  full: OptimizedImage;
}> {
  const [thumbnail, medium, full] = await Promise.all([
    optimizeProfileImage(imageUri, {
      maxWidth: 64,
      maxHeight: 64,
      quality: 0.6,
      format: SaveFormat.JPEG,
    }),
    optimizeProfileImage(imageUri, {
      maxWidth: 256,
      maxHeight: 256,
      quality: 0.7,
      format: SaveFormat.JPEG,
    }),
    optimizeProfileImage(imageUri, PROFILE_IMAGE_OPTIMIZATION),
  ]);

  return { thumbnail, medium, full };
}

/**
 * Estimate upload time based on file size and connection
 */
export function estimateUploadTime(
  fileSizeBytes: number,
  connectionType: 'slow' | 'medium' | 'fast' = 'medium'
): number {
  // Estimated speeds in bytes per second
  const speeds = {
    slow: 50 * 1024, // 50 KB/s (2G)
    medium: 500 * 1024, // 500 KB/s (3G)
    fast: 2 * 1024 * 1024, // 2 MB/s (4G/WiFi)
  };

  const speed = speeds[connectionType];
  return Math.ceil(fileSizeBytes / speed); // Time in seconds
}

/**
 * Check if image needs optimization
 */
export function shouldOptimizeImage(
  width: number,
  height: number,
  sizeBytes: number
): boolean {
  const maxDimension = Math.max(width, height);
  const maxSize = 2 * 1024 * 1024; // 2MB

  return maxDimension > 1024 || sizeBytes > maxSize;
}

/**
 * Get optimal image quality based on size
 */
export function getOptimalQuality(sizeBytes: number): number {
  if (sizeBytes < 500 * 1024) return 0.9; // < 500KB
  if (sizeBytes < 1024 * 1024) return 0.8; // < 1MB
  if (sizeBytes < 2 * 1024 * 1024) return 0.7; // < 2MB
  return 0.6; // >= 2MB
}

/**
 * Preload image for better UX
 */
export async function preloadImage(uri: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = uri;
  });
}

/**
 * Clean up temporary image files
 */
export async function cleanupTempImages(uris: string[]): Promise<void> {
  try {
    await Promise.all(
      uris.map(async (uri) => {
        try {
          const info = await FileSystem.getInfoAsync(uri);
          if (info.exists) {
            await FileSystem.deleteAsync(uri);
          }
        } catch (error) {
          console.warn('Failed to cleanup temp image:', uri, error);
        }
      })
    );
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

/**
 * Memory-efficient image loading with size limits
 */
export async function loadImageSafely(
  uri: string,
  maxMemoryMB: number = 50
): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      return { success: false, error: 'File does not exist' };
    }

    const fileSizeMB = ((info.exists && 'size' in info) ? info.size || 0 : 0) / (1024 * 1024);
    if (fileSizeMB > maxMemoryMB) {
      return {
        success: false,
        error: `File too large (${fileSizeMB.toFixed(1)}MB). Maximum allowed: ${maxMemoryMB}MB`,
      };
    }

    return { success: true, uri };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch process multiple images efficiently
 */
export async function batchOptimizeImages(
  imageUris: string[],
  options: ImageOptimizationOptions = PROFILE_IMAGE_OPTIMIZATION,
  concurrency: number = 2
): Promise<OptimizedImage[]> {
  const results: OptimizedImage[] = [];
  
  for (let i = 0; i < imageUris.length; i += concurrency) {
    const batch = imageUris.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(uri => optimizeProfileImage(uri, options))
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Performance monitoring for image operations
 */
export class ImagePerformanceMonitor {
  private static instance: ImagePerformanceMonitor;
  private metrics: Map<string, number> = new Map();

  static getInstance(): ImagePerformanceMonitor {
    if (!ImagePerformanceMonitor.instance) {
      ImagePerformanceMonitor.instance = new ImagePerformanceMonitor();
    }
    return ImagePerformanceMonitor.instance;
  }

  startTimer(operation: string): void {
    this.metrics.set(operation, Date.now());
  }

  endTimer(operation: string): number {
    const startTime = this.metrics.get(operation);
    if (!startTime) return 0;
    
    const duration = Date.now() - startTime;
    this.metrics.delete(operation);
    return duration;
  }

  getAverageTime(operation: string, samples: number[]): number {
    if (samples.length === 0) return 0;
    return samples.reduce((sum, time) => sum + time, 0) / samples.length;
  }
}
