import React from 'react';
import Svg, {Polyline} from 'react-native-svg';
import {colors} from '../theme/colors';

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}

const PADDING = 2;

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  width = 80,
  height = 30,
  color = colors.accent,
  strokeWidth = 2,
}) => {
  if (data.length === 0) {
    return null;
  }

  let pointsString: string;

  if (data.length === 1) {
    // Single point: horizontal line at mid-height
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

  return (
    <Svg width={width} height={height}>
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
