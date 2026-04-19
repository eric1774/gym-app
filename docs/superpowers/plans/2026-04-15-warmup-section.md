# Warmup Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a warmup section to active workout sessions with reusable templates, complete isolation from analytics, and program day integration.

**Architecture:** Five new database tables completely isolate warmup data from existing volume/PR/history queries. A new `WarmupSection` component renders at the top of `WorkoutScreen` with three states (expanded/collapsed/dismissed). Warmup templates are managed in a new "Warmups" sub-tab in the Library tab, and can be baked into program days or attached at session start.

**Tech Stack:** React Native, react-native-sqlite-storage, React Context, PanResponder (swipe-to-delete), Animated (transitions)

**Spec:** `docs/superpowers/specs/2026-04-15-warmup-section-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `src/db/warmups.ts` | All warmup CRUD: exercises, templates, template items, session items |
| `src/db/__tests__/warmups.test.ts` | Unit tests for warmups DB layer |
| `src/components/WarmupItemRow.tsx` | Single warmup item row with tap-to-complete |
| `src/components/WarmupSection.tsx` | Warmup section in active workout (expanded/collapsed/dismissed) |
| `src/components/WarmupTemplatePicker.tsx` | Modal for selecting a warmup template |
| `src/components/AddWarmupItemModal.tsx` | Two-tab modal for adding items to a template |
| `src/components/CreateWarmupExerciseModal.tsx` | Form for creating a new warmup-only exercise |
| `src/screens/WarmupTemplateListScreen.tsx` | List of warmup templates in Library > Warmups tab |
| `src/screens/WarmupTemplateDetailScreen.tsx` | Template editor with reorderable item list |
| `src/navigation/LibraryStackNavigator.tsx` | Stack navigator for Library tab (replaces direct LibraryScreen) |

### Modified Files
| File | Change |
|------|--------|
| `src/types/index.ts` | Add warmup domain types |
| `src/db/schema.ts` | Add CREATE TABLE constants for 4 warmup tables |
| `src/db/migrations.ts` | Add migration v22 (create tables + ALTER program_days) |
| `src/db/programs.ts` | Add warmup_template_id getter/setter for program days |
| `src/context/SessionContext.tsx` | Add warmup state, loadWarmupTemplate, toggle/collapse/dismiss |
| `src/screens/WorkoutScreen.tsx` | Insert WarmupSection above exercises, add "Add Warmup" menu option |
| `src/screens/DayDetailScreen.tsx` | Add warmup badge section + attach/change picker |
| `src/screens/LibraryScreen.tsx` | Add sub-tab bar (Exercises / Warmups) |
| `src/navigation/TabNavigator.tsx` | Replace LibraryScreen with LibraryStackNavigator |

---

## Task 1: Types & Schema Constants

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add warmup types to `src/types/index.ts`**

Add before the `export * from './gamification';` line at the bottom:

```typescript
// -- Warmup domain types --

export type WarmupTrackingType = 'checkbox' | 'reps' | 'duration';

export interface WarmupExercise {
  id: number;
  name: string;
  trackingType: WarmupTrackingType;
  defaultValue: number | null;
  isCustom: boolean;
  createdAt: string;
}

export interface WarmupTemplate {
  id: number;
  name: string;
  createdAt: string;
}

export interface WarmupTemplateItem {
  id: number;
  templateId: number;
  exerciseId: number | null;
  warmupExerciseId: number | null;
  trackingType: WarmupTrackingType;
  targetValue: number | null;
  sortOrder: number;
}

/** Extended template item with resolved display name for UI rendering. */
export interface WarmupTemplateItemWithName extends WarmupTemplateItem {
  displayName: string;
  /** 'library' if exercise_id is set, 'warmup' if warmup_exercise_id is set */
  source: 'library' | 'warmup';
}

export interface WarmupSessionItem {
  id: number;
  sessionId: number;
  exerciseId: number | null;
  warmupExerciseId: number | null;
  displayName: string;
  trackingType: WarmupTrackingType;
  targetValue: number | null;
  isComplete: boolean;
  sortOrder: number;
}
```

- [ ] **Step 2: Add schema constants to `src/db/schema.ts`**

Add at the bottom of the file:

```typescript
// ── Warmup tables ──────────────────────────────────────────────────

export const CREATE_WARMUP_EXERCISES_TABLE = `
  CREATE TABLE IF NOT EXISTS warmup_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tracking_type TEXT NOT NULL,
    default_value INTEGER,
    is_custom INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )
`;

export const CREATE_WARMUP_TEMPLATES_TABLE = `
  CREATE TABLE IF NOT EXISTS warmup_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`;

export const CREATE_WARMUP_TEMPLATE_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS warmup_template_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES warmup_templates(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id),
    warmup_exercise_id INTEGER REFERENCES warmup_exercises(id),
    tracking_type TEXT NOT NULL,
    target_value INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0
  )
`;

export const CREATE_WARMUP_SESSION_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS warmup_session_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id),
    warmup_exercise_id INTEGER REFERENCES warmup_exercises(id),
    display_name TEXT NOT NULL,
    tracking_type TEXT NOT NULL,
    target_value INTEGER,
    is_complete INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  )
`;
```

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts src/db/schema.ts
git commit -m "feat(warmup): add warmup domain types and schema constants"
```

---

## Task 2: Migration v22

**Files:**
- Modify: `src/db/migrations.ts`

- [ ] **Step 1: Add migration v22 to the MIGRATIONS array**

Add after the last migration (v21) in the `MIGRATIONS` array in `src/db/migrations.ts`. Import the new schema constants at the top:

```typescript
// Add to imports at top of file:
import {
  // ... existing imports ...
  CREATE_WARMUP_EXERCISES_TABLE,
  CREATE_WARMUP_TEMPLATES_TABLE,
  CREATE_WARMUP_TEMPLATE_ITEMS_TABLE,
  CREATE_WARMUP_SESSION_ITEMS_TABLE,
} from './schema';
```

Add the migration entry:

```typescript
{
  version: 22,
  description: 'Add warmup exercises, templates, template items, session items tables; add warmup_template_id to program_days',
  up: (tx: Transaction) => {
    tx.executeSql(CREATE_WARMUP_EXERCISES_TABLE);
    tx.executeSql(CREATE_WARMUP_TEMPLATES_TABLE);
    tx.executeSql(CREATE_WARMUP_TEMPLATE_ITEMS_TABLE);
    tx.executeSql(CREATE_WARMUP_SESSION_ITEMS_TABLE);
    tx.executeSql(
      'ALTER TABLE program_days ADD COLUMN warmup_template_id INTEGER REFERENCES warmup_templates(id)',
    );
  },
},
```

- [ ] **Step 2: Commit**

```bash
git add src/db/migrations.ts
git commit -m "feat(warmup): add migration v22 for warmup tables"
```

---

## Task 3: DB Layer — Warmup Exercises & Templates CRUD

**Files:**
- Create: `src/db/warmups.ts`

- [ ] **Step 1: Create `src/db/warmups.ts` with row mappers and warmup exercise CRUD**

```typescript
import { db, executeSql } from './database';
import {
  WarmupExercise,
  WarmupTemplate,
  WarmupTemplateItem,
  WarmupTemplateItemWithName,
  WarmupSessionItem,
  WarmupTrackingType,
} from '../types';

// ── Row Mappers ────────────────────────────────────────────────────

function rowToWarmupExercise(row: {
  id: number;
  name: string;
  tracking_type: string;
  default_value: number | null;
  is_custom: number;
  created_at: string;
}): WarmupExercise {
  return {
    id: row.id,
    name: row.name,
    trackingType: row.tracking_type as WarmupTrackingType,
    defaultValue: row.default_value,
    isCustom: row.is_custom === 1,
    createdAt: row.created_at,
  };
}

function rowToWarmupTemplate(row: {
  id: number;
  name: string;
  created_at: string;
}): WarmupTemplate {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

function rowToWarmupTemplateItem(row: {
  id: number;
  template_id: number;
  exercise_id: number | null;
  warmup_exercise_id: number | null;
  tracking_type: string;
  target_value: number | null;
  sort_order: number;
}): WarmupTemplateItem {
  return {
    id: row.id,
    templateId: row.template_id,
    exerciseId: row.exercise_id,
    warmupExerciseId: row.warmup_exercise_id,
    trackingType: row.tracking_type as WarmupTrackingType,
    targetValue: row.target_value,
    sortOrder: row.sort_order,
  };
}

function rowToWarmupSessionItem(row: {
  id: number;
  session_id: number;
  exercise_id: number | null;
  warmup_exercise_id: number | null;
  display_name: string;
  tracking_type: string;
  target_value: number | null;
  is_complete: number;
  sort_order: number;
}): WarmupSessionItem {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    warmupExerciseId: row.warmup_exercise_id,
    displayName: row.display_name,
    trackingType: row.tracking_type as WarmupTrackingType,
    targetValue: row.target_value,
    isComplete: row.is_complete === 1,
    sortOrder: row.sort_order,
  };
}

// ── Warmup Exercises ───────────────────────────────────────────────

export async function getWarmupExercises(): Promise<WarmupExercise[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM warmup_exercises ORDER BY name ASC',
    [],
  );
  const items: WarmupExercise[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    items.push(rowToWarmupExercise(result.rows.item(i)));
  }
  return items;
}

export async function searchWarmupExercises(
  query: string,
): Promise<WarmupExercise[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM warmup_exercises WHERE name LIKE ? ORDER BY name ASC',
    [`%${query}%`],
  );
  const items: WarmupExercise[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    items.push(rowToWarmupExercise(result.rows.item(i)));
  }
  return items;
}

export async function createWarmupExercise(
  name: string,
  trackingType: WarmupTrackingType,
  defaultValue?: number | null,
): Promise<WarmupExercise> {
  const database = await db;
  const now = new Date().toISOString();
  const insertResult = await executeSql(
    database,
    'INSERT INTO warmup_exercises (name, tracking_type, default_value, is_custom, created_at) VALUES (?, ?, ?, 1, ?)',
    [name, trackingType, defaultValue ?? null, now],
  );
  const selectResult = await executeSql(
    database,
    'SELECT * FROM warmup_exercises WHERE id = ?',
    [insertResult.insertId],
  );
  return rowToWarmupExercise(selectResult.rows.item(0));
}

export async function deleteWarmupExercise(id: number): Promise<void> {
  const database = await db;
  await executeSql(database, 'DELETE FROM warmup_exercises WHERE id = ?', [id]);
}

// ── Warmup Templates ───────────────────────────────────────────────

export async function getWarmupTemplates(): Promise<WarmupTemplate[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM warmup_templates ORDER BY created_at DESC',
    [],
  );
  const items: WarmupTemplate[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    items.push(rowToWarmupTemplate(result.rows.item(i)));
  }
  return items;
}

export async function createWarmupTemplate(
  name: string,
): Promise<WarmupTemplate> {
  const database = await db;
  const now = new Date().toISOString();
  const insertResult = await executeSql(
    database,
    'INSERT INTO warmup_templates (name, created_at) VALUES (?, ?)',
    [name, now],
  );
  const selectResult = await executeSql(
    database,
    'SELECT * FROM warmup_templates WHERE id = ?',
    [insertResult.insertId],
  );
  return rowToWarmupTemplate(selectResult.rows.item(0));
}

export async function updateWarmupTemplateName(
  id: number,
  name: string,
): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE warmup_templates SET name = ? WHERE id = ?',
    [name, id],
  );
}

export async function deleteWarmupTemplate(id: number): Promise<void> {
  const database = await db;
  await executeSql(database, 'DELETE FROM warmup_templates WHERE id = ?', [id]);
}

// ── Warmup Template Items ──────────────────────────────────────────

export async function getWarmupTemplateWithItems(
  templateId: number,
): Promise<{ template: WarmupTemplate; items: WarmupTemplateItemWithName[] }> {
  const database = await db;
  const templateResult = await executeSql(
    database,
    'SELECT * FROM warmup_templates WHERE id = ?',
    [templateId],
  );
  const template = rowToWarmupTemplate(templateResult.rows.item(0));

  const itemsResult = await executeSql(
    database,
    `SELECT wti.*,
       COALESCE(e.name, we.name) AS display_name,
       CASE WHEN wti.exercise_id IS NOT NULL THEN 'library' ELSE 'warmup' END AS source
     FROM warmup_template_items wti
     LEFT JOIN exercises e ON wti.exercise_id = e.id
     LEFT JOIN warmup_exercises we ON wti.warmup_exercise_id = we.id
     WHERE wti.template_id = ?
     ORDER BY wti.sort_order ASC`,
    [templateId],
  );
  const items: WarmupTemplateItemWithName[] = [];
  for (let i = 0; i < itemsResult.rows.length; i++) {
    const row = itemsResult.rows.item(i);
    items.push({
      ...rowToWarmupTemplateItem(row),
      displayName: row.display_name,
      source: row.source as 'library' | 'warmup',
    });
  }
  return { template, items };
}

/** Returns item count and first 3 item names for template list preview. */
export async function getWarmupTemplatePreview(
  templateId: number,
): Promise<{ itemCount: number; previewNames: string[] }> {
  const database = await db;
  const countResult = await executeSql(
    database,
    'SELECT COUNT(*) as cnt FROM warmup_template_items WHERE template_id = ?',
    [templateId],
  );
  const itemCount = countResult.rows.item(0).cnt as number;

  const namesResult = await executeSql(
    database,
    `SELECT COALESCE(e.name, we.name) AS display_name
     FROM warmup_template_items wti
     LEFT JOIN exercises e ON wti.exercise_id = e.id
     LEFT JOIN warmup_exercises we ON wti.warmup_exercise_id = we.id
     WHERE wti.template_id = ?
     ORDER BY wti.sort_order ASC
     LIMIT 3`,
    [templateId],
  );
  const previewNames: string[] = [];
  for (let i = 0; i < namesResult.rows.length; i++) {
    previewNames.push(namesResult.rows.item(i).display_name);
  }
  return { itemCount, previewNames };
}

export async function addWarmupTemplateItem(
  templateId: number,
  exerciseId: number | null,
  warmupExerciseId: number | null,
  trackingType: WarmupTrackingType,
  targetValue: number | null,
): Promise<WarmupTemplateItem> {
  const database = await db;
  // Get next sort order
  const maxResult = await executeSql(
    database,
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM warmup_template_items WHERE template_id = ?',
    [templateId],
  );
  const sortOrder = maxResult.rows.item(0).next_order as number;

  const insertResult = await executeSql(
    database,
    `INSERT INTO warmup_template_items
       (template_id, exercise_id, warmup_exercise_id, tracking_type, target_value, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [templateId, exerciseId, warmupExerciseId, trackingType, targetValue, sortOrder],
  );
  const selectResult = await executeSql(
    database,
    'SELECT * FROM warmup_template_items WHERE id = ?',
    [insertResult.insertId],
  );
  return rowToWarmupTemplateItem(selectResult.rows.item(0));
}

export async function removeWarmupTemplateItem(id: number): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'DELETE FROM warmup_template_items WHERE id = ?',
    [id],
  );
}

export async function reorderWarmupTemplateItems(
  templateId: number,
  itemIds: number[],
): Promise<void> {
  const database = await db;
  for (let i = 0; i < itemIds.length; i++) {
    await executeSql(
      database,
      'UPDATE warmup_template_items SET sort_order = ? WHERE id = ? AND template_id = ?',
      [i, itemIds[i], templateId],
    );
  }
}

// ── Warmup Session Items ───────────────────────────────────────────

/**
 * Load a warmup template into an active session. Creates warmup_session_items
 * rows by snapshotting the template items with resolved display names.
 */
export async function loadWarmupIntoSession(
  sessionId: number,
  templateId: number,
): Promise<WarmupSessionItem[]> {
  const database = await db;

  // Clear any existing warmup items for this session
  await executeSql(
    database,
    'DELETE FROM warmup_session_items WHERE session_id = ?',
    [sessionId],
  );

  // Read template items with resolved names
  const itemsResult = await executeSql(
    database,
    `SELECT wti.*,
       COALESCE(e.name, we.name) AS display_name
     FROM warmup_template_items wti
     LEFT JOIN exercises e ON wti.exercise_id = e.id
     LEFT JOIN warmup_exercises we ON wti.warmup_exercise_id = we.id
     WHERE wti.template_id = ?
     ORDER BY wti.sort_order ASC`,
    [templateId],
  );

  const sessionItems: WarmupSessionItem[] = [];
  for (let i = 0; i < itemsResult.rows.length; i++) {
    const row = itemsResult.rows.item(i);
    const insertResult = await executeSql(
      database,
      `INSERT INTO warmup_session_items
         (session_id, exercise_id, warmup_exercise_id, display_name, tracking_type, target_value, is_complete, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        sessionId,
        row.exercise_id,
        row.warmup_exercise_id,
        row.display_name,
        row.tracking_type,
        row.target_value,
        row.sort_order,
      ],
    );
    const selectResult = await executeSql(
      database,
      'SELECT * FROM warmup_session_items WHERE id = ?',
      [insertResult.insertId],
    );
    sessionItems.push(rowToWarmupSessionItem(selectResult.rows.item(0)));
  }
  return sessionItems;
}

export async function getWarmupSessionItems(
  sessionId: number,
): Promise<WarmupSessionItem[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM warmup_session_items WHERE session_id = ? ORDER BY sort_order ASC',
    [sessionId],
  );
  const items: WarmupSessionItem[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    items.push(rowToWarmupSessionItem(result.rows.item(i)));
  }
  return items;
}

export async function toggleWarmupSessionItemComplete(
  id: number,
): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE warmup_session_items SET is_complete = CASE WHEN is_complete = 0 THEN 1 ELSE 0 END WHERE id = ?',
    [id],
  );
}

export async function clearWarmupSessionItems(
  sessionId: number,
): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'DELETE FROM warmup_session_items WHERE session_id = ?',
    [sessionId],
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/db/warmups.ts
git commit -m "feat(warmup): add warmups DB layer with full CRUD"
```

---

## Task 4: DB Layer — Program Day Warmup Template ID

**Files:**
- Modify: `src/db/programs.ts`

- [ ] **Step 1: Add warmup_template_id functions to `src/db/programs.ts`**

Add these three functions at the bottom of the file:

```typescript
// ── Warmup Template ID for Program Days ────────────────────────────

export async function getWarmupTemplateIdForDay(
  dayId: number,
): Promise<number | null> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT warmup_template_id FROM program_days WHERE id = ?',
    [dayId],
  );
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows.item(0).warmup_template_id ?? null;
}

export async function setWarmupTemplateIdForDay(
  dayId: number,
  templateId: number,
): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE program_days SET warmup_template_id = ? WHERE id = ?',
    [templateId, dayId],
  );
}

export async function clearWarmupTemplateIdForDay(
  dayId: number,
): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE program_days SET warmup_template_id = NULL WHERE id = ?',
    [dayId],
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/db/programs.ts
git commit -m "feat(warmup): add warmup_template_id getters/setters for program days"
```

---

## Task 5: DB Tests for Warmups

**Files:**
- Create: `src/db/__tests__/warmups.test.ts`

- [ ] **Step 1: Create test file with warmup exercise and template tests**

Follow the existing test pattern from `src/db/__tests__/sessions.test.ts` — mock database, use `mockResultSet`:

```typescript
jest.mock('../database');

import { executeSql } from '../database';
import { mockResultSet } from '@test-utils/dbMock';
import {
  getWarmupExercises,
  createWarmupExercise,
  deleteWarmupExercise,
  searchWarmupExercises,
  getWarmupTemplates,
  createWarmupTemplate,
  deleteWarmupTemplate,
  updateWarmupTemplateName,
  addWarmupTemplateItem,
  removeWarmupTemplateItem,
  getWarmupSessionItems,
  toggleWarmupSessionItemComplete,
  clearWarmupSessionItems,
  loadWarmupIntoSession,
} from '../warmups';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;
const mockDb = {};
const dbModule = require('../database');
Object.defineProperty(dbModule, 'db', {
  value: Promise.resolve(mockDb),
  writable: true,
});

// ── Fixtures ────────────────────────────────────────────────────────

const warmupExerciseRow = {
  id: 1,
  name: 'Foam Roll Quads',
  tracking_type: 'duration',
  default_value: 120,
  is_custom: 1,
  created_at: '2026-04-15T10:00:00.000Z',
};

const warmupTemplateRow = {
  id: 1,
  name: 'Upper Body Warmup',
  created_at: '2026-04-15T10:00:00.000Z',
};

const warmupSessionItemRow = {
  id: 1,
  session_id: 10,
  exercise_id: null,
  warmup_exercise_id: 1,
  display_name: 'Foam Roll Quads',
  tracking_type: 'duration',
  target_value: 120,
  is_complete: 0,
  sort_order: 0,
};

// ── Warmup Exercise Tests ───────────────────────────────────────────

describe('getWarmupExercises', () => {
  it('returns all warmup exercises ordered by name', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([warmupExerciseRow]));
    const result = await getWarmupExercises();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Foam Roll Quads');
    expect(result[0].trackingType).toBe('duration');
    expect(result[0].defaultValue).toBe(120);
    expect(result[0].isCustom).toBe(true);
  });
});

describe('searchWarmupExercises', () => {
  it('searches by name with LIKE', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([warmupExerciseRow]));
    const result = await searchWarmupExercises('foam');
    expect(result).toHaveLength(1);
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('LIKE'),
      ['%foam%'],
    );
  });
});

describe('createWarmupExercise', () => {
  it('inserts and returns the new exercise', async () => {
    mockExecuteSql
      .mockResolvedValueOnce({ ...mockResultSet([]), insertId: 5 } as any)
      .mockResolvedValueOnce(mockResultSet([{ ...warmupExerciseRow, id: 5 }]));
    const result = await createWarmupExercise('Arm Circles', 'reps', 10);
    expect(result.id).toBe(5);
    expect(result.name).toBe('Foam Roll Quads'); // from fixture row
    expect(mockExecuteSql).toHaveBeenCalledTimes(2);
  });
});

describe('deleteWarmupExercise', () => {
  it('deletes by id', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await deleteWarmupExercise(1);
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('DELETE'),
      [1],
    );
  });
});

// ── Warmup Template Tests ───────────────────────────────────────────

describe('getWarmupTemplates', () => {
  it('returns templates ordered by created_at DESC', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([warmupTemplateRow]));
    const result = await getWarmupTemplates();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Upper Body Warmup');
  });
});

describe('createWarmupTemplate', () => {
  it('inserts and returns the new template', async () => {
    mockExecuteSql
      .mockResolvedValueOnce({ ...mockResultSet([]), insertId: 3 } as any)
      .mockResolvedValueOnce(mockResultSet([{ ...warmupTemplateRow, id: 3 }]));
    const result = await createWarmupTemplate('Leg Day Warmup');
    expect(result.id).toBe(3);
    expect(mockExecuteSql).toHaveBeenCalledTimes(2);
  });
});

describe('updateWarmupTemplateName', () => {
  it('updates the template name', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await updateWarmupTemplateName(1, 'New Name');
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('UPDATE'),
      ['New Name', 1],
    );
  });
});

describe('deleteWarmupTemplate', () => {
  it('deletes template by id (cascades to items)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await deleteWarmupTemplate(1);
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('DELETE'),
      [1],
    );
  });
});

// ── Warmup Session Items Tests ──────────────────────────────────────

describe('getWarmupSessionItems', () => {
  it('returns items for session ordered by sort_order', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([warmupSessionItemRow]));
    const result = await getWarmupSessionItems(10);
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('Foam Roll Quads');
    expect(result[0].isComplete).toBe(false);
    expect(result[0].trackingType).toBe('duration');
  });
});

describe('toggleWarmupSessionItemComplete', () => {
  it('toggles is_complete with CASE expression', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await toggleWarmupSessionItemComplete(1);
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('CASE'),
      [1],
    );
  });
});

describe('clearWarmupSessionItems', () => {
  it('deletes all items for session', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await clearWarmupSessionItems(10);
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('DELETE'),
      [10],
    );
  });
});

describe('loadWarmupIntoSession', () => {
  it('clears existing items, reads template, inserts session items', async () => {
    // 1. DELETE existing
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    // 2. SELECT template items with names
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        {
          id: 1,
          template_id: 1,
          exercise_id: null,
          warmup_exercise_id: 1,
          tracking_type: 'duration',
          target_value: 120,
          sort_order: 0,
          display_name: 'Foam Roll Quads',
        },
      ]),
    );
    // 3. INSERT session item
    mockExecuteSql.mockResolvedValueOnce({
      ...mockResultSet([]),
      insertId: 100,
    } as any);
    // 4. SELECT inserted item
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ ...warmupSessionItemRow, id: 100 }]),
    );

    const result = await loadWarmupIntoSession(10, 1);
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('Foam Roll Quads');
    expect(mockExecuteSql).toHaveBeenCalledTimes(4);
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npx jest src/db/__tests__/warmups.test.ts --no-coverage
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/db/__tests__/warmups.test.ts
git commit -m "test(warmup): add unit tests for warmups DB layer"
```

---

## Task 6: SessionContext Warmup State

**Files:**
- Modify: `src/context/SessionContext.tsx`

- [ ] **Step 1: Add warmup imports**

Add to the imports at the top of `SessionContext.tsx`:

```typescript
import { WarmupSessionItem } from '../types';
import {
  loadWarmupIntoSession,
  getWarmupSessionItems,
  toggleWarmupSessionItemComplete as dbToggleWarmupItem,
  clearWarmupSessionItems,
} from '../db/warmups';
import { getWarmupTemplateIdForDay } from '../db/programs';
```

- [ ] **Step 2: Extend SessionContextValue interface**

Add these fields to the `SessionContextValue` interface:

```typescript
  /** Warmup items for the active session */
  warmupItems: WarmupSessionItem[];
  /** UI state of the warmup section */
  warmupState: 'none' | 'expanded' | 'collapsed' | 'dismissed';
  /** Load a warmup template into the active session */
  loadWarmupTemplate: (templateId: number) => Promise<void>;
  /** Toggle completion of a warmup item */
  toggleWarmupItemComplete: (itemId: number) => Promise<void>;
  /** Dismiss the warmup section from view */
  dismissWarmup: () => void;
  /** Collapse the warmup section */
  collapseWarmup: () => void;
  /** Expand the warmup section */
  expandWarmup: () => void;
```

- [ ] **Step 3: Add warmup state and functions to SessionProvider**

Inside `SessionProvider`, add the state declarations after the existing ones:

```typescript
  const [warmupItems, setWarmupItems] = useState<WarmupSessionItem[]>([]);
  const [warmupState, setWarmupState] = useState<'none' | 'expanded' | 'collapsed' | 'dismissed'>('none');
```

Add the warmup functions before the `useMemo` call:

```typescript
  const loadWarmupTemplate = useCallback(async (templateId: number) => {
    if (!session) return;
    const items = await loadWarmupIntoSession(session.id, templateId);
    setWarmupItems(items);
    setWarmupState('expanded');
  }, [session]);

  const toggleWarmupItemComplete = useCallback(async (itemId: number) => {
    await dbToggleWarmupItem(itemId);
    setWarmupItems(prev => {
      const updated = prev.map(item =>
        item.id === itemId ? { ...item, isComplete: !item.isComplete } : item,
      );
      // Auto-collapse when all items are complete
      if (updated.every(item => item.isComplete)) {
        setWarmupState('collapsed');
      }
      return updated;
    });
  }, []);

  const dismissWarmup = useCallback(() => {
    setWarmupState('dismissed');
  }, []);

  const collapseWarmup = useCallback(() => {
    setWarmupState('collapsed');
  }, []);

  const expandWarmup = useCallback(() => {
    setWarmupState('expanded');
  }, []);
```

- [ ] **Step 4: Load warmup items on session restore**

In the existing `loadActiveSession` function (the useEffect that runs on mount), after loading session exercises, add:

```typescript
    // Load warmup items if session exists
    if (activeSession) {
      const wItems = await getWarmupSessionItems(activeSession.id);
      setWarmupItems(wItems);
      if (wItems.length > 0) {
        setWarmupState(wItems.every(item => item.isComplete) ? 'collapsed' : 'expanded');
      }
    }
```

- [ ] **Step 5: Auto-load warmup when starting from program day**

In the existing `startSessionFromProgramDay` function, after the loop that adds exercises, add:

```typescript
    // Auto-load warmup template if program day has one
    const warmupTemplateId = await getWarmupTemplateIdForDay(programDayId);
    if (warmupTemplateId) {
      const wItems = await loadWarmupIntoSession(newSession.id, warmupTemplateId);
      setWarmupItems(wItems);
      setWarmupState('expanded');
    }
```

- [ ] **Step 6: Clear warmup state on session end**

In the existing `endSession` function, add these lines alongside where session state is cleared:

```typescript
    setWarmupItems([]);
    setWarmupState('none');
```

- [ ] **Step 7: Add warmup values to the useMemo context value**

Add to the `useMemo` return object:

```typescript
      warmupItems,
      warmupState,
      loadWarmupTemplate,
      toggleWarmupItemComplete,
      dismissWarmup,
      collapseWarmup,
      expandWarmup,
```

And add them to the `useMemo` dependency array.

- [ ] **Step 8: Commit**

```bash
git add src/context/SessionContext.tsx
git commit -m "feat(warmup): add warmup state management to SessionContext"
```

---

## Task 7: WarmupItemRow Component

**Files:**
- Create: `src/components/WarmupItemRow.tsx`

- [ ] **Step 1: Create the WarmupItemRow component**

```typescript
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize } from '../theme/typography';
import { WarmupSessionItem } from '../types';

interface WarmupItemRowProps {
  item: WarmupSessionItem;
  onToggle: (itemId: number) => void;
}

function formatTarget(item: WarmupSessionItem): string {
  if (item.trackingType === 'checkbox' || item.targetValue == null) {
    return '✓';
  }
  if (item.trackingType === 'duration') {
    const mins = Math.floor(item.targetValue / 60);
    const secs = item.targetValue % 60;
    if (mins > 0 && secs > 0) return `${mins}m ${secs}s`;
    if (mins > 0) return `${mins} min`;
    return `${secs}s`;
  }
  return `${item.targetValue} reps`;
}

export function WarmupItemRow({ item, onToggle }: WarmupItemRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onToggle(item.id)}
      activeOpacity={0.6}
    >
      <View
        style={[
          styles.checkbox,
          item.isComplete ? styles.checkboxDone : styles.checkboxPending,
        ]}
      >
        {item.isComplete && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text
        style={[styles.name, item.isComplete && styles.nameDone]}
        numberOfLines={1}
      >
        {item.displayName}
      </Text>
      <Text style={[styles.target, item.isComplete && styles.targetDone]}>
        {formatTarget(item)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxPending: {
    borderWidth: 2,
    borderColor: 'rgba(141,194,138,0.27)',
    backgroundColor: 'transparent',
  },
  checkboxDone: {
    backgroundColor: colors.accent,
  },
  checkmark: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '700',
  },
  name: {
    flex: 1,
    color: colors.primary,
    fontSize: fontSize.sm,
  },
  nameDone: {
    color: colors.secondary,
    textDecorationLine: 'line-through',
  },
  target: {
    color: colors.accent,
    fontSize: fontSize.xs,
  },
  targetDone: {
    color: colors.secondary,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/WarmupItemRow.tsx
git commit -m "feat(warmup): add WarmupItemRow component"
```

---

## Task 8: WarmupSection Component

**Files:**
- Create: `src/components/WarmupSection.tsx`

- [ ] **Step 1: Create the WarmupSection component**

```typescript
import React from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize } from '../theme/typography';
import { WarmupSessionItem } from '../types';
import { WarmupItemRow } from './WarmupItemRow';

interface WarmupSectionProps {
  items: WarmupSessionItem[];
  state: 'expanded' | 'collapsed' | 'dismissed' | 'none';
  onToggleItem: (itemId: number) => void;
  onCollapse: () => void;
  onExpand: () => void;
  onDismiss: () => void;
}

export function WarmupSection({
  items,
  state,
  onToggleItem,
  onCollapse,
  onExpand,
  onDismiss,
}: WarmupSectionProps) {
  if (state === 'none' || state === 'dismissed' || items.length === 0) {
    return null;
  }

  const completedCount = items.filter(i => i.isComplete).length;
  const totalCount = items.length;
  const allDone = completedCount === totalCount;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (state === 'collapsed') {
    return (
      <>
        <TouchableOpacity
          style={styles.collapsedContainer}
          onPress={onExpand}
          activeOpacity={0.7}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.fireEmoji}>🔥</Text>
              <Text style={styles.headerLabel}>WARM UP</Text>
              <Text style={[styles.progressText, allDone && styles.progressDone]}>
                {completedCount}/{totalCount} {allDone ? '✓' : ''}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Text style={styles.actionIcon}>▼</Text>
              <TouchableOpacity onPress={onDismiss} hitSlop={8}>
                <Text style={styles.actionIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
            />
          </View>
        </TouchableOpacity>
        <View style={styles.divider}>
          <Text style={styles.dividerText}>── WORKING SETS ──</Text>
        </View>
      </>
    );
  }

  // Expanded state
  return (
    <>
      <View style={styles.expandedContainer}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.fireEmoji}>🔥</Text>
            <Text style={styles.headerLabel}>WARM UP</Text>
            <Text style={styles.progressText}>
              {completedCount}/{totalCount}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onCollapse} hitSlop={8}>
              <Text style={styles.actionIcon}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDismiss} hitSlop={8}>
              <Text style={styles.actionIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.itemsList}>
          {items.map(item => (
            <WarmupItemRow
              key={item.id}
              item={item}
              onToggle={onToggleItem}
            />
          ))}
        </View>
      </View>
      <View style={styles.divider}>
        <Text style={styles.dividerText}>── WORKING SETS ──</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  expandedContainer: {
    backgroundColor: 'rgba(141,194,138,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(141,194,138,0.2)',
    borderRadius: 12,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  collapsedContainer: {
    backgroundColor: 'rgba(141,194,138,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(141,194,138,0.2)',
    borderRadius: 12,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(141,194,138,0.13)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fireEmoji: {
    fontSize: 16,
  },
  headerLabel: {
    color: colors.accent,
    fontSize: fontSize.sm + 1,
    fontWeight: '700',
  },
  progressText: {
    color: colors.secondary,
    fontSize: fontSize.xs,
  },
  progressDone: {
    color: colors.accent,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionIcon: {
    color: colors.secondary,
    fontSize: 14,
    paddingHorizontal: 4,
  },
  itemsList: {
    paddingHorizontal: spacing.md,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: 'rgba(141,194,138,0.15)',
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    borderRadius: 2,
  },
  progressBarFill: {
    height: 3,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  divider: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  dividerText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: fontSize.xs,
    letterSpacing: 2,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/WarmupSection.tsx
git commit -m "feat(warmup): add WarmupSection component with expanded/collapsed states"
```

---

## Task 9: WarmupTemplatePicker Modal

**Files:**
- Create: `src/components/WarmupTemplatePicker.tsx`

- [ ] **Step 1: Create the WarmupTemplatePicker component**

This modal is reused in three places: session start prompt, mid-session menu, and program day attachment. It shows the list of saved warmup templates.

```typescript
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { fontSize } from '../theme/typography';
import { WarmupTemplate } from '../types';
import {
  getWarmupTemplates,
  getWarmupTemplatePreview,
} from '../db/warmups';

interface TemplateWithPreview extends WarmupTemplate {
  itemCount: number;
  previewNames: string[];
}

interface WarmupTemplatePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (templateId: number) => void;
  /** Show "Skip" option for optional warmup prompt */
  showSkip?: boolean;
  onSkip?: () => void;
  title?: string;
}

export function WarmupTemplatePicker({
  visible,
  onClose,
  onSelect,
  showSkip = false,
  onSkip,
  title = 'Add a warmup?',
}: WarmupTemplatePickerProps) {
  const [templates, setTemplates] = useState<TemplateWithPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const rawTemplates = await getWarmupTemplates();
      const withPreviews: TemplateWithPreview[] = [];
      for (const t of rawTemplates) {
        const preview = await getWarmupTemplatePreview(t.id);
        withPreviews.push({ ...t, ...preview });
      }
      setTemplates(withPreviews);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadTemplates();
    }
  }, [visible, loadTemplates]);

  const renderTemplate = ({ item }: { item: TemplateWithPreview }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => onSelect(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.templateInfo}>
        <Text style={styles.templateName}>{item.name}</Text>
        <Text style={styles.templatePreview} numberOfLines={1}>
          {item.itemCount} items{item.previewNames.length > 0 ? ' · ' : ''}
          {item.previewNames.join(', ')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.fireEmoji}>🔥</Text>
              <Text style={styles.title}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.accent} style={styles.loader} />
          ) : templates.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No warmup templates yet. Create one in Library → Warmups.
              </Text>
            </View>
          ) : (
            <FlatList
              data={templates}
              renderItem={renderTemplate}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={styles.listContent}
            />
          )}

          {showSkip && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={onSkip ?? onClose}
            >
              <Text style={styles.skipText}>
                Skip — start without warmup
              </Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fireEmoji: {
    fontSize: 16,
  },
  title: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  closeIcon: {
    color: colors.secondary,
    fontSize: 16,
  },
  loader: {
    paddingVertical: spacing.xxl,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  templateCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: spacing.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  templateInfo: {},
  templateName: {
    color: colors.primary,
    fontSize: fontSize.sm + 1,
    fontWeight: '600',
  },
  templatePreview: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    marginTop: 4,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  skipText: {
    color: colors.secondary,
    fontSize: fontSize.xs,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/WarmupTemplatePicker.tsx
git commit -m "feat(warmup): add WarmupTemplatePicker modal component"
```

---

## Task 10: WorkoutScreen Integration

**Files:**
- Modify: `src/screens/WorkoutScreen.tsx`

- [ ] **Step 1: Add imports**

Add to the imports at the top of `WorkoutScreen.tsx`:

```typescript
import { WarmupSection } from '../components/WarmupSection';
import { WarmupTemplatePicker } from '../components/WarmupTemplatePicker';
```

- [ ] **Step 2: Add warmup picker state**

Inside the `WorkoutScreen` component, add state for the warmup template picker and session start prompt:

```typescript
  const [showWarmupPicker, setShowWarmupPicker] = useState(false);
  const [showWarmupStartPrompt, setShowWarmupStartPrompt] = useState(false);
```

- [ ] **Step 3: Destructure warmup values from SessionContext**

Extend the `useSession()` destructuring to include warmup values:

```typescript
  const {
    // ... existing destructured values ...
    warmupItems,
    warmupState,
    loadWarmupTemplate,
    toggleWarmupItemComplete,
    dismissWarmup,
    collapseWarmup,
    expandWarmup,
  } = useSession();
```

- [ ] **Step 4: Add warmup template selection handler**

```typescript
  const handleWarmupTemplateSelect = useCallback(async (templateId: number) => {
    await loadWarmupTemplate(templateId);
    setShowWarmupPicker(false);
    setShowWarmupStartPrompt(false);
  }, [loadWarmupTemplate]);
```

- [ ] **Step 5: Show warmup start prompt for sessions without a baked-in warmup**

After session start, if there's no warmup already loaded and the session has just started, show the prompt. Add a `useEffect` that watches for new sessions:

```typescript
  useEffect(() => {
    // Show warmup prompt when a new session starts without a warmup
    if (session && warmupState === 'none' && warmupItems.length === 0) {
      setShowWarmupStartPrompt(true);
    }
  }, [session?.id]); // Only run when session ID changes (new session)
```

- [ ] **Step 6: Insert WarmupSection into the render**

Inside the `ScrollView` content, add the `WarmupSection` component above the exercise sections. Find where the exercise sections are rendered (after the header/timer area) and insert before them:

```typescript
        <WarmupSection
          items={warmupItems}
          state={warmupState}
          onToggleItem={toggleWarmupItemComplete}
          onCollapse={collapseWarmup}
          onExpand={expandWarmup}
          onDismiss={dismissWarmup}
        />
```

- [ ] **Step 7: Add "Add Warmup" button**

Find the area where exercise action buttons are rendered (near the "Add Exercise" button or in an action menu). Add an "Add Warmup" option that is visible when `warmupState === 'none'` or `warmupState === 'dismissed'`:

```typescript
        {(warmupState === 'none' || warmupState === 'dismissed') && (
          <TouchableOpacity
            style={styles.addWarmupButton}
            onPress={() => setShowWarmupPicker(true)}
          >
            <Text style={styles.addWarmupText}>🔥 Add Warmup</Text>
          </TouchableOpacity>
        )}
```

Add corresponding styles:

```typescript
  addWarmupButton: {
    backgroundColor: 'rgba(141,194,138,0.1)',
    borderRadius: 10,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(141,194,138,0.2)',
  },
  addWarmupText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
```

- [ ] **Step 8: Add WarmupTemplatePicker modals to render**

Add at the bottom of the component return, alongside existing modals:

```typescript
        <WarmupTemplatePicker
          visible={showWarmupPicker}
          onClose={() => setShowWarmupPicker(false)}
          onSelect={handleWarmupTemplateSelect}
          title="Select Warmup Template"
        />
        <WarmupTemplatePicker
          visible={showWarmupStartPrompt}
          onClose={() => setShowWarmupStartPrompt(false)}
          onSelect={handleWarmupTemplateSelect}
          showSkip
          onSkip={() => setShowWarmupStartPrompt(false)}
          title="Add a warmup?"
        />
```

- [ ] **Step 9: Commit**

```bash
git add src/screens/WorkoutScreen.tsx
git commit -m "feat(warmup): integrate WarmupSection and picker into WorkoutScreen"
```

---

## Task 11: Library Stack Navigator

**Files:**
- Create: `src/navigation/LibraryStackNavigator.tsx`
- Modify: `src/navigation/TabNavigator.tsx`

- [ ] **Step 1: Create LibraryStackNavigator**

Look at the existing stack navigator pattern in `TabNavigator.tsx` (e.g., `CalendarStackNavigator` or `ProgramsStackNavigator`) and follow the same pattern:

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LibraryScreen } from '../screens/LibraryScreen';
import { WarmupTemplateDetailScreen } from '../screens/WarmupTemplateDetailScreen';
import { colors } from '../theme/colors';

export type LibraryStackParamList = {
  LibraryHome: undefined;
  WarmupTemplateDetail: { templateId: number; templateName: string };
};

const Stack = createNativeStackNavigator<LibraryStackParamList>();

export function LibraryStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="LibraryHome" component={LibraryScreen} />
      <Stack.Screen
        name="WarmupTemplateDetail"
        component={WarmupTemplateDetailScreen}
      />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 2: Update TabNavigator to use LibraryStackNavigator**

In `src/navigation/TabNavigator.tsx`, replace the `LibraryTab` screen's `component={LibraryScreen}` with the new stack navigator:

```typescript
// Add import:
import { LibraryStackNavigator } from './LibraryStackNavigator';

// Replace the LibraryTab screen:
<Tab.Screen
  name="LibraryTab"
  component={LibraryStackNavigator}
  options={{
    tabBarLabel: 'Library',
    tabBarIcon: ({ color }) => <BookIcon color={color} />,
  }}
/>
```

Remove the `LibraryScreen` import from `TabNavigator.tsx` if it was only used there.

- [ ] **Step 3: Commit**

```bash
git add src/navigation/LibraryStackNavigator.tsx src/navigation/TabNavigator.tsx
git commit -m "feat(warmup): convert Library tab to stack navigator"
```

---

## Task 12: CreateWarmupExerciseModal

**Files:**
- Create: `src/components/CreateWarmupExerciseModal.tsx`

- [ ] **Step 1: Create the modal component**

Follow the same modal pattern as `AddExerciseModal.tsx` (KeyboardAvoidingView + Pressable overlay + sheet):

```typescript
import React, { useCallback, useState } from 'react';
import {
  Alert,
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
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize } from '../theme/typography';
import { WarmupExercise, WarmupTrackingType } from '../types';
import { createWarmupExercise } from '../db/warmups';

interface CreateWarmupExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (exercise: WarmupExercise) => void;
}

const TRACKING_OPTIONS: { value: WarmupTrackingType; label: string }[] = [
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'reps', label: 'Reps' },
  { value: 'duration', label: 'Duration' },
];

export function CreateWarmupExerciseModal({
  visible,
  onClose,
  onCreated,
}: CreateWarmupExerciseModalProps) {
  const [name, setName] = useState('');
  const [trackingType, setTrackingType] = useState<WarmupTrackingType>('checkbox');
  const [defaultValue, setDefaultValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    setName('');
    setTrackingType('checkbox');
    setDefaultValue('');
    onClose();
  }, [onClose]);

  const handleCreate = useCallback(async () => {
    const trimmedName = name.trim();
    if (trimmedName === '') return;
    setIsSubmitting(true);
    try {
      const defVal =
        trackingType === 'checkbox'
          ? null
          : defaultValue.trim() !== ''
            ? parseInt(defaultValue, 10)
            : null;
      const exercise = await createWarmupExercise(trimmedName, trackingType, defVal);
      onCreated(exercise);
      handleClose();
    } catch {
      Alert.alert('Error', 'Failed to create warmup exercise');
    } finally {
      setIsSubmitting(false);
    }
  }, [name, trackingType, defaultValue, handleClose, onCreated]);

  const isDisabled = name.trim() === '' || isSubmitting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <ScrollView>
              <Text style={styles.title}>New Warmup Exercise</Text>

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Foam Roll Quads"
                placeholderTextColor={colors.secondary}
                autoFocus
              />

              <Text style={styles.label}>Tracking Type</Text>
              <View style={styles.optionsRow}>
                {TRACKING_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionPill,
                      trackingType === opt.value && styles.optionPillActive,
                    ]}
                    onPress={() => setTrackingType(opt.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        trackingType === opt.value && styles.optionTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {trackingType !== 'checkbox' && (
                <>
                  <Text style={styles.label}>
                    Default {trackingType === 'reps' ? 'Reps' : 'Duration (seconds)'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={defaultValue}
                    onChangeText={setDefaultValue}
                    placeholder={trackingType === 'reps' ? 'e.g. 15' : 'e.g. 120'}
                    placeholderTextColor={colors.secondary}
                    keyboardType="number-pad"
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.createButton, isDisabled && styles.createButtonDisabled]}
                onPress={handleCreate}
                disabled={isDisabled}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
    maxHeight: '80%',
  },
  title: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: spacing.md,
    color: colors.primary,
    fontSize: fontSize.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
  },
  optionPillActive: {
    backgroundColor: colors.accent,
  },
  optionText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
  },
  optionTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: spacing.base,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: colors.background,
    fontSize: fontSize.base,
    fontWeight: '700',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CreateWarmupExerciseModal.tsx
git commit -m "feat(warmup): add CreateWarmupExerciseModal component"
```

---

## Task 13: WarmupTemplateListScreen

**Files:**
- Create: `src/screens/WarmupTemplateListScreen.tsx`

- [ ] **Step 1: Create the template list screen**

This screen lives inside the Library tab's "Warmups" sub-tab content. It's not a standalone screen — it's rendered when the Warmups tab is active in `LibraryScreen`.

```typescript
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize } from '../theme/typography';
import { WarmupTemplate } from '../types';
import {
  getWarmupTemplates,
  createWarmupTemplate,
  deleteWarmupTemplate,
  getWarmupTemplatePreview,
} from '../db/warmups';
import type { LibraryStackParamList } from '../navigation/LibraryStackNavigator';

interface TemplateWithPreview extends WarmupTemplate {
  itemCount: number;
  previewNames: string[];
}

export function WarmupTemplateListScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<LibraryStackParamList>>();
  const [templates, setTemplates] = useState<TemplateWithPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const rawTemplates = await getWarmupTemplates();
      const withPreviews: TemplateWithPreview[] = [];
      for (const t of rawTemplates) {
        const preview = await getWarmupTemplatePreview(t.id);
        withPreviews.push({ ...t, ...preview });
      }
      setTemplates(withPreviews);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Reload when navigating back from detail screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTemplates();
    });
    return unsubscribe;
  }, [navigation, loadTemplates]);

  const handleCreateTemplate = useCallback(() => {
    Alert.prompt(
      'New Warmup Template',
      'Enter a name for your warmup template:',
      async (name?: string) => {
        if (!name || name.trim() === '') return;
        const template = await createWarmupTemplate(name.trim());
        navigation.navigate('WarmupTemplateDetail', {
          templateId: template.id,
          templateName: template.name,
        });
      },
      'plain-text',
      '',
      'default',
    );
  }, [navigation]);

  const handleDeleteTemplate = useCallback(
    (template: TemplateWithPreview) => {
      Alert.alert(
        'Delete Template',
        `Delete "${template.name}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteWarmupTemplate(template.id);
              loadTemplates();
            },
          },
        ],
      );
    },
    [loadTemplates],
  );

  const renderTemplate = ({ item }: { item: TemplateWithPreview }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() =>
        navigation.navigate('WarmupTemplateDetail', {
          templateId: item.id,
          templateName: item.name,
        })
      }
      onLongPress={() => handleDeleteTemplate(item)}
      activeOpacity={0.7}
    >
      <View style={styles.templateInfo}>
        <Text style={styles.templateName}>{item.name}</Text>
        <Text style={styles.templatePreview} numberOfLines={1}>
          {item.itemCount} items
          {item.previewNames.length > 0 ? ' · ' : ''}
          {item.previewNames.join(', ')}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>Your Warmup Templates</Text>
        <TouchableOpacity
          style={styles.newButton}
          onPress={handleCreateTemplate}
        >
          <Text style={styles.newButtonText}>+ New Template</Text>
        </TouchableOpacity>
      </View>
      {templates.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No warmup templates yet. Tap "+ New Template" to create one.
          </Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          renderItem={renderTemplate}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  sectionLabel: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  newButton: {
    backgroundColor: 'rgba(141,194,138,0.13)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 8,
  },
  newButtonText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  templateCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    color: colors.primary,
    fontSize: fontSize.sm + 1,
    fontWeight: '600',
  },
  templatePreview: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    marginTop: 4,
  },
  chevron: {
    color: colors.secondary,
    fontSize: 18,
    marginLeft: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
```

**Note:** `Alert.prompt` is iOS-only. On Android, use a custom TextInput modal or a simple Alert with a state-driven input. The implementing engineer should check existing codebase patterns for name input prompts and follow the same approach. If the codebase already has a reusable prompt component, use that instead.

- [ ] **Step 2: Commit**

```bash
git add src/screens/WarmupTemplateListScreen.tsx
git commit -m "feat(warmup): add WarmupTemplateListScreen"
```

---

## Task 14: AddWarmupItemModal

**Files:**
- Create: `src/components/AddWarmupItemModal.tsx`

- [ ] **Step 1: Create the two-tab add item modal**

```typescript
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
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
import { fontSize } from '../theme/typography';
import {
  Exercise,
  WarmupExercise,
  WarmupTrackingType,
} from '../types';
import { getWarmupExercises, searchWarmupExercises } from '../db/warmups';
import { searchExercises } from '../db/exercises';
import { CreateWarmupExerciseModal } from './CreateWarmupExerciseModal';

type TabType = 'warmup' | 'library';

interface AddWarmupItemModalProps {
  visible: boolean;
  onClose: () => void;
  onAddWarmupExercise: (
    warmupExerciseId: number,
    trackingType: WarmupTrackingType,
    targetValue: number | null,
  ) => void;
  onAddLibraryExercise: (
    exerciseId: number,
    trackingType: WarmupTrackingType,
    targetValue: number | null,
  ) => void;
}

export function AddWarmupItemModal({
  visible,
  onClose,
  onAddWarmupExercise,
  onAddLibraryExercise,
}: AddWarmupItemModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('warmup');
  const [warmupExercises, setWarmupExercises] = useState<WarmupExercise[]>([]);
  const [libraryResults, setLibraryResults] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<{
    type: 'warmup' | 'library';
    id: number;
    trackingType: WarmupTrackingType;
    defaultValue: number | null;
  } | null>(null);
  const [targetInput, setTargetInput] = useState('');

  const loadWarmupExercises = useCallback(async () => {
    try {
      const results =
        searchQuery.trim() !== ''
          ? await searchWarmupExercises(searchQuery.trim())
          : await getWarmupExercises();
      setWarmupExercises(results);
    } catch {
      // ignore
    }
  }, [searchQuery]);

  const loadLibraryExercises = useCallback(async () => {
    if (searchQuery.trim() === '') {
      setLibraryResults([]);
      return;
    }
    try {
      const results = await searchExercises(searchQuery.trim());
      setLibraryResults(results);
    } catch {
      // ignore
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!visible) return;
    if (activeTab === 'warmup') {
      loadWarmupExercises();
    } else {
      loadLibraryExercises();
    }
  }, [visible, activeTab, loadWarmupExercises, loadLibraryExercises]);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setActiveTab('warmup');
    setPendingSelection(null);
    setTargetInput('');
    onClose();
  }, [onClose]);

  const handleSelectWarmupExercise = useCallback(
    (exercise: WarmupExercise) => {
      if (exercise.trackingType === 'checkbox') {
        onAddWarmupExercise(exercise.id, 'checkbox', null);
        handleClose();
        return;
      }
      setPendingSelection({
        type: 'warmup',
        id: exercise.id,
        trackingType: exercise.trackingType,
        defaultValue: exercise.defaultValue,
      });
      setTargetInput(exercise.defaultValue?.toString() ?? '');
    },
    [onAddWarmupExercise, handleClose],
  );

  const handleSelectLibraryExercise = useCallback((exercise: Exercise) => {
    setPendingSelection({
      type: 'library',
      id: exercise.id,
      trackingType: 'reps',
      defaultValue: null,
    });
    setTargetInput('');
  }, []);

  const handleConfirmTarget = useCallback(() => {
    if (!pendingSelection) return;
    const val = targetInput.trim() !== '' ? parseInt(targetInput, 10) : null;
    if (pendingSelection.type === 'warmup') {
      onAddWarmupExercise(pendingSelection.id, pendingSelection.trackingType, val);
    } else {
      onAddLibraryExercise(pendingSelection.id, pendingSelection.trackingType, val);
    }
    handleClose();
  }, [pendingSelection, targetInput, onAddWarmupExercise, onAddLibraryExercise, handleClose]);

  const handleWarmupExerciseCreated = useCallback(
    (exercise: WarmupExercise) => {
      setShowCreateModal(false);
      loadWarmupExercises();
    },
    [loadWarmupExercises],
  );

  // If we have a pending selection awaiting target input, show that UI
  if (pendingSelection) {
    const label =
      pendingSelection.trackingType === 'reps'
        ? 'Target Reps'
        : 'Duration (seconds)';
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.title}>{label}</Text>
            <TextInput
              style={styles.targetInput}
              value={targetInput}
              onChangeText={setTargetInput}
              placeholder={pendingSelection.trackingType === 'reps' ? 'e.g. 15' : 'e.g. 120'}
              placeholderTextColor={colors.secondary}
              keyboardType="number-pad"
              autoFocus
            />
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmTarget}>
              <Text style={styles.confirmText}>Add to Template</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  return (
    <>
      <Modal visible={visible && !showCreateModal} transparent animationType="slide" onRequestClose={handleClose}>
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {/* Tab Bar */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'warmup' && styles.tabActive]}
                onPress={() => { setActiveTab('warmup'); setSearchQuery(''); }}
              >
                <Text style={[styles.tabText, activeTab === 'warmup' && styles.tabTextActive]}>
                  Warmup Exercises
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'library' && styles.tabActive]}
                onPress={() => { setActiveTab('library'); setSearchQuery(''); }}
              >
                <Text style={[styles.tabText, activeTab === 'library' && styles.tabTextActive]}>
                  From Library
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={activeTab === 'warmup' ? 'Search warmup exercises...' : 'Search exercise library...'}
                placeholderTextColor={colors.secondary}
              />
            </View>

            {/* Content */}
            {activeTab === 'warmup' ? (
              <ScrollView style={styles.content}>
                {warmupExercises.map(ex => (
                  <TouchableOpacity
                    key={ex.id}
                    style={styles.exerciseRow}
                    onPress={() => handleSelectWarmupExercise(ex)}
                  >
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    <Text style={styles.exerciseType}>{ex.trackingType}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.createNewButton}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Text style={styles.createNewText}>+ Create New Warmup Exercise</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <ScrollView style={styles.content}>
                {searchQuery.trim() === '' ? (
                  <Text style={styles.hintText}>Type to search your exercise library</Text>
                ) : libraryResults.length === 0 ? (
                  <Text style={styles.hintText}>No exercises found</Text>
                ) : (
                  libraryResults.map(ex => (
                    <TouchableOpacity
                      key={ex.id}
                      style={styles.exerciseRow}
                      onPress={() => handleSelectLibraryExercise(ex)}
                    >
                      <Text style={styles.exerciseName}>{ex.name}</Text>
                      <Text style={styles.exerciseCategory}>{ex.category}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <CreateWarmupExerciseModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleWarmupExerciseCreated}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: spacing.xxxl,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  tabText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.accent,
  },
  searchContainer: {
    padding: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    color: colors.primary,
    fontSize: fontSize.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  content: {
    paddingHorizontal: spacing.md,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm + 2,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  exerciseName: {
    color: colors.primary,
    fontSize: fontSize.sm,
    flex: 1,
  },
  exerciseType: {
    color: colors.secondary,
    fontSize: fontSize.xs,
  },
  exerciseCategory: {
    color: colors.secondary,
    fontSize: fontSize.xs,
  },
  createNewButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(141,194,138,0.2)',
    borderRadius: 8,
    padding: spacing.sm + 2,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.base,
  },
  createNewText: {
    color: colors.accent,
    fontSize: fontSize.xs,
  },
  hintText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  title: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '700',
    padding: spacing.base,
  },
  targetInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: spacing.md,
    marginHorizontal: spacing.base,
    color: colors.primary,
    fontSize: fontSize.lg,
    textAlign: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: spacing.base,
    alignItems: 'center',
    margin: spacing.base,
    marginTop: spacing.lg,
  },
  confirmText: {
    color: colors.background,
    fontSize: fontSize.base,
    fontWeight: '700',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AddWarmupItemModal.tsx
git commit -m "feat(warmup): add AddWarmupItemModal with two-tab interface"
```

---

## Task 15: WarmupTemplateDetailScreen

**Files:**
- Create: `src/screens/WarmupTemplateDetailScreen.tsx`

- [ ] **Step 1: Create the template detail/editor screen**

Uses the same reorder pattern as `DayDetailScreen` (up/down buttons) and the same swipe-to-delete pattern from `ExerciseListItem`:

```typescript
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize } from '../theme/typography';
import { WarmupTemplateItemWithName, WarmupTrackingType } from '../types';
import {
  getWarmupTemplateWithItems,
  removeWarmupTemplateItem,
  reorderWarmupTemplateItems,
  addWarmupTemplateItem,
  updateWarmupTemplateName,
  deleteWarmupTemplate,
} from '../db/warmups';
import { AddWarmupItemModal } from '../components/AddWarmupItemModal';
import type { LibraryStackParamList } from '../navigation/LibraryStackNavigator';

type RouteParams = RouteProp<LibraryStackParamList, 'WarmupTemplateDetail'>;

function formatTarget(trackingType: WarmupTrackingType, value: number | null): string {
  if (trackingType === 'checkbox' || value == null) return '✓ checkbox';
  if (trackingType === 'duration') {
    const mins = Math.floor(value / 60);
    const secs = value % 60;
    if (mins > 0 && secs > 0) return `${mins}m ${secs}s`;
    if (mins > 0) return `${mins} min`;
    return `${secs}s`;
  }
  return `${value} reps`;
}

export function WarmupTemplateDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { templateId, templateName: initialName } = route.params;

  const [templateName, setTemplateName] = useState(initialName);
  const [items, setItems] = useState<WarmupTemplateItemWithName[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadTemplate = useCallback(async () => {
    try {
      const { template, items: templateItems } = await getWarmupTemplateWithItems(templateId);
      setTemplateName(template.name);
      setItems(templateItems);
    } catch {
      // ignore
    }
  }, [templateId]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const handleRename = useCallback(() => {
    Alert.prompt(
      'Rename Template',
      'Enter a new name:',
      async (name?: string) => {
        if (!name || name.trim() === '') return;
        await updateWarmupTemplateName(templateId, name.trim());
        setTemplateName(name.trim());
      },
      'plain-text',
      templateName,
    );
  }, [templateId, templateName]);

  const handleDeleteTemplate = useCallback(() => {
    Alert.alert(
      'Delete Template',
      `Delete "${templateName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteWarmupTemplate(templateId);
            navigation.goBack();
          },
        },
      ],
    );
  }, [templateId, templateName, navigation]);

  const handleRemoveItem = useCallback(
    async (itemId: number) => {
      await removeWarmupTemplateItem(itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
    },
    [],
  );

  const handleMoveUp = useCallback(
    async (index: number) => {
      if (index === 0) return;
      const newItems = [...items];
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      setItems(newItems);
      await reorderWarmupTemplateItems(templateId, newItems.map(i => i.id));
    },
    [items, templateId],
  );

  const handleMoveDown = useCallback(
    async (index: number) => {
      if (index === items.length - 1) return;
      const newItems = [...items];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      setItems(newItems);
      await reorderWarmupTemplateItems(templateId, newItems.map(i => i.id));
    },
    [items, templateId],
  );

  const handleAddWarmupExercise = useCallback(
    async (warmupExerciseId: number, trackingType: WarmupTrackingType, targetValue: number | null) => {
      await addWarmupTemplateItem(templateId, null, warmupExerciseId, trackingType, targetValue);
      setShowAddModal(false);
      loadTemplate();
    },
    [templateId, loadTemplate],
  );

  const handleAddLibraryExercise = useCallback(
    async (exerciseId: number, trackingType: WarmupTrackingType, targetValue: number | null) => {
      await addWarmupTemplateItem(templateId, exerciseId, null, trackingType, targetValue);
      setShowAddModal(false);
      loadTemplate();
    },
    [templateId, loadTemplate],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRename} style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {templateName}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDeleteTemplate} hitSlop={8}>
          <Text style={styles.deleteIcon}>🗑</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Tap name to rename · ↑↓ to reorder · swipe to delete</Text>

      {/* Items */}
      <ScrollView style={styles.list}>
        {items.map((item, index) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.reorderButtons}>
              <TouchableOpacity
                onPress={() => handleMoveUp(index)}
                disabled={index === 0}
                hitSlop={4}
              >
                <Text style={[styles.reorderIcon, index === 0 && styles.reorderDisabled]}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleMoveDown(index)}
                disabled={index === items.length - 1}
                hitSlop={4}
              >
                <Text style={[styles.reorderIcon, index === items.length - 1 && styles.reorderDisabled]}>↓</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.displayName}</Text>
              <Text
                style={[
                  styles.itemSource,
                  item.source === 'library' ? styles.sourceLibrary : styles.sourceWarmup,
                ]}
              >
                {item.source === 'library' ? 'from exercise library' : 'warmup exercise'}
                {' · '}
                {formatTarget(item.trackingType, item.targetValue)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                Alert.alert('Remove Item', `Remove "${item.displayName}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => handleRemoveItem(item.id) },
                ])
              }
              hitSlop={8}
            >
              <Text style={styles.removeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Add Item Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>

      <AddWarmupItemModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddWarmupExercise={handleAddWarmupExercise}
        onAddLibraryExercise={handleAddLibraryExercise}
      />
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
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  backButton: {
    color: colors.secondary,
    fontSize: 20,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  deleteIcon: {
    fontSize: 16,
  },
  subtitle: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  list: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  reorderButtons: {
    gap: 2,
  },
  reorderIcon: {
    color: colors.secondary,
    fontSize: 14,
    paddingHorizontal: 4,
  },
  reorderDisabled: {
    opacity: 0.2,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: colors.primary,
    fontSize: fontSize.sm,
  },
  itemSource: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  sourceWarmup: {
    color: colors.accent,
  },
  sourceLibrary: {
    color: '#5B9BF0',
  },
  removeIcon: {
    color: colors.secondary,
    fontSize: 14,
    paddingHorizontal: 4,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  addButton: {
    backgroundColor: 'rgba(141,194,138,0.13)',
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/WarmupTemplateDetailScreen.tsx
git commit -m "feat(warmup): add WarmupTemplateDetailScreen with reorder and item management"
```

---

## Task 16: Library Screen Sub-tabs

**Files:**
- Modify: `src/screens/LibraryScreen.tsx`

- [ ] **Step 1: Add sub-tab bar and warmup content**

Modify `LibraryScreen` to add a sub-tab bar at the top. The existing exercise browser becomes the content of the "Exercises" tab. The "Warmups" tab renders `WarmupTemplateListScreen`.

Add imports:

```typescript
import { WarmupTemplateListScreen } from './WarmupTemplateListScreen';
```

Add state for the active sub-tab inside the component:

```typescript
  const [activeSubTab, setActiveSubTab] = useState<'exercises' | 'warmups'>('exercises');
```

Render a sub-tab bar just below the SafeAreaView top edge (before the search bar and category tabs):

```typescript
      {/* Sub-tab bar */}
      <View style={styles.subTabBar}>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'exercises' && styles.subTabActive]}
          onPress={() => setActiveSubTab('exercises')}
        >
          <Text style={[styles.subTabText, activeSubTab === 'exercises' && styles.subTabTextActive]}>
            Exercises
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'warmups' && styles.subTabActive]}
          onPress={() => setActiveSubTab('warmups')}
        >
          <Text style={[styles.subTabText, activeSubTab === 'warmups' && styles.subTabTextActive]}>
            Warmups
          </Text>
        </TouchableOpacity>
      </View>
```

Wrap the existing exercise browser content in a conditional on `activeSubTab === 'exercises'`, and show `WarmupTemplateListScreen` for `activeSubTab === 'warmups'`:

```typescript
      {activeSubTab === 'exercises' ? (
        <>
          {/* existing search bar, category tabs, FlatList, etc. */}
        </>
      ) : (
        <WarmupTemplateListScreen />
      )}
```

Add sub-tab styles:

```typescript
  subTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  subTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  subTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  subTabText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  subTabTextActive: {
    color: colors.accent,
  },
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/LibraryScreen.tsx
git commit -m "feat(warmup): add Exercises/Warmups sub-tab bar to LibraryScreen"
```

---

## Task 17: DayDetailScreen Warmup Integration

**Files:**
- Modify: `src/screens/DayDetailScreen.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { WarmupTemplatePicker } from '../components/WarmupTemplatePicker';
import { WarmupTemplate } from '../types';
import {
  getWarmupTemplateIdForDay,
  setWarmupTemplateIdForDay,
  clearWarmupTemplateIdForDay,
} from '../db/programs';
import { getWarmupTemplateWithItems } from '../db/warmups';
```

- [ ] **Step 2: Add warmup state**

Inside the component, add state for the warmup badge:

```typescript
  const [warmupTemplateName, setWarmupTemplateName] = useState<string | null>(null);
  const [warmupItemCount, setWarmupItemCount] = useState(0);
  const [showWarmupPicker, setShowWarmupPicker] = useState(false);
```

- [ ] **Step 3: Load warmup template info on mount**

Add a useEffect (or extend the existing data loading effect) to load the warmup template ID and name:

```typescript
  useEffect(() => {
    async function loadWarmupInfo() {
      const templateId = await getWarmupTemplateIdForDay(dayId);
      if (templateId) {
        const { template, items } = await getWarmupTemplateWithItems(templateId);
        setWarmupTemplateName(template.name);
        setWarmupItemCount(items.length);
      } else {
        setWarmupTemplateName(null);
        setWarmupItemCount(0);
      }
    }
    loadWarmupInfo();
  }, [dayId]);
```

- [ ] **Step 4: Add warmup template selection handler**

```typescript
  const handleWarmupTemplateSelect = useCallback(async (templateId: number) => {
    await setWarmupTemplateIdForDay(dayId, templateId);
    const { template, items } = await getWarmupTemplateWithItems(templateId);
    setWarmupTemplateName(template.name);
    setWarmupItemCount(items.length);
    setShowWarmupPicker(false);
  }, [dayId]);

  const handleClearWarmup = useCallback(async () => {
    await clearWarmupTemplateIdForDay(dayId);
    setWarmupTemplateName(null);
    setWarmupItemCount(0);
  }, [dayId]);
```

- [ ] **Step 5: Render warmup badge section above exercises**

Add this JSX above the exercise list (before the "Exercises" section label or before the first `ExerciseTargetRow`):

```typescript
        {/* Warmup Section */}
        {warmupTemplateName ? (
          <View style={styles.warmupBadge}>
            <View style={styles.warmupBadgeLeft}>
              <Text style={styles.warmupEmoji}>🔥</Text>
              <View>
                <Text style={styles.warmupBadgeName}>{warmupTemplateName}</Text>
                <Text style={styles.warmupBadgeCount}>
                  {warmupItemCount} items · auto-loads on start
                </Text>
              </View>
            </View>
            <View style={styles.warmupBadgeActions}>
              <TouchableOpacity onPress={() => setShowWarmupPicker(true)}>
                <Text style={styles.warmupChangeText}>Change ›</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClearWarmup}>
                <Text style={styles.warmupRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.attachWarmupButton}
            onPress={() => setShowWarmupPicker(true)}
          >
            <Text style={styles.warmupEmoji}>🔥</Text>
            <Text style={styles.attachWarmupText}>Attach Warmup</Text>
          </TouchableOpacity>
        )}
```

- [ ] **Step 6: Add WarmupTemplatePicker modal**

Add at the bottom of the component return alongside existing modals:

```typescript
        <WarmupTemplatePicker
          visible={showWarmupPicker}
          onClose={() => setShowWarmupPicker(false)}
          onSelect={handleWarmupTemplateSelect}
          title="Select Warmup Template"
        />
```

- [ ] **Step 7: Add styles**

```typescript
  warmupBadge: {
    backgroundColor: 'rgba(141,194,138,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(141,194,138,0.2)',
    borderRadius: 10,
    padding: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warmupBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  warmupEmoji: {
    fontSize: 14,
  },
  warmupBadgeName: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  warmupBadgeCount: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  warmupBadgeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  warmupChangeText: {
    color: colors.secondary,
    fontSize: fontSize.xs,
  },
  warmupRemoveText: {
    color: colors.secondary,
    fontSize: 14,
  },
  attachWarmupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(141,194,138,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(141,194,138,0.15)',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  attachWarmupText: {
    color: colors.accent,
    fontSize: fontSize.sm,
  },
```

- [ ] **Step 8: Commit**

```bash
git add src/screens/DayDetailScreen.tsx
git commit -m "feat(warmup): add warmup badge and attach/change to DayDetailScreen"
```

---

## Task 18: Final Integration Test

- [ ] **Step 1: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests pass (existing + new warmup tests).

- [ ] **Step 2: Run TypeScript type checking**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Build the app**

```bash
npx react-native build-android --mode=debug
```

Expected: Builds without errors.

- [ ] **Step 4: Manual smoke test**

Verify end-to-end on device/emulator:

1. Open Library tab → Warmups sub-tab → Create a template → Add items (both warmup exercises and library exercises)
2. Open Programs tab → Open a program day → Attach the warmup template
3. Start workout from that program day → Warmup section auto-loads at top
4. Check off warmup items → Auto-collapse when all done
5. Expand collapsed warmup → Dismiss warmup
6. Start a new empty session → See "Add a warmup?" prompt
7. Skip prompt → Use "Add Warmup" button mid-session
8. End session → Verify no warmup data appears in volume/progress screens

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(warmup): address integration issues from smoke testing"
```
