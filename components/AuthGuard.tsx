import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true
}) => {
  const { user, loading, isPasswordResetFlow } = useAuth();

  useEffect(() => {
    if (!loading) {
      // Special handling for password reset flow
      if (isPasswordResetFlow && user) {
        // User is authenticated via password reset, allow access to reset completion screen
        return;
      }

      if (requireAuth && !user) {
        // User is not authenticated, redirect to auth screen
        router.replace('/auth');
      } else if (!requireAuth && user && !isPasswordResetFlow) {
        // User is authenticated but on auth screen, redirect to main app (unless in password reset flow)
        router.replace('/(tabs)');
      }
    }
  }, [user, loading, requireAuth, isPasswordResetFlow]);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Checking authentication...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Show content based on auth requirements
  if (requireAuth && !user) {
    // This should not happen due to redirect, but just in case
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>Please log in to continue</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!requireAuth && user) {
    // This should not happen due to redirect, but just in case
    return (
      <View style={[styles.container, { backgroundColor: '#f8fafc' }]}>
        <View style={styles.messageContainer}>
          <Text style={[styles.messageText, { color: '#0f172a' }]}>Redirecting to app...</Text>
        </View>
      </View>
    );
  }

  // Render the protected content
  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 15,
    fontWeight: '500',
  },
  messageContainer: {
    alignItems: 'center',
    padding: 20,
  },
  messageText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
  },
});
