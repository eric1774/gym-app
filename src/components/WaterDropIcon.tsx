import React from 'react';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { colors } from '../theme/colors';

export interface WaterDropIconProps {
  size?: number;
  color?: string;
  testID?: string;
}

/**
 * Teardrop icon. Replaces the 💧 emoji in the day-detail nutrition card.
 * 24×24 viewBox so callers can request any rendered size.
 * Includes the spec's inset highlight on the upper-left of the body.
 */
export function WaterDropIcon({
  size = 14,
  color = colors.water,
  testID,
}: WaterDropIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" testID={testID}>
      <Path
        d="M12 2 C7 8, 4 13, 4 16 a8 8 0 0 0 16 0 c0-3-3-8-8-14 z"
        fill={color}
      />
      <Ellipse
        cx={9}
        cy={12}
        rx={1.6}
        ry={2.6}
        fill="#FFFFFF"
        opacity={0.45}
        transform="rotate(-20 9 12)"
      />
    </Svg>
  );
}
