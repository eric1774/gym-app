import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, getHrZoneColor } from '../theme/colors';
import { Heart } from './icons';

export type HrZone = 1 | 2 | 3 | 4 | 5;

interface HrPillProps {
  bpm: number | null;          // null = disconnected
  zone: HrZone | null;         // null when bpm is null
}

/** Blend a hex color with opacity hex suffix (RN doesn't parse 8-digit hex uniformly). */
function withAlpha(hex: string, alphaHex: string): string {
  // alphaHex is '22', '0a', '44', etc. — a 2-char hex alpha.
  // We append it to the 6-char base color; RN accepts #RRGGBBAA.
  return `${hex}${alphaHex}`;
}

export function HrPill({ bpm, zone }: HrPillProps) {
  const zoneColor = getHrZoneColor(zone);
  const disconnected = bpm === null;
  const bgFill = disconnected
    ? 'rgba(255,255,255,0.04)'
    : withAlpha(zoneColor, '22');
  const borderColor = disconnected
    ? colors.border
    : withAlpha(zoneColor, '44');

  return (
    <View style={[styles.pill, { backgroundColor: bgFill, borderColor }]}>
      <Heart size={16} color={zoneColor} />
      <View style={styles.valueColumn}>
        <Text style={styles.bpmText}>
          {disconnected ? '--' : bpm}
        </Text>
        <Text style={[styles.zoneLabel, { color: zoneColor }]}>
          {disconnected ? 'BPM' : `Z${zone} · BPM`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  valueColumn: {
    alignItems: 'flex-start',
  },
  bpmText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    lineHeight: 18,
  },
  zoneLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 2,
  },
});
