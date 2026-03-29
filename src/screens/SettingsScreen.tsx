import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { exportAllData } from '../db/dashboard';
import { saveFileToDevice } from '../native/FileSaver';
import { repairProgramData } from '../db/repair';
import {
  getHRSettings,
  setAge as saveAge,
  setMaxHrOverride as saveMaxHrOverride,
} from '../services/HRSettingsService';
import { computeMaxHR } from '../utils/hrZones';
import { DeviceScanSheet } from './DeviceScanSheet';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightRegular, weightSemiBold } from '../theme/typography';

export function SettingsScreen() {
  const navigation = useNavigation();
  const [isExporting, setIsExporting] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  // HR Monitor card state
  const [ageInput, setAgeInput] = useState('');
  const [maxHrOverrideInput, setMaxHrOverrideInput] = useState('');
  const [scanSheetVisible, setScanSheetVisible] = useState(false);

  // Load HR settings on mount
  useEffect(() => {
    getHRSettings().then(settings => {
      if (settings.age !== null) {
        setAgeInput(String(settings.age));
      }
      if (settings.maxHrOverride !== null) {
        setMaxHrOverrideInput(String(settings.maxHrOverride));
      }
    });
  }, []);

  // Derived: effective max HR for display
  const computedMaxHr = React.useMemo(() => {
    const age = parseInt(ageInput, 10);
    const override = parseInt(maxHrOverrideInput, 10);
    if (!isNaN(override) && maxHrOverrideInput.length > 0) {
      return { value: override, source: 'manual override' as const };
    }
    if (!isNaN(age) && ageInput.length > 0) {
      return { value: computeMaxHR(age, null), source: 'Tanaka formula' as const };
    }
    return null;
  }, [ageInput, maxHrOverrideInput]);

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

  const handleAgeBlur = useCallback(() => {
    const age = parseInt(ageInput, 10);
    if (!isNaN(age) && age > 0 && age < 130) {
      saveAge(age).catch(() => {});
    }
  }, [ageInput]);

  const handleMaxHrBlur = useCallback(() => {
    const val = parseInt(maxHrOverrideInput, 10);
    if (maxHrOverrideInput.trim() === '') {
      saveMaxHrOverride(null).catch(() => {});
    } else if (!isNaN(val) && val > 0) {
      saveMaxHrOverride(val).catch(() => {});
    }
  }, [maxHrOverrideInput]);

  const handleScanSheetClose = useCallback(() => {
    setScanSheetVisible(false);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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

      <ScrollView contentContainerStyle={styles.content}>
        {/* Export Data card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Export Data</Text>
          <Text style={styles.cardDescription}>
            Export all workout data as JSON for backup
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleExport}
            disabled={isExporting}
            activeOpacity={0.85}>
            {isExporting ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Export</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Repair Data card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Repair Data</Text>
          <Text style={styles.cardDescription}>
            Fix week counter (reset to 4), remove bogus week 5-8 sessions, and restore March 24/25 workouts
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, styles.repairButton]}
            onPress={handleRepair}
            disabled={isRepairing}
            activeOpacity={0.85}>
            {isRepairing ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Repair</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* HR Monitor card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>HR Monitor</Text>
          <Text style={styles.cardDescription}>
            Configure your heart rate monitor and zone settings
          </Text>

          {/* Age input */}
          <Text style={styles.inputLabel}>Age (years)</Text>
          <TextInput
            style={styles.textInput}
            value={ageInput}
            onChangeText={setAgeInput}
            onBlur={handleAgeBlur}
            keyboardType="numeric"
            maxLength={3}
            placeholder="e.g. 35"
            placeholderTextColor={colors.secondary}
            returnKeyType="done"
          />

          {/* Computed max HR display */}
          <Text style={styles.computedHrText}>
            {computedMaxHr
              ? `Max HR: ${computedMaxHr.value} bpm (${computedMaxHr.source})`
              : 'Enter age to compute max HR'}
          </Text>

          {/* Max HR override input */}
          <Text style={[styles.inputLabel, styles.inputLabelSpaced]}>Max HR Override (optional)</Text>
          <TextInput
            style={styles.textInput}
            value={maxHrOverrideInput}
            onChangeText={setMaxHrOverrideInput}
            onBlur={handleMaxHrBlur}
            keyboardType="numeric"
            maxLength={3}
            placeholder="Leave blank to use formula"
            placeholderTextColor={colors.secondary}
            returnKeyType="done"
          />

          {/* Pair Device button */}
          <TouchableOpacity
            style={[styles.primaryButton, styles.pairButton]}
            onPress={() => setScanSheetVisible(true)}
            activeOpacity={0.85}>
            <Text style={styles.pairButtonText}>Pair HR Monitor</Text>
          </TouchableOpacity>
        </View>

        {/* About card */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>GymTrack v1.0</Text>
          <Text style={styles.aboutSubtitle}>Local-only workout tracker</Text>
        </View>
      </ScrollView>

      {/* Device scan sheet — rendered at root level to overlay content */}
      <DeviceScanSheet
        visible={scanSheetVisible}
        onClose={handleScanSheetClose}
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
    paddingBottom: spacing.xxxl,
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
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.background,
  },
  repairButton: {
    backgroundColor: '#E67E22',
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  inputLabelSpaced: {
    marginTop: spacing.md,
  },
  textInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: weightRegular,
    marginBottom: spacing.xs,
    minHeight: 44,
  },
  computedHrText: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  pairButton: {
    backgroundColor: colors.accentDim,
    marginTop: spacing.md,
  },
  pairButtonText: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.accent,
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
