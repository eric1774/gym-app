import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { fontSize } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { getWorkoutDaysForMonth, getFirstSessionDate } from '../db/calendar';
import { CalendarStackParamList } from '../navigation/TabNavigator';
import { MintRadial } from '../components/MintRadial';

type Nav = NativeStackNavigationProp<CalendarStackParamList, 'CalendarHome'>;

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const HORIZONTAL_PADDING = spacing.md * 2;

function getScreenWidth(): number {
  return Dimensions.get('window').width;
}

function getCellSize(): number {
  return Math.floor((getScreenWidth() - HORIZONTAL_PADDING) / 7);
}

export function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [workoutDays, setWorkoutDays] = useState<Set<string>>(new Set());
  const [firstSessionDate, setFirstSessionDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          setLoading(true);
          const [days, firstDate] = await Promise.all([
            getWorkoutDaysForMonth(currentYear, currentMonth + 1),
            getFirstSessionDate(),
          ]);
          if (!cancelled) {
            setWorkoutDays(new Set(days.map(d => d.date)));
            setFirstSessionDate(firstDate);
            setLoading(false);
          }
        } catch {
          if (!cancelled) { setLoading(false); }
        }
      })();
      return () => { cancelled = true; };
    }, [currentYear, currentMonth]),
  );

  function goToPrevMonth() {
    if (currentMonth === 0) {
      setCurrentYear(y => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(m => m - 1);
    }
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentYear(y => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(m => m + 1);
    }
  }

  const isCurrentMonth =
    currentYear === today.getFullYear() && currentMonth === today.getMonth();

  let isEarliestMonth = true;
  if (firstSessionDate) {
    const [fYear, fMonth] = firstSessionDate.split('-').map(Number);
    isEarliestMonth =
      currentYear < fYear ||
      (currentYear === fYear && currentMonth + 1 <= fMonth);
  }

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    cells.push(...Array(7 - remainder).fill(null));
  }
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const cellSize = getCellSize();
  const monthName = new Date(currentYear, currentMonth, 1).toLocaleString('default', { month: 'long' });
  // Year is shown in the hero block, so the mini pill-row label is just the month
  // (avoids duplicating "2026" in two Text nodes which would break a getByText regex).
  const monthLabelUppercase = monthName.toUpperCase();

  function handleDayPress(day: number) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    navigation.navigate('CalendarDayDetail', { date: dateStr });
  }

  function renderDayCell(day: number | null, colIndex: number) {
    if (day === null) {
      return (
        <View
          key={`empty-${colIndex}`}
          style={[styles.cell, { width: cellSize, height: cellSize }]}
        />
      );
    }

    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const hasWorkout = workoutDays.has(dateStr);
    const isFuture = isCurrentMonth && day > today.getDate();
    // PR detection lives in day-detail; the calendar grid only shows mint dots
    // (PR rings would require additional per-day data — out of scope).
    const isPR = false;

    const dotSize = Math.min(cellSize - 8, 38);
    const dotStyle: any = {
      width: dotSize,
      height: dotSize,
      borderRadius: dotSize / 2,
      alignItems: 'center',
      justifyContent: 'center',
    };

    let textColor: string = colors.primary;
    if (hasWorkout) {
      dotStyle.backgroundColor = colors.accent;
      textColor = colors.onAccent;
    }
    if (isFuture && !hasWorkout) {
      textColor = colors.secondaryDim;
      dotStyle.opacity = 0.55;
    }

    const todayHaloStyle = isToday && hasWorkout ? styles.todayHalo : null;
    const prRingStyle = isPR ? styles.prRing : null;

    if (hasWorkout) {
      return (
        <TouchableOpacity
          key={dateStr}
          style={[styles.cell, { width: cellSize, height: cellSize }]}
          onPress={() => handleDayPress(day)}
          activeOpacity={0.7}
        >
          {todayHaloStyle && (
            <View
              style={[
                todayHaloStyle,
                { width: dotSize + 8, height: dotSize + 8, borderRadius: (dotSize + 8) / 2 },
              ]}
            />
          )}
          <View style={[dotStyle, prRingStyle]}>
            <Text style={[styles.dayText, { color: textColor }]}>{day}</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View
        key={dateStr}
        style={[styles.cell, { width: cellSize, height: cellSize }]}
      >
        <View style={dotStyle}>
          <Text style={[styles.dayText, { color: textColor }]}>{day}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MintRadial />

      {/* Hero block — "April" + "2026" stacked, left-aligned */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{monthName}</Text>
        <Text style={styles.heroYear}>{currentYear}</Text>
      </View>

      {/* Pill-arrow nav row */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.pillArrow, isEarliestMonth && styles.pillArrowDisabled]}
          onPress={goToPrevMonth}
          disabled={isEarliestMonth}
          activeOpacity={0.7}
        >
          <Text style={styles.pillArrowText}>{'‹'}</Text>
        </TouchableOpacity>

        <Text style={styles.monthMini}>{monthLabelUppercase}</Text>

        <TouchableOpacity
          style={[styles.pillArrow, isCurrentMonth && styles.pillArrowDisabled]}
          onPress={goToNextMonth}
          disabled={isCurrentMonth}
          activeOpacity={0.7}
        >
          <Text style={styles.pillArrowText}>{'›'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, idx) => (
          <View
            key={idx}
            style={[styles.cell, { width: cellSize, height: cellSize }]}
          >
            <Text style={styles.weekdayLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              {row.map((day, colIdx) => renderDayCell(day, colIdx))}
            </View>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  hero: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  heroYear: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    letterSpacing: 0.6,
    marginTop: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  pillArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillArrowDisabled: {
    opacity: 0.3,
  },
  pillArrowText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSoft,
    lineHeight: 13,
  },
  monthMini: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSoft,
    letterSpacing: 1.2,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayLabel: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  grid: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  todayHalo: {
    position: 'absolute',
    backgroundColor: colors.accentGlow,
  },
  prRing: {
    borderWidth: 2,
    borderColor: colors.prGold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
  loadingText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
  },
});
