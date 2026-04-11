import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SessionProvider } from './src/context/SessionContext';
import { TimerProvider } from './src/context/TimerContext';
import { StopwatchProvider } from './src/context/StopwatchContext';
import { HeartRateProvider } from './src/context/HeartRateContext';
import { GamificationProvider } from './src/context/GamificationContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initDatabase } from './src/db';

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDatabase().then(() => setDbReady(true));
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#181A20' }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <SessionProvider>
      <GamificationProvider>
        <HeartRateProvider>
          <TimerProvider>
            <StopwatchProvider>
              <RootNavigator />
            </StopwatchProvider>
          </TimerProvider>
        </HeartRateProvider>
      </GamificationProvider>
    </SessionProvider>
  );
}
