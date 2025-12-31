/**
 * Cache Settings Screen
 * Allows users to manage image cache and offline settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useAlert } from '@/contexts/AlertContext';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { 
  getImageCacheStats, 
  clearImageCache, 
  getNetworkState, 
  addNetworkListener 
} from '@/utils/imageCache';

interface CacheStats {
  totalSize: number;
  totalFiles: number;
  oldestEntry: number;
  newestEntry: number;
}

export default function CacheSettingsScreen() {
  const { colors } = useTheme();
  const { showConfirmation, showSuccess, showError } = useAlert();
  
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    totalSize: 0,
    totalFiles: 0,
    oldestEntry: 0,
    newestEntry: 0,
  });
  const [isOnline, setIsOnline] = useState(true);
  const [networkType, setNetworkType] = useState<string>('unknown');
  const [isClearing, setIsClearing] = useState(false);

  // Load cache stats
  const loadCacheStats = async () => {
    try {
      const stats = await getImageCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };

  // Load network state
  const loadNetworkState = () => {
    const networkState = getNetworkState();
    setIsOnline(networkState.isOnline);
    setNetworkType(networkState.networkType || 'unknown');
  };

  useEffect(() => {
    loadCacheStats();
    loadNetworkState();

    // Listen for network changes
    const unsubscribe = addNetworkListener((state) => {
      setIsOnline(state.isOnline);
      setNetworkType(state.networkType || 'unknown');
    });

    return unsubscribe;
  }, []);

  const handleGoBack = () => {
    router.back();
  };

  const handleClearCache = () => {
    showConfirmation(
      'Clear all cached images? This will free up storage space but images will need to be downloaded again.',
      async () => {
        try {
          setIsClearing(true);
          await clearImageCache();
          await loadCacheStats();
          showSuccess('Cache cleared successfully!');
        } catch (error) {
          console.error('Failed to clear cache:', error);
          showError('Failed to clear cache. Please try again.');
        } finally {
          setIsClearing(false);
        }
      },
      undefined,
      'Clear Cache'
    );
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    if (timestamp === 0) return 'Never';
    return new Date(timestamp).toLocaleDateString();
  };

  const SettingsSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {title.toUpperCase()}
      </ThemedText>
      <View style={[styles.sectionContent, { backgroundColor: colors.cardBackground }]}>
        {children}
      </View>
    </View>
  );

  const SettingsItem = ({
    icon,
    title,
    subtitle,
    value,
    onPress,
    rightComponent,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    value?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={[styles.settingsItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.settingsItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
          <IconSymbol name={icon as any} size={20} color={colors.accent} />
        </View>
        <View style={styles.settingsItemText}>
          <ThemedText style={[styles.settingsItemTitle, { color: colors.textPrimary }]}>
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText style={[styles.settingsItemSubtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </ThemedText>
          )}
        </View>
      </View>
      <View style={styles.settingsItemRight}>
        {value && (
          <ThemedText style={[styles.settingsItemValue, { color: colors.textSecondary }]}>
            {value}
          </ThemedText>
        )}
        {rightComponent}
      </View>
    </TouchableOpacity>
  );

  const NetworkStatusIndicator = () => (
    <View style={[
      styles.networkStatus,
      { 
        backgroundColor: isOnline ? colors.success + '20' : colors.error + '20',
        borderColor: isOnline ? colors.success : colors.error,
      }
    ]}>
      <View style={[
        styles.networkDot,
        { backgroundColor: isOnline ? colors.success : colors.error }
      ]} />
      <ThemedText style={[
        styles.networkText,
        { color: isOnline ? colors.success : colors.error }
      ]}>
        {isOnline ? `Online (${networkType})` : 'Offline'}
      </ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Cache Settings
        </ThemedText>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Network Status */}
        <View style={styles.networkContainer}>
          <NetworkStatusIndicator />
        </View>

        {/* Cache Statistics */}
        <SettingsSection title="Cache Statistics">
          <SettingsItem
            icon="internaldrive"
            title="Cache Size"
            subtitle="Total space used by cached images"
            value={formatBytes(cacheStats.totalSize)}
          />
          <SettingsItem
            icon="photo.stack"
            title="Cached Images"
            subtitle="Number of images stored locally"
            value={cacheStats.totalFiles.toString()}
          />
          <SettingsItem
            icon="calendar"
            title="Oldest Entry"
            subtitle="Date of oldest cached image"
            value={formatDate(cacheStats.oldestEntry)}
          />
          <SettingsItem
            icon="clock"
            title="Newest Entry"
            subtitle="Date of newest cached image"
            value={formatDate(cacheStats.newestEntry)}
          />
        </SettingsSection>

        {/* Cache Management */}
        <SettingsSection title="Cache Management">
          <SettingsItem
            icon="trash"
            title="Clear Cache"
            subtitle="Remove all cached images to free up space"
            onPress={handleClearCache}
            rightComponent={
              isClearing ? (
                <Text style={[styles.clearingText, { color: colors.textSecondary }]}>
                  Clearing...
                </Text>
              ) : (
                <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
              )
            }
          />
          <SettingsItem
            icon="arrow.clockwise"
            title="Refresh Stats"
            subtitle="Update cache statistics"
            onPress={loadCacheStats}
            rightComponent={
              <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
            }
          />
        </SettingsSection>

        {/* Cache Information */}
        <SettingsSection title="How Caching Works">
          <View style={styles.infoContainer}>
            <ThemedText style={[styles.infoText, { color: colors.textSecondary }]}>
              • Images are automatically cached when viewed{'\n'}
              • Cached images load faster and work offline{'\n'}
              • Cache is automatically cleaned when it gets too large{'\n'}
              • Images expire after 7 days and are re-downloaded{'\n'}
              • Clearing cache frees up storage space
            </ThemedText>
          </View>
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginRight: 32,
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  networkContainer: {
    padding: 16,
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  networkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 16,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsItemText: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingsItemSubtitle: {
    fontSize: 14,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsItemValue: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  clearingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  infoContainer: {
    padding: 16,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
