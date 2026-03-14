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
import { fontSize, weightBold, weightMedium, weightSemiBold } from '../theme/typography';

const TIME_RANGES = ['1W', '1M', '3M', 'All'] as const;
type TimeRange = (typeof TIME_RANGES)[number];

const CHART_WIDTH = Dimensions.get('window').width - spacing.base * 2 - 2;
const MAX_POINTS = 50;

interface ProteinChartProps {
  goal: number;
  refreshKey?: number;
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

export function ProteinChart({ goal, refreshKey }: ProteinChartProps) {
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
    }, [selectedRange, refreshKey]),
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
      <Text style={styles.sectionHeader}>PROTEIN INTAKE HISTORY</Text>

      <View style={styles.chartCard}>
        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={styles.legendLine} />
            <Text style={styles.legendText}>DAILY INTAKE</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>{goal}g GOAL</Text>
          </View>
        </View>

        {/* Chart or empty state */}
        {chartData === null ? (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No data yet</Text>
          </View>
        ) : (
          <LineChart
            data={chartData}
            width={CHART_WIDTH}
            height={180}
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
        )}
      </View>

      {/* Filter pills below chart */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.base,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.secondary,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.base,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendLine: {
    width: 16,
    height: 2,
    backgroundColor: colors.accent,
    borderRadius: 1,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.secondary,
  },
  legendText: {
    fontSize: 10,
    color: colors.secondary,
    fontWeight: weightMedium,
  },
  chart: {
    borderRadius: 0,
    marginLeft: -spacing.base,
  },
  noDataContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: colors.secondary,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  filterTextActive: {
    color: colors.onAccent,
    fontWeight: weightBold,
  },
});
