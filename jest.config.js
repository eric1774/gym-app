module.exports = {
  preset: 'react-native',

  setupFilesAfterFramework: ['./jest.setup.js'],

  coverageReporters: ['lcov', 'text-summary'],

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!src/theme/**',
    '!src/navigation/**',
  ],

  coverageThreshold: {
    global: {
      lines: 80,
      statements: 80,
      functions: 70,
      branches: 70,
    },
  },

  coverageDirectory: 'coverage',

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx)',
    '**/*.(test|spec).(ts|tsx)',
  ],

  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@notifee|react-native-.*|@react-navigation)/)',
  ],
};
