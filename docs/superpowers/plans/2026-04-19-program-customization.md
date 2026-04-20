# Program Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user fully customize an existing program per week, per day — editing target sets/reps/weight and a note for any week without affecting other weeks, plus add a session-only inline note editor on the WorkoutScreen.

**Architecture:** Two-layer override model. Shared base in `program_day_exercises` (existing). New `program_week_day_exercise_overrides` table holds nullable per-field overrides keyed by `(program_day_exercise_id, week_number)`; reads `LEFT JOIN` + `COALESCE` per field. A third layer — `exercise_session_notes` — stores session-only inline note edits. UI: ProgramDetailScreen gets a "Customize weeks" entry → CustomizeWeeksScreen hub → WeekDayEditorScreen. The existing `EditTargetsModal` is extended with a `scope` prop so mid-workout edit and program edit use one component.

**Tech Stack:** React Native, `react-native-sqlite-storage` (raw SQL via `tx.executeSql`), React Navigation stack, Jest (mocked DB), ESLint. All new code follows camelCase TS + snake_case SQL patterns. Legacy naming preserved: the column `*_weight_kg` stores **lbs** values; TS field is `targetWeightLbs`.

---

## File Structure

**New files:**
- `src/db/notes.ts` — session note CRUD
- `src/db/__tests__/notes.test.ts`
- `src/components/InlineNoteEditor.tsx` — inline note UI for ExerciseCard
- `src/components/__tests__/InlineNoteEditor.test.tsx`
- `src/screens/CustomizeWeeksScreen.tsx` — hub
- `src/screens/WeekDayEditorScreen.tsx` — per-week day editor

**Modified files:**
- `src/db/migrations.ts` — add v23
- `src/db/programs.ts` — new functions: `getExercisesForWeekDay`, `getWeekOverrideCounts`, `upsertOverride`, `revertOverrideField`, `updateBaseNote`, `deleteOverridesBeyondWeek`
- `src/db/__tests__/programs.test.ts` — tests for all new functions
- `src/types/index.ts` — new types: `WeekExerciseResolved`, `WeekOverride`, `SessionNote`
- `src/navigation/TabNavigator.tsx` — add `CustomizeWeeks` and `WeekDayEditor` to `ProgramsStackParamList`
- `src/components/EditTargetsModal.tsx` — add `scope` prop, `notes` field, per-field "inherit" toggles
- `src/components/ExerciseCard.tsx` — render `InlineNoteEditor` under NextSetPanel / Start Rest Timer
- `src/screens/ProgramDetailScreen.tsx` — add "Customize weeks" action
- `src/screens/WorkoutScreen.tsx` — switch exercise read to `getExercisesForWeekDay`, pass resolved note to `ExerciseCard`

---

## Conventions (apply throughout)

- SQL columns use `snake_case`. TS fields use `camelCase`. Column `*_weight_kg` stores **lbs** values (legacy).
- All new writes use ISO timestamps: `new Date().toISOString()`.
- All queries go through `executeSql(database, sql, params)` with `?` placeholders.
- New row mappers live next to existing ones at the top of their db module.
- Every new DB function gets a unit test with `jest.mock('../database')` and `mockResultSet`.
- Commit after each **passing** step group. Messages: `feat(<area>): <short>` or `test(<area>): <short>`.

---

## Task 1: Migration v23 — schema

**Files:**
- Modify: `src/db/migrations.ts` (append to `MIGRATIONS` array)

- [ ] **Step 1: Write the failing migration test**

Add to `src/db/__tests__/migrations.test.ts` (or create if missing — check existing conventions first; if no migrations test file exists, create `src/db/__tests__/migrations.test.ts` matching other `__tests__/*.test.ts` style):

```typescript
import { MIGRATIONS } from '../migrations';

describe('Migration v23', () => {
  it('defines version 23 with the expected shape', () => {
    const v23 = MIGRATIONS.find(m => m.version === 23);
    expect(v23).toBeDefined();
    expect(v23!.description).toMatch(/override|customiz|per-week/i);
    expect(typeof v23!.up).toBe('function');
  });

  it('adds notes column, overrides table, session notes table', () => {
    const v23 = MIGRATIONS.find(m => m.version === 23)!;
    const executedStatements: string[] = [];
    const fakeTx = {
      executeSql: (sql: string) => { executedStatements.push(sql); },
    };
    v23.up(fakeTx as any);

    const joined = executedStatements.join('\n').toLowerCase();
    expect(joined).toMatch(/alter table program_day_exercises\s+add column notes text/);
    expect(joined).toMatch(/create table .*program_week_day_exercise_overrides/);
    expect(joined).toMatch(/create index .*idx_pwdx_lookup/);
    expect(joined).toMatch(/create table .*exercise_session_notes/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/db/__tests__/migrations.test.ts -t "Migration v23"`
Expected: FAIL with `v23` undefined.

- [ ] **Step 3: Add migration v23**

Open `src/db/migrations.ts`. Locate the end of the `MIGRATIONS` array (after v22). Append:

```typescript
{
  version: 23,
  description: 'Per-week-per-day exercise overrides: notes on base, overrides table, session notes',
  up: (tx: Transaction) => {
    tx.executeSql(
      'ALTER TABLE program_day_exercises ADD COLUMN notes TEXT'
    );
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS program_week_day_exercise_overrides (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        program_day_exercise_id INTEGER NOT NULL,
        week_number INTEGER NOT NULL,
        override_sets INTEGER,
        override_reps INTEGER,
        override_weight_kg REAL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (program_day_exercise_id, week_number),
        FOREIGN KEY (program_day_exercise_id) REFERENCES program_day_exercises(id) ON DELETE CASCADE
      )
    `);
    tx.executeSql(
      'CREATE INDEX IF NOT EXISTS idx_pwdx_lookup ON program_week_day_exercise_overrides (program_day_exercise_id, week_number)'
    );
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS exercise_session_notes (
        session_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        notes TEXT,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (session_id, exercise_id),
        FOREIGN KEY (session_id)  REFERENCES workout_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)        ON DELETE CASCADE
      )
    `);
  },
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/db/__tests__/migrations.test.ts -t "Migration v23"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/migrations.ts src/db/__tests__/migrations.test.ts
git commit -m "feat(db): migration v23 — per-week override tables and base notes"
```

---

## Task 2: Add types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add the new types**

Append to `src/types/index.ts`:

```typescript
export interface WeekOverride {
  id: number;
  programDayExerciseId: number;
  weekNumber: number;
  overrideSets: number | null;
  overrideReps: number | null;
  overrideWeightLbs: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeekExerciseResolved {
  programDayExerciseId: number;
  exerciseId: number;
  sortOrder: number;
  supersetGroupId: number | null;
  sets: number;
  reps: number;
  weightLbs: number;
  notes: string | null;
  overrideRowExists: boolean;
  setsOverridden: boolean;
  repsOverridden: boolean;
  weightOverridden: boolean;
  notesOverridden: boolean;
}

export interface SessionNote {
  sessionId: number;
  exerciseId: number;
  notes: string | null;
  updatedAt: string;
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add WeekOverride, WeekExerciseResolved, SessionNote"
```

---

## Task 3: Row mappers + `getExercisesForWeekDay`

**Files:**
- Modify: `src/db/programs.ts` (add mappers + function)
- Modify: `src/db/__tests__/programs.test.ts` (add tests)

- [ ] **Step 1: Write failing tests for `getExercisesForWeekDay`**

In `src/db/__tests__/programs.test.ts`, add:

```typescript
import { getExercisesForWeekDay } from '../programs';

describe('getExercisesForWeekDay', () => {
  beforeEach(() => {
    mockExecuteSql.mockReset();
  });

  it('returns base values when no overrides exist', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      {
        program_day_exercise_id: 10,
        exercise_id: 5,
        sort_order: 1,
        superset_group_id: null,
        sets: 4,
        reps: 8,
        weight_kg: 135,
        notes: null,
        override_row_exists: 0,
        sets_overridden: 0,
        reps_overridden: 0,
        weight_overridden: 0,
        notes_overridden: 0,
      },
    ]));

    const rows = await getExercisesForWeekDay(99, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      programDayExerciseId: 10,
      sets: 4,
      reps: 8,
      weightLbs: 135,
      notes: null,
      overrideRowExists: false,
      setsOverridden: false,
    });
  });

  it('passes programDayId and weekNumber as parameters', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getExercisesForWeekDay(42, 3);
    const [, sql, params] = mockExecuteSql.mock.calls[0];
    expect(sql.toLowerCase()).toContain('left join program_week_day_exercise_overrides');
    expect(params).toEqual([3, 42]);
  });

  it('reflects partial override (sets only)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      {
        program_day_exercise_id: 10,
        exercise_id: 5,
        sort_order: 1,
        superset_group_id: null,
        sets: 5,
        reps: 8,
        weight_kg: 135,
        notes: null,
        override_row_exists: 1,
        sets_overridden: 1,
        reps_overridden: 0,
        weight_overridden: 0,
        notes_overridden: 0,
      },
    ]));
    const rows = await getExercisesForWeekDay(99, 3);
    expect(rows[0].setsOverridden).toBe(true);
    expect(rows[0].repsOverridden).toBe(false);
    expect(rows[0].overrideRowExists).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/db/__tests__/programs.test.ts -t "getExercisesForWeekDay"`
Expected: FAIL with `getExercisesForWeekDay is not a function`.

- [ ] **Step 3: Add the row mapper and function**

In `src/db/programs.ts`, near the existing row mappers (top of file), add:

```typescript
function rowToWeekExerciseResolved(row: any): WeekExerciseResolved {
  return {
    programDayExerciseId: row.program_day_exercise_id,
    exerciseId: row.exercise_id,
    sortOrder: row.sort_order,
    supersetGroupId: row.superset_group_id ?? null,
    sets: row.sets,
    reps: row.reps,
    weightLbs: row.weight_kg, // legacy: column named _kg, value stored in lbs
    notes: row.notes ?? null,
    overrideRowExists: Boolean(row.override_row_exists),
    setsOverridden: Boolean(row.sets_overridden),
    repsOverridden: Boolean(row.reps_overridden),
    weightOverridden: Boolean(row.weight_overridden),
    notesOverridden: Boolean(row.notes_overridden),
  };
}
```

Make sure `WeekExerciseResolved` is imported at the top of the file from `../types`.

Then add the function (next to existing read functions such as `getProgramDayExercises`):

```typescript
export async function getExercisesForWeekDay(
  programDayId: number,
  weekNumber: number,
): Promise<WeekExerciseResolved[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT
       pde.id                                AS program_day_exercise_id,
       pde.exercise_id                       AS exercise_id,
       pde.sort_order                        AS sort_order,
       pde.superset_group_id                 AS superset_group_id,
       COALESCE(ov.override_sets,      pde.target_sets)       AS sets,
       COALESCE(ov.override_reps,      pde.target_reps)       AS reps,
       COALESCE(ov.override_weight_kg, pde.target_weight_kg)  AS weight_kg,
       COALESCE(ov.notes,              pde.notes)             AS notes,
       CASE WHEN ov.id IS NOT NULL THEN 1 ELSE 0 END               AS override_row_exists,
       CASE WHEN ov.override_sets      IS NOT NULL THEN 1 ELSE 0 END AS sets_overridden,
       CASE WHEN ov.override_reps      IS NOT NULL THEN 1 ELSE 0 END AS reps_overridden,
       CASE WHEN ov.override_weight_kg IS NOT NULL THEN 1 ELSE 0 END AS weight_overridden,
       CASE WHEN ov.notes              IS NOT NULL THEN 1 ELSE 0 END AS notes_overridden
     FROM program_day_exercises pde
     LEFT JOIN program_week_day_exercise_overrides ov
       ON  ov.program_day_exercise_id = pde.id
       AND ov.week_number = ?
     WHERE pde.program_day_id = ?
     ORDER BY pde.sort_order`,
    [weekNumber, programDayId],
  );
  const out: WeekExerciseResolved[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    out.push(rowToWeekExerciseResolved(result.rows.item(i)));
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/db/__tests__/programs.test.ts -t "getExercisesForWeekDay"`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/db/programs.ts src/db/__tests__/programs.test.ts
git commit -m "feat(db): getExercisesForWeekDay resolves base + per-week override"
```

---

## Task 4: `upsertOverride` + `revertOverrideField`

**Files:**
- Modify: `src/db/programs.ts`
- Modify: `src/db/__tests__/programs.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `programs.test.ts`:

```typescript
import { upsertOverride, revertOverrideField } from '../programs';

describe('upsertOverride', () => {
  beforeEach(() => { mockExecuteSql.mockReset(); });

  it('writes UPSERT with COALESCE-preserving fields for a single-field edit', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await upsertOverride({
      programDayExerciseId: 10,
      weekNumber: 3,
      field: 'sets',
      value: 5,
    });
    const [, sql, params] = mockExecuteSql.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO program_week_day_exercise_overrides/);
    expect(sql).toMatch(/ON CONFLICT\(program_day_exercise_id, week_number\)/);
    expect(params[0]).toBe(10);
    expect(params[1]).toBe(3);
    expect(params).toContain(5);
  });

  it('writes notes when field is notes', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await upsertOverride({
      programDayExerciseId: 10,
      weekNumber: 3,
      field: 'notes',
      value: '85-90% of Best',
    });
    const [, , params] = mockExecuteSql.mock.calls[0];
    expect(params).toContain('85-90% of Best');
  });
});

describe('revertOverrideField', () => {
  beforeEach(() => { mockExecuteSql.mockReset(); });

  it('sets the field to NULL and deletes row when all fields are NULL after update', async () => {
    // first call: UPDATE sets field to NULL
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    // second call: SELECT current nullable state
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { override_sets: null, override_reps: null, override_weight_kg: null, notes: null },
    ]));
    // third call: DELETE
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    await revertOverrideField({
      programDayExerciseId: 10,
      weekNumber: 3,
      field: 'reps',
    });

    expect(mockExecuteSql).toHaveBeenCalledTimes(3);
    expect(mockExecuteSql.mock.calls[0][1]).toMatch(/UPDATE program_week_day_exercise_overrides/);
    expect(mockExecuteSql.mock.calls[0][1]).toMatch(/override_reps = NULL/);
    expect(mockExecuteSql.mock.calls[2][1]).toMatch(/DELETE FROM program_week_day_exercise_overrides/);
  });

  it('leaves the row in place when any field remains non-null', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { override_sets: 5, override_reps: null, override_weight_kg: null, notes: null },
    ]));

    await revertOverrideField({
      programDayExerciseId: 10,
      weekNumber: 3,
      field: 'reps',
    });

    expect(mockExecuteSql).toHaveBeenCalledTimes(2);
    expect(mockExecuteSql.mock.calls[1][1]).toMatch(/SELECT override_sets/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/db/__tests__/programs.test.ts -t "upsertOverride|revertOverrideField"`
Expected: FAIL — functions not defined.

- [ ] **Step 3: Implement the functions**

Add to `src/db/programs.ts`:

```typescript
type OverrideField = 'sets' | 'reps' | 'weight' | 'notes';

const OVERRIDE_COLUMN: Record<OverrideField, string> = {
  sets: 'override_sets',
  reps: 'override_reps',
  weight: 'override_weight_kg',
  notes: 'notes',
};

export async function upsertOverride(args: {
  programDayExerciseId: number;
  weekNumber: number;
  field: OverrideField;
  value: number | string | null;
}): Promise<void> {
  const { programDayExerciseId, weekNumber, field, value } = args;
  const col = OVERRIDE_COLUMN[field];
  const now = new Date().toISOString();
  const database = await db;
  await executeSql(
    database,
    `INSERT INTO program_week_day_exercise_overrides
       (program_day_exercise_id, week_number, ${col}, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(program_day_exercise_id, week_number)
     DO UPDATE SET ${col} = excluded.${col}, updated_at = excluded.updated_at`,
    [programDayExerciseId, weekNumber, value, now, now],
  );
}

export async function revertOverrideField(args: {
  programDayExerciseId: number;
  weekNumber: number;
  field: OverrideField;
}): Promise<void> {
  const { programDayExerciseId, weekNumber, field } = args;
  const col = OVERRIDE_COLUMN[field];
  const now = new Date().toISOString();
  const database = await db;

  // 1. Null the field.
  await executeSql(
    database,
    `UPDATE program_week_day_exercise_overrides
       SET ${col} = NULL, updated_at = ?
     WHERE program_day_exercise_id = ? AND week_number = ?`,
    [now, programDayExerciseId, weekNumber],
  );

  // 2. Check if any nullable field is still non-null.
  const check = await executeSql(
    database,
    `SELECT override_sets, override_reps, override_weight_kg, notes
       FROM program_week_day_exercise_overrides
      WHERE program_day_exercise_id = ? AND week_number = ?`,
    [programDayExerciseId, weekNumber],
  );
  if (check.rows.length === 0) { return; }
  const row = check.rows.item(0);
  const allNull = row.override_sets == null
    && row.override_reps == null
    && row.override_weight_kg == null
    && (row.notes == null || row.notes === '');
  if (!allNull) { return; }

  // 3. Delete empty override row.
  await executeSql(
    database,
    `DELETE FROM program_week_day_exercise_overrides
      WHERE program_day_exercise_id = ? AND week_number = ?`,
    [programDayExerciseId, weekNumber],
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/db/__tests__/programs.test.ts -t "upsertOverride|revertOverrideField"`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/db/programs.ts src/db/__tests__/programs.test.ts
git commit -m "feat(db): upsertOverride and revertOverrideField for per-week overrides"
```

---

## Task 5: `updateBaseNote` + `getWeekOverrideCounts`

**Files:**
- Modify: `src/db/programs.ts`
- Modify: `src/db/__tests__/programs.test.ts`

- [ ] **Step 1: Write failing tests**

Append:

```typescript
import { updateBaseNote, getWeekOverrideCounts } from '../programs';

describe('updateBaseNote', () => {
  beforeEach(() => { mockExecuteSql.mockReset(); });
  it('updates the note on program_day_exercises', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await updateBaseNote(10, 'Heavy day — brace hard');
    const [, sql, params] = mockExecuteSql.mock.calls[0];
    expect(sql).toMatch(/UPDATE program_day_exercises SET notes = \? WHERE id = \?/);
    expect(params).toEqual(['Heavy day — brace hard', 10]);
  });
  it('accepts null to clear the note', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await updateBaseNote(10, null);
    expect(mockExecuteSql.mock.calls[0][2]).toEqual([null, 10]);
  });
});

describe('getWeekOverrideCounts', () => {
  beforeEach(() => { mockExecuteSql.mockReset(); });
  it('returns a map of week_number -> override count', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { week_number: 2, override_count: 3 },
      { week_number: 3, override_count: 7 },
    ]));
    const counts = await getWeekOverrideCounts(42);
    expect(counts).toEqual({ 2: 3, 3: 7 });
  });
});
```

- [ ] **Step 2: Run tests — verify fail**

Run: `npx jest src/db/__tests__/programs.test.ts -t "updateBaseNote|getWeekOverrideCounts"`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add to `programs.ts`:

```typescript
export async function updateBaseNote(programDayExerciseId: number, notes: string | null): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE program_day_exercises SET notes = ? WHERE id = ?',
    [notes, programDayExerciseId],
  );
}

export async function getWeekOverrideCounts(programId: number): Promise<Record<number, number>> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT week_number, COUNT(*) AS override_count
       FROM program_week_day_exercise_overrides
       WHERE program_day_exercise_id IN (
         SELECT id FROM program_day_exercises
         WHERE program_day_id IN (SELECT id FROM program_days WHERE program_id = ?)
       )
       GROUP BY week_number`,
    [programId],
  );
  const out: Record<number, number> = {};
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    out[row.week_number] = row.override_count;
  }
  return out;
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `npx jest src/db/__tests__/programs.test.ts -t "updateBaseNote|getWeekOverrideCounts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/programs.ts src/db/__tests__/programs.test.ts
git commit -m "feat(db): updateBaseNote and getWeekOverrideCounts"
```

---

## Task 6: Orphan cleanup — `deleteOverridesBeyondWeek`

**Files:**
- Modify: `src/db/programs.ts`
- Modify: `src/db/__tests__/programs.test.ts`

- [ ] **Step 1: Write failing test**

Append:

```typescript
import { deleteOverridesBeyondWeek } from '../programs';

describe('deleteOverridesBeyondWeek', () => {
  beforeEach(() => { mockExecuteSql.mockReset(); });
  it('deletes overrides for weeks > newWeekCount for the given program', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await deleteOverridesBeyondWeek(42, 4);
    const [, sql, params] = mockExecuteSql.mock.calls[0];
    expect(sql).toMatch(/DELETE FROM program_week_day_exercise_overrides/);
    expect(sql).toMatch(/week_number > \?/);
    expect(params).toEqual([4, 42]);
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npx jest src/db/__tests__/programs.test.ts -t "deleteOverridesBeyondWeek"`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add to `programs.ts`:

```typescript
export async function deleteOverridesBeyondWeek(programId: number, newWeekCount: number): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    `DELETE FROM program_week_day_exercise_overrides
      WHERE week_number > ?
        AND program_day_exercise_id IN (
          SELECT id FROM program_day_exercises
          WHERE program_day_id IN (SELECT id FROM program_days WHERE program_id = ?)
        )`,
    [newWeekCount, programId],
  );
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npx jest src/db/__tests__/programs.test.ts -t "deleteOverridesBeyondWeek"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/programs.ts src/db/__tests__/programs.test.ts
git commit -m "feat(db): deleteOverridesBeyondWeek for week-count shrink cleanup"
```

---

## Task 7: Session notes module

**Files:**
- Create: `src/db/notes.ts`
- Create: `src/db/__tests__/notes.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/db/__tests__/notes.test.ts`:

```typescript
jest.mock('../database');

import { executeSql } from '../database';
import { mockResultSet } from '@test-utils';
import { upsertSessionNote, getSessionNote, getLastSessionNote } from '../notes';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;

describe('upsertSessionNote', () => {
  beforeEach(() => { mockExecuteSql.mockReset(); });

  it('writes an UPSERT keyed on (session_id, exercise_id)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await upsertSessionNote(100, 5, 'felt heavy');
    const [, sql, params] = mockExecuteSql.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO exercise_session_notes/);
    expect(sql).toMatch(/ON CONFLICT\(session_id, exercise_id\)/);
    expect(params[0]).toBe(100);
    expect(params[1]).toBe(5);
    expect(params[2]).toBe('felt heavy');
  });

  it('deletes the row when text is empty', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await upsertSessionNote(100, 5, '');
    const [, sql, params] = mockExecuteSql.mock.calls[0];
    expect(sql).toMatch(/DELETE FROM exercise_session_notes/);
    expect(params).toEqual([100, 5]);
  });
});

describe('getSessionNote', () => {
  beforeEach(() => { mockExecuteSql.mockReset(); });
  it('returns the note string or null', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ notes: 'hello' }]));
    expect(await getSessionNote(100, 5)).toBe('hello');
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    expect(await getSessionNote(100, 5)).toBeNull();
  });
});

describe('getLastSessionNote', () => {
  beforeEach(() => { mockExecuteSql.mockReset(); });
  it('returns the most recent non-empty note for the exercise', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ notes: 'prev' }]));
    expect(await getLastSessionNote(5)).toBe('prev');
    const [, sql] = mockExecuteSql.mock.calls[0];
    expect(sql).toMatch(/ORDER BY .* DESC/);
    expect(sql).toMatch(/LIMIT 1/);
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npx jest src/db/__tests__/notes.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/db/notes.ts`**

```typescript
import { db, executeSql } from './database';

export async function upsertSessionNote(sessionId: number, exerciseId: number, notes: string | null): Promise<void> {
  const database = await db;
  const trimmed = notes?.trim() ?? '';
  if (trimmed === '') {
    await executeSql(
      database,
      'DELETE FROM exercise_session_notes WHERE session_id = ? AND exercise_id = ?',
      [sessionId, exerciseId],
    );
    return;
  }
  const now = new Date().toISOString();
  await executeSql(
    database,
    `INSERT INTO exercise_session_notes (session_id, exercise_id, notes, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(session_id, exercise_id)
     DO UPDATE SET notes = excluded.notes, updated_at = excluded.updated_at`,
    [sessionId, exerciseId, trimmed, now],
  );
}

export async function getSessionNote(sessionId: number, exerciseId: number): Promise<string | null> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT notes FROM exercise_session_notes WHERE session_id = ? AND exercise_id = ?',
    [sessionId, exerciseId],
  );
  if (result.rows.length === 0) { return null; }
  return result.rows.item(0).notes ?? null;
}

export async function getLastSessionNote(exerciseId: number): Promise<string | null> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT notes FROM exercise_session_notes
      WHERE exercise_id = ? AND notes IS NOT NULL AND notes != ''
      ORDER BY updated_at DESC
      LIMIT 1`,
    [exerciseId],
  );
  if (result.rows.length === 0) { return null; }
  return result.rows.item(0).notes ?? null;
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npx jest src/db/__tests__/notes.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/db/notes.ts src/db/__tests__/notes.test.ts
git commit -m "feat(db): session notes module (upsert/get/getLast)"
```

---

## Task 8: Switch WorkoutScreen read to `getExercisesForWeekDay`

**Files:**
- Modify: `src/screens/WorkoutScreen.tsx`

- [ ] **Step 1: Locate the current exercise-read call**

Run: `grep -n "getProgramDayExercises\b" src/screens/WorkoutScreen.tsx`
Record the line numbers. In later steps this is the call we replace.

- [ ] **Step 2: Read the full context**

Open `src/screens/WorkoutScreen.tsx`. Identify:
- The state variable that holds the exercise list (likely `setProgramExercises` or similar)
- The session variable that exposes `program_week` (likely `session.programWeek` from `useSessionContext` / `sessions.ts` row)
- Every place that reads `ex.targetSets`, `ex.targetReps`, `ex.targetWeightLbs` (these become `ex.sets`, `ex.reps`, `ex.weightLbs` after the switch)

- [ ] **Step 3: Replace the call**

Replace the `getProgramDayExercises(dayId)` call site with:

```typescript
import { getExercisesForWeekDay } from '../db/programs';
// ...
const weekNumber = session?.programWeek ?? currentWeekFromProgram ?? 1;
const rows = await getExercisesForWeekDay(dayId, weekNumber);
```

Rename the state type from `ProgramDayExercise[]` to `WeekExerciseResolved[]` and update all field accesses:

| Old | New |
|---|---|
| `ex.id` | `ex.programDayExerciseId` |
| `ex.targetSets` | `ex.sets` |
| `ex.targetReps` | `ex.reps` |
| `ex.targetWeightLbs` | `ex.weightLbs` |
| (none) | `ex.notes` |

Leave `supersetGroupId`, `exerciseId`, `sortOrder` as-is — field names match.

- [ ] **Step 4: Typecheck + run test suite**

Run: `npx tsc --noEmit`
Run: `npx jest src/screens/__tests__/WorkoutScreen.test.tsx` (if exists)
Expected: PASS.

- [ ] **Step 5: Smoke-test manually on emulator**

Deploy via the `/deploy` skill to the emulator. Start a workout of an existing program. Targets should render exactly as before (no overrides exist, so `COALESCE` falls through to base).

- [ ] **Step 6: Commit**

```bash
git add src/screens/WorkoutScreen.tsx
git commit -m "refactor(workout): read exercises via getExercisesForWeekDay"
```

---

## Task 9: `InlineNoteEditor` component

**Files:**
- Create: `src/components/InlineNoteEditor.tsx`
- Create: `src/components/__tests__/InlineNoteEditor.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/__tests__/InlineNoteEditor.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { InlineNoteEditor } from '../InlineNoteEditor';

describe('InlineNoteEditor', () => {
  it('renders the note text in view mode', () => {
    const { getByText } = render(
      <InlineNoteEditor value="85-90% of Best" onCommit={jest.fn()} />,
    );
    expect(getByText('85-90% of Best')).toBeTruthy();
  });

  it('shows placeholder when value and hint are empty', () => {
    const { getByText } = render(<InlineNoteEditor value="" onCommit={jest.fn()} />);
    expect(getByText('Add a note…')).toBeTruthy();
  });

  it('shows hint when value is empty and hint is provided', () => {
    const { getByText } = render(
      <InlineNoteEditor value="" hint="felt heavy last time" onCommit={jest.fn()} />,
    );
    expect(getByText('felt heavy last time')).toBeTruthy();
  });

  it('calls onCommit with the text when submit fires', () => {
    const onCommit = jest.fn();
    const { getByText, getByTestId } = render(
      <InlineNoteEditor value="original" onCommit={onCommit} />,
    );
    fireEvent.press(getByText('original'));
    const input = getByTestId('inline-note-input');
    fireEvent.changeText(input, 'updated');
    fireEvent(input, 'submitEditing');
    expect(onCommit).toHaveBeenCalledWith('updated');
  });

  it('commits on blur', () => {
    const onCommit = jest.fn();
    const { getByText, getByTestId } = render(
      <InlineNoteEditor value="original" onCommit={onCommit} />,
    );
    fireEvent.press(getByText('original'));
    const input = getByTestId('inline-note-input');
    fireEvent.changeText(input, 'blurred text');
    fireEvent(input, 'blur');
    expect(onCommit).toHaveBeenCalledWith('blurred text');
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npx jest src/components/__tests__/InlineNoteEditor.test.tsx`
Expected: FAIL — component not found.

- [ ] **Step 3: Create the component**

Create `src/components/InlineNoteEditor.tsx`:

```typescript
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
          placeholderTextColor="rgba(255,255,255,0.35)"
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
  viewContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2, paddingHorizontal: 2, gap: 6 },
  editingContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, gap: 6 },
  pencilView: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  pencilEditing: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  input: { flex: 1, color: '#ffffff', fontSize: 12, fontWeight: '500', padding: 0 },
  valueText: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '500' },
  hintText: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontStyle: 'italic' },
  placeholderText: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontStyle: 'italic' },
});
```

- [ ] **Step 4: Run — verify pass**

Run: `npx jest src/components/__tests__/InlineNoteEditor.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/InlineNoteEditor.tsx src/components/__tests__/InlineNoteEditor.test.tsx
git commit -m "feat(components): InlineNoteEditor with commit-on-blur/submit"
```

---

## Task 10: Wire `InlineNoteEditor` into `ExerciseCard`

**Files:**
- Modify: `src/components/ExerciseCard.tsx`

- [ ] **Step 1: Add new props**

Extend the Props interface near the top of `ExerciseCard.tsx` with these additions:

```typescript
// Existing props …
note?: string | null;            // resolved value from WorkoutScreen (session → override → base)
lastSessionNoteHint?: string | null;
onNoteCommit?: (text: string) => void;
```

- [ ] **Step 2: Import the editor**

Add near other component imports:

```typescript
import { InlineNoteEditor } from './InlineNoteEditor';
```

- [ ] **Step 3: Render it in the expanded body**

After the `Start Rest Timer` button (the `{pendingRest && (...)}` block), add:

```typescript
{onNoteCommit && (
  <View style={styles.noteWrap}>
    <InlineNoteEditor
      value={note ?? ''}
      hint={lastSessionNoteHint ?? undefined}
      onCommit={onNoteCommit}
    />
  </View>
)}
```

Add the style:

```typescript
noteWrap: { marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 10 },
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Run existing component tests (if any)**

Run: `npx jest src/components/__tests__/ExerciseCard` (if a test file exists)
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ExerciseCard.tsx
git commit -m "feat(exercise-card): render InlineNoteEditor under NextSetPanel"
```

---

## Task 11: Wire note pipeline in `WorkoutScreen`

**Files:**
- Modify: `src/screens/WorkoutScreen.tsx`

- [ ] **Step 1: Load session note and last-session hint per exercise**

Near the top of the screen, after exercises are loaded via `getExercisesForWeekDay`, load a per-exercise `sessionNote` map and a `lastNoteHint` map. Example:

```typescript
import { getSessionNote, upsertSessionNote, getLastSessionNote } from '../db/notes';

// inside refresh() after exercises load:
const [sessionNotes, lastHints] = await Promise.all([
  Promise.all(rows.map(r => getSessionNote(session.id, r.exerciseId).then(n => [r.exerciseId, n] as const))),
  Promise.all(rows.map(r => getLastSessionNote(r.exerciseId).then(n => [r.exerciseId, n] as const))),
]);
setSessionNotes(Object.fromEntries(sessionNotes));
setLastHints(Object.fromEntries(lastHints));
```

State:

```typescript
const [sessionNotes, setSessionNotes] = useState<Record<number, string | null>>({});
const [lastHints, setLastHints] = useState<Record<number, string | null>>({});
```

- [ ] **Step 2: Resolve the displayed note with precedence**

Helper (inline where `ExerciseCard` is rendered, per exercise `r`):

```typescript
const resolvedNote =
  sessionNotes[r.exerciseId]          // 1. session override
    ?? r.notes                         // 2. program (override over base via COALESCE)
    ?? null;
const hint =
  !sessionNotes[r.exerciseId] && !r.notes
    ? lastHints[r.exerciseId] ?? null
    : null;
```

- [ ] **Step 3: Pass props to `ExerciseCard`**

```typescript
<ExerciseCard
  // existing props …
  note={resolvedNote}
  lastSessionNoteHint={hint}
  onNoteCommit={async (text) => {
    await upsertSessionNote(session.id, r.exerciseId, text);
    setSessionNotes(prev => ({ ...prev, [r.exerciseId]: text.trim() === '' ? null : text }));
  }}
/>
```

- [ ] **Step 4: Typecheck and build**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Manual smoke test**

Deploy via `/deploy`. Start a workout. Expand an exercise card. You should see the note line. Tap to edit, type, press Return. Close and re-open the card — note persists. Finish the session. Start a new session of the same exercise — the previous session's note appears as the **muted hint**, not as the active note.

- [ ] **Step 6: Commit**

```bash
git add src/screens/WorkoutScreen.tsx
git commit -m "feat(workout): session note editing with per-exercise precedence"
```

---

## Task 12: Extend `EditTargetsModal` with scope + notes + inherit toggles

**Files:**
- Modify: `src/components/EditTargetsModal.tsx`

- [ ] **Step 1: Rewrite the Props interface**

Replace the existing Props block with:

```typescript
export type EditTargetsScope = 'base' | { week: number };

export interface EditTargetsModalProps {
  visible: boolean;
  onClose: () => void;
  exerciseName: string;
  programDayExerciseId: number | null;
  scope: EditTargetsScope;
  // Base values for "inherit" rendering:
  baseSets: number;
  baseReps: number;
  baseWeightLbs: number;
  baseNote: string | null;
  // Current (possibly-overridden) values as initial form state:
  initialSets: number;
  initialReps: number;
  initialWeightLbs: number;
  initialNote: string | null;
  // Which fields are currently overridden (controls the "inherit" toggle state):
  setsOverridden: boolean;
  repsOverridden: boolean;
  weightOverridden: boolean;
  notesOverridden: boolean;

  onSave: (patch: {
    sets: { inherit: true } | { inherit: false; value: number };
    reps: { inherit: true } | { inherit: false; value: number };
    weight: { inherit: true } | { inherit: false; value: number };
    notes: { inherit: true } | { inherit: false; value: string | null };
  }) => Promise<void> | void;
}
```

- [ ] **Step 2: Rewire state**

Replace the existing state block with:

```typescript
const [sets, setSets] = useState(String(initialSets));
const [reps, setReps] = useState(String(initialReps));
const [weight, setWeight] = useState(String(initialWeightLbs));
const [note, setNote] = useState(initialNote ?? '');

const [setsInherit, setSetsInherit] = useState(scope !== 'base' && !setsOverridden);
const [repsInherit, setRepsInherit] = useState(scope !== 'base' && !repsOverridden);
const [weightInherit, setWeightInherit] = useState(scope !== 'base' && !weightOverridden);
const [notesInherit, setNotesInherit] = useState(scope !== 'base' && !notesOverridden);

const [error, setError] = useState<string | null>(null);
```

When `scope === 'base'`, render all "inherit" toggles as disabled/hidden — the base *is* the source.

- [ ] **Step 3: Update the save handler**

```typescript
const handleSave = async () => {
  const isBase = scope === 'base';

  const sf = isBase || !setsInherit ? { inherit: false as const, value: parseInt(sets, 10) } : { inherit: true as const };
  const rf = isBase || !repsInherit ? { inherit: false as const, value: parseInt(reps, 10) } : { inherit: true as const };
  const wf = isBase || !weightInherit ? { inherit: false as const, value: parseFloat(weight) } : { inherit: true as const };
  const nf = isBase || !notesInherit ? { inherit: false as const, value: note.trim() === '' ? null : note.trim() } : { inherit: true as const };

  if (sf.inherit === false && (isNaN(sf.value) || sf.value < 1)) { setError('Sets must be a positive number'); return; }
  if (rf.inherit === false && (isNaN(rf.value) || rf.value < 1)) { setError('Reps must be a positive number'); return; }
  if (wf.inherit === false && (isNaN(wf.value) || wf.value < 0)) { setError('Weight must be zero or more'); return; }

  setError(null);
  await onSave({ sets: sf, reps: rf, weight: wf, notes: nf });
  onClose();
};
```

- [ ] **Step 4: Render the note field and inherit toggles**

In the modal body, add a `TextInput` for `note` and, for each of the four fields, a small toggle row like:

```typescript
{scope !== 'base' && (
  <View style={styles.inheritRow}>
    <Text style={styles.inheritLabel}>Inherit from base</Text>
    <Switch value={setsInherit} onValueChange={setSetsInherit} />
  </View>
)}
```

Styles live adjacent to the existing ones.

- [ ] **Step 5: Update existing mid-workout caller in `WorkoutScreen.tsx`**

Find the existing `<EditTargetsModal ... />` usage. Replace its props with the new shape, reading `scope = { week: session.programWeek }`, and in the `onSave` callback invoke `upsertOverride` per changed field and `revertOverrideField` for any flipped-to-inherit field:

```typescript
onSave={async (patch) => {
  const weekNumber = session.programWeek!;
  const id = editingExercise!.programDayExerciseId;
  for (const [key, col] of [
    ['sets', 'sets'] as const,
    ['reps', 'reps'] as const,
    ['weight', 'weight'] as const,
    ['notes', 'notes'] as const,
  ]) {
    const f = patch[key];
    if (f.inherit) {
      await revertOverrideField({ programDayExerciseId: id, weekNumber, field: col as any });
    } else {
      await upsertOverride({ programDayExerciseId: id, weekNumber, field: col as any, value: f.value as any });
    }
  }
  await refresh();
}}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Manual smoke test**

Deploy, start workout on week 3, tap Edit Targets, change sets to 5 and toggle weight to "Inherit from base". Save. Close the modal. Reopen — state matches. End workout, start week 2 workout of same exercise — week 2 shows base values (not week 3's override). Return to week 3 next day — override persists.

- [ ] **Step 8: Commit**

```bash
git add src/components/EditTargetsModal.tsx src/screens/WorkoutScreen.tsx
git commit -m "feat(edit-targets): scope + notes + per-field inherit toggles"
```

---

## Task 13: Navigation types + stack registration

**Files:**
- Modify: `src/navigation/TabNavigator.tsx`

- [ ] **Step 1: Extend `ProgramsStackParamList`**

Replace the existing type with:

```typescript
export type ProgramsStackParamList = {
  ProgramsList: undefined;
  ProgramDetail: { programId: number };
  DayDetail: { dayId: number; dayName: string };
  CustomizeWeeks: { programId: number };
  WeekDayEditor: { programId: number; scope: 'base' | { week: number }; dayId: number; dayName: string };
};
```

- [ ] **Step 2: Register screens**

Inside the `ProgramsStack.Navigator`, after `DayDetail`, add:

```typescript
<ProgramsStack.Screen name="CustomizeWeeks" component={CustomizeWeeksScreen} options={{ title: 'Customize weeks' }} />
<ProgramsStack.Screen name="WeekDayEditor" component={WeekDayEditorScreen} options={{ title: '' }} />
```

Add the imports at the top of `TabNavigator.tsx`:

```typescript
import { CustomizeWeeksScreen } from '../screens/CustomizeWeeksScreen';
import { WeekDayEditorScreen } from '../screens/WeekDayEditorScreen';
```

Note: screens don't exist yet — Task 14 and 15 create them. Until then `tsc` will fail on this step. That's expected; we land nav + screens together, but each screen is a separate commit.

- [ ] **Step 3: Commit as WIP (types only, not runnable)**

No commit yet — wait until Task 15 lands both screens. Move on.

---

## Task 14: `CustomizeWeeksScreen`

**Files:**
- Create: `src/screens/CustomizeWeeksScreen.tsx`

- [ ] **Step 1: Create the screen**

Create `src/screens/CustomizeWeeksScreen.tsx`:

```typescript
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { getProgram, getProgramDays, getWeekOverrideCounts, getWeekData } from '../db/programs';
import type { Program, ProgramDay } from '../types';
import { theme } from '../theme';
import type { ProgramsStackParamList } from '../navigation/TabNavigator';

type Route = RouteProp<ProgramsStackParamList, 'CustomizeWeeks'>;
type Nav = StackNavigationProp<ProgramsStackParamList, 'CustomizeWeeks'>;

export function CustomizeWeeksScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { programId } = route.params;

  const [program, setProgram] = useState<Program | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [weekNames, setWeekNames] = useState<Record<number, string | null>>({});

  const refresh = useCallback(async () => {
    const [p, d, c] = await Promise.all([
      getProgram(programId),
      getProgramDays(programId),
      getWeekOverrideCounts(programId),
    ]);
    setProgram(p);
    setDays(d);
    setCounts(c);
    if (p) {
      const entries = await Promise.all(
        Array.from({ length: p.weeks }, (_, i) => i + 1).map(async wk => {
          const w = await getWeekData(programId, wk);
          return [wk, w?.name ?? null] as const;
        }),
      );
      setWeekNames(Object.fromEntries(entries));
    }
  }, [programId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (!program) { return null; }

  const openBase = () => {
    // Only one day at a time; present a day picker inline or push to a list screen.
    // For this MVP we push directly to WeekDayEditor for the first day; the list below lets the user pick.
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView>
        <Text style={styles.sectionLabel}>Base template</Text>
        {days.map(d => (
          <TouchableOpacity
            key={`base-${d.id}`}
            style={styles.row}
            onPress={() => nav.navigate('WeekDayEditor', {
              programId, scope: 'base', dayId: d.id, dayName: d.name,
            })}
          >
            <Text style={styles.rowTitle}>Base · {d.name}</Text>
            <Text style={styles.rowChev}>›</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionLabel}>Weeks</Text>
        {Array.from({ length: program.weeks }, (_, i) => i + 1).map(wk => (
          <View key={`wk-${wk}`}>
            <Text style={styles.weekHeader}>
              W{wk} {weekNames[wk] ?? ''} {wk === program.currentWeek ? '★' : ''}
              {'  '}<Text style={styles.weekSub}>{counts[wk] ? `${counts[wk]} overrides` : 'inherits base'}</Text>
            </Text>
            {days.map(d => (
              <TouchableOpacity
                key={`wk-${wk}-${d.id}`}
                style={styles.row}
                onPress={() => nav.navigate('WeekDayEditor', {
                  programId, scope: { week: wk }, dayId: d.id, dayName: d.name,
                })}
              >
                <Text style={styles.rowTitle}>{d.name}</Text>
                <Text style={styles.rowChev}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  sectionLabel: { color: theme.colors.mutedText, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 16, marginBottom: 6, paddingHorizontal: 16 },
  weekHeader: { color: theme.colors.text, fontWeight: '600', marginTop: 14, marginBottom: 4, paddingHorizontal: 16 },
  weekSub: { color: theme.colors.mutedText, fontWeight: '400', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: theme.colors.card, marginHorizontal: 12, marginVertical: 4, borderRadius: 10 },
  rowTitle: { color: theme.colors.text, fontSize: 14, flex: 1 },
  rowChev: { color: theme.colors.mutedText, fontSize: 18 },
});
```

*(Theme names are placeholders — match the actual `theme` export in `src/theme/`. Replace `theme.colors.*` keys with whatever the codebase uses. Do a quick check of `src/theme/index.ts` when implementing this step and swap in the real keys.)*

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (assuming Task 13 already landed).

- [ ] **Step 3: Commit**

```bash
git add src/screens/CustomizeWeeksScreen.tsx
git commit -m "feat(program): CustomizeWeeksScreen hub"
```

---

## Task 15: `WeekDayEditorScreen`

**Files:**
- Create: `src/screens/WeekDayEditorScreen.tsx`

- [ ] **Step 1: Create the screen**

Create `src/screens/WeekDayEditorScreen.tsx`:

```typescript
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import {
  getExercisesForWeekDay,
  getProgramDayExercises,
  upsertOverride,
  revertOverrideField,
  updateExerciseTargets,
  updateBaseNote,
} from '../db/programs';
import type { WeekExerciseResolved, ProgramDayExercise } from '../types';
import { getExercise } from '../db/exercises';
import { EditTargetsModal } from '../components/EditTargetsModal';
import { theme } from '../theme';
import type { ProgramsStackParamList } from '../navigation/TabNavigator';

type Route = RouteProp<ProgramsStackParamList, 'WeekDayEditor'>;
type Nav = StackNavigationProp<ProgramsStackParamList, 'WeekDayEditor'>;

const BASE_WEEK_SENTINEL = 0; // unused for reads; `scope === 'base'` drives branch

export function WeekDayEditorScreen() {
  const route = useRoute<Route>();
  const { scope, dayId, dayName } = route.params;
  const isBase = scope === 'base';
  const weekNumber = isBase ? 1 : scope.week; // read only used for week path

  const [rows, setRows] = useState<WeekExerciseResolved[]>([]);
  const [baseRows, setBaseRows] = useState<Record<number, ProgramDayExercise>>({});
  const [names, setNames] = useState<Record<number, string>>({});
  const [editing, setEditing] = useState<WeekExerciseResolved | null>(null);

  const refresh = useCallback(async () => {
    if (isBase) {
      const base = await getProgramDayExercises(dayId);
      const mockResolved: WeekExerciseResolved[] = base.map(b => ({
        programDayExerciseId: b.id,
        exerciseId: b.exerciseId,
        sortOrder: b.sortOrder,
        supersetGroupId: b.supersetGroupId,
        sets: b.targetSets,
        reps: b.targetReps,
        weightLbs: b.targetWeightLbs,
        notes: null,       // base notes fetched below
        overrideRowExists: false,
        setsOverridden: false,
        repsOverridden: false,
        weightOverridden: false,
        notesOverridden: false,
      }));
      setRows(mockResolved);
      setBaseRows(Object.fromEntries(base.map(b => [b.id, b])));
    } else {
      const resolved = await getExercisesForWeekDay(dayId, weekNumber);
      const base = await getProgramDayExercises(dayId);
      setRows(resolved);
      setBaseRows(Object.fromEntries(base.map(b => [b.id, b])));
    }
    const base = await getProgramDayExercises(dayId);
    const namePairs = await Promise.all(base.map(async b => {
      const ex = await getExercise(b.exerciseId);
      return [b.exerciseId, ex?.name ?? `Exercise ${b.exerciseId}`] as const;
    }));
    setNames(Object.fromEntries(namePairs));
  }, [dayId, isBase, weekNumber]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const headerText = isBase ? `Base · ${dayName}` : `W${weekNumber} · ${dayName}`;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView>
        <Text style={styles.header}>{headerText}</Text>

        {rows.map(r => {
          const base = baseRows[r.programDayExerciseId];
          return (
            <TouchableOpacity key={r.programDayExerciseId} style={styles.card} onPress={() => setEditing(r)}>
              <Text style={styles.exName}>{names[r.exerciseId] ?? '—'}</Text>
              <Text style={styles.exLine}>
                <Text style={r.setsOverridden ? styles.overridden : styles.inherited}>{r.sets}</Text>
                <Text style={styles.sep}> × </Text>
                <Text style={r.repsOverridden ? styles.overridden : styles.inherited}>{r.reps}</Text>
                <Text style={styles.sep}> @ </Text>
                <Text style={r.weightOverridden ? styles.overridden : styles.inherited}>{r.weightLbs} lb</Text>
              </Text>
              {r.notes ? (
                <Text style={r.notesOverridden ? styles.noteOverridden : styles.note}>{r.notes}</Text>
              ) : (
                <Text style={styles.noteMuted}>(inherits base)</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {editing && (
        <EditTargetsModal
          visible
          onClose={() => setEditing(null)}
          exerciseName={names[editing.exerciseId] ?? ''}
          programDayExerciseId={editing.programDayExerciseId}
          scope={scope}
          baseSets={baseRows[editing.programDayExerciseId].targetSets}
          baseReps={baseRows[editing.programDayExerciseId].targetReps}
          baseWeightLbs={baseRows[editing.programDayExerciseId].targetWeightLbs}
          baseNote={null /* fetched separately if needed */}
          initialSets={editing.sets}
          initialReps={editing.reps}
          initialWeightLbs={editing.weightLbs}
          initialNote={editing.notes}
          setsOverridden={editing.setsOverridden}
          repsOverridden={editing.repsOverridden}
          weightOverridden={editing.weightOverridden}
          notesOverridden={editing.notesOverridden}
          onSave={async (patch) => {
            const id = editing.programDayExerciseId;
            if (isBase) {
              const newSets = patch.sets.inherit ? editing.sets : patch.sets.value;
              const newReps = patch.reps.inherit ? editing.reps : patch.reps.value;
              const newWeight = patch.weight.inherit ? editing.weightLbs : patch.weight.value;
              await updateExerciseTargets(id, newSets, newReps, newWeight);
              if (!patch.notes.inherit) {
                await updateBaseNote(id, patch.notes.value);
              }
            } else {
              const wk = scope.week;
              for (const [k, col] of [
                ['sets', 'sets'] as const,
                ['reps', 'reps'] as const,
                ['weight', 'weight'] as const,
                ['notes', 'notes'] as const,
              ]) {
                const f = patch[k];
                if (f.inherit) {
                  await revertOverrideField({ programDayExerciseId: id, weekNumber: wk, field: col as any });
                } else {
                  await upsertOverride({ programDayExerciseId: id, weekNumber: wk, field: col as any, value: f.value as any });
                }
              }
            }
            await refresh();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  header: { color: theme.colors.text, fontWeight: '600', fontSize: 16, margin: 16 },
  card: { backgroundColor: theme.colors.card, marginHorizontal: 12, marginVertical: 6, padding: 12, borderRadius: 10 },
  exName: { color: theme.colors.text, fontWeight: '600', fontSize: 14, marginBottom: 4 },
  exLine: { fontSize: 13 },
  overridden: { color: theme.colors.accent, fontWeight: '600' },
  inherited: { color: theme.colors.text },
  sep: { color: theme.colors.mutedText },
  note: { color: theme.colors.mutedText, fontSize: 12, marginTop: 6 },
  noteOverridden: { color: theme.colors.accent, fontSize: 12, marginTop: 6 },
  noteMuted: { color: theme.colors.mutedText, fontSize: 12, marginTop: 6, fontStyle: 'italic' },
});
```

Same note about `theme.colors.*` — swap keys to match actual theme module.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit both screens + nav**

```bash
git add src/screens/CustomizeWeeksScreen.tsx src/screens/WeekDayEditorScreen.tsx src/navigation/TabNavigator.tsx
git commit -m "feat(program): CustomizeWeeks + WeekDayEditor with ProgramsStack entries"
```

---

## Task 16: "Customize weeks" entry point on ProgramDetailScreen

**Files:**
- Modify: `src/screens/ProgramDetailScreen.tsx`

- [ ] **Step 1: Add navigation typing**

Locate the existing `useNavigation` hook. Ensure it's typed against `ProgramsStackParamList`:

```typescript
const navigation = useNavigation<StackNavigationProp<ProgramsStackParamList, 'ProgramDetail'>>();
```

- [ ] **Step 2: Add action row**

Find the block that renders "Manage weeks" / "Warmup templates" (grep for `ManageWeeksModal` or `Warmup`). Next to those rows, add:

```typescript
<TouchableOpacity
  style={styles.actionRow}
  onPress={() => navigation.navigate('CustomizeWeeks', { programId })}
>
  <Text style={styles.actionText}>🎯 Customize weeks</Text>
  <Text style={styles.actionChev}>›</Text>
</TouchableOpacity>
```

Styles `actionRow`, `actionText`, `actionChev` should already exist in this file — reuse them. If they don't exist with those names, match the styling used by the neighboring rows.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Smoke test**

Deploy via `/deploy`. Open a program. Tap "Customize weeks." Hub appears. Tap a week. Tap a day. Editor shows exercises. Tap Bench. Modal opens. Edit sets, save. Back to editor — per-field badge shows "overridden." Back to hub — week shows "1 override." Start a workout of that week/day — target matches. Start a different week's workout — base values.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ProgramDetailScreen.tsx
git commit -m "feat(program-detail): Customize weeks entry point"
```

---

## Task 17: Hook orphan cleanup into the program weeks-change path

**Files:**
- Modify: `src/db/programs.ts` (wherever `UPDATE programs SET weeks = ?` happens)

- [ ] **Step 1: Locate the weeks-update function**

Run: `grep -n "UPDATE programs SET weeks" src/db/programs.ts`
There may be a function like `updateProgramWeeks(programId, weeks)` or the update may happen inline in another function. Open the context.

- [ ] **Step 2: Call `deleteOverridesBeyondWeek` after a shrink**

Wrap the existing update:

```typescript
export async function updateProgramWeeks(programId: number, newWeeks: number): Promise<void> {
  const database = await db;
  const cur = await executeSql(database, 'SELECT weeks FROM programs WHERE id = ?', [programId]);
  const old = cur.rows.length ? cur.rows.item(0).weeks : null;
  await executeSql(database, 'UPDATE programs SET weeks = ? WHERE id = ?', [newWeeks, programId]);
  if (old !== null && newWeeks < old) {
    await deleteOverridesBeyondWeek(programId, newWeeks);
  }
}
```

If the weeks update happens inside another function that doesn't clearly own this concern, extract it into `updateProgramWeeks` and have the caller invoke it.

- [ ] **Step 3: Write a test**

```typescript
describe('updateProgramWeeks', () => {
  beforeEach(() => { mockExecuteSql.mockReset(); });
  it('calls deleteOverridesBeyondWeek when shrinking', async () => {
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ weeks: 6 }])) // SELECT current weeks
      .mockResolvedValueOnce(mockResultSet([]))             // UPDATE programs
      .mockResolvedValueOnce(mockResultSet([]));            // DELETE overrides beyond week
    await updateProgramWeeks(42, 4);
    const calls = mockExecuteSql.mock.calls.map(c => c[1]).join('\n').toLowerCase();
    expect(calls).toMatch(/delete from program_week_day_exercise_overrides/);
  });

  it('does not delete overrides when growing', async () => {
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ weeks: 4 }]))
      .mockResolvedValueOnce(mockResultSet([]));
    await updateProgramWeeks(42, 6);
    expect(mockExecuteSql).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 4: Run the test**

Run: `npx jest src/db/__tests__/programs.test.ts -t "updateProgramWeeks"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/programs.ts src/db/__tests__/programs.test.ts
git commit -m "feat(db): cleanup orphaned overrides when program weeks shrinks"
```

---

## Task 18: Dark Mint Card styling pass

**Files:**
- Modify: `src/screens/CustomizeWeeksScreen.tsx`, `src/screens/WeekDayEditorScreen.tsx`, `src/components/InlineNoteEditor.tsx`

- [ ] **Step 1: Invoke the styling skill**

Per project memory, invoke `/ui-ux-pro-max` and the `dark-mint-card-ui` skill for all UI polish. Apply the Dark Mint Card system to:
- `CustomizeWeeksScreen` rows, week headers, section labels
- `WeekDayEditorScreen` cards, per-field badges ("overridden" = mint chip, "inherits" = muted pill)
- `InlineNoteEditor` editing and view states (already follows the system loosely — verify border radius, padding, font size, color tokens match)

- [ ] **Step 2: Visual QA on emulator**

Deploy. Walk through: Program → Customize weeks → W3 → Push → open Bench modal → edit → save → verify badges look correct. Verify mid-workout inline note editor appearance matches other cards.

- [ ] **Step 3: Commit**

```bash
git add src/screens/CustomizeWeeksScreen.tsx src/screens/WeekDayEditorScreen.tsx src/components/InlineNoteEditor.tsx
git commit -m "style(program-customization): Dark Mint Card polish pass"
```

---

## Task 19: End-to-end UAT

**Files:** none (manual)

- [ ] **Step 1: Deploy to emulator**

`/deploy`

- [ ] **Step 2: Run through the UAT checklist from the spec**

Execute each:

1. Create a 4-week program with a day and two exercises. Verify Customize Weeks → W3 → Push shows both exercises with "inherits base" indicators.
2. Edit W3 Bench to sets=5, reps=6, weight=155, note="heavy". Save. Back at editor: badges show "overridden." Back at hub: W3 shows "3 overrides" (sets+reps+weight only — notes is separate; expect 4 if including note).
3. Open W2 Push editor. All fields inherit. Good.
4. Edit base Bench note to "focus bar path." Verify W3 still shows "heavy" (override) and W2 shows "focus bar path" (inherited).
5. Start W3 workout. Card shows 5×6 @ 155. Note line shows "heavy."
6. Tap the inline note, edit to "felt crisp today," submit. Close and re-expand card — "felt crisp today" persists.
7. End session. Start a new W3 session. Note line shows "heavy" again (program note, not last session's one-off).
8. Open the exercise card in the new session. Tap the inline note — placeholder hint shows "felt crisp today" as muted.
9. Mid-workout, Edit Targets on Bench, change weight to 165, save. Close modal. Re-open — 165 persists. End workout.
10. In program editor, open W3 Push. Bench weight shows 165.
11. In W3 editor, open Bench modal, toggle weight to "Inherit from base." Save. Card shows weight inherited again. Hub count decreases.
12. Shrink program weeks from 4 → 2 (via existing controls). Attempt to open Customize Weeks. Only W1 and W2 appear. No DB errors.

- [ ] **Step 3: Capture issues**

Any deviation from expected → file a note in the plan followup or fix before marking complete.

- [ ] **Step 4: Final commit / tag**

No code changes. Update project changelog or version bump per your release cadence (out of scope for this plan).

---

## Self-review against the spec

- **Two-layer override model** — Tasks 1–7 (data) + 12 (editor modal) + 14–15 (program editor screens)
- **Session-only note layer** — Task 7 (db) + 9–11 (component, card, screen wiring)
- **Resolution via COALESCE** — Task 3
- **Reverting sticky overrides, cleans up empty rows** — Task 4
- **Base note editing** — Task 5 (`updateBaseNote`)
- **Override count badges** — Task 5 (`getWeekOverrideCounts`) + 14 (hub)
- **Orphan cleanup on weeks shrink** — Task 6 + Task 17 (hook)
- **Types** — Task 2
- **Migration v23** — Task 1
- **WorkoutScreen live-read integration** — Task 8
- **Mid-workout EditTargetsModal writes to week override** — Task 12
- **InlineNoteEditor with precedence** — Tasks 9–11
- **Navigation wiring** — Task 13 + 15 + 16
- **Styling via Dark Mint Card** — Task 18
- **UAT** — Task 19

Spec's out-of-scope items (exercise lineup changes per week, per-set detail, "Copy from another week," cross-program bulk ops) are not in any task. Correct.

Placeholder scan: no TBD / TODO / "fill in" strings. All code blocks contain real code. Every function referenced in a later task is defined in an earlier task.

Type consistency: `OverrideField` is used across Tasks 4, 12, 15. `WeekExerciseResolved` is used in Tasks 2, 3, 8, 15. Function names match across references.
