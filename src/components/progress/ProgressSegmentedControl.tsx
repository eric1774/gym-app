import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fontSize, weightSemiBold } from '../../theme/typography';

export type ProgressTab = 'exercises' | 'programDays';

interface Props {
  active: ProgressTab;
  onChange: (tab: ProgressTab) => void;
}

export const ProgressSegmentedControl: React.FC<Props> = ({ active, onChange }) => (
  <View style={styles.container}>
    <TouchableOpacity
      testID="seg-tab-exercises"
      style={[styles.tab, active === 'exercises' && styles.tabActive]}
      activeOpacity={0.7}
      onPress={() => onChange('exercises')}>
      <Text style={[styles.text, active === 'exercises' && styles.textActive]}>Exercises</Text>
    </TouchableOpacity>
    <TouchableOpacity
      testID="seg-tab-programDays"
      style={[styles.tab, active === 'programDays' && styles.tabActive]}
      activeOpacity={0.7}
      onPress={() => onChange('programDays')}>
      <Text style={[styles.text, active === 'programDays' && styles.textActive]}>Program Days</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: colors.surfaceElevated,
  },
  text: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  textActive: {
    color: colors.accent,
  },
});
