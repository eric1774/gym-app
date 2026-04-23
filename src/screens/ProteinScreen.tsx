import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProteinStackParamList } from '../navigation/TabNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBar } from '../components/TabBar';
import { MacrosView } from '../components/MacrosView';
import { HydrationView } from '../components/HydrationView';
import { BodyCompView } from './BodyCompView';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';

const TABS = ['Macros', 'Hydration', 'Body Comp'];

export function ProteinScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<ProteinStackParamList>>();
  const route = useRoute<RouteProp<ProteinStackParamList, 'ProteinHome'>>();
  const [activeTab, setActiveTab] = useState(route.params?.initialTab ?? 0);

  useEffect(() => {
    if (route.params?.initialTab !== undefined) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition</Text>
      </View>
      <TabBar tabs={TABS} activeIndex={activeTab} onTabPress={setActiveTab} />
      {activeTab === 0 ? (
        <MacrosView navigation={navigation} />
      ) : activeTab === 1 ? (
        <HydrationView />
      ) : (
        <BodyCompView />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: weightBold, color: colors.primary },
});
