import AsyncStorage from '@react-native-async-storage/async-storage';
import { HRSettings } from '../types';

const KEYS = {
  AGE: 'hr_settings_age',
  MAX_HR_OVERRIDE: 'hr_settings_max_hr_override',
  PAIRED_DEVICE_ID: 'hr_settings_paired_device_id',
} as const;

/**
 * Read all HR settings from AsyncStorage (per D-12: AsyncStorage, not SQLite).
 */
export async function getHRSettings(): Promise<HRSettings> {
  const [ageStr, maxHrStr, deviceId] = await Promise.all([
    AsyncStorage.getItem(KEYS.AGE),
    AsyncStorage.getItem(KEYS.MAX_HR_OVERRIDE),
    AsyncStorage.getItem(KEYS.PAIRED_DEVICE_ID),
  ]);

  return {
    age: ageStr ? parseInt(ageStr, 10) : null,
    maxHrOverride: maxHrStr ? parseInt(maxHrStr, 10) : null,
    pairedDeviceId: deviceId,
  };
}

/**
 * Save user's age (per D-06: required before pairing).
 */
export async function setAge(age: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.AGE, String(age));
}

/**
 * Save or clear user's max HR override (per D-08: optional override of Tanaka formula).
 * Pass null to clear the override and revert to Tanaka computation.
 */
export async function setMaxHrOverride(maxHr: number | null): Promise<void> {
  if (maxHr === null) {
    await AsyncStorage.removeItem(KEYS.MAX_HR_OVERRIDE);
  } else {
    await AsyncStorage.setItem(KEYS.MAX_HR_OVERRIDE, String(maxHr));
  }
}

/**
 * Save paired BLE device ID (per D-12: stored in AsyncStorage).
 */
export async function setPairedDeviceId(deviceId: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.PAIRED_DEVICE_ID, deviceId);
}

/**
 * Clear paired device (unpair).
 */
export async function clearPairedDevice(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.PAIRED_DEVICE_ID);
}

/**
 * Compute effective max HR using Tanaka formula or user override (per D-08, D-11).
 * Tanaka: 208 - 0.7 * age (more accurate for adults over 40).
 * Returns null if age is not set (per D-06: age required before HR features work).
 */
export async function getComputedMaxHR(): Promise<number | null> {
  const settings = await getHRSettings();

  if (settings.age === null) {
    return null;
  }

  if (settings.maxHrOverride !== null) {
    return settings.maxHrOverride;
  }

  // Tanaka formula (per D-11)
  return 208 - 0.7 * settings.age;
}
