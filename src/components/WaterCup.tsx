import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightRegular } from '../theme/typography';

interface WaterCupProps {
  currentOz: number;  // Today's total water intake
  goalOz: number;     // Daily goal (will be 64 as default from parent, never 0)
}

const CUP_WIDTH = 160;
const CUP_HEIGHT = 220;
const BORDER_RADIUS = 20;
const WAVE_HEIGHT = 8; // amplitude of the wave curve

export const WaterCup = React.memo(function WaterCup({ currentOz, goalOz }: WaterCupProps) {
  const fillFraction = Math.min(currentOz / goalOz, 1);
  const isGoalMet = currentOz >= goalOz;

  // Water top Y position (0 = top of cup, CUP_HEIGHT = bottom)
  const waterTopY = CUP_HEIGHT - (fillFraction * CUP_HEIGHT);

  return (
    <View style={styles.wrapper}>
      {/* Glass container with edge highlights */}
      <View
        style={styles.glassOuter}
        accessibilityLabel={`Water intake: ${currentOz} of ${goalOz} fl oz`}
        accessibilityRole="progressbar"
      >
        {/* Inner glass highlight (left/right edge glow) */}
        <View style={styles.glassInner}>
          {/* SVG water fill */}
          {fillFraction > 0 && (
            <View style={StyleSheet.absoluteFill}>
              <Svg width={CUP_WIDTH - 4} height={CUP_HEIGHT - 4} viewBox={`0 0 ${CUP_WIDTH - 4} ${CUP_HEIGHT - 4}`}>
                <Defs>
                  {/* Water body gradient — deep blue at bottom, lighter at top */}
                  <LinearGradient id="waterGradient" x1="0" y1="1" x2="0" y2="0">
                    <Stop offset="0" stopColor="#1E4A6E" stopOpacity="1" />
                    <Stop offset="0.4" stopColor="#2D6B8A" stopOpacity="1" />
                    <Stop offset="0.85" stopColor="#3D8AAE" stopOpacity="1" />
                    <Stop offset="1" stopColor="#4A9BC2" stopOpacity="1" />
                  </LinearGradient>
                  {/* Surface highlight — lighter band at the meniscus */}
                  <LinearGradient id="surfaceGradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#6BB8D4" stopOpacity="0.9" />
                    <Stop offset="1" stopColor="#4A9BC2" stopOpacity="0" />
                  </LinearGradient>
                </Defs>

                {/* Water body with wave surface */}
                <Path
                  d={buildWaterPath(waterTopY - 2, CUP_WIDTH - 4, CUP_HEIGHT - 4)}
                  fill="url(#waterGradient)"
                />

                {/* Surface highlight band (meniscus glow) */}
                {waterTopY < CUP_HEIGHT - 10 && (
                  <Rect
                    x="0"
                    y={waterTopY - 2}
                    width={CUP_WIDTH - 4}
                    height={14}
                    fill="url(#surfaceGradient)"
                  />
                )}
              </Svg>
            </View>
          )}

          {/* Goal met checkmark overlay */}
          {isGoalMet && (
            <View style={styles.goalMetOverlay} pointerEvents="none">
              <Text style={styles.checkmark}>{'\u2713'}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Large amount display below cup */}
      <View style={styles.amountContainer}>
        <Text style={styles.amountValue}>{currentOz}</Text>
        <Text style={styles.amountUnit}> FL OZ</Text>
      </View>

      {/* Goal label */}
      <Text style={styles.goalLabel}>GOAL: {goalOz} fl oz</Text>
    </View>
  );
});

/**
 * Build an SVG path for the water fill with a gentle wave at the surface.
 * The wave uses a quadratic bezier to create a subtle curved meniscus.
 */
function buildWaterPath(topY: number, width: number, height: number): string {
  const safeTopY = Math.max(topY, 0);
  const midX = width / 2;

  // Wave: start left, curve up in the middle, back down on the right
  return [
    `M 0 ${safeTopY + WAVE_HEIGHT}`,                             // Start left at wave trough
    `Q ${midX * 0.5} ${safeTopY - WAVE_HEIGHT * 0.3},`,          // Control point left
    `  ${midX} ${safeTopY - WAVE_HEIGHT * 0.5}`,                 // Peak center-left
    `Q ${midX * 1.5} ${safeTopY - WAVE_HEIGHT * 0.3},`,          // Control point right
    `  ${width} ${safeTopY + WAVE_HEIGHT}`,                      // End right at trough
    `L ${width} ${height}`,                                       // Bottom right
    `L 0 ${height}`,                                              // Bottom left
    'Z',                                                          // Close
  ].join(' ');
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  glassOuter: {
    width: CUP_WIDTH,
    height: CUP_HEIGHT,
    borderRadius: BORDER_RADIUS,
    // Glass edge highlight — subtle lighter border
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'transparent',
  },
  glassInner: {
    flex: 1,
    borderRadius: BORDER_RADIUS - 2,
    overflow: 'hidden',
    // Dark tinted glass background
    backgroundColor: '#0D1F2D',
    // Inner edge glow
    borderWidth: 1,
    borderColor: 'rgba(74,155,194,0.12)',
  },
  goalMetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 36,
    fontWeight: weightBold,
    color: '#FFFFFF',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.lg,
  },
  amountValue: {
    fontSize: fontSize.display,
    fontWeight: weightBold,
    color: colors.primary,
  },
  amountUnit: {
    fontSize: fontSize.md,
    fontWeight: weightRegular,
    color: colors.secondary,
  },
  goalLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightRegular,
    color: colors.secondary,
    marginTop: spacing.xs,
    letterSpacing: 0.5,
  },
});
