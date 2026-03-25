import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { bleManager, HR_SERVICE_UUID, HR_MEASUREMENT_CHAR_UUID } from '../services/BLEHeartRateService';
import { requestBLEPermissions } from '../services/BLEPermissions';
import { getHRSettings, setPairedDeviceId, clearPairedDevice } from '../services/HRSettingsService';
import { DeviceConnectionState } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiscoveredDevice {
  id: string;
  name: string;
  rssi: number;
}

interface HeartRateContextValue {
  /** Current BLE state machine state */
  deviceState: DeviceConnectionState;
  /** Latest HR reading in BPM (null when not connected) */
  currentBpm: number | null;
  /** Devices found during the active scan */
  discoveredDevices: DiscoveredDevice[];
  /** Display name of the paired device */
  pairedDeviceName: string | null;
  /** Start a 15-second BLE scan (requests permissions first) */
  startScan: () => Promise<void>;
  /** Cancel the active scan */
  stopScan: () => void;
  /** Pair and connect to a discovered device */
  connectToDevice: (deviceId: string, deviceName: string) => Promise<void>;
  /** Manually disconnect and clear the paired device */
  disconnect: () => Promise<void>;
  /** Silently attempt to reconnect to the last-paired device on app start */
  attemptAutoReconnect: () => Promise<void>;
  /** Countdown from 15 to 0 while scanning, null when not scanning */
  scanTimeRemaining: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Base64 character set */
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Decode a base64 string to an array of byte values.
 * Pure implementation — no browser globals or Node.js Buffer needed.
 */
function decodeBase64Bytes(base64Value: string): number[] {
  const clean = base64Value.replace(/=+$/, '');
  const bytes: number[] = [];
  let i = 0;
  while (i < clean.length) {
    const b0 = BASE64_CHARS.indexOf(clean[i++]);
    const b1 = BASE64_CHARS.indexOf(clean[i++]);
    const b2 = i <= clean.length ? BASE64_CHARS.indexOf(clean[i++]) : 0;
    const b3 = i <= clean.length ? BASE64_CHARS.indexOf(clean[i++]) : 0;
    bytes.push((b0 << 2) | (b1 >> 4));
    if (b2 !== -1) { bytes.push(((b1 & 0x0f) << 4) | (b2 >> 2)); }
    if (b3 !== -1) { bytes.push(((b2 & 0x03) << 6) | b3); }
  }
  return bytes;
}

/**
 * Parse BLE Heart Rate Measurement characteristic value.
 * Byte 0 = flags. If bit 0 of flags is 0 → BPM is uint8 at byte 1.
 * If bit 0 is 1 → BPM is uint16 little-endian at bytes 1-2.
 */
function parseHeartRate(base64Value: string): number {
  const bytes = decodeBase64Bytes(base64Value);
  const flags = bytes[0];
  if (flags & 0x01) {
    // 16-bit HR value (little-endian)
    return bytes[1] | (bytes[2] << 8);
  }
  // 8-bit HR value
  return bytes[1];
}

// ─── Context ──────────────────────────────────────────────────────────────────

const HeartRateContext = createContext<HeartRateContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

const SCAN_DURATION_SECONDS = 15;
const MAX_RECONNECT_ATTEMPTS = 5;
const CONNECT_TIMEOUT_MS = 10000;

export function HeartRateProvider({ children }: { children: React.ReactNode }) {
  const [deviceState, setDeviceState] = useState<DeviceConnectionState>('disconnected');
  const [currentBpm, setCurrentBpm] = useState<number | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [pairedDeviceName, setPairedDeviceName] = useState<string | null>(null);
  const [scanTimeRemaining, setScanTimeRemaining] = useState<number | null>(null);

  // Refs to avoid stale closures in callbacks
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const connectedDeviceIdRef = useRef<string | null>(null);
  const hrSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const disconnectSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const deviceStateRef = useRef<DeviceConnectionState>('disconnected');

  // Keep ref in sync with state
  useEffect(() => {
    deviceStateRef.current = deviceState;
  }, [deviceState]);

  // ─── Scan helpers ──────────────────────────────────────────────────────────

  const clearScanTimer = useCallback(() => {
    if (scanTimerRef.current !== null) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
  }, []);

  const stopScan = useCallback(() => {
    bleManager.stopDeviceScan();
    clearScanTimer();
    setScanTimeRemaining(null);
    if (deviceStateRef.current === 'scanning') {
      setDeviceState('disconnected');
    }
  }, [clearScanTimer]);

  const startScan = useCallback(async () => {
    const permissionStatus = await requestBLEPermissions();
    if (permissionStatus !== 'granted') {
      // Cannot scan without permissions — remain disconnected silently
      return;
    }

    setDeviceState('scanning');
    setDiscoveredDevices([]);
    setScanTimeRemaining(SCAN_DURATION_SECONDS);

    // 15-second countdown timer
    let remaining = SCAN_DURATION_SECONDS;
    scanTimerRef.current = setInterval(() => {
      remaining -= 1;
      setScanTimeRemaining(remaining);
      if (remaining <= 0) {
        stopScan();
      }
    }, 1000);

    // Start BLE scan filtered to HR service UUID
    bleManager.startDeviceScan(
      [HR_SERVICE_UUID],
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          // Scan error — stop gracefully
          stopScan();
          return;
        }
        if (device && device.name) {
          setDiscoveredDevices(prev => {
            // Dedup by device ID
            const exists = prev.some(d => d.id === device.id);
            if (exists) { return prev; }
            return [
              ...prev,
              {
                id: device.id,
                name: device.name!,
                rssi: device.rssi ?? -100,
              },
            ];
          });
        }
      },
    );
  }, [stopScan]);

  // ─── Reconnect logic ───────────────────────────────────────────────────────

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const setupDisconnectHandling = useCallback(
    (deviceId: string) => {
      // Clean up prior subscription
      if (disconnectSubscriptionRef.current) {
        disconnectSubscriptionRef.current.remove();
        disconnectSubscriptionRef.current = null;
      }

      const subscription = bleManager.onDeviceDisconnected(deviceId, _error => {
        // Device disconnected unexpectedly
        setDeviceState('reconnecting');
        setCurrentBpm(null);

        // Begin exponential backoff reconnect sequence
        reconnectAttemptRef.current = 0;

        const scheduleReconnect = (deviceIdToReconnect: string) => {
          if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
            setDeviceState('disconnected');
            connectedDeviceIdRef.current = null;
            return;
          }

          const delayMs = Math.pow(2, reconnectAttemptRef.current) * 1000; // 1s, 2s, 4s, 8s, 16s
          reconnectTimerRef.current = setTimeout(async () => {
            try {
              const device = await bleManager.connectToDevice(deviceIdToReconnect, {
                timeout: CONNECT_TIMEOUT_MS,
              });
              await device.discoverAllServicesAndCharacteristics();

              // Re-monitor HR characteristic
              if (hrSubscriptionRef.current) {
                hrSubscriptionRef.current.remove();
              }
              hrSubscriptionRef.current = device.monitorCharacteristicForService(
                HR_SERVICE_UUID,
                HR_MEASUREMENT_CHAR_UUID,
                (_err, characteristic) => {
                  if (characteristic?.value) {
                    try {
                      const bpm = parseHeartRate(characteristic.value);
                      setCurrentBpm(bpm);
                    } catch {
                      // Ignore parse errors
                    }
                  }
                },
              );

              reconnectAttemptRef.current = 0;
              setDeviceState('connected');

              // Re-register disconnect handler for the reconnected device
              setupDisconnectHandling(deviceIdToReconnect);
            } catch {
              // Reconnect attempt failed — schedule next attempt
              reconnectAttemptRef.current += 1;
              scheduleReconnect(deviceIdToReconnect);
            }
          }, delayMs);
        };

        scheduleReconnect(deviceId);
      });

      disconnectSubscriptionRef.current = subscription;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ─── Connect to device ─────────────────────────────────────────────────────

  const connectToDevice = useCallback(
    async (deviceId: string, deviceName: string) => {
      setDeviceState('connecting');
      bleManager.stopDeviceScan();
      clearScanTimer();
      setScanTimeRemaining(null);

      try {
        const device = await bleManager.connectToDevice(deviceId, {
          timeout: CONNECT_TIMEOUT_MS,
        });
        await device.discoverAllServicesAndCharacteristics();

        // Monitor HR measurement characteristic
        if (hrSubscriptionRef.current) {
          hrSubscriptionRef.current.remove();
        }
        hrSubscriptionRef.current = device.monitorCharacteristicForService(
          HR_SERVICE_UUID,
          HR_MEASUREMENT_CHAR_UUID,
          (_error, characteristic) => {
            if (characteristic?.value) {
              try {
                const bpm = parseHeartRate(characteristic.value);
                setCurrentBpm(bpm);
              } catch {
                // Ignore parse errors
              }
            }
          },
        );

        // Persist pairing
        await setPairedDeviceId(deviceId);
        connectedDeviceIdRef.current = deviceId;
        setPairedDeviceName(deviceName);
        setDeviceState('connected');

        // Register disconnect handler for auto-reconnect
        setupDisconnectHandling(deviceId);
      } catch {
        // Connection failed — return to disconnected
        setDeviceState('disconnected');
      }
    },
    [clearScanTimer, setupDisconnectHandling],
  );

  // ─── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(async () => {
    clearReconnectTimer();
    clearScanTimer();
    reconnectAttemptRef.current = 0;

    if (hrSubscriptionRef.current) {
      hrSubscriptionRef.current.remove();
      hrSubscriptionRef.current = null;
    }
    if (disconnectSubscriptionRef.current) {
      disconnectSubscriptionRef.current.remove();
      disconnectSubscriptionRef.current = null;
    }

    const deviceId = connectedDeviceIdRef.current;
    if (deviceId) {
      try {
        await bleManager.cancelDeviceConnection(deviceId);
      } catch {
        // Ignore errors during disconnect
      }
    }

    await clearPairedDevice();
    connectedDeviceIdRef.current = null;
    setPairedDeviceName(null);
    setCurrentBpm(null);
    setDeviceState('disconnected');
  }, [clearReconnectTimer, clearScanTimer]);

  // ─── Auto-reconnect ────────────────────────────────────────────────────────

  const attemptAutoReconnect = useCallback(async () => {
    const settings = await getHRSettings();
    const pairedId = settings.pairedDeviceId;
    if (!pairedId) {
      return; // No paired device — nothing to do
    }

    setDeviceState('connecting');

    try {
      const device = await bleManager.connectToDevice(pairedId, {
        timeout: CONNECT_TIMEOUT_MS,
      });
      await device.discoverAllServicesAndCharacteristics();

      // Monitor HR characteristic
      if (hrSubscriptionRef.current) {
        hrSubscriptionRef.current.remove();
      }
      hrSubscriptionRef.current = device.monitorCharacteristicForService(
        HR_SERVICE_UUID,
        HR_MEASUREMENT_CHAR_UUID,
        (_error, characteristic) => {
          if (characteristic?.value) {
            try {
              const bpm = parseHeartRate(characteristic.value);
              setCurrentBpm(bpm);
            } catch {
              // Ignore parse errors
            }
          }
        },
      );

      connectedDeviceIdRef.current = pairedId;
      if (device.name) {
        setPairedDeviceName(device.name);
      }
      setDeviceState('connected');

      // Register disconnect handler
      setupDisconnectHandling(pairedId);
    } catch {
      // Silent failure per D-10 — no popup on auto-reconnect timeout
      setDeviceState('disconnected');
    }
  }, [setupDisconnectHandling]);

  // ─── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearScanTimer();
      clearReconnectTimer();
      bleManager.stopDeviceScan();

      if (hrSubscriptionRef.current) {
        hrSubscriptionRef.current.remove();
        hrSubscriptionRef.current = null;
      }
      if (disconnectSubscriptionRef.current) {
        disconnectSubscriptionRef.current.remove();
        disconnectSubscriptionRef.current = null;
      }

      const deviceId = connectedDeviceIdRef.current;
      if (deviceId) {
        bleManager.cancelDeviceConnection(deviceId).catch(() => {});
      }
    };
  }, [clearScanTimer, clearReconnectTimer]);

  // ─── Context value ─────────────────────────────────────────────────────────

  const value = useMemo<HeartRateContextValue>(
    () => ({
      deviceState,
      currentBpm,
      discoveredDevices,
      pairedDeviceName,
      scanTimeRemaining,
      startScan,
      stopScan,
      connectToDevice,
      disconnect,
      attemptAutoReconnect,
    }),
    [
      deviceState,
      currentBpm,
      discoveredDevices,
      pairedDeviceName,
      scanTimeRemaining,
      startScan,
      stopScan,
      connectToDevice,
      disconnect,
      attemptAutoReconnect,
    ],
  );

  return (
    <HeartRateContext.Provider value={value}>
      {children}
    </HeartRateContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useHeartRate(): HeartRateContextValue {
  const ctx = useContext(HeartRateContext);
  if (!ctx) {
    throw new Error('useHeartRate must be used within a HeartRateProvider');
  }
  return ctx;
}
