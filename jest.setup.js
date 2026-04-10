// Silence console.warn and console.error in tests to reduce noise
// Tests that need to verify warnings should mock console explicitly
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// Silence LogBox (React Native warning overlay)
jest.mock('react-native/Libraries/LogBox/LogBox', () => ({
  __esModule: true,
  default: {
    ignoreLogs: jest.fn(),
    ignoreAllLogs: jest.fn(),
  },
}));

// Mock react-native-background-timer to avoid NativeEventEmitter invariant
jest.mock('react-native-background-timer', () => ({
  setTimeout: jest.fn((fn, ms) => setTimeout(fn, ms)),
  clearTimeout: jest.fn((id) => clearTimeout(id)),
  setInterval: jest.fn((fn, ms) => setInterval(fn, ms)),
  clearInterval: jest.fn((id) => clearInterval(id)),
}));

// Mock react-native-haptic-feedback to avoid TurboModuleRegistry invariant
jest.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: { trigger: jest.fn() },
}));

// Mock @notifee/react-native to avoid native module requirement
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(() => Promise.resolve('channel-id')),
    displayNotification: jest.fn(() => Promise.resolve()),
    cancelNotification: jest.fn(() => Promise.resolve()),
    requestPermission: jest.fn(() => Promise.resolve({ authorizationStatus: 1 })),
  },
  AndroidImportance: { HIGH: 4 },
  AndroidCategory: {},
}));

// Mock react-native-sound to avoid native module requirement
jest.mock('react-native-sound', () => {
  const Sound = jest.fn().mockImplementation(() => ({
    play: jest.fn(),
    stop: jest.fn(),
    release: jest.fn(),
    setVolume: jest.fn(),
  }));
  Sound.setCategory = jest.fn();
  return Sound;
});

// Mock @react-native-async-storage/async-storage for HR settings tests
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
}));
