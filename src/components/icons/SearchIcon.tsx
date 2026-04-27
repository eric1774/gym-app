import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import type { IconProps } from './types';

export function SearchIcon({ size = 16, color = '#8E9298' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={1.6} />
      <Path d="M16 16l4 4" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}
