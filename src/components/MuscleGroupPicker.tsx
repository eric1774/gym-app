import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { ExerciseCategory, EXERCISE_CATEGORIES, MuscleGroup } from '../types';
import { getAllMuscleGroups } from '../db/muscleGroups';

interface MuscleGroupMapping {
  muscleGroupId: number;
  isPrimary: boolean;
}

interface MuscleGroupPickerProps {
  selected: MuscleGroupMapping[];
  onChange: (mappings: MuscleGroupMapping[]) => void;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function MuscleGroupPicker({ selected, onChange }: MuscleGroupPickerProps) {
  const [allGroups, setAllGroups] = useState<MuscleGroup[] | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<ExerciseCategory>>(new Set());

  useEffect(() => {
    getAllMuscleGroups().then(groups => {
      setAllGroups(groups);
    });
  }, []);

  const groups = allGroups ?? [];
  const selectedIds = new Set(selected.map(s => s.muscleGroupId));
  const primaryId = selected.find(s => s.isPrimary)?.muscleGroupId;

  // Determine which parent categories have selected muscle groups
  const activeCategorySet = new Set(
    selected
      .map(s => groups.find(g => g.id === s.muscleGroupId)?.parentCategory)
      .filter(Boolean) as ExerciseCategory[],
  );

  const toggleCategory = (category: ExerciseCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleMuscleGroup = (groupId: number) => {
    if (selectedIds.has(groupId)) {
      // Deselect
      const next = selected.filter(s => s.muscleGroupId !== groupId);
      // If we removed the primary, promote the first remaining
      if (primaryId === groupId && next.length > 0) {
        next[0] = { ...next[0], isPrimary: true };
      }
      onChange(next);
    } else {
      // Select — first selection is automatically primary
      const isPrimary = selected.length === 0;
      onChange([...selected, { muscleGroupId: groupId, isPrimary }]);
    }
  };

  const setPrimary = (groupId: number) => {
    onChange(
      selected.map(s => ({ ...s, isPrimary: s.muscleGroupId === groupId })),
    );
  };

  const groupsByCategory = new Map<ExerciseCategory, MuscleGroup[]>();
  for (const group of groups) {
    const list = groupsByCategory.get(group.parentCategory) ?? [];
    list.push(group);
    groupsByCategory.set(group.parentCategory, list);
  }

  // Render nothing until data has loaded — ensures waitFor resolves only after
  // the async state update is complete, preventing out-of-act warnings.
  if (allGroups === null) {
    return null;
  }

  return (
    <View>
      {/* Step 1: Parent category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}>
        {EXERCISE_CATEGORIES.map(category => {
          const isExpanded = expandedCategories.has(category);
          const hasSelected = activeCategorySet.has(category);
          return (
            <TouchableOpacity
              key={category}
              onPress={() => toggleCategory(category)}
              style={[
                styles.categoryChip,
                isExpanded ? styles.categoryChipExpanded : hasSelected ? styles.categoryChipActive : styles.categoryChipInactive,
              ]}>
              <Text
                style={[
                  styles.categoryChipText,
                  (isExpanded || hasSelected) ? styles.categoryChipTextActive : styles.categoryChipTextInactive,
                ]}>
                {capitalize(category)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Step 2: Muscle groups for expanded categories */}
      {EXERCISE_CATEGORIES.filter(c => expandedCategories.has(c)).map(category => {
        const categoryGroups = groupsByCategory.get(category) ?? [];
        return (
          <View key={category} style={styles.groupSection}>
            <Text style={styles.groupSectionTitle}>{capitalize(category)}</Text>
            <View style={styles.groupChipRow}>
              {categoryGroups.map(group => {
                const isSelected = selectedIds.has(group.id);
                const isPrimaryGroup = primaryId === group.id;
                return (
                  <TouchableOpacity
                    key={group.id}
                    onPress={() => toggleMuscleGroup(group.id)}
                    onLongPress={isSelected ? () => setPrimary(group.id) : undefined}
                    style={[
                      styles.groupChip,
                      isSelected ? styles.groupChipSelected : styles.groupChipUnselected,
                    ]}>
                    {isPrimaryGroup && <Text style={styles.starIcon}>{'\u2605'} </Text>}
                    <Text
                      style={[
                        styles.groupChipText,
                        isSelected ? styles.groupChipTextSelected : styles.groupChipTextUnselected,
                      ]}>
                      {group.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  categoryRow: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
  },
  categoryChipExpanded: {
    backgroundColor: colors.accent,
  },
  categoryChipActive: {
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  categoryChipInactive: {
    backgroundColor: '#33373D',
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
  },
  categoryChipTextActive: {
    color: colors.onAccent,
  },
  categoryChipTextInactive: {
    color: colors.secondary,
  },
  groupSection: {
    marginTop: spacing.md,
  },
  groupSectionTitle: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    fontWeight: weightSemiBold,
    marginBottom: spacing.xs,
  },
  groupChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 16,
  },
  groupChipSelected: {
    backgroundColor: colors.accent,
  },
  groupChipUnselected: {
    backgroundColor: colors.surfaceElevated,
  },
  groupChipText: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  groupChipTextSelected: {
    color: colors.onAccent,
  },
  groupChipTextUnselected: {
    color: colors.secondary,
  },
  starIcon: {
    fontSize: fontSize.xs,
    color: colors.onAccent,
  },
});
