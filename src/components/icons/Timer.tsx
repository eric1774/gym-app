import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import type { IconProps } from './types';

export function Timer({ size = 16, color = '#FACC15' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="13" r="8" stroke={color} strokeWidth={2} />
      <Path d="M12 9v4l2 2M9 3h6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
