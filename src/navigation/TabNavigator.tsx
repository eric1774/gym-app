import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';
import { LibraryScreen } from '../screens/LibraryScreen';
import { ProgramsScreen } from '../screens/ProgramsScreen';
import { WorkoutScreen } from '../screens/WorkoutScreen';

export type TabParamList = {
  LibraryTab: undefined;
  ProgramsTab: undefined;
  WorkoutTab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

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
        component={LibraryScreen}
        options={{ tabBarLabel: 'Library' }}
      />
      <Tab.Screen
        name="ProgramsTab"
        component={ProgramsScreen}
        options={{ tabBarLabel: 'Programs' }}
      />
      <Tab.Screen
        name="WorkoutTab"
        component={WorkoutScreen}
        options={{ tabBarLabel: 'Workout' }}
      />
    </Tab.Navigator>
  );
}
