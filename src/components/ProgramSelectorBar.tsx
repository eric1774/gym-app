import React, { useState } from 'react';
import {
  Modal,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ProgramSelectorItem } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold, weightMedium } from '../theme/typography';

interface Props {
  programs: ProgramSelectorItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function ProgramSelectorBar({ programs, selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const selected = programs.find(p => p.id === selectedId);

  if (!selected) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={styles.bar}
        activeOpacity={0.7}
        onPress={() => setOpen(true)}>
        <Text style={styles.name} numberOfLines={1}>{selected.name}</Text>
        <View style={styles.right}>
          <View style={[styles.badge, selected.isArchived && styles.badgeArchived]}>
            <Text style={[styles.badgeText, selected.isArchived && styles.badgeTextArchived]}>
              {selected.isArchived ? 'Archived' : 'Active'}
            </Text>
          </View>
          <Text style={styles.chevron}>{'\u25BE'}</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>Select Program</Text>
            <FlatList
              data={programs}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    item.id === selectedId && styles.dropdownItemActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    onSelect(item.id);
                    setOpen(false);
                  }}>
                  <Text
                    style={[
                      styles.dropdownItemText,
                      item.id === selectedId && styles.dropdownItemTextActive,
                    ]}
                    numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[
                    styles.dropdownBadge,
                    item.isArchived ? styles.dropdownBadgeArchived : styles.dropdownBadgeActive,
                  ]}>
                    {item.isArchived ? 'Archived' : 'Active'}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  name: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    flex: 1,
    marginRight: spacing.sm,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: 'rgba(141,194,138,0.15)',
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeArchived: {
    backgroundColor: 'rgba(142,146,152,0.15)',
  },
  badgeText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: weightMedium,
  },
  badgeTextArchived: {
    color: colors.secondary,
  },
  chevron: {
    color: colors.secondary,
    fontSize: fontSize.base,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  dropdown: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    padding: spacing.base,
    maxHeight: 400,
  },
  dropdownTitle: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: weightBold,
    marginBottom: spacing.md,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.xs,
  },
  dropdownItemActive: {
    backgroundColor: colors.surface,
  },
  dropdownItemText: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: weightMedium,
    flex: 1,
    marginRight: spacing.sm,
  },
  dropdownItemTextActive: {
    color: colors.accent,
    fontWeight: weightSemiBold,
  },
  dropdownBadge: {
    fontSize: fontSize.xs,
    fontWeight: weightMedium,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dropdownBadgeActive: {
    color: colors.accent,
    backgroundColor: 'rgba(141,194,138,0.15)',
  },
  dropdownBadgeArchived: {
    color: colors.secondary,
    backgroundColor: 'rgba(142,146,152,0.15)',
  },
});
