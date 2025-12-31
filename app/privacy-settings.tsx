/**
 * Privacy Settings Screen
 * Allows users to manage their privacy and ad consent preferences
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { PrivacySettings } from '@/components/privacy/PrivacySettings';
import { useTheme } from '@/hooks/useTheme';

export default function PrivacySettingsScreen() {
  const { colors } = useTheme();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Privacy & Ads',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            color: colors.text,
          },
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PrivacySettings />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
