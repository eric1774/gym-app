import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { DeviceListRow } from '../components/DeviceListRow';
import { useHeartRate, DiscoveredDevice } from '../context/HeartRateContext';
import { getHRSettings, setAge } from '../services/HRSettingsService';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightRegular } from '../theme/typography';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export interface DeviceScanSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function DeviceScanSheet({ visible, onClose }: DeviceScanSheetProps) {
  const {
    deviceState,
    discoveredDevices,
    scanTimeRemaining,
    startScan,
    stopScan,
    connectToDevice,
  } = useHeartRate();

  const [needsAge, setNeedsAge] = useState(false);
  const [ageInput, setAgeInput] = useState('');
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  // Check age requirement and auto-start scan when sheet opens
  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;

    async function initSheet() {
      try {
        const settings = await getHRSettings();
        if (cancelled) { return; }
        if (settings.age === null) {
          setNeedsAge(true);
        } else {
          await startScan();
          if (!cancelled) {
            setHasScanned(true);
          }
        }
      } catch {
        // ignore errors
      }
    }

    initSheet();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = useCallback(() => {
    stopScan();
    setConnectingDeviceId(null);
    setConnectionError(null);
    setHasScanned(false);
    setNeedsAge(false);
    setAgeInput('');
    onClose();
  }, [stopScan, onClose]);

  const handleSetAge = useCallback(async () => {
    const parsed = parseInt(ageInput, 10);
    if (isNaN(parsed) || parsed < 10 || parsed > 100) {
      return;
    }
    try {
      await setAge(parsed);
      setNeedsAge(false);
      setAgeInput('');
      await startScan();
      setHasScanned(true);
    } catch {
      // ignore errors
    }
  }, [ageInput, startScan]);

  const handleConnect = useCallback(
    async (device: DiscoveredDevice) => {
      setConnectingDeviceId(device.id);
      setConnectionError(null);
      try {
        await connectToDevice(device.id, device.name);
        // Success — sheet auto-closes on successful connection (D-03)
        onClose();
      } catch {
        setConnectionError(device.id);
        setConnectingDeviceId(null);
      }
    },
    [connectToDevice, onClose],
  );

  const handleScanAgain = useCallback(async () => {
    try {
      await startScan();
      setHasScanned(true);
    } catch {
      // ignore errors
    }
  }, [startScan]);

  const parsedAge = parseInt(ageInput, 10);
  const isAgeValid = !isNaN(parsedAge) && parsedAge >= 10 && parsedAge <= 100;

  const isScanning = deviceState === 'scanning';
  const scanDone = hasScanned && !isScanning;
  const noDevicesFound = scanDone && discoveredDevices.length === 0;
  const devicesFound = scanDone && discoveredDevices.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}>
      {/* Dark overlay — tap to close */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        {/* Handle bar */}
        <View style={styles.handle} />

        {/* Sheet content */}
        <View style={styles.content}>
          {needsAge ? (
            /* Age prompt — must be set before scanning */
            <View style={styles.agePrompt}>
              <Text style={styles.agePromptLabel}>
                Enter your age to calculate HR zones
              </Text>
              <TextInput
                style={styles.ageInput}
                value={ageInput}
                onChangeText={setAgeInput}
                keyboardType="number-pad"
                placeholder="Age"
                placeholderTextColor={colors.secondary}
                maxLength={3}
              />
              <TouchableOpacity
                style={[styles.scanButton, !isAgeValid && styles.scanButtonDisabled]}
                onPress={handleSetAge}
                disabled={!isAgeValid}
                activeOpacity={0.85}>
                <Text style={styles.scanButtonText}>Set Age</Text>
              </TouchableOpacity>
            </View>
          ) : isScanning ? (
            /* Scanning state */
            <View>
              <View style={styles.scanningHeader}>
                <Text style={styles.scanningTitle}>Scanning...</Text>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
              {scanTimeRemaining !== null && (
                <Text style={styles.scanTimer}>
                  Stops in {scanTimeRemaining}s
                </Text>
              )}
              <FlatList
                data={discoveredDevices}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View>
                    <DeviceListRow
                      device={item}
                      onPress={() => handleConnect(item)}
                      isConnecting={connectingDeviceId === item.id}
                    />
                    {connectionError === item.id && (
                      <Text style={styles.connectionError}>
                        Couldn't connect. Try again.
                      </Text>
                    )}
                  </View>
                )}
                style={styles.deviceList}
              />
            </View>
          ) : noDevicesFound ? (
            /* Empty state — scan timed out with no devices */
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No heart rate monitors found.</Text>
              <Text style={styles.emptyStateBody}>
                Make sure your device is on and in range.
              </Text>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={handleScanAgain}
                activeOpacity={0.85}>
                <Text style={styles.scanButtonText}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          ) : devicesFound ? (
            /* Devices found after scan timeout — show list with Scan Again */
            <View>
              <FlatList
                data={discoveredDevices}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View>
                    <DeviceListRow
                      device={item}
                      onPress={() => handleConnect(item)}
                      isConnecting={connectingDeviceId === item.id}
                    />
                    {connectionError === item.id && (
                      <Text style={styles.connectionError}>
                        Couldn't connect. Try again.
                      </Text>
                    )}
                  </View>
                )}
                style={styles.deviceList}
              />
              <TouchableOpacity
                style={styles.scanAgainButton}
                onPress={handleScanAgain}
                activeOpacity={0.85}>
                <Text style={styles.scanAgainText}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Initial state — waiting for scan to start */
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.60,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  // Age prompt styles
  agePrompt: {
    gap: spacing.md,
  },
  agePromptLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightRegular,
    color: colors.secondary,
  },
  ageInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scanButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  scanButtonDisabled: {
    opacity: 0.5,
  },
  scanButtonText: {
    fontSize: fontSize.base,
    fontWeight: weightBold,
    color: colors.background,
  },
  // Scanning state styles
  scanningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  scanningTitle: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
  },
  scanTimer: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.secondary,
    marginBottom: spacing.md,
  },
  deviceList: {
    flex: 1,
  },
  connectionError: {
    fontSize: fontSize.sm,
    fontWeight: weightRegular,
    color: colors.danger,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  // Empty state styles
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyStateTitle: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
    textAlign: 'center',
  },
  emptyStateBody: {
    fontSize: fontSize.base,
    fontWeight: weightRegular,
    color: colors.secondary,
    textAlign: 'center',
  },
  // Scan again (secondary text button)
  scanAgainButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  scanAgainText: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.accent,
  },
});
