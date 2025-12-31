/**
 * Legacy Theme Color Hook
 * Maintained for backward compatibility with existing components
 * New components should use the enhanced useTheme hook from @/hooks/useTheme
 */

import { Colors, ColorKey } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

/**
 * Legacy hook for theme colors - maintained for backward compatibility
 * @deprecated Use useTheme or useThemeColor from @/hooks/useTheme instead
 */
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ColorKey
) {
  const { colorScheme, colors } = useTheme();
  const colorFromProps = props[colorScheme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return colors[colorName];
  }
}
