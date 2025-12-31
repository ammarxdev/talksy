/**
 * Ad Error Dashboard
 * Comprehensive error monitoring and debugging interface
 * Remove this file before production
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useResilientAdManager } from '@/hooks/useResilientAdManager';
import { adErrorHandler } from '@/services/AdErrorHandler';

export function AdErrorDashboard() {
  const { colors } = useTheme();
  const {
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
  } = useResilientAdManager();

  const [refreshing, setRefreshing] = useState(false);
  const [statusReport, setStatusReport] = useState<any>(null);

  /**
   * Refresh all data
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await performHealthCheck();
      const report = await getStatusReport();
      setStatusReport(report);
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Export error data for debugging
   */
  const handleExportData = async () => {
    try {
      const errorData = adErrorHandler.exportErrorData();
      const networkState = getNetworkState();
      const report = await getStatusReport();

      const exportData = {
        timestamp: new Date().toISOString(),
        managerState,
        healthStatus,
        statusReport: report,
        networkState,
        errorData: JSON.parse(errorData),
      };

      await Share.share({
        message: JSON.stringify(exportData, null, 2),
        title: 'AdMob Error Report',
      });
    } catch (error) {
      Alert.alert('Error', `Failed to export data: ${error}`);
    }
  };

  /**
   * Handle emergency disable
   */
  const handleEmergencyDisable = () => {
    Alert.alert(
      'Emergency Disable Ads',
      'This will disable all ads until app restart. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: () => {
            emergencyDisableAds('Manual emergency disable from dashboard');
            Alert.alert('Success', 'Ads have been disabled');
          },
        },
      ]
    );
  };

  /**
   * Clear all error data
   */
  const handleClearErrors = () => {
    Alert.alert(
      'Clear Error Data',
      'This will clear all error history. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: () => {
            clearErrors();
            Alert.alert('Success', 'Error data cleared');
          },
        },
      ]
    );
  };

  // Auto-refresh data
  useEffect(() => {
    handleRefresh();
    const interval = setInterval(handleRefresh, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const errorStats = getErrorStats();
  const networkState = getNetworkState();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Ad Error Dashboard
        </Text>
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: colors.tint }]}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Text style={[styles.refreshButtonText, { color: colors.background }]}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Health Status */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          System Health
        </Text>
        
        <View style={styles.healthRow}>
          <Text style={[styles.healthLabel, { color: colors.textSecondary }]}>
            Overall Status:
          </Text>
          <Text style={[
            styles.healthValue,
            { 
              color: managerState.isHealthy ? '#4CAF50' : '#FF6B6B',
              fontWeight: 'bold',
            }
          ]}>
            {managerState.isHealthy ? '✅ Healthy' : '❌ Issues Detected'}
          </Text>
        </View>

        <View style={styles.healthRow}>
          <Text style={[styles.healthLabel, { color: colors.textSecondary }]}>
            Can Show Ads:
          </Text>
          <Text style={[
            styles.healthValue,
            { color: shouldShowAds() ? '#4CAF50' : '#FF6B6B' }
          ]}>
            {shouldShowAds() ? '✅ Yes' : '❌ No'}
          </Text>
        </View>

        <View style={styles.healthRow}>
          <Text style={[styles.healthLabel, { color: colors.textSecondary }]}>
            Network Suitable:
          </Text>
          <Text style={[
            styles.healthValue,
            { color: isNetworkSuitable() ? '#4CAF50' : '#FF6B6B' }
          ]}>
            {isNetworkSuitable() ? '✅ Yes' : '❌ No'}
          </Text>
        </View>

        <View style={styles.healthRow}>
          <Text style={[styles.healthLabel, { color: colors.textSecondary }]}>
            Error Rate:
          </Text>
          <Text style={[
            styles.healthValue,
            { 
              color: managerState.errorRate > 10 ? '#FF6B6B' : 
                     managerState.errorRate > 5 ? '#FFA726' : '#4CAF50'
            }
          ]}>
            {managerState.errorRate} errors/24h
          </Text>
        </View>

        <View style={styles.healthRow}>
          <Text style={[styles.healthLabel, { color: colors.textSecondary }]}>
            Recommended Action:
          </Text>
          <Text style={[styles.healthValue, { color: colors.text }]}>
            {managerState.recommendedAction}
          </Text>
        </View>
      </View>

      {/* Network Status */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Network Status
        </Text>
        
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Connected: {networkState.isConnected ? '✅ Yes' : '❌ No'}
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Internet Reachable: {networkState.isInternetReachable ? '✅ Yes' : '❌ No'}
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Type: {networkState.type}
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Signal Strength: {(networkState.strength * 100).toFixed(0)}%
        </Text>
      </View>

      {/* Error Statistics */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Error Statistics
        </Text>
        
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Total Errors: {errorStats.totalErrors}
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Recent Errors (24h): {errorStats.errorRate}
        </Text>
        
        {Object.entries(errorStats.errorsByType).map(([type, count]) => (
          <Text key={type} style={[styles.statusText, { color: colors.textSecondary }]}>
            {type}: {String(count)} errors
          </Text>
        ))}

        {errorStats.recentErrors.length > 0 && (
          <View style={styles.recentErrors}>
            <Text style={[styles.subsectionTitle, { color: colors.text }]}>
              Recent Errors:
            </Text>
            {errorStats.recentErrors.slice(0, 3).map((error: any, index: number) => (
              <Text key={index} style={[styles.errorText, { color: colors.textSecondary }]}>
                {new Date(error.timestamp).toLocaleTimeString()}: {error.userFriendlyMessage}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Health Issues */}
      {healthStatus && healthStatus.issues.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Current Issues
          </Text>
          
          {healthStatus.issues.map((issue, index) => (
            <Text key={index} style={[styles.issueText, { color: '#FF6B6B' }]}>
              • {issue}
            </Text>
          ))}

          {healthStatus.recommendations.length > 0 && (
            <View style={styles.recommendations}>
              <Text style={[styles.subsectionTitle, { color: colors.text }]}>
                Recommendations:
              </Text>
              {healthStatus.recommendations.map((rec, index) => (
                <Text key={index} style={[styles.recommendationText, { color: '#FFA726' }]}>
                  • {rec}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Control Buttons */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Controls
        </Text>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            {refreshing ? 'Refreshing...' : 'Refresh Status'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#4CAF50' }]}
          onPress={handleExportData}
        >
          <Text style={[styles.buttonText, { color: 'white' }]}>
            Export Debug Data
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#FFA726' }]}
          onPress={handleClearErrors}
        >
          <Text style={[styles.buttonText, { color: 'white' }]}>
            Clear Error History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#FF6B6B' }]}
          onPress={handleEmergencyDisable}
        >
          <Text style={[styles.buttonText, { color: 'white' }]}>
            Emergency Disable Ads
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 6,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthLabel: {
    fontSize: 14,
    flex: 1,
  },
  healthValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusText: {
    fontSize: 14,
    marginBottom: 4,
  },
  issueText: {
    fontSize: 14,
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 14,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  recentErrors: {
    marginTop: 12,
  },
  recommendations: {
    marginTop: 12,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  spacer: {
    height: 50,
  },
});

export default AdErrorDashboard;
