/**
 * @format
 */

// Mock the database module to prevent dynamic import() calls during tests.
// initDatabase uses dynamic import('./migrations') and import('./seed') which
// require --experimental-vm-modules to work in Jest.
jest.mock('../src/db/database', () => ({
  db: Promise.resolve({}),
  executeSql: jest.fn().mockResolvedValue({ rows: { length: 0, item: () => null, raw: () => [] }, insertId: 0, rowsAffected: 0 }),
  runTransaction: jest.fn().mockResolvedValue(undefined),
  initDatabase: jest.fn().mockResolvedValue(undefined),
}));

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
