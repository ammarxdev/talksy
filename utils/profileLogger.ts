/**
 * Profile Logger Utility
 * Centralized logging system for profile operations with structured logging,
 * debug modes, performance tracking, and error reporting
 */

import { AvatarUpload } from '@/types/profile';

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

// Log categories for better organization
export enum LogCategory {
  MIME_DETECTION = 'MIME_DETECTION',
  VALIDATION = 'VALIDATION',
  UPLOAD = 'UPLOAD',
  PERFORMANCE = 'PERFORMANCE',
  USER_ACTION = 'USER_ACTION',
  ERROR = 'ERROR',
  NETWORK = 'NETWORK',
  CACHE = 'CACHE',
}

// Configuration interface
interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  enablePerformanceTracking: boolean;
  maxStoredLogs: number;
  categories: LogCategory[];
}

// Log entry structure
interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  userId?: string;
  sessionId: string;
  performance?: {
    duration?: number;
    memoryUsage?: number;
    operationId?: string;
  };
}

// Performance tracking
interface PerformanceTracker {
  operationId: string;
  startTime: number;
  startMemory?: number;
  category: LogCategory;
  operation: string;
}

class ProfileLogger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private sessionId: string;
  private performanceTrackers: Map<string, PerformanceTracker> = new Map();

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: __DEV__ ? LogLevel.DEBUG : LogLevel.WARN,
      enableConsole: true,
      enableStorage: __DEV__,
      enablePerformanceTracking: __DEV__,
      maxStoredLogs: 1000,
      categories: Object.values(LogCategory),
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.initializeLogger();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeLogger(): void {
    if (__DEV__) {
      this.info(LogCategory.USER_ACTION, 'Profile logger initialized', {
        config: this.config,
        sessionId: this.sessionId,
      });
    }
  }

  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    return (
      level >= this.config.level &&
      this.config.categories.includes(category)
    );
  }

  private createLogEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: any,
    performance?: LogEntry['performance']
  ): LogEntry {
    return {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      sessionId: this.sessionId,
      performance,
    };
  }

  private formatLogMessage(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toISOString();
    const category = entry.category;
    
    let message = `[${timestamp}] [${levelName}] [${category}] ${entry.message}`;
    
    if (entry.performance?.duration) {
      message += ` (${entry.performance.duration}ms)`;
    }
    
    return message;
  }

  private outputToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const message = this.formatLogMessage(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data);
        break;
      case LogLevel.INFO:
        console.log(message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(message, entry.data);
        break;
    }
  }

  private storeLog(entry: LogEntry): void {
    if (!this.config.enableStorage) return;

    this.logs.push(entry);
    
    // Maintain max log limit
    if (this.logs.length > this.config.maxStoredLogs) {
      this.logs = this.logs.slice(-this.config.maxStoredLogs);
    }
  }

  private log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: any,
    performance?: LogEntry['performance']
  ): void {
    if (!this.shouldLog(level, category)) return;

    const entry = this.createLogEntry(level, category, message, data, performance);
    
    this.outputToConsole(entry);
    this.storeLog(entry);
  }

  // Public logging methods
  debug(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  info(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  warn(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  error(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.ERROR, category, message, data);
  }

  // Performance tracking methods
  startPerformanceTracking(
    operationId: string,
    category: LogCategory,
    operation: string
  ): void {
    if (!this.config.enablePerformanceTracking) return;

    const tracker: PerformanceTracker = {
      operationId,
      startTime: performance.now(),
      startMemory: this.getMemoryUsage(),
      category,
      operation,
    };

    this.performanceTrackers.set(operationId, tracker);
    this.debug(LogCategory.PERFORMANCE, `Started tracking: ${operation}`, { operationId });
  }

  endPerformanceTracking(operationId: string, additionalData?: any): void {
    if (!this.config.enablePerformanceTracking) return;

    const tracker = this.performanceTrackers.get(operationId);
    if (!tracker) {
      this.warn(LogCategory.PERFORMANCE, `No tracker found for operation: ${operationId}`);
      return;
    }

    const duration = performance.now() - tracker.startTime;
    const currentMemory = this.getMemoryUsage();
    const memoryDelta = currentMemory && tracker.startMemory 
      ? currentMemory - tracker.startMemory 
      : undefined;

    const performanceData = {
      duration,
      memoryUsage: memoryDelta,
      operationId,
    };

    this.info(
      LogCategory.PERFORMANCE,
      `Completed: ${tracker.operation}`,
      {
        ...additionalData,
        performance: performanceData,
      }
    );

    this.performanceTrackers.delete(operationId);
  }

  private getMemoryUsage(): number | undefined {
    try {
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const perfWithMemory = performance as Performance & {
          memory?: {
            usedJSHeapSize: number;
            totalJSHeapSize: number;
            jsHeapSizeLimit: number;
          };
        };
        return perfWithMemory.memory?.usedJSHeapSize;
      }
    } catch (error) {
      // Memory API not available
    }
    return undefined;
  }

  // Specialized logging methods for profile operations
  logMimeDetection(
    originalType: string | null | undefined,
    detectedType: string,
    confidence: string,
    source: string,
    uri: string,
    additionalData?: any
  ): void {
    this.info(LogCategory.MIME_DETECTION, 'MIME type detected', {
      originalType,
      detectedType,
      confidence,
      source,
      uri: this.sanitizeUri(uri),
      ...additionalData,
    });
  }

  logValidationResult(
    isValid: boolean,
    errors: string[],
    warnings: string[],
    details: any
  ): void {
    const level = isValid ? LogLevel.INFO : LogLevel.WARN;
    this.log(level, LogCategory.VALIDATION, 
      isValid ? 'Validation passed' : 'Validation failed', {
      isValid,
      errors,
      warnings,
      details,
    });
  }

  logUploadStart(avatar: AvatarUpload): void {
    this.info(LogCategory.UPLOAD, 'Avatar upload started', {
      type: avatar.type,
      size: avatar.size,
      name: avatar.name,
      uri: this.sanitizeUri(avatar.uri),
    });
  }

  logUploadProgress(progress: number, stage: string, message: string): void {
    this.debug(LogCategory.UPLOAD, `Upload progress: ${progress}%`, {
      progress,
      stage,
      message,
    });
  }

  logUploadComplete(success: boolean, result?: any, error?: any): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    this.log(level, LogCategory.UPLOAD, 
      success ? 'Avatar upload completed' : 'Avatar upload failed', {
      success,
      result: success ? result : undefined,
      error: !success ? error : undefined,
    });
  }

  logUserAction(action: string, data?: any): void {
    this.info(LogCategory.USER_ACTION, `User action: ${action}`, data);
  }

  logNetworkRequest(url: string, method: string, status?: number, duration?: number): void {
    this.debug(LogCategory.NETWORK, `${method} ${url}`, {
      method,
      url: this.sanitizeUri(url),
      status,
      duration,
    });
  }

  // Utility methods
  private sanitizeUri(uri: string): string {
    // Remove sensitive information from URIs for logging
    try {
      const url = new URL(uri);
      return `${url.protocol}//${url.host}${url.pathname}`;
    } catch {
      // Not a valid URL, just return a sanitized version
      return uri.replace(/[?&]([^=]+)=([^&]+)/g, '?$1=***');
    }
  }

  // Log retrieval and management
  getLogs(category?: LogCategory, level?: LogLevel): LogEntry[] {
    return this.logs.filter(log => {
      const categoryMatch = !category || log.category === category;
      const levelMatch = !level || log.level >= level;
      return categoryMatch && levelMatch;
    });
  }

  getLogsSummary(): {
    total: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    sessionId: string;
  } {
    const byLevel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    this.logs.forEach(log => {
      const levelName = LogLevel[log.level];
      byLevel[levelName] = (byLevel[levelName] || 0) + 1;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    });

    return {
      total: this.logs.length,
      byLevel,
      byCategory,
      sessionId: this.sessionId,
    };
  }

  clearLogs(): void {
    this.logs = [];
    this.info(LogCategory.USER_ACTION, 'Logs cleared');
  }

  exportLogs(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      exportTime: new Date().toISOString(),
      config: this.config,
      logs: this.logs,
      summary: this.getLogsSummary(),
    }, null, 2);
  }
}

// Singleton instance
export const profileLogger = new ProfileLogger();

// Convenience functions for common operations
export const logMimeDetection = profileLogger.logMimeDetection.bind(profileLogger);
export const logValidationResult = profileLogger.logValidationResult.bind(profileLogger);
export const logUploadStart = profileLogger.logUploadStart.bind(profileLogger);
export const logUploadProgress = profileLogger.logUploadProgress.bind(profileLogger);
export const logUploadComplete = profileLogger.logUploadComplete.bind(profileLogger);
export const logUserAction = profileLogger.logUserAction.bind(profileLogger);
export const startPerformanceTracking = profileLogger.startPerformanceTracking.bind(profileLogger);
export const endPerformanceTracking = profileLogger.endPerformanceTracking.bind(profileLogger);

// Export types for external use
export type { LogEntry, LoggerConfig };
