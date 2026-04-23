import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';
import type { BodyCompScope } from '../types';

const SCOPES: { key: BodyCompScope; label: string }[] = [
  { key: 'month', label: 'MONTH' },
  { key: 'week',  label: 'WEEK' },
  { key: 'day',   label: 'DAY' },
];

export interface BodyCompScopeBarProps {
  scope: BodyCompScope;
  onChange: (next: BodyCompScope) => void;
}

export function BodyCompScopeBar({ scope, onChange }: BodyCompScopeBarProps) {
  const translate = useRef(new Animated.Value(0)).current;
  const activeIndex = SCOPES.findIndex(s => s.key === scope);

  useEffect(() => {
    Animated.timing(translate, {
      toValue: activeIndex,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, translate]);

  return (
    <View style={styles.bar}>
      <Animated.View
        style={[
          styles.slider,
          {
            transform: [{
              translateX: translate.interpolate({
                inputRange: [0, 1, 2],
                outputRange: ['0%', '100%', '200%'],
              }),
            }],
          },
        ]}
      />
      {SCOPES.map(s => {
        const isActive = s.key === scope;
        return (
          <Pressable
            key={s.key}
            testID={`scope-seg-${s.key}`}
            onPress={() => onChange(s.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            style={styles.seg}
          >
            <Text style={[styles.segText, isActive && styles.segTextActive]}>{s.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
    position: 'relative',
  },
  slider: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    width: '33.33%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 9,
  },
  seg: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', zIndex: 1 },
  segText: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: weightBold, letterSpacing: 0.6 },
  segTextActive: { color: colors.primary },
});
