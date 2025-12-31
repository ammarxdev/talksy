// Performance monitoring and optimization utilities

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(label: string): void {
    this.startTimes.set(label, Date.now());
  }

  endTimer(label: string): number {
    const startTime = this.startTimes.get(label);
    if (!startTime) {
      return 0;
    }

    const duration = Date.now() - startTime;
    this.startTimes.delete(label);

    // Store metric
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(duration);

    return duration;
  }

  getAverageTime(label: string): number {
    const times = this.metrics.get(label);
    if (!times || times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getMetrics(): Record<string, { average: number; count: number; latest: number }> {
    const result: Record<string, { average: number; count: number; latest: number }> = {};
    
    this.metrics.forEach((times, label) => {
      result[label] = {
        average: this.getAverageTime(label),
        count: times.length,
        latest: times[times.length - 1] || 0,
      };
    });

    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }

  logSummary(): void {
    // Performance summary logging disabled for production
    // Metrics are available via getMetrics() but not logged to console
  }
}

// Debounce utility for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for performance optimization
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Memory usage monitoring (disabled for production)
export function logMemoryUsage(_label?: string): void {
  // Memory usage logging disabled for production
}

// Performance timing decorator
export function timed(label?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const timerLabel = label || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const monitor = PerformanceMonitor.getInstance();
      monitor.startTimer(timerLabel);
      
      try {
        const result = await method.apply(this, args);
        return result;
      } finally {
        monitor.endTimer(timerLabel);
      }
    };
  };
}

// Audio file size optimization
export function optimizeAudioForUpload(audioUri: string): Promise<string> {
  // In a real implementation, you might compress the audio file
  // For now, we'll just return the original URI
  return Promise.resolve(audioUri);
}

// Network request optimization
export function createOptimizedFetch() {
  const requestCache = new Map<string, Promise<any>>();
  
  return async function optimizedFetch(url: string, options?: RequestInit): Promise<Response> {
    const cacheKey = `${url}-${JSON.stringify(options)}`;
    
    // Return cached promise if it exists and is still pending
    if (requestCache.has(cacheKey)) {
      return requestCache.get(cacheKey);
    }
    
    const fetchPromise = fetch(url, options);
    requestCache.set(cacheKey, fetchPromise);
    
    // Clean up cache after request completes
    fetchPromise.finally(() => {
      setTimeout(() => requestCache.delete(cacheKey), 5000); // Cache for 5 seconds
    });
    
    return fetchPromise;
  };
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();
