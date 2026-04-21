import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { deleteProgram, getProgramDays, getPrograms } from '../db/programs';
import { getProgramTotalCompleted } from '../db/dashboard';
import { exportProgramData } from '../db';
import { ExportToast, ExportToastHandle } from '../components/ExportToast';
import { saveFileToDevice } from '../native/FileSaver';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightMedium, weightSemiBold } from '../theme/typography';
import { Program } from '../types';
import { CreateProgramModal } from './CreateProgramModal';
import Svg, { Circle } from 'react-native-svg';
import { Plus } from '../components/icons/Plus';
import { Dumbbell } from '../components/icons/Dumbbell';
import { Play } from '../components/icons/Play';
import { Export as ExportIcon } from '../components/icons/Export';
import { Trash } from '../components/icons/Trash';
import { Dots } from '../components/icons/Dots';
import { Trophy } from '../components/icons/Trophy';
import { Check } from '../components/icons/Check';
import { Chevron } from '../components/icons/Chevron';

type ProgramTag = 'STRENGTH' | 'POWER' | 'HYPERTROPHY' | 'CONDITIONING';

function getProgramTag(name: string): ProgramTag {
  const n = name.toLowerCase();
  if (/power|5.?3.?1|deadlift|squat.*max|strongman/.test(n)) return 'POWER';
  if (/hypertrophy|ppl|push.?pull|volume|mass|bodybuild/.test(n)) return 'HYPERTROPHY';
  if (/conditioning|shred|cardio|hiit|endurance|crossfit/.test(n)) return 'CONDITIONING';
  return 'STRENGTH';
}

const TAG_COLORS: Record<ProgramTag, { bg: string; text: string }> = {
  STRENGTH:     { bg: 'rgba(91,155,240,0.15)',  text: '#5B9BF0' },
  POWER:        { bg: 'rgba(240,184,48,0.15)',  text: '#F0B830' },
  HYPERTROPHY:  { bg: 'rgba(141,194,138,0.15)', text: '#8DC28A' },
  CONDITIONING: { bg: 'rgba(224,105,126,0.15)', text: '#E0697E' },
};

function ProgressBar({ progress }: { progress: number }) {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, { width: `${clampedProgress * 100}%` }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: '#33373D',
    borderRadius: 8,
  },
  fill: {
    height: 8,
    backgroundColor: colors.accent,
    borderRadius: 8,
  },
});

function CompletionCircle({ isComplete }: { isComplete: boolean }) {
  return (
    <View
      style={[
        circleStyles.circle,
        isComplete ? circleStyles.circleDone : circleStyles.circlePending,
      ]}>
      {isComplete && <Text style={circleStyles.checkIcon}>{'\u2713'}</Text>}
    </View>
  );
}

const CIRCLE_SIZE = 32;
const circleStyles = StyleSheet.create({
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  circlePending: {
    borderColor: colors.secondary,
    backgroundColor: 'transparent',
  },
  circleDone: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  checkIcon: {
    fontSize: fontSize.base,
    fontWeight: weightBold,
    color: colors.onAccent,
    lineHeight: fontSize.base + 2,
  },
});

function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <View style={newStyles.statPill}>
      <Text style={newStyles.statPillValue}>{value}</Text>
      <Text style={newStyles.statPillLabel}>{label}</Text>
    </View>
  );
}

function TabSwitcher({
  tab,
  onChange,
  activeCount,
  pastCount,
}: {
  tab: 'active' | 'past';
  onChange: (t: 'active' | 'past') => void;
  activeCount: number;
  pastCount: number;
}) {
  return (
    <View style={newStyles.tabSwitcherContainer}>
      <TouchableOpacity
        style={[newStyles.tabButton, tab === 'active' && newStyles.tabButtonActive]}
        onPress={() => onChange('active')}
        testID="tab-active"
      >
        <Text style={[newStyles.tabButtonText, tab === 'active' && newStyles.tabButtonTextActive]}>
          Active ({activeCount})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[newStyles.tabButton, tab === 'past' && newStyles.tabButtonActive]}
        onPress={() => onChange('past')}
        testID="tab-past"
      >
        <Text style={[newStyles.tabButtonText, tab === 'past' && newStyles.tabButtonTextActive]}>
          Completed ({pastCount})
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function TagPill({ tag }: { tag: ProgramTag }) {
  const style = TAG_COLORS[tag];
  return (
    <View style={[newStyles.tagPill, { backgroundColor: style.bg }]}>
      <Text style={[newStyles.tagPillText, { color: style.text }]}>{tag}</Text>
    </View>
  );
}

function TopAccentLine({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View
      style={{
        height: 3,
        width: `${clamped * 100}%`,
        backgroundColor: colors.accent,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
    />
  );
}

function ArcProgress({
  progress,
  size = 60,
  stroke = 5,
}: {
  progress: number;
  size?: number;
  stroke?: number;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - clamped);
  const pct = Math.round(clamped * 100);
  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={size}
        height={size}
        style={{ transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colors.accent}
          strokeWidth={stroke}
          strokeDasharray={`${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={newStyles.arcCenter}>
          <Text style={newStyles.arcPercent}>{pct}</Text>
          <Text style={newStyles.arcPercentSymbol}>%</Text>
        </View>
      </View>
    </View>
  );
}

function ReadyToStart({ weeks, days }: { weeks: number; days: number }) {
  return (
    <View style={newStyles.readyContainer}>
      <View style={newStyles.readyIconContainer}>
        <Play size={14} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={newStyles.readyTitle}>Ready to start</Text>
        <Text style={newStyles.readySubtitle}>
          {days} days/week · {weeks} weeks
        </Text>
      </View>
      <Chevron size={14} color={colors.accent} dir="right" />
    </View>
  );
}

function CompletedBadge({ totalWorkouts, weeks }: { totalWorkouts: number; weeks: number }) {
  return (
    <View style={newStyles.completedRow}>
      <View style={newStyles.completedIconContainer}>
        <Check size={18} color={colors.accent} />
      </View>
      <View>
        <Text style={newStyles.completedTitle}>Completed</Text>
        <Text style={newStyles.completedSubtitle}>
          {totalWorkouts} sessions · {weeks} weeks
        </Text>
      </View>
      <View style={{ marginLeft: 'auto' }}>
        <View style={newStyles.donePill}>
          <Trophy size={12} color={colors.prGold} />
          <Text style={newStyles.donePillText}>Done</Text>
        </View>
      </View>
    </View>
  );
}

function EmptyState({ tab, onCreate }: { tab: 'active' | 'past'; onCreate: () => void }) {
  return (
    <View style={newStyles.emptyContainer}>
      <View style={newStyles.emptyIconContainer}>
        <Dumbbell size={28} color={colors.secondaryDim} />
      </View>
      <Text style={newStyles.emptyTitleNew}>
        {tab === 'active' ? 'No active programs' : 'No completed programs'}
      </Text>
      {tab === 'active' && (
        <TouchableOpacity style={newStyles.emptyCreateBtn} onPress={onCreate} testID="empty-create-button">
          <Text style={newStyles.emptyCreateText}>Create one</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function PopupMenu({
  visible,
  onClose,
  anchorPosition,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  anchorPosition: { top: number; right: number };
  children: React.ReactNode;
}) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
        <View
          style={[
            menuStyles.container,
            { position: 'absolute', top: anchorPosition.top, right: anchorPosition.right },
          ]}
        >
          {children}
        </View>
      </Pressable>
    </Modal>
  );
}

function ProgramCard({
  program,
  isDeleting,
  completedWorkouts,
  dayCount,
  onTap,
  onMenuPress,
}: {
  program: Program;
  isDeleting: boolean;
  completedWorkouts: number;
  dayCount: number;
  onTap: () => void;
  onMenuPress: (position: { top: number; right: number }) => void;
}) {
  const isActivated = program.startDate !== null;
  const totalWorkouts = dayCount * program.weeks;
  const isComplete = isActivated && totalWorkouts > 0 && completedWorkouts >= totalWorkouts;
  const progress =
    isActivated && totalWorkouts > 0 ? Math.min(completedWorkouts / totalWorkouts, 1) : 0;
  const tag = getProgramTag(program.name);

  return (
    <TouchableOpacity
      style={[
        styles.programCard,
        newStyles.cardRounded,
        isDeleting && styles.cardDeleting,
      ]}
      onPress={onTap}
      activeOpacity={0.7}
    >
      {isActivated && !isComplete && <TopAccentLine progress={progress} />}

      <View style={newStyles.cardBody}>
        {/* Card header: tag pill + menu button */}
        <View style={newStyles.cardHeaderRow}>
          <TagPill tag={tag} />
          <TouchableOpacity
            onPress={(e) => {
              onMenuPress({ top: (e?.nativeEvent?.pageY ?? 0) + 8, right: 16 });
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={newStyles.menuButtonRound}
            testID="menu-button"
          >
            <Dots size={18} color={colors.secondary} />
          </TouchableOpacity>
        </View>

        {/* Program name */}
        <Text
          style={[
            newStyles.programNameLarge,
            isComplete && newStyles.programNameCompleted,
          ]}
        >
          {program.name}
        </Text>

        {/* State-specific body */}
        {isActivated && !isComplete && (
          <View style={newStyles.progressRow}>
            <ArcProgress progress={progress} size={60} stroke={5} />
            <View style={{ flex: 1 }}>
              <View style={newStyles.statsColumns}>
                <View>
                  <Text style={newStyles.statLabel}>WEEK</Text>
                  <Text style={newStyles.statValue}>
                    {program.currentWeek}
                    <Text style={newStyles.statValueDim}>/{program.weeks}</Text>
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={newStyles.statLabel}>SESSIONS</Text>
                  <Text style={newStyles.statValue}>
                    {completedWorkouts}
                    <Text style={newStyles.statValueDim}>/{totalWorkouts}</Text>
                  </Text>
                </View>
              </View>
              <ProgressBar progress={progress} />
            </View>
          </View>
        )}

        {!isActivated && (
          <ReadyToStart weeks={program.weeks} days={dayCount} />
        )}

        {isComplete && (
          <CompletedBadge totalWorkouts={totalWorkouts} weeks={program.weeks} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export function ProgramsScreen() {
  const navigation = useNavigation<any>();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programStats, setProgramStats] = useState<Record<number, { completed: number; dayCount: number }>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'active' | 'past'>('active');

  // Menu state
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 16 });
  const [menuProgram, setMenuProgram] = useState<Program | null>(null);
  const [menuProgramHasData, setMenuProgramHasData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportToastRef = useRef<ExportToastHandle>(null);

  const loadPrograms = useCallback(async () => {
    try {
      const result = await getPrograms();
      setPrograms(result);
      const stats: Record<number, { completed: number; dayCount: number }> = {};
      await Promise.all(
        result.map(async (p) => {
          const [completed, days] = await Promise.all([
            getProgramTotalCompleted(p.id),
            getProgramDays(p.id),
          ]);
          stats[p.id] = { completed, dayCount: days.length };
        }),
      );
      setProgramStats(stats);
    } catch {
      // ignore load errors
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPrograms();
    }, [loadPrograms]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPrograms();
    setRefreshing(false);
  }, [loadPrograms]);

  const handleCreated = useCallback((program: Program) => {
    setPrograms(prev => [program, ...prev]);
  }, []);

  const confirmDeleteProgram = useCallback(async (programId: number) => {
    try {
      await deleteProgram(programId);
      setPrograms(prev => prev.filter(p => p.id !== programId));
    } catch {
      // ignore
    }
    setDeletingId(null);
  }, []);

  const handleMenuPress = useCallback((program: Program, position: { top: number; right: number }) => {
    const stats = programStats[program.id];
    const hasData = (stats?.completed ?? 0) > 0;
    setMenuProgram(program);
    setMenuPosition(position);
    setMenuProgramHasData(hasData);
    setMenuVisible(true);
  }, [programStats]);

  const handleExport = useCallback(async () => {
    if (!menuProgram) return;
    setIsExporting(true);
    try {
      const data = await exportProgramData(menuProgram.id);
      if (!data) {
        setMenuVisible(false);
        setIsExporting(false);
        exportToastRef.current?.show('Export failed', 'error');
        return;
      }
      const jsonString = JSON.stringify(data, null, 2);
      const safeName = menuProgram.name.replace(/[^a-zA-Z0-9]/g, '_');
      const today = new Date().toISOString().split('T')[0];
      const filename = `${safeName}_${today}.json`;

      setMenuVisible(false);
      setIsExporting(false);

      const saved = await saveFileToDevice(jsonString, filename);
      if (saved) {
        exportToastRef.current?.show('Export saved', 'success');
      }
      // cancel = no toast (silent dismiss)
    } catch {
      setMenuVisible(false);
      setIsExporting(false);
      exportToastRef.current?.show('Export failed', 'error');
    }
  }, [menuProgram]);

  const handleDeleteFromMenu = useCallback(() => {
    if (!menuProgram) return;
    setMenuVisible(false);
    setDeletingId(menuProgram.id);
    Alert.alert(
      'Delete Program',
      `Delete "${menuProgram.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setDeletingId(null) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { confirmDeleteProgram(menuProgram.id); },
        },
      ],
    );
  }, [menuProgram, confirmDeleteProgram]);

  const handleTap = useCallback(
    (program: Program) => {
      navigation.navigate('ProgramDetail', { programId: program.id });
    },
    [navigation],
  );

  // Split into active and past programs based on workout completion
  const activePrograms = programs.filter(p => {
    if (p.startDate === null) return true;
    const s = programStats[p.id];
    if (!s) return true;
    return s.completed < s.dayCount * p.weeks;
  });
  const pastPrograms = programs.filter(p => {
    if (p.startDate === null) return false;
    const s = programStats[p.id];
    if (!s) return false;
    return s.completed >= s.dayCount * p.weeks;
  });

  const shown = tab === 'active' ? activePrograms : pastPrograms;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={newStyles.topWrapper}>
        <View style={newStyles.headerRow}>
          <View>
            <Text style={newStyles.eyebrow}>TRAINING</Text>
            <Text style={newStyles.titleLarge}>Programs</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="add-program-button"
          >
            <Plus size={20} color={colors.onAccent} />
          </TouchableOpacity>
        </View>
        <View style={newStyles.statsRow}>
          <StatPill value={activePrograms.length} label="ACTIVE" />
          <StatPill value={pastPrograms.length} label="COMPLETED" />
          <StatPill
            value={activePrograms.filter(p => p.startDate !== null).length}
            label="IN PROGRESS"
          />
        </View>
        <TabSwitcher
          tab={tab}
          onChange={setTab}
          activeCount={activePrograms.length}
          pastCount={pastPrograms.length}
        />
      </View>

      {shown.length === 0 ? (
        <EmptyState tab={tab} onCreate={() => setModalVisible(true)} />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        >
          {shown.map(program => (
            <ProgramCard
              key={program.id}
              program={program}
              isDeleting={deletingId === program.id}
              completedWorkouts={programStats[program.id]?.completed ?? 0}
              dayCount={programStats[program.id]?.dayCount ?? 0}
              onTap={() => handleTap(program)}
              onMenuPress={(position) => handleMenuPress(program, position)}
            />
          ))}
        </ScrollView>
      )}

      <PopupMenu
        visible={menuVisible}
        onClose={() => { setMenuVisible(false); setIsExporting(false); }}
        anchorPosition={menuPosition}
      >
        {/* Export menu item */}
        <TouchableOpacity
          style={[menuStyles.menuItem, !menuProgramHasData && menuStyles.menuItemDisabled]}
          onPress={menuProgramHasData && !isExporting ? handleExport : undefined}
          disabled={!menuProgramHasData || isExporting}
          activeOpacity={0.7}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <ExportIcon size={16} color={colors.secondary} />
              <Text style={[menuStyles.menuItemText, !menuProgramHasData && menuStyles.menuItemTextDisabled]}>
                Export
              </Text>
              {!menuProgramHasData && (
                <Text style={menuStyles.menuItemSubtext}>No workout data</Text>
              )}
            </>
          )}
        </TouchableOpacity>

        <View style={menuStyles.menuSeparator} />

        {/* Delete menu item */}
        <TouchableOpacity
          style={menuStyles.menuItem}
          onPress={handleDeleteFromMenu}
          activeOpacity={0.7}
        >
          <Trash size={16} color={colors.danger} />
          <Text style={[menuStyles.menuItemText, menuStyles.menuItemDanger]}>Delete</Text>
        </TouchableOpacity>
      </PopupMenu>

      <ExportToast ref={exportToastRef} />

      <CreateProgramModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreated={handleCreated}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: weightBold,
    color: colors.primary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: fontSize.xl,
    color: colors.onAccent,
    fontWeight: weightBold,
    lineHeight: 26,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.secondary,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionHeaderSpaced: {
    marginTop: spacing.xl,
  },
  programCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDeleting: {
    opacity: 0.5,
  },
  programCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  programName: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDots: {
    fontSize: fontSize.lg,
    color: colors.secondary,
    fontWeight: weightBold,
  },
  programSubtitle: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  nestedCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nestedCardLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: colors.secondary,
    marginBottom: 2,
  },
  nestedCardValue: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.primary,
  },
  progressContainer: {
    marginTop: spacing.xs,
  },
  progressLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
  },
});

const menuStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    paddingVertical: spacing.xs,
    minWidth: 180,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  menuItemDisabled: {
    opacity: 0.4,
  },
  menuItemText: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: weightMedium,
  },
  menuItemTextDisabled: {
    color: colors.secondary,
  },
  menuItemSubtext: {
    fontSize: fontSize.xs,
    color: colors.secondary,
    marginLeft: spacing.sm,
  },
  menuItemDanger: {
    color: colors.danger,
  },
  menuSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
});

const newStyles = StyleSheet.create({
  // Header
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 2,
    marginBottom: 4,
  },
  titleLarge: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -1,
    lineHeight: 30,
  },

  // Screen layout
  topWrapper: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  statPill: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statPillValue: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.primary,
  },
  statPillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondaryDim,
    letterSpacing: 1.2,
    marginTop: 1,
  },

  // Tab switcher
  tabSwitcherContainer: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.3,
  },
  tabButtonTextActive: {
    color: colors.primary,
  },

  // Tag pill
  tagPill: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
  },

  // Card body
  cardBody: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  menuButtonRound: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  programNameLarge: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
    lineHeight: 23,
    marginBottom: 14,
  },
  programNameCompleted: {
    color: colors.secondary,
    textDecorationLine: 'line-through',
  },

  // Progress row
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statsColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryDim,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  statValueDim: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondary,
  },

  // Arc center overlay
  arcCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcPercent: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    lineHeight: 14,
  },
  arcPercentSymbol: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.secondaryDim,
    letterSpacing: 1,
  },

  // Ready to start
  readyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(141,194,138,0.3)',
    backgroundColor: 'rgba(141,194,138,0.06)',
  },
  readyIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  readySubtitle: {
    fontSize: 11,
    color: colors.secondaryDim,
  },

  // Completed state
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completedIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(141,194,138,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  completedSubtitle: {
    fontSize: 11,
    color: colors.secondaryDim,
  },
  donePill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,184,0,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  donePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.prGold,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitleNew: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
  },
  emptyCreateBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: 'rgba(141,194,138,0.3)',
  },
  emptyCreateText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accent,
  },

  // Card chrome
  cardRounded: {
    borderRadius: 20,
    padding: 0,
    overflow: 'hidden',
    marginBottom: 12,
  },
});
