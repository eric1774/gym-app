import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { exportAllData } from '../db/dashboard';
import { useHeartRate } from '../context/HeartRateContext';
import { getHRSettings } from '../services/HRSettingsService';
import { HRSettings } from '../types';
import { DeviceScanSheet } from './DeviceScanSheet';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

export function SettingsScreen() {
  const navigation = useNavigation();
  const [isExporting, setIsExporting] = useState(false);
  const [scanSheetVisible, setScanSheetVisible] = useState(false);
  const [hrSettings, setHrSettings] = useState<HRSettings | null>(null);
  const { deviceState, pairedDeviceName, disconnect } = useHeartRate();

  const loadHRSettings = useCallback(async () => {
    try {
      const settings = await getHRSettings();
      setHrSettings(settings);
    } catch {
      // ignore errors
    }
  }, []);

  useEffect(() => {
    loadHRSettings();
  }, [loadHRSettings]);

  const handleScanClose = useCallback(() => {
    setScanSheetVisible(false);
    loadHRSettings();
  }, [loadHRSettings]);

  const handleUnpair = useCallback(() => {
    Alert.alert(
      'Unpair Device',
      `Stop connecting to ${pairedDeviceName ?? 'this device'} during workouts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpair',
          style: 'destructive',
          onPress: async () => {
            await disconnect();
            loadHRSettings();
          },
        },
      ],
    );
  }, [pairedDeviceName, disconnect, loadHRSettings]);

  const stateColor =
    deviceState === 'connected' ? '#8DC28A' :
    deviceState === 'reconnecting' ? '#FACC15' :
    deviceState === 'connecting' ? '#FACC15' :
    deviceState === 'scanning' ? '#8DC28A' :
    '#D9534F'; // disconnected

  const stateLabel =
    deviceState === 'connected' ? 'Connected' :
    deviceState === 'reconnecting' ? 'Reconnecting' :
    deviceState === 'connecting' ? 'Connecting' :
    deviceState === 'scanning' ? 'Scanning' :
    'Disconnected';

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const jsonString = JSON.stringify(data, null, 2);
      const today = new Date().toISOString().split('T')[0];
      await Share.share({
        message: jsonString,
        title: `gymtrack-export-${today}.json`,
      });
    } catch {
      // ignore - user may have cancelled share sheet
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

        {/* Heart Rate Monitor Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Heart Rate Monitor</Text>
          <Text style={styles.cardDescription}>Manage your paired device</Text>

          {hrSettings?.pairedDeviceId ? (
            <>
              <Text style={styles.pairedDeviceName}>
                {pairedDeviceName ?? 'Unknown Device'}
              </Text>
              <Text style={[styles.deviceStateLabel, { color: stateColor }]}>
                {stateLabel}
              </Text>
              <TouchableOpacity
                style={styles.scanAgainButton}
                onPress={() => setScanSheetVisible(true)}
                activeOpacity={0.85}>
                <Text style={styles.scanAgainText}>Scan for Device</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.unpairButton}
                onPress={handleUnpair}
                activeOpacity={0.85}>
                <Text style={styles.unpairText}>Unpair</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => setScanSheetVisible(true)}
              activeOpacity={0.85}>
              <Text style={styles.scanButtonText}>Scan for Device</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>GymTrack v1.0</Text>
          <Text style={styles.aboutSubtitle}>Local-only workout tracker</Text>
        </View>
      </View>

      <DeviceScanSheet visible={scanSheetVisible} onClose={handleScanClose} />
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
  // Heart Rate Monitor card styles
  scanButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  scanButtonText: {
    fontSize: fontSize.base,
    fontWeight: weightBold,
    color: colors.background,
  },
  pairedDeviceName: {
    fontSize: fontSize.base,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  deviceStateLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    marginBottom: spacing.md,
  },
  scanAgainButton: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  scanAgainText: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.accent,
  },
  unpairButton: {
    paddingVertical: spacing.sm,
  },
  unpairText: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.danger,
  },
});
