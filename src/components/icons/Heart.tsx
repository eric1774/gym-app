import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { IconProps } from './types';

export function Heart({ size = 14, color = '#E0697E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 21s-7-4.5-9.5-9a5.5 5.5 0 0 1 9.5-5 5.5 5.5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9z" />
    </Svg>
  );
}
