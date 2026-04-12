import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { fontSize, weightSemiBold } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface LevelBarProps {
  level: number;
  title: string;
  progressToNext: number;
}

export function LevelBar({ level, title, progressToNext }: LevelBarProps) {
  const navigation = useNavigation<any>();

  return (
    <TouchableOpacity
      testID="level-bar"
      style={styles.container}
      onPress={() => navigation.navigate('Achievements')}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={styles.levelCircle}>
          <Text style={styles.levelNumber}>{level}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            Level {level} · {Math.round(progressToNext * 100)}% to next
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressToNext * 100}%` }]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '800',
  },
  info: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    color: colors.primary,
    fontSize: fontSize.sm + 1,
    fontWeight: weightSemiBold,
  },
  subtitle: {
    color: colors.secondary,
    fontSize: fontSize.xs + 1,
  },
  chevron: {
    color: colors.secondary,
    fontSize: 18,
  },
  progressTrack: {
    backgroundColor: '#33373D',
    borderRadius: 4,
    height: 6,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.accent,
    height: '100%',
    borderRadius: 4,
  },
});
