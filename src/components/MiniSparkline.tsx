import React from 'react';
import Svg, {Polyline, Defs, LinearGradient, Stop, Polygon} from 'react-native-svg';
import {colors} from '../theme/colors';

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  showGradientFill?: boolean;
}

const PADDING = 2;

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  width = 80,
  height = 30,
  color = colors.accent,
  strokeWidth = 2,
  showGradientFill = false,
}) => {
  if (data.length === 0) {
    return null;
  }

  let pointsString: string;

  if (data.length === 1) {
    const midY = height / 2;
    pointsString = `0,${midY} ${width},${midY}`;
  } else {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const isFlatLine = max === min;

    const points = data.map((value, index) => {
      const x = PADDING + (index / (data.length - 1)) * (width - 2 * PADDING);
      const y = isFlatLine
        ? height / 2
        : PADDING +
          (1 - (value - min) / (max - min)) * (height - 2 * PADDING);
      return `${x},${y}`;
    });

    pointsString = points.join(' ');
  }

  const firstX = PADDING;
  const lastX = data.length <= 1 ? width : PADDING + ((data.length - 1) / (data.length - 1)) * (width - 2 * PADDING);
  const fillPoints = `${pointsString} ${lastX},${height} ${firstX},${height}`;

  return (
    <Svg width={width} height={height}>
      {showGradientFill && (
        <>
          <Defs>
            <LinearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.25" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Polygon points={fillPoints} fill="url(#sparkFill)" />
        </>
      )}
      <Polyline
        points={pointsString}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
};
