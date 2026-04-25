import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

export interface LinearBase {
  from: string;
  to: string;
  /** 0 = left → right; 90 = top → bottom; 45 = top-left → bottom-right */
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

function pctToPx(s: string, dim: number): number {
  if (s.endsWith('%')) { return (parseFloat(s) / 100) * dim; }
  return parseFloat(s);
}

/**
 * Compute pixel endpoints for a linear gradient axis spanning the full rect.
 * Angle convention: 0=left→right, 90=top→bottom, 45=top-left→bottom-right.
 * Endpoints are placed so the projection of the rect onto the axis fully covers [x1,y1]-[x2,y2].
 */
function linearEndpoints(deg: number, w: number, h: number) {
  const r = (deg * Math.PI) / 180;
  const cx = w / 2, cy = h / 2;
  const halfSpan = Math.abs(Math.cos(r)) * (w / 2) + Math.abs(Math.sin(r)) * (h / 2);
  return {
    x1: cx - Math.cos(r) * halfSpan,
    y1: cy - Math.sin(r) * halfSpan,
    x2: cx + Math.cos(r) * halfSpan,
    y2: cy + Math.sin(r) * halfSpan,
  };
}

export function GradientBackdrop({ borderRadius, base, overlays }: GradientBackdropProps) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width <= 0 || height <= 0) { return; }
    if (!size || size.w !== width || size.h !== height) {
      setSize({ w: width, h: height });
    }
  };

  return (
    <View
      style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }]}
      pointerEvents="none"
      onLayout={onLayout}
    >
      {size && (
        <Svg width={size.w} height={size.h}>
          <Defs>
            {(() => {
              const c = linearEndpoints(base.angleDeg, size.w, size.h);
              return (
                <LinearGradient
                  id="base"
                  gradientUnits="userSpaceOnUse"
                  x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
                >
                  <Stop offset="0%" stopColor={base.from} />
                  <Stop offset="100%" stopColor={base.to} />
                </LinearGradient>
              );
            })()}
            {overlays.map((o, i) => {
              if (o.type === 'radial') {
                const cx = pctToPx(o.cx, size.w);
                const cy = pctToPx(o.cy, size.h);
                const rx = pctToPx(o.rx, size.w);
                const ry = pctToPx(o.ry, size.h);
                return (
                  <RadialGradient
                    key={i}
                    id={`ov${i}`}
                    gradientUnits="userSpaceOnUse"
                    cx={cx} cy={cy} rx={rx} ry={ry} fx={cx} fy={cy}
                  >
                    {o.stops.map((s, j) => (
                      <Stop key={j} offset={`${s.offset * 100}%`} stopColor={s.color} stopOpacity={s.opacity} />
                    ))}
                  </RadialGradient>
                );
              }
              const c = linearEndpoints(o.angleDeg, size.w, size.h);
              return (
                <LinearGradient
                  key={i}
                  id={`ov${i}`}
                  gradientUnits="userSpaceOnUse"
                  x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
                >
                  {o.stops.map((s, j) => (
                    <Stop key={j} offset={`${s.offset * 100}%`} stopColor={s.color} stopOpacity={s.opacity} />
                  ))}
                </LinearGradient>
              );
            })}
          </Defs>
          <Rect x={0} y={0} width={size.w} height={size.h} fill="url(#base)" />
          {overlays.map((_, i) => (
            <Rect key={i} x={0} y={0} width={size.w} height={size.h} fill={`url(#ov${i})`} />
          ))}
        </Svg>
      )}
    </View>
  );
}
