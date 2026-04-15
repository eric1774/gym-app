# Sessions Progress Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Sessions" tab to the Progress Hub with program-day cards tracking session-over-session volume and strength changes, a program selector for active/archived programs, and a per-exercise drill-down screen.

**Architecture:** New tab in ProgressHubScreen with a segmented control. Sessions tab fetches data via new DB query functions that compare the two most recent completed sessions per program day. One new migration adds `archived_at` to programs. One new screen for drill-down.

**Tech Stack:** React Native, react-native-sqlite-storage, @react-navigation/native-stack

**Spec:** `docs/superpowers/specs/2026-04-15-sessions-progress-tab-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/types/index.ts` | Add `SessionDayProgress`, `SessionDayExerciseProgress`, `ProgramSelectorItem` types; add `archivedAt` to `Program` |
| Modify | `src/db/migrations.ts` | Version 20: `ALTER TABLE programs ADD COLUMN archived_at TEXT` |
| Modify | `src/db/programs.ts` | Add `archiveProgram`, `unarchiveProgram`, `getProgramsWithSessionData`; update `rowToProgram` to include `archivedAt` |
| Modify | `src/db/progress.ts` | Add `getSessionDayProgress`, `getSessionDayExerciseProgress` |
| Create | `src/components/ProgramSelectorBar.tsx` | Pressable bar with program name, badge, and dropdown modal |
| Create | `src/components/SessionDayCard.tsx` | Card showing day name, vol %, str %, last trained |
| Modify | `src/screens/ProgressHubScreen.tsx` | Add segmented tab bar, Sessions tab content with selector + card grid |
| Create | `src/screens/SessionDayProgressScreen.tsx` | Drill-down: per-exercise vol % and str % for a program day |
| Modify | `src/navigation/TabNavigator.tsx` | Add `SessionDayProgress` route to `DashboardStackParamList` |

---

### Task 1: Add Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add `archivedAt` to `Program` interface**

In `src/types/index.ts`, add `archivedAt` field to the `Program` interface (after `createdAt`):

```typescript
export interface Program {
  id: number;
  name: string;
  weeks: number;
  startDate: string | null;
  currentWeek: number;
  createdAt: string;
  archivedAt: string | null;
}
```

- [ ] **Step 2: Add new interfaces at end of progress types section**

Add these interfaces after the `SessionComparison` interface (around line 519), before the `export * from './gamification'` line:

```typescript
export interface SessionDayProgress {
  programDayId: number;
  dayName: string;
  volumeChangePercent: number | null;
  strengthChangePercent: number | null;
  hasPR: boolean;
  lastTrainedAt: string | null;
  sessionCount: number;
}

export interface SessionDayExerciseProgress {
  exerciseId: number;
  exerciseName: string;
  volumeChangePercent: number | null;
  strengthChangePercent: number | null;
}

export interface ProgramSelectorItem {
  id: number;
  name: string;
  isArchived: boolean;
  archivedAt: string | null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add SessionDayProgress, SessionDayExerciseProgress, ProgramSelectorItem types"
```

---

### Task 2: Migration — Add `archived_at` to Programs

**Files:**
- Modify: `src/db/migrations.ts`

- [ ] **Step 1: Add version 20 migration**

Add to the `MIGRATIONS` array (after the version 19 entry):

```typescript
  {
    version: 20,
    description: 'Add archived_at column to programs for session tab archive support',
    up: (tx: Transaction) => {
      tx.executeSql(
        'ALTER TABLE programs ADD COLUMN archived_at TEXT',
      );
    },
  },
```

- [ ] **Step 2: Update the migration list comment**

Add to the version comments at the top of the file:

```
 * - Version 20: Add archived_at column to programs for archive support
```

- [ ] **Step 3: Commit**

```bash
git add src/db/migrations.ts
git commit -m "feat: add migration 20 — archived_at column on programs table"
```

---

### Task 3: Program Archive DB Functions

**Files:**
- Modify: `src/db/programs.ts`

- [ ] **Step 1: Update `rowToProgram` to include `archivedAt`**

Update the `rowToProgram` function. Add `archived_at` to the row parameter type and map it:

```typescript
export function rowToProgram(row: {
  id: number;
  name: string;
  weeks: number;
  start_date: string | null;
  current_week: number;
  created_at: string;
  archived_at: string | null;
}): Program {
  return {
    id: row.id,
    name: row.name,
    weeks: row.weeks,
    startDate: row.start_date ?? null,
    currentWeek: row.current_week,
    createdAt: row.created_at,
    archivedAt: row.archived_at ?? null,
  };
}
```

- [ ] **Step 2: Add `archiveProgram` and `unarchiveProgram` functions**

Add at the end of the file:

```typescript
export async function archiveProgram(programId: number): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE programs SET archived_at = ? WHERE id = ?',
    [new Date().toISOString(), programId],
  );
}

export async function unarchiveProgram(programId: number): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE programs SET archived_at = NULL WHERE id = ?',
    [programId],
  );
}
```

- [ ] **Step 3: Add `getProgramsWithSessionData` function**

Add to `src/db/programs.ts`:

```typescript
import { ProgramSelectorItem } from '../types';

export async function getProgramsWithSessionData(): Promise<ProgramSelectorItem[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT DISTINCT p.id, p.name, p.archived_at
     FROM programs p
     INNER JOIN program_days pd ON pd.program_id = p.id
     INNER JOIN workout_sessions ws ON ws.program_day_id = pd.id
     WHERE ws.completed_at IS NOT NULL
     ORDER BY
       CASE WHEN p.archived_at IS NULL THEN 0 ELSE 1 END,
       p.created_at DESC`,
    [],
  );

  const items: ProgramSelectorItem[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    items.push({
      id: row.id,
      name: row.name,
      isArchived: row.archived_at !== null,
      archivedAt: row.archived_at ?? null,
    });
  }
  return items;
}
```

- [ ] **Step 4: Verify the import of `ProgramSelectorItem` is present**

Ensure the import at the top of `src/db/programs.ts` includes `ProgramSelectorItem`:

```typescript
import { Program, ProgramDay, ProgramDayExercise, ProgramWeek, ProgramSelectorItem } from '../types';
```

- [ ] **Step 5: Commit**

```bash
git add src/db/programs.ts
git commit -m "feat: add archiveProgram, unarchiveProgram, getProgramsWithSessionData"
```

---

### Task 4: Session Day Progress DB Query

**Files:**
- Modify: `src/db/progress.ts`

- [ ] **Step 1: Add import for new type**

Add `SessionDayProgress` to the imports from `../types` at the top of `src/db/progress.ts`.

- [ ] **Step 2: Add `getSessionDayProgress` function**

Add this function after the `getMuscleGroupProgress` function:

```typescript
// ── getSessionDayProgress ───────────────────────────────────────────

/**
 * For each day in a program, compare the two most recent completed sessions
 * to compute volume and strength % changes.
 */
export async function getSessionDayProgress(
  programId: number,
): Promise<SessionDayProgress[]> {
  const database = await db;

  // Get all days for this program
  const daysResult = await executeSql(
    database,
    `SELECT id, name FROM program_days
     WHERE program_id = ?
     ORDER BY sort_order`,
    [programId],
  );

  const result: SessionDayProgress[] = [];

  for (let d = 0; d < daysResult.rows.length; d++) {
    const day = daysResult.rows.item(d);
    const dayId: number = day.id;
    const dayName: string = day.name;

    // Find the two most recent completed sessions for this day
    const sessionsResult = await executeSql(
      database,
      `SELECT id, completed_at
       FROM workout_sessions
       WHERE program_day_id = ?
         AND completed_at IS NOT NULL
       ORDER BY completed_at DESC
       LIMIT 2`,
      [dayId],
    );

    const sessionCount = sessionsResult.rows.length;

    if (sessionCount === 0) {
      result.push({
        programDayId: dayId,
        dayName,
        volumeChangePercent: null,
        strengthChangePercent: null,
        hasPR: false,
        lastTrainedAt: null,
        sessionCount: 0,
      });
      continue;
    }

    const currentSessionId: number = sessionsResult.rows.item(0).id;
    const lastTrainedAt: string = sessionsResult.rows.item(0).completed_at;

    if (sessionCount < 2) {
      // Check for PRs in the single session
      const prCheck = await executeSql(
        database,
        `SELECT COUNT(*) AS cnt
         FROM workout_sets ws
         WHERE ws.session_id = ?
           AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
           AND ws.weight_kg > 0
           AND ws.weight_kg > (
             SELECT COALESCE(MAX(ws2.weight_kg), 0)
             FROM workout_sets ws2
             INNER JOIN workout_sessions wss2 ON wss2.id = ws2.session_id
             WHERE ws2.exercise_id = ws.exercise_id
               AND wss2.id != ?
               AND wss2.completed_at IS NOT NULL
               AND (ws2.is_warmup IS NULL OR ws2.is_warmup = 0)
           )`,
        [currentSessionId, currentSessionId],
      );

      result.push({
        programDayId: dayId,
        dayName,
        volumeChangePercent: null,
        strengthChangePercent: null,
        hasPR: (prCheck.rows.item(0).cnt ?? 0) > 0,
        lastTrainedAt,
        sessionCount: 1,
      });
      continue;
    }

    const previousSessionId: number = sessionsResult.rows.item(1).id;

    // Volume for current session
    const currentVolResult = await executeSql(
      database,
      `SELECT COALESCE(SUM(ws.weight_kg * ws.reps), 0) AS volume
       FROM workout_sets ws
       WHERE ws.session_id = ?
         AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)`,
      [currentSessionId],
    );
    const currentVolume: number = currentVolResult.rows.item(0).volume;

    // Volume for previous session
    const prevVolResult = await executeSql(
      database,
      `SELECT COALESCE(SUM(ws.weight_kg * ws.reps), 0) AS volume
       FROM workout_sets ws
       WHERE ws.session_id = ?
         AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)`,
      [previousSessionId],
    );
    const prevVolume: number = prevVolResult.rows.item(0).volume;

    let volumeChangePercent: number | null = null;
    if (prevVolume > 0) {
      volumeChangePercent = ((currentVolume - prevVolume) / prevVolume) * 100;
    }

    // Strength: average of per-exercise max weight (exclude 0-weight bodyweight exercises)
    const currentStrResult = await executeSql(
      database,
      `SELECT AVG(max_weight) AS avg_strength FROM (
         SELECT MAX(ws.weight_kg) AS max_weight
         FROM workout_sets ws
         WHERE ws.session_id = ?
           AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
           AND ws.weight_kg > 0
         GROUP BY ws.exercise_id
       )`,
      [currentSessionId],
    );

    const prevStrResult = await executeSql(
      database,
      `SELECT AVG(max_weight) AS avg_strength FROM (
         SELECT MAX(ws.weight_kg) AS max_weight
         FROM workout_sets ws
         WHERE ws.session_id = ?
           AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
           AND ws.weight_kg > 0
         GROUP BY ws.exercise_id
       )`,
      [previousSessionId],
    );

    const currentStr: number | null = currentStrResult.rows.item(0).avg_strength ?? null;
    const prevStr: number | null = prevStrResult.rows.item(0).avg_strength ?? null;

    let strengthChangePercent: number | null = null;
    if (currentStr !== null && prevStr !== null && prevStr > 0) {
      strengthChangePercent = ((currentStr - prevStr) / prevStr) * 100;
    }

    // PR check for current session
    const prCheck = await executeSql(
      database,
      `SELECT COUNT(*) AS cnt
       FROM workout_sets ws
       WHERE ws.session_id = ?
         AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
         AND ws.weight_kg > 0
         AND ws.weight_kg > (
           SELECT COALESCE(MAX(ws2.weight_kg), 0)
           FROM workout_sets ws2
           INNER JOIN workout_sessions wss2 ON wss2.id = ws2.session_id
           WHERE ws2.exercise_id = ws.exercise_id
             AND wss2.id != ?
             AND wss2.completed_at IS NOT NULL
             AND (ws2.is_warmup IS NULL OR ws2.is_warmup = 0)
         )`,
      [currentSessionId, currentSessionId],
    );

    result.push({
      programDayId: dayId,
      dayName,
      volumeChangePercent,
      strengthChangePercent,
      hasPR: (prCheck.rows.item(0).cnt ?? 0) > 0,
      lastTrainedAt,
      sessionCount,
    });
  }

  return result;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/db/progress.ts
git commit -m "feat: add getSessionDayProgress query for session-over-session comparison"
```

---

### Task 5: Session Day Exercise Progress DB Query (Drill-Down)

**Files:**
- Modify: `src/db/progress.ts`

- [ ] **Step 1: Add import for `SessionDayExerciseProgress`**

Add `SessionDayExerciseProgress` to the imports from `../types` at the top of `src/db/progress.ts` (alongside the `SessionDayProgress` added in Task 4).

- [ ] **Step 2: Add `getSessionDayExerciseProgress` function**

Add after `getSessionDayProgress`:

```typescript
// ── getSessionDayExerciseProgress ───────────────────────────────────

/**
 * Per-exercise breakdown for a program day's two most recent sessions.
 * Returns volume and strength % change per exercise.
 */
export async function getSessionDayExerciseProgress(
  programDayId: number,
): Promise<SessionDayExerciseProgress[]> {
  const database = await db;

  // Find two most recent completed sessions for this day
  const sessionsResult = await executeSql(
    database,
    `SELECT id FROM workout_sessions
     WHERE program_day_id = ?
       AND completed_at IS NOT NULL
     ORDER BY completed_at DESC
     LIMIT 2`,
    [programDayId],
  );

  if (sessionsResult.rows.length < 2) {
    // Not enough sessions to compare — return exercises with null deltas
    if (sessionsResult.rows.length === 1) {
      const sessionId = sessionsResult.rows.item(0).id;
      const exercisesResult = await executeSql(
        database,
        `SELECT DISTINCT ws.exercise_id, e.name AS exercise_name
         FROM workout_sets ws
         INNER JOIN exercises e ON e.id = ws.exercise_id
         WHERE ws.session_id = ?
           AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
         ORDER BY MIN(ws.set_number)`,
        [sessionId],
      );
      const items: SessionDayExerciseProgress[] = [];
      for (let i = 0; i < exercisesResult.rows.length; i++) {
        const row = exercisesResult.rows.item(i);
        items.push({
          exerciseId: row.exercise_id,
          exerciseName: row.exercise_name,
          volumeChangePercent: null,
          strengthChangePercent: null,
        });
      }
      return items;
    }
    return [];
  }

  const currentSessionId: number = sessionsResult.rows.item(0).id;
  const previousSessionId: number = sessionsResult.rows.item(1).id;

  // Get all exercises from the current session
  const exercisesResult = await executeSql(
    database,
    `SELECT DISTINCT ws.exercise_id, e.name AS exercise_name
     FROM workout_sets ws
     INNER JOIN exercises e ON e.id = ws.exercise_id
     WHERE ws.session_id = ?
       AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
     ORDER BY MIN(ws.set_number)`,
    [currentSessionId],
  );

  const result: SessionDayExerciseProgress[] = [];

  for (let i = 0; i < exercisesResult.rows.length; i++) {
    const row = exercisesResult.rows.item(i);
    const exerciseId: number = row.exercise_id;
    const exerciseName: string = row.exercise_name;

    // Volume per exercise: current session
    const curVolResult = await executeSql(
      database,
      `SELECT COALESCE(SUM(weight_kg * reps), 0) AS volume
       FROM workout_sets
       WHERE session_id = ? AND exercise_id = ?
         AND (is_warmup IS NULL OR is_warmup = 0)`,
      [currentSessionId, exerciseId],
    );
    const curVol: number = curVolResult.rows.item(0).volume;

    // Volume per exercise: previous session
    const prevVolResult = await executeSql(
      database,
      `SELECT COALESCE(SUM(weight_kg * reps), 0) AS volume
       FROM workout_sets
       WHERE session_id = ? AND exercise_id = ?
         AND (is_warmup IS NULL OR is_warmup = 0)`,
      [previousSessionId, exerciseId],
    );
    const prevVol: number = prevVolResult.rows.item(0).volume;

    let volumeChangePercent: number | null = null;
    if (prevVol > 0) {
      volumeChangePercent = ((curVol - prevVol) / prevVol) * 100;
    }

    // Strength per exercise: max weight (exclude bodyweight / 0 weight)
    const curStrResult = await executeSql(
      database,
      `SELECT MAX(weight_kg) AS best
       FROM workout_sets
       WHERE session_id = ? AND exercise_id = ?
         AND (is_warmup IS NULL OR is_warmup = 0)
         AND weight_kg > 0`,
      [currentSessionId, exerciseId],
    );
    const prevStrResult = await executeSql(
      database,
      `SELECT MAX(weight_kg) AS best
       FROM workout_sets
       WHERE session_id = ? AND exercise_id = ?
         AND (is_warmup IS NULL OR is_warmup = 0)
         AND weight_kg > 0`,
      [previousSessionId, exerciseId],
    );

    const curStr: number | null = curStrResult.rows.item(0).best ?? null;
    const prevStr: number | null = prevStrResult.rows.item(0).best ?? null;

    let strengthChangePercent: number | null = null;
    if (curStr !== null && prevStr !== null && prevStr > 0) {
      strengthChangePercent = ((curStr - prevStr) / prevStr) * 100;
    }

    result.push({
      exerciseId,
      exerciseName,
      volumeChangePercent,
      strengthChangePercent,
    });
  }

  return result;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/db/progress.ts
git commit -m "feat: add getSessionDayExerciseProgress for per-exercise drill-down"
```

---

### Task 6: ProgramSelectorBar Component

**Files:**
- Create: `src/components/ProgramSelectorBar.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/ProgramSelectorBar.tsx`:

```typescript
import React, { useState } from 'react';
import {
  Modal,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ProgramSelectorItem } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold, weightMedium } from '../theme/typography';

interface Props {
  programs: ProgramSelectorItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function ProgramSelectorBar({ programs, selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const selected = programs.find(p => p.id === selectedId);

  if (!selected) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={styles.bar}
        activeOpacity={0.7}
        onPress={() => setOpen(true)}>
        <Text style={styles.name} numberOfLines={1}>{selected.name}</Text>
        <View style={styles.right}>
          <View style={[styles.badge, selected.isArchived && styles.badgeArchived]}>
            <Text style={[styles.badgeText, selected.isArchived && styles.badgeTextArchived]}>
              {selected.isArchived ? 'Archived' : 'Active'}
            </Text>
          </View>
          <Text style={styles.chevron}>{'\u25BE'}</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>Select Program</Text>
            <FlatList
              data={programs}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    item.id === selectedId && styles.dropdownItemActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    onSelect(item.id);
                    setOpen(false);
                  }}>
                  <Text
                    style={[
                      styles.dropdownItemText,
                      item.id === selectedId && styles.dropdownItemTextActive,
                    ]}
                    numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[
                    styles.dropdownBadge,
                    item.isArchived ? styles.dropdownBadgeArchived : styles.dropdownBadgeActive,
                  ]}>
                    {item.isArchived ? 'Archived' : 'Active'}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  name: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    flex: 1,
    marginRight: spacing.sm,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: 'rgba(141,194,138,0.15)',
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeArchived: {
    backgroundColor: 'rgba(142,146,152,0.15)',
  },
  badgeText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: weightMedium,
  },
  badgeTextArchived: {
    color: colors.secondary,
  },
  chevron: {
    color: colors.secondary,
    fontSize: fontSize.base,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  dropdown: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    padding: spacing.base,
    maxHeight: 400,
  },
  dropdownTitle: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: weightBold,
    marginBottom: spacing.md,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.xs,
  },
  dropdownItemActive: {
    backgroundColor: colors.surface,
  },
  dropdownItemText: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: weightMedium,
    flex: 1,
    marginRight: spacing.sm,
  },
  dropdownItemTextActive: {
    color: colors.accent,
    fontWeight: weightSemiBold,
  },
  dropdownBadge: {
    fontSize: fontSize.xs,
    fontWeight: weightMedium,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dropdownBadgeActive: {
    color: colors.accent,
    backgroundColor: 'rgba(141,194,138,0.15)',
  },
  dropdownBadgeArchived: {
    color: colors.secondary,
    backgroundColor: 'rgba(142,146,152,0.15)',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProgramSelectorBar.tsx
git commit -m "feat: add ProgramSelectorBar component with modal dropdown"
```

---

### Task 7: SessionDayCard Component

**Files:**
- Create: `src/components/SessionDayCard.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/SessionDayCard.tsx`:

```typescript
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SessionDayProgress } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { formatRelativeTime } from '../utils/formatRelativeTime';

function formatDelta(
  value: number | null,
  label: string,
): { text: string; color: string } {
  if (value === null) {
    return { text: '\u2014', color: colors.secondary };
  }
  const rounded = Math.round(value);
  if (rounded >= 0) {
    return { text: `+${rounded}%`, color: colors.accent };
  }
  return { text: `\u2212${Math.abs(rounded)}%`, color: colors.danger };
}

interface Props {
  day: SessionDayProgress;
  onPress: () => void;
}

export function SessionDayCard({ day, onPress }: Props) {
  const vol = formatDelta(day.volumeChangePercent, 'vol');
  const str = formatDelta(day.strengthChangePercent, 'str');

  let lastTrainedText: string;
  if (day.sessionCount === 0) {
    lastTrainedText = 'Not started';
  } else if (day.sessionCount === 1) {
    lastTrainedText = '1 session only';
  } else {
    lastTrainedText = day.lastTrainedAt
      ? formatRelativeTime(day.lastTrainedAt)
      : '\u2014';
  }

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={onPress}>
      <Text style={styles.dayName} numberOfLines={2}>{day.dayName}</Text>

      {day.hasPR && (
        <Text style={styles.prFlag}>PR!</Text>
      )}

      <View style={styles.metrics}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Vol</Text>
          <Text style={[styles.metricValue, { color: vol.color }]}>{vol.text}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Str</Text>
          <Text style={[styles.metricValue, { color: str.color }]}>{str.text}</Text>
        </View>
      </View>

      <Text style={styles.lastTrained}>{lastTrainedText}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    width: '48%',
    alignItems: 'center',
    padding: spacing.base,
  },
  dayName: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    textAlign: 'center',
    marginBottom: spacing.sm,
    minHeight: 34,
    lineHeight: 17,
  },
  prFlag: {
    color: colors.prGold,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    marginBottom: 2,
  },
  metrics: {
    width: '100%',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    color: colors.secondary,
    fontSize: fontSize.xs,
  },
  metricValue: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  lastTrained: {
    color: colors.secondary,
    fontSize: fontSize.xs,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SessionDayCard.tsx
git commit -m "feat: add SessionDayCard component with vol/str deltas and color coding"
```

---

### Task 8: Add Sessions Tab to ProgressHubScreen

**Files:**
- Modify: `src/screens/ProgressHubScreen.tsx`

- [ ] **Step 1: Add imports**

Add these imports to the top of `src/screens/ProgressHubScreen.tsx`:

```typescript
import { getSessionDayProgress } from '../db/progress';
import { getProgramsWithSessionData } from '../db/programs';
import { SessionDayProgress as SessionDayProgressType, ProgramSelectorItem } from '../types';
import { ProgramSelectorBar } from '../components/ProgramSelectorBar';
import { SessionDayCard } from '../components/SessionDayCard';
```

- [ ] **Step 2: Refactor ProgressHubScreen to add tab state and Sessions tab content**

Replace the `ProgressHubScreen` function (starting at `export function ProgressHubScreen()`) with:

```typescript
export function ProgressHubScreen() {
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState<'categories' | 'sessions'>('categories');
  const [groups, setGroups] = useState<MuscleGroupProgress[]>([]);

  // Sessions tab state
  const [programs, setPrograms] = useState<ProgramSelectorItem[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [sessionDays, setSessionDays] = useState<SessionDayProgressType[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const data = await getMuscleGroupProgress();
          if (!cancelled) setGroups(data);
        } catch { /* ignore */ }

        try {
          const progs = await getProgramsWithSessionData();
          if (!cancelled) {
            setPrograms(progs);
            if (progs.length > 0 && selectedProgramId === null) {
              setSelectedProgramId(progs[0].id);
            }
          }
        } catch { /* ignore */ }
      })();
      return () => { cancelled = true; };
    }, []),
  );

  // Fetch session day data when selected program changes
  useFocusEffect(
    useCallback(() => {
      if (selectedProgramId === null) return;
      let cancelled = false;
      (async () => {
        try {
          const data = await getSessionDayProgress(selectedProgramId);
          if (!cancelled) setSessionDays(data);
        } catch { /* ignore */ }
      })();
      return () => { cancelled = true; };
    }, [selectedProgramId]),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'categories' && styles.tabActive]}
          activeOpacity={0.7}
          onPress={() => setActiveTab('categories')}>
          <Text style={[styles.tabText, activeTab === 'categories' && styles.tabTextActive]}>
            Categories
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sessions' && styles.tabActive]}
          activeOpacity={0.7}
          onPress={() => setActiveTab('sessions')}>
          <Text style={[styles.tabText, activeTab === 'sessions' && styles.tabTextActive]}>
            Sessions
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        {activeTab === 'categories' ? (
          /* ── Categories Tab (existing) ── */
          groups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Start training to see your progress here.
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {groups.map(group => (
                <MuscleCard
                  key={group.category}
                  group={group}
                  onPress={() =>
                    navigation.navigate('CategoryProgress', {
                      category: group.category,
                    })
                  }
                />
              ))}
            </View>
          )
        ) : (
          /* ── Sessions Tab (new) ── */
          <>
            {programs.length > 0 && (
              <ProgramSelectorBar
                programs={programs}
                selectedId={selectedProgramId}
                onSelect={setSelectedProgramId}
              />
            )}
            {sessionDays.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Complete program workouts to see session progress.
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {sessionDays.map(day => (
                  <SessionDayCard
                    key={day.programDayId}
                    day={day}
                    onPress={() =>
                      navigation.navigate('SessionDayProgress', {
                        programDayId: day.programDayId,
                        dayName: day.dayName,
                      })
                    }
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 3: Add tab bar styles**

Add these styles to the `StyleSheet.create` call in `ProgressHubScreen.tsx`:

```typescript
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.surfaceElevated,
  },
  tabText: {
    color: colors.secondary,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  tabTextActive: {
    color: colors.accent,
  },
```

- [ ] **Step 4: Commit**

```bash
git add src/screens/ProgressHubScreen.tsx
git commit -m "feat: add Categories/Sessions tab bar to ProgressHubScreen"
```

---

### Task 9: Navigation — Add SessionDayProgress Route

**Files:**
- Modify: `src/navigation/TabNavigator.tsx`

- [ ] **Step 1: Add route to `DashboardStackParamList`**

In `src/navigation/TabNavigator.tsx`, add the new route to `DashboardStackParamList`:

```typescript
export type DashboardStackParamList = {
  DashboardHome: undefined;
  ExerciseProgress: { exerciseId: number; exerciseName: string; measurementType?: 'reps' | 'timed' | 'height_reps'; category?: string; viewMode?: 'strength' | 'volume' };
  Settings: undefined;
  CategoryProgress: { category: string; viewMode?: 'strength' | 'volume' };
  Achievements: undefined;
  ProgressHub: undefined;
  ExerciseDetail: { exerciseId: number; exerciseName: string; measurementType?: 'reps' | 'timed' | 'height_reps'; category?: string };
  SessionBreakdown: { sessionId: number; exerciseId: number; exerciseName: string; sessionDate: string };
  SessionDayProgress: { programDayId: number; dayName: string };
};
```

- [ ] **Step 2: Add screen to DashboardStackNavigator**

Import `SessionDayProgressScreen` at the top of `TabNavigator.tsx`:

```typescript
import { SessionDayProgressScreen } from '../screens/SessionDayProgressScreen';
```

Add the screen inside `DashboardStackNavigator`:

```typescript
<DashboardStack.Screen name="SessionDayProgress" component={SessionDayProgressScreen} />
```

(Add it after the `SessionBreakdown` screen line.)

- [ ] **Step 3: Commit**

```bash
git add src/navigation/TabNavigator.tsx
git commit -m "feat: add SessionDayProgress route to dashboard navigation"
```

---

### Task 10: SessionDayProgressScreen (Drill-Down)

**Files:**
- Create: `src/screens/SessionDayProgressScreen.tsx`

- [ ] **Step 1: Create the drill-down screen**

Create `src/screens/SessionDayProgressScreen.tsx`:

```typescript
import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getSessionDayExerciseProgress } from '../db/progress';
import { SessionDayExerciseProgress } from '../types';
import { DashboardStackParamList } from '../navigation/TabNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold, weightMedium } from '../theme/typography';

type ScreenRouteProp = RouteProp<DashboardStackParamList, 'SessionDayProgress'>;
type ScreenNavProp = NativeStackNavigationProp<DashboardStackParamList, 'SessionDayProgress'>;

function formatDelta(value: number | null): { text: string; color: string } {
  if (value === null) {
    return { text: '\u2014', color: colors.secondary };
  }
  const rounded = Math.round(value);
  if (rounded >= 0) {
    return { text: `+${rounded}%`, color: colors.accent };
  }
  return { text: `\u2212${Math.abs(rounded)}%`, color: colors.danger };
}

interface ExerciseRowProps {
  exercise: SessionDayExerciseProgress;
}

function ExerciseRow({ exercise }: ExerciseRowProps) {
  const vol = formatDelta(exercise.volumeChangePercent);
  const str = formatDelta(exercise.strengthChangePercent);

  return (
    <View style={styles.exerciseRow}>
      <Text style={styles.exerciseName} numberOfLines={1}>
        {exercise.exerciseName}
      </Text>
      <View style={styles.deltaRow}>
        <View style={styles.deltaItem}>
          <Text style={styles.deltaLabel}>Vol</Text>
          <View style={[styles.deltaBadge, { backgroundColor: vol.color + '1A' }]}>
            <Text style={[styles.deltaValue, { color: vol.color }]}>{vol.text}</Text>
          </View>
        </View>
        <View style={styles.deltaItem}>
          <Text style={styles.deltaLabel}>Str</Text>
          <View style={[styles.deltaBadge, { backgroundColor: str.color + '1A' }]}>
            <Text style={[styles.deltaValue, { color: str.color }]}>{str.text}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function SessionDayProgressScreen() {
  const navigation = useNavigation<ScreenNavProp>();
  const route = useRoute<ScreenRouteProp>();
  const { programDayId, dayName } = route.params;
  const [exercises, setExercises] = useState<SessionDayExerciseProgress[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const data = await getSessionDayExerciseProgress(programDayId);
          if (!cancelled) setExercises(data);
        } catch (err) {
          console.warn('SessionDayProgress data fetch failed:', err);
        }
      })();
      return () => { cancelled = true; };
    }, [programDayId]),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{dayName}</Text>
        <Text style={styles.exerciseCount}>
          {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
        </Text>
      </View>

      <Text style={styles.subtitle}>vs previous session</Text>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {exercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No exercise data yet.</Text>
          </View>
        ) : (
          exercises.map(exercise => (
            <ExerciseRow key={exercise.exerciseId} exercise={exercise} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  backArrow: {
    color: colors.primary,
    fontSize: fontSize.xl,
  },
  headerTitle: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    flex: 1,
  },
  exerciseCount: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
  },
  subtitle: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  emptyContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.secondary,
    fontSize: fontSize.base,
  },
  exerciseRow: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  exerciseName: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    marginBottom: spacing.sm,
  },
  deltaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  deltaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deltaLabel: {
    color: colors.secondary,
    fontSize: fontSize.xs,
  },
  deltaBadge: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deltaValue: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/SessionDayProgressScreen.tsx
git commit -m "feat: add SessionDayProgressScreen with per-exercise vol/str drill-down"
```

---

### Task 11: Build and Verify

**Files:** None (verification only)

- [ ] **Step 1: Build the release APK**

```bash
cd android && JAVA_HOME="C:/Program Files/Android/Android Studio/jbr" ./gradlew assembleRelease
```

Expected: `BUILD SUCCESSFUL`. If there are TypeScript errors, fix them before proceeding.

- [ ] **Step 2: Install on emulator and verify**

```bash
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" -s emulator-5554 install -r android/app/build/outputs/apk/release/app-release.apk
```

Verify on emulator:
1. Dashboard > Progress — tab bar shows "Categories" and "Sessions"
2. Categories tab — unchanged, existing cards still work
3. Sessions tab — program selector shows current program, day cards display
4. Tap a day card — navigates to drill-down with per-exercise breakdown
5. Program selector dropdown — opens modal, lists programs

- [ ] **Step 3: Deploy to phone after emulator verification**

```bash
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" -s R5CXC1ZXSNW install -r android/app/build/outputs/apk/release/app-release.apk
```
