import React from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize } from '../theme/typography';

export function ProgramsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Programs</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.primary,
    fontSize: fontSize.lg,
  },
});
