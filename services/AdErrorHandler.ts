/**
 * Ad Error Handler Service
 * Centralized error handling for all AdMob-related errors
 */

import { Alert } from 'react-native';
import { adMobService } from './AdMobService';
import { AD_ERROR_MESSAGES } from '@/config/admob';

export interface AdErrorInfo {
  code: number | string;
  message: string;
  adType: string;
  adUnitId?: string;
  timestamp: number;
  userFriendlyMessage: string;
  shouldRetry: boolean;
  retryDelay?: number;
  shouldShowToUser: boolean;
}

export interface ErrorHandlingConfig {
  showUserAlerts: boolean;
  logToConsole: boolean;
  logToAnalytics: boolean;
  enableAutoRetry: boolean;
  maxRetryAttempts: number;
  retryDelayMs: number;
}

class AdErrorHandler {
  private static instance: AdErrorHandler;
  private errorHistory: AdErrorInfo[] = [];
  private readonly MAX_ERROR_HISTORY = 50;

  private config: ErrorHandlingConfig = {
    showUserAlerts: false, // Don't show alerts for ad errors by default
    logToConsole: true,
    logToAnalytics: true,
    enableAutoRetry: true,
    maxRetryAttempts: 3,
    retryDelayMs: 5000,
  };

  private constructor() {}

  static getInstance(): AdErrorHandler {
    if (!AdErrorHandler.instance) {
      AdErrorHandler.instance = new AdErrorHandler();
    }
    return AdErrorHandler.instance;
  }

  /**
   * Handle any AdMob-related error
   */
  handleError(
    error: any,
    adType: string,
    adUnitId?: string,
    context?: string
  ): AdErrorInfo {
    const errorInfo = this.parseError(error, adType, adUnitId, context);
    
    // Add to error history
    this.errorHistory.unshift(errorInfo);
    if (this.errorHistory.length > this.MAX_ERROR_HISTORY) {
      this.errorHistory = this.errorHistory.slice(0, this.MAX_ERROR_HISTORY);
    }

    // Handle based on configuration
    if (this.config.logToConsole) {
      this.logErrorToConsole(errorInfo);
    }

    if (this.config.logToAnalytics) {
      this.logErrorToAnalytics(errorInfo);
    }

    if (this.config.showUserAlerts && errorInfo.shouldShowToUser) {
      this.showUserAlert(errorInfo);
    }

    return errorInfo;
  }

  /**
   * Parse error into structured format
   */
  private parseError(
    error: any,
    adType: string,
    adUnitId?: string,
    context?: string
  ): AdErrorInfo {
    let code: number | string = 'UNKNOWN';
    let message = 'Unknown error occurred';
    let userFriendlyMessage = 'Unable to load advertisement';
    let shouldRetry = true;
    let retryDelay = this.config.retryDelayMs;
    let shouldShowToUser = false;

    // Parse different error types
    if (error && typeof error === 'object') {
      if (error.code !== undefined) {
        code = error.code;
        message = error.message || `Error code: ${error.code}`;
        
        // Map error codes to user-friendly messages
        switch (error.code) {
          case 0: // INTERNAL_ERROR
            userFriendlyMessage = 'Internal ad service error';
            shouldRetry = true;
            retryDelay = 10000; // Longer delay for internal errors
            break;
            
          case 1: // INVALID_REQUEST
            userFriendlyMessage = 'Invalid ad request';
            shouldRetry = false; // Don't retry invalid requests
            break;
            
          case 2: // NETWORK_ERROR
            userFriendlyMessage = 'Network connection issue';
            shouldRetry = true;
            retryDelay = 15000; // Longer delay for network issues
            shouldShowToUser = true; // User might want to know about network issues
            break;
            
          case 3: // NO_FILL
            userFriendlyMessage = 'No ads available';
            shouldRetry = true;
            retryDelay = 30000; // Longer delay when no ads available
            break;
            
          case 4: // INVALID_AD_SIZE
            userFriendlyMessage = 'Invalid ad size configuration';
            shouldRetry = false;
            break;
            
          case 5: // MEDIATION_NO_FILL
            userFriendlyMessage = 'No mediation ads available';
            shouldRetry = true;
            retryDelay = 20000;
            break;
            
          default:
            userFriendlyMessage = 'Advertisement temporarily unavailable';
            shouldRetry = true;
        }
      } else if (error.message) {
        message = error.message;
        
        // Check for common error patterns
        if (message.toLowerCase().includes('network')) {
          code = 'NETWORK';
          userFriendlyMessage = 'Network connection issue';
          shouldShowToUser = true;
        } else if (message.toLowerCase().includes('timeout')) {
          code = 'TIMEOUT';
          userFriendlyMessage = 'Request timed out';
          retryDelay = 10000;
        } else if (message.toLowerCase().includes('initialization')) {
          code = 'INIT_ERROR';
          userFriendlyMessage = 'Ad service not ready';
          shouldRetry = false;
        }
      }
    } else if (typeof error === 'string') {
      message = error;
      userFriendlyMessage = 'Advertisement service issue';
    }

    return {
      code,
      message,
      adType,
      adUnitId,
      timestamp: Date.now(),
      userFriendlyMessage,
      shouldRetry,
      retryDelay,
      shouldShowToUser,
    };
  }

  /**
   * Log error to console with formatting
   */
  private logErrorToConsole(errorInfo: AdErrorInfo): void {
    const timestamp = new Date(errorInfo.timestamp).toLocaleTimeString();
    
    console.group(`❌ AdMob Error [${errorInfo.adType.toUpperCase()}] - ${timestamp}`);
    console.error(`Code: ${errorInfo.code}`);
    console.error(`Message: ${errorInfo.message}`);
    console.error(`User Message: ${errorInfo.userFriendlyMessage}`);
    console.error(`Should Retry: ${errorInfo.shouldRetry}`);
    if (errorInfo.retryDelay) {
      console.error(`Retry Delay: ${errorInfo.retryDelay}ms`);
    }
    if (errorInfo.adUnitId) {
      console.error(`Ad Unit ID: ${errorInfo.adUnitId}`);
    }
    console.groupEnd();
  }

  /**
   * Log error to analytics service
   */
  private logErrorToAnalytics(errorInfo: AdErrorInfo): void {
    try {
      adMobService.logAdEvent('ad_failed_to_load', errorInfo.adType, {
        error_code: errorInfo.code,
        error_message: errorInfo.message,
        ad_unit_id: errorInfo.adUnitId,
        should_retry: errorInfo.shouldRetry,
        retry_delay: errorInfo.retryDelay,
        timestamp: errorInfo.timestamp,
      });
    } catch (error) {
      console.warn('⚠️ Failed to log ad error to analytics:', error);
    }
  }

  /**
   * Show user-friendly alert for critical errors
   */
  private showUserAlert(errorInfo: AdErrorInfo): void {
    // Only show alerts for network errors or critical issues
    if (errorInfo.code === 2 || errorInfo.shouldShowToUser) {
      Alert.alert(
        'Advertisement Issue',
        errorInfo.userFriendlyMessage,
        [
          { text: 'OK', style: 'default' },
          ...(errorInfo.shouldRetry ? [{
            text: 'Retry',
            style: 'default' as const,
            onPress: () => {
              // Trigger retry logic would go here
              console.log('🔄 User requested ad retry');
            }
          }] : [])
        ],
        { cancelable: true }
      );
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByCode: Record<string | number, number>;
    recentErrors: AdErrorInfo[];
    errorRate: number;
  } {
    const now = Date.now();
    const last24Hours = this.errorHistory.filter(e => now - e.timestamp < 24 * 60 * 60 * 1000);
    
    const errorsByType: Record<string, number> = {};
    const errorsByCode: Record<string | number, number> = {};
    
    this.errorHistory.forEach(error => {
      errorsByType[error.adType] = (errorsByType[error.adType] || 0) + 1;
      errorsByCode[error.code] = (errorsByCode[error.code] || 0) + 1;
    });

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      errorsByCode,
      recentErrors: last24Hours.slice(0, 10), // Last 10 recent errors
      errorRate: last24Hours.length, // Errors in last 24 hours
    };
  }

  /**
   * Check if error rate is concerning
   */
  isErrorRateConcerning(): boolean {
    const stats = this.getErrorStats();
    
    // Consider it concerning if more than 10 errors in last 24 hours
    // or if error rate is very high
    return stats.errorRate > 10;
  }

  /**
   * Get recommended action based on error patterns
   */
  getRecommendedAction(): {
    action: 'continue' | 'reduce_frequency' | 'disable_ads' | 'check_network';
    reason: string;
  } {
    const stats = this.getErrorStats();
    
    // Check for network issues
    const networkErrors = stats.errorsByCode[2] || 0;
    if (networkErrors > 5) {
      return {
        action: 'check_network',
        reason: 'Multiple network errors detected',
      };
    }

    // Check for high error rate
    if (stats.errorRate > 15) {
      return {
        action: 'disable_ads',
        reason: 'Very high error rate detected',
      };
    } else if (stats.errorRate > 8) {
      return {
        action: 'reduce_frequency',
        reason: 'High error rate detected',
      };
    }

    return {
      action: 'continue',
      reason: 'Error rate within acceptable limits',
    };
  }

  /**
   * Update error handling configuration
   */
  updateConfig(newConfig: Partial<ErrorHandlingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Ad error handling config updated:', this.config);
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
    console.log('🗑️ Ad error history cleared');
  }

  /**
   * Export error data for debugging
   */
  exportErrorData(): string {
    return JSON.stringify({
      config: this.config,
      errorHistory: this.errorHistory,
      stats: this.getErrorStats(),
      timestamp: Date.now(),
    }, null, 2);
  }
}

// Export singleton instance
export const adErrorHandler = AdErrorHandler.getInstance();
export default adErrorHandler;
