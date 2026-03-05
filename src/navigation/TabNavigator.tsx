import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { LibraryScreen } from '../screens/LibraryScreen';
import { ProgramsScreen } from '../screens/ProgramsScreen';
import { ProgramDetailScreen } from '../screens/ProgramDetailScreen';
import { WorkoutScreen } from '../screens/WorkoutScreen';
import { Text, View, StyleSheet } from 'react-native';

export type TabParamList = {
  LibraryTab: undefined;
  ProgramsTab: undefined;
  WorkoutTab: undefined;
};

export type ProgramsStackParamList = {
  ProgramsList: undefined;
  ProgramDetail: { programId: number };
  DayDetail: { dayId: number; dayName: string };
};

const Tab = createBottomTabNavigator<TabParamList>();
const ProgramsStack = createNativeStackNavigator<ProgramsStackParamList>();

function DayDetailPlaceholder() {
  return (
    <View style={placeholderStyles.container}>
      <Text style={placeholderStyles.text}>Day Detail (coming soon)</Text>
    </View>
  );
}

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.secondary,
    fontSize: 15,
  },
});

function ProgramsStackNavigator() {
  return (
    <ProgramsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProgramsStack.Screen name="ProgramsList" component={ProgramsScreen} />
      <ProgramsStack.Screen name="ProgramDetail" component={ProgramDetailScreen} />
      <ProgramsStack.Screen name="DayDetail" component={DayDetailPlaceholder} />
    </ProgramsStack.Navigator>
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
