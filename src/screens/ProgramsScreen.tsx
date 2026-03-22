import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
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
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightMedium, weightSemiBold } from '../theme/typography';
import { Program } from '../types';
import { CreateProgramModal } from './CreateProgramModal';

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
  const progress = isActivated && totalWorkouts > 0 ? Math.min(completedWorkouts / totalWorkouts, 1) : 0;
  const progressPercent = Math.round(progress * 100);

  return (
    <TouchableOpacity
      style={[styles.programCard, isDeleting && styles.cardDeleting]}
      onPress={onTap}
      activeOpacity={0.7}>
      {/* Top row: name + completion circle + menu button */}
      <View style={styles.programCardHeader}>
        <Text style={styles.programName}>{program.name}</Text>
        <View style={styles.headerRight}>
          <CompletionCircle isComplete={isComplete} />
          <TouchableOpacity
            onPress={(e) => { onMenuPress({ top: (e?.nativeEvent?.pageY ?? 0) + 8, right: 16 }); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.menuButton}
            testID="menu-button"
          >
            <Text style={styles.menuDots}>{'\u22EE'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isActivated && !isComplete && (
        <>
          {/* Nested info cards */}
          <View style={styles.nestedCard}>
            <Text style={styles.nestedCardLabel}>Progress</Text>
            <Text style={styles.nestedCardValue}>
              {completedWorkouts} of {totalWorkouts} workouts
            </Text>
          </View>

          <View style={styles.nestedCard}>
            <Text style={styles.nestedCardLabel}>Week</Text>
            <Text style={styles.nestedCardValue}>
              {program.currentWeek} of {program.weeks}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <ProgressBar progress={progress} />
            <Text style={styles.progressLabel}>{progressPercent}%</Text>
          </View>
        </>
      )}

      {!isActivated && (
        <Text style={styles.programSubtitle}>
          {program.weeks} week{program.weeks !== 1 ? 's' : ''} · Not started
        </Text>
      )}

      {isComplete && (
        <Text style={styles.programSubtitle}>
          {program.weeks} week{program.weeks !== 1 ? 's' : ''}
        </Text>
      )}
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

      const result = await Share.share({
        message: jsonString,
        title: filename,
      });

      if (result.action === Share.sharedAction) {
        exportToastRef.current?.show('Export saved', 'success');
      }
      // Per D-14: cancel = no toast (silent dismiss)
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Programs</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {programs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No programs yet</Text>
          <Text style={styles.emptyHint}>Tap + to create one</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }>
          {/* Active Programs */}
          {activePrograms.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>ACTIVE PROGRAMS</Text>
              {activePrograms.map(program => (
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
            </>
          )}

          {/* Past Programs */}
          {pastPrograms.length > 0 && (
            <>
              <Text style={[styles.sectionHeader, activePrograms.length > 0 && styles.sectionHeaderSpaced]}>
                PAST PROGRAMS
              </Text>
              {pastPrograms.map(program => (
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
            </>
          )}
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
    borderRadius: 8,
    paddingVertical: spacing.xs,
    minWidth: 180,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
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
