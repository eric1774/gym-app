import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { Scale } from '../components/icons/Scale';
import { BodyCompScopeBar } from '../components/BodyCompScopeBar';
import { BodyCompDateNav } from '../components/BodyCompDateNav';
import { LogBodyMetricModal, LogBodyMetricPayload } from '../components/LogBodyMetricModal';
import {
  getBodyMetricsInRange,
  upsertBodyMetric,
} from '../db/bodyMetrics';
import type { BodyCompScope } from '../types';

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function BodyCompView() {
  const today = useMemo(isoToday, []);
  const [scope, setScope] = useState<BodyCompScope>('month');
  const [date, setDate] = useState(today);
  const [hasAny, setHasAny] = useState<boolean | null>(null);
  const [logVisible, setLogVisible] = useState(false);

  const refresh = useCallback(async () => {
    // Check ANY weight has been logged in the entire history.
    const rows = await getBodyMetricsInRange('weight', '0000-01-01', '9999-12-31');
    setHasAny(rows.length > 0);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleSave = async (payload: LogBodyMetricPayload) => {
    await upsertBodyMetric({
      metricType: payload.metricType,
      value: payload.value,
      unit: payload.unit,
      recordedDate: payload.recordedDate,
      note: payload.note,
    });
    await refresh();
  };

  // Empty state
  if (hasAny === false) {
    return (
      <View style={styles.emptyContainer}>
        <Scale size={72} color={colors.accent} />
        <Text style={styles.emptyTitle}>Log your first weight</Text>
        <Text style={styles.emptySubtitle}>
          Track daily weigh-ins and see how your calorie intake moves the needle.
        </Text>
        <Pressable onPress={() => setLogVisible(true)} style={styles.emptyBtn}>
          <Text style={styles.emptyBtnText}>+ Log today's weight</Text>
        </Pressable>
        <LogBodyMetricModal
          visible={logVisible}
          mode="weight"
          initialDate={today}
          onClose={() => setLogVisible(false)}
          onSave={handleSave}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <BodyCompScopeBar scope={scope} onChange={setScope} />
      <BodyCompDateNav scope={scope} date={date} today={today} onChange={setDate} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        {/* Per-scope views will be inserted in Tasks 19–21 */}
        <View style={{ padding: spacing.lg }}>
          <Text style={{ color: colors.secondary }}>
            Scope: {scope} — Date: {date} (chart coming in Task 14–18)
          </Text>
        </View>
      </ScrollView>
      <LogBodyMetricModal
        visible={logVisible}
        mode="weight"
        initialDate={today}
        onClose={() => setLogVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { color: colors.primary, fontSize: fontSize.lg, fontWeight: weightBold, marginTop: spacing.base },
  emptySubtitle: { color: colors.secondary, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.sm, maxWidth: 280 },
  emptyBtn: { backgroundColor: colors.accent, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 10, marginTop: spacing.xl },
  emptyBtnText: { color: colors.background, fontSize: fontSize.base, fontWeight: weightBold },
});
