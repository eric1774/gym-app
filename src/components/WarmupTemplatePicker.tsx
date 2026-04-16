import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getWarmupTemplates, getWarmupTemplatePreview } from '../db/warmups';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { WarmupTemplate } from '../types';

interface TemplateWithPreview {
  template: WarmupTemplate;
  itemCount: number;
  previewNames: string[];
}

interface WarmupTemplatePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (templateId: number) => void;
  showSkip?: boolean;
  onSkip?: () => void;
  title?: string;
}

export function WarmupTemplatePicker({
  visible,
  onClose,
  onSelect,
  showSkip,
  onSkip,
  title = 'Select Warmup',
}: WarmupTemplatePickerProps) {
  const [templates, setTemplates] = useState<TemplateWithPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const rawTemplates = await getWarmupTemplates();
        const withPreviews = await Promise.all(
          rawTemplates.map(async template => {
            const { itemCount, previewNames } = await getWarmupTemplatePreview(template.id);
            return { template, itemCount, previewNames };
          }),
        );
        if (!cancelled) {
          setTemplates(withPreviews);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const handleSelect = (templateId: number) => {
    onSelect(templateId);
    onClose();
  };

  const handleSkip = () => {
    onSkip?.();
    onClose();
  };

  const renderItem = ({ item }: { item: TemplateWithPreview }) => {
    const { template, itemCount, previewNames } = item;
    const previewText = previewNames.length > 0
      ? previewNames.join(', ') + (itemCount > previewNames.length ? '…' : '')
      : 'No items';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleSelect(template.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>{template.name}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{itemCount}</Text>
          </View>
        </View>
        <Text style={styles.cardPreview} numberOfLines={2}>{previewText}</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Warmup Templates</Text>
        <Text style={styles.emptySubtitle}>
          Create a warmup template in the Library to get started.
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>{title}</Text>

        <FlatList
          data={templates}
          keyExtractor={item => String(item.template.id)}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          bounces={false}
        />

        {showSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip Warmup</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.base,
    maxHeight: '75%',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: spacing.sm,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(141,194,138,0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardName: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.primary,
    marginRight: spacing.sm,
  },
  countBadge: {
    backgroundColor: 'rgba(141,194,138,0.15)',
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countText: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: weightSemiBold,
  },
  cardPreview: {
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  skipText: {
    color: colors.secondary,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  cancelText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
  },
});
