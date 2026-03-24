import { BleManager } from 'react-native-ble-plx';

/**
 * Module-level BleManager singleton (per D-09).
 *
 * Instantiated once when this module is first imported.
 * Never create BleManager inside a component or hook — import this constant instead.
 * Destroyed only when the app process terminates.
 */
export const bleManager = new BleManager();

/** Standard BLE Heart Rate Service UUID */
export const HR_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';

/** Standard BLE Heart Rate Measurement Characteristic UUID */
export const HR_MEASUREMENT_CHAR_UUID = '00002a37-0000-1000-8000-00805f9b34fb';
