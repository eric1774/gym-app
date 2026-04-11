import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ShieldState } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const SHIELD_TYPES = [
  { key: 'workout' as const, label: 'Workout' },
  { key: 'protein' as const, label: 'Protein' },
  { key: 'water' as const, label: 'Water' },
];

export function StreakShieldsCard({ shieldState }: { shieldState: ShieldState }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Streak Shields</Text>
      <View style={styles.row}>
        {SHIELD_TYPES.map(({ key, label }) => (
          <View key={key} style={styles.type}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.slots}>
              {[0, 1, 2].map(i => (
                <View
                  key={i}
                  style={[
                    styles.slot,
                    i < shieldState[key] ? styles.slotFilled : styles.slotEmpty,
                  ]}
                >
                  {i < shieldState[key] && <Text style={styles.slotIcon}>{'\u{1F6E1}'}</Text>}
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  title: { color: colors.primary, fontWeight: '600', fontSize: 12, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  type: { flex: 1 },
  label: { color: colors.secondary, fontSize: 10 },
  slots: { flexDirection: 'row', gap: 3, marginTop: 4 },
  slot: { width: 16, height: 16, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  slotFilled: { backgroundColor: colors.accent },
  slotEmpty: { backgroundColor: '#333' },
  slotIcon: { fontSize: 8 },
});
