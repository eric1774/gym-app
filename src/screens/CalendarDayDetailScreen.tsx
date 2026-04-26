import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import HapticFeedback from 'react-native-haptic-feedback';
import { colors } from '../theme/colors';
import { fontSize, weightBold, weightMedium, weightSemiBold } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { getDaySessionDetails } from '../db/calendar';
import { deleteSession } from '../db/sessions';
import { getWaterTotalByDate } from '../db/hydration';
import { getMacroTotalsByDate } from '../db/macros';
import { computeCalories } from '../utils/macros';
import { CalendarSessionDetail, MacroValues } from '../types';
import { CalendarStackParamList } from '../navigation/TabNavigator';
import { WaterDropIcon } from '../components/WaterDropIcon';
import { MintRadial } from '../components/MintRadial';

type Nav = NativeStackNavigationProp<CalendarStackParamList, 'CalendarDayDetail'>;
type Route = RouteProp<CalendarStackParamList, 'CalendarDayDetail'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = -80;
const DELETE_ZONE_WIDTH = 80;

// ---------- Formatting helpers ----------

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatVolume(volume: number): string {
  return volume.toLocaleString('en-US') + ' lbs';
}

// ---------- Trash Icon ----------

function TrashIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6H5H21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V6H19Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 11V17"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 11V17"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ---------- Sub-components ----------

interface StatItemProps {
  label: string;
  value: string;
  unit?: string;
}

function StatItem({ label, value, unit }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>
        {value}
        {unit ? <Text style={styles.statValueUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ---------- Swipeable Session Card ----------

interface SwipeableSessionCardProps {
  session: CalendarSessionDetail;
  index: number;
  onDelete: (sessionId: number) => void;
}

function SwipeableSessionCard({ session, index, onDelete }: SwipeableSessionCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const rowHeight = useRef(new Animated.Value(1)).current; // 1 = full height, for collapse animation
  const isSwipedOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes, not vertical scrolling
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow left swipe (negative dx), clamp to delete zone width
        if (gestureState.dx < 0) {
          const clamped = Math.max(gestureState.dx, -DELETE_ZONE_WIDTH - 20);
          translateX.setValue(clamped);
        } else if (isSwipedOpen.current) {
          // Allow swiping back to close
          const clamped = Math.min(gestureState.dx - DELETE_ZONE_WIDTH, 0);
          translateX.setValue(clamped);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD) {
          // Snap open to reveal delete button
          isSwipedOpen.current = true;
          HapticFeedback.trigger('impactLight');
          Animated.spring(translateX, {
            toValue: -DELETE_ZONE_WIDTH,
            useNativeDriver: true,
            tension: 60,
            friction: 9,
          }).start();
        } else {
          // Snap back closed
          isSwipedOpen.current = false;
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 60,
            friction: 9,
          }).start();
        }
      },
    }),
  ).current;

  function handleDeletePress() {
    const cardTitle = session.programDayName ?? 'Workout';
    const startTime = formatTime(session.startedAt);

    Alert.alert(
      'Delete Workout',
      `Are you sure you want to delete "${cardTitle}" at ${startTime}?\n\nThis will permanently remove all sets and data from this session.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            // Snap back closed
            isSwipedOpen.current = false;
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 60,
              friction: 9,
            }).start();
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            HapticFeedback.trigger('notificationWarning');
            onDelete(session.sessionId);
          },
        },
      ],
    );
  }

  const cardTitle = session.programDayName ?? 'Workout';
  const startTime = formatTime(session.startedAt);

  // Delete background opacity based on swipe distance
  const deleteOpacity = translateX.interpolate({
    inputRange: [-DELETE_ZONE_WIDTH, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[index > 0 && styles.cardSpacing]}>
      {/* Delete action background */}
      <Animated.View style={[styles.deleteBackground, { opacity: deleteOpacity }]}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeletePress}
          activeOpacity={0.8}
        >
          <TrashIcon color="#FFFFFF" size={22} />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Swipeable card content (per-card swipe-hint dash removed — banner above is sufficient) */}
      <Animated.View
        style={[styles.card, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {/* Card header — title left, PR badge chip right */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardTitle}>{cardTitle}</Text>
            <Text style={styles.cardSubtitle}>{startTime}</Text>
          </View>
          {session.prCount > 0 && (
            <View style={styles.prBadge}>
              <Text style={styles.prBadgeText}>
                {'★'} {session.prCount} PR{session.prCount > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Primary stats row (PR count is no longer here — it lives in the header chip) */}
        <View style={styles.statsRow}>
          <StatItem label="DURATION" value={formatDuration(session.durationSeconds)} />
          <StatItem label="SETS" value={String(session.totalSets)} />
          <StatItem label="LBS" value={session.totalVolume.toLocaleString('en-US')} />
          <StatItem label="EXERCISES" value={String(session.exerciseCount)} />
        </View>

        {/* HR row — only when HR was recorded */}
        {session.avgHr != null && (
          <View style={styles.statsRow}>
            <StatItem label="AVG HR" value={String(session.avgHr)} unit="bpm" />
            {session.peakHr != null && (
              <StatItem label="PEAK HR" value={String(session.peakHr)} unit="bpm" />
            )}
          </View>
        )}

        {/* PR highlights callout — gold-tinted panel with internal gold radial */}
        {session.prCount > 0 && (
          <View style={styles.prCallout}>
            <MintRadial
              tint={colors.prGold}
              corner="tr"
              size={100}
              top={-30}
              right={-30}
            />
            <Text style={styles.prCalloutTitle}>{'★'} PERSONAL RECORD{session.prCount > 1 ? 'S' : ''}</Text>
            {session.exercises.flatMap(exercise =>
              exercise.sets
                .filter(set => set.isPR)
                .map(set => (
                  <View key={`${exercise.exerciseId}-${set.setNumber}`} style={styles.prCalloutRow}>
                    <Text style={styles.prCalloutExercise}>{exercise.exerciseName}</Text>
                    <Text style={styles.prCalloutDetail}>
                      {set.weightLbs} lbs × {set.reps}
                    </Text>
                  </View>
                )),
            )}
          </View>
        )}

        {/* Exercise breakdown */}
        {session.exercises.map((exercise, exIdx) => (
          <View key={exercise.exerciseId}>
            {exIdx > 0 && <View style={styles.divider} />}
            <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
            {exercise.sets.map(set => {
              const warmupSuffix = set.isWarmup ? ' (warm-up)' : '';
              const prefix = set.isPR ? '★ ' : '';
              const label = `${prefix}Set ${set.setNumber}: ${set.weightLbs} × ${set.reps}${warmupSuffix}`;
              const rowStyle = set.isPR
                ? styles.setRowPR
                : set.isWarmup
                  ? styles.setRowWarmup
                  : styles.setRowDefault;
              return (
                <Text key={set.setNumber} style={[styles.setRow, rowStyle]}>
                  {label}
                </Text>
              );
            })}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

// ---------- Day Nutrition Summary Card ----------

interface NutritionData {
  waterOz: number;
  macros: MacroValues;
  calories: number;
}

function DayNutritionCard({ data }: { data: NutritionData | null }) {
  if (!data) { return null; }
  const { waterOz, macros, calories } = data;
  if (waterOz === 0 && macros.protein === 0 && macros.carbs === 0 && macros.fat === 0) {
    return null;
  }

  return (
    <View style={nutritionStyles.card}>
      {waterOz > 0 && (
        <View style={nutritionStyles.waterRow}>
          <WaterDropIcon size={14} />
          <Text style={nutritionStyles.waterValue}>{parseFloat(waterOz.toFixed(2))}</Text>
          <Text style={nutritionStyles.waterUnit}>oz</Text>
        </View>
      )}

      {(macros.protein > 0 || macros.carbs > 0 || macros.fat > 0) && (
        <View style={nutritionStyles.macroRow}>
          <View style={nutritionStyles.macroItem}>
            <Text style={nutritionStyles.macroValue}>{parseFloat(calories.toFixed(2))}</Text>
            <Text style={nutritionStyles.macroLabel}>CAL</Text>
          </View>
          <View style={nutritionStyles.macroDivider} />
          <View style={nutritionStyles.macroItem}>
            <Text style={nutritionStyles.macroValue}>{parseFloat(macros.protein.toFixed(2))}g</Text>
            <Text style={nutritionStyles.macroLabel}>PROTEIN</Text>
          </View>
          <View style={nutritionStyles.macroDivider} />
          <View style={nutritionStyles.macroItem}>
            <Text style={nutritionStyles.macroValue}>{parseFloat(macros.carbs.toFixed(2))}g</Text>
            <Text style={nutritionStyles.macroLabel}>CARBS</Text>
          </View>
          <View style={nutritionStyles.macroDivider} />
          <View style={nutritionStyles.macroItem}>
            <Text style={nutritionStyles.macroValue}>{parseFloat(macros.fat.toFixed(2))}g</Text>
            <Text style={nutritionStyles.macroLabel}>FAT</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const nutritionStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: spacing.md,
  },
  waterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 10,
  },
  waterValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.water,
    letterSpacing: -0.3,
    marginLeft: 4,
  },
  waterUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondary,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  macroLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.6,
    marginTop: 4,
  },
  macroDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
});

// ---------- Main screen ----------

export function CalendarDayDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { date } = route.params;

  const [sessions, setSessions] = useState<CalendarSessionDetail[]>([]);
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const [data, waterOz, macros] = await Promise.all([
        getDaySessionDetails(date),
        getWaterTotalByDate(date),
        getMacroTotalsByDate(date),
      ]);
      setSessions(data);
      setNutritionData({
        waterOz,
        macros,
        calories: computeCalories(macros.protein, macros.carbs, macros.fat),
      });
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function handleDelete(sessionId: number) {
    try {
      await deleteSession(sessionId);
      // Remove from local state for immediate UI feedback
      const remaining = sessions.filter(s => s.sessionId !== sessionId);
      setSessions(remaining);

      if (remaining.length === 0) {
        // No sessions left — go back to calendar
        navigation.goBack();
      }
    } catch {
      Alert.alert('Error', 'Failed to delete workout. Please try again.');
    }
  }

  const formattedDate = formatDate(date);

  return (
    <SafeAreaView style={styles.container}>
      {/* Screen header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerDate} numberOfLines={1} adjustsFontSizeToFit>
          {formattedDate}
        </Text>
        {/* Spacer to center the date */}
        <View style={styles.backButton} />
      </View>

      {/* Swipe hint */}
      {!loading && sessions.length > 0 && (
        <View style={styles.swipeHintBanner}>
          <Text style={styles.swipeHintText}>Swipe left on a workout to delete</Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No workout data found</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <DayNutritionCard data={nutritionData} />
          {sessions.map((session, idx) => (
            <SwipeableSessionCard
              key={session.sessionId}
              session={session}
              index={idx}
              onDelete={handleDelete}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: weightBold,
  },
  headerDate: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: weightBold,
    color: colors.primary,
    textAlign: 'center',
  },

  // Swipe hint banner
  swipeHintBanner: {
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  swipeHintText: {
    fontSize: fontSize.xs,
    color: colors.secondary,
    opacity: 0.6,
  },

  // Loading / empty
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxxl,
  },
  emptyText: {
    color: colors.secondary,
    fontSize: fontSize.base,
  },

  // Scroll area
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // Delete background
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_ZONE_WIDTH,
    backgroundColor: colors.danger,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    gap: 4,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
  },

  // Session card
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    overflow: 'hidden',
  },
  cardSpacing: {
    marginTop: spacing.md,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.secondary,
    marginTop: 2,
    letterSpacing: 0.3,
  },

  // PR badge chip in card header
  prBadge: {
    backgroundColor: colors.goldGlow,
    borderColor: colors.goldBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  prBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.prGold,
    letterSpacing: 0.5,
  },

  // Stats row (uppercase mini-labels, value above label)
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    flex: 1,
    minWidth: 60,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  statValueUnit: {
    fontSize: 10,
    color: colors.secondary,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 9.5,
    color: colors.secondary,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 2,
  },

  // PR callout
  prCallout: {
    backgroundColor: 'rgba(255,184,0,0.06)',
    borderColor: colors.goldBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  prCalloutTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.prGold,
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  prCalloutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  prCalloutExercise: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.prGold,
    flex: 1,
  },
  prCalloutDetail: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.prGold,
    opacity: 0.9,
  },

  // Exercise breakdown
  exerciseName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  setRow: {
    fontSize: 12,
    marginBottom: 2,
  },
  setRowDefault: {
    color: colors.textSoft,
    fontWeight: '600',
  },
  setRowWarmup: {
    color: colors.secondaryDim,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  setRowPR: {
    color: colors.prGold,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 10,
    marginBottom: 8,
  },
});
