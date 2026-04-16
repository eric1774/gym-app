import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LibraryScreen } from '../screens/LibraryScreen';
import { WarmupTemplateDetailScreen } from '../screens/WarmupTemplateDetailScreen';
import { colors } from '../theme/colors';

export type LibraryStackParamList = {
  LibraryHome: undefined;
  WarmupTemplateDetail: { templateId: number; templateName: string };
};

const Stack = createNativeStackNavigator<LibraryStackParamList>();

export function LibraryStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="LibraryHome" component={LibraryScreen} />
      <Stack.Screen name="WarmupTemplateDetail" component={WarmupTemplateDetailScreen} />
    </Stack.Navigator>
  );
}
