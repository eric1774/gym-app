import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { LibraryScreen } from '../screens/LibraryScreen';
import { ProgramsScreen } from '../screens/ProgramsScreen';
import { ProgramDetailScreen } from '../screens/ProgramDetailScreen';
import { DayDetailScreen } from '../screens/DayDetailScreen';
import { WorkoutScreen } from '../screens/WorkoutScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ExerciseProgressScreen } from '../screens/ExerciseProgressScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export type TabParamList = {
  DashboardTab: undefined;
  LibraryTab: undefined;
  ProgramsTab: undefined;
  WorkoutTab: undefined;
};

export type ProgramsStackParamList = {
  ProgramsList: undefined;
  ProgramDetail: { programId: number };
  DayDetail: { dayId: number; dayName: string };
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
  ExerciseProgress: { exerciseId: number; exerciseName: string };
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const ProgramsStack = createNativeStackNavigator<ProgramsStackParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();

function ProgramsStackNavigator() {
  return (
    <ProgramsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProgramsStack.Screen name="ProgramsList" component={ProgramsScreen} />
      <ProgramsStack.Screen name="ProgramDetail" component={ProgramDetailScreen} />
      <ProgramsStack.Screen name="DayDetail" component={DayDetailScreen} />
    </ProgramsStack.Navigator>
  );
}

function DashboardStackNavigator() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="DashboardHome" component={DashboardScreen} />
      <DashboardStack.Screen name="ExerciseProgress" component={ExerciseProgressScreen} />
      <DashboardStack.Screen name="Settings" component={SettingsScreen} />
    </DashboardStack.Navigator>
  );
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
        name="DashboardTab"
        component={DashboardStackNavigator}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen
        name="LibraryTab"
        component={LibraryScreen}
        options={{ tabBarLabel: 'Library' }}
      />
      <Tab.Screen
        name="ProgramsTab"
        component={ProgramsStackNavigator}
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
