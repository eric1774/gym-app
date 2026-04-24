import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

export interface LinearBase {
  from: string;
  to: string;
  /** 0 = left → right; 90 = top → bottom; 135 = top-left → bottom-right */
  angleDeg: number;
}

export type Overlay =
  | {
      type: 'radial';
      cx: string; cy: string;
      rx: string; ry: string;
      stops: { offset: number; color: string; opacity: number }[];
    }
  | {
      type: 'linear';
      angleDeg: number;
      stops: { offset: number; color: string; opacity: number }[];
    };

export interface GradientBackdropProps {
  borderRadius: number;
  base: LinearBase;
  overlays: Overlay[];
}

function angleToCoords(deg: number) {
  const r = (deg * Math.PI) / 180;
  return {
    x1: 0.5 - Math.cos(r) / 2,
    y1: 0.5 - Math.sin(r) / 2,
    x2: 0.5 + Math.cos(r) / 2,
    y2: 0.5 + Math.sin(r) / 2,
  };
}

/**
 * Renders an absolute-positioned multi-layer gradient backdrop using react-native-svg.
 * Stack a linear base + N radial/linear overlays inside any container View.
 *
 * Usage:
 *   <View style={{ overflow: 'hidden', borderRadius: 18 }}>
 *     <GradientBackdrop borderRadius={18} base={{...}} overlays={[...]} />
 *     {actualContent}
 *   </View>
 */
export function GradientBackdrop({ borderRadius, base, overlays }: GradientBackdropProps) {
  const baseCoords = angleToCoords(base.angleDeg);
  return (
    <View
      style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }]}
      pointerEvents="none"
    >
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="base" x1={baseCoords.x1} y1={baseCoords.y1} x2={baseCoords.x2} y2={baseCoords.y2}>
            <Stop offset="0%" stopColor={base.from} />
            <Stop offset="100%" stopColor={base.to} />
          </LinearGradient>
          {overlays.map((o, i) => {
            if (o.type === 'radial') {
              return (
                <RadialGradient key={i} id={`ov${i}`} cx={o.cx} cy={o.cy} rx={o.rx} ry={o.ry} fx={o.cx} fy={o.cy}>
                  {o.stops.map((s, j) => (
                    <Stop key={j} offset={`${s.offset * 100}%`} stopColor={s.color} stopOpacity={s.opacity} />
                  ))}
                </RadialGradient>
              );
            }
            const c = angleToCoords(o.angleDeg);
            return (
              <LinearGradient key={i} id={`ov${i}`} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}>
                {o.stops.map((s, j) => (
                  <Stop key={j} offset={`${s.offset * 100}%`} stopColor={s.color} stopOpacity={s.opacity} />
                ))}
              </LinearGradient>
            );
          })}
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#base)" />
        {overlays.map((_, i) => (
          <Rect key={i} x="0" y="0" width="100%" height="100%" fill={`url(#ov${i})`} />
        ))}
      </Svg>
    </View>
  );
}
