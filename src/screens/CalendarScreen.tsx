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
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { getWorkoutDaysForMonth, getFirstSessionDate } from '../db/calendar';
import { CalendarStackParamList } from '../navigation/TabNavigator';

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
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [workoutDays, setWorkoutDays] = useState<Set<string>>(new Set());
  const [firstSessionDate, setFirstSessionDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load workout days when month changes and load firstSessionDate once
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

  // Month navigation helpers
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

  // Disable right arrow on current month
  const isCurrentMonth =
    currentYear === today.getFullYear() && currentMonth === today.getMonth();

  // Disable left arrow when at or before the first session's month, or no sessions
  let isEarliestMonth = true;
  if (firstSessionDate) {
    const [fYear, fMonth] = firstSessionDate.split('-').map(Number);
    // fMonth is 1-indexed; compare with currentMonth (0-indexed) + 1
    isEarliestMonth =
      currentYear < fYear ||
      (currentYear === fYear && currentMonth + 1 <= fMonth);
  }

  // Calendar grid calculations
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0=Sunday
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Build grid cells: nulls for leading empty cells, then day numbers
  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Pad to complete the last row
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    cells.push(...Array(7 - remainder).fill(null));
  }

  // Split into rows
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const cellSize = getCellSize();
  const monthLabel = new Date(currentYear, currentMonth, 1).toLocaleString('default', { month: 'long' });

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

    // Future days in the current month (past today) get secondary color
    const isFuture = isCurrentMonth && day > today.getDate();

    let cellBg: string | undefined;
    let textColor: string;
    let borderWidth = 0;
    let borderColor: string | undefined;

    if (hasWorkout && isToday) {
      cellBg = colors.accent;
      textColor = colors.onAccent;
      borderWidth = 2;
      borderColor = colors.accent;
    } else if (hasWorkout) {
      cellBg = colors.accent;
      textColor = colors.onAccent;
    } else if (isToday) {
      textColor = colors.primary;
      borderWidth = 2;
      borderColor = colors.accent;
    } else if (isFuture) {
      textColor = colors.secondary;
    } else {
      textColor = colors.primary;
    }

    const circleStyle = {
      width: cellSize - 8,
      height: cellSize - 8,
      borderRadius: (cellSize - 8) / 2,
      backgroundColor: cellBg,
      borderWidth,
      borderColor,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    };

    if (hasWorkout) {
      return (
        <TouchableOpacity
          key={dateStr}
          style={[styles.cell, { width: cellSize, height: cellSize }]}
          onPress={() => handleDayPress(day)}
          activeOpacity={0.7}
        >
          <View style={circleStyle}>
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
        <View style={circleStyle}>
          <Text style={[styles.dayText, { color: textColor }]}>{day}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Month navigation header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.arrowButton}
          onPress={goToPrevMonth}
          disabled={isEarliestMonth}
          activeOpacity={0.7}
        >
          <Text style={[styles.arrowText, isEarliestMonth && styles.arrowDisabled]}>
            {'<'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.monthTitle}>
          {monthLabel} {currentYear}
        </Text>

        <TouchableOpacity
          style={styles.arrowButton}
          onPress={goToNextMonth}
          disabled={isCurrentMonth}
          activeOpacity={0.7}
        >
          <Text style={[styles.arrowText, isCurrentMonth && styles.arrowDisabled]}>
            {'>'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Weekday labels */}
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

      {/* Calendar grid */}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
  },
  arrowButton: {
    padding: spacing.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: weightBold,
  },
  arrowDisabled: {
    opacity: 0.3,
    color: colors.secondary,
  },
  monthTitle: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayLabel: {
    fontSize: fontSize.xs,
    color: colors.secondary,
    fontWeight: weightSemiBold,
    textAlign: 'center',
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
  },
  dayText: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    textAlign: 'center',
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
