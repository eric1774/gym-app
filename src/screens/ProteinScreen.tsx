import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProteinStackParamList } from '../navigation/TabNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBar } from '../components/TabBar';
import { MacrosView } from '../components/MacrosView';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';

const TABS = ['Macros', 'Hydration'];

export function ProteinScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<ProteinStackParamList>>();
  const [activeTab, setActiveTab] = useState(0); // 0 = Macros (default per TAB-01)

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition</Text>
      </View>
      <TabBar tabs={TABS} activeIndex={activeTab} onTabPress={setActiveTab} />
      {activeTab === 0 ? (
        <MacrosView navigation={navigation} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Hydration coming in Plan 02</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: weightBold, color: colors.primary },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: colors.secondary, fontSize: fontSize.base },
});
