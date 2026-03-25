import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { exportAllData } from '../db/dashboard';
import { saveFileToDevice } from '../native/FileSaver';
import { repairProgramData } from '../db/repair';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

export function SettingsScreen() {
  const navigation = useNavigation();
  const [isExporting, setIsExporting] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  const handleRepair = useCallback(async () => {
    Alert.alert(
      'Repair Data',
      'Reset week to 4, remove bogus week 5-8 sessions, and restore March 24/25 workouts?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Repair',
          onPress: async () => {
            setIsRepairing(true);
            try {
              const result = await repairProgramData();
              Alert.alert('Repair Complete', result);
            } catch (e: any) {
              Alert.alert('Repair Failed', e?.message ?? 'Unknown error');
            } finally {
              setIsRepairing(false);
            }
          },
        },
      ],
    );
  }, []);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const jsonString = JSON.stringify(data, null, 2);
      const today = new Date().toISOString().split('T')[0];
      await saveFileToDevice(jsonString, `gymtrack-export-${today}.json`);
    } catch {
      // ignore - user may have cancelled save dialog
    } finally {
      setIsExporting(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Export Data</Text>
          <Text style={styles.cardDescription}>
            Export all workout data as JSON for backup
          </Text>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExport}
            disabled={isExporting}
            activeOpacity={0.85}>
            {isExporting ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <Text style={styles.exportButtonText}>Export</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Repair Data</Text>
          <Text style={styles.cardDescription}>
            Fix week counter (reset to 4), remove bogus week 5-8 sessions, and restore March 24/25 workouts
          </Text>
          <TouchableOpacity
            style={[styles.exportButton, styles.repairButton]}
            onPress={handleRepair}
            disabled={isRepairing}
            activeOpacity={0.85}>
            {isRepairing ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <Text style={styles.exportButtonText}>Repair</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>GymTrack v1.0</Text>
          <Text style={styles.aboutSubtitle}>Local-only workout tracker</Text>
        </View>
      </View>
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
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: fontSize.xl,
    color: colors.accent,
    fontWeight: weightBold,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginBottom: spacing.md,
  },
  exportButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  exportButtonText: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.background,
  },
  repairButton: {
    backgroundColor: '#E67E22',
  },
  aboutCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.base,
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  aboutSubtitle: {
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
});
