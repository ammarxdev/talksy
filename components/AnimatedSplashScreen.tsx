import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import TalksyLogoWhite from './TalksyLogoWhite';

interface AnimatedSplashScreenProps {
  onAnimationComplete?: () => void;
  children?: React.ReactNode;
}

const { width, height } = Dimensions.get('window');

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function AnimatedSplashScreen({ 
  onAnimationComplete, 
  children 
}: AnimatedSplashScreenProps) {
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const logoFadeAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.3)).current;
  const textSlideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    async function prepare() {
      try {
        // Set status bar style for splash screen
        StatusBar.setBarStyle('light-content', true);
        if (Platform.OS === 'android') {
          StatusBar.setBackgroundColor('#667eea', true);
        }

        // Simulate loading time (replace with actual loading logic)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setIsReady(true);
      } catch (e) {
        console.warn(e);
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (isReady) {
      startAnimations();
    }
  }, [isReady]);

  const startAnimations = () => {

    // Main entrance animation
    const entranceAnimation = Animated.sequence([
      // Logo entrance
      Animated.parallel([
        Animated.timing(logoFadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // Text slide up
      Animated.timing(textSlideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      // Hold for display
      Animated.delay(1500),
      // Exit animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]);

    entranceAnimation.start(() => {
      setShowSplash(false);
      SplashScreen.hideAsync();
      
      // Reset status bar
      StatusBar.setBarStyle('dark-content', true);
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent', true);
      }
      
      onAnimationComplete?.();
    });
  };



  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.splashContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Background Pattern */}
          <View style={styles.backgroundPattern}>
            {[...Array(15)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.patternDot,
                  {
                    left: Math.random() * width,
                    top: Math.random() * height,
                  },
                ]}
              />
            ))}
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {/* Logo Container */}
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  opacity: logoFadeAnim,
                  transform: [{ scale: logoScaleAnim }],
                },
              ]}
            >
              {/* Talksy Logo */}
              <TalksyLogoWhite size={200} showText={false} />
            </Animated.View>

            {/* App Name */}
            <Animated.View
              style={[
                styles.textContainer,
                {
                  opacity: logoFadeAnim,
                  transform: [{ translateY: textSlideAnim }],
                },
              ]}
            >
              <Text style={styles.appName}>Talksy</Text>
              <Text style={styles.tagline}>Your AI Voice Assistant</Text>
            </Animated.View>
          </View>

          {/* Bottom Branding */}
          <Animated.View
            style={[
              styles.bottomBranding,
              { opacity: logoFadeAnim },
            ]}
          >
            <Text style={styles.brandText}>Powered by ByteBrew Technologies</Text>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
      
      {/* Render children behind splash screen */}
      <View style={styles.hiddenContent}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  hiddenContent: {
    flex: 1,
    opacity: 0,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  patternDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '300',
    letterSpacing: 1.5,
  },
  bottomBranding: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  brandText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '300',
    letterSpacing: 0.8,
  },
});
