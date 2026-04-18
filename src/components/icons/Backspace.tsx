import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function Backspace({ size = 22, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 5H9l-6 7 6 7h13a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M15 10l-4 4M11 10l4 4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
