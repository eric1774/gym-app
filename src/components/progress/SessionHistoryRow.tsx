import React, { useState } from 'react';
import { TouchableOpacity, View, Text, LayoutAnimation, StyleSheet } from 'react-native';
import { ExerciseHistorySession } from '../../types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../../theme/typography';

interface Props {
  session: ExerciseHistorySession;
  isPR: boolean;
  onLongPress: (sessionId: number) => void;
}

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

export const SessionHistoryRow: React.FC<Props> = ({ session, isPR, onLongPress }) => {
  const [expanded, setExpanded] = useState(false);
  const working = session.sets.filter(s => !s.isWarmup);
  const topSet = working.reduce((max, s) => s.weightLbs > max.weightLbs ? s : max, working[0]);
  const totalVol = working.reduce((sum, s) => sum + s.weightLbs * s.reps, 0);
  const otherCount = working.length - 1;
  const otherWeight = working.find(s => s !== topSet)?.weightLbs;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(e => !e);
  };

  return (
    <TouchableOpacity
      testID={`history-row-${session.sessionId}`}
      style={styles.row}
      activeOpacity={0.7}
      onPress={toggle}
      onLongPress={() => onLongPress(session.sessionId)}>
      <View style={styles.headRow}>
        <Text style={styles.date}>{formatDate(session.date)}</Text>
        <View style={styles.summary}>
          <Text style={styles.summaryMain}>
            {topSet ? `${topSet.weightLbs} × ${topSet.reps}` : '—'}
          </Text>
          {otherCount > 0 && (
            <Text style={styles.summarySub}>
              +{otherCount} {otherCount === 1 ? 'set' : 'sets'}{otherWeight ? ` at ${otherWeight}` : ''}
            </Text>
          )}
        </View>
        {isPR && <Text style={styles.prBadge}>PR</Text>}
        <Text style={styles.vol}>{totalVol.toLocaleString()}</Text>
        <Text style={styles.chev}>{expanded ? '▾' : '›'}</Text>
      </View>
      {expanded && (
        <View style={styles.expanded}>
          {session.sets.map(s => (
            <Text key={s.setNumber} testID={`expanded-set-${s.setNumber}`} style={[styles.setLine, s.isWarmup && styles.setLineWarmup]}>
              Set {s.setNumber}: {s.weightLbs}lb × {s.reps}{s.isWarmup ? ' (warmup)' : ''}
            </Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.slateBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginBottom: 5,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  date: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: weightSemiBold, minWidth: 42 },
  summary: { flex: 1, minWidth: 0 },
  summaryMain: { color: colors.primary, fontSize: fontSize.sm, fontWeight: weightSemiBold },
  summarySub: { color: colors.secondary, fontSize: 9 },
  prBadge: {
    color: colors.prGold,
    fontSize: 9,
    fontWeight: weightBold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.goldGlow,
    borderRadius: 4,
  },
  vol: { color: colors.textSoft, fontSize: fontSize.xs },
  chev: { color: colors.secondary, fontSize: fontSize.md, marginLeft: 4 },
  expanded: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border },
  setLine: { color: colors.primary, fontSize: fontSize.xs, lineHeight: 18 },
  setLineWarmup: { color: colors.secondary },
});
