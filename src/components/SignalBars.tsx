import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

interface SignalBarsProps {
  rssi: number;
}

/**
 * 3-bar RSSI visualization for BLE signal strength.
 * Bars are aligned to the bottom (shortest on left, tallest on right).
 * - 3 bars filled: rssi >= -60 (strong)
 * - 2 bars filled: -80 <= rssi < -60 (moderate)
 * - 1 bar filled: rssi < -80 (weak)
 */
export function SignalBars({ rssi }: SignalBarsProps) {
  const filledCount = rssi >= -60 ? 3 : rssi >= -80 ? 2 : 1;

  return (
    <View style={styles.container}>
      <View style={[styles.bar, styles.bar1, filledCount >= 1 ? styles.filled : styles.empty]} />
      <View style={[styles.bar, styles.bar2, filledCount >= 2 ? styles.filled : styles.empty]} />
      <View style={[styles.bar, styles.bar3, filledCount >= 3 ? styles.filled : styles.empty]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: 13,  // 3 bars × 3px + 2 gaps × 2px = 13px
    height: 16, // tallest bar height
  },
  bar: {
    width: 3,
    marginHorizontal: 1, // 1px on each side = 2px gap between bars
    borderRadius: 1,
  },
  bar1: {
    height: 8,
  },
  bar2: {
    height: 12,
  },
  bar3: {
    height: 16,
  },
  filled: {
    backgroundColor: colors.accent,
  },
  empty: {
    backgroundColor: colors.border,
  },
});
