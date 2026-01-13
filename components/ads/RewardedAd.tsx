/**
 * Rewarded Ad Component
 * Displays rewarded video ads in the application
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from '@/components/ThemedText';
import { rewardedAdService } from '@/services/RewardedAdService';
import { AdFallback } from './AdFallback';

export interface RewardedAdProps {
  onRewardEarned?: (reward: { type: string; amount: number }) => void;
  onAdClosed?: () => void;
  adUnitId?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  showButtonLabel?: string;
  containerStyle?: object;
}

export const RewardedAd: React.FC<RewardedAdProps> = ({
  onRewardEarned,
  onAdClosed,
  adUnitId,
  disabled = false,
  children,
  showButtonLabel = 'Watch Video for Reward',
  containerStyle,
}) => {
  const { colors } = useTheme();
  const [isAdReady, setIsAdReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update ad readiness based on service state
  useEffect(() => {
    const updateAdState = () => {
      const state = rewardedAdService.getState();
      setIsAdReady(state.isLoaded);
      setIsLoading(state.isLoading);
      setError(state.error);
    };

    // Set up initial state and listener
    updateAdState();

    // Set up periodic updates
    const interval = setInterval(updateAdState, 2000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  // Set up reward and closed callbacks
  useEffect(() => {
    if (onRewardEarned) {
      rewardedAdService.setOnUserEarnedReward(onRewardEarned);
    }
    if (onAdClosed) {
      rewardedAdService.setOnAdClosed(onAdClosed);
    }
  }, [onRewardEarned, onAdClosed]);

  const handleShowAd = useCallback(async () => {
    if (disabled) {
      Alert.alert('Feature Disabled', 'This feature is currently disabled.');
      return;
    }

    try {
      const canShow = rewardedAdService.canShowAd();
      if (!canShow.canShow) {
        console.log(`❌ Cannot show rewarded ad: ${canShow.reason}`);
        Alert.alert('Cannot Show Ad', canShow.reason || 'Ad is not ready');
        return;
      }

      console.log('🎬 Attempting to show rewarded ad...');
      const result = await rewardedAdService.showAd();
      
      if (!result.success) {
        console.log(`❌ Failed to show rewarded ad: ${result.reason}`);
        Alert.alert('Ad Failed', result.reason || 'Failed to show video ad');
        return;
      }

      console.log('✅ Rewarded ad shown successfully');
    } catch (err) {
      console.error('❌ Error showing rewarded ad:', err);
      Alert.alert('Error', 'An error occurred while showing the video ad');
    }
  }, [disabled]);

  // If disabled, show children or nothing
  if (disabled) {
    return children ? <View style={containerStyle}>{children}</View> : null;
  }

  // If there's an error, show fallback
  if (error) {
    console.log('⚠️ Rewarded ad error:', error);
    return (
      <AdFallback 
        adType="rewarded" 
        errorMessage={error} 
        onRetry={() => {
          setIsLoading(true);
          setError(null);
          rewardedAdService.forceReload();
        }} 
      />
    );
  }

  // If loading, show loading state
  if (isLoading) {
    return (
      <View style={[styles.container, containerStyle, { backgroundColor: colors.surface }]}>
        <ThemedText style={[styles.statusText, { color: colors.textSecondary }]}>
          Loading video ad...
        </ThemedText>
      </View>
    );
  }

  // If ad is not ready, show loading or fallback
  if (!isAdReady) {
    return (
      <AdFallback 
        adType="rewarded" 
        errorMessage="Preparing video reward..." 
        onRetry={() => {
          setIsLoading(true);
          setError(null);
          rewardedAdService.forceReload();
        }} 
      />
    );
  }

  // Ad is ready, show the button to watch
  return (
    <View style={[styles.container, containerStyle, { backgroundColor: colors.surface }]}>
      <TouchableOpacity
        style={[
          styles.adButton,
          { 
            backgroundColor: colors.primary,
            opacity: disabled ? 0.6 : 1,
          }
        ]}
        onPress={handleShowAd}
        disabled={disabled}
      >
        <Text style={[styles.buttonText, { color: colors.surface }]}>
          {showButtonLabel}
        </Text>
      </TouchableOpacity>
      <Text style={[styles.hintText, { color: colors.textSecondary }]}>
        Watch a short video to earn rewards
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  adButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  hintText: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default RewardedAd;