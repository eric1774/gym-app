import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { TabNavigator } from './TabNavigator';

export function RootNavigator() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <NavigationContainer theme={DarkTheme}>
        <TabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
