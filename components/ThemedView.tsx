import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';
import { useTheme } from '@/hooks/useTheme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  // Use the new theme system for better color management
  const { colors } = useTheme();
  const themeBackgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');
  const backgroundColor = lightColor || darkColor ? themeBackgroundColor : colors.background;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
