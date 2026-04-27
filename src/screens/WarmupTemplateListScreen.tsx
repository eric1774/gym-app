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
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.template.name}
          </Text>
          <Text style={styles.cardCount}>
            {item.itemCount} {item.itemCount === 1 ? 'item' : 'items'}
          </Text>
        </View>
        {item.previewNames.length > 0 && (
          <Text style={styles.cardPreview} numberOfLines={2}>
            {item.previewNames.join(' · ')}
            {item.itemCount > item.previewNames.length ? ' · ...' : ''}
          </Text>
        )}
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
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardName: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  cardCount: {
    fontSize: fontSize.sm,
    color: colors.secondary,
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
