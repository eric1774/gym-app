import React from 'react';
import { SessionProvider } from './src/context/SessionContext';
import { TimerProvider } from './src/context/TimerContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SessionProvider>
      <TimerProvider>
        <RootNavigator />
      </TimerProvider>
    </SessionProvider>
  );
}
