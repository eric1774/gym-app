import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { exportAllData } from '../db/dashboard';
import { saveFileToDevice } from '../native/FileSaver';
import { scanDatabase, fixDatabaseIssues, type DiagnosticResult } from '../db/repair';
import { getHRSettings, setAge, setMaxHrOverride } from '../services/HRSettingsService';
import { DeviceScanSheet } from './DeviceScanSheet';
import { useHeartRate } from '../context/HeartRateContext';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightRegular } from '../theme/typography';

export function SettingsScreen() {
  const navigation = useNavigation();
  const { pairedDeviceName, disconnect } = useHeartRate();
  const [isExporting, setIsExporting] = useState(false);
  const [healthCheckResult, setHealthCheckResult] = useState<DiagnosticResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  // HR Monitor card state
  const [ageValue, setAgeValue] = useState<string>('');
  const [maxHrDisplay, setMaxHrDisplay] = useState<string>('');
  const [maxHrSource, setMaxHrSource] = useState<'tanaka' | 'custom'>('tanaka');
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideValue, setOverrideValue] = useState<string>('');
  const [pairedDeviceId, setPairedDeviceId] = useState<string | null>(null);
  const [scanSheetVisible, setScanSheetVisible] = useState(false);

  const loadSettings = useCallback(async () => {
    const settings = await getHRSettings();
    if (settings.age !== null) {
      setAgeValue(String(settings.age));
    }
    if (settings.maxHrOverride !== null) {
      setOverrideEnabled(true);
      setOverrideValue(String(settings.maxHrOverride));
      setMaxHrDisplay(`${settings.maxHrOverride} bpm (custom)`);
      setMaxHrSource('custom');
    } else if (settings.age !== null) {
      const computed = Math.round(208 - 0.7 * settings.age);
      setMaxHrDisplay(`${computed} bpm (Tanaka)`);
      setMaxHrSource('tanaka');
    } else {
      setMaxHrDisplay('');
    }
    setPairedDeviceId(settings.pairedDeviceId);
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleAgeBlur = useCallback(async () => {
    const parsed = parseInt(ageValue, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 120) {
      // Invalid — restore previous valid value silently
      const settings = await getHRSettings();
      setAgeValue(settings.age !== null ? String(settings.age) : '');
      return;
    }
    await setAge(parsed);
    // Recompute max HR display
    if (!overrideEnabled) {
      const computed = Math.round(208 - 0.7 * parsed);
      setMaxHrDisplay(`${computed} bpm (Tanaka)`);
      setMaxHrSource('tanaka');
    }
  }, [ageValue, overrideEnabled]);

  const handleOverrideToggle = useCallback(async (enabled: boolean) => {
    setOverrideEnabled(enabled);
    if (!enabled) {
      // Revert to Tanaka
      await setMaxHrOverride(null);
      const age = parseInt(ageValue, 10);
      if (!isNaN(age) && age >= 1 && age <= 120) {
        const computed = Math.round(208 - 0.7 * age);
        setMaxHrDisplay(`${computed} bpm (Tanaka)`);
        setMaxHrSource('tanaka');
      } else {
        setMaxHrDisplay('');
      }
      setOverrideValue('');
    }
  }, [ageValue]);

  const handleOverrideBlur = useCallback(async () => {
    const parsed = parseInt(overrideValue, 10);
    if (isNaN(parsed) || parsed < 100 || parsed > 250) {
      // Invalid — restore previous override or clear
      const settings = await getHRSettings();
      if (settings.maxHrOverride !== null) {
        setOverrideValue(String(settings.maxHrOverride));
      } else {
        setOverrideValue('');
      }
      return;
    }
    await setMaxHrOverride(parsed);
    setMaxHrDisplay(`${parsed} bpm (custom)`);
    setMaxHrSource('custom');
  }, [overrideValue]);

  const handleUnpair = useCallback(() => {
    Alert.alert(
      'Unpair Device',
      'Remove your paired heart rate monitor? You can re-pair at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpair',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnect();
              setPairedDeviceId(null);
            } catch (e: any) {
              Alert.alert('Error', 'Could not remove paired device. Please try again.');
            }
          },
        },
      ],
    );
  }, [disconnect]);

  const handleScanSheetClose = useCallback(() => {
    setScanSheetVisible(false);
    loadSettings(); // Reload settings — user may have just paired
  }, [loadSettings]);

  const handleScan = useCallback(async () => {
    setIsScanning(true);
    try {
      const result = await scanDatabase();
      setHealthCheckResult(result);
    } catch (e: any) {
      Alert.alert('Scan Failed', e?.message ?? 'Unknown error');
    } finally {
      setIsScanning(false);
    }
  }, []);

  const handleFix = useCallback(async () => {
    if (!healthCheckResult || healthCheckResult.totalIssues === 0) return;
    Alert.alert(
      'Fix Issues',
      `Apply fixes for ${healthCheckResult.totalIssues} issue(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fix All',
          style: 'destructive',
          onPress: async () => {
            setIsFixing(true);
            try {
              const fix = await fixDatabaseIssues(healthCheckResult);
              Alert.alert('Fixed', fix.details.join('\n'));
              setHealthCheckResult(null);
            } catch (e: any) {
              Alert.alert('Fix Failed', e?.message ?? 'Unknown error');
            } finally {
              setIsFixing(false);
            }
          },
        },
      ],
    );
  }, [healthCheckResult]);

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

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Heart Rate Monitor card — first card per D-12 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Heart Rate Monitor</Text>

          {/* Age Row */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Age</Text>
            <TextInput
              style={styles.numberInput}
              value={ageValue}
              onChangeText={setAgeValue}
              onBlur={handleAgeBlur}
              placeholder="Enter age"
              placeholderTextColor={colors.secondary}
              keyboardType="number-pad"
              maxLength={3}
              returnKeyType="done"
            />
          </View>

          {/* Max HR Row — shown only when age is set */}
          {ageValue !== '' && (
            <>
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { fontWeight: weightRegular, color: colors.secondary }]}>Max HR</Text>
                <Text style={styles.maxHrValue}>{maxHrDisplay}</Text>
              </View>

              {/* Custom max HR toggle */}
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { fontWeight: weightRegular, color: colors.secondary }]}>Custom max HR</Text>
                <Switch
                  value={overrideEnabled}
                  onValueChange={handleOverrideToggle}
                  trackColor={{ false: '#39393D', true: colors.accent }}
                  thumbColor={colors.primary}
                />
              </View>

              {/* Override input — shown when toggle is on */}
              {overrideEnabled && (
                <View style={styles.settingRow}>
                  <Text style={[styles.settingLabel, { fontWeight: weightRegular, color: colors.secondary }]}>Custom value</Text>
                  <TextInput
                    style={styles.numberInput}
                    value={overrideValue}
                    onChangeText={setOverrideValue}
                    onBlur={handleOverrideBlur}
                    placeholder="e.g. 175"
                    placeholderTextColor={colors.secondary}
                    keyboardType="number-pad"
                    maxLength={3}
                    returnKeyType="done"
                  />
                </View>
              )}
            </>
          )}

          {/* Divider between settings and device section */}
          <View style={styles.hrDivider} />

          {/* Paired Device Section */}
          {pairedDeviceId ? (
            <>
              <Text style={styles.deviceName}>
                {pairedDeviceName || pairedDeviceId}
              </Text>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => setScanSheetVisible(true)}
                activeOpacity={0.85}>
                <Text style={styles.scanButtonText}>Scan for Devices</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUnpair}
                style={styles.unpairButton}
                activeOpacity={0.7}>
                <Text style={styles.unpairText}>Unpair Device</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.noDevice}>No device paired</Text>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => setScanSheetVisible(true)}
                activeOpacity={0.85}>
                <Text style={styles.scanButtonText}>Scan for Devices</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Export Data card */}
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

        {/* Database Health Check card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Database Health Check</Text>
          <Text style={styles.cardDescription}>
            Scan for orphaned records, abandoned sessions, and data inconsistencies
          </Text>

          {(isScanning || isFixing) && (
            <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={[styles.cardDescription, { marginTop: spacing.xs, marginBottom: 0 }]}>
                {isScanning ? 'Scanning...' : 'Fixing...'}
              </Text>
            </View>
          )}

          {healthCheckResult && !isScanning && !isFixing && (
            <View style={{ marginBottom: spacing.md }}>
              {Object.values(healthCheckResult.categories).map((cat) => (
                <View key={cat.label} style={styles.healthCheckRow}>
                  <Text style={styles.healthCheckLabel}>
                    {cat.issueCount === 0 ? '\u2713' : '\u26A0'} {cat.label}
                  </Text>
                  <Text style={[
                    styles.healthCheckStatus,
                    { color: cat.issueCount === 0 ? colors.accent : colors.danger },
                  ]}>
                    {cat.issueCount === 0 ? 'OK' : `${cat.issueCount} issue${cat.issueCount > 1 ? 's' : ''}`}
                  </Text>
                </View>
              ))}

              {healthCheckResult.totalIssues === 0 ? (
                <Text style={styles.healthCheckHealthy}>Database is Healthy!</Text>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.fixButton}
                    onPress={handleFix}
                    activeOpacity={0.85}>
                    <Text style={styles.exportButtonText}>
                      Fix {healthCheckResult.totalIssues} Issue{healthCheckResult.totalIssues > 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rescanButton}
                    onPress={handleScan}
                    activeOpacity={0.85}>
                    <Text style={styles.rescanText}>Re-scan</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {!healthCheckResult && !isScanning && !isFixing && (
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleScan}
              activeOpacity={0.85}>
              <Text style={styles.exportButtonText}>Run Health Check</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>GymTrack v1.0</Text>
          <Text style={styles.aboutSubtitle}>Local-only workout tracker</Text>
        </View>
      </ScrollView>

      <DeviceScanSheet visible={scanSheetVisible} onClose={handleScanSheetClose} />
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
  scrollContent: {
    paddingBottom: spacing.xxl,
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
    fontWeight: weightBold,
    color: colors.background,
  },
  healthCheckRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  healthCheckLabel: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: weightRegular,
  },
  healthCheckStatus: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
  },
  healthCheckHealthy: {
    fontSize: fontSize.base,
    fontWeight: weightBold,
    color: colors.accent,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  fixButton: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  rescanButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  rescanText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: weightBold,
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
  // HR Monitor card styles
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    minHeight: 44,
  },
  settingLabel: {
    fontSize: fontSize.base,
    fontWeight: weightBold,
    color: colors.primary,
  },
  numberInput: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
    textAlign: 'right',
    minWidth: 64,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  maxHrValue: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
  },
  hrDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  deviceName: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  noDevice: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  scanButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.base,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  scanButtonText: {
    fontSize: fontSize.base,
    fontWeight: weightBold,
    color: colors.background,
  },
  unpairButton: {
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unpairText: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
});
