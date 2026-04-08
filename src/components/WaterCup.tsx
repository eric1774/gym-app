import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';

interface WaterCupProps {
  currentOz: number;
  goalOz: number;
}

const CUP_WIDTH = 192;
const CUP_HEIGHT = 256;

export const WaterCup = React.memo(function WaterCup({ currentOz, goalOz }: WaterCupProps) {
  const fillFraction = Math.min(currentOz / goalOz, 1);
  const fillHeight = Math.round(fillFraction * CUP_HEIGHT);
  const fillY = CUP_HEIGHT - fillHeight;

  return (
    <View
      style={styles.cup}
      accessibilityLabel={`Water intake: ${currentOz} of ${goalOz} fl oz`}
      accessibilityRole="progressbar"
    >
      {fillHeight > 0 && (
        <Svg width={CUP_WIDTH} height={CUP_HEIGHT} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="waterFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#5A93AE" stopOpacity="0.85" />
              <Stop offset="1" stopColor="#1E3D56" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          {/* Water body */}
          <Rect
            x={0}
            y={fillY}
            width={CUP_WIDTH}
            height={fillHeight}
            fill="url(#waterFill)"
          />
          {/* Surface shimmer */}
          <Rect
            x={0}
            y={fillY}
            width={CUP_WIDTH}
            height={3}
            fill="#7EC5D8"
            opacity={0.45}
          />
        </Svg>
      )}

      {/* Glass highlight — thin sheen on left side */}
      <View style={styles.glassHighlight} />
    </View>
  );
});

const styles = StyleSheet.create({
  cup: {
    width: CUP_WIDTH,
    height: CUP_HEIGHT,
    backgroundColor: '#1A1C1D',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  glassHighlight: {
    position: 'absolute',
    top: 14,
    left: 18,
    width: 4,
    height: '55%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 2,
  },
});
