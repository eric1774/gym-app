import { Platform, PermissionsAndroid, Permission, Linking } from 'react-native';

export type BLEPermissionStatus = 'granted' | 'denied' | 'blocked';

/**
 * Check whether BLE permissions are already granted.
 * Does NOT prompt the user — use requestBLEPermissions() for that.
 */
export async function checkBLEPermissions(): Promise<BLEPermissionStatus> {
  if (Platform.OS !== 'android') {
    return 'granted'; // iOS not supported, but don't block
  }

  const apiLevel = Platform.Version;

  if (apiLevel >= 31) {
    // Android 12+ (API 31+): BLUETOOTH_SCAN + BLUETOOTH_CONNECT
    const scanGranted = await PermissionsAndroid.check(
      'android.permission.BLUETOOTH_SCAN' as Permission,
    );
    const connectGranted = await PermissionsAndroid.check(
      'android.permission.BLUETOOTH_CONNECT' as Permission,
    );
    return scanGranted && connectGranted ? 'granted' : 'denied';
  } else {
    // Android 11 and below: ACCESS_FINE_LOCATION
    const locationGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return locationGranted ? 'granted' : 'denied';
  }
}

/**
 * Request BLE permissions at runtime (per D-01: lazy, only when user initiates scan).
 *
 * Android 12+ (API 31+): Requests BLUETOOTH_SCAN + BLUETOOTH_CONNECT (per D-02).
 * Android 11 and below: Requests BLUETOOTH + ACCESS_FINE_LOCATION (per D-02).
 *
 * If denied once, re-prompts with rationale (per D-03).
 * If denied again or "Don't ask again" checked, returns 'blocked' (per D-03).
 */
export async function requestBLEPermissions(): Promise<BLEPermissionStatus> {
  if (Platform.OS !== 'android') {
    return 'granted';
  }

  const apiLevel = Platform.Version;

  if (apiLevel >= 31) {
    // Android 12+
    const results = await PermissionsAndroid.requestMultiple([
      'android.permission.BLUETOOTH_SCAN' as Permission,
      'android.permission.BLUETOOTH_CONNECT' as Permission,
    ]);

    const scanResult = results['android.permission.BLUETOOTH_SCAN' as Permission];
    const connectResult = results['android.permission.BLUETOOTH_CONNECT' as Permission];

    if (
      scanResult === PermissionsAndroid.RESULTS.GRANTED &&
      connectResult === PermissionsAndroid.RESULTS.GRANTED
    ) {
      return 'granted';
    }

    if (
      scanResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
      connectResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
    ) {
      return 'blocked';
    }

    return 'denied';
  } else {
    // Android 11 and below
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission Required',
        message:
          'GymTrack needs location permission to scan for your Bluetooth heart rate monitor.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );

    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      return 'granted';
    }

    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      return 'blocked';
    }

    return 'denied';
  }
}

/**
 * Open Android app settings so user can manually enable BLE permissions
 * after "Don't ask again" denial (per D-03, D-05).
 */
export function openAppSettings(): void {
  Linking.openSettings();
}
