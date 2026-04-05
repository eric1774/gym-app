import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';

interface TabBarProps {
  tabs: string[];
  activeIndex: number;
  onTabPress: (index: number) => void;
}

export function TabBar({ tabs, activeIndex, onTabPress }: TabBarProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, isActive && styles.tabItemActive]}
            activeOpacity={0.7}
            onPress={() => onTabPress(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : styles.tabLabelInactive]}>
              {tab.toUpperCase()}
            </Text>
            <View style={[styles.underline, isActive ? styles.underlineActive : styles.underlineInactive]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  tabItemActive: {},
  tabLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabLabelInactive: {
    color: colors.secondary,
  },
  underline: {
    height: 2,
    width: '100%',
    marginTop: spacing.xs,
  },
  underlineActive: {
    backgroundColor: colors.accent,
  },
  underlineInactive: {
    backgroundColor: 'transparent',
  },
});
