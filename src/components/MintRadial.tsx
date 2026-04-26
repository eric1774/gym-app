import React from 'react';
import { View, ViewStyle } from 'react-native';
import { GradientBackdrop } from './GradientBackdrop';
import { colors } from '../theme/colors';

export interface MintRadialProps {
  /** Square dimension in pixels. Default 280. */
  size?: number;
  /** Vertical offset (negative = above parent). Default -70. */
  top?: number;
  /** Horizontal offset (negative = beyond left edge). Default -50. Ignored if corner='tr'. */
  left?: number;
  /** Mirrored horizontal offset for corner='tr'. Default -50. */
  right?: number;
  /** Which corner to anchor: top-left ('tl', default) or top-right ('tr'). */
  corner?: 'tl' | 'tr';
  /** Base color of the radial. Default colors.accent (mint). */
  tint?: string;
  /** Test ID for the wrapper view. */
  testID?: string;
}

/**
 * Atmospheric corner gradient — a soft radial fading to transparent.
 * Used at the top-left of CalendarScreen and CalendarDayDetailScreen,
 * and reused (with tint=prGold, corner='tr') inside the PR callout.
 *
 * The radial is centered inside the wrapper box so the brightest pixel
 * falls within the visible area of the parent (the wrapper is offset
 * partly outside the parent for soft falloff at the edges).
 */
export function MintRadial({
  size = 280,
  top = -70,
  left = -50,
  right = -50,
  corner = 'tl',
  tint = colors.accent,
  testID,
}: MintRadialProps) {
  const wrapperStyle: ViewStyle = {
    position: 'absolute',
    width: size,
    height: size,
    top,
    overflow: 'hidden',
    ...(corner === 'tl' ? { left } : { right }),
  };

  return (
    <View pointerEvents="none" style={wrapperStyle} testID={testID}>
      <GradientBackdrop
        borderRadius={0}
        base={{ from: 'transparent', to: 'transparent', angleDeg: 0 }}
        overlays={[
          {
            type: 'radial',
            cx: '50%', cy: '50%',
            rx: '70%', ry: '70%',
            stops: [
              { offset: 0, color: tint, opacity: 0.40 },
              { offset: 0.4, color: tint, opacity: 0.12 },
              { offset: 0.7, color: tint, opacity: 0 },
            ],
          },
        ]}
      />
    </View>
  );
}
