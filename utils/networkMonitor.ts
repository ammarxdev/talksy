/**
 * Network Monitor Utility
 * Monitors network connectivity for better ad error handling
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  isWifiEnabled: boolean;
  strength: number; // 0-1, signal strength
  lastConnectedTime: number;
  connectionHistory: ConnectionEvent[];
}

interface ConnectionEvent {
  timestamp: number;
  isConnected: boolean;
  type: string;
  reason?: string;
}

class NetworkMonitor {
  private static instance: NetworkMonitor;
  private unsubscribe: (() => void) | null = null;
  private state: NetworkState = {
    isConnected: false,
    isInternetReachable: false,
    type: 'unknown',
    isWifiEnabled: false,
    strength: 0,
    lastConnectedTime: 0,
    connectionHistory: [],
  };

  private readonly MAX_HISTORY = 20;
  private listeners: ((state: NetworkState) => void)[] = [];

  private constructor() {}

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  /**
   * Initialize network monitoring
   */
  async initialize(): Promise<void> {
    try {
      // Get initial state
      const initialState = await NetInfo.fetch();
      this.updateState(initialState);

      // Subscribe to network state changes
      this.unsubscribe = NetInfo.addEventListener(this.handleNetworkChange);

      console.log('✅ Network Monitor initialized');
      console.log(`📶 Initial network state: ${this.state.isConnected ? 'Connected' : 'Disconnected'} (${this.state.type})`);
    } catch (error) {
      console.error('❌ Failed to initialize Network Monitor:', error);
    }
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange = (state: NetInfoState) => {
    const wasConnected = this.state.isConnected;
    this.updateState(state);
    
    // Log connection changes
    if (wasConnected !== this.state.isConnected) {
      const event: ConnectionEvent = {
        timestamp: Date.now(),
        isConnected: this.state.isConnected,
        type: this.state.type,
        reason: this.state.isConnected ? 'connection_restored' : 'connection_lost',
      };

      this.state.connectionHistory.unshift(event);
      if (this.state.connectionHistory.length > this.MAX_HISTORY) {
        this.state.connectionHistory = this.state.connectionHistory.slice(0, this.MAX_HISTORY);
      }

      console.log(`📶 Network ${this.state.isConnected ? 'connected' : 'disconnected'}: ${this.state.type}`);
      
      // Notify listeners
      this.notifyListeners();
    }
  };

  /**
   * Update internal state from NetInfo state
   */
  private updateState(netInfoState: NetInfoState): void {
    const isConnected = netInfoState.isConnected === true;
    const isInternetReachable = netInfoState.isInternetReachable === true;

    this.state = {
      ...this.state,
      isConnected,
      isInternetReachable,
      type: netInfoState.type || 'unknown',
      isWifiEnabled: netInfoState.type === 'wifi',
      strength: this.calculateSignalStrength(netInfoState),
      lastConnectedTime: isConnected ? Date.now() : this.state.lastConnectedTime,
    };
  }

  /**
   * Calculate signal strength from NetInfo data
   */
  private calculateSignalStrength(state: NetInfoState): number {
    if (!state.isConnected) return 0;

    // For WiFi, use signal strength if available
    if (state.type === 'wifi' && state.details && 'strength' in state.details) {
      return (state.details.strength as number) / 100;
    }

    // For cellular, use signal strength if available
    if (state.type === 'cellular' && state.details && 'cellularGeneration' in state.details) {
      // Rough estimation based on cellular generation
      const generation = state.details.cellularGeneration;
      switch (generation) {
        case '5g': return 0.9;
        case '4g': return 0.8;
        case '3g': return 0.6;
        case '2g': return 0.4;
        default: return 0.5;
      }
    }

    // Default strength for connected state
    return state.isConnected ? 0.7 : 0;
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('❌ Error notifying network listener:', error);
      }
    });
  }

  /**
   * Get current network state
   */
  getState(): NetworkState {
    return { ...this.state };
  }

  /**
   * Check if network is suitable for ads
   */
  isNetworkSuitableForAds(): {
    suitable: boolean;
    reason: string;
    confidence: number;
  } {
    if (!this.state.isConnected) {
      return {
        suitable: false,
        reason: 'No network connection',
        confidence: 1.0,
      };
    }

    if (!this.state.isInternetReachable) {
      return {
        suitable: false,
        reason: 'Internet not reachable',
        confidence: 0.9,
      };
    }

    // Check signal strength
    if (this.state.strength < 0.3) {
      return {
        suitable: false,
        reason: 'Weak network signal',
        confidence: 0.8,
      };
    }

    // Check for recent connection issues
    const recentDisconnections = this.state.connectionHistory
      .filter(event => 
        Date.now() - event.timestamp < 60000 && // Last minute
        !event.isConnected
      ).length;

    if (recentDisconnections > 2) {
      return {
        suitable: false,
        reason: 'Unstable network connection',
        confidence: 0.7,
      };
    }

    return {
      suitable: true,
      reason: 'Network connection is stable',
      confidence: this.state.strength,
    };
  }

  /**
   * Add network state listener
   */
  addListener(listener: (state: NetworkState) => void): () => void {
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
   * Get network statistics
   */
  getNetworkStats(): {
    uptime: number;
    downtime: number;
    connectionChanges: number;
    averageStrength: number;
    currentUptime: number;
  } {
    const now = Date.now();
    const last24Hours = this.state.connectionHistory.filter(
      event => now - event.timestamp < 24 * 60 * 60 * 1000
    );

    let uptime = 0;
    let downtime = 0;
    let connectionChanges = last24Hours.length;

    // Calculate uptime/downtime
    for (let i = 0; i < last24Hours.length - 1; i++) {
      const current = last24Hours[i];
      const next = last24Hours[i + 1];
      const duration = current.timestamp - next.timestamp;

      if (current.isConnected) {
        uptime += duration;
      } else {
        downtime += duration;
      }
    }

    const currentUptime = this.state.isConnected 
      ? now - this.state.lastConnectedTime 
      : 0;

    return {
      uptime,
      downtime,
      connectionChanges,
      averageStrength: this.state.strength,
      currentUptime,
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners = [];
    console.log('🗑️ Network Monitor destroyed');
  }
}

// Export singleton instance
export const networkMonitor = NetworkMonitor.getInstance();
export default networkMonitor;
