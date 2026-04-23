import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize } from '../theme/typography';

export function BodyCompView() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Body composition — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  placeholder: { color: colors.secondary, fontSize: fontSize.base },
});
