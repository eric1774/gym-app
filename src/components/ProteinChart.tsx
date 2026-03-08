import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { getDailyProteinTotals } from '../db';
import { getLocalDateString } from '../utils/dates';
import { ProteinChartPoint } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightMedium, weightSemiBold } from '../theme/typography';

const TIME_RANGES = ['1W', '1M', '3M', 'All'] as const;
type TimeRange = (typeof TIME_RANGES)[number];

const CHART_WIDTH = Dimensions.get('window').width - spacing.base * 2;
const MAX_POINTS = 50;

interface ProteinChartProps {
  goal: number;
}

function getStartDate(range: TimeRange): string {
  if (range === 'All') {
    return '2000-01-01';
  }
  const now = new Date();
  if (range === '1W') {
    now.setDate(now.getDate() - 7);
  } else if (range === '1M') {
    now.setMonth(now.getMonth() - 1);
  } else {
    now.setMonth(now.getMonth() - 3);
  }
  return getLocalDateString(now);
}

function formatDateShort(dateStr: string): string {
  const parts = dateStr.split('-');
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return month + '/' + day;
}

function downsample(data: ProteinChartPoint[]): ProteinChartPoint[] {
  if (data.length <= MAX_POINTS) {
    return data;
  }
  const step = (data.length - 1) / (MAX_POINTS - 1);
  const result: ProteinChartPoint[] = [];
  for (let i = 0; i < MAX_POINTS - 1; i++) {
    result.push(data[Math.round(i * step)]);
  }
  result.push(data[data.length - 1]);
  return result;
}

export function ProteinChart({ goal }: ProteinChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1W');
  const [data, setData] = useState<ProteinChartPoint[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const startDate = getStartDate(selectedRange);
          const endDate = getLocalDateString();
          const points = await getDailyProteinTotals(startDate, endDate);
          if (!cancelled) {
            setData(points);
          }
        } catch {
          // ignore
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [selectedRange]),
  );

  const handleRangePress = useCallback((range: TimeRange) => {
    setSelectedRange(range);
  }, []);

  const chartData = useMemo(() => {
    if (data.length === 0) {
      return null;
    }

    const sampled = downsample(data);

    const maxLabels = 6;
    const step = Math.max(1, Math.floor(sampled.length / maxLabels));
    const labels = sampled.map((p, i) =>
      i % step === 0 || i === sampled.length - 1
        ? formatDateShort(p.date)
        : '',
    );

    // Build datasets: primary data line + goal line as second dataset
    const datasets = [
      {
        data: sampled.map(p => p.totalProteinGrams),
        color: () => colors.accent,
        strokeWidth: 2,
      },
      {
        data: sampled.map(() => goal),
        color: () => colors.secondary,
        strokeWidth: 1,
        withDots: false,
      },
    ];

    return { labels, datasets };
  }, [data, goal]);

  return (
    <View style={styles.wrapper}>
      {/* Filter pills */}
      <View style={styles.filterRow}>
        {TIME_RANGES.map(range => (
          <TouchableOpacity
            key={range}
            style={[
              styles.filterButton,
              selectedRange === range && styles.filterButtonActive,
            ]}
            activeOpacity={0.7}
            onPress={() => handleRangePress(range)}>
            <Text
              style={[
                styles.filterText,
                selectedRange === range && styles.filterTextActive,
              ]}>
              {range}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart or empty state */}
      {chartData === null ? (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data yet</Text>
        </View>
      ) : (
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData}
            width={CHART_WIDTH}
            height={220}
            yAxisSuffix="g"
            withDots={data.length <= 10}
            withInnerLines={false}
            withOuterLines={false}
            chartConfig={{
              backgroundColor: colors.surface,
              backgroundGradientFrom: colors.surface,
              backgroundGradientTo: colors.surface,
              decimalPlaces: 0,
              color: () => colors.accent,
              labelColor: () => colors.secondary,
              propsForDots: {
                r: '4',
                strokeWidth: '0',
                fill: colors.accent,
              },
            }}
            bezier
            style={styles.chart}
          />
          <Text style={styles.goalLabel}>{goal}g goal</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.base,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  filterButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  filterButtonActive: {
    backgroundColor: colors.accent,
  },
  filterText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
  },
  filterTextActive: {
    color: colors.background,
    fontWeight: weightSemiBold,
  },
  chartContainer: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  chart: {
    borderRadius: 10,
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  noDataText: {
    color: colors.secondary,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  goalLabel: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    color: colors.secondary,
    fontSize: 10,
  },
});
