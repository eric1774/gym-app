import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  addWarmupTemplateItem,
  deleteWarmupTemplate,
  getWarmupTemplateWithItems,
  removeWarmupTemplateItem,
  reorderWarmupTemplateItems,
  updateWarmupTemplateName,
} from '../db/warmups';
import { LibraryStackParamList } from '../navigation/LibraryStackNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { WarmupTemplateItemWithName, WarmupTrackingType } from '../types';
import { AddWarmupItemModal } from '../components/AddWarmupItemModal';

type DetailRoute = RouteProp<LibraryStackParamList, 'WarmupTemplateDetail'>;

function formatTarget(trackingType: WarmupTrackingType, targetValue: number | null): string {
  if (trackingType === 'checkbox') { return 'Complete'; }
  if (targetValue == null) { return '—'; }
  if (trackingType === 'reps') { return `${targetValue} reps`; }
  return `${targetValue}s`;
}

export function WarmupTemplateDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<DetailRoute>();
  const { templateId, templateName: initialName } = route.params;

  const [templateName, setTemplateName] = useState(initialName);
  const [items, setItems] = useState<WarmupTemplateItemWithName[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);

  // Rename modal state
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const load = useCallback(async () => {
    try {
      const { items: loaded } = await getWarmupTemplateWithItems(templateId);
      setItems(loaded);
    } catch {
      // ignore
    }
  }, [templateId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Reorder (same pattern as DayDetailScreen) ──────────────────────

  const handleMoveUp = useCallback(
    async (index: number) => {
      if (index <= 0) { return; }
      const newList = [...items];
      const temp = newList[index];
      newList[index] = newList[index - 1];
      newList[index - 1] = temp;
      setItems(newList);
      try {
        await reorderWarmupTemplateItems(templateId, newList.map(i => i.id));
      } catch {
        await load();
      }
    },
    [items, templateId, load],
  );

  const handleMoveDown = useCallback(
    async (index: number) => {
      if (index >= items.length - 1) { return; }
      const newList = [...items];
      const temp = newList[index];
      newList[index] = newList[index + 1];
      newList[index + 1] = temp;
      setItems(newList);
      try {
        await reorderWarmupTemplateItems(templateId, newList.map(i => i.id));
      } catch {
        await load();
      }
    },
    [items, templateId, load],
  );

  // ── Remove item ────────────────────────────────────────────────────

  const handleRemoveItem = useCallback(
    (item: WarmupTemplateItemWithName) => {
      Alert.alert(
        'Remove Item',
        `Remove "${item.displayName}" from this template?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeWarmupTemplateItem(item.id);
                setItems(prev => prev.filter(i => i.id !== item.id));
              } catch {
                // ignore
              }
            },
          },
        ],
      );
    },
    [],
  );

  // ── Add items ──────────────────────────────────────────────────────

  const handleAddWarmupExercise = useCallback(
    async (warmupExerciseId: number, trackingType: WarmupTrackingType, targetValue: number | null) => {
      try {
        await addWarmupTemplateItem(templateId, null, warmupExerciseId, trackingType, targetValue);
        await load();
      } catch {
        // ignore
      }
    },
    [templateId, load],
  );

  const handleAddLibraryExercise = useCallback(
    async (exerciseId: number, trackingType: WarmupTrackingType, targetValue: number | null) => {
      try {
        await addWarmupTemplateItem(templateId, exerciseId, null, trackingType, targetValue);
        await load();
      } catch {
        // ignore
      }
    },
    [templateId, load],
  );

  // ── Rename ─────────────────────────────────────────────────────────

  const handleOpenRename = () => {
    setRenameInput(templateName);
    setRenameModalVisible(true);
  };

  const handleConfirmRename = async () => {
    const name = renameInput.trim();
    if (!name || isRenaming) { return; }
    setIsRenaming(true);
    try {
      await updateWarmupTemplateName(templateId, name);
      setTemplateName(name);
      setRenameModalVisible(false);
    } catch {
      // ignore
    } finally {
      setIsRenaming(false);
    }
  };

  // ── Delete template ────────────────────────────────────────────────

  const handleDeleteTemplate = useCallback(() => {
    Alert.alert(
      'Delete Template',
      `Delete "${templateName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWarmupTemplate(templateId);
              navigation.goBack();
            } catch {
              // ignore
            }
          },
        },
      ],
    );
  }, [templateName, templateId, navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerCenter} onPress={handleOpenRename}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {templateName}
          </Text>
          <Text style={styles.headerHint}>tap to rename</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDeleteTemplate}
          style={styles.deleteButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items yet</Text>
            <Text style={styles.emptyHint}>Tap "+ Add Item" to build this template</Text>
          </View>
        ) : (
          items.map((item, index) => (
            <View key={item.id} style={styles.itemCard}>
              {/* Reorder column */}
              <View style={styles.reorderColumn}>
                <TouchableOpacity
                  style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
                  onPress={() => handleMoveUp(index)}
                  disabled={index === 0}>
                  <Text style={[styles.reorderArrow, index === 0 && styles.reorderArrowDisabled]}>
                    ▲
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.reorderButton,
                    index === items.length - 1 && styles.reorderButtonDisabled,
                  ]}
                  onPress={() => handleMoveDown(index)}
                  disabled={index === items.length - 1}>
                  <Text
                    style={[
                      styles.reorderArrow,
                      index === items.length - 1 && styles.reorderArrowDisabled,
                    ]}>
                    ▼
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Item info */}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.displayName}
                </Text>
                <View style={styles.itemMeta}>
                  <View
                    style={[
                      styles.sourceBadge,
                      item.source === 'warmup'
                        ? styles.sourceBadgeWarmup
                        : styles.sourceBadgeLibrary,
                    ]}>
                    <Text
                      style={[
                        styles.sourceBadgeText,
                        item.source === 'warmup'
                          ? styles.sourceBadgeTextWarmup
                          : styles.sourceBadgeTextLibrary,
                      ]}>
                      {item.source === 'warmup' ? 'warmup exercise' : 'from exercise library'}
                    </Text>
                  </View>
                  <Text style={styles.targetLabel}>
                    {formatTarget(item.trackingType, item.targetValue)}
                  </Text>
                </View>
              </View>

              {/* Remove button */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveItem(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Add Item button */}
        <TouchableOpacity
          style={styles.addItemButton}
          onPress={() => setAddModalVisible(true)}>
          <Text style={styles.addItemButtonText}>+ Add Item</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add item modal */}
      <AddWarmupItemModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAddWarmupExercise={handleAddWarmupExercise}
        onAddLibraryExercise={handleAddLibraryExercise}
      />

      {/* Rename modal */}
      <Modal
        visible={renameModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setRenameModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalKeyboard}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setRenameModalVisible(false)}
          />
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Rename Template</Text>
            <TextInput
              style={styles.modalInput}
              value={renameInput}
              onChangeText={setRenameInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleConfirmRename}
              maxLength={60}
              selectTextOnFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRenameModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirm,
                  (!renameInput.trim() || isRenaming) && styles.modalConfirmDisabled,
                ]}
                onPress={handleConfirmRename}
                disabled={!renameInput.trim() || isRenaming}>
                <Text style={styles.modalConfirmText}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: fontSize.xl,
    color: colors.accent,
    fontWeight: weightBold,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
  },
  headerHint: {
    fontSize: fontSize.xs,
    color: colors.secondary,
    marginTop: 2,
  },
  deleteButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deleteButtonText: {
    fontSize: fontSize.sm,
    color: colors.danger ?? '#E05A5A',
    fontWeight: weightSemiBold,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reorderColumn: {
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  reorderButton: {
    padding: spacing.xs,
  },
  reorderButtonDisabled: {
    opacity: 0,
  },
  reorderArrow: {
    fontSize: fontSize.xs,
    color: colors.secondary,
  },
  reorderArrowDisabled: {
    color: 'transparent',
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  itemName: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: weightSemiBold,
    marginBottom: spacing.xs,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  sourceBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceBadgeWarmup: {
    backgroundColor: 'rgba(141, 194, 138, 0.15)',
  },
  sourceBadgeLibrary: {
    backgroundColor: 'rgba(91, 155, 240, 0.15)',
  },
  sourceBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
  },
  sourceBadgeTextWarmup: {
    color: colors.accent,
  },
  sourceBadgeTextLibrary: {
    color: '#5B9BF0',
  },
  targetLabel: {
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  removeButton: {
    padding: spacing.xs,
  },
  removeButtonText: {
    fontSize: fontSize.base,
    color: colors.secondary,
  },
  addItemButton: {
    marginTop: spacing.base,
    paddingVertical: spacing.base,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
    borderStyle: 'dashed',
  },
  addItemButtonText: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.accent,
  },
  // Rename modal
  modalKeyboard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalBox: {
    width: '85%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.primary,
    marginBottom: spacing.base,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
  },
  modalCancelText: {
    fontSize: fontSize.base,
    color: colors.secondary,
    fontWeight: weightSemiBold,
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  modalConfirmDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    fontSize: fontSize.base,
    color: colors.background,
    fontWeight: weightSemiBold,
  },
});
