import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

interface TalksyLogoWhiteProps {
  size?: number;
  showText?: boolean;
}

export default function TalksyLogoWhite({ 
  size = 200, 
  showText = true 
}: TalksyLogoWhiteProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id="whiteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="100%" stopColor="#f8f9fa" stopOpacity="0.9" />
          </LinearGradient>
        </Defs>
        
        {/* Outer glow circle */}
        <Circle
          cx="100"
          cy="100"
          r="85"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeOpacity="0.3"
        />
        
        {/* Main background circle */}
        <Circle
          cx="100"
          cy="100"
          r="70"
          fill="url(#whiteGradient)"
          fillOpacity="0.15"
        />
        
        {/* Voice wave lines - left side */}
        <Path
          d="M 40 100 Q 50 80 60 100 Q 70 120 80 100"
          fill="none"
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />
        
        {/* Voice wave lines - right side */}
        <Path
          d="M 120 100 Q 130 80 140 100 Q 150 120 160 100"
          fill="none"
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />
        
        {/* Central microphone body */}
        <Path
          d="M 85 85 Q 85 70 100 70 Q 115 70 115 85 L 115 105 Q 115 120 100 120 Q 85 120 85 105 Z"
          fill="#ffffff"
          fillOpacity="0.95"
        />
        
        {/* Microphone grille lines */}
        <Path
          d="M 90 80 L 110 80 M 90 90 L 110 90 M 90 100 L 110 100 M 90 110 L 110 110"
          stroke="#667eea"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />
        
        {/* Microphone stand */}
        <Path
          d="M 100 120 L 100 135 M 85 135 L 115 135"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          fillOpacity="0.9"
        />
        
        {/* Sound waves - outer left */}
        <Path
          d="M 25 90 Q 35 70 45 90 Q 55 110 65 90"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          strokeOpacity="0.6"
          strokeLinecap="round"
        />
        
        {/* Sound waves - outer right */}
        <Path
          d="M 135 90 Q 145 70 155 90 Q 165 110 175 90"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          strokeOpacity="0.6"
          strokeLinecap="round"
        />
        
        {/* Sound waves - far left */}
        <Path
          d="M 15 85 Q 20 65 25 85"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeOpacity="0.4"
          strokeLinecap="round"
        />
        
        {/* Sound waves - far right */}
        <Path
          d="M 175 85 Q 180 65 185 85"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeOpacity="0.4"
          strokeLinecap="round"
        />
        
        {/* App name text */}
        {showText && (
          <SvgText
            x="100"
            y="170"
            textAnchor="middle"
            fontSize="24"
            fontWeight="bold"
            fill="#ffffff"
            fillOpacity="0.95"
            fontFamily="Arial, sans-serif"
          >
            Talksy
          </SvgText>
        )}
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
