import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { IconProps } from './types';

export function Close({ size = 20, color = '#8E9298' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}
