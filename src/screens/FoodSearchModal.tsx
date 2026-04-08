import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Vibration,
} from 'react-native';
import { FoodResultItem } from '../components/FoodResultItem';
import { FrequentFoodsSection } from '../components/FrequentFoodsSection';
import { foodsDb } from '../db';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightSemiBold } from '../theme/typography';
import { Food, FoodSearchResult } from '../types';

interface FoodSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onFoodSelected: (food: Food) => void;
}

export function FoodSearchModal({ visible, onClose, onFoodSelected }: FoodSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [frequentFoods, setFrequentFoods] = useState<FoodSearchResult[]>([]);
  const [frequentLoading, setFrequentLoading] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load frequent foods and reset state when modal opens
  useEffect(() => {
    if (visible) {
      setQuery('');
      setResults([]);
      setShowCustomForm(false);
      setFrequentLoading(true);
      foodsDb.getFrequentFoods()
        .then((foods) => {
          setFrequentFoods(foods);
        })
        .catch(() => {
          setFrequentFoods([]);
        })
        .finally(() => {
          setFrequentLoading(false);
        });
    }
  }, [visible]);

  // Debounced search — 200ms per D-02 (T-38-07: prevents rapid-fire SQLite queries)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (query.trim().length > 0) {
        foodsDb.searchFoods(query).then(setResults).catch(() => setResults([]));
      } else {
        setResults([]);
      }
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleFoodSelect = useCallback(
    (food: FoodSearchResult) => {
      Vibration.vibrate(10);
      onFoodSelected(food);
      onClose();
    },
    [onFoodSelected, onClose],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header bar */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button">
            <Text style={styles.backButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search Foods</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search bar */}
        <View style={styles.searchBarContainer}>
          <TextInput
            ref={searchInputRef}
            style={styles.searchBar}
            placeholder="Search foods..."
            placeholderTextColor={colors.secondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            selectionColor={colors.accent}
            accessibilityLabel="Search foods"
            accessibilityRole="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              style={styles.clearButton}>
              <Text style={styles.clearButtonText}>X</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.contentArea}>
          {query.trim().length === 0 ? (
            /* Pre-search: show frequent foods */
            <FrequentFoodsSection
              foods={frequentFoods}
              onFoodPress={handleFoodSelect}
              loading={frequentLoading}
            />
          ) : results.length > 0 ? (
            /* Search results */
            <FlatList
              data={results}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <FoodResultItem food={item} onPress={handleFoodSelect} />
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            /* No results — placeholder for Plan 03's NoResultsCard */
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No results for "{query}"</Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: fontSize.lg,
    color: colors.primary,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: weightSemiBold,
    color: colors.primary,
  },
  headerSpacer: {
    width: 44,
  },
  searchBarContainer: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.xxl,
  },
  searchBar: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    height: 48,
    paddingHorizontal: spacing.base,
    fontSize: fontSize.base,
    color: colors.primary,
  },
  clearButton: {
    position: 'absolute',
    right: spacing.base + spacing.md,
    top: 0,
    height: 48,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: fontSize.base,
    color: colors.secondary,
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: spacing.base,
  },
  separator: {
    height: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
  },
  noResults: {
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: fontSize.md,
    color: colors.secondary,
  },
});
