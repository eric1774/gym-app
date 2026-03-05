import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { deleteProgram, getPrograms } from '../db/programs';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightMedium, weightSemiBold } from '../theme/typography';
import { Program } from '../types';
import { CreateProgramModal } from './CreateProgramModal';

export function ProgramsScreen() {
  const navigation = useNavigation<any>();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadPrograms = useCallback(async () => {
    try {
      const result = await getPrograms();
      setPrograms(result);
    } catch {
      // ignore load errors
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPrograms();
    }, [loadPrograms]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPrograms();
    setRefreshing(false);
  }, [loadPrograms]);

  const handleCreated = useCallback((program: Program) => {
    setPrograms(prev => [program, ...prev]);
  }, []);

  const handleLongPress = useCallback((program: Program) => {
    setDeletingId(program.id);
    Alert.alert(
      'Delete Program',
      `Delete "${program.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setDeletingId(null) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProgram(program.id);
              setPrograms(prev => prev.filter(p => p.id !== program.id));
            } catch {
              // ignore
            }
            setDeletingId(null);
          },
        },
      ],
    );
  }, []);

  const handleTap = useCallback(
    (program: Program) => {
      navigation.navigate('ProgramDetail', { programId: program.id });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Program }) => {
      const isDeleting = deletingId === item.id;
      const isActivated = item.startDate !== null;
      return (
        <TouchableOpacity
          style={[styles.card, isDeleting && styles.cardDeleting]}
          onPress={() => handleTap(item)}
          onLongPress={() => handleLongPress(item)}
          activeOpacity={0.7}>
          <View style={styles.cardContent}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>
              {item.weeks} week{item.weeks !== 1 ? 's' : ''}
              {isActivated
                ? `  ·  Week ${item.currentWeek}/${item.weeks}`
                : '  ·  Not started'}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [deletingId, handleTap, handleLongPress],
  );

  const keyExtractor = useCallback((item: Program) => String(item.id), []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Programs</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {programs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No programs yet</Text>
          <Text style={styles.emptyHint}>Tap + to create one</Text>
        </View>
      ) : (
        <FlatList
          data={programs}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      )}

      <CreateProgramModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreated={handleCreated}
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: weightBold,
    color: colors.primary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: fontSize.xl,
    color: colors.background,
    fontWeight: weightBold,
    lineHeight: 26,
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  cardDeleting: {
    opacity: 0.5,
  },
  cardContent: {
    minHeight: 44,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: colors.secondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
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
});
