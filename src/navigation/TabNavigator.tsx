import React from 'react';
import { Platform, View, Text } from 'react-native';
import { MealType } from '../types';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import { colors } from '../theme/colors';
import { LibraryStackNavigator } from './LibraryStackNavigator';
import { ProgramsScreen } from '../screens/ProgramsScreen';
import { ProgramDetailScreen } from '../screens/ProgramDetailScreen';
import { DayDetailScreen } from '../screens/DayDetailScreen';
import { WorkoutScreen } from '../screens/WorkoutScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ExerciseProgressScreen } from '../screens/ExerciseProgressScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ProteinScreen } from '../screens/ProteinScreen';
import { MealLibraryScreen } from '../screens/MealLibraryScreen';
import { MealBuilderScreen } from '../screens/MealBuilderScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { CalendarDayDetailScreen } from '../screens/CalendarDayDetailScreen';
import { CategoryProgressScreen } from '../screens/CategoryProgressScreen';
import { AchievementsScreen } from '../screens/AchievementsScreen';
import { ProgressHubScreen } from '../screens/ProgressHubScreen';
import { ExerciseDetailScreen } from '../screens/ExerciseDetailScreen';
import { SessionBreakdownScreen } from '../screens/SessionBreakdownScreen';
import { SessionDayProgressScreen } from '../screens/SessionDayProgressScreen';

export type TabParamList = {
  DashboardTab: undefined;
  CalendarTab: undefined;
  LibraryTab: undefined;
  ProgramsTab: undefined;
  WorkoutTab: undefined;
  ProteinTab: undefined;
};

export type CalendarStackParamList = {
  CalendarHome: undefined;
  CalendarDayDetail: { date: string };
};

export type WorkoutStackParamList = {
  WorkoutHome: undefined;
  ExerciseProgress: { exerciseId: number; exerciseName: string; measurementType?: 'reps' | 'timed' | 'height_reps'; category?: string; viewMode?: 'strength' | 'volume' };
};

export type ProgramsStackParamList = {
  ProgramsList: undefined;
  ProgramDetail: { programId: number };
  DayDetail: { dayId: number; dayName: string };
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
  ExerciseProgress: { exerciseId: number; exerciseName: string; measurementType?: 'reps' | 'timed' | 'height_reps'; category?: string; viewMode?: 'strength' | 'volume' };
  Settings: undefined;
  CategoryProgress: { category: string; viewMode?: 'strength' | 'volume' };
  Achievements: undefined;
  ProgressHub: undefined;
  ExerciseDetail: { exerciseId: number; exerciseName: string; measurementType?: 'reps' | 'timed' | 'height_reps'; category?: string };
  SessionBreakdown: { sessionId: number; exerciseId: number; exerciseName: string; sessionDate: string };
  SessionDayProgress: { programDayId: number; dayName: string };
};

export type ProteinStackParamList = {
  ProteinHome: { initialTab?: number } | undefined;
  MealLibrary: undefined;
  MealBuilder: {
    mode: 'normal' | 'edit' | 'library';
    editMealId?: number;
    prefillFoods?: Array<{
      foodId: number;
      foodName: string;
      grams: number;
      proteinPer100g: number;
      carbsPer100g: number;
      fatPer100g: number;
    }>;
    prefillMealType?: MealType;
    prefillDescription?: string;
    prefillLoggedAt?: string;
  } | undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const ProgramsStack = createNativeStackNavigator<ProgramsStackParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const WorkoutStack = createNativeStackNavigator<WorkoutStackParamList>();
const ProteinStack = createNativeStackNavigator<ProteinStackParamList>();
const CalendarStack = createNativeStackNavigator<CalendarStackParamList>();

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

function CarrotIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M16 3C14.5 3 13 4 12 5.5C11 4 9.5 3 8 3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 5.5C12 5.5 15 10 15 15C15 18 13.5 21 12 21C10.5 21 9 18 9 15C9 10 12 5.5 12 5.5Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CalendarIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      {/* Calendar body */}
      <Rect x={3} y={4} width={18} height={17} rx={2} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Binding posts at top */}
      <Line x1={8} y1={2} x2={8} y2={6} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={16} y1={2} x2={16} y2={6} stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Horizontal divider */}
      <Line x1={3} y1={9} x2={21} y2={9} stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Grid dots */}
      <Rect x={7} y={12} width={2} height={2} rx={0.5} fill={color} />
      <Rect x={11} y={12} width={2} height={2} rx={0.5} fill={color} />
      <Rect x={15} y={12} width={2} height={2} rx={0.5} fill={color} />
      <Rect x={7} y={16} width={2} height={2} rx={0.5} fill={color} />
      <Rect x={11} y={16} width={2} height={2} rx={0.5} fill={color} />
    </Svg>
  );
}

function CalendarStackNavigator() {
  return (
    <CalendarStack.Navigator screenOptions={{ headerShown: false }}>
      <CalendarStack.Screen name="CalendarHome" component={CalendarScreen} />
      <CalendarStack.Screen name="CalendarDayDetail" component={CalendarDayDetailScreen} />
    </CalendarStack.Navigator>
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

function WorkoutStackNavigator() {
  return (
    <WorkoutStack.Navigator screenOptions={{ headerShown: false }}>
      <WorkoutStack.Screen name="WorkoutHome" component={WorkoutScreen} />
      <WorkoutStack.Screen name="ExerciseProgress" component={ExerciseProgressScreen} />
    </WorkoutStack.Navigator>
  );
}

function DashboardStackNavigator() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="DashboardHome" component={DashboardScreen} />
      <DashboardStack.Screen name="ExerciseProgress" component={ExerciseProgressScreen} />
      <DashboardStack.Screen name="Settings" component={SettingsScreen} />
      <DashboardStack.Screen name="CategoryProgress" component={CategoryProgressScreen} />
      <DashboardStack.Screen name="Achievements" component={AchievementsScreen} />
      <DashboardStack.Screen name="ProgressHub" component={ProgressHubScreen} />
      <DashboardStack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
      <DashboardStack.Screen name="SessionBreakdown" component={SessionBreakdownScreen} />
      <DashboardStack.Screen name="SessionDayProgress" component={SessionDayProgressScreen} />
    </DashboardStack.Navigator>
  );
}

function ProteinStackNavigator() {
  return (
    <ProteinStack.Navigator screenOptions={{ headerShown: false }}>
      <ProteinStack.Screen name="ProteinHome" component={ProteinScreen} />
      <ProteinStack.Screen name="MealLibrary" component={MealLibraryScreen} />
      <ProteinStack.Screen name="MealBuilder" component={MealBuilderScreen} />
    </ProteinStack.Navigator>
  );
}

export function TabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
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
        name="CalendarTab"
        component={CalendarStackNavigator}
        options={{
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ color }) => <CalendarIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="LibraryTab"
        component={LibraryStackNavigator}
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
        component={WorkoutStackNavigator}
        options={{
          tabBarLabel: 'Workout',
          tabBarIcon: ({ color }) => <DumbbellIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="ProteinTab"
        component={ProteinStackNavigator}
        options={{
          tabBarLabel: 'Health',
          tabBarIcon: ({ color }) => <CarrotIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
