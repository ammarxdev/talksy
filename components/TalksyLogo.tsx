import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface TalksyLogoProps {
  size?: number;
  color?: string;
  animated?: boolean;
}

export default function TalksyLogo({ 
  size = 120, 
  color = '#ffffff',
  animated = false 
}: TalksyLogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Defs>
          <LinearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="100%" stopColor="#f0f0f0" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        
        {/* Outer Circle */}
        <Circle
          cx="60"
          cy="60"
          r="55"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeOpacity="0.3"
        />
        
        {/* Inner Circle */}
        <Circle
          cx="60"
          cy="60"
          r="45"
          fill="url(#logoGradient)"
          fillOpacity="0.1"
        />
        
        {/* Voice Wave Lines */}
        <Path
          d="M 30 60 Q 35 45 40 60 Q 45 75 50 60"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
        />
        
        <Path
          d="M 70 60 Q 75 45 80 60 Q 85 75 90 60"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
        />
        
        {/* Central Microphone Icon */}
        <Circle
          cx="60"
          cy="55"
          r="8"
          fill={color}
        />
        
        <Path
          d="M 52 55 Q 52 45 60 45 Q 68 45 68 55 L 68 65 Q 68 75 60 75 Q 52 75 52 65 Z"
          fill={color}
        />
        
        {/* Microphone Stand */}
        <Path
          d="M 60 75 L 60 85 M 50 85 L 70 85"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* Sound Waves */}
        <Path
          d="M 25 50 Q 30 40 35 50 Q 40 60 45 50"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeOpacity="0.6"
          strokeLinecap="round"
        />
        
        <Path
          d="M 75 50 Q 80 40 85 50 Q 90 60 95 50"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeOpacity="0.6"
          strokeLinecap="round"
        />
        
        <Path
          d="M 20 45 Q 25 30 30 45"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeOpacity="0.4"
          strokeLinecap="round"
        />
        
        <Path
          d="M 90 45 Q 95 30 100 45"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeOpacity="0.4"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
