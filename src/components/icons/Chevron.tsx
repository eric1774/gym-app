import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { Dir, IconProps } from './types';

interface ChevronProps extends IconProps {
  dir?: Dir;
}

function rotationFor(dir: Dir): string {
  switch (dir) {
    case 'up':    return '180deg';
    case 'right': return '-90deg';
    case 'left':  return '90deg';
    default:      return '0deg';
  }
}

export function Chevron({ size = 18, color = '#8E9298', dir = 'down' }: ChevronProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: [{ rotate: rotationFor(dir) }] }}>
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
