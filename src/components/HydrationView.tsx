import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import HapticFeedback from 'react-native-haptic-feedback';
import { hydrationDb } from '../db';
import { WaterCup } from './WaterCup';
import { LogWaterModal } from '../screens/LogWaterModal';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';

export function HydrationView() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentTotal, setCurrentTotal] = useState(0);
  const [goalOz, setGoalOz] = useState<number>(64); // D-09: hardcoded 64 default
  const [modalVisible, setModalVisible] = useState(false);

  const refreshData = useCallback(async () => {
    const [total, settings] = await Promise.all([
      hydrationDb.getTodayWaterTotal(),
      hydrationDb.getWaterGoal(),
    ]);
    setCurrentTotal(total);
    if (settings?.goalOz != null) {
      setGoalOz(settings.goalOz);
    }
    // else keep default 64 per D-09
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        await refreshData();
        if (!cancelled) { setIsLoading(false); }
      })();
      return () => { cancelled = true; };
    }, [refreshData]),
  );

  const handleQuickAdd = useCallback(async (oz: number) => {
    HapticFeedback.trigger('impactMedium', { enableVibrateFallback: true });
    try {
      await hydrationDb.logWater(oz);
      await refreshData();
    } catch (_err) {
      // Silent fail — cup doesn't update, user can retry
    }
  }, [refreshData]);

  const handleOpenModal = useCallback(() => setModalVisible(true), []);
  const handleCloseModal = useCallback(() => setModalVisible(false), []);
  const handleModalSaved = useCallback(async () => {
    await refreshData();
  }, [refreshData]);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Cup visualization — centered hero */}
          <View style={styles.cupSection}>
            <WaterCup currentOz={currentTotal} goalOz={goalOz} />
          </View>

          {/* Quick-add section */}
          <View style={styles.quickAddSection}>
            <Text style={styles.sectionHeader}>QUICK ADD</Text>
            <View style={styles.quickAddRow}>
              {([8, 16, 24] as const).map(oz => (
                <TouchableOpacity
                  key={oz}
                  style={styles.quickAddButton}
                  onPress={() => handleQuickAdd(oz)}
                  activeOpacity={0.7}
                  accessibilityLabel={`+${oz} fl oz`}
                >
                  <Text style={styles.quickAddText}>+{oz} oz</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Log Water CTA */}
          <TouchableOpacity
            style={styles.logWaterButton}
            onPress={handleOpenModal}
            activeOpacity={0.8}
            accessibilityLabel="Log custom water amount"
          >
            <Text style={styles.logWaterButtonText}>+ Log Water</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <LogWaterModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSaved={handleModalSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 100 },
  cupSection: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingHorizontal: spacing.base,
  },
  quickAddSection: {
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
  quickAddRow: { flexDirection: 'row', gap: spacing.sm },
  quickAddButton: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
  },
  logWaterButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginHorizontal: spacing.base,
    marginTop: spacing.xl,
    minHeight: 48,
    justifyContent: 'center',
  },
  logWaterButtonText: {
    color: colors.onAccent,
    fontSize: fontSize.base,
    fontWeight: weightBold,
  },
});
