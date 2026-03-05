import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';

export type TabParamList = {
  LibraryTab: undefined;
  WorkoutTab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function LibraryPlaceholder() {
  return <View style={styles.placeholder} />;
}

function WorkoutPlaceholder() {
  return <View style={styles.placeholder} />;
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          height: 60,
        },
        tabBarActiveTintColor: colors.tabIconActive,
        tabBarInactiveTintColor: colors.tabIconInactive,
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 6,
        },
      }}>
      <Tab.Screen
        name="LibraryTab"
        component={LibraryPlaceholder}
        options={{ tabBarLabel: 'Library' }}
      />
      <Tab.Screen
        name="WorkoutTab"
        component={WorkoutPlaceholder}
        options={{ tabBarLabel: 'Workout' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
