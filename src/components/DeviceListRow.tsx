import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SignalBars } from './SignalBars';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';

interface DeviceListRowProps {
  device: {
    id: string;
    name: string;
    rssi: number;
  };
  onPress: () => void;
  isConnecting: boolean;
}

/**
 * A tappable row representing a discovered BLE heart rate device.
 * Displays device name, RSSI signal bars, and a connecting spinner or chevron.
 */
export function DeviceListRow({ device, onPress, isConnecting }: DeviceListRowProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={isConnecting}
    >
      <Text style={styles.name} numberOfLines={1}>
        {device.name}
      </Text>
      <View style={styles.signalContainer}>
        <SignalBars rssi={device.rssi} />
      </View>
      {isConnecting ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <Text style={styles.chevron}>{'>'}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  name: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
  },
  signalContainer: {
    marginHorizontal: spacing.sm,
  },
  chevron: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.secondary,
  },
});
