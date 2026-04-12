# Exercise Swap & Multi-Category Muscle Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a muscle group taxonomy so exercises can belong to multiple categories, and provide a one-tap "Swap" button that suggests alternative exercises targeting the same muscle groups.

**Architecture:** Two new DB tables (`muscle_groups`, `exercise_muscle_groups`) create a many-to-many relationship. The existing `exercises.category` column stays as a cached primary category for fast dashboard queries. A new `SwapSheet` bottom sheet component is shared by both the active workout screen and the program day detail screen.

**Tech Stack:** React Native, react-native-sqlite-storage, TypeScript, Jest

**Spec:** `docs/superpowers/specs/2026-04-12-exercise-swap-multi-category-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/db/muscleGroups.ts` | CRUD + query functions for muscle groups and exercise-muscle-group mappings |
| `src/db/__tests__/muscleGroups.test.ts` | Unit tests for muscle group DB functions |
| `src/components/SwapSheet.tsx` | Bottom sheet showing swap alternatives, shared by workout and program screens |
| `src/components/__tests__/SwapSheet.test.tsx` | Component tests for SwapSheet |
| `src/components/MuscleGroupPicker.tsx` | Two-step picker (parent categories → muscle groups) for AddExerciseModal |
| `src/components/__tests__/MuscleGroupPicker.test.tsx` | Component tests for MuscleGroupPicker |

### Modified Files
| File | Changes |
|------|---------|
| `src/types/index.ts` | Add `MuscleGroup` interface, `ExerciseMuscleGroup` interface, update `ExerciseCategory` to include `'stretching'`, add stretching to `EXERCISE_CATEGORIES` |
| `src/db/schema.ts` | Add `CREATE_MUSCLE_GROUPS_TABLE` and `CREATE_EXERCISE_MUSCLE_GROUPS_TABLE` constants |
| `src/db/migrations.ts` | Add migration version 16 creating tables, seeding muscle groups, mapping all exercises |
| `src/db/exercises.ts` | Update `addExercise` and `updateExercise` to accept muscle group IDs and sync cached category |
| `src/db/dashboard.ts` | Update `getCategorySummaries` to join through muscle groups, exclude stretching |
| `src/db/index.ts` | Export new muscle group functions |
| `src/db/seed.ts` | Add muscle group mappings for preset exercises |
| `src/screens/AddExerciseModal.tsx` | Replace `ExerciseCategoryTabs` with `MuscleGroupPicker` |
| `src/screens/LibraryScreen.tsx` | Update category filtering to use muscle group join query |
| `src/screens/ExercisePickerSheet.tsx` | Same category filtering update |
| `src/screens/WorkoutScreen.tsx` | Add swap icon to `ExerciseCard` header, integrate `SwapSheet` |
| `src/components/ExerciseTargetRow.tsx` | Add swap icon, accept `onSwap` prop |
| `src/screens/DayDetailScreen.tsx` | Integrate `SwapSheet` for program day exercise swapping |
| `src/components/ExerciseCategoryTabs.tsx` | Add stretching to displayed tabs (automatic via `EXERCISE_CATEGORIES`) |
| `src/theme/colors.ts` | Add stretching category color |
| `src/db/__tests__/exercises.test.ts` | Update tests for new `addExercise`/`updateExercise` signatures |

---

## Task 1: Types & Schema Constants

**Files:**
- Modify: `src/types/index.ts:1-18`
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add stretching to ExerciseCategory type and EXERCISE_CATEGORIES array**

In `src/types/index.ts`, update lines 1-18:

```typescript
export type ExerciseCategory =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'conditioning'
  | 'stretching';

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'conditioning',
  'stretching',
];
```

- [ ] **Step 2: Add MuscleGroup and ExerciseMuscleGroup interfaces**

Append after the `Exercise` interface in `src/types/index.ts` (after line 30):

```typescript
export interface MuscleGroup {
  id: number;
  name: string;
  parentCategory: ExerciseCategory;
  sortOrder: number;
}

export interface ExerciseMuscleGroup {
  exerciseId: number;
  muscleGroupId: number;
  isPrimary: boolean;
}
```

- [ ] **Step 3: Add CREATE TABLE constants to schema.ts**

Append to `src/db/schema.ts` after the gamification tables:

```typescript
// ── Muscle Group tables ──────────────────────────────────────────────

export const CREATE_MUSCLE_GROUPS_TABLE = `
  CREATE TABLE IF NOT EXISTS muscle_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_category TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  )
`;

export const CREATE_EXERCISE_MUSCLE_GROUPS_TABLE = `
  CREATE TABLE IF NOT EXISTS exercise_muscle_groups (
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    muscle_group_id INTEGER NOT NULL REFERENCES muscle_groups(id),
    is_primary INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (exercise_id, muscle_group_id)
  )
`;
```

- [ ] **Step 4: Add stretching color to theme**

In `src/theme/colors.ts`, add to `categoryColors`:

```typescript
export const categoryColors: Record<string, string> = {
  chest: '#E8845C',
  back: '#5B9BF0',
  legs: '#B57AE0',
  shoulders: '#4ECDC4',
  arms: '#8DC28A',
  core: '#F0B830',
  conditioning: '#E0697E',
  stretching: '#9B8EC4',
};
```

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/db/schema.ts src/theme/colors.ts
git commit -m "feat: add muscle group types, schema constants, and stretching category"
```

---

## Task 2: Migration 16 — Create Tables, Seed Muscle Groups, Map Exercises

**Files:**
- Modify: `src/db/migrations.ts`
- Test: `src/db/__tests__/muscleGroups.test.ts` (created in Task 3, but migration tested here inline)

- [ ] **Step 1: Add migration version 16**

In `src/db/migrations.ts`, add the following import at the top (with the other schema imports):

```typescript
import {
  CREATE_MUSCLE_GROUPS_TABLE,
  CREATE_EXERCISE_MUSCLE_GROUPS_TABLE,
} from './schema';
```

Then append to the `MIGRATIONS` array (after version 15):

```typescript
  {
    version: 16,
    description: 'Muscle groups: create tables, seed groups, map all exercises',
    up: (tx: Transaction) => {
      tx.executeSql(CREATE_MUSCLE_GROUPS_TABLE);
      tx.executeSql(CREATE_EXERCISE_MUSCLE_GROUPS_TABLE);
      tx.executeSql('CREATE INDEX IF NOT EXISTS idx_emg_exercise ON exercise_muscle_groups(exercise_id)');
      tx.executeSql('CREATE INDEX IF NOT EXISTS idx_emg_muscle_group ON exercise_muscle_groups(muscle_group_id)');

      // Seed muscle groups
      const groups: Array<[string, string, number]> = [
        // chest
        ['Upper Chest', 'chest', 1],
        ['Lower Chest', 'chest', 2],
        ['Chest', 'chest', 3],
        // back
        ['Lats', 'back', 1],
        ['Upper Back', 'back', 2],
        ['Lower Back', 'back', 3],
        ['Traps', 'back', 4],
        // legs
        ['Quads', 'legs', 1],
        ['Hamstrings', 'legs', 2],
        ['Glutes', 'legs', 3],
        ['Calves', 'legs', 4],
        ['Hip Flexors', 'legs', 5],
        // shoulders
        ['Front Delts', 'shoulders', 1],
        ['Side Delts', 'shoulders', 2],
        ['Rear Delts', 'shoulders', 3],
        // arms
        ['Biceps', 'arms', 1],
        ['Triceps', 'arms', 2],
        ['Forearms', 'arms', 3],
        // core
        ['Abs', 'core', 1],
        ['Obliques', 'core', 2],
        ['Lower Back', 'core', 3],
        // conditioning
        ['Cardio', 'conditioning', 1],
        ['Plyometrics', 'conditioning', 2],
        // stretching
        ['Upper Body Flexibility', 'stretching', 1],
        ['Lower Body Flexibility', 'stretching', 2],
        ['Hip Mobility', 'stretching', 3],
      ];

      for (const [name, parentCategory, sortOrder] of groups) {
        tx.executeSql(
          'INSERT INTO muscle_groups (name, parent_category, sort_order) VALUES (?, ?, ?)',
          [name, parentCategory, sortOrder],
        );
      }

      // Map preset exercises to muscle groups.
      // Each entry: [exercise_name, [[muscle_group_name, parent_category, is_primary], ...]]
      // We look up exercise id and muscle_group id by name+parent to handle
      // the "Lower Back" ambiguity (exists under both 'back' and 'core').
      const presetMappings: Array<[string, Array<[string, string, number]>]> = [
        // Chest
        ['Bench Press', [['Chest', 'chest', 1], ['Triceps', 'arms', 0], ['Front Delts', 'shoulders', 0]]],
        ['Incline Bench Press', [['Upper Chest', 'chest', 1], ['Triceps', 'arms', 0], ['Front Delts', 'shoulders', 0]]],
        ['Cable Fly', [['Chest', 'chest', 1]]],
        ['Push-Up', [['Chest', 'chest', 1], ['Triceps', 'arms', 0], ['Front Delts', 'shoulders', 0]]],
        ['Chest Dip', [['Lower Chest', 'chest', 1], ['Triceps', 'arms', 0]]],
        ['Decline Bench Press', [['Lower Chest', 'chest', 1], ['Triceps', 'arms', 0]]],
        // Back
        ['Deadlift', [['Lower Back', 'back', 1], ['Hamstrings', 'legs', 0], ['Glutes', 'legs', 0], ['Traps', 'back', 0]]],
        ['Pull-Up', [['Lats', 'back', 1], ['Biceps', 'arms', 0]]],
        ['Barbell Row', [['Upper Back', 'back', 1], ['Lats', 'back', 0], ['Biceps', 'arms', 0]]],
        ['Lat Pulldown', [['Lats', 'back', 1], ['Biceps', 'arms', 0]]],
        ['Cable Row', [['Upper Back', 'back', 1], ['Lats', 'back', 0]]],
        ['Face Pull', [['Rear Delts', 'shoulders', 1], ['Upper Back', 'back', 0]]],
        // Legs
        ['Squat', [['Quads', 'legs', 1], ['Glutes', 'legs', 0]]],
        ['Romanian Deadlift', [['Hamstrings', 'legs', 1], ['Glutes', 'legs', 0], ['Lower Back', 'back', 0]]],
        ['Leg Press', [['Quads', 'legs', 1], ['Glutes', 'legs', 0]]],
        ['Leg Curl', [['Hamstrings', 'legs', 1]]],
        ['Leg Extension', [['Quads', 'legs', 1]]],
        ['Calf Raise', [['Calves', 'legs', 1]]],
        // Shoulders
        ['Overhead Press', [['Front Delts', 'shoulders', 1], ['Triceps', 'arms', 0]]],
        ['Lateral Raise', [['Side Delts', 'shoulders', 1]]],
        ['Front Raise', [['Front Delts', 'shoulders', 1]]],
        ['Arnold Press', [['Front Delts', 'shoulders', 1], ['Side Delts', 'shoulders', 0]]],
        ['Rear Delt Fly', [['Rear Delts', 'shoulders', 1]]],
        ['Shrug', [['Traps', 'back', 1]]],
        // Arms
        ['Bicep Curl', [['Biceps', 'arms', 1]]],
        ['Hammer Curl', [['Biceps', 'arms', 1], ['Forearms', 'arms', 0]]],
        ['Tricep Pushdown', [['Triceps', 'arms', 1]]],
        ['Skull Crusher', [['Triceps', 'arms', 1]]],
        ['Preacher Curl', [['Biceps', 'arms', 1]]],
        ['Dip', [['Triceps', 'arms', 1], ['Lower Chest', 'chest', 0]]],
        // Core
        ['Plank', [['Abs', 'core', 1]]],
        ['Crunch', [['Abs', 'core', 1]]],
        ['Hanging Leg Raise', [['Abs', 'core', 1], ['Hip Flexors', 'legs', 0]]],
        ['Cable Crunch', [['Abs', 'core', 1]]],
        ['Ab Wheel', [['Abs', 'core', 1]]],
        ['Russian Twist', [['Obliques', 'core', 1]]],
        // Conditioning
        ['Burpees', [['Cardio', 'conditioning', 1]]],
        ['Rowing', [['Cardio', 'conditioning', 1]]],
        ['Jump Rope', [['Cardio', 'conditioning', 1]]],
        ['Box Jumps', [['Plyometrics', 'conditioning', 1]]],
        ['Battle Ropes', [['Cardio', 'conditioning', 1]]],
        ['Mountain Climbers', [['Cardio', 'conditioning', 1], ['Abs', 'core', 0]]],
      ];

      for (const [exerciseName, muscles] of presetMappings) {
        for (const [mgName, mgParent, isPrimary] of muscles) {
          tx.executeSql(
            `INSERT OR IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary)
             SELECT e.id, mg.id, ?
             FROM exercises e, muscle_groups mg
             WHERE e.name = ? AND mg.name = ? AND mg.parent_category = ?`,
            [isPrimary, exerciseName, mgName, mgParent],
          );
        }
      }

      // Map custom exercises that aren't in the preset list.
      // Falls back to a default muscle group per category.
      const defaultMuscleGroupPerCategory: Array<[string, string, string]> = [
        ['chest', 'Chest', 'chest'],
        ['back', 'Lats', 'back'],
        ['legs', 'Quads', 'legs'],
        ['shoulders', 'Front Delts', 'shoulders'],
        ['arms', 'Biceps', 'arms'],
        ['core', 'Abs', 'core'],
        ['conditioning', 'Cardio', 'conditioning'],
      ];

      for (const [category, mgName, mgParent] of defaultMuscleGroupPerCategory) {
        tx.executeSql(
          `INSERT OR IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary)
           SELECT e.id, mg.id, 1
           FROM exercises e, muscle_groups mg
           WHERE e.category = ? AND mg.name = ? AND mg.parent_category = ?
             AND e.id NOT IN (SELECT exercise_id FROM exercise_muscle_groups)`,
          [category, mgName, mgParent],
        );
      }
    },
  },
```

- [ ] **Step 2: Verify the migration compiles**

Run: `npx tsc --noEmit src/db/migrations.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/db/migrations.ts
git commit -m "feat: add migration 16 — muscle groups tables, seed data, exercise mappings"
```

---

## Task 3: Muscle Group DB Functions

**Files:**
- Create: `src/db/muscleGroups.ts`
- Create: `src/db/__tests__/muscleGroups.test.ts`
- Modify: `src/db/index.ts`

- [ ] **Step 1: Write the tests for muscle group DB functions**

Create `src/db/__tests__/muscleGroups.test.ts`:

```typescript
jest.mock('../database');

import { executeSql } from '../database';
import { mockResultSet } from '@test-utils/dbMock';
import {
  getAllMuscleGroups,
  getMuscleGroupsByCategory,
  getExerciseMuscleGroups,
  setExerciseMuscleGroups,
  getExercisesByMuscleGroups,
} from '../muscleGroups';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;
const mockDb = {};
const dbModule = require('../database');
Object.defineProperty(dbModule, 'db', {
  value: Promise.resolve(mockDb),
  writable: true,
});

beforeEach(() => jest.clearAllMocks());

describe('getAllMuscleGroups', () => {
  it('returns all muscle groups ordered by parent_category and sort_order', async () => {
    const row = { id: 1, name: 'Quads', parent_category: 'legs', sort_order: 1 };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([row]));

    const result = await getAllMuscleGroups();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 1, name: 'Quads', parentCategory: 'legs', sortOrder: 1 });
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('ORDER BY parent_category, sort_order'),
    );
  });
});

describe('getMuscleGroupsByCategory', () => {
  it('returns muscle groups filtered by parent_category', async () => {
    const row = { id: 5, name: 'Biceps', parent_category: 'arms', sort_order: 1 };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([row]));

    const result = await getMuscleGroupsByCategory('arms');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Biceps');
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('parent_category = ?'),
      ['arms'],
    );
  });
});

describe('getExerciseMuscleGroups', () => {
  it('returns muscle group mappings for an exercise', async () => {
    const row = { exercise_id: 1, muscle_group_id: 3, is_primary: 1, name: 'Chest', parent_category: 'chest', sort_order: 3 };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([row]));

    const result = await getExerciseMuscleGroups(1);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      muscleGroupId: 3,
      name: 'Chest',
      parentCategory: 'chest',
      isPrimary: true,
    });
  });
});

describe('getExercisesByMuscleGroups', () => {
  it('returns exercises sorted by match count descending', async () => {
    const row1 = { id: 2, name: 'Incline Bench', category: 'chest', default_rest_seconds: 90, is_custom: 0, measurement_type: 'reps', created_at: '2026-01-01', match_count: 3 };
    const row2 = { id: 3, name: 'Cable Fly', category: 'chest', default_rest_seconds: 90, is_custom: 0, measurement_type: 'reps', created_at: '2026-01-01', match_count: 1 };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([row1, row2]));

    const result = await getExercisesByMuscleGroups([1, 2, 3], [10]);

    expect(result).toHaveLength(2);
    expect(result[0].exercise.name).toBe('Incline Bench');
    expect(result[0].matchCount).toBe(3);
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('GROUP BY'),
      expect.any(Array),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/db/__tests__/muscleGroups.test.ts --no-coverage`
Expected: FAIL — module `../muscleGroups` not found

- [ ] **Step 3: Implement muscle group DB functions**

Create `src/db/muscleGroups.ts`:

```typescript
import { db, executeSql, runTransaction } from './database';
import { Exercise, ExerciseCategory, MuscleGroup } from '../types';
import { rowToExercise } from './exercises';

interface ExerciseMuscleGroupDetail {
  muscleGroupId: number;
  name: string;
  parentCategory: ExerciseCategory;
  isPrimary: boolean;
}

function rowToMuscleGroup(row: {
  id: number;
  name: string;
  parent_category: string;
  sort_order: number;
}): MuscleGroup {
  return {
    id: row.id,
    name: row.name,
    parentCategory: row.parent_category as ExerciseCategory,
    sortOrder: row.sort_order,
  };
}

/** Return all muscle groups ordered by parent_category then sort_order. */
export async function getAllMuscleGroups(): Promise<MuscleGroup[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM muscle_groups ORDER BY parent_category, sort_order',
  );
  const groups: MuscleGroup[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    groups.push(rowToMuscleGroup(result.rows.item(i)));
  }
  return groups;
}

/** Return muscle groups for a specific parent category. */
export async function getMuscleGroupsByCategory(
  category: ExerciseCategory,
): Promise<MuscleGroup[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM muscle_groups WHERE parent_category = ? ORDER BY sort_order',
    [category],
  );
  const groups: MuscleGroup[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    groups.push(rowToMuscleGroup(result.rows.item(i)));
  }
  return groups;
}

/** Return the muscle groups associated with an exercise, with names and categories. */
export async function getExerciseMuscleGroups(
  exerciseId: number,
): Promise<ExerciseMuscleGroupDetail[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT emg.exercise_id, emg.muscle_group_id, emg.is_primary,
            mg.name, mg.parent_category, mg.sort_order
     FROM exercise_muscle_groups emg
     INNER JOIN muscle_groups mg ON mg.id = emg.muscle_group_id
     WHERE emg.exercise_id = ?
     ORDER BY emg.is_primary DESC, mg.sort_order`,
    [exerciseId],
  );
  const details: ExerciseMuscleGroupDetail[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    details.push({
      muscleGroupId: row.muscle_group_id,
      name: row.name,
      parentCategory: row.parent_category as ExerciseCategory,
      isPrimary: row.is_primary === 1,
    });
  }
  return details;
}

/**
 * Replace all muscle group mappings for an exercise and sync the cached category.
 * @param exerciseId The exercise to update
 * @param mappings Array of { muscleGroupId, isPrimary } — exactly one should be primary
 */
export async function setExerciseMuscleGroups(
  exerciseId: number,
  mappings: Array<{ muscleGroupId: number; isPrimary: boolean }>,
): Promise<void> {
  const database = await db;
  await runTransaction(database, tx => {
    // Clear existing mappings
    tx.executeSql('DELETE FROM exercise_muscle_groups WHERE exercise_id = ?', [exerciseId]);

    // Insert new mappings
    for (const { muscleGroupId, isPrimary } of mappings) {
      tx.executeSql(
        'INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary) VALUES (?, ?, ?)',
        [exerciseId, muscleGroupId, isPrimary ? 1 : 0],
      );
    }
  });

  // Sync cached category from primary muscle group
  const primary = mappings.find(m => m.isPrimary);
  if (primary) {
    await executeSql(
      database,
      `UPDATE exercises SET category = (
         SELECT mg.parent_category FROM muscle_groups mg WHERE mg.id = ?
       ) WHERE id = ?`,
      [primary.muscleGroupId, exerciseId],
    );
  }
}

/**
 * Find exercises matching the given muscle group IDs, excluding specific exercise IDs.
 * Returns exercises ranked by match count (exact matches first, then partial).
 */
export async function getExercisesByMuscleGroups(
  muscleGroupIds: number[],
  excludeExerciseIds: number[],
): Promise<Array<{ exercise: Exercise; matchCount: number }>> {
  const database = await db;
  const mgPlaceholders = muscleGroupIds.map(() => '?').join(',');
  const exPlaceholders = excludeExerciseIds.length > 0
    ? excludeExerciseIds.map(() => '?').join(',')
    : null;

  const sql = `
    SELECT e.*, COUNT(emg.muscle_group_id) as match_count
    FROM exercises e
    INNER JOIN exercise_muscle_groups emg ON emg.exercise_id = e.id
    WHERE emg.muscle_group_id IN (${mgPlaceholders})
    ${exPlaceholders ? `AND e.id NOT IN (${exPlaceholders})` : ''}
    GROUP BY e.id
    ORDER BY match_count DESC, e.name ASC
  `;

  const params = [
    ...muscleGroupIds,
    ...excludeExerciseIds,
  ];

  const result = await executeSql(database, sql, params);
  const matches: Array<{ exercise: Exercise; matchCount: number }> = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    matches.push({
      exercise: rowToExercise(row),
      matchCount: row.match_count,
    });
  }
  return matches;
}

/**
 * Get exercises by parent category using muscle group join.
 * Returns exercises that have ANY muscle group in the given parent category.
 */
export async function getExercisesByCategoryViaGroups(
  category: ExerciseCategory,
): Promise<Exercise[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT DISTINCT e.*
     FROM exercises e
     INNER JOIN exercise_muscle_groups emg ON emg.exercise_id = e.id
     INNER JOIN muscle_groups mg ON mg.id = emg.muscle_group_id
     WHERE mg.parent_category = ?
     ORDER BY e.name ASC`,
    [category],
  );
  const exercises: Exercise[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    exercises.push(rowToExercise(result.rows.item(i)));
  }
  return exercises;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/db/__tests__/muscleGroups.test.ts --no-coverage`
Expected: All 4 test suites PASS

- [ ] **Step 5: Export new functions from index.ts**

In `src/db/index.ts`, add after the exercises export block:

```typescript
export {
  getAllMuscleGroups,
  getMuscleGroupsByCategory,
  getExerciseMuscleGroups,
  setExerciseMuscleGroups,
  getExercisesByMuscleGroups,
  getExercisesByCategoryViaGroups,
} from './muscleGroups';
```

- [ ] **Step 6: Commit**

```bash
git add src/db/muscleGroups.ts src/db/__tests__/muscleGroups.test.ts src/db/index.ts
git commit -m "feat: add muscle group DB functions with tests"
```

---

## Task 4: Update exercises.ts — Sync Cached Category on Add/Update

**Files:**
- Modify: `src/db/exercises.ts`
- Modify: `src/db/__tests__/exercises.test.ts`

- [ ] **Step 1: Update addExercise to accept muscle group IDs**

In `src/db/exercises.ts`, update the `addExercise` function signature and body. The function now accepts an optional `muscleGroupMappings` parameter. When provided, it sets the muscle groups and derives the category from the primary muscle group:

```typescript
import { db, executeSql, runTransaction } from './database';
import { Exercise, ExerciseCategory, ExerciseMeasurementType } from '../types';
import { setExerciseMuscleGroups } from './muscleGroups';

// ... rowToExercise stays the same ...

/**
 * Insert a new custom exercise and return the inserted row.
 * When muscleGroupMappings are provided, sets muscle groups and derives category.
 */
export async function addExercise(
  name: string,
  category: ExerciseCategory,
  defaultRestSeconds: number = 90,
  measurementType: ExerciseMeasurementType = 'reps',
  muscleGroupMappings?: Array<{ muscleGroupId: number; isPrimary: boolean }>,
): Promise<Exercise> {
  const database = await db;
  const createdAt = new Date().toISOString();
  const result = await executeSql(
    database,
    'INSERT INTO exercises (name, category, default_rest_seconds, is_custom, measurement_type, created_at) VALUES (?, ?, ?, 1, ?, ?)',
    [name, category, defaultRestSeconds, measurementType, createdAt],
  );
  const insertedId = result.insertId;

  if (muscleGroupMappings && muscleGroupMappings.length > 0) {
    await setExerciseMuscleGroups(insertedId, muscleGroupMappings);
  }

  const row = await executeSql(database, 'SELECT * FROM exercises WHERE id = ?', [insertedId]);
  return rowToExercise(row.rows.item(0));
}
```

- [ ] **Step 2: Update updateExercise to accept muscle group IDs**

```typescript
/** Update an exercise's name, measurement type, and optionally muscle groups. */
export async function updateExercise(
  id: number,
  name: string,
  category: ExerciseCategory,
  measurementType: ExerciseMeasurementType,
  muscleGroupMappings?: Array<{ muscleGroupId: number; isPrimary: boolean }>,
): Promise<Exercise> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE exercises SET name = ?, category = ?, measurement_type = ? WHERE id = ?',
    [name, category, measurementType, id],
  );

  if (muscleGroupMappings && muscleGroupMappings.length > 0) {
    await setExerciseMuscleGroups(id, muscleGroupMappings);
  }

  const row = await executeSql(database, 'SELECT * FROM exercises WHERE id = ?', [id]);
  return rowToExercise(row.rows.item(0));
}
```

- [ ] **Step 3: Update existing tests — signatures are backward-compatible so tests should still pass**

Run: `npx jest src/db/__tests__/exercises.test.ts --no-coverage`
Expected: PASS — all existing tests pass since the new parameter is optional

- [ ] **Step 4: Commit**

```bash
git add src/db/exercises.ts src/db/__tests__/exercises.test.ts
git commit -m "feat: update addExercise/updateExercise to accept muscle group mappings"
```

---

## Task 5: Update Dashboard Queries

**Files:**
- Modify: `src/db/dashboard.ts`

- [ ] **Step 1: Update getCategorySummaries to use muscle group join**

In `src/db/dashboard.ts`, replace the `getCategorySummaries` function (lines 463-556). The key change is joining through `exercise_muscle_groups` → `muscle_groups` so an exercise's sets contribute to every parent category it belongs to, and filtering out `stretching`:

```typescript
export async function getCategorySummaries(): Promise<CategorySummary[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT e.id AS exercise_id, mg.parent_category AS category, e.measurement_type,
            ws.session_id, wss.completed_at AS completed_at,
            ws.weight_kg, ws.reps
     FROM workout_sets ws
     INNER JOIN exercises e ON e.id = ws.exercise_id
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     INNER JOIN exercise_muscle_groups emg ON emg.exercise_id = e.id
     INNER JOIN muscle_groups mg ON mg.id = emg.muscle_group_id
     WHERE wss.completed_at IS NOT NULL
       AND mg.parent_category != 'stretching'
       AND ws.id = (
         SELECT ws2.id FROM workout_sets ws2
         WHERE ws2.session_id = ws.session_id
           AND ws2.exercise_id = ws.exercise_id
         ORDER BY ws2.weight_kg DESC, ws2.reps DESC
         LIMIT 1
       )
     GROUP BY e.id, ws.session_id, mg.parent_category
     ORDER BY wss.completed_at ASC`,
  );

  // Group rows by category (now derived from muscle groups)
  const categoryMap = new Map<string, {
    exerciseIds: Set<number>;
    sessions: Map<number, { completedAt: string; bestValue: number }>;
    measurementTypes: Map<string, number>;
  }>();

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const category: string = row.category;
    const measurementType: string = row.measurement_type ?? 'reps';
    const bestValue = measurementType === 'timed' ? row.reps : row.weight_kg;

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        exerciseIds: new Set(),
        sessions: new Map(),
        measurementTypes: new Map(),
      });
    }

    const cat = categoryMap.get(category)!;
    cat.exerciseIds.add(row.exercise_id);

    cat.measurementTypes.set(
      measurementType,
      (cat.measurementTypes.get(measurementType) ?? 0) + 1,
    );

    const sessionId: number = row.session_id;
    const existing = cat.sessions.get(sessionId);
    if (!existing || bestValue > existing.bestValue) {
      cat.sessions.set(sessionId, {
        completedAt: row.completed_at,
        bestValue,
      });
    }
  }

  const summaries: CategorySummary[] = [];
  for (const [category, data] of categoryMap) {
    const sparklinePoints: number[] = [];
    let lastTrainedAt = '';
    for (const session of data.sessions.values()) {
      sparklinePoints.push(session.bestValue);
      lastTrainedAt = session.completedAt;
    }

    let dominantType: 'reps' | 'timed' = 'reps';
    let maxCount = 0;
    for (const [type, count] of data.measurementTypes) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type as 'reps' | 'timed';
      }
    }

    summaries.push({
      category: category as ExerciseCategory,
      exerciseCount: data.exerciseIds.size,
      sparklinePoints,
      lastTrainedAt,
      measurementType: dominantType,
    });
  }

  return summaries;
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/db/dashboard.ts
git commit -m "feat: update getCategorySummaries to use muscle group join, exclude stretching"
```

---

## Task 6: Update Library & Picker Category Filtering

**Files:**
- Modify: `src/screens/LibraryScreen.tsx`
- Modify: `src/screens/ExercisePickerSheet.tsx`

- [ ] **Step 1: Update LibraryScreen to use muscle group-based category filtering**

In `src/screens/LibraryScreen.tsx`, change the import and the `loadByCategory` function to use the new query:

Replace the import:
```typescript
// Old:
import { getExercisesByCategory, deleteExercise, searchExercises } from '../db/exercises';
// New:
import { deleteExercise, searchExercises } from '../db/exercises';
import { getExercisesByCategoryViaGroups } from '../db/muscleGroups';
```

Replace the `loadByCategory` call (find the useEffect or callback that calls `getExercisesByCategory` and replace it):

```typescript
// Old:
const exercises = await getExercisesByCategory(selectedCategory);
// New:
const exercises = await getExercisesByCategoryViaGroups(selectedCategory);
```

- [ ] **Step 2: Update ExercisePickerSheet the same way**

In `src/screens/ExercisePickerSheet.tsx`, apply the same import and call change:

Replace import:
```typescript
// Old:
import { getExercisesByCategory, searchExercises } from '../db/exercises';
// New:
import { searchExercises } from '../db/exercises';
import { getExercisesByCategoryViaGroups } from '../db/muscleGroups';
```

Replace query call:
```typescript
// Old:
const exercises = await getExercisesByCategory(selectedCategory);
// New:
const exercises = await getExercisesByCategoryViaGroups(selectedCategory);
```

- [ ] **Step 3: Verify the app compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/screens/LibraryScreen.tsx src/screens/ExercisePickerSheet.tsx
git commit -m "feat: library and picker now filter exercises via muscle group join"
```

---

## Task 7: MuscleGroupPicker Component

**Files:**
- Create: `src/components/MuscleGroupPicker.tsx`
- Create: `src/components/__tests__/MuscleGroupPicker.test.tsx`

- [ ] **Step 1: Write failing tests for MuscleGroupPicker**

Create `src/components/__tests__/MuscleGroupPicker.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MuscleGroupPicker } from '../MuscleGroupPicker';
import { MuscleGroup, ExerciseCategory } from '../../types';

const mockGroups: MuscleGroup[] = [
  { id: 1, name: 'Upper Chest', parentCategory: 'chest', sortOrder: 1 },
  { id: 2, name: 'Lower Chest', parentCategory: 'chest', sortOrder: 2 },
  { id: 3, name: 'Biceps', parentCategory: 'arms', sortOrder: 1 },
  { id: 4, name: 'Triceps', parentCategory: 'arms', sortOrder: 2 },
];

jest.mock('../../db/muscleGroups', () => ({
  getAllMuscleGroups: jest.fn().mockResolvedValue(mockGroups),
}));

describe('MuscleGroupPicker', () => {
  const onChangeMock = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders parent category chips', async () => {
    const { getByText } = render(
      <MuscleGroupPicker selected={[]} onChange={onChangeMock} />,
    );
    await waitFor(() => expect(getByText('Chest')).toBeTruthy());
    expect(getByText('Arms')).toBeTruthy();
  });

  it('shows muscle groups when a parent category is tapped', async () => {
    const { getByText } = render(
      <MuscleGroupPicker selected={[]} onChange={onChangeMock} />,
    );
    await waitFor(() => expect(getByText('Chest')).toBeTruthy());
    fireEvent.press(getByText('Chest'));
    await waitFor(() => expect(getByText('Upper Chest')).toBeTruthy());
    expect(getByText('Lower Chest')).toBeTruthy();
  });

  it('calls onChange when a muscle group is selected', async () => {
    const { getByText } = render(
      <MuscleGroupPicker selected={[]} onChange={onChangeMock} />,
    );
    await waitFor(() => expect(getByText('Chest')).toBeTruthy());
    fireEvent.press(getByText('Chest'));
    await waitFor(() => expect(getByText('Upper Chest')).toBeTruthy());
    fireEvent.press(getByText('Upper Chest'));
    expect(onChangeMock).toHaveBeenCalledWith([{ muscleGroupId: 1, isPrimary: true }]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/components/__tests__/MuscleGroupPicker.test.tsx --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement MuscleGroupPicker**

Create `src/components/MuscleGroupPicker.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { ExerciseCategory, EXERCISE_CATEGORIES, MuscleGroup } from '../types';
import { getAllMuscleGroups } from '../db/muscleGroups';
import { getCategoryColor } from '../theme/colors';

interface MuscleGroupMapping {
  muscleGroupId: number;
  isPrimary: boolean;
}

interface MuscleGroupPickerProps {
  selected: MuscleGroupMapping[];
  onChange: (mappings: MuscleGroupMapping[]) => void;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function MuscleGroupPicker({ selected, onChange }: MuscleGroupPickerProps) {
  const [allGroups, setAllGroups] = useState<MuscleGroup[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<ExerciseCategory>>(new Set());

  useEffect(() => {
    getAllMuscleGroups().then(setAllGroups);
  }, []);

  const selectedIds = new Set(selected.map(s => s.muscleGroupId));
  const primaryId = selected.find(s => s.isPrimary)?.muscleGroupId;

  // Determine which parent categories have selected muscle groups
  const activeCategorySet = new Set(
    selected
      .map(s => allGroups.find(g => g.id === s.muscleGroupId)?.parentCategory)
      .filter(Boolean) as ExerciseCategory[],
  );

  const toggleCategory = (category: ExerciseCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleMuscleGroup = (groupId: number) => {
    if (selectedIds.has(groupId)) {
      // Deselect
      const next = selected.filter(s => s.muscleGroupId !== groupId);
      // If we removed the primary, promote the first remaining
      if (primaryId === groupId && next.length > 0) {
        next[0] = { ...next[0], isPrimary: true };
      }
      onChange(next);
    } else {
      // Select — first selection is automatically primary
      const isPrimary = selected.length === 0;
      onChange([...selected, { muscleGroupId: groupId, isPrimary }]);
    }
  };

  const setPrimary = (groupId: number) => {
    onChange(
      selected.map(s => ({ ...s, isPrimary: s.muscleGroupId === groupId })),
    );
  };

  const groupsByCategory = new Map<ExerciseCategory, MuscleGroup[]>();
  for (const group of allGroups) {
    const list = groupsByCategory.get(group.parentCategory) ?? [];
    list.push(group);
    groupsByCategory.set(group.parentCategory, list);
  }

  return (
    <View>
      {/* Step 1: Parent category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}>
        {EXERCISE_CATEGORIES.map(category => {
          const isExpanded = expandedCategories.has(category);
          const hasSelected = activeCategorySet.has(category);
          return (
            <TouchableOpacity
              key={category}
              onPress={() => toggleCategory(category)}
              style={[
                styles.categoryChip,
                isExpanded ? styles.categoryChipExpanded : hasSelected ? styles.categoryChipActive : styles.categoryChipInactive,
              ]}>
              <Text
                style={[
                  styles.categoryChipText,
                  (isExpanded || hasSelected) ? styles.categoryChipTextActive : styles.categoryChipTextInactive,
                ]}>
                {capitalize(category)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Step 2: Muscle groups for expanded categories */}
      {EXERCISE_CATEGORIES.filter(c => expandedCategories.has(c)).map(category => {
        const groups = groupsByCategory.get(category) ?? [];
        return (
          <View key={category} style={styles.groupSection}>
            <Text style={styles.groupSectionTitle}>{capitalize(category)}</Text>
            <View style={styles.groupChipRow}>
              {groups.map(group => {
                const isSelected = selectedIds.has(group.id);
                const isPrimaryGroup = primaryId === group.id;
                return (
                  <TouchableOpacity
                    key={group.id}
                    onPress={() => toggleMuscleGroup(group.id)}
                    onLongPress={isSelected ? () => setPrimary(group.id) : undefined}
                    style={[
                      styles.groupChip,
                      isSelected ? styles.groupChipSelected : styles.groupChipUnselected,
                    ]}>
                    {isPrimaryGroup && <Text style={styles.starIcon}>{'\u2605'} </Text>}
                    <Text
                      style={[
                        styles.groupChipText,
                        isSelected ? styles.groupChipTextSelected : styles.groupChipTextUnselected,
                      ]}>
                      {group.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  categoryRow: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
  },
  categoryChipExpanded: {
    backgroundColor: colors.accent,
  },
  categoryChipActive: {
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  categoryChipInactive: {
    backgroundColor: '#33373D',
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
  },
  categoryChipTextActive: {
    color: colors.onAccent,
  },
  categoryChipTextInactive: {
    color: colors.secondary,
  },
  groupSection: {
    marginTop: spacing.md,
  },
  groupSectionTitle: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    fontWeight: weightSemiBold,
    marginBottom: spacing.xs,
  },
  groupChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 16,
  },
  groupChipSelected: {
    backgroundColor: colors.accent,
  },
  groupChipUnselected: {
    backgroundColor: colors.surfaceElevated,
  },
  groupChipText: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  groupChipTextSelected: {
    color: colors.onAccent,
  },
  groupChipTextUnselected: {
    color: colors.secondary,
  },
  starIcon: {
    fontSize: fontSize.xs,
    color: colors.onAccent,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/components/__tests__/MuscleGroupPicker.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/MuscleGroupPicker.tsx src/components/__tests__/MuscleGroupPicker.test.tsx
git commit -m "feat: add MuscleGroupPicker two-step component with tests"
```

---

## Task 8: Update AddExerciseModal to Use MuscleGroupPicker

**Files:**
- Modify: `src/screens/AddExerciseModal.tsx`

- [ ] **Step 1: Replace category dropdown with MuscleGroupPicker**

Update imports in `src/screens/AddExerciseModal.tsx`:

```typescript
// Remove:
import { ExerciseCategoryTabs } from '../components/ExerciseCategoryTabs';
// Add:
import { MuscleGroupPicker } from '../components/MuscleGroupPicker';
import { getExerciseMuscleGroups } from '../db/muscleGroups';
```

Replace the `selectedCategory` state and add muscle group state:

```typescript
const [muscleGroupMappings, setMuscleGroupMappings] = useState<
  Array<{ muscleGroupId: number; isPrimary: boolean }>
>([]);
```

Update the pre-fill effect to load existing muscle groups in edit mode:

```typescript
React.useEffect(() => {
  if (editExercise && visible) {
    setName(editExercise.name);
    setMeasurementType(editExercise.measurementType);
    // Load existing muscle groups for edit mode
    getExerciseMuscleGroups(editExercise.id).then(groups => {
      setMuscleGroupMappings(
        groups.map(g => ({ muscleGroupId: g.muscleGroupId, isPrimary: g.isPrimary })),
      );
    });
  }
}, [editExercise, visible]);
```

Update the disabled check:

```typescript
const isDisabled = name.trim() === '' || muscleGroupMappings.length === 0 || measurementType === null || isSubmitting;
```

Update handleClose to reset muscle groups:

```typescript
const handleClose = () => {
  setName('');
  setMuscleGroupMappings([]);
  setMeasurementType(null);
  setError(null);
  setIsSubmitting(false);
  onClose();
};
```

Update handleSubmit to pass muscle groups. Derive category from the primary muscle group's parent:

```typescript
const handleSubmit = async () => {
  if (isDisabled || muscleGroupMappings.length === 0 || !measurementType) {
    return;
  }
  setIsSubmitting(true);
  setError(null);
  try {
    // Category will be synced by setExerciseMuscleGroups, but we need it for the initial insert.
    // Use 'chest' as placeholder — setExerciseMuscleGroups will overwrite it.
    const placeholderCategory = 'chest' as ExerciseCategory;
    if (isEditMode && editExercise) {
      const updated = await updateExercise(
        editExercise.id, name.trim(), placeholderCategory, measurementType, muscleGroupMappings,
      );
      onAdded(updated);
    } else {
      const exercise = await addExercise(
        name.trim(), placeholderCategory, 90, measurementType, muscleGroupMappings,
      );
      onAdded(exercise);
    }
    handleClose();
  } catch (err) {
    const action = isEditMode ? 'update' : 'add';
    setError(err instanceof Error ? err.message : `Failed to ${action} exercise. Please try again.`);
    setIsSubmitting(false);
  }
};
```

Replace the `ExerciseCategoryTabs` JSX with `MuscleGroupPicker`:

```tsx
<Text style={[styles.label, styles.categoryLabel]}>Muscle Groups</Text>
<MuscleGroupPicker
  selected={muscleGroupMappings}
  onChange={setMuscleGroupMappings}
/>
```

- [ ] **Step 2: Verify the app compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/screens/AddExerciseModal.tsx
git commit -m "feat: replace category dropdown with MuscleGroupPicker in AddExerciseModal"
```

---

## Task 9: SwapSheet Component

**Files:**
- Create: `src/components/SwapSheet.tsx`
- Create: `src/components/__tests__/SwapSheet.test.tsx`

- [ ] **Step 1: Write failing tests for SwapSheet**

Create `src/components/__tests__/SwapSheet.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SwapSheet } from '../SwapSheet';
import { Exercise } from '../../types';

const mockExercise: Exercise = {
  id: 1,
  name: 'Bench Press',
  category: 'chest',
  defaultRestSeconds: 90,
  isCustom: false,
  measurementType: 'reps',
  createdAt: '2026-01-01',
};

const mockAlternatives = [
  { exercise: { ...mockExercise, id: 2, name: 'Incline Bench' }, matchCount: 3 },
  { exercise: { ...mockExercise, id: 3, name: 'Cable Fly' }, matchCount: 1 },
];

const mockMuscleGroups = [
  { muscleGroupId: 1, name: 'Chest', parentCategory: 'chest' as const, isPrimary: true },
  { muscleGroupId: 5, name: 'Triceps', parentCategory: 'arms' as const, isPrimary: false },
  { muscleGroupId: 6, name: 'Front Delts', parentCategory: 'shoulders' as const, isPrimary: false },
];

jest.mock('../../db/muscleGroups', () => ({
  getExerciseMuscleGroups: jest.fn().mockResolvedValue(mockMuscleGroups),
  getExercisesByMuscleGroups: jest.fn().mockResolvedValue(mockAlternatives),
}));

describe('SwapSheet', () => {
  const onSelect = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders the exercise name in the header', async () => {
    const { getByText } = render(
      <SwapSheet
        visible
        exercise={mockExercise}
        excludeExerciseIds={[1]}
        onSelect={onSelect}
        onClose={onClose}
      />,
    );
    await waitFor(() => expect(getByText('Swap Bench Press')).toBeTruthy());
  });

  it('shows exact and partial match sections', async () => {
    const { getByText } = render(
      <SwapSheet
        visible
        exercise={mockExercise}
        excludeExerciseIds={[1]}
        onSelect={onSelect}
        onClose={onClose}
      />,
    );
    await waitFor(() => expect(getByText('Incline Bench')).toBeTruthy());
    expect(getByText('Cable Fly')).toBeTruthy();
  });

  it('calls onSelect when an alternative is tapped', async () => {
    const { getByText } = render(
      <SwapSheet
        visible
        exercise={mockExercise}
        excludeExerciseIds={[1]}
        onSelect={onSelect}
        onClose={onClose}
      />,
    );
    await waitFor(() => expect(getByText('Incline Bench')).toBeTruthy());
    fireEvent.press(getByText('Incline Bench'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 2, name: 'Incline Bench' }));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/components/__tests__/SwapSheet.test.tsx --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement SwapSheet**

Create `src/components/SwapSheet.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { Exercise } from '../types';
import { getExerciseMuscleGroups, getExercisesByMuscleGroups } from '../db/muscleGroups';
import { getCategoryColor } from '../theme/colors';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface SwapSheetProps {
  visible: boolean;
  exercise: Exercise | null;
  excludeExerciseIds: number[];
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

interface AlternativeRow {
  exercise: Exercise;
  matchCount: number;
  isExact: boolean;
}

export function SwapSheet({ visible, exercise, excludeExerciseIds, onSelect, onClose }: SwapSheetProps) {
  const [alternatives, setAlternatives] = useState<AlternativeRow[]>([]);
  const [muscleGroupNames, setMuscleGroupNames] = useState<string[]>([]);
  const [totalMuscleGroups, setTotalMuscleGroups] = useState(0);

  useEffect(() => {
    if (!visible || !exercise) {
      setAlternatives([]);
      setMuscleGroupNames([]);
      return;
    }

    (async () => {
      const groups = await getExerciseMuscleGroups(exercise.id);
      const mgIds = groups.map(g => g.muscleGroupId);
      setMuscleGroupNames(groups.map(g => g.name));
      setTotalMuscleGroups(mgIds.length);

      const results = await getExercisesByMuscleGroups(mgIds, excludeExerciseIds);
      setAlternatives(
        results.map(r => ({
          ...r,
          isExact: r.matchCount === mgIds.length,
        })),
      );
    })();
  }, [visible, exercise, excludeExerciseIds]);

  if (!exercise) return null;

  const exactMatches = alternatives.filter(a => a.isExact);
  const partialMatches = alternatives.filter(a => !a.isExact);

  const renderItem = ({ item }: { item: AlternativeRow }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onSelect(item.exercise)}
      activeOpacity={0.7}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{item.exercise.name}</Text>
        <Text style={styles.rowMeta}>
          {item.matchCount}/{totalMuscleGroups} groups
          {item.exercise.measurementType === 'timed' ? ' · Timed' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const sections = [
    ...(exactMatches.length > 0
      ? [{ title: 'Exact Matches', data: exactMatches }]
      : []),
    ...(partialMatches.length > 0
      ? [{ title: 'Partial Matches', data: partialMatches }]
      : []),
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Swap {exercise.name}</Text>
        <View style={styles.chipRow}>
          {muscleGroupNames.map(name => (
            <View key={name} style={styles.chip}>
              <Text style={styles.chipText}>{name}</Text>
            </View>
          ))}
        </View>

        {alternatives.length === 0 ? (
          <Text style={styles.emptyText}>No alternatives found</Text>
        ) : (
          <FlatList
            data={[
              ...(exactMatches.length > 0
                ? [{ type: 'header' as const, title: 'Exact Matches' }, ...exactMatches.map(a => ({ type: 'item' as const, ...a }))]
                : []),
              ...(partialMatches.length > 0
                ? [{ type: 'header' as const, title: 'Partial Matches' }, ...partialMatches.map(a => ({ type: 'item' as const, ...a }))]
                : []),
            ]}
            keyExtractor={(item, index) => item.type === 'header' ? `h-${index}` : `e-${(item as AlternativeRow).exercise.id}`}
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return <Text style={styles.sectionHeader}>{item.title}</Text>;
              }
              return renderItem({ item: item as AlternativeRow });
            }}
            showsVerticalScrollIndicator={false}
            style={styles.list}
          />
        )}
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
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    backgroundColor: colors.accentDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  chipText: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: weightSemiBold,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.primary,
  },
  rowMeta: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/components/__tests__/SwapSheet.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/SwapSheet.tsx src/components/__tests__/SwapSheet.test.tsx
git commit -m "feat: add SwapSheet bottom sheet component with tests"
```

---

## Task 10: Wire SwapSheet into WorkoutScreen (Active Session Swap)

**Files:**
- Modify: `src/screens/WorkoutScreen.tsx`
- Modify: `src/context/SessionContext.tsx`

- [ ] **Step 1: Add swapExercise and removeExerciseFromSession to SessionContext**

In `src/context/SessionContext.tsx`, add to the `SessionContextValue` interface:

```typescript
swapExercise: (oldExerciseId: number, newExercise: Exercise, keepSets: boolean) => Promise<void>;
removeExerciseFromSession: (exerciseId: number) => Promise<void>;
```

Implement the functions inside `SessionProvider`:

```typescript
const removeExerciseFromSession = async (exerciseId: number) => {
  if (!session) return;
  const database = await dbPromise;
  // Delete sets for this exercise in this session
  await executeSql(
    database,
    'DELETE FROM workout_sets WHERE session_id = ? AND exercise_id = ?',
    [session.id, exerciseId],
  );
  // Delete the exercise_sessions row
  await executeSql(
    database,
    'DELETE FROM exercise_sessions WHERE session_id = ? AND exercise_id = ?',
    [session.id, exerciseId],
  );
  await refreshSession();
};

const swapExercise = async (oldExerciseId: number, newExercise: Exercise, keepSets: boolean) => {
  if (!session) return;
  if (!keepSets) {
    await removeExerciseFromSession(oldExerciseId);
  } else {
    // Mark old exercise as complete
    await dbMarkExerciseComplete(session.id, oldExerciseId);
  }
  await dbAddExerciseToSession(session.id, newExercise.id, newExercise.defaultRestSeconds);
  await refreshSession();
};
```

Add the new functions to the context value object.

- [ ] **Step 2: Add swap button and sheet to WorkoutScreen**

In `src/screens/WorkoutScreen.tsx`:

Add import:
```typescript
import { SwapSheet } from '../components/SwapSheet';
```

Add state at the top of the WorkoutScreen component:
```typescript
const [swapExercise, setSwapExercise] = useState<Exercise | null>(null);
```

Add the swap icon to the `ExerciseCard` component's `cardHeaderRight` View (between the history button and the check circle at line 240):

```tsx
<TouchableOpacity
  onPress={() => onSwap?.()}
  style={styles.historyButton}
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  activeOpacity={0.7}>
  <Text style={{ fontSize: fontSize.base, color: colors.secondary }}>{'\u21C4'}</Text>
</TouchableOpacity>
```

Add `onSwap` to `ExerciseCardProps` interface and threading.

Add the SwapSheet at the bottom of the WorkoutScreen render:

```tsx
<SwapSheet
  visible={swapExercise !== null}
  exercise={swapExercise}
  excludeExerciseIds={sessionExercises.map(se => se.exerciseId)}
  onSelect={async (newExercise) => {
    if (!swapExercise || !session) return;
    const setsResult = await getSetsForExerciseInSession(session.id, swapExercise.id);
    const setsForExercise = setsResult.length;
    if (setsForExercise > 0) {
      Alert.alert(
        `You've logged ${setsForExercise} sets on ${swapExercise.name}`,
        'What would you like to do?',
        [
          {
            text: 'Keep sets & add new',
            onPress: () => {
              sessionCtx.swapExercise(swapExercise.id, newExercise, true);
              setSwapExercise(null);
            },
          },
          {
            text: 'Discard sets & replace',
            style: 'destructive',
            onPress: () => {
              sessionCtx.swapExercise(swapExercise.id, newExercise, false);
              setSwapExercise(null);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    } else {
      await sessionCtx.swapExercise(swapExercise.id, newExercise, false);
      setSwapExercise(null);
    }
  }}
  onClose={() => setSwapExercise(null)}
/>
```

- [ ] **Step 3: Verify the app compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/screens/WorkoutScreen.tsx src/context/SessionContext.tsx
git commit -m "feat: wire swap button and SwapSheet into active workout screen"
```

---

## Task 11: Wire SwapSheet into DayDetailScreen (Program Day Swap)

**Files:**
- Modify: `src/components/ExerciseTargetRow.tsx`
- Modify: `src/screens/DayDetailScreen.tsx`

- [ ] **Step 1: Add onSwap prop to ExerciseTargetRow**

In `src/components/ExerciseTargetRow.tsx`, add to the `ExerciseTargetRowProps` interface:

```typescript
onSwap?: () => void;
```

Add the swap button next to the remove button in the JSX (after the remove button, inside the `showActions` conditional):

```tsx
{!selectionMode && showActions ? (
  <View style={styles.actionButtons}>
    <TouchableOpacity
      style={styles.swapButton}
      onPress={() => {
        setShowActions(false);
        onSwap?.();
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Text style={styles.swapIcon}>{'\u21C4'}</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.removeButton}
      onPress={onRemove}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Text style={styles.removeIcon}>{'\u2715'}</Text>
    </TouchableOpacity>
  </View>
) : null}
```

Add styles:

```typescript
actionButtons: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.xs,
},
swapButton: {
  width: 44,
  height: 44,
  alignItems: 'center',
  justifyContent: 'center',
},
swapIcon: {
  fontSize: fontSize.base,
  color: colors.accent,
  fontWeight: weightSemiBold,
},
```

- [ ] **Step 2: Integrate SwapSheet in DayDetailScreen**

In `src/screens/DayDetailScreen.tsx`:

Add import:
```typescript
import { SwapSheet } from '../components/SwapSheet';
```

Add state:
```typescript
const [swapTarget, setSwapTarget] = useState<{ exercise: Exercise; dayExercise: ProgramDayExercise } | null>(null);
```

Pass `onSwap` to every `ExerciseTargetRow`:
```typescript
onSwap={() => setSwapTarget({ exercise, dayExercise: item })}
```

Add the SwapSheet at the bottom of the render, handling the program day swap behavior:

```tsx
<SwapSheet
  visible={swapTarget !== null}
  exercise={swapTarget?.exercise ?? null}
  excludeExerciseIds={dayExercises.map(de => de.exerciseId)}
  onSelect={async (newExercise) => {
    if (!swapTarget) return;
    const { dayExercise } = swapTarget;
    // Remove old exercise from program day
    await removeExerciseFromProgramDay(dayExercise.id);
    // Add new exercise with same targets and sort order
    const newPde = await addExerciseToProgramDay(
      dayExercise.programDayId,
      newExercise.id,
      dayExercise.targetSets,
      dayExercise.targetReps,
      dayExercise.targetWeightLbs,
    );
    // If old exercise was in a superset, add new one to same group
    if (dayExercise.supersetGroupId != null) {
      await executeSql(
        database,
        'UPDATE program_day_exercises SET superset_group_id = ? WHERE id = ?',
        [dayExercise.supersetGroupId, newPde.id],
      );
    }
    setSwapTarget(null);
    loadDayExercises(); // refresh the list
  }}
  onClose={() => setSwapTarget(null)}
/>
```

- [ ] **Step 3: Verify the app compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/ExerciseTargetRow.tsx src/screens/DayDetailScreen.tsx
git commit -m "feat: wire swap button and SwapSheet into program day detail screen"
```

---

## Task 12: Update seed.ts for New Installs

**Files:**
- Modify: `src/db/seed.ts`

- [ ] **Step 1: Add muscle group seeding for new installs**

New installs run seed.ts before migrations. But since migration 16 handles the muscle group seeding for both new and existing databases, seed.ts doesn't need to change for muscle groups — the migration is idempotent. However, we should verify the seed → migration flow works.

Verify: migration 16's exercise mapping uses `INSERT OR IGNORE` and name-based lookups, so it works correctly whether exercises were seeded fresh or existed from before.

No changes needed to seed.ts.

- [ ] **Step 2: Commit (skip if no changes)**

No commit needed for this task.

---

## Task 13: Final Integration Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npx jest --no-coverage`
Expected: All tests pass

- [ ] **Step 2: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Build the app**

Run: `npx react-native build-android --mode=debug` (or platform equivalent)
Expected: Build succeeds

- [ ] **Step 4: Manual smoke test checklist**

1. Fresh install: exercises have muscle groups assigned
2. Library screen: "Dip" appears under both Arms and Chest tabs
3. Library screen: "Stretching" tab appears and shows no exercises (until some are added)
4. Dashboard: no Stretching card; multi-category exercises count in multiple categories
5. Add Exercise: MuscleGroupPicker shows, can select multiple groups, star marks primary
6. Edit Exercise: pre-populates existing muscle groups
7. Active workout: swap icon visible on exercise cards, tapping opens SwapSheet
8. SwapSheet: shows exact and partial matches, tapping replaces the exercise
9. Swap with sets logged: prompt appears with keep/discard options
10. Program day: long-press reveals swap + remove buttons, swap works and preserves superset membership

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: integration fixes for exercise swap and muscle groups"
```
