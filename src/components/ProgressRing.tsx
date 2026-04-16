import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** 0–100 */
  percentage: number;
  /** Stroke color for the filled arc */
  color: string;
  /** Outer diameter in pixels (default 62) */
  size?: number;
  /** Stroke width in pixels (default 5) */
  strokeWidth?: number;
  /** Animation delay in ms (default 0) */
  delay?: number;
}

export function ProgressRing({
  percentage,
  color,
  size = 62,
  strokeWidth = 5,
  delay = 0,
}: ProgressRingProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: percentage,
      duration: 600,
      delay,
      useNativeDriver: true,
      easing: undefined, // default ease
    }).start();
  }, [percentage, delay]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#33373D"
          strokeWidth={strokeWidth}
        />
        {/* Animated progress arc */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
    </View>
  );
}
