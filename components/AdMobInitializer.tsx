/**
 * AdMob Initializer Component
 * Handles AdMob SDK initialization and provides loading state
 */

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAdMob } from '@/hooks/useAdMob';
import { useTheme } from '@/hooks/useTheme';

interface AdMobInitializerProps {
  children: React.ReactNode;
  showLoadingScreen?: boolean;
}

export function AdMobInitializer({ 
  children, 
  showLoadingScreen = false 
}: AdMobInitializerProps) {
  const { colors } = useTheme();
  const { 
    isInitialized, 
    isInitializing, 
    initializationError,
    initialize 
  } = useAdMob();

  useEffect(() => {
    // Initialize AdMob when component mounts
    initialize();
  }, [initialize]);

  // Show loading screen if requested and still initializing
  if (showLoadingScreen && isInitializing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Initializing ads...
        </Text>
      </View>
    );
  }

  // Log initialization status
  useEffect(() => {
    if (isInitialized) {
      console.log('✅ AdMob ready for use');
    }
  }, [isInitialized]);

  // Show error state if initialization failed
  if (initializationError) {
    console.warn('⚠️ AdMob initialization failed, continuing without ads:', initializationError);
    // Continue rendering children even if ads fail to initialize
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default AdMobInitializer;
