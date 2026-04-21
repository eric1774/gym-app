import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import type { IconProps } from './types';

export function Dumbbell({ size = 14, color = '#8E9298' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 5v14M18 5v14" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M6 12h12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Rect x={3} y={7} width={3} height={10} rx={1.5} fill={color} />
      <Rect x={18} y={7} width={3} height={10} rx={1.5} fill={color} />
    </Svg>
  );
}
