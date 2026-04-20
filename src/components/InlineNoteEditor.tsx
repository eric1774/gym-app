import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fontSize, weightMedium } from '../theme';

export interface InlineNoteEditorProps {
  value: string;
  hint?: string;
  onCommit: (text: string) => void;
}

export function InlineNoteEditor({ value, hint, onCommit }: InlineNoteEditorProps) {
  const [text, setText] = useState(value);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => { setText(value); }, [value]);
  useEffect(() => { if (editing) { inputRef.current?.focus(); } }, [editing]);

  const commit = () => {
    setEditing(false);
    if (text !== value) { onCommit(text); }
  };

  if (editing) {
    return (
      <View style={styles.editingContainer}>
        <Text style={styles.pencilEditing}>✎</Text>
        <TextInput
          ref={inputRef}
          testID="inline-note-input"
          style={styles.input}
          value={text}
          onChangeText={setText}
          onBlur={commit}
          onSubmitEditing={commit}
          multiline={false}
          returnKeyType="done"
          blurOnSubmit
          placeholder={hint ?? 'Add a note…'}
          placeholderTextColor={colors.secondaryDim}
        />
      </View>
    );
  }

  const showHint = !value && !!hint;
  const showPlaceholder = !value && !hint;

  return (
    <Pressable onPress={() => setEditing(true)} style={styles.viewContainer}>
      <Text style={styles.pencilView}>✎</Text>
      {value ? (
        <Text style={styles.valueText}>{value}</Text>
      ) : showHint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : showPlaceholder ? (
        <Text style={styles.placeholderText}>Add a note…</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  viewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
    gap: 6,
  },
  editingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  pencilView: { color: colors.secondary, fontSize: fontSize.sm },
  pencilEditing: { color: colors.secondary, fontSize: fontSize.sm },
  input: {
    flex: 1,
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    padding: 0,
  },
  valueText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
  },
  hintText: {
    color: colors.secondaryDim,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  placeholderText: {
    color: colors.secondaryDim,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
});
