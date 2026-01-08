import React from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

// Apply WebGL patches early to fix React Three Fiber issues
import '@/utils/webglPatch';



import { AuthProvider } from '@/contexts/AuthContext';
import { AlertProvider } from '@/contexts/AlertContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ModelProvider } from '@/contexts/ModelContext';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { AdMobInitializer } from '@/components/AdMobInitializer';
import { ConsentInitializer } from '@/components/privacy/ConsentInitializer';
import { useTheme, useStatusBarStyle } from '@/hooks/useTheme';
import { appStateInterstitialManager } from '@/utils/appStateInterstitialManager';
import { resilientAdManager } from '@/services/ResilientAdManager';

/**
 * Inner layout component that has access to theme context
 */
function AppLayout() {
  const { colorScheme } = useTheme();
  const statusBarStyle = useStatusBarStyle();

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={statusBarStyle} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Initialize app state interstitial manager and resilient ad manager
  React.useEffect(() => {
    const initializeAdSystems = async () => {
      try {
        // Initialize resilient ad manager first
        await resilientAdManager.initialize();

        // Then initialize app state manager
        appStateInterstitialManager.initialize({
          showOnAppResume: true,
          minBackgroundTime: 45000, // 45 seconds
          maxAdsPerSession: 2, // Conservative limit
          cooldownBetweenAds: 240000, // 4 minutes
        });

        console.log('✅ All ad systems initialized');
      } catch (error) {
        console.error('❌ Failed to initialize ad systems:', error);
      }
    };

    initializeAdSystems();

    return () => {
      resilientAdManager.destroy();
      appStateInterstitialManager.destroy();
    };
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <ProfileProvider>
          <ModelProvider>
            <AlertProvider>
              <PermissionProvider>
                <NotificationProvider>
                  <ConsentInitializer
                    onConsentComplete={(canRequestAds) => {
                      console.log(`🔐 Consent initialization complete. Can request ads: ${canRequestAds}`);
                    }}
                  >
                    <AdMobInitializer>
                      <AppLayout />
                    </AdMobInitializer>
                  </ConsentInitializer>
                </NotificationProvider>
              </PermissionProvider>
            </AlertProvider>
          </ModelProvider>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
