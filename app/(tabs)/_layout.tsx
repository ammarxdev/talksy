import { Tabs, useNavigation } from 'expo-router';
import React, { useRef, useEffect } from 'react';
import { Platform } from 'react-native';

import TabBarBackground from '@/components/ui/TabBarBackground';
import { useModelTheme } from '@/hooks/useModelTheme';

import { useNavigationInterstitialAd } from '@/hooks/useNavigationInterstitialAd';
import { useNavigationState } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';



// Store a ref to the Tabs navigation for external access
let tabsNavigationRef: any = null;
export const getTabsNavigation = () => tabsNavigationRef;



// Direct navigation function that can be called from anywhere
export const navigateToProfileTab = () => {
    console.log('[TABS_LAYOUT] navigateToProfileTab called');
    if (tabsNavigationRef) {
        try {
            tabsNavigationRef.navigate?.('profile');
            return true;
        } catch (e) {
            console.log('[TABS_LAYOUT] navigateToProfileTab failed:', e);
        }
    }
    return false;
};

export default function TabLayout() {
    const navigation = useNavigation();
    const navRef = useRef(navigation);

    useEffect(() => {
        navRef.current = navigation;
        tabsNavigationRef = navigation;
    }, [navigation]);

    React.useEffect(() => {
        console.log('[TABS_LAYOUT] mounted');
    }, []);

    const { modelColors, baseColors, colorScheme } = useModelTheme();
    const isDark = colorScheme === 'dark';

    // Get the current active route to determine theme
    const navigationState = useNavigationState(state => state);
    const activeRouteIndex = navigationState?.index ?? 0;
    const activeRouteName = navigationState?.routes?.[activeRouteIndex]?.name;


    // Determine tab colors based on theme mode and active tab
    const getActiveTabColor = () => {
        if (isDark) {
            return '#FFFFFF'; // White for dark mode
        }
        // Light mode - use theme colors
        if (activeRouteName === 'profile') {
            return '#5A52D5'; // Profile theme color
        }
        return modelColors.primary; // Character theme color
    };

    const getInactiveTabColor = () => {
        // Both dark and light mode - use grey for inactive tabs
        return isDark ? '#6B7280' : '#9CA3AF';
    };

    // Initialize navigation-based interstitial ads
    /* useNavigationInterstitialAd({
        enableTabSwitchAds: true,
        enableScreenNavigationAds: true,
        minNavigationsBeforeAd: 4, // Show ad after 4 tab switches
        cooldownBetweenAds: 90000, // 1.5 minutes between navigation ads
    }); */

    return (
        <Tabs
            tabBar={(props: BottomTabBarProps) => <TabBarBackground {...props} />}
            screenListeners={{
                state: (e) => {
                    console.log('[TABS_LAYOUT] state changed:', e.data?.state?.index);
                },
            }}
            screenOptions={{
                tabBarActiveTintColor: getActiveTabColor(),
                tabBarInactiveTintColor: getInactiveTabColor(),
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    backgroundColor: 'transparent',
                    borderTopWidth: 0,
                    elevation: 0,
                    shadowOpacity: 0,
                    height: 68,
                    paddingTop: 0,
                    paddingBottom: 0,
                },
                tabBarItemStyle: {
                    paddingVertical: Platform.select({ ios: 8, android: 6, default: 6 }),
                    marginHorizontal: 12,
                    borderRadius: 28,
                    backgroundColor: 'transparent',
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    marginTop: 2,
                    textAlign: 'center',
                },
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: '',
                }}
            />

            <Tabs.Screen
                name="profile"
                options={{
                    title: '',
                }}
            />
        </Tabs>
    );
}
