import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { SessionProvider } from './src/context/SessionContext';
import { TimerProvider } from './src/context/TimerContext';
import { HeartRateProvider } from './src/context/HeartRateContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initDatabase } from './src/db';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase((message) => setMigrationStatus(message))
      .then(() => setDbReady(true))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setDbError(message);
      });
  }, []);

  if (dbError) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.errorTitle}>Failed to initialise database</Text>
        <Text style={styles.errorText}>{dbError}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        {migrationStatus && (
          <Text style={styles.splashText}>{migrationStatus}</Text>
        )}
      </View>
    );
  }

  return (
    <SessionProvider>
      <HeartRateProvider>
        <TimerProvider>
          <RootNavigator />
        </TimerProvider>
      </HeartRateProvider>
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181A20',
  },
  splashText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  errorTitle: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
