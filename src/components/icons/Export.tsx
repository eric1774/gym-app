import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { IconProps } from './types';

export function Export({ size = 16, color = '#8E9298' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3v13M8 12l4 4 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 20h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
