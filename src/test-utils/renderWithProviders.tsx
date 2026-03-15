import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { MockSessionProvider, MockTimerProvider } from './mockProviders';

/**
 * Wraps a component with the same provider tree used in production:
 * NavigationContainer > MockSessionProvider > MockTimerProvider > children
 *
 * SafeAreaProvider is already mocked via __mocks__/react-native-safe-area-context.js
 * so it just passes children through. NavigationContainer provides the navigation
 * context that useNavigation/useRoute hooks require. MockSessionProvider and
 * MockTimerProvider satisfy useSession() and useTimer() hooks so screen components
 * don't throw "must be used inside <Provider>" errors.
 *
 * Usage:
 *   const { getByText } = renderWithProviders(<MyScreen />);
 *
 * With custom navigation params:
 *   renderWithProviders(<MyScreen />, {
 *     initialParams: { exerciseId: 1 },
 *   });
 *
 * Without session/timer providers (for components that don't use them):
 *   renderWithProviders(<MyComponent />, { withSession: false, withTimer: false });
 */

interface ProviderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Route params to inject via initialRouteName/initialParams */
  initialParams?: Record<string, unknown>;
  /** Custom navigation state for deep-link testing */
  navigationState?: object;
  /** Include MockSessionProvider (default: true) */
  withSession?: boolean;
  /** Include MockTimerProvider (default: true) */
  withTimer?: boolean;
}

function createProviders(options: Pick<ProviderOptions, 'withSession' | 'withTimer'>) {
  const { withSession = true, withTimer = true } = options;

  return function Providers({ children }: { children: React.ReactNode }) {
    let wrapped = <>{children}</>;

    if (withTimer) {
      wrapped = <MockTimerProvider>{wrapped}</MockTimerProvider>;
    }

    if (withSession) {
      wrapped = <MockSessionProvider>{wrapped}</MockSessionProvider>;
    }

    return (
      <NavigationContainer>
        {wrapped}
      </NavigationContainer>
    );
  };
}

export function renderWithProviders(
  ui: ReactElement,
  options: ProviderOptions = {},
) {
  const { initialParams, navigationState, withSession, withTimer, ...renderOptions } = options;
  const wrapper = createProviders({ withSession, withTimer });
  return render(ui, { wrapper, ...renderOptions });
}
