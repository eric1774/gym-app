import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DeviceConnectionState } from '../types';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';

interface HRConnectionIndicatorProps {
  deviceState: DeviceConnectionState;
  visible: boolean;
}

interface StateDisplay {
  color: string;
  label: string;
}

const STATE_DISPLAY: Record<DeviceConnectionState, StateDisplay> = {
  connected:    { color: '#8DC28A', label: 'Connected' },
  reconnecting: { color: '#FACC15', label: 'Reconnecting' },
  disconnected: { color: '#D9534F', label: 'Disconnected' },
  scanning:     { color: '#8DC28A', label: 'Scanning' },
  connecting:   { color: '#FACC15', label: 'Connecting' },
};

/**
 * Colored 8px dot + state label for the current BLE device connection state.
 * Returns null when visible is false.
 */
export function HRConnectionIndicator({ deviceState, visible }: HRConnectionIndicatorProps) {
  if (!visible) {
    return null;
  }

  const display = STATE_DISPLAY[deviceState];

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: display.color }]} />
      <Text style={[styles.label, { color: display.color }]}>
        {display.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 100,  // Prevent unbounded width in compact layouts
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
  },
});
