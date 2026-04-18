import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { IconProps } from './types';

export function Flame({ size = 16, color = '#FFB800' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2s4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 1-3s-3 1-3 5a6 6 0 0 0 12 0c0-6-6-10-6-10z" />
    </Svg>
  );
}
