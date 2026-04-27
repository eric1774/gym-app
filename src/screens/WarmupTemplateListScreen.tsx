import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  createWarmupTemplate,
  deleteWarmupTemplate,
  getWarmupTemplatePreview,
  getWarmupTemplates,
} from '../db/warmups';
import { Dumbbell } from '../components/icons/Dumbbell';
import { LibraryStackParamList } from '../navigation/LibraryStackNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { WarmupTemplate } from '../types';

type Nav = NativeStackNavigationProp<LibraryStackParamList, 'LibraryHome'>;

interface TemplateWithPreview {
  template: WarmupTemplate;
  itemCount: number;
  previewNames: string[];
}

interface WarmupTemplateListScreenProps {
  /** Parent-owned visibility of the new-template name modal. */
  newNameModalVisible: boolean;
  /** Called when the modal should close (cancel, submit success, or backdrop tap). */
  onCloseNewNameModal: () => void;
}

export function WarmupTemplateListScreen({
  newNameModalVisible,
  onCloseNewNameModal,
}: WarmupTemplateListScreenProps) {
  const navigation = useNavigation<Nav>();
  const isFocused = useIsFocused();

  const [templates, setTemplates] = useState<TemplateWithPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [newTemplateName, setNewTemplateName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Reset the new-template name input each time the parent opens the modal.
  useEffect(() => {
    if (newNameModalVisible) {
      setNewTemplateName('');
    }
  }, [newNameModalVisible]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const raw = await getWarmupTemplates();
      const withPreviews = await Promise.all(
        raw.map(async (template) => {
          const preview = await getWarmupTemplatePreview(template.id);
          return { template, ...preview };
        }),
      );
      setTemplates(withPreviews);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reload when screen is focused (e.g. returning from detail)
  useEffect(() => {
    if (isFocused) {
      load();
    }
  }, [isFocused, load]);

  const handleCreateTemplate = async () => {
    const name = newTemplateName.trim();
    if (!name || isCreating) { return; }
    setIsCreating(true);
    try {
      const template = await createWarmupTemplate(name);
      onCloseNewNameModal();
      setNewTemplateName('');
      // Navigate immediately to detail screen
      navigation.navigate('WarmupTemplateDetail', {
        templateId: template.id,
        templateName: template.name,
      });
    } catch {
      // ignore
    } finally {
      setIsCreating(false);
    }
  };

  const handleLongPress = useCallback((item: TemplateWithPreview) => {
    Alert.alert(
      'Delete Template',
      `Delete "${item.template.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWarmupTemplate(item.template.id);
              setTemplates(prev => prev.filter(t => t.template.id !== item.template.id));
            } catch {
              // ignore
            }
          },
        },
      ],
    );
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: TemplateWithPreview }) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('WarmupTemplateDetail', {
            templateId: item.template.id,
            templateName: item.template.name,
          })
        }
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}>
        <View style={styles.numberChip}>
          <Text style={styles.numberChipText}>{item.itemCount}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.template.name}
          </Text>
          {item.previewNames.length > 0 && (
            <Text style={styles.cardPreview} numberOfLines={2}>
              {item.previewNames.join(' · ')}
              {item.itemCount > item.previewNames.length ? ' · …' : ''}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    ),
    [navigation, handleLongPress],
  );

  const keyExtractor = useCallback(
    (item: TemplateWithPreview) => String(item.template.id),
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.eyebrow}>
        <Text style={styles.eyebrowText}>YOUR TEMPLATES</Text>
        <Text style={styles.eyebrowCount}>{templates.length}</Text>
      </View>
      {!isLoading && templates.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Dumbbell size={40} color={colors.secondary} />
          </View>
          <Text style={styles.emptyText}>No warmup templates yet</Text>
          <Text style={styles.emptyHint}>Tap + to create one</Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Cross-platform new template name modal */}
      <Modal
        visible={newNameModalVisible}
        animationType="fade"
        transparent
        onRequestClose={onCloseNewNameModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalKeyboard}>
          <Pressable
            style={styles.modalOverlay}
            onPress={onCloseNewNameModal}
          />
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Template</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Template name..."
              placeholderTextColor={colors.secondary}
              value={newTemplateName}
              onChangeText={setNewTemplateName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateTemplate}
              maxLength={60}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={onCloseNewNameModal}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalCreate,
                  (!newTemplateName.trim() || isCreating) && styles.modalCreateDisabled,
                ]}
                onPress={handleCreateTemplate}
                disabled={!newTemplateName.trim() || isCreating}>
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base + 2,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  eyebrowText: {
    color: colors.warmupAmber,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  eyebrowCount: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: spacing.base - 2,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 11,
  },
  numberChip: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(240,184,48,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(240,184,48,0.18)',
  },
  numberChipText: {
    color: colors.warmupAmber,
    fontSize: 13,
    fontWeight: '800',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.primary,
    marginBottom: 3,
  },
  cardPreview: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  emptyIcon: {
    opacity: 0.16,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
  },
  // New template modal
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
  modalCreate: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  modalCreateDisabled: {
    opacity: 0.5,
  },
  modalCreateText: {
    fontSize: fontSize.base,
    color: colors.background,
    fontWeight: weightSemiBold,
  },
});
