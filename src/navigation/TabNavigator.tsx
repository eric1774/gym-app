import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Svg, { Path, Rect } from 'react-native-svg';
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

const ICON_SIZE = 22;

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function BookIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M12 6.25278V19.2528M12 6.25278C10.8321 5.47686 9.24649 5 7.5 5C5.75351 5 4.16789 5.47686 3 6.25278V19.2528C4.16789 18.4769 5.75351 18 7.5 18C9.24649 18 10.8321 18.4769 12 19.2528M12 6.25278C13.1679 5.47686 14.7535 5 16.5 5C18.2465 5 19.8321 5.47686 21 6.25278V19.2528C19.8321 18.4769 18.2465 18 16.5 18C14.7535 18 13.1679 18.4769 12 19.2528" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ClipboardIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x={9} y={3} width={6} height={4} rx={1} stroke={color} strokeWidth={2} />
      <Path d="M9 12H15M9 16H13" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function DumbbellIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M6.5 6.5V17.5M17.5 6.5V17.5M6.5 12H17.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Rect x={4} y={8} width={5} height={8} rx={1} stroke={color} strokeWidth={2} />
      <Rect x={15} y={8} width={5} height={8} rx={1} stroke={color} strokeWidth={2} />
      <Path d="M2 10V14M22 10V14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

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
          borderTopWidth: 1,
          height: 100,
          paddingTop: 10,
          paddingBottom: 40,
        },
        tabBarActiveTintColor: colors.tabIconActive,
        tabBarInactiveTintColor: colors.tabIconInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}>
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStackNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="LibraryTab"
        component={LibraryScreen}
        options={{
          tabBarLabel: 'Library',
          tabBarIcon: ({ color }) => <BookIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="ProgramsTab"
        component={ProgramsStackNavigator}
        options={{
          tabBarLabel: 'Programs',
          tabBarIcon: ({ color }) => <ClipboardIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="WorkoutTab"
        component={WorkoutScreen}
        options={{
          tabBarLabel: 'Workout',
          tabBarIcon: ({ color }) => <DumbbellIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
