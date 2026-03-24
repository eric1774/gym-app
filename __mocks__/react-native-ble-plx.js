// Jest manual mock for react-native-ble-plx — __mocks__/react-native-ble-plx.js
// Auto-resolved by Jest when the package is imported in tests.

const mockBleManager = {
  destroy: jest.fn(),
  state: jest.fn().mockResolvedValue('PoweredOn'),
  startDeviceScan: jest.fn(),
  stopDeviceScan: jest.fn(),
  connectToDevice: jest.fn().mockResolvedValue({
    id: 'mock-device-id',
    name: 'Mock HR Monitor',
    discoverAllServicesAndCharacteristics: jest.fn().mockResolvedValue(undefined),
    monitorCharacteristicForService: jest.fn().mockReturnValue({ remove: jest.fn() }),
    onDisconnected: jest.fn().mockReturnValue({ remove: jest.fn() }),
    cancelConnection: jest.fn().mockResolvedValue(undefined),
  }),
  cancelDeviceConnection: jest.fn().mockResolvedValue(undefined),
  onStateChange: jest.fn((callback) => {
    callback('PoweredOn');
    return { remove: jest.fn() };
  }),
};

class BleManager {
  constructor() {
    Object.assign(this, mockBleManager);
  }
}

module.exports = {
  BleManager,
  State: {
    Unknown: 'Unknown',
    Resetting: 'Resetting',
    Unsupported: 'Unsupported',
    Unauthorized: 'Unauthorized',
    PoweredOff: 'PoweredOff',
    PoweredOn: 'PoweredOn',
  },
  BleError: class BleError extends Error {
    constructor(message, errorCode) {
      super(message);
      this.errorCode = errorCode;
    }
  },
  BleErrorCode: {
    DeviceDisconnected: 201,
    OperationCancelled: 2,
    BluetoothUnauthorized: 101,
  },
};
