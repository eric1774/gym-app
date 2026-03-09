import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, weightBold } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface Props {
  /** Button label */
  title: string;
  /** Press handler */
  onPress: () => void;
  /** Disable the button and reduce opacity */
  disabled?: boolean;
  /** Show a spinner and disable interaction */
  loading?: boolean;
  /** Optional style overrides applied to the outer container */
  style?: StyleProp<ViewStyle>;
}

/**
 * Primary CTA button following the Dark Mint Card design system.
 *
 * Solid mint-green background with dark text, 12px border radius,
 * bold weight. Used for main actions like "Log Set", "Add Meal", "Save".
 */
export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[styles.container, isDisabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#1A1A1A" />
      ) : (
        <Text style={styles.label}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.accent, // Solid mint green
    borderRadius: 12,
    paddingVertical: spacing.md, // 12px
    paddingHorizontal: spacing.lg, // 20px
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: fontSize.base, // 15
    fontWeight: weightBold, // 700
    color: '#1A1A1A', // Dark text on mint background
  },
});
