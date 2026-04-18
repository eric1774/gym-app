import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { IconProps } from './types';

export function Check({ size = 18, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12l5 5L20 6" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
