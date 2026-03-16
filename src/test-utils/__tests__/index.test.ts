// Trivial import test — test-utils/index.ts re-exports from submodules with no logic.
// This registers the barrel file for coverage.
// We import at the top level to avoid hook registration errors from renderWithProviders.
import { mockResultSet, mockDatabase, MockSessionProvider, MockTimerProvider, renderWithProviders } from '../index';

describe('test-utils/index barrel exports', () => {
  it('exports mockResultSet function', () => {
    expect(typeof mockResultSet).toBe('function');
  });

  it('exports mockDatabase function', () => {
    expect(typeof mockDatabase).toBe('function');
  });

  it('exports MockSessionProvider', () => {
    expect(MockSessionProvider).toBeDefined();
  });

  it('exports MockTimerProvider', () => {
    expect(MockTimerProvider).toBeDefined();
  });

  it('exports renderWithProviders function', () => {
    expect(typeof renderWithProviders).toBe('function');
  });
});
