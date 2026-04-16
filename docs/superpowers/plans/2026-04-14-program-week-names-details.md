# Program Week Names & Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-week naming and freeform detail text to programs, displayed on ProgramDetailScreen with inline and bulk editing.

**Architecture:** New `program_weeks` table stores sparse rows (only for weeks with data). Three new DB functions handle CRUD. ProgramDetailScreen gets a week name in the existing week card, a new Week Details card, and two modals (inline edit + manage all weeks). A new `WeekEditModal` component handles both edit flows.

**Tech Stack:** React Native, react-native-sqlite-storage, TypeScript

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types/index.ts` | Modify (line ~86) | Add `ProgramWeek` interface |
| `src/db/schema.ts` | Modify (line ~84) | Add `CREATE_PROGRAM_WEEKS_TABLE` constant |
| `src/db/migrations.ts` | Modify (after version 17) | Add version 18 migration |
| `src/db/programs.ts` | Modify (end of file) | Add `getWeekData`, `upsertWeekData`, `getAllWeekData` |
| `src/components/WeekEditModal.tsx` | Create | Bottom-sheet modal for editing week name + details |
| `src/components/ManageWeeksModal.tsx` | Create | Full list of weeks with tap-to-edit |
| `src/screens/ProgramDetailScreen.tsx` | Modify | Week name display, details card, empty state, modal wiring |

---

### Task 1: Add ProgramWeek Type

**Files:**
- Modify: `src/types/index.ts:86` (after `Program` interface)

- [ ] **Step 1: Add ProgramWeek interface**

In `src/types/index.ts`, add directly after the closing `}` of the `Program` interface (after line 86):

```typescript
export interface ProgramWeek {
  id: number;
  programId: number;
  weekNumber: number;
  name: string | null;
  details: string | null;
}
```

- [ ] **Step 2: Commit**

```bash
rtk git add src/types/index.ts
rtk git commit -m "feat: add ProgramWeek type for week names and details"
```

---

### Task 2: Add Schema and Migration

**Files:**
- Modify: `src/db/schema.ts:84` (after `CREATE_PROGRAM_DAY_EXERCISES_TABLE`)
- Modify: `src/db/migrations.ts` (add version 18 after version 17)

- [ ] **Step 1: Add table constant to schema.ts**

In `src/db/schema.ts`, add after the `CREATE_PROGRAM_DAY_EXERCISES_TABLE` constant (after line 84), before the `// ── Heart Rate tables` comment:

```typescript
export const CREATE_PROGRAM_WEEKS_TABLE = `
  CREATE TABLE IF NOT EXISTS program_weeks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    name TEXT,
    details TEXT,
    UNIQUE(program_id, week_number)
  )
`;
```

- [ ] **Step 2: Add migration version 18 to migrations.ts**

In `src/db/migrations.ts`:

First, add `CREATE_PROGRAM_WEEKS_TABLE` to the import from `./schema`:

```typescript
import {
  CREATE_BADGES_TABLE,
  CREATE_USER_BADGES_TABLE,
  CREATE_STREAK_SHIELDS_TABLE,
  CREATE_USER_LEVEL_TABLE,
  CREATE_MUSCLE_GROUPS_TABLE,
  CREATE_EXERCISE_MUSCLE_GROUPS_TABLE,
  CREATE_PROGRAM_WEEKS_TABLE,
} from './schema';
```

Then add a new migration entry after version 17 in the `MIGRATIONS` array. Also update the comment block at the top to include version 18:

```typescript
  {
    version: 18,
    description: 'Create program_weeks table for week names and details',
    up: (tx: Transaction) => {
      tx.executeSql(CREATE_PROGRAM_WEEKS_TABLE);
    },
  },
```

- [ ] **Step 3: Verify the app builds**

```bash
cd android && rtk ./gradlew assembleDebug 2>&1 | tail -5
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 4: Commit**

```bash
rtk git add src/db/schema.ts src/db/migrations.ts
rtk git commit -m "feat: add program_weeks table (migration v18)"
```

---

### Task 3: Add Database Functions

**Files:**
- Modify: `src/db/programs.ts` (add at end of file, update imports)

- [ ] **Step 1: Update imports in programs.ts**

At line 2, update the import to include `ProgramWeek`:

```typescript
import { Program, ProgramDay, ProgramDayExercise, ProgramWeek } from '../types';
```

- [ ] **Step 2: Add rowToProgramWeek mapper**

Add after the `rowToProgramDayExercise` function (after line 60):

```typescript
export function rowToProgramWeek(row: {
  id: number;
  program_id: number;
  week_number: number;
  name: string | null;
  details: string | null;
}): ProgramWeek {
  return {
    id: row.id,
    programId: row.program_id,
    weekNumber: row.week_number,
    name: row.name ?? null,
    details: row.details ?? null,
  };
}
```

- [ ] **Step 3: Add getWeekData function**

Add at the end of the file, in a new section:

```typescript
// ── Program Week Data ──────────────────────────────────────────────

/** Return the week name/details for a specific week, or null if not set. */
export async function getWeekData(
  programId: number,
  weekNumber: number,
): Promise<ProgramWeek | null> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM program_weeks WHERE program_id = ? AND week_number = ?',
    [programId, weekNumber],
  );
  if (result.rows.length === 0) {
    return null;
  }
  return rowToProgramWeek(result.rows.item(0));
}
```

- [ ] **Step 4: Add upsertWeekData function**

Add after `getWeekData`:

```typescript
/** Insert or update week name/details. Deletes row if both are empty. */
export async function upsertWeekData(
  programId: number,
  weekNumber: number,
  name: string | null,
  details: string | null,
): Promise<void> {
  const database = await db;
  const trimmedName = name?.trim() || null;
  const trimmedDetails = details?.trim() || null;

  if (trimmedName === null && trimmedDetails === null) {
    await executeSql(
      database,
      'DELETE FROM program_weeks WHERE program_id = ? AND week_number = ?',
      [programId, weekNumber],
    );
    return;
  }

  await executeSql(
    database,
    `INSERT INTO program_weeks (program_id, week_number, name, details)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(program_id, week_number)
     DO UPDATE SET name = excluded.name, details = excluded.details`,
    [programId, weekNumber, trimmedName, trimmedDetails],
  );
}
```

- [ ] **Step 5: Add getAllWeekData function**

Add after `upsertWeekData`:

```typescript
/** Return all week data for a program, ordered by week_number. */
export async function getAllWeekData(programId: number): Promise<ProgramWeek[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM program_weeks WHERE program_id = ? ORDER BY week_number',
    [programId],
  );
  const weeks: ProgramWeek[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    weeks.push(rowToProgramWeek(result.rows.item(i)));
  }
  return weeks;
}
```

- [ ] **Step 6: Commit**

```bash
rtk git add src/db/programs.ts
rtk git commit -m "feat: add getWeekData, upsertWeekData, getAllWeekData DB functions"
```

---

### Task 4: Create WeekEditModal Component

**Files:**
- Create: `src/components/WeekEditModal.tsx`

- [ ] **Step 1: Create WeekEditModal.tsx**

This modal is modeled after the existing `RenameModal` pattern — bottom sheet with `KeyboardAvoidingView`, overlay press to dismiss.

```typescript
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

interface WeekEditModalProps {
  visible: boolean;
  weekNumber: number;
  totalWeeks: number;
  currentName: string;
  currentDetails: string;
  onClose: () => void;
  onSave: (name: string | null, details: string | null) => void;
}

export function WeekEditModal({
  visible,
  weekNumber,
  totalWeeks,
  currentName,
  currentDetails,
  onClose,
  onSave,
}: WeekEditModalProps) {
  const [name, setName] = useState(currentName);
  const [details, setDetails] = useState(currentDetails);

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setDetails(currentDetails);
    }
  }, [visible, currentName, currentDetails]);

  const hasChanges =
    name.trim() !== currentName.trim() || details.trim() !== currentDetails.trim();

  const handleSubmit = () => {
    if (!hasChanges) return;
    onSave(name.trim() || null, details.trim() || null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.keyboardAvoid}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>
            Week {weekNumber} of {totalWeeks}
          </Text>

          <Text style={styles.label}>Week Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Ramp Phase"
            placeholderTextColor={colors.secondary}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="next"
            maxLength={40}
          />

          <Text style={[styles.label, { marginTop: spacing.md }]}>Week Details</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="e.g., Focus on technique this week..."
            placeholderTextColor={colors.secondary}
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={200}
          />

          <TouchableOpacity
            style={[styles.submitButton, !hasChanges && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!hasChanges}>
            <Text style={styles.submitButtonText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
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
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.primary,
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: spacing.md,
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
```

- [ ] **Step 2: Commit**

```bash
rtk git add src/components/WeekEditModal.tsx
rtk git commit -m "feat: create WeekEditModal component for editing week name and details"
```

---

### Task 5: Create ManageWeeksModal Component

**Files:**
- Create: `src/components/ManageWeeksModal.tsx`

- [ ] **Step 1: Create ManageWeeksModal.tsx**

This modal shows all weeks in a scrollable list. Tapping a row opens the `WeekEditModal` for that week.

```typescript
import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightMedium, weightSemiBold } from '../theme/typography';
import { ProgramWeek } from '../types';
import { getAllWeekData, upsertWeekData } from '../db/programs';
import { WeekEditModal } from './WeekEditModal';

interface ManageWeeksModalProps {
  visible: boolean;
  programId: number;
  totalWeeks: number;
  onClose: () => void;
  onChanged: () => void;
}

export function ManageWeeksModal({
  visible,
  programId,
  totalWeeks,
  onClose,
  onChanged,
}: ManageWeeksModalProps) {
  const [weekData, setWeekData] = useState<Map<number, ProgramWeek>>(new Map());
  const [editingWeek, setEditingWeek] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    const data = await getAllWeekData(programId);
    const map = new Map<number, ProgramWeek>();
    for (const w of data) {
      map.set(w.weekNumber, w);
    }
    setWeekData(map);
  }, [programId]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  const handleSave = useCallback(
    async (weekNumber: number, name: string | null, details: string | null) => {
      await upsertWeekData(programId, weekNumber, name, details);
      await loadData();
      onChanged();
    },
    [programId, loadData, onChanged],
  );

  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);
  const editingData = editingWeek !== null ? weekData.get(editingWeek) : undefined;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Manage Weeks</Text>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {weeks.map((weekNum) => {
            const data = weekData.get(weekNum);
            return (
              <TouchableOpacity
                key={weekNum}
                style={styles.weekRow}
                onPress={() => setEditingWeek(weekNum)}
                activeOpacity={0.7}>
                <Text style={styles.weekNumber}>Week {weekNum}</Text>
                <Text
                  style={[styles.weekName, !data?.name && styles.weekNameEmpty]}
                  numberOfLines={1}>
                  {data?.name || 'Unnamed'}
                </Text>
                <Text style={styles.chevron}>{'\u203A'}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity style={styles.doneButton} onPress={onClose}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      <WeekEditModal
        visible={editingWeek !== null}
        weekNumber={editingWeek ?? 1}
        totalWeeks={totalWeeks}
        currentName={editingData?.name ?? ''}
        currentDetails={editingData?.details ?? ''}
        onClose={() => setEditingWeek(null)}
        onSave={(name, details) => {
          if (editingWeek !== null) {
            handleSave(editingWeek, name, details);
          }
        }}
      />
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
    maxHeight: '70%',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  scrollView: {
    marginBottom: spacing.md,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekNumber: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.primary,
    width: 72,
  },
  weekName: {
    fontSize: fontSize.base,
    color: colors.accent,
    flex: 1,
    fontWeight: weightMedium,
  },
  weekNameEmpty: {
    color: colors.secondary,
    fontStyle: 'italic',
  },
  chevron: {
    fontSize: fontSize.lg,
    color: colors.secondary,
    marginLeft: spacing.sm,
  },
  doneButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
  doneButtonText: {
    color: colors.background,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
});
```

- [ ] **Step 2: Commit**

```bash
rtk git add src/components/ManageWeeksModal.tsx
rtk git commit -m "feat: create ManageWeeksModal component for bulk week editing"
```

---

### Task 6: Integrate into ProgramDetailScreen

**Files:**
- Modify: `src/screens/ProgramDetailScreen.tsx`

This is the largest task. It modifies the existing screen to:
1. Fetch week data on load and when week changes
2. Show week name in the week card
3. Show the Week Details card (or empty state prompt)
4. Add a "Manage Weeks" button in the week controls row
5. Wire up both modals

- [ ] **Step 1: Add imports**

At the top of `ProgramDetailScreen.tsx`, add to the existing import from `../db/programs` (line 19-31):

Add `getWeekData` and `upsertWeekData` to the import from `'../db/programs'`:

```typescript
import {
  activateProgram,
  deleteProgram,
  advanceWeek,
  createProgramDay,
  deleteProgramDay,
  decrementWeek,
  duplicateProgramDay,
  getProgram,
  getProgramDays,
  renameProgram,
  renameProgramDay,
  reorderProgramDays,
  getWeekData,
  upsertWeekData,
} from '../db/programs';
```

Add the `ProgramWeek` type to the import from `'../types'` (line 37):

```typescript
import { Program, ProgramDay, ProgramDayCompletionStatus, ProgramWeek } from '../types';
```

Add the new modal imports after the existing modal imports (after line 40):

```typescript
import { WeekEditModal } from '../components/WeekEditModal';
import { ManageWeeksModal } from '../components/ManageWeeksModal';
```

- [ ] **Step 2: Add state variables**

In the `ProgramDetailScreen` function, add after the existing state declarations (after line 146, the `completedWorkouts` state):

```typescript
  const [currentWeekData, setCurrentWeekData] = useState<ProgramWeek | null>(null);
  const [weekEditVisible, setWeekEditVisible] = useState(false);
  const [manageWeeksVisible, setManageWeeksVisible] = useState(false);
```

- [ ] **Step 3: Update the refresh function**

Modify the `refresh` callback (around line 162) to also fetch week data. Change the `Promise.all` call:

```typescript
  const refresh = useCallback(async () => {
    try {
      const [p, d, wc, completed] = await Promise.all([getProgram(programId), getProgramDays(programId), getProgramWeekCompletion(programId), getProgramTotalCompleted(programId)]);
      setProgram(p);
      setDays(d);
      setWeekCompletion(wc);
      setCompletedWorkouts(completed);
      if (p) {
        const wd = await getWeekData(programId, p.currentWeek);
        setCurrentWeekData(wd);
      }
    } catch {
      // ignore
    }
  }, [programId]);
```

Note: `getWeekData` is called after the main `Promise.all` because it depends on `p.currentWeek`. This is a single small query — the serial overhead is negligible.

- [ ] **Step 4: Add the week edit save handler**

Add after the `handleRenameDay` callback (after line 303):

```typescript
  const handleSaveWeekData = useCallback(
    async (name: string | null, details: string | null) => {
      if (!program) return;
      try {
        await upsertWeekData(programId, program.currentWeek, name, details);
        await refresh();
      } catch {
        // ignore
      }
    },
    [programId, program, refresh],
  );
```

- [ ] **Step 5: Add week name to the week card**

In the JSX, find the week card section (around line 537-563). Add the week name below the title text. Change:

```typescript
            <Text style={styles.weekCardTitle}>
              WEEK {program.currentWeek} OF {program.weeks}
            </Text>
```

to:

```typescript
            <Text style={styles.weekCardTitle}>
              WEEK {program.currentWeek} OF {program.weeks}
            </Text>
            {currentWeekData?.name && (
              <TouchableOpacity onPress={() => setWeekEditVisible(true)} activeOpacity={0.7}>
                <Text style={styles.weekCardName}>{currentWeekData.name}</Text>
              </TouchableOpacity>
            )}
```

- [ ] **Step 6: Add Week Details card and empty state**

Between the week card closing `</View>` tag (around line 562) and the `{/* Section header */}` comment (line 565), add the Week Details card:

```typescript
        {/* Week details card */}
        {isActivated && currentWeekData?.details && (
          <View style={styles.weekDetailsCard}>
            <View style={styles.weekDetailsHeader}>
              <Text style={styles.weekDetailsTitle}>WEEK DETAILS</Text>
              <TouchableOpacity onPress={() => setWeekEditVisible(true)}>
                <Text style={styles.weekDetailsEdit}>Edit</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.weekDetailsText}>{currentWeekData.details}</Text>
          </View>
        )}

        {/* Add week info prompt (when no name AND no details) */}
        {isActivated && orderedWeekCompletion.length > 0 && !currentWeekData?.name && !currentWeekData?.details && (
          <TouchableOpacity
            style={styles.addWeekInfoPrompt}
            onPress={() => setWeekEditVisible(true)}
            activeOpacity={0.7}>
            <Text style={styles.addWeekInfoText}>+ Add week name & details</Text>
          </TouchableOpacity>
        )}
```

- [ ] **Step 7: Add "Manage Weeks" button to week controls**

In the week controls section (around line 505-522), add a "Manage Weeks" button between the Prev and Next buttons. Change the `weekControls` View content:

```typescript
            <View style={styles.weekControls}>
              <TouchableOpacity
                style={[styles.weekNavButton, !canGoBack && styles.weekNavButtonDisabled]}
                onPress={handleGoBack}
                disabled={!canGoBack}>
                <Text style={[styles.weekNavText, !canGoBack && styles.weekNavTextDisabled]}>
                  {'\u2039 Prev'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.manageWeeksButton}
                onPress={() => setManageWeeksVisible(true)}>
                <Text style={styles.manageWeeksText}>Manage Weeks</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.weekNavButton, !canAdvance && styles.weekNavButtonDisabled]}
                onPress={handleAdvanceWeek}
                disabled={!canAdvance}>
                <Text style={[styles.weekNavText, !canAdvance && styles.weekNavTextDisabled]}>
                  {'Next \u203A'}
                </Text>
              </TouchableOpacity>
            </View>
```

- [ ] **Step 8: Add modal components to JSX**

Before the closing `</SafeAreaView>` tag (around line 676), add the two new modals after the existing `RenameModal` components:

```typescript
      <WeekEditModal
        visible={weekEditVisible}
        weekNumber={program.currentWeek}
        totalWeeks={program.weeks}
        currentName={currentWeekData?.name ?? ''}
        currentDetails={currentWeekData?.details ?? ''}
        onClose={() => setWeekEditVisible(false)}
        onSave={handleSaveWeekData}
      />

      <ManageWeeksModal
        visible={manageWeeksVisible}
        programId={programId}
        totalWeeks={program.weeks}
        onClose={() => setManageWeeksVisible(false)}
        onChanged={refresh}
      />
```

- [ ] **Step 9: Add styles**

Add these styles to the `StyleSheet.create` block (after the existing `weekCardTitle` style around line 831):

```typescript
  weekCardName: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  weekDetailsCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  weekDetailsTitle: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.secondary,
    letterSpacing: 1.2,
  },
  weekDetailsEdit: {
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
    color: colors.accent,
  },
  weekDetailsText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    lineHeight: 20,
  },
  addWeekInfoPrompt: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addWeekInfoText: {
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  manageWeeksButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageWeeksText: {
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
    color: colors.accent,
  },
```

Note: `fontSize.xs` is used for the smaller UI labels. Check that it exists in `src/theme/typography.ts`. If not, use `11` directly or add it to the typography file.

- [ ] **Step 10: Verify the app builds**

```bash
cd android && rtk ./gradlew assembleDebug 2>&1 | tail -5
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 11: Commit**

```bash
rtk git add src/screens/ProgramDetailScreen.tsx
rtk git commit -m "feat: integrate week names and details into ProgramDetailScreen"
```

---

### Task 7: Manual Verification

- [ ] **Step 1: Deploy to emulator and test**

1. Open the app, go to Programs, open an activated program
2. Verify the "WEEK X OF Y" card shows — with no name or details yet, the `"+ Add week name & details"` prompt should appear
3. Tap the prompt — WeekEditModal should open with empty fields
4. Enter a name ("Ramp Phase") and details ("Focus on form this week") → Save
5. Verify the name appears in mint below "WEEK 1 OF 8"
6. Verify the Week Details card appears with the details text and "Edit" link
7. Tap "Edit" — modal should reopen pre-filled
8. Clear both fields → Save — verify the prompt returns (row deleted)
9. Tap "Manage Weeks" — verify the ManageWeeksModal shows all weeks
10. Tap a future week row → edit name/details → verify it saves
11. Navigate to that week (Next button) → verify the name/details display
12. Test Prev/Next navigation — details should update per week
13. Delete the program → verify no crash (CASCADE cleanup)
