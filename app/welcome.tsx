import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import TalksyLogo from '@/components/TalksyLogo';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      // After 5 seconds, route depending on auth state
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/auth');
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [user]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ThemedView style={styles.container}>
        <TalksyLogo size={120} color={colors.accent} />

        <ThemedText type="title" style={styles.title}>
          Welcome
        </ThemedText>

        <ThemedText type="default" style={[styles.subtitle, { color: colors.textSecondary }]}>
          Talksy is ready to help you.
        </ThemedText>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
});
