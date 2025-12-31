/**
 * useResilientAdManager Hook
 * React hook for monitoring ad system health and handling errors
 */

import { useState, useEffect, useCallback } from 'react';
import { resilientAdManager, type AdManagerState, type HealthCheckResult } from '@/services/ResilientAdManager';
import { adErrorHandler } from '@/services/AdErrorHandler';
import { networkMonitor } from '@/utils/networkMonitor';

export interface UseResilientAdManagerResult {
  // State
  managerState: AdManagerState;
  healthStatus: HealthCheckResult | null;
  
  // Control functions
  performHealthCheck: () => Promise<HealthCheckResult>;
  shouldShowAds: () => boolean;
  getStatusReport: () => any;
  
  // Error handling
  getErrorStats: () => any;
  clearErrors: () => void;
  emergencyDisableAds: (reason: string) => void;
  
  // Network monitoring
  isNetworkSuitable: () => boolean;
  getNetworkState: () => any;
}

export function useResilientAdManager(): UseResilientAdManagerResult {
  const [managerState, setManagerState] = useState<AdManagerState>(
    resilientAdManager.getState()
  );
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(null);

  /**
   * Update manager state
   */
  const updateManagerState = useCallback(() => {
    setManagerState(resilientAdManager.getState());
  }, []);

  /**
   * Perform health check
   */
  const performHealthCheck = useCallback(async (): Promise<HealthCheckResult> => {
    const result = await resilientAdManager.performHealthCheck();
    setHealthStatus(result);
    updateManagerState();
    return result;
  }, [updateManagerState]);

  /**
   * Check if ads should be shown
   */
  const shouldShowAds = useCallback((): boolean => {
    return resilientAdManager.shouldShowAds();
  }, []);

  /**
   * Get comprehensive status report
   */
  const getStatusReport = useCallback(async () => {
    return await resilientAdManager.getStatusReport();
  }, []);

  /**
   * Get error statistics
   */
  const getErrorStats = useCallback(() => {
    return adErrorHandler.getErrorStats();
  }, []);

  /**
   * Clear error history
   */
  const clearErrors = useCallback(() => {
    adErrorHandler.clearErrorHistory();
    updateManagerState();
  }, [updateManagerState]);

  /**
   * Emergency disable ads
   */
  const emergencyDisableAds = useCallback((reason: string) => {
    resilientAdManager.emergencyDisableAds(reason);
    updateManagerState();
  }, [updateManagerState]);

  /**
   * Check if network is suitable for ads
   */
  const isNetworkSuitable = useCallback(() => {
    const networkCheck = networkMonitor.isNetworkSuitableForAds();
    return networkCheck.suitable;
  }, []);

  /**
   * Get current network state
   */
  const getNetworkState = useCallback(() => {
    return networkMonitor.getState();
  }, []);

  /**
   * Set up periodic state updates
   */
  useEffect(() => {
    // Initial health check
    performHealthCheck();

    // Set up periodic updates
    const interval = setInterval(() => {
      updateManagerState();
    }, 10000); // Update every 10 seconds

    return () => {
      clearInterval(interval);
    };
  }, [performHealthCheck, updateManagerState]);

  /**
   * Monitor network changes
   */
  useEffect(() => {
    const unsubscribe = networkMonitor.addListener(() => {
      updateManagerState();
    });

    return unsubscribe;
  }, [updateManagerState]);

  return {
    managerState,
    healthStatus,
    performHealthCheck,
    shouldShowAds,
    getStatusReport,
    getErrorStats,
    clearErrors,
    emergencyDisableAds,
    isNetworkSuitable,
    getNetworkState,
  };
}

export default useResilientAdManager;
