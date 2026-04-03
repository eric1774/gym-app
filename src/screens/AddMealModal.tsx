import React, { useState, useRef } from 'react';
import {
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
import { MealTypePills } from '../components/MealTypePills';
import { macrosDb } from '../db';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { MacroMeal, MealType, MacroValues, MACRO_COLORS } from '../types';
import { computeCalories } from '../utils/macros';

interface AddMealModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  editMeal?: MacroMeal | null;
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeForInput(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatDisplayTime(date: Date): string {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
}

function formatDisplayDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/** Try to parse a YYYY-MM-DD string. Returns null if invalid. */
function parseDate(dateStr: string): { year: number; month: number; day: number } | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) { return null; }
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) { return null; }
  return { year, month, day };
}

/** Try to parse an HH:MM string. Returns null if invalid. */
function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) { return null; }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) { return null; }
  return { hours, minutes };
}

export function AddMealModal({ visible, onClose, onSaved, editMeal }: AddMealModalProps) {
  const isEditMode = !!editMeal;

  const [proteinGrams, setProteinGrams] = useState('');
  const [carbsGrams, setCarbsGrams] = useState('');
  const [fatGrams, setFatGrams] = useState('');
  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [loggedAt, setLoggedAt] = useState(new Date());
  const [showDateEdit, setShowDateEdit] = useState(false);
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carbsRef = useRef<TextInput>(null);
  const fatRef = useRef<TextInput>(null);

  // Pre-fill on edit
  React.useEffect(() => {
    if (editMeal && visible) {
      setProteinGrams(editMeal.protein > 0 ? String(editMeal.protein) : '');
      setCarbsGrams(editMeal.carbs > 0 ? String(editMeal.carbs) : '');
      setFatGrams(editMeal.fat > 0 ? String(editMeal.fat) : '');
      setDescription(editMeal.description);
      setMealType(editMeal.mealType as MealType);
      const parsed = new Date(editMeal.loggedAt);
      setLoggedAt(parsed);
      setDateText(formatDateForInput(parsed));
      setTimeText(formatTimeForInput(parsed));
      setShowDateEdit(false);
    }
  }, [editMeal, visible]);

  const handleClose = () => {
    setProteinGrams('');
    setCarbsGrams('');
    setFatGrams('');
    setDescription('');
    setMealType(null);
    setLoggedAt(new Date());
    setShowDateEdit(false);
    setDateText('');
    setTimeText('');
    setDateError(null);
    setIsSubmitting(false);
    setError(null);
    onClose();
  };

  const handleDateTimeChange = (newDateText: string, newTimeText: string) => {
    const parsedDate = parseDate(newDateText);
    const parsedTime = parseTime(newTimeText);

    if (!parsedDate && newDateText.length > 0) {
      setDateError('Use YYYY-MM-DD format');
      return;
    }
    if (!parsedTime && newTimeText.length > 0) {
      setDateError('Use HH:MM format');
      return;
    }

    setDateError(null);

    if (parsedDate && parsedTime) {
      const newDate = new Date(
        parsedDate.year,
        parsedDate.month - 1,
        parsedDate.day,
        parsedTime.hours,
        parsedTime.minutes,
      );
      setLoggedAt(newDate);
    }
  };

  const parsedProtein = parseFloat(proteinGrams) || 0;
  const parsedCarbs = parseFloat(carbsGrams) || 0;
  const parsedFat = parseFloat(fatGrams) || 0;

  const isDisabled =
    (parsedProtein <= 0 && parsedCarbs <= 0 && parsedFat <= 0) ||
    mealType === null ||
    isSubmitting;

  const caloriePreview = Math.round(computeCalories(parsedProtein, parsedCarbs, parsedFat));

  const handleSubmit = async () => {
    if (isDisabled) { return; }

    setIsSubmitting(true);
    setError(null);

    try {
      const macros: MacroValues = {
        protein: parsedProtein,
        carbs: parsedCarbs,
        fat: parsedFat,
      };
      if (isEditMode && editMeal) {
        await macrosDb.updateMeal(editMeal.id, description, mealType!, macros, loggedAt);
      } else {
        await macrosDb.addMeal(description, mealType!, macros, loggedAt);
      }
      onSaved();
      handleClose();
    } catch (err) {
      const action = isEditMode ? 'update' : 'add';
      setError(err instanceof Error ? err.message : `Failed to ${action} meal. Please try again.`);
      setIsSubmitting(false);
    }
  };

  const isDefaultTime = !showDateEdit && !isEditMode;

  const toggleDateEdit = () => {
    if (!showDateEdit) {
      setDateText(formatDateForInput(loggedAt));
      setTimeText(formatTimeForInput(loggedAt));
      setDateError(null);
    }
    setShowDateEdit(!showDateEdit);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardAvoid}>
        <Pressable style={styles.overlay} onPress={handleClose} />
        <View style={styles.sheet}>
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>
              {isEditMode ? 'Edit Meal' : 'Add Meal'}
            </Text>

            <Text style={styles.label}>Meal Type</Text>
            <MealTypePills selected={mealType} onSelect={setMealType} />

            <View style={[styles.inputRow, { borderLeftColor: MACRO_COLORS.protein }]}>
              <Text style={styles.label}>Protein (grams)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.secondary}
                value={proteinGrams}
                onChangeText={setProteinGrams}
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => carbsRef.current?.focus()}
              />
            </View>
            <View style={[styles.inputRow, { borderLeftColor: MACRO_COLORS.carbs }]}>
              <Text style={styles.label}>Carbs (grams)</Text>
              <TextInput
                ref={carbsRef}
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.secondary}
                value={carbsGrams}
                onChangeText={setCarbsGrams}
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => fatRef.current?.focus()}
              />
            </View>
            <View style={[styles.inputRow, { borderLeftColor: MACRO_COLORS.fat }]}>
              <Text style={styles.label}>Fat (grams)</Text>
              <TextInput
                ref={fatRef}
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.secondary}
                value={fatGrams}
                onChangeText={setFatGrams}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>

            <Text style={styles.caloriePreview}>~ {caloriePreview} calories</Text>

            <Text style={[styles.label, styles.fieldSpacing]}>
              Description (optional)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Chicken breast"
              placeholderTextColor={colors.secondary}
              value={description}
              onChangeText={setDescription}
              returnKeyType="done"
            />

            <Text style={[styles.label, styles.fieldSpacing]}>When?</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={toggleDateEdit}>
              <Text style={styles.dateButtonText}>
                {isDefaultTime
                  ? 'Now'
                  : `${formatDisplayDate(loggedAt)} at ${formatDisplayTime(loggedAt)}`}
              </Text>
            </TouchableOpacity>

            {showDateEdit && (
              <View style={styles.dateEditContainer}>
                <View style={styles.dateEditRow}>
                  <View style={styles.dateEditField}>
                    <Text style={styles.dateEditLabel}>Date</Text>
                    <TextInput
                      style={styles.dateEditInput}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.secondary}
                      value={dateText}
                      onChangeText={(text) => {
                        setDateText(text);
                        handleDateTimeChange(text, timeText);
                      }}
                      keyboardType="numbers-and-punctuation"
                      returnKeyType="done"
                    />
                  </View>
                  <View style={styles.dateEditField}>
                    <Text style={styles.dateEditLabel}>Time</Text>
                    <TextInput
                      style={styles.dateEditInput}
                      placeholder="HH:MM"
                      placeholderTextColor={colors.secondary}
                      value={timeText}
                      onChangeText={(text) => {
                        setTimeText(text);
                        handleDateTimeChange(dateText, text);
                      }}
                      keyboardType="numbers-and-punctuation"
                      returnKeyType="done"
                    />
                  </View>
                </View>
                {dateError && (
                  <Text style={styles.dateErrorText}>{dateError}</Text>
                )}
              </View>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submitButton, isDisabled && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isDisabled}>
              <Text style={styles.submitButtonText}>
                {isEditMode ? 'Update Meal' : 'Add Meal'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>Discard</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.base,
    maxHeight: '80%',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginBottom: spacing.xs,
    fontWeight: weightSemiBold,
  },
  fieldSpacing: {
    marginTop: spacing.md,
  },
  inputRow: {
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.primary,
  },
  caloriePreview: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  dateButton: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  dateButtonText: {
    fontSize: fontSize.base,
    color: colors.primary,
  },
  dateEditContainer: {
    marginTop: spacing.sm,
  },
  dateEditRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateEditField: {
    flex: 1,
  },
  dateEditLabel: {
    fontSize: fontSize.xs,
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  dateEditInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.primary,
  },
  dateErrorText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.background,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  cancelText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
  },
});
