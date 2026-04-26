import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { GradientBackdrop } from './GradientBackdrop';
import { colors } from '../theme/colors';

export interface MintRadialProps {
  /** Square dimension in pixels. Omit (along with top/left/right) for full-screen atmospheric mode. */
  size?: number;
  /** Vertical offset (negative = above parent). Box mode only. */
  top?: number;
  /** Horizontal offset (negative = beyond left edge). Box mode only. Ignored if corner='tr'. */
  left?: number;
  /** Mirrored horizontal offset for corner='tr'. Box mode only. */
  right?: number;
  /** Which corner to anchor the radial center. Default 'tl'. */
  corner?: 'tl' | 'tr';
  /** Base color of the radial. Default colors.accent (mint). */
  tint?: string;
  /** Test ID for the wrapper view. */
  testID?: string;
}

/**
 * Atmospheric corner gradient — a soft radial fading to transparent.
 *
 * Two modes:
 *  - **Full-screen** (default, when no size/offset props are passed): the wrapper
 *    fills the parent (StyleSheet.absoluteFill) and the radial is anchored toward
 *    the chosen corner. No visible rectangular bounds — fades naturally.
 *  - **Box** (when size/top/left/right are explicit): a fixed-size square anchored
 *    by offset, used inside contained surfaces like the PR callout panel.
 */
export function MintRadial({
  size,
  top,
  left,
  right,
  corner = 'tl',
  tint = colors.accent,
  testID,
}: MintRadialProps) {
  const isFullScreen =
    size === undefined && top === undefined && left === undefined && right === undefined;

  if (isFullScreen) {
    const cx = corner === 'tl' ? '22%' : '78%';
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill} testID={testID}>
        <GradientBackdrop
          borderRadius={0}
          base={{ from: 'transparent', to: 'transparent', angleDeg: 0 }}
          overlays={[
            {
              type: 'radial',
              cx, cy: '14%',
              rx: '65%', ry: '55%',
              stops: [
                { offset: 0, color: tint, opacity: 0.30 },
                { offset: 0.35, color: tint, opacity: 0.10 },
                { offset: 0.75, color: tint, opacity: 0 },
              ],
            },
          ]}
        />
      </View>
    );
  }

  const wrapperStyle: ViewStyle = {
    position: 'absolute',
    width: size ?? 280,
    height: size ?? 280,
    top: top ?? -70,
    overflow: 'hidden',
    ...(corner === 'tl' ? { left: left ?? -50 } : { right: right ?? -50 }),
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
