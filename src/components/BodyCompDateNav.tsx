import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import type { BodyCompScope } from '../types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function startOfWeekMonday(d: Date): Date {
  const day = d.getDay();                  // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;   // move to Monday
  const out = new Date(d);
  out.setDate(d.getDate() + diff);
  return out;
}

export function formatScopeLabel(scope: BodyCompScope, date: string): string {
  const d = parseISO(date);
  if (scope === 'month') {
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  if (scope === 'week') {
    const start = startOfWeekMonday(d);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${DAYS_SHORT[d.getDay()]} · ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function stepScopeDate(scope: BodyCompScope, date: string, delta: number): string {
  const d = parseISO(date);
  if (scope === 'month') {
    d.setMonth(d.getMonth() + delta);
  } else if (scope === 'week') {
    d.setDate(d.getDate() + delta * 7);
  } else {
    d.setDate(d.getDate() + delta);
  }
  return toISO(d);
}

function isAtOrAfterToday(scope: BodyCompScope, date: string, today: string): boolean {
  const d = parseISO(date);
  const t = parseISO(today);
  if (scope === 'month') {
    return d.getFullYear() > t.getFullYear()
      || (d.getFullYear() === t.getFullYear() && d.getMonth() >= t.getMonth());
  }
  if (scope === 'week') {
    return startOfWeekMonday(d).getTime() >= startOfWeekMonday(t).getTime();
  }
  return d.getTime() >= t.getTime();
}

export interface BodyCompDateNavProps {
  scope: BodyCompScope;
  date: string;
  today: string;
  onChange: (next: string) => void;
}

export function BodyCompDateNav({ scope, date, today, onChange }: BodyCompDateNavProps) {
  const nextDisabled = isAtOrAfterToday(scope, date, today);

  return (
    <View style={styles.row}>
      <Pressable testID="date-nav-prev" onPress={() => onChange(stepScopeDate(scope, date, -1))} hitSlop={8} style={styles.arrowBtn}>
        <Text style={styles.arrow}>‹</Text>
      </Pressable>
      <Text style={styles.label}>{formatScopeLabel(scope, date)}</Text>
      <Pressable
        testID="date-nav-next"
        onPress={() => !nextDisabled && onChange(stepScopeDate(scope, date, 1))}
        hitSlop={8}
        accessibilityState={{ disabled: nextDisabled }}
        style={[styles.arrowBtn, nextDisabled && styles.arrowDisabled]}
      >
        <Text style={styles.arrow}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  label: { color: colors.primary, fontSize: fontSize.base, fontWeight: weightSemiBold },
  arrowBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  arrowDisabled: { opacity: 0.3 },
  arrow: { color: colors.accent, fontSize: fontSize.xl, fontWeight: weightBold },
});
