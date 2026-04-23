import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import type { IconProps } from './types';

export function Scale({ size = 64, color = '#8DC28A' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Rect x="6" y="10" width="36" height="30" rx="4" stroke={color} strokeWidth="2" />
      <Rect x="14" y="14" width="20" height="4" rx="1" fill={color} opacity="0.5" />
      <Circle cx="24" cy="28" r="6" stroke={color} strokeWidth="2" />
      <Path d="M24 23 L24 28" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}
