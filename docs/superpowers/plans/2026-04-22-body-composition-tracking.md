# Body Composition Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a BODY COMP tab on the Nutrition screen that lets the user log daily weight (from Dashboard or the tab) and periodic body-fat %, with a dual-axis overlay chart correlating calorie intake to weight trend, zoomable between MONTH / WEEK / DAY scopes.

**Architecture:** One new SQLite table (`body_metrics`, migration V24), one shared log modal for both metrics, one new Dashboard card, a third tab on the existing `ProteinScreen` using the current `TabBar` pattern, and a new `OverlayChart` component built with `victory-native` (added as a new dependency alongside existing `react-native-chart-kit`).

**Tech Stack:** React Native, TypeScript, `react-native-sqlite-storage`, `victory-native` (new), `react-native-svg` (already present), Jest + `@testing-library/react-native`.

**Spec reference:** `docs/superpowers/specs/2026-04-22-body-composition-tracking-design.md` (commit bc271f7).

**Corrections from spec:**
- Migration version: use **V24** (spec said V22, but current max in `migrations.ts` is V23).
- Timestamp columns: use **TEXT** (ISO strings), not INTEGER — matches existing `created_at TEXT NOT NULL` convention in `programs`, `meals`, etc.

---

## File Structure

### New files
- `src/components/icons/Scale.tsx` — icon for empty state
- `src/components/LogBodyMetricModal.tsx` — shared weight + body-fat modal
- `src/components/DashboardWeightCard.tsx` — Dashboard quick-log card
- `src/components/BodyCompScopeBar.tsx` — MONTH/WEEK/DAY segmented control
- `src/components/BodyCompDateNav.tsx` — `‹ label ›` scope-aware navigator
- `src/components/OverlayChart.tsx` — dual-axis weight + calorie chart
- `src/components/BodyCompMonthView.tsx` — MONTH scope composition
- `src/components/BodyCompWeekView.tsx` — WEEK scope composition
- `src/components/BodyCompDayView.tsx` — DAY scope composition
- `src/screens/BodyCompView.tsx` — top-level tab content, owns scope + date state
- `src/db/bodyMetrics.ts` — DB queries + aggregates
- Tests: `src/components/__tests__/LogBodyMetricModal.test.tsx`, `DashboardWeightCard.test.tsx`, `BodyCompScopeBar.test.tsx`, `BodyCompDateNav.test.tsx`, `OverlayChart.test.tsx`, and `src/db/__tests__/bodyMetrics.test.ts`.

### Modified files
- `src/db/schema.ts` — add `CREATE_BODY_METRICS_TABLE`
- `src/db/migrations.ts` — register V24
- `src/types/index.ts` — add `BodyMetric`, `BodyMetricType`, `BodyMetricUnit`, `BodyCompScope`
- `src/screens/ProteinScreen.tsx` — add BODY COMP as third tab
- `src/screens/DashboardScreen.tsx` — insert `<DashboardWeightCard />`
- `src/navigation/TabNavigator.tsx` — extend `ProteinStackParamList` `initialTab` type to `0 | 1 | 2`
- `package.json` — add `victory-native` dependency

---

## Task 1: Types + schema + V24 migration

**Files:**
- Modify: `src/types/index.ts` (append new types)
- Modify: `src/db/schema.ts` (append `CREATE_BODY_METRICS_TABLE`)
- Modify: `src/db/migrations.ts` (register V24)

- [ ] **Step 1: Append TypeScript types**

Add to the end of `src/types/index.ts`:

```ts
// --- Body composition tracking ---
export type BodyMetricType = 'weight' | 'body_fat';
export type BodyMetricUnit = 'lb' | 'percent';

export interface BodyMetric {
  id: number;
  metricType: BodyMetricType;
  value: number;
  unit: BodyMetricUnit;
  recordedDate: string;        // ISO YYYY-MM-DD
  programId: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BodyCompScope = 'month' | 'week' | 'day';
```

- [ ] **Step 2: Add the schema constant**

Append to the end of `src/db/schema.ts`:

```ts
export const CREATE_BODY_METRICS_TABLE = `
  CREATE TABLE IF NOT EXISTS body_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('weight', 'body_fat')),
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    recorded_date TEXT NOT NULL,
    program_id INTEGER,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    UNIQUE (metric_type, recorded_date)
  )
`;

export const CREATE_BODY_METRICS_TYPE_DATE_INDEX =
  'CREATE INDEX IF NOT EXISTS idx_body_metrics_type_date ON body_metrics (metric_type, recorded_date)';

export const CREATE_BODY_METRICS_PROGRAM_INDEX =
  'CREATE INDEX IF NOT EXISTS idx_body_metrics_program ON body_metrics (program_id)';
```

- [ ] **Step 3: Register V24 migration**

In `src/db/migrations.ts`, import the new schema constants (add to the existing import block at the top):

```ts
import {
  // ...existing imports...
  CREATE_BODY_METRICS_TABLE,
  CREATE_BODY_METRICS_TYPE_DATE_INDEX,
  CREATE_BODY_METRICS_PROGRAM_INDEX,
} from './schema';
```

Append a new migration to the end of the `MIGRATIONS` array (after V23):

```ts
  {
    version: 24,
    description: 'Create body_metrics table for weight and body fat tracking',
    up: (tx: Transaction) => {
      tx.executeSql(CREATE_BODY_METRICS_TABLE);
      tx.executeSql(CREATE_BODY_METRICS_TYPE_DATE_INDEX);
      tx.executeSql(CREATE_BODY_METRICS_PROGRAM_INDEX);
    },
  },
```

Also append a matching comment line to the migrations header block (around line 49):

```ts
 * - Version 24: Create body_metrics table for weight and body fat tracking
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/db/schema.ts src/db/migrations.ts
git commit -m "feat(body-comp): add body_metrics table (V24) and types"
```

---

## Task 2: bodyMetrics.ts — row mapper + basic CRUD with tests

**Files:**
- Create: `src/db/bodyMetrics.ts`
- Create: `src/db/__tests__/bodyMetrics.test.ts`

- [ ] **Step 1: Write failing tests for insert + get by date**

Create `src/db/__tests__/bodyMetrics.test.ts`:

```ts
import { db } from '../database';
import { runMigrations } from '../migrations';
import {
  insertBodyMetric,
  getBodyMetricByDate,
  rowToBodyMetric,
} from '../bodyMetrics';

describe('bodyMetrics CRUD', () => {
  beforeEach(async () => {
    const database = await db;
    await database.executeSql('DROP TABLE IF EXISTS body_metrics');
    await database.executeSql('DROP TABLE IF EXISTS programs');
    await runMigrations(database);
  });

  it('inserts a weight reading and reads it back', async () => {
    const id = await insertBodyMetric({
      metricType: 'weight',
      value: 177.4,
      unit: 'lb',
      recordedDate: '2026-04-17',
      programId: null,
      note: null,
    });
    expect(id).toBeGreaterThan(0);

    const row = await getBodyMetricByDate('weight', '2026-04-17');
    expect(row).not.toBeNull();
    expect(row!.value).toBe(177.4);
    expect(row!.unit).toBe('lb');
    expect(row!.programId).toBeNull();
    expect(row!.recordedDate).toBe('2026-04-17');
  });

  it('returns null when no reading exists for a date', async () => {
    const row = await getBodyMetricByDate('weight', '2026-04-17');
    expect(row).toBeNull();
  });

  it('rowToBodyMetric maps snake_case columns to camelCase', () => {
    const dbRow = {
      id: 7,
      metric_type: 'body_fat',
      value: 18.2,
      unit: 'percent',
      recorded_date: '2026-04-25',
      program_id: 3,
      note: 'post-program',
      created_at: '2026-04-25T09:00:00.000Z',
      updated_at: '2026-04-25T09:00:00.000Z',
    };
    const mapped = rowToBodyMetric(dbRow);
    expect(mapped).toEqual({
      id: 7,
      metricType: 'body_fat',
      value: 18.2,
      unit: 'percent',
      recordedDate: '2026-04-25',
      programId: 3,
      note: 'post-program',
      createdAt: '2026-04-25T09:00:00.000Z',
      updatedAt: '2026-04-25T09:00:00.000Z',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/db/__tests__/bodyMetrics.test.ts`
Expected: FAIL — `Cannot find module '../bodyMetrics'`.

- [ ] **Step 3: Implement bodyMetrics.ts (CRUD + mapper)**

Create `src/db/bodyMetrics.ts`:

```ts
import { db, executeSql } from './database';
import type {
  BodyMetric,
  BodyMetricType,
  BodyMetricUnit,
} from '../types';

type BodyMetricRow = {
  id: number;
  metric_type: string;
  value: number;
  unit: string;
  recorded_date: string;
  program_id: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export function rowToBodyMetric(row: BodyMetricRow): BodyMetric {
  return {
    id: row.id,
    metricType: row.metric_type as BodyMetricType,
    value: row.value,
    unit: row.unit as BodyMetricUnit,
    recordedDate: row.recorded_date,
    programId: row.program_id ?? null,
    note: row.note ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface InsertBodyMetricInput {
  metricType: BodyMetricType;
  value: number;
  unit: BodyMetricUnit;
  recordedDate: string;
  programId: number | null;
  note: string | null;
}

export async function insertBodyMetric(input: InsertBodyMetricInput): Promise<number> {
  const now = new Date().toISOString();
  const database = await db;
  const result = await executeSql(
    database,
    `INSERT INTO body_metrics
       (metric_type, value, unit, recorded_date, program_id, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.metricType,
      input.value,
      input.unit,
      input.recordedDate,
      input.programId,
      input.note,
      now,
      now,
    ],
  );
  return result.insertId;
}

export async function getBodyMetricByDate(
  metricType: BodyMetricType,
  recordedDate: string,
): Promise<BodyMetric | null> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM body_metrics WHERE metric_type = ? AND recorded_date = ? LIMIT 1',
    [metricType, recordedDate],
  );
  if (result.rows.length === 0) return null;
  return rowToBodyMetric(result.rows.item(0) as BodyMetricRow);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/db/__tests__/bodyMetrics.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add src/db/bodyMetrics.ts src/db/__tests__/bodyMetrics.test.ts
git commit -m "feat(body-comp): bodyMetrics CRUD + row mapper"
```

---

## Task 3: bodyMetrics.ts — upsert with program auto-link

**Files:**
- Modify: `src/db/bodyMetrics.ts`
- Modify: `src/db/__tests__/bodyMetrics.test.ts`

- [ ] **Step 1: Append failing tests for upsert + auto-link**

Append to `src/db/__tests__/bodyMetrics.test.ts` inside the existing `describe` block:

```ts
  it('upsert inserts a new reading when none exists', async () => {
    const { id, wasUpdated } = await upsertBodyMetric({
      metricType: 'weight',
      value: 177.4,
      unit: 'lb',
      recordedDate: '2026-04-17',
      note: null,
    });
    expect(id).toBeGreaterThan(0);
    expect(wasUpdated).toBe(false);

    const row = await getBodyMetricByDate('weight', '2026-04-17');
    expect(row!.value).toBe(177.4);
  });

  it('upsert updates an existing reading when one exists for that date', async () => {
    await upsertBodyMetric({
      metricType: 'weight',
      value: 177.4,
      unit: 'lb',
      recordedDate: '2026-04-17',
      note: null,
    });
    const result = await upsertBodyMetric({
      metricType: 'weight',
      value: 176.9,
      unit: 'lb',
      recordedDate: '2026-04-17',
      note: 'corrected',
    });
    expect(result.wasUpdated).toBe(true);

    const row = await getBodyMetricByDate('weight', '2026-04-17');
    expect(row!.value).toBe(176.9);
    expect(row!.note).toBe('corrected');
  });

  it('upsert auto-links program_id when recorded_date falls inside a program window', async () => {
    const database = await db;
    const res = await database.executeSql(
      `INSERT INTO programs (name, weeks, start_date, current_week, created_at)
       VALUES ('Test Program', 10, '2026-04-01', 1, '2026-04-01T00:00:00.000Z')`,
    );
    const programId = res[0].insertId;

    const { id } = await upsertBodyMetric({
      metricType: 'weight',
      value: 180.0,
      unit: 'lb',
      recordedDate: '2026-04-17',
      note: null,
    });

    const row = await getBodyMetricByDate('weight', '2026-04-17');
    expect(row!.programId).toBe(programId);
    expect(id).toBeGreaterThan(0);
  });

  it('upsert leaves program_id NULL when no program window covers the date', async () => {
    await upsertBodyMetric({
      metricType: 'weight',
      value: 180.0,
      unit: 'lb',
      recordedDate: '2026-04-17',
      note: null,
    });
    const row = await getBodyMetricByDate('weight', '2026-04-17');
    expect(row!.programId).toBeNull();
  });
```

Also import `upsertBodyMetric` at the top of the test file:

```ts
import {
  insertBodyMetric,
  getBodyMetricByDate,
  rowToBodyMetric,
  upsertBodyMetric,
} from '../bodyMetrics';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/db/__tests__/bodyMetrics.test.ts`
Expected: FAIL — `upsertBodyMetric` is not exported.

- [ ] **Step 3: Implement upsertBodyMetric + findProgramAtDate**

Append to `src/db/bodyMetrics.ts`:

```ts
export interface UpsertBodyMetricInput {
  metricType: BodyMetricType;
  value: number;
  unit: BodyMetricUnit;
  recordedDate: string;
  note: string | null;
}

export interface UpsertResult {
  id: number;
  wasUpdated: boolean;
}

/**
 * Insert or update a body-metric reading for the given (type, date).
 * Auto-links the reading to any program whose window
 * [start_date, start_date + weeks * 7) covers recorded_date.
 */
export async function upsertBodyMetric(
  input: UpsertBodyMetricInput,
): Promise<UpsertResult> {
  const now = new Date().toISOString();
  const programId = await findProgramIdAtDate(input.recordedDate);
  const database = await db;

  const existing = await executeSql(
    database,
    'SELECT id FROM body_metrics WHERE metric_type = ? AND recorded_date = ? LIMIT 1',
    [input.metricType, input.recordedDate],
  );

  if (existing.rows.length > 0) {
    const id = existing.rows.item(0).id as number;
    await executeSql(
      database,
      `UPDATE body_metrics
         SET value = ?, unit = ?, program_id = ?, note = ?, updated_at = ?
       WHERE id = ?`,
      [input.value, input.unit, programId, input.note, now, id],
    );
    return { id, wasUpdated: true };
  }

  const inserted = await executeSql(
    database,
    `INSERT INTO body_metrics
       (metric_type, value, unit, recorded_date, program_id, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.metricType,
      input.value,
      input.unit,
      input.recordedDate,
      programId,
      input.note,
      now,
      now,
    ],
  );
  return { id: inserted.insertId, wasUpdated: false };
}

/**
 * Return the id of the most recently started program whose window
 * [start_date, start_date + weeks * 7) includes the given date, or null.
 */
export async function findProgramIdAtDate(recordedDate: string): Promise<number | null> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT id FROM programs
      WHERE start_date IS NOT NULL
        AND DATE(start_date) <= DATE(?)
        AND DATE(start_date, '+' || (weeks * 7) || ' days') > DATE(?)
      ORDER BY DATE(start_date) DESC
      LIMIT 1`,
    [recordedDate, recordedDate],
  );
  if (result.rows.length === 0) return null;
  return result.rows.item(0).id as number;
}
```

- [ ] **Step 4: Run tests**

Run: `npx jest src/db/__tests__/bodyMetrics.test.ts`
Expected: PASS (7/7).

- [ ] **Step 5: Commit**

```bash
git add src/db/bodyMetrics.ts src/db/__tests__/bodyMetrics.test.ts
git commit -m "feat(body-comp): upsertBodyMetric with program auto-link"
```

---

## Task 4: bodyMetrics.ts — range queries + aggregates

**Files:**
- Modify: `src/db/bodyMetrics.ts`
- Modify: `src/db/__tests__/bodyMetrics.test.ts`

- [ ] **Step 1: Append failing tests for range queries + moving average**

Append to the existing `describe` block:

```ts
  it('getBodyMetricsInRange returns rows ordered by date', async () => {
    await upsertBodyMetric({ metricType: 'weight', value: 180, unit: 'lb', recordedDate: '2026-04-15', note: null });
    await upsertBodyMetric({ metricType: 'weight', value: 178, unit: 'lb', recordedDate: '2026-04-17', note: null });
    await upsertBodyMetric({ metricType: 'weight', value: 179, unit: 'lb', recordedDate: '2026-04-16', note: null });

    const rows = await getBodyMetricsInRange('weight', '2026-04-15', '2026-04-17');
    expect(rows).toHaveLength(3);
    expect(rows.map(r => r.recordedDate)).toEqual(['2026-04-15', '2026-04-16', '2026-04-17']);
    expect(rows.map(r => r.value)).toEqual([180, 179, 178]);
  });

  it('getBodyMetricsInRange respects metric_type filter', async () => {
    await upsertBodyMetric({ metricType: 'weight', value: 180, unit: 'lb', recordedDate: '2026-04-17', note: null });
    await upsertBodyMetric({ metricType: 'body_fat', value: 18.0, unit: 'percent', recordedDate: '2026-04-17', note: null });

    const weights = await getBodyMetricsInRange('weight', '2026-04-01', '2026-04-30');
    expect(weights).toHaveLength(1);
    expect(weights[0].metricType).toBe('weight');
  });

  it('computeMovingAverage returns null when fewer than 3 points in window', () => {
    const input = [
      { recordedDate: '2026-04-15', value: 180 },
      { recordedDate: '2026-04-16', value: 179 },
    ];
    const result = computeMovingAverage(input, '2026-04-16', 7);
    expect(result).toBeNull();
  });

  it('computeMovingAverage averages the last N days (inclusive window)', () => {
    const input = [
      { recordedDate: '2026-04-10', value: 180 },
      { recordedDate: '2026-04-11', value: 179 },
      { recordedDate: '2026-04-12', value: 178 },
      { recordedDate: '2026-04-13', value: 177 },
    ];
    // 7-day window ending 2026-04-13 covers all 4 points: avg = 178.5
    expect(computeMovingAverage(input, '2026-04-13', 7)).toBeCloseTo(178.5, 2);
  });

  it('computeMovingAverage skips missing days (does not zero-fill)', () => {
    const input = [
      { recordedDate: '2026-04-10', value: 180 },
      // gap
      { recordedDate: '2026-04-13', value: 174 },
      { recordedDate: '2026-04-16', value: 168 },
    ];
    expect(computeMovingAverage(input, '2026-04-16', 7)).toBeCloseTo(174, 2);
  });
```

Also extend the top-of-file import:

```ts
import {
  insertBodyMetric,
  getBodyMetricByDate,
  rowToBodyMetric,
  upsertBodyMetric,
  getBodyMetricsInRange,
  computeMovingAverage,
} from '../bodyMetrics';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/db/__tests__/bodyMetrics.test.ts`
Expected: FAIL — functions not exported.

- [ ] **Step 3: Implement range query + MA**

Append to `src/db/bodyMetrics.ts`:

```ts
export async function getBodyMetricsInRange(
  metricType: BodyMetricType,
  startDate: string,
  endDate: string,
): Promise<BodyMetric[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT * FROM body_metrics
      WHERE metric_type = ?
        AND recorded_date BETWEEN ? AND ?
      ORDER BY recorded_date ASC`,
    [metricType, startDate, endDate],
  );
  const out: BodyMetric[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    out.push(rowToBodyMetric(result.rows.item(i) as BodyMetricRow));
  }
  return out;
}

/**
 * Average the values whose recordedDate is within `[endDate - (windowDays - 1), endDate]`.
 * Returns null if fewer than 3 samples fall within the window (honest about insufficient data).
 */
export function computeMovingAverage(
  points: { recordedDate: string; value: number }[],
  endDate: string,
  windowDays: number,
): number | null {
  const end = new Date(endDate + 'T00:00:00Z');
  const startMs = end.getTime() - (windowDays - 1) * 86400000;
  const inWindow = points.filter(p => {
    const ts = new Date(p.recordedDate + 'T00:00:00Z').getTime();
    return ts >= startMs && ts <= end.getTime();
  });
  if (inWindow.length < 3) return null;
  const sum = inWindow.reduce((acc, p) => acc + p.value, 0);
  return sum / inWindow.length;
}
```

- [ ] **Step 4: Run tests**

Run: `npx jest src/db/__tests__/bodyMetrics.test.ts`
Expected: PASS (12/12).

- [ ] **Step 5: Commit**

```bash
git add src/db/bodyMetrics.ts src/db/__tests__/bodyMetrics.test.ts
git commit -m "feat(body-comp): range query + 7-day moving average helper"
```

---

## Task 5: LogBodyMetricModal — weight mode baseline

**Files:**
- Create: `src/components/LogBodyMetricModal.tsx`
- Create: `src/components/__tests__/LogBodyMetricModal.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/__tests__/LogBodyMetricModal.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { LogBodyMetricModal } from '../LogBodyMetricModal';

describe('LogBodyMetricModal — weight mode', () => {
  it('renders the weight title when mode=weight', () => {
    const { getByText } = render(
      <LogBodyMetricModal
        visible={true}
        mode="weight"
        initialDate="2026-04-22"
        onClose={jest.fn()}
        onSave={jest.fn()}
      />,
    );
    expect(getByText('Log Weight')).toBeTruthy();
  });

  it('Save button is disabled when value is empty', () => {
    const { getByTestId } = render(
      <LogBodyMetricModal
        visible={true}
        mode="weight"
        initialDate="2026-04-22"
        onClose={jest.fn()}
        onSave={jest.fn()}
      />,
    );
    const saveBtn = getByTestId('log-body-metric-save');
    expect(saveBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('Save button enables on valid weight value', () => {
    const { getByTestId } = render(
      <LogBodyMetricModal
        visible={true}
        mode="weight"
        initialDate="2026-04-22"
        onClose={jest.fn()}
        onSave={jest.fn()}
      />,
    );
    fireEvent.changeText(getByTestId('log-body-metric-value'), '177.4');
    expect(getByTestId('log-body-metric-save').props.accessibilityState?.disabled).toBe(false);
  });

  it('Save button stays disabled for out-of-range weight (< 50)', () => {
    const { getByTestId } = render(
      <LogBodyMetricModal
        visible={true}
        mode="weight"
        initialDate="2026-04-22"
        onClose={jest.fn()}
        onSave={jest.fn()}
      />,
    );
    fireEvent.changeText(getByTestId('log-body-metric-value'), '30');
    expect(getByTestId('log-body-metric-save').props.accessibilityState?.disabled).toBe(true);
  });

  it('calls onSave with normalized payload when Save is pressed', () => {
    const onSave = jest.fn();
    const { getByTestId } = render(
      <LogBodyMetricModal
        visible={true}
        mode="weight"
        initialDate="2026-04-22"
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );
    fireEvent.changeText(getByTestId('log-body-metric-value'), '177.4');
    fireEvent.press(getByTestId('log-body-metric-save'));
    expect(onSave).toHaveBeenCalledWith({
      metricType: 'weight',
      value: 177.4,
      unit: 'lb',
      recordedDate: '2026-04-22',
      note: null,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/components/__tests__/LogBodyMetricModal.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement LogBodyMetricModal (weight mode only)**

Create `src/components/LogBodyMetricModal.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import type { BodyMetricType, BodyMetricUnit } from '../types';

export interface LogBodyMetricPayload {
  metricType: BodyMetricType;
  value: number;
  unit: BodyMetricUnit;
  recordedDate: string;
  note: string | null;
}

export interface LogBodyMetricModalProps {
  visible: boolean;
  mode: BodyMetricType;
  initialDate: string;
  initialValue?: number | null;
  initialNote?: string | null;
  onClose: () => void;
  onSave: (payload: LogBodyMetricPayload) => void;
}

const WEIGHT_RANGE = { min: 50, max: 500 };

export function LogBodyMetricModal({
  visible,
  mode,
  initialDate,
  initialValue,
  initialNote,
  onClose,
  onSave,
}: LogBodyMetricModalProps) {
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) {
      setValue(initialValue != null ? String(initialValue) : '');
      setNote(initialNote ?? '');
    }
  }, [visible, initialValue, initialNote]);

  const parsed = parseFloat(value);
  const inRange =
    !Number.isNaN(parsed) &&
    parsed >= WEIGHT_RANGE.min &&
    parsed <= WEIGHT_RANGE.max;

  const handleSave = () => {
    if (!inRange) return;
    onSave({
      metricType: 'weight',
      value: parsed,
      unit: 'lb',
      recordedDate: initialDate,
      note: note.trim() === '' ? null : note.trim(),
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Log Weight</Text>

          <Text style={styles.label}>Weight (lb)</Text>
          <TextInput
            testID="log-body-metric-value"
            style={styles.input}
            placeholder="e.g. 177.4"
            placeholderTextColor={colors.secondary}
            keyboardType="decimal-pad"
            value={value}
            onChangeText={setValue}
          />
          {!inRange && value.length > 0 && (
            <Text style={styles.hint}>Weight must be between 50 and 500 lb.</Text>
          )}

          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. post-race, traveling"
            placeholderTextColor={colors.secondary}
            maxLength={140}
            value={note}
            onChangeText={setNote}
          />

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              testID="log-body-metric-save"
              accessibilityState={{ disabled: !inRange }}
              onPress={handleSave}
              style={[styles.saveBtn, !inRange && styles.saveBtnDisabled]}
            >
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: { color: colors.primary, fontSize: fontSize.lg, fontWeight: weightBold, marginBottom: spacing.base },
  label: { color: colors.secondary, fontSize: fontSize.xs, marginTop: spacing.base, marginBottom: spacing.xs, fontWeight: weightSemiBold, letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surfaceElevated,
    color: colors.primary,
    borderRadius: 10,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
  },
  hint: { color: colors.danger, fontSize: fontSize.xs, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: 10, backgroundColor: colors.surfaceElevated },
  cancelText: { color: colors.secondary, fontSize: fontSize.base, fontWeight: weightSemiBold },
  saveBtn: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: 10, backgroundColor: colors.accent },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { color: colors.background, fontSize: fontSize.base, fontWeight: weightBold },
});
```

- [ ] **Step 4: Run tests**

Run: `npx jest src/components/__tests__/LogBodyMetricModal.test.tsx`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add src/components/LogBodyMetricModal.tsx src/components/__tests__/LogBodyMetricModal.test.tsx
git commit -m "feat(body-comp): LogBodyMetricModal weight mode"
```

---

## Task 6: LogBodyMetricModal — add body-fat mode + mode toggle

**Files:**
- Modify: `src/components/LogBodyMetricModal.tsx`
- Modify: `src/components/__tests__/LogBodyMetricModal.test.tsx`

- [ ] **Step 1: Append failing tests for body-fat mode + toggle**

Append to the existing test file (after the existing describe block, as a new describe):

```tsx
describe('LogBodyMetricModal — body_fat mode & toggle', () => {
  it('renders the body fat title when mode=body_fat', () => {
    const { getByText } = render(
      <LogBodyMetricModal
        visible={true}
        mode="body_fat"
        initialDate="2026-04-25"
        onClose={jest.fn()}
        onSave={jest.fn()}
      />,
    );
    expect(getByText('Log Body Fat %')).toBeTruthy();
  });

  it('rejects body fat value outside 3–60', () => {
    const { getByTestId } = render(
      <LogBodyMetricModal
        visible={true}
        mode="body_fat"
        initialDate="2026-04-25"
        onClose={jest.fn()}
        onSave={jest.fn()}
      />,
    );
    fireEvent.changeText(getByTestId('log-body-metric-value'), '0.5');
    expect(getByTestId('log-body-metric-save').props.accessibilityState?.disabled).toBe(true);
  });

  it('accepts valid body fat value', () => {
    const onSave = jest.fn();
    const { getByTestId } = render(
      <LogBodyMetricModal
        visible={true}
        mode="body_fat"
        initialDate="2026-04-25"
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );
    fireEvent.changeText(getByTestId('log-body-metric-value'), '18.0');
    fireEvent.press(getByTestId('log-body-metric-save'));
    expect(onSave).toHaveBeenCalledWith({
      metricType: 'body_fat',
      value: 18.0,
      unit: 'percent',
      recordedDate: '2026-04-25',
      note: null,
    });
  });

  it('mode toggle switches the active metric', () => {
    const { getByTestId, getByText } = render(
      <LogBodyMetricModal
        visible={true}
        mode="weight"
        initialDate="2026-04-25"
        onClose={jest.fn()}
        onSave={jest.fn()}
      />,
    );
    expect(getByText('Log Weight')).toBeTruthy();
    fireEvent.press(getByTestId('log-body-metric-mode-body_fat'));
    expect(getByText('Log Body Fat %')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/components/__tests__/LogBodyMetricModal.test.tsx`
Expected: FAIL (body-fat tests fail; weight tests still pass).

- [ ] **Step 3: Extend LogBodyMetricModal to support body-fat mode + toggle**

Replace the entire contents of `src/components/LogBodyMetricModal.tsx` with:

```tsx
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import type { BodyMetricType, BodyMetricUnit } from '../types';

export interface LogBodyMetricPayload {
  metricType: BodyMetricType;
  value: number;
  unit: BodyMetricUnit;
  recordedDate: string;
  note: string | null;
}

export interface LogBodyMetricModalProps {
  visible: boolean;
  mode: BodyMetricType;
  initialDate: string;
  initialValue?: number | null;
  initialNote?: string | null;
  onClose: () => void;
  onSave: (payload: LogBodyMetricPayload) => void;
}

const RANGES: Record<BodyMetricType, { min: number; max: number; unit: BodyMetricUnit; label: string; title: string }> = {
  weight:    { min: 50, max: 500, unit: 'lb',      label: 'Weight (lb)',      title: 'Log Weight' },
  body_fat:  { min: 3,  max: 60,  unit: 'percent', label: 'Body Fat (%)',     title: 'Log Body Fat %' },
};

export function LogBodyMetricModal({
  visible,
  mode: initialMode,
  initialDate,
  initialValue,
  initialNote,
  onClose,
  onSave,
}: LogBodyMetricModalProps) {
  const [mode, setMode] = useState<BodyMetricType>(initialMode);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setValue(initialValue != null ? String(initialValue) : '');
      setNote(initialNote ?? '');
    }
  }, [visible, initialMode, initialValue, initialNote]);

  const range = RANGES[mode];
  const parsed = parseFloat(value);
  const inRange =
    !Number.isNaN(parsed) &&
    parsed >= range.min &&
    parsed <= range.max;

  const handleSave = () => {
    if (!inRange) return;
    onSave({
      metricType: mode,
      value: parsed,
      unit: range.unit,
      recordedDate: initialDate,
      note: note.trim() === '' ? null : note.trim(),
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{range.title}</Text>

          <View style={styles.modeRow}>
            <Pressable
              testID="log-body-metric-mode-weight"
              onPress={() => setMode('weight')}
              style={[styles.modeBtn, mode === 'weight' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeText, mode === 'weight' && styles.modeTextActive]}>Weight</Text>
            </Pressable>
            <Pressable
              testID="log-body-metric-mode-body_fat"
              onPress={() => setMode('body_fat')}
              style={[styles.modeBtn, mode === 'body_fat' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeText, mode === 'body_fat' && styles.modeTextActive]}>Body Fat %</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>{range.label}</Text>
          <TextInput
            testID="log-body-metric-value"
            style={styles.input}
            placeholder={mode === 'weight' ? 'e.g. 177.4' : 'e.g. 18.0'}
            placeholderTextColor={colors.secondary}
            keyboardType="decimal-pad"
            value={value}
            onChangeText={setValue}
          />
          {!inRange && value.length > 0 && (
            <Text style={styles.hint}>
              {mode === 'weight'
                ? 'Weight must be between 50 and 500 lb.'
                : 'Body fat must be between 3 and 60%.'}
            </Text>
          )}

          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. post-race, traveling"
            placeholderTextColor={colors.secondary}
            maxLength={140}
            value={note}
            onChangeText={setNote}
          />

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              testID="log-body-metric-save"
              accessibilityState={{ disabled: !inRange }}
              onPress={handleSave}
              style={[styles.saveBtn, !inRange && styles.saveBtnDisabled]}
            >
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: { color: colors.primary, fontSize: fontSize.lg, fontWeight: weightBold, marginBottom: spacing.base },
  modeRow: { flexDirection: 'row', backgroundColor: colors.surfaceElevated, borderRadius: 10, padding: 3, marginBottom: spacing.sm },
  modeBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 8, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.surface },
  modeText: { color: colors.secondary, fontSize: fontSize.sm, fontWeight: weightSemiBold },
  modeTextActive: { color: colors.primary },
  label: { color: colors.secondary, fontSize: fontSize.xs, marginTop: spacing.base, marginBottom: spacing.xs, fontWeight: weightSemiBold, letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surfaceElevated,
    color: colors.primary,
    borderRadius: 10,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
  },
  hint: { color: colors.danger, fontSize: fontSize.xs, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: 10, backgroundColor: colors.surfaceElevated },
  cancelText: { color: colors.secondary, fontSize: fontSize.base, fontWeight: weightSemiBold },
  saveBtn: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: 10, backgroundColor: colors.accent },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { color: colors.background, fontSize: fontSize.base, fontWeight: weightBold },
});
```

- [ ] **Step 2b: Run tests**

Run: `npx jest src/components/__tests__/LogBodyMetricModal.test.tsx`
Expected: PASS (9/9).

- [ ] **Step 3: Commit**

```bash
git add src/components/LogBodyMetricModal.tsx src/components/__tests__/LogBodyMetricModal.test.tsx
git commit -m "feat(body-comp): add body-fat mode + mode toggle to log modal"
```

---

## Task 7: LogBodyMetricModal — date picker + edit-mode pre-fill + collision prompt

**Files:**
- Modify: `src/components/LogBodyMetricModal.tsx`
- Modify: `src/components/__tests__/LogBodyMetricModal.test.tsx`

- [ ] **Step 1: Append failing tests**

Append to `src/components/__tests__/LogBodyMetricModal.test.tsx`:

```tsx
describe('LogBodyMetricModal — date, edit mode, collision', () => {
  it('pre-fills value and note in edit mode', () => {
    const { getByTestId } = render(
      <LogBodyMetricModal
        visible={true}
        mode="weight"
        initialDate="2026-04-17"
        initialValue={177.4}
        initialNote="post-run"
        onClose={jest.fn()}
        onSave={jest.fn()}
      />,
    );
    expect(getByTestId('log-body-metric-value').props.value).toBe('177.4');
  });

  it('calls onCollision when a date with an existing reading is saved in add-mode', () => {
    const onCollision = jest.fn();
    const onSave = jest.fn();
    const { getByTestId } = render(
      <LogBodyMetricModal
        visible={true}
        mode="weight"
        initialDate="2026-04-17"
        existingDates={new Set(['2026-04-17'])}
        onClose={jest.fn()}
        onSave={onSave}
        onCollision={onCollision}
      />,
    );
    fireEvent.changeText(getByTestId('log-body-metric-value'), '177.4');
    fireEvent.press(getByTestId('log-body-metric-save'));
    expect(onCollision).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does NOT call onCollision when in edit mode (initialValue is supplied)', () => {
    const onCollision = jest.fn();
    const onSave = jest.fn();
    const { getByTestId } = render(
      <LogBodyMetricModal
        visible={true}
        mode="weight"
        initialDate="2026-04-17"
        initialValue={177.4}
        existingDates={new Set(['2026-04-17'])}
        onClose={jest.fn()}
        onSave={onSave}
        onCollision={onCollision}
      />,
    );
    fireEvent.changeText(getByTestId('log-body-metric-value'), '176.0');
    fireEvent.press(getByTestId('log-body-metric-save'));
    expect(onCollision).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/components/__tests__/LogBodyMetricModal.test.tsx`
Expected: FAIL — props `existingDates` and `onCollision` don't exist; edit-mode pre-fill already works from Task 5.

- [ ] **Step 3: Extend props + handler in LogBodyMetricModal**

Update the `LogBodyMetricModalProps` interface and the `handleSave` function inside `src/components/LogBodyMetricModal.tsx`. Locate the existing `LogBodyMetricModalProps` definition and replace with:

```tsx
export interface LogBodyMetricModalProps {
  visible: boolean;
  mode: BodyMetricType;
  initialDate: string;
  initialValue?: number | null;
  initialNote?: string | null;
  existingDates?: Set<string>;   // populated in add-mode to detect collisions
  onClose: () => void;
  onSave: (payload: LogBodyMetricPayload) => void;
  onCollision?: (payload: LogBodyMetricPayload) => void;
}
```

Update the function signature to destructure the new props:

```tsx
export function LogBodyMetricModal({
  visible,
  mode: initialMode,
  initialDate,
  initialValue,
  initialNote,
  existingDates,
  onClose,
  onSave,
  onCollision,
}: LogBodyMetricModalProps) {
```

Replace the existing `handleSave` function body:

```tsx
  const handleSave = () => {
    if (!inRange) return;
    const payload: LogBodyMetricPayload = {
      metricType: mode,
      value: parsed,
      unit: range.unit,
      recordedDate: initialDate,
      note: note.trim() === '' ? null : note.trim(),
    };

    const isEditMode = initialValue != null;
    const hasCollision =
      !isEditMode && existingDates != null && existingDates.has(initialDate);

    if (hasCollision && onCollision) {
      onCollision(payload);
      return;
    }

    onSave(payload);
    onClose();
  };
```

- [ ] **Step 4: Run tests**

Run: `npx jest src/components/__tests__/LogBodyMetricModal.test.tsx`
Expected: PASS (12/12).

- [ ] **Step 5: Commit**

```bash
git add src/components/LogBodyMetricModal.tsx src/components/__tests__/LogBodyMetricModal.test.tsx
git commit -m "feat(body-comp): edit-mode pre-fill + collision detection in log modal"
```

---

## Task 8: DashboardWeightCard

**Files:**
- Create: `src/components/DashboardWeightCard.tsx`
- Create: `src/components/__tests__/DashboardWeightCard.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/__tests__/DashboardWeightCard.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DashboardWeightCard } from '../DashboardWeightCard';

describe('DashboardWeightCard', () => {
  it('renders the not-logged state with prominent + Log button', () => {
    const { getByText, getByTestId } = render(
      <DashboardWeightCard
        todayWeight={null}
        yesterdayWeight={176.8}
        onPressLog={jest.fn()}
        onPressCard={jest.fn()}
        onPressEdit={jest.fn()}
      />,
    );
    expect(getByText('Not logged')).toBeTruthy();
    expect(getByText('Yesterday: 176.8 lb')).toBeTruthy();
    expect(getByTestId('weight-card-log-btn')).toBeTruthy();
  });

  it('renders the logged state with today weight and delta', () => {
    const { getByText, queryByTestId } = render(
      <DashboardWeightCard
        todayWeight={177.4}
        yesterdayWeight={178.0}
        onPressLog={jest.fn()}
        onPressCard={jest.fn()}
        onPressEdit={jest.fn()}
      />,
    );
    expect(getByText('177.4')).toBeTruthy();
    expect(getByText('↓ 0.6 vs yesterday')).toBeTruthy();
    expect(queryByTestId('weight-card-log-btn')).toBeNull();
    expect(queryByTestId('weight-card-edit-btn')).toBeTruthy();
  });

  it('shows neutral delta when no yesterday weight', () => {
    const { getByText } = render(
      <DashboardWeightCard
        todayWeight={177.4}
        yesterdayWeight={null}
        onPressLog={jest.fn()}
        onPressCard={jest.fn()}
        onPressEdit={jest.fn()}
      />,
    );
    expect(getByText('first reading')).toBeTruthy();
  });

  it('invokes onPressLog when + Log button is pressed (not-logged)', () => {
    const onPressLog = jest.fn();
    const { getByTestId } = render(
      <DashboardWeightCard
        todayWeight={null}
        yesterdayWeight={null}
        onPressLog={onPressLog}
        onPressCard={jest.fn()}
        onPressEdit={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('weight-card-log-btn'));
    expect(onPressLog).toHaveBeenCalledTimes(1);
  });

  it('invokes onPressEdit when edit icon is pressed (logged)', () => {
    const onPressEdit = jest.fn();
    const { getByTestId } = render(
      <DashboardWeightCard
        todayWeight={177.4}
        yesterdayWeight={178.0}
        onPressLog={jest.fn()}
        onPressCard={jest.fn()}
        onPressEdit={onPressEdit}
      />,
    );
    fireEvent.press(getByTestId('weight-card-edit-btn'));
    expect(onPressEdit).toHaveBeenCalledTimes(1);
  });

  it('invokes onPressCard when the card body is pressed', () => {
    const onPressCard = jest.fn();
    const { getByTestId } = render(
      <DashboardWeightCard
        todayWeight={177.4}
        yesterdayWeight={178.0}
        onPressLog={jest.fn()}
        onPressCard={onPressCard}
        onPressEdit={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('weight-card-body'));
    expect(onPressCard).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/components/__tests__/DashboardWeightCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement DashboardWeightCard**

Create `src/components/DashboardWeightCard.tsx`:

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

export interface DashboardWeightCardProps {
  todayWeight: number | null;
  yesterdayWeight: number | null;
  onPressLog: () => void;
  onPressCard: () => void;
  onPressEdit: () => void;
}

function formatDelta(today: number, yesterday: number): { text: string; color: string } {
  const diff = today - yesterday;
  const abs = Math.abs(diff).toFixed(1);
  if (Math.abs(diff) < 0.05) {
    return { text: `— flat vs yesterday`, color: colors.secondary };
  }
  const arrow = diff < 0 ? '↓' : '↑';
  const color = diff < 0 ? colors.accent : colors.danger;
  return { text: `${arrow} ${abs} vs yesterday`, color };
}

export function DashboardWeightCard({
  todayWeight,
  yesterdayWeight,
  onPressLog,
  onPressCard,
  onPressEdit,
}: DashboardWeightCardProps) {
  const hasToday = todayWeight != null;

  return (
    <Pressable testID="weight-card-body" onPress={onPressCard} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.leftCol}>
          <Text style={styles.label}>WEIGHT · TODAY</Text>
          {hasToday ? (
            <>
              <Text style={styles.value}>{todayWeight!.toFixed(1)}<Text style={styles.unit}> lb</Text></Text>
              <Text style={[styles.delta, {
                color: yesterdayWeight != null
                  ? formatDelta(todayWeight!, yesterdayWeight).color
                  : colors.secondary
              }]}>
                {yesterdayWeight != null
                  ? formatDelta(todayWeight!, yesterdayWeight).text
                  : 'first reading'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.notLogged}>Not logged</Text>
              <Text style={styles.delta}>
                {yesterdayWeight != null ? `Yesterday: ${yesterdayWeight.toFixed(1)} lb` : 'No recent readings'}
              </Text>
            </>
          )}
        </View>
        {hasToday ? (
          <Pressable testID="weight-card-edit-btn" onPress={onPressEdit} hitSlop={8} style={styles.editBtn}>
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        ) : (
          <Pressable testID="weight-card-log-btn" onPress={onPressLog} hitSlop={8} style={styles.logBtn}>
            <Text style={styles.logText}>+ Log</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginVertical: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leftCol: { flex: 1 },
  label: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: weightBold, letterSpacing: 0.8 },
  value: { color: colors.primary, fontSize: fontSize.xxl, fontWeight: weightBold, marginTop: 4 },
  unit: { color: colors.secondary, fontSize: fontSize.sm, fontWeight: '400' },
  notLogged: { color: colors.primary, fontSize: fontSize.lg, fontWeight: weightSemiBold, marginTop: 4 },
  delta: { color: colors.secondary, fontSize: fontSize.xs, marginTop: 2 },
  logBtn: { backgroundColor: colors.accent, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: 8 },
  logText: { color: colors.background, fontSize: fontSize.xs, fontWeight: weightBold },
  editBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  editText: { color: colors.accent, fontSize: fontSize.xs, fontWeight: weightSemiBold },
});
```

- [ ] **Step 4: Run tests**

Run: `npx jest src/components/__tests__/DashboardWeightCard.test.tsx`
Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add src/components/DashboardWeightCard.tsx src/components/__tests__/DashboardWeightCard.test.tsx
git commit -m "feat(body-comp): DashboardWeightCard component"
```

---

## Task 9: Wire DashboardWeightCard into DashboardScreen

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`
- Modify: `src/navigation/TabNavigator.tsx` (type extension)

- [ ] **Step 1: Extend ProteinStackParamList initialTab type**

In `src/navigation/TabNavigator.tsx`, find the existing `ProteinStackParamList` type and widen the `initialTab` to accept index 2:

```ts
export type ProteinStackParamList = {
  ProteinHome: { initialTab?: 0 | 1 | 2 } | undefined;
  // ...other entries unchanged
};
```

If `initialTab` is currently typed as `number`, leave it as `number` — just ensure the type allows index 2 numerically.

- [ ] **Step 2: Add state + data fetching in DashboardScreen**

In `src/screens/DashboardScreen.tsx`, add imports at the top:

```tsx
import { DashboardWeightCard } from '../components/DashboardWeightCard';
import { LogBodyMetricModal } from '../components/LogBodyMetricModal';
import { getBodyMetricByDate, upsertBodyMetric } from '../db/bodyMetrics';
```

Inside the `DashboardScreen` component body (near other state hooks), add:

```tsx
  const [todayWeight, setTodayWeight] = useState<number | null>(null);
  const [yesterdayWeight, setYesterdayWeight] = useState<number | null>(null);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logModalInitialValue, setLogModalInitialValue] = useState<number | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const refreshWeights = useCallback(async () => {
    const [t, y] = await Promise.all([
      getBodyMetricByDate('weight', today),
      getBodyMetricByDate('weight', yesterday),
    ]);
    setTodayWeight(t?.value ?? null);
    setYesterdayWeight(y?.value ?? null);
  }, [today, yesterday]);

  useFocusEffect(
    useCallback(() => {
      refreshWeights();
    }, [refreshWeights]),
  );
```

- [ ] **Step 3: Render the card between NextWorkoutCard and NutritionRingsCard**

Locate `<NextWorkoutCard ... />` in the DashboardScreen JSX. Immediately after it (before `<NutritionRingsCard />`), add:

```tsx
        <DashboardWeightCard
          todayWeight={todayWeight}
          yesterdayWeight={yesterdayWeight}
          onPressLog={() => {
            setLogModalInitialValue(null);
            setLogModalVisible(true);
          }}
          onPressEdit={() => {
            setLogModalInitialValue(todayWeight);
            setLogModalVisible(true);
          }}
          onPressCard={() => {
            navigation.navigate('ProteinTab', { initialTab: 2 });
          }}
        />

        <LogBodyMetricModal
          visible={logModalVisible}
          mode="weight"
          initialDate={today}
          initialValue={logModalInitialValue}
          onClose={() => setLogModalVisible(false)}
          onSave={async (payload) => {
            await upsertBodyMetric({
              metricType: payload.metricType,
              value: payload.value,
              unit: payload.unit,
              recordedDate: payload.recordedDate,
              note: payload.note,
            });
            await refreshWeights();
          }}
        />
```

- [ ] **Step 4: Typecheck + start the app**

Run: `npx tsc --noEmit`
Expected: No errors.

Launch the app on emulator. Open the Dashboard. Expected: a new "WEIGHT · TODAY" card appears between Next Workout and Nutrition Rings. Tap "+ Log" → modal opens. Enter 177.4, Save. Card updates to show 177.4 with appropriate delta.

- [ ] **Step 5: Commit**

```bash
git add src/screens/DashboardScreen.tsx src/navigation/TabNavigator.tsx
git commit -m "feat(body-comp): wire DashboardWeightCard into Dashboard"
```

---

## Task 10: ProteinScreen — add BODY COMP tab (scaffold only)

**Files:**
- Create: `src/screens/BodyCompView.tsx` (minimal shell)
- Modify: `src/screens/ProteinScreen.tsx`

- [ ] **Step 1: Create BodyCompView shell**

Create `src/screens/BodyCompView.tsx`:

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize } from '../theme/typography';

export function BodyCompView() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Body composition — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  placeholder: { color: colors.secondary, fontSize: fontSize.base },
});
```

- [ ] **Step 2: Extend ProteinScreen to include a BODY COMP tab**

In `src/screens/ProteinScreen.tsx`:

1. Import the new view at the top:
   ```tsx
   import { BodyCompView } from './BodyCompView';
   ```

2. Find the existing `TABS` array (constant). It currently looks like `['MACROS', 'HYDRATION']`. Add `'BODY COMP'`:
   ```tsx
   const TABS = ['MACROS', 'HYDRATION', 'BODY COMP'];
   ```

3. Change the conditional render from a binary if/else to a three-way switch:
   ```tsx
   {activeTab === 0 ? (
     <MacrosView navigation={navigation} />
   ) : activeTab === 1 ? (
     <HydrationView />
   ) : (
     <BodyCompView />
   )}
   ```

- [ ] **Step 3: Typecheck + smoke-test on device**

Run: `npx tsc --noEmit`
Expected: No errors.

Launch app, navigate to Nutrition, tap BODY COMP. Expected: the tab indicator moves to BODY COMP, screen shows placeholder text.

- [ ] **Step 4: Commit**

```bash
git add src/screens/BodyCompView.tsx src/screens/ProteinScreen.tsx
git commit -m "feat(body-comp): add BODY COMP tab to ProteinScreen (scaffold)"
```

---

## Task 11: BodyCompScopeBar — animated segmented control

**Files:**
- Create: `src/components/BodyCompScopeBar.tsx`
- Create: `src/components/__tests__/BodyCompScopeBar.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/__tests__/BodyCompScopeBar.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BodyCompScopeBar } from '../BodyCompScopeBar';

describe('BodyCompScopeBar', () => {
  it('renders all three segments', () => {
    const { getByText } = render(
      <BodyCompScopeBar scope="month" onChange={jest.fn()} />,
    );
    expect(getByText('MONTH')).toBeTruthy();
    expect(getByText('WEEK')).toBeTruthy();
    expect(getByText('DAY')).toBeTruthy();
  });

  it('fires onChange with the new scope on tap', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <BodyCompScopeBar scope="month" onChange={onChange} />,
    );
    fireEvent.press(getByTestId('scope-seg-week'));
    expect(onChange).toHaveBeenCalledWith('week');
  });

  it('applies active styling to the current scope segment', () => {
    const { getByTestId } = render(
      <BodyCompScopeBar scope="day" onChange={jest.fn()} />,
    );
    const daySeg = getByTestId('scope-seg-day');
    expect(daySeg.props.accessibilityState?.selected).toBe(true);
    const monthSeg = getByTestId('scope-seg-month');
    expect(monthSeg.props.accessibilityState?.selected).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/components/__tests__/BodyCompScopeBar.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement BodyCompScopeBar**

Create `src/components/BodyCompScopeBar.tsx`:

```tsx
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';
import type { BodyCompScope } from '../types';

const SCOPES: { key: BodyCompScope; label: string }[] = [
  { key: 'month', label: 'MONTH' },
  { key: 'week',  label: 'WEEK' },
  { key: 'day',   label: 'DAY' },
];

export interface BodyCompScopeBarProps {
  scope: BodyCompScope;
  onChange: (next: BodyCompScope) => void;
}

export function BodyCompScopeBar({ scope, onChange }: BodyCompScopeBarProps) {
  const translate = useRef(new Animated.Value(0)).current;
  const activeIndex = SCOPES.findIndex(s => s.key === scope);

  useEffect(() => {
    Animated.timing(translate, {
      toValue: activeIndex,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, translate]);

  return (
    <View style={styles.bar}>
      <Animated.View
        style={[
          styles.slider,
          {
            transform: [{
              translateX: translate.interpolate({
                inputRange: [0, 1, 2],
                outputRange: ['0%', '100%', '200%'],
              }),
            }],
          },
        ]}
      />
      {SCOPES.map(s => {
        const isActive = s.key === scope;
        return (
          <Pressable
            key={s.key}
            testID={`scope-seg-${s.key}`}
            onPress={() => onChange(s.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            style={styles.seg}
          >
            <Text style={[styles.segText, isActive && styles.segTextActive]}>{s.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
    position: 'relative',
  },
  slider: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    width: '33.33%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 9,
  },
  seg: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', zIndex: 1 },
  segText: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: weightBold, letterSpacing: 0.6 },
  segTextActive: { color: colors.primary },
});
```

- [ ] **Step 4: Run tests**

Run: `npx jest src/components/__tests__/BodyCompScopeBar.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add src/components/BodyCompScopeBar.tsx src/components/__tests__/BodyCompScopeBar.test.tsx
git commit -m "feat(body-comp): BodyCompScopeBar animated segmented control"
```

---

## Task 12: BodyCompDateNav — scope-aware date navigator

**Files:**
- Create: `src/components/BodyCompDateNav.tsx`
- Create: `src/components/__tests__/BodyCompDateNav.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/__tests__/BodyCompDateNav.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BodyCompDateNav, formatScopeLabel, stepScopeDate } from '../BodyCompDateNav';

describe('formatScopeLabel', () => {
  it('formats month scope as "April 2026"', () => {
    expect(formatScopeLabel('month', '2026-04-15')).toBe('April 2026');
  });
  it('formats week scope as "Apr 13 – 19, 2026"', () => {
    // 2026-04-15 is a Wednesday; week starts Monday 13th, ends Sunday 19th
    expect(formatScopeLabel('week', '2026-04-15')).toBe('Apr 13 – 19, 2026');
  });
  it('formats day scope as "Wed · Apr 15, 2026"', () => {
    expect(formatScopeLabel('day', '2026-04-15')).toBe('Wed · Apr 15, 2026');
  });
});

describe('stepScopeDate', () => {
  it('steps month +1', () => {
    expect(stepScopeDate('month', '2026-04-15', 1)).toBe('2026-05-15');
  });
  it('steps week +1 (7 days)', () => {
    expect(stepScopeDate('week', '2026-04-15', 1)).toBe('2026-04-22');
  });
  it('steps day +1', () => {
    expect(stepScopeDate('day', '2026-04-15', 1)).toBe('2026-04-16');
  });
  it('steps day -1 across a month boundary', () => {
    expect(stepScopeDate('day', '2026-04-01', -1)).toBe('2026-03-31');
  });
});

describe('BodyCompDateNav', () => {
  it('calls onChange with stepped date when arrow tapped', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <BodyCompDateNav
        scope="day"
        date="2026-04-15"
        today="2026-04-22"
        onChange={onChange}
      />,
    );
    fireEvent.press(getByTestId('date-nav-prev'));
    expect(onChange).toHaveBeenCalledWith('2026-04-14');
  });

  it('disables the next arrow when at today', () => {
    const { getByTestId } = render(
      <BodyCompDateNav
        scope="day"
        date="2026-04-22"
        today="2026-04-22"
        onChange={jest.fn()}
      />,
    );
    const nextBtn = getByTestId('date-nav-next');
    expect(nextBtn.props.accessibilityState?.disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/components/__tests__/BodyCompDateNav.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement BodyCompDateNav + exported helpers**

Create `src/components/BodyCompDateNav.tsx`:

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import type { BodyCompScope } from '../types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function startOfWeekMonday(d: Date): Date {
  const day = d.getDay();                  // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;   // move to Monday
  const out = new Date(d);
  out.setDate(d.getDate() + diff);
  return out;
}

export function formatScopeLabel(scope: BodyCompScope, date: string): string {
  const d = parseISO(date);
  if (scope === 'month') {
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  if (scope === 'week') {
    const start = startOfWeekMonday(d);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${DAYS_SHORT[d.getDay()]} · ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function stepScopeDate(scope: BodyCompScope, date: string, delta: number): string {
  const d = parseISO(date);
  if (scope === 'month') {
    d.setMonth(d.getMonth() + delta);
  } else if (scope === 'week') {
    d.setDate(d.getDate() + delta * 7);
  } else {
    d.setDate(d.getDate() + delta);
  }
  return toISO(d);
}

function isAtOrAfterToday(scope: BodyCompScope, date: string, today: string): boolean {
  const d = parseISO(date);
  const t = parseISO(today);
  if (scope === 'month') {
    return d.getFullYear() > t.getFullYear()
      || (d.getFullYear() === t.getFullYear() && d.getMonth() >= t.getMonth());
  }
  if (scope === 'week') {
    return startOfWeekMonday(d).getTime() >= startOfWeekMonday(t).getTime();
  }
  return d.getTime() >= t.getTime();
}

export interface BodyCompDateNavProps {
  scope: BodyCompScope;
  date: string;
  today: string;
  onChange: (next: string) => void;
}

export function BodyCompDateNav({ scope, date, today, onChange }: BodyCompDateNavProps) {
  const nextDisabled = isAtOrAfterToday(scope, date, today);

  return (
    <View style={styles.row}>
      <Pressable testID="date-nav-prev" onPress={() => onChange(stepScopeDate(scope, date, -1))} hitSlop={8} style={styles.arrowBtn}>
        <Text style={styles.arrow}>‹</Text>
      </Pressable>
      <Text style={styles.label}>{formatScopeLabel(scope, date)}</Text>
      <Pressable
        testID="date-nav-next"
        onPress={() => !nextDisabled && onChange(stepScopeDate(scope, date, 1))}
        hitSlop={8}
        accessibilityState={{ disabled: nextDisabled }}
        style={[styles.arrowBtn, nextDisabled && styles.arrowDisabled]}
      >
        <Text style={styles.arrow}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  label: { color: colors.primary, fontSize: fontSize.base, fontWeight: weightSemiBold },
  arrowBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  arrowDisabled: { opacity: 0.3 },
  arrow: { color: colors.accent, fontSize: fontSize.xl, fontWeight: weightBold },
});
```

- [ ] **Step 4: Run tests**

Run: `npx jest src/components/__tests__/BodyCompDateNav.test.tsx`
Expected: PASS (10/10).

- [ ] **Step 5: Commit**

```bash
git add src/components/BodyCompDateNav.tsx src/components/__tests__/BodyCompDateNav.test.tsx
git commit -m "feat(body-comp): BodyCompDateNav with scope-aware label and stepping"
```

---

## Task 13: Scale icon + BodyCompView empty state

**Files:**
- Create: `src/components/icons/Scale.tsx`
- Modify: `src/screens/BodyCompView.tsx`

- [ ] **Step 1: Create the Scale icon**

Create `src/components/icons/Scale.tsx`:

```tsx
import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import type { IconProps } from './types';

export function Scale({ size = 64, color = '#8DC28A' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Rect x="6" y="10" width="36" height="30" rx="4" stroke={color} strokeWidth="2" />
      <Rect x="14" y="14" width="20" height="4" rx="1" fill={color} opacity="0.5" />
      <Circle cx="24" cy="28" r="6" stroke={color} strokeWidth="2" />
      <Path d="M24 23 L24 28" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}
```

- [ ] **Step 2: Update BodyCompView to show empty state when no weights logged**

Replace the contents of `src/screens/BodyCompView.tsx`:

```tsx
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { Scale } from '../components/icons/Scale';
import { BodyCompScopeBar } from '../components/BodyCompScopeBar';
import { BodyCompDateNav } from '../components/BodyCompDateNav';
import { LogBodyMetricModal, LogBodyMetricPayload } from '../components/LogBodyMetricModal';
import {
  getBodyMetricsInRange,
  upsertBodyMetric,
} from '../db/bodyMetrics';
import type { BodyCompScope } from '../types';

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function BodyCompView() {
  const today = useMemo(isoToday, []);
  const [scope, setScope] = useState<BodyCompScope>('month');
  const [date, setDate] = useState(today);
  const [hasAny, setHasAny] = useState<boolean | null>(null);
  const [logVisible, setLogVisible] = useState(false);

  const refresh = useCallback(async () => {
    // Check ANY weight has been logged in the entire history.
    const rows = await getBodyMetricsInRange('weight', '0000-01-01', '9999-12-31');
    setHasAny(rows.length > 0);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleSave = async (payload: LogBodyMetricPayload) => {
    await upsertBodyMetric({
      metricType: payload.metricType,
      value: payload.value,
      unit: payload.unit,
      recordedDate: payload.recordedDate,
      note: payload.note,
    });
    await refresh();
  };

  // Empty state
  if (hasAny === false) {
    return (
      <View style={styles.emptyContainer}>
        <Scale size={72} color={colors.accent} />
        <Text style={styles.emptyTitle}>Log your first weight</Text>
        <Text style={styles.emptySubtitle}>
          Track daily weigh-ins and see how your calorie intake moves the needle.
        </Text>
        <Pressable onPress={() => setLogVisible(true)} style={styles.emptyBtn}>
          <Text style={styles.emptyBtnText}>+ Log today's weight</Text>
        </Pressable>
        <LogBodyMetricModal
          visible={logVisible}
          mode="weight"
          initialDate={today}
          onClose={() => setLogVisible(false)}
          onSave={handleSave}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <BodyCompScopeBar scope={scope} onChange={setScope} />
      <BodyCompDateNav scope={scope} date={date} today={today} onChange={setDate} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        {/* Per-scope views will be inserted in Tasks 19–21 */}
        <View style={{ padding: spacing.lg }}>
          <Text style={{ color: colors.secondary }}>
            Scope: {scope} — Date: {date} (chart coming in Task 14–18)
          </Text>
        </View>
      </ScrollView>
      <LogBodyMetricModal
        visible={logVisible}
        mode="weight"
        initialDate={today}
        onClose={() => setLogVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { color: colors.primary, fontSize: fontSize.lg, fontWeight: weightBold, marginTop: spacing.base },
  emptySubtitle: { color: colors.secondary, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.sm, maxWidth: 280 },
  emptyBtn: { backgroundColor: colors.accent, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 10, marginTop: spacing.xl },
  emptyBtnText: { color: colors.background, fontSize: fontSize.base, fontWeight: weightBold },
});
```

- [ ] **Step 3: Typecheck + smoke test**

Run: `npx tsc --noEmit`
Expected: No errors.

Launch app, go to Nutrition → BODY COMP. If no weights have ever been logged, empty state appears with Scale icon. Tap the CTA, log a weight, card updates on Dashboard, BODY COMP tab now shows scope bar + date nav.

- [ ] **Step 4: Commit**

```bash
git add src/components/icons/Scale.tsx src/screens/BodyCompView.tsx
git commit -m "feat(body-comp): Scale icon + BodyCompView empty state + scope/date scaffolding"
```

---

## Task 14: Install victory-native + verify setup

**Files:**
- Modify: `package.json`, `package-lock.json` (or `yarn.lock`)

- [ ] **Step 1: Verify react-native-svg is already installed**

Run: `grep react-native-svg package.json`
Expected: The package is listed (it's used by existing icons).

If NOT present, stop and install it first with `npm install react-native-svg` (or the project's package manager).

- [ ] **Step 2: Install victory-native**

Run: `npm install victory-native`

Expected output ends with success (new entry added to `package.json` dependencies).

- [ ] **Step 3: Verify installation**

Run: `grep victory-native package.json`
Expected: `"victory-native":` entry present.

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Smoke-test on device**

Rebuild the app (required for native deps on iOS/Android) and launch. Verify the app still loads and no crash from missing native modules.

On iOS: `cd ios && pod install && cd ..` then rebuild.
On Android: clean build (`cd android && ./gradlew clean && cd ..`) then rebuild.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add victory-native for dual-axis overlay chart"
```

---

## Task 15: OverlayChart — weight line + axes skeleton

**Files:**
- Create: `src/components/OverlayChart.tsx`
- Create: `src/components/__tests__/OverlayChart.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/__tests__/OverlayChart.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { OverlayChart } from '../OverlayChart';

describe('OverlayChart', () => {
  it('renders without crashing with empty data', () => {
    const { toJSON } = render(
      <OverlayChart
        scope="month"
        startDate="2026-04-01"
        endDate="2026-04-30"
        weights={[]}
        calories={[]}
        bodyFat={[]}
        programs={[]}
        calorieGoal={2200}
      />,
    );
    expect(toJSON()).not.toBeNull();
  });

  it('renders with a single weight reading', () => {
    const { toJSON } = render(
      <OverlayChart
        scope="month"
        startDate="2026-04-01"
        endDate="2026-04-30"
        weights={[{ recordedDate: '2026-04-17', value: 177.4 }]}
        calories={[]}
        bodyFat={[]}
        programs={[]}
        calorieGoal={2200}
      />,
    );
    expect(toJSON()).not.toBeNull();
  });

  it('renders a month of data without crashing', () => {
    const weights = Array.from({ length: 30 }, (_, i) => ({
      recordedDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
      value: 180 - i * 0.15,
    }));
    const calories = Array.from({ length: 30 }, (_, i) => ({
      recordedDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
      total: 2000 + (i % 7) * 50,
    }));
    const { toJSON } = render(
      <OverlayChart
        scope="month"
        startDate="2026-04-01"
        endDate="2026-04-30"
        weights={weights}
        calories={calories}
        bodyFat={[]}
        programs={[]}
        calorieGoal={2200}
      />,
    );
    expect(toJSON()).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/components/__tests__/OverlayChart.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement OverlayChart with weight line + dual axes**

Create `src/components/OverlayChart.tsx`:

```tsx
import React from 'react';
import { Dimensions, View } from 'react-native';
import {
  VictoryAxis,
  VictoryChart,
  VictoryLine,
  VictoryGroup,
} from 'victory-native';
import { colors } from '../theme/colors';
import type { BodyCompScope } from '../types';

export interface WeightPoint { recordedDate: string; value: number }
export interface CaloriePoint { recordedDate: string; total: number }
export interface BodyFatPoint { recordedDate: string; value: number }
export interface ProgramBound { id: number; name: string; startDate: string; weeks: number }

export interface OverlayChartProps {
  scope: BodyCompScope;
  startDate: string;
  endDate: string;
  weights: WeightPoint[];
  calories: CaloriePoint[];
  bodyFat: BodyFatPoint[];
  programs: ProgramBound[];
  calorieGoal: number;
}

function toTime(date: string): number {
  return new Date(date + 'T12:00:00Z').getTime();
}

export function OverlayChart({
  scope,
  startDate,
  endDate,
  weights,
  calories,
  bodyFat,
  programs,
  calorieGoal,
}: OverlayChartProps) {
  const chartWidth = Dimensions.get('window').width - 48;
  const chartHeight = scope === 'week' ? 200 : 170;

  const weightData = weights.map(w => ({ x: toTime(w.recordedDate), y: w.value }));

  // Weight axis domain: snap to data with small padding
  const minWeight = weights.length > 0 ? Math.min(...weights.map(w => w.value)) - 1 : 175;
  const maxWeight = weights.length > 0 ? Math.max(...weights.map(w => w.value)) + 1 : 180;

  return (
    <View>
      <VictoryChart
        width={chartWidth}
        height={chartHeight}
        padding={{ top: 12, bottom: 30, left: 40, right: 40 }}
        scale={{ x: 'time' }}
        domain={{
          x: [toTime(startDate), toTime(endDate)],
          y: [minWeight, maxWeight],
        }}
      >
        {/* Left axis: weight */}
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: 'transparent' },
            tickLabels: { fill: colors.secondary, fontSize: 9 },
            grid: { stroke: colors.surfaceElevated, strokeDasharray: '2,2' },
          }}
        />
        {/* Bottom axis: time */}
        <VictoryAxis
          style={{
            axis: { stroke: colors.surfaceElevated },
            tickLabels: { fill: colors.secondary, fontSize: 9 },
          }}
          tickCount={scope === 'week' ? 7 : 4}
        />
        <VictoryGroup>
          <VictoryLine
            data={weightData}
            style={{ data: { stroke: colors.accent, strokeWidth: 2.5 } }}
            interpolation="monotoneX"
          />
        </VictoryGroup>
      </VictoryChart>
    </View>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx jest src/components/__tests__/OverlayChart.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add src/components/OverlayChart.tsx src/components/__tests__/OverlayChart.test.tsx
git commit -m "feat(body-comp): OverlayChart weight line + axes"
```

---

## Task 16: OverlayChart — add calorie bars (right axis)

**Files:**
- Modify: `src/components/OverlayChart.tsx`

- [ ] **Step 1: Add calorie bars using a second VictoryBar with independent scale**

Since `victory-native` renders a single chart with one y-axis domain per chart, we achieve dual-axis by rendering TWO overlapping `VictoryChart` components — one for weight (front), one for calories (behind) — both sharing the same x-domain.

Replace the contents of `src/components/OverlayChart.tsx`:

```tsx
import React from 'react';
import { Dimensions, View, StyleSheet } from 'react-native';
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryLine,
  VictoryGroup,
} from 'victory-native';
import { colors } from '../theme/colors';
import type { BodyCompScope } from '../types';

export interface WeightPoint { recordedDate: string; value: number }
export interface CaloriePoint { recordedDate: string; total: number }
export interface BodyFatPoint { recordedDate: string; value: number }
export interface ProgramBound { id: number; name: string; startDate: string; weeks: number }

export interface OverlayChartProps {
  scope: BodyCompScope;
  startDate: string;
  endDate: string;
  weights: WeightPoint[];
  calories: CaloriePoint[];
  bodyFat: BodyFatPoint[];
  programs: ProgramBound[];
  calorieGoal: number;
}

function toTime(date: string): number {
  return new Date(date + 'T12:00:00Z').getTime();
}

export function OverlayChart({
  scope,
  startDate,
  endDate,
  weights,
  calories,
  bodyFat,
  programs,
  calorieGoal,
}: OverlayChartProps) {
  const chartWidth = Dimensions.get('window').width - 48;
  const chartHeight = scope === 'week' ? 200 : 170;

  const xDomain: [number, number] = [toTime(startDate), toTime(endDate)];

  const weightData = weights.map(w => ({ x: toTime(w.recordedDate), y: w.value }));
  const calorieData = calories.map(c => ({ x: toTime(c.recordedDate), y: c.total }));

  const minWeight = weights.length > 0 ? Math.min(...weights.map(w => w.value)) - 1 : 175;
  const maxWeight = weights.length > 0 ? Math.max(...weights.map(w => w.value)) + 1 : 180;

  const maxCal = calories.length > 0 ? Math.max(...calories.map(c => c.total), calorieGoal) * 1.1 : calorieGoal * 1.2;

  const padding = { top: 12, bottom: 30, left: 40, right: 40 };

  return (
    <View style={styles.wrap}>
      {/* Layer 1: calorie bars (behind) */}
      <View style={StyleSheet.absoluteFill}>
        <VictoryChart
          width={chartWidth}
          height={chartHeight}
          padding={padding}
          scale={{ x: 'time' }}
          domain={{ x: xDomain, y: [0, maxCal] }}
        >
          <VictoryAxis style={{ axis: { stroke: 'transparent' }, tickLabels: { fill: 'transparent' } }} />
          <VictoryAxis dependentAxis style={{ axis: { stroke: 'transparent' }, tickLabels: { fill: 'transparent' }, grid: { stroke: 'transparent' } }} />
          <VictoryBar
            data={calorieData.map(d => ({
              x: d.x,
              y: d.y,
              fill: d.y > calorieGoal ? 'rgba(244,167,107,0.7)' : 'rgba(141,194,138,0.6)',
            }))}
            style={{ data: { fill: ({ datum }: any) => datum.fill } }}
            barWidth={scope === 'week' ? 22 : 6}
            alignment="middle"
          />
        </VictoryChart>
      </View>

      {/* Layer 2: weight line (front) */}
      <VictoryChart
        width={chartWidth}
        height={chartHeight}
        padding={padding}
        scale={{ x: 'time' }}
        domain={{ x: xDomain, y: [minWeight, maxWeight] }}
      >
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: 'transparent' },
            tickLabels: { fill: colors.secondary, fontSize: 9 },
            grid: { stroke: colors.surfaceElevated, strokeDasharray: '2,2' },
          }}
        />
        <VictoryAxis
          style={{
            axis: { stroke: colors.surfaceElevated },
            tickLabels: { fill: colors.secondary, fontSize: 9 },
          }}
          tickCount={scope === 'week' ? 7 : 4}
        />
        <VictoryGroup>
          <VictoryLine
            data={weightData}
            style={{ data: { stroke: colors.accent, strokeWidth: 2.5 } }}
            interpolation="monotoneX"
          />
        </VictoryGroup>
      </VictoryChart>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
});
```

- [ ] **Step 2: Run tests**

Run: `npx jest src/components/__tests__/OverlayChart.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 3: Commit**

```bash
git add src/components/OverlayChart.tsx
git commit -m "feat(body-comp): OverlayChart calorie bars with over-goal coloring"
```

---

## Task 17: OverlayChart — 7-day MA overlay + BF% gold dots

**Files:**
- Modify: `src/components/OverlayChart.tsx`

- [ ] **Step 1: Add moving-average line + body-fat scatter points**

In `src/components/OverlayChart.tsx`, add an import for the MA helper and a scatter import:

```tsx
import { VictoryScatter } from 'victory-native';
import { computeMovingAverage } from '../db/bodyMetrics';
```

Inside the component, after computing `weightData`, compute the MA series:

```tsx
  const maData = weightData.length >= 3
    ? weightData.map(p => ({
        x: p.x,
        y: computeMovingAverage(
          weights.map(w => ({ recordedDate: w.recordedDate, value: w.value })),
          new Date(p.x).toISOString().slice(0, 10),
          7,
        ),
      })).filter(p => p.y != null)
    : [];

  const bfData = bodyFat
    .filter(b => {
      const t = toTime(b.recordedDate);
      return t >= xDomain[0] && t <= xDomain[1];
    })
    .map(b => {
      // Match BF% dots to the weight-line y-position so they align on the chart.
      const wOnDate = weights.find(w => w.recordedDate === b.recordedDate);
      const y = wOnDate ? wOnDate.value : (minWeight + maxWeight) / 2;
      return { x: toTime(b.recordedDate), y, label: `${b.value.toFixed(1)}%` };
    });
```

Inside the front-layer VictoryChart's `<VictoryGroup>`, add (in order, so MA renders on top of raw line and dots on top of MA):

```tsx
          {/* Raw daily line (light) */}
          <VictoryLine
            data={weightData}
            style={{ data: { stroke: 'rgba(141,194,138,0.35)', strokeWidth: 1.2 } }}
            interpolation="monotoneX"
          />
          {/* 7-day MA line (bold) */}
          <VictoryLine
            data={maData as { x: number; y: number }[]}
            style={{ data: { stroke: colors.accent, strokeWidth: 2.5 } }}
            interpolation="monotoneX"
          />
          {/* Body-fat gold dots */}
          <VictoryScatter
            data={bfData}
            size={5}
            style={{ data: { fill: '#F4C77B', stroke: colors.background, strokeWidth: 1.5 } }}
            labels={({ datum }: any) => datum.label}
            labelComponent={undefined}
          />
```

Remove the previous single `VictoryLine` (which was the bold line before — now there's a light line + bold MA).

- [ ] **Step 2: Run tests**

Run: `npx jest src/components/__tests__/OverlayChart.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 3: Commit**

```bash
git add src/components/OverlayChart.tsx
git commit -m "feat(body-comp): OverlayChart 7-day MA overlay + BF% gold dots"
```

---

## Task 18: OverlayChart — program-boundary overlays (MONTH scope)

**Files:**
- Modify: `src/components/OverlayChart.tsx`

- [ ] **Step 1: Add program start/end vertical lines to the front layer**

In `src/components/OverlayChart.tsx`, compute program lines inside the component:

```tsx
  const programLines = scope === 'month'
    ? programs.flatMap((p, i) => {
        const startMs = toTime(p.startDate);
        const endMs = toTime(p.startDate) + p.weeks * 7 * 86400000;
        const inView = (ms: number) => ms >= xDomain[0] && ms <= xDomain[1];
        const out: { x: number; label: string }[] = [];
        if (inView(startMs)) out.push({ x: startMs, label: `P${i + 1} start` });
        if (inView(endMs)) out.push({ x: endMs, label: `P${i + 1} end` });
        return out;
      })
    : [];
```

Import `VictoryLabel`:

```tsx
import { VictoryLabel } from 'victory-native';
```

After the `<VictoryScatter>` element in the front layer, insert a rendered line + label per boundary by mapping over `programLines`:

```tsx
          {programLines.map(line => (
            <VictoryLine
              key={`pl-${line.x}`}
              data={[{ x: line.x, y: minWeight }, { x: line.x, y: maxWeight }]}
              style={{ data: { stroke: colors.secondary, strokeWidth: 1, strokeDasharray: '3,3', opacity: 0.6 } }}
              labels={[line.label]}
              labelComponent={<VictoryLabel dy={-4} style={{ fill: colors.secondary, fontSize: 8 } as any} />}
            />
          ))}
```

- [ ] **Step 2: Run tests**

Run: `npx jest src/components/__tests__/OverlayChart.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 3: Smoke test on device**

Launch app. Log at least one weight. Open BODY COMP. You won't see the chart yet (wired in Task 19), but the component is complete.

- [ ] **Step 4: Commit**

```bash
git add src/components/OverlayChart.tsx
git commit -m "feat(body-comp): OverlayChart program start/end overlays (MONTH only)"
```

---

## Task 19: MONTH view — KPIs + chart + month summary

**Files:**
- Create: `src/components/BodyCompMonthView.tsx`
- Modify: `src/db/bodyMetrics.ts` (add `getDailyCalorieTotals`, `getProgramsInRange`)
- Modify: `src/screens/BodyCompView.tsx` (wire MONTH view)

- [ ] **Step 1: Add the calorie + program queries to bodyMetrics.ts**

Append to `src/db/bodyMetrics.ts`:

```ts
export interface DailyCalorieTotal {
  recordedDate: string;
  total: number;
}

/**
 * NOTE on the meals table schema (discovered during planning):
 * - `meals.local_date` (TEXT) is the canonical day-bucket for grouping.
 * - There is NO `calories` column. Calories are derived from macros:
 *   `protein_grams * 4 + carb_grams * 4 + fat_grams * 9`
 * - See `src/utils/macros.ts` `computeCalories(p, c, f)` for the canonical formula.
 */
export async function getDailyCalorieTotals(
  startDate: string,
  endDate: string,
): Promise<DailyCalorieTotal[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT local_date as d,
            COALESCE(SUM(protein_grams), 0) as p,
            COALESCE(SUM(carb_grams), 0)    as c,
            COALESCE(SUM(fat_grams), 0)     as f
       FROM meals
      WHERE local_date BETWEEN ? AND ?
      GROUP BY local_date
      ORDER BY local_date ASC`,
    [startDate, endDate],
  );
  const out: DailyCalorieTotal[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const total = (row.p as number) * 4 + (row.c as number) * 4 + (row.f as number) * 9;
    out.push({ recordedDate: row.d, total });
  }
  return out;
}

export interface ProgramBound {
  id: number;
  name: string;
  startDate: string;
  weeks: number;
}

export async function getProgramsInRange(
  startDate: string,
  endDate: string,
): Promise<ProgramBound[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT id, name, start_date, weeks FROM programs
      WHERE start_date IS NOT NULL
        AND DATE(start_date, '+' || (weeks * 7) || ' days') >= DATE(?)
        AND DATE(start_date) <= DATE(?)`,
    [startDate, endDate],
  );
  const out: ProgramBound[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    out.push({ id: row.id, name: row.name, startDate: row.start_date, weeks: row.weeks });
  }
  return out;
}
```

The query groups by `meals.local_date` (the already-computed TEXT date column, see `src/db/migrations.ts` around lines 141–150 for the schema). Calories are derived from macro grams because the table has no `calories` column — `src/utils/macros.ts::computeCalories` is the canonical JS formula.

- [ ] **Step 2: Create BodyCompMonthView**

Create `src/components/BodyCompMonthView.tsx`:

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OverlayChart } from './OverlayChart';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import type { BodyMetric } from '../types';
import type { DailyCalorieTotal, ProgramBound } from '../db/bodyMetrics';

export interface BodyCompMonthViewProps {
  startDate: string;
  endDate: string;
  weights: BodyMetric[];
  bodyFat: BodyMetric[];
  calories: DailyCalorieTotal[];
  programs: ProgramBound[];
  calorieGoal: number;
}

function avg(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function Kpi({ label, value, delta, deltaColor }: { label: string; value: string; delta?: string; deltaColor?: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {delta ? <Text style={[styles.kpiDelta, { color: deltaColor ?? colors.secondary }]}>{delta}</Text> : null}
    </View>
  );
}

export function BodyCompMonthView({
  startDate,
  endDate,
  weights,
  bodyFat,
  calories,
  programs,
  calorieGoal,
}: BodyCompMonthViewProps) {
  const avgWeight = avg(weights.map(w => w.value));
  const avgCals = avg(calories.map(c => c.total));
  const latestBf = bodyFat.length > 0 ? bodyFat[bodyFat.length - 1].value : null;

  const monthDelta = weights.length >= 2
    ? weights[weights.length - 1].value - weights[0].value
    : null;

  const daysLogged = weights.length;
  const daysOverGoal = calories.filter(c => c.total > calorieGoal).length;
  const weeks = Math.max(1, (new Date(endDate).getTime() - new Date(startDate).getTime()) / (86400000 * 7));
  const ratePerWeek = monthDelta != null ? monthDelta / weeks : null;

  return (
    <View>
      <View style={styles.kpiRow}>
        <Kpi
          label="AVG WEIGHT"
          value={avgWeight != null ? `${avgWeight.toFixed(1)} lb` : '—'}
        />
        <Kpi
          label="AVG CALS"
          value={avgCals != null ? `${Math.round(avgCals).toLocaleString()}` : '—'}
          delta={`goal ${calorieGoal}`}
        />
        <Kpi
          label="BODY FAT"
          value={latestBf != null ? `${latestBf.toFixed(1)}%` : '—'}
          delta={latestBf == null ? 'not logged' : ''}
        />
      </View>

      <View style={styles.chartCard}>
        <OverlayChart
          scope="month"
          startDate={startDate}
          endDate={endDate}
          weights={weights.map(w => ({ recordedDate: w.recordedDate, value: w.value }))}
          calories={calories}
          bodyFat={bodyFat.map(b => ({ recordedDate: b.recordedDate, value: b.value }))}
          programs={programs}
          calorieGoal={calorieGoal}
        />
      </View>

      <Text style={styles.sectionLabel}>MONTH SUMMARY</Text>
      <View style={styles.list}>
        <SummaryRow label="Monthly weight change" value={monthDelta != null ? `${monthDelta > 0 ? '↑' : '↓'} ${Math.abs(monthDelta).toFixed(1)} lb` : '—'} valueColor={monthDelta != null && monthDelta < 0 ? colors.accent : monthDelta != null && monthDelta > 0 ? colors.danger : undefined} />
        <SummaryRow label="Days logged" value={`${daysLogged}`} />
        <SummaryRow label="Days over calorie goal" value={`${daysOverGoal}`} />
        <SummaryRow label="Rate" value={ratePerWeek != null ? `${ratePerWeek > 0 ? '↑' : '↓'} ${Math.abs(ratePerWeek).toFixed(1)} lb/wk` : '—'} valueColor={ratePerWeek != null && ratePerWeek < 0 ? colors.accent : undefined} />
      </View>
    </View>
  );
}

function SummaryRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  kpi: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md },
  kpiLabel: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: weightBold, letterSpacing: 0.6 },
  kpiValue: { color: colors.primary, fontSize: fontSize.md, fontWeight: weightBold, marginTop: 2 },
  kpiDelta: { fontSize: fontSize.xs, marginTop: 2, fontWeight: weightSemiBold },
  chartCard: { backgroundColor: colors.surface, borderRadius: 12, margin: spacing.base, padding: spacing.md },
  sectionLabel: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: weightBold, letterSpacing: 0.8, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  list: { backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: spacing.base },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceElevated },
  rowLabel: { color: colors.primary, fontSize: fontSize.sm },
  rowValue: { color: colors.primary, fontSize: fontSize.sm, fontWeight: weightSemiBold },
});
```

- [ ] **Step 3: Wire MONTH view into BodyCompView**

In `src/screens/BodyCompView.tsx`:

1. Import the new pieces:
   ```tsx
   import { BodyCompMonthView } from '../components/BodyCompMonthView';
   import {
     getBodyMetricsInRange,
     getDailyCalorieTotals,
     getProgramsInRange,
     upsertBodyMetric,
     ProgramBound,
     DailyCalorieTotal,
   } from '../db/bodyMetrics';
   import { getMacroGoals } from '../db/macros';  // or wherever the calorie goal lives
   import type { BodyMetric } from '../types';
   ```
   (If the calorie goal lives elsewhere, adjust the import. If it's not stored, default to 2200.)

2. Add new state:
   ```tsx
   const [weights, setWeights] = useState<BodyMetric[]>([]);
   const [bodyFat, setBodyFat] = useState<BodyMetric[]>([]);
   const [calories, setCalories] = useState<DailyCalorieTotal[]>([]);
   const [programs, setPrograms] = useState<ProgramBound[]>([]);
   const [calorieGoal, setCalorieGoal] = useState<number>(2200);
   ```

3. Compute the scope's start/end dates:
   ```tsx
   const { startDate, endDate } = useMemo(() => {
     const d = new Date(date + 'T00:00:00');
     if (scope === 'month') {
       const start = new Date(d.getFullYear(), d.getMonth(), 1);
       const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
       return { startDate: toISO(start), endDate: toISO(end) };
     }
     if (scope === 'week') {
       const start = startOfWeekMonday(d);
       const end = new Date(start);
       end.setDate(start.getDate() + 6);
       return { startDate: toISO(start), endDate: toISO(end) };
     }
     return { startDate: date, endDate: date };
   }, [scope, date]);
   ```
   Add `toISO` and `startOfWeekMonday` helpers to this file (copied from BodyCompDateNav).

4. Import helpers and the macro-goals query:
   ```tsx
   import { getMacroGoals } from '../db/macros';
   import { computeCalories } from '../utils/macros';
   ```

   Replace the placeholder scope refresh with:
   ```tsx
   const refresh = useCallback(async () => {
     const [w, bf, cal, progs, macroGoals, allWeights] = await Promise.all([
       getBodyMetricsInRange('weight', startDate, endDate),
       getBodyMetricsInRange('body_fat', startDate, endDate),
       getDailyCalorieTotals(startDate, endDate),
       getProgramsInRange(startDate, endDate),
       getMacroGoals().catch(() => null),
       getBodyMetricsInRange('weight', '0000-01-01', '9999-12-31'),
     ]);
     setWeights(w);
     setBodyFat(bf);
     setCalories(cal);
     setPrograms(progs);
     // Calorie goal is derived from the macro goals row (meals table has no calorie column).
     const cg = macroGoals
       ? computeCalories(macroGoals.proteinGoal, macroGoals.carbGoal, macroGoals.fatGoal)
       : 2200;
     setCalorieGoal(cg);
     setHasAny(allWeights.length > 0);
   }, [startDate, endDate]);
   ```
   `getMacroGoals()` is already exported from `src/db/macros.ts` and returns `MacroSettings | null` with `proteinGoal`, `carbGoal`, `fatGoal`. `computeCalories` at `src/utils/macros.ts` is the canonical 4/4/9 formula. (Task 21 adds the `macroGoalsState` needed for the DAY view — don't add it yet.)

5. Replace the placeholder view in the main return with a scope switch:
   ```tsx
   <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
     {scope === 'month' ? (
       <BodyCompMonthView
         startDate={startDate}
         endDate={endDate}
         weights={weights}
         bodyFat={bodyFat}
         calories={calories}
         programs={programs}
         calorieGoal={calorieGoal}
       />
     ) : scope === 'week' ? (
       <Text style={{ color: colors.secondary, padding: spacing.lg }}>Week view — Task 20</Text>
     ) : (
       <Text style={{ color: colors.secondary, padding: spacing.lg }}>Day view — Task 21</Text>
     )}
   </ScrollView>
   ```

- [ ] **Step 4: Typecheck + smoke test**

Run: `npx tsc --noEmit`
Expected: No errors.

Launch app, log a few weights across different days, open BODY COMP MONTH. Expected: KPIs populated, chart renders with the weight line + calorie bars, summary list shows month aggregates.

- [ ] **Step 5: Commit**

```bash
git add src/components/BodyCompMonthView.tsx src/db/bodyMetrics.ts src/screens/BodyCompView.tsx
git commit -m "feat(body-comp): MONTH view with KPIs, overlay chart, summary"
```

---

## Task 20: WEEK view — KPIs + weekly chart + daily breakdown

**Files:**
- Create: `src/components/BodyCompWeekView.tsx`
- Modify: `src/screens/BodyCompView.tsx`

- [ ] **Step 1: Create BodyCompWeekView**

Create `src/components/BodyCompWeekView.tsx`:

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OverlayChart } from './OverlayChart';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import type { BodyMetric } from '../types';
import type { DailyCalorieTotal, ProgramBound } from '../db/bodyMetrics';

export interface BodyCompWeekViewProps {
  startDate: string;
  endDate: string;
  weights: BodyMetric[];
  bodyFat: BodyMetric[];
  calories: DailyCalorieTotal[];
  programs: ProgramBound[];
  calorieGoal: number;
  onJumpToDay: (date: string) => void;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function formatDayRow(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${dayNames[d.getDay()]} ${monthNames[d.getMonth()]} ${d.getDate()}`;
}

export function BodyCompWeekView({
  startDate,
  endDate,
  weights,
  bodyFat,
  calories,
  programs,
  calorieGoal,
  onJumpToDay,
}: BodyCompWeekViewProps) {
  // Build the 7-day grid
  const start = new Date(startDate + 'T00:00:00');
  const days: string[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const weightByDate = new Map(weights.map(w => [w.recordedDate, w.value]));
  const calorieByDate = new Map(calories.map(c => [c.recordedDate, c.total]));

  const avgWeight = weights.length > 0 ? weights.reduce((a, w) => a + w.value, 0) / weights.length : null;
  const avgCals = calories.length > 0 ? calories.reduce((a, c) => a + c.total, 0) / calories.length : null;

  return (
    <View>
      <View style={styles.kpiRow}>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>WEEK AVG</Text>
          <Text style={styles.kpiValue}>{avgWeight != null ? `${avgWeight.toFixed(1)} lb` : '—'}</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>AVG CALS</Text>
          <Text style={styles.kpiValue}>{avgCals != null ? `${Math.round(avgCals).toLocaleString()}` : '—'}</Text>
          <Text style={styles.kpiDelta}>goal {calorieGoal}</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <OverlayChart
          scope="week"
          startDate={startDate}
          endDate={endDate}
          weights={weights.map(w => ({ recordedDate: w.recordedDate, value: w.value }))}
          calories={calories}
          bodyFat={bodyFat.map(b => ({ recordedDate: b.recordedDate, value: b.value }))}
          programs={programs}
          calorieGoal={calorieGoal}
        />
      </View>

      <Text style={styles.sectionLabel}>DAILY BREAKDOWN · Tap a day</Text>
      <View style={styles.list}>
        {days.map((date) => {
          const w = weightByDate.get(date);
          const c = calorieByDate.get(date);
          const isOver = c != null && c > calorieGoal;
          return (
            <Pressable key={date} testID={`week-row-${date}`} onPress={() => onJumpToDay(date)} style={styles.row}>
              <Text style={styles.rowLabel}>{formatDayRow(date)}</Text>
              <Text style={[styles.rowValue, isOver && { color: '#F4A76B' }]}>
                {w != null ? `${w.toFixed(1)}` : '—'} · {c != null ? `${c.toLocaleString()} kcal` : '—'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  kpi: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md },
  kpiLabel: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: weightBold, letterSpacing: 0.6 },
  kpiValue: { color: colors.primary, fontSize: fontSize.md, fontWeight: weightBold, marginTop: 2 },
  kpiDelta: { fontSize: fontSize.xs, marginTop: 2, color: colors.secondary },
  chartCard: { backgroundColor: colors.surface, borderRadius: 12, margin: spacing.base, padding: spacing.md },
  sectionLabel: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: weightBold, letterSpacing: 0.8, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  list: { backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: spacing.base },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceElevated },
  rowLabel: { color: colors.primary, fontSize: fontSize.sm },
  rowValue: { color: colors.primary, fontSize: fontSize.sm, fontWeight: weightSemiBold },
});
```

- [ ] **Step 2: Wire WEEK view into BodyCompView**

In `src/screens/BodyCompView.tsx`, replace the WEEK placeholder:

```tsx
     ) : scope === 'week' ? (
       <BodyCompWeekView
         startDate={startDate}
         endDate={endDate}
         weights={weights}
         bodyFat={bodyFat}
         calories={calories}
         programs={programs}
         calorieGoal={calorieGoal}
         onJumpToDay={(d) => { setScope('day'); setDate(d); }}
       />
     ) : (
```

Add the import at the top:

```tsx
import { BodyCompWeekView } from '../components/BodyCompWeekView';
```

- [ ] **Step 3: Typecheck + smoke test**

Run: `npx tsc --noEmit`
Expected: No errors.

Launch app → BODY COMP → switch to WEEK. Expected: chart with 7 calorie bars and a weight line, daily breakdown list. Tap a day row → scope switches to DAY with that date.

- [ ] **Step 4: Commit**

```bash
git add src/components/BodyCompWeekView.tsx src/screens/BodyCompView.tsx
git commit -m "feat(body-comp): WEEK view with weekly chart + daily breakdown"
```

---

## Task 21: DAY view — hero + macro rings + meals list

**Files:**
- Create: `src/components/BodyCompDayView.tsx`
- Modify: `src/db/bodyMetrics.ts` (or `src/db/macros.ts`) — add `getDayDetail`
- Modify: `src/screens/BodyCompView.tsx`

- [ ] **Step 1: Add getDayDetail query**

Append to `src/db/bodyMetrics.ts`:

```ts
export interface DayMealEntry {
  name: string;
  consumedAt: string;
  calories: number;
  items: string | null;
}

export interface DayDetail {
  weight: number | null;
  bodyFat: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: DayMealEntry[];
}

export async function getDayDetail(date: string): Promise<DayDetail> {
  const database = await db;

  const [weightRow, bfRow, mealsRes, totalsRes] = await Promise.all([
    executeSql(
      database,
      `SELECT value FROM body_metrics WHERE metric_type='weight' AND recorded_date=? LIMIT 1`,
      [date],
    ),
    executeSql(
      database,
      `SELECT value FROM body_metrics WHERE metric_type='body_fat' AND recorded_date=? LIMIT 1`,
      [date],
    ),
    executeSql(
      database,
      `SELECT description, meal_type, logged_at, protein_grams, carb_grams, fat_grams
         FROM meals
        WHERE local_date = ?
        ORDER BY logged_at ASC`,
      [date],
    ),
    executeSql(
      database,
      `SELECT COALESCE(SUM(protein_grams), 0) as p,
              COALESCE(SUM(carb_grams),    0) as c,
              COALESCE(SUM(fat_grams),     0) as f
         FROM meals
        WHERE local_date = ?`,
      [date],
    ),
  ]);

  const meals: DayMealEntry[] = [];
  for (let i = 0; i < mealsRes.rows.length; i++) {
    const m = mealsRes.rows.item(i);
    const p = m.protein_grams as number;
    const c = m.carb_grams as number;
    const f = m.fat_grams as number;
    meals.push({
      name: m.meal_type as string,        // e.g. "Breakfast"
      consumedAt: m.logged_at as string,
      calories: p * 4 + c * 4 + f * 9,
      items: (m.description as string) || null,
    });
  }

  const totals = totalsRes.rows.item(0);
  const p = (totals?.p ?? 0) as number;
  const c = (totals?.c ?? 0) as number;
  const f = (totals?.f ?? 0) as number;

  return {
    weight: weightRow.rows.length > 0 ? (weightRow.rows.item(0).value as number) : null,
    bodyFat: bfRow.rows.length > 0 ? (bfRow.rows.item(0).value as number) : null,
    calories: p * 4 + c * 4 + f * 9,
    protein: p,
    carbs: c,
    fat: f,
    meals,
  };
}
```

**Schema reference (from `src/db/migrations.ts` lines 141–150 + V10 macro additions):** `meals` has columns `id, protein_grams, description, meal_type, logged_at, local_date, created_at, carb_grams, fat_grams`. There is NO `calories` column — compute from grams. `local_date` is the TEXT day bucket used for grouping (already computed at insert time).

- [ ] **Step 2: Create BodyCompDayView**

Create `src/components/BodyCompDayView.tsx`:

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import type { DayDetail } from '../db/bodyMetrics';

export interface BodyCompDayViewProps {
  date: string;
  detail: DayDetail;
  yesterdayWeight: number | null;
  firstWeightOfMonth: number | null;
  calorieGoal: number;
  macroGoals: { protein: number; carbs: number; fat: number };
  sevenDayMa: number | null;
}

function MacroCard({ label, color, grams, goal }: { label: string; color: string; grams: number; goal: number }) {
  const pct = goal > 0 ? Math.min(1, grams / goal) : 0;
  return (
    <View style={styles.macroCard}>
      <View style={[styles.ring, { borderColor: color, borderRightColor: color + '33' }]}>
        <Text style={styles.ringVal}>{Math.round(grams)}</Text>
        <Text style={styles.ringGoal}>/{goal}g</Text>
      </View>
      <Text style={[styles.macroLabel, { color }]}>{label}</Text>
    </View>
  );
}

function formatTime(isoTs: string): string {
  const d = new Date(isoTs);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const am = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  return `${h}:${m} ${am}`;
}

export function BodyCompDayView({
  date,
  detail,
  yesterdayWeight,
  firstWeightOfMonth,
  calorieGoal,
  macroGoals,
  sevenDayMa,
}: BodyCompDayViewProps) {
  const deltaDay = detail.weight != null && yesterdayWeight != null ? detail.weight - yesterdayWeight : null;
  const deltaMonth = detail.weight != null && firstWeightOfMonth != null ? detail.weight - firstWeightOfMonth : null;
  const calDelta = detail.calories - calorieGoal;

  return (
    <View>
      <View style={styles.hero}>
        <Text style={styles.kpiLabel}>WEIGHT</Text>
        {detail.weight != null ? (
          <>
            <Text style={styles.heroVal}>{detail.weight.toFixed(1)}<Text style={styles.heroUnit}> lb</Text></Text>
            <Text style={styles.heroDelta}>
              {deltaDay != null ? `${deltaDay < 0 ? '↓' : '↑'} ${Math.abs(deltaDay).toFixed(1)} vs yesterday` : '—'}
              {deltaMonth != null ? ` · ${deltaMonth < 0 ? '↓' : '↑'} ${Math.abs(deltaMonth).toFixed(1)} this month` : ''}
            </Text>
          </>
        ) : (
          <Text style={styles.heroNo}>Not logged</Text>
        )}
      </View>

      <View style={styles.kpiRow}>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>CALORIES</Text>
          <Text style={styles.kpiValue}>{detail.calories.toLocaleString()} <Text style={styles.kpiUnit}>/ {calorieGoal.toLocaleString()}</Text></Text>
          <Text style={[styles.kpiDelta, calDelta > 0 ? { color: '#F4A76B' } : { color: colors.accent }]}>
            {Math.abs(calDelta)} {calDelta >= 0 ? 'over' : 'under'} goal
          </Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>7-DAY AVG</Text>
          <Text style={styles.kpiValue}>{sevenDayMa != null ? `${sevenDayMa.toFixed(1)} lb` : '—'}</Text>
          <Text style={styles.kpiDelta}>smoothed trend</Text>
        </View>
      </View>

      <View style={styles.macros}>
        <MacroCard label="PROTEIN" color="#8DC28A" grams={detail.protein} goal={macroGoals.protein} />
        <MacroCard label="CARBS"   color="#7EB2D9" grams={detail.carbs}   goal={macroGoals.carbs} />
        <MacroCard label="FAT"     color="#F4C77B" grams={detail.fat}     goal={macroGoals.fat} />
      </View>

      <Text style={styles.sectionLabel}>MEALS LOGGED</Text>
      <View style={styles.list}>
        {detail.meals.length === 0 ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>No meals logged on this day</Text>
          </View>
        ) : (
          detail.meals.map((m, i) => (
            <View key={`${m.consumedAt}-${i}`} style={styles.meal}>
              <View style={styles.mealHead}>
                <Text style={styles.mealName}>{m.name} · {formatTime(m.consumedAt)}</Text>
                <Text style={styles.mealCal}>{Math.round(m.calories)} kcal</Text>
              </View>
              {m.items ? <Text style={styles.mealItems}>{m.items}</Text> : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', padding: spacing.lg },
  kpiLabel: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: weightBold, letterSpacing: 0.6 },
  heroVal: { color: colors.primary, fontSize: 48, fontWeight: weightBold, marginTop: 4 },
  heroUnit: { color: colors.secondary, fontSize: fontSize.md, fontWeight: '400' },
  heroDelta: { color: colors.accent, fontSize: fontSize.sm, fontWeight: weightSemiBold, marginTop: 4, textAlign: 'center' },
  heroNo: { color: colors.secondary, fontSize: fontSize.lg, marginTop: 4 },
  kpiRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.base },
  kpi: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md },
  kpiValue: { color: colors.primary, fontSize: fontSize.md, fontWeight: weightBold, marginTop: 2 },
  kpiUnit: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: '400' },
  kpiDelta: { fontSize: fontSize.xs, marginTop: 2, color: colors.secondary, fontWeight: weightSemiBold },
  macros: { flexDirection: 'row', gap: spacing.sm, padding: spacing.base },
  macroCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, alignItems: 'center' },
  ring: { width: 54, height: 54, borderRadius: 27, borderWidth: 5, alignItems: 'center', justifyContent: 'center' },
  ringVal: { color: colors.primary, fontSize: fontSize.sm, fontWeight: weightBold },
  ringGoal: { color: colors.secondary, fontSize: 9 },
  macroLabel: { fontSize: fontSize.xs, fontWeight: weightBold, marginTop: 6, letterSpacing: 0.6 },
  sectionLabel: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: weightBold, letterSpacing: 0.8, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  list: { backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: spacing.base },
  row: { padding: spacing.md },
  rowLabel: { color: colors.secondary, fontSize: fontSize.sm, textAlign: 'center' },
  meal: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceElevated },
  mealHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  mealName: { color: colors.primary, fontSize: fontSize.sm, fontWeight: weightSemiBold },
  mealCal: { color: colors.secondary, fontSize: fontSize.xs },
  mealItems: { color: colors.secondary, fontSize: fontSize.xs, marginTop: 2 },
});
```

- [ ] **Step 3: Wire DAY view into BodyCompView**

In `src/screens/BodyCompView.tsx`:

1. Add imports:
   ```tsx
   import { BodyCompDayView } from '../components/BodyCompDayView';
   import { getDayDetail, DayDetail, computeMovingAverage } from '../db/bodyMetrics';
   ```

2. Add state for day detail:
   ```tsx
   const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
   const [yesterdayWeightInDay, setYesterdayWeightInDay] = useState<number | null>(null);
   const [firstOfMonthWeight, setFirstOfMonthWeight] = useState<number | null>(null);
   const [sevenDayMaVal, setSevenDayMaVal] = useState<number | null>(null);
   const [macroGoalsState, setMacroGoalsState] = useState<{ protein: number; carbs: number; fat: number }>({ protein: 180, carbs: 220, fat: 73 });
   ```

3. Extend `refresh` to fetch day-specific data when scope === 'day':
   ```tsx
   if (scope === 'day') {
     const detail = await getDayDetail(date);
     setDayDetail(detail);
     // yesterday
     const y = new Date(date + 'T00:00:00');
     y.setDate(y.getDate() - 1);
     const yIso = toISO(y);
     const yRow = await getBodyMetricByDate('weight', yIso);
     setYesterdayWeightInDay(yRow?.value ?? null);
     // first of month
     const firstIso = date.slice(0, 8) + '01';
     const fomList = await getBodyMetricsInRange('weight', firstIso, date);
     setFirstOfMonthWeight(fomList[0]?.value ?? null);
     // 7-day MA ending at this date
     const maPoints = await getBodyMetricsInRange(
       'weight',
       toISO(new Date(new Date(date).getTime() - 6 * 86400000)),
       date,
     );
     setSevenDayMaVal(computeMovingAverage(maPoints.map(p => ({ recordedDate: p.recordedDate, value: p.value })), date, 7));
     // Real macro goals from the macro_settings row (src/db/macros.ts)
     const mg = await getMacroGoals().catch(() => null);
     setMacroGoalsState(mg
       ? { protein: mg.proteinGoal, carbs: mg.carbGoal, fat: mg.fatGoal }
       : { protein: 180, carbs: 220, fat: 73 });
   }
   ```

4. Replace the DAY placeholder render:
   ```tsx
     ) : dayDetail ? (
       <BodyCompDayView
         date={date}
         detail={dayDetail}
         yesterdayWeight={yesterdayWeightInDay}
         firstWeightOfMonth={firstOfMonthWeight}
         calorieGoal={calorieGoal}
         macroGoals={macroGoalsState}
         sevenDayMa={sevenDayMaVal}
       />
     ) : (
       <Text style={{ color: colors.secondary, padding: spacing.lg }}>Loading…</Text>
     )
   ```

- [ ] **Step 4: Typecheck + smoke test**

Run: `npx tsc --noEmit`
Expected: No errors.

Launch app → log weight → BODY COMP → WEEK → tap a day row → DAY view appears with hero weight, macros, and any meals logged on that date.

- [ ] **Step 5: Commit**

```bash
git add src/components/BodyCompDayView.tsx src/db/bodyMetrics.ts src/screens/BodyCompView.tsx
git commit -m "feat(body-comp): DAY view with hero weight, macro rings, meals list"
```

---

## Task 22: Nutrition screen header "+" button wired to log modal

**Files:**
- Modify: `src/screens/ProteinScreen.tsx`
- Modify: `src/screens/BodyCompView.tsx`

- [ ] **Step 1: Lift log-modal state into a top-level position accessible from the header**

The cleanest approach: keep the modal inside `BodyCompView` but expose a callback via a small `ref` or shared context. The simplest pattern here is to put the `+` button INSIDE the `BodyCompView` (at the top of its content) since BodyCompView is only mounted when the BODY COMP tab is active.

In `src/screens/BodyCompView.tsx`, add a header row rendered at the top of the non-empty-state return:

```tsx
<View style={styles.header}>
  <Text style={styles.headerTitle}>Body Composition</Text>
  <Pressable testID="body-comp-log-btn" onPress={() => setLogVisible(true)} style={styles.logBtn} hitSlop={8}>
    <Text style={styles.logBtnText}>+</Text>
  </Pressable>
</View>
```

Add styles:

```tsx
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingTop: spacing.base },
  headerTitle: { color: colors.primary, fontSize: fontSize.base, fontWeight: weightSemiBold },
  logBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(141,194,138,0.15)', alignItems: 'center', justifyContent: 'center' },
  logBtnText: { color: colors.accent, fontSize: 22, fontWeight: '300' },
```

Ensure `Pressable` is imported if not already.

- [ ] **Step 2: Smoke test**

Launch → Nutrition → BODY COMP. Tap the "+" at the top right of the tab content. Modal appears. Log a weight or switch to body-fat mode and log that. Chart updates.

- [ ] **Step 3: Commit**

```bash
git add src/screens/BodyCompView.tsx
git commit -m "feat(body-comp): + log button in BODY COMP tab header"
```

---

## Task 23: Edit mode wiring — BF dot tap on chart + WEEK row edit long-press

**Files:**
- Modify: `src/components/OverlayChart.tsx` — expose `onBodyFatDotPress`
- Modify: `src/components/BodyCompMonthView.tsx` — pass through callback
- Modify: `src/components/BodyCompWeekView.tsx` — long-press on a day row opens edit modal
- Modify: `src/screens/BodyCompView.tsx` — handle edit-mode open + collision replace prompt

- [ ] **Step 1: Expose onBodyFatDotPress from OverlayChart**

In `src/components/OverlayChart.tsx`:

1. Add to props interface:
   ```tsx
   onBodyFatDotPress?: (date: string) => void;
   ```

2. Destructure it in the function signature.

3. Attach an `events` prop to `VictoryScatter`:
   ```tsx
   events={[{
     target: 'data',
     eventHandlers: {
       onPress: (_e: any, props: any) => {
         const iso = new Date(props.datum.x).toISOString().slice(0, 10);
         onBodyFatDotPress?.(iso);
         return [];
       },
     },
   }]}
   ```

- [ ] **Step 2: Handle edit-mode from BodyCompView**

In `src/screens/BodyCompView.tsx`, add state for edit-mode payloads:

```tsx
const [editingMetric, setEditingMetric] = useState<{ type: 'weight' | 'body_fat'; date: string; value: number; note: string | null } | null>(null);
const [collisionPrompt, setCollisionPrompt] = useState<LogBodyMetricPayload | null>(null);
```

Add helpers for each edit entry point:

```tsx
const openEditForBodyFatOnDate = async (date: string) => {
  const row = await getBodyMetricByDate('body_fat', date);
  if (row) setEditingMetric({ type: 'body_fat', date, value: row.value, note: row.note });
};

const openEditForWeightOnDate = async (date: string) => {
  const row = await getBodyMetricByDate('weight', date);
  if (row) setEditingMetric({ type: 'weight', date, value: row.value, note: row.note });
};
```

Pass `onBodyFatDotPress={openEditForBodyFatOnDate}` through BodyCompMonthView → OverlayChart.

Render a second modal for edit-mode below the add modal:

```tsx
{editingMetric && (
  <LogBodyMetricModal
    visible={true}
    mode={editingMetric.type}
    initialDate={editingMetric.date}
    initialValue={editingMetric.value}
    initialNote={editingMetric.note}
    onClose={() => setEditingMetric(null)}
    onSave={async (payload) => {
      await upsertBodyMetric({
        metricType: payload.metricType,
        value: payload.value,
        unit: payload.unit,
        recordedDate: payload.recordedDate,
        note: payload.note,
      });
      setEditingMetric(null);
      await refresh();
    }}
  />
)}
```

For the add-mode collision flow, pass an `existingDates` prop (built from `weights`) and an `onCollision` handler that stores `collisionPrompt` and shows an Alert:

```tsx
import { Alert } from 'react-native';

const existingWeightDates = useMemo(() => new Set(weights.map(w => w.recordedDate)), [weights]);

// In the add-mode LogBodyMetricModal:
<LogBodyMetricModal
  visible={logVisible}
  mode="weight"
  initialDate={today}
  existingDates={existingWeightDates}
  onClose={() => setLogVisible(false)}
  onSave={handleSave}
  onCollision={(payload) => {
    Alert.alert(
      'Replace existing reading?',
      `A weight reading already exists for ${payload.recordedDate}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', onPress: async () => {
            await upsertBodyMetric({
              metricType: payload.metricType,
              value: payload.value,
              unit: payload.unit,
              recordedDate: payload.recordedDate,
              note: payload.note,
            });
            setLogVisible(false);
            await refresh();
          }
        },
      ],
    );
  }}
/>
```

- [ ] **Step 3: Add long-press on WEEK row to open edit**

In `src/components/BodyCompWeekView.tsx`:

1. Add a prop:
   ```tsx
   onLongPressDay?: (date: string) => void;
   ```

2. Destructure and attach to the `Pressable`:
   ```tsx
   <Pressable
     ...
     onLongPress={() => onLongPressDay?.(date)}
   >
   ```

In `src/screens/BodyCompView.tsx`, pass `onLongPressDay={openEditForWeightOnDate}` to `<BodyCompWeekView>`.

- [ ] **Step 4: Smoke test**

Launch → log a BF% on 2026-04-25 → switch to MONTH scope with April in view. Gold dot should appear. Tap it → edit modal opens pre-filled with 18.0. Change to 17.5, save. Dot updates.

Go to WEEK → long-press a day row → edit modal opens pre-filled with that weight.

From Dashboard → Edit icon on card → edit modal pre-fills today's weight.

- [ ] **Step 5: Commit**

```bash
git add src/components/OverlayChart.tsx src/components/BodyCompMonthView.tsx src/components/BodyCompWeekView.tsx src/screens/BodyCompView.tsx
git commit -m "feat(body-comp): edit-mode wiring + collision replace prompt"
```

---

## Task 24: HUMAN-UAT.md + integration smoke test

**Files:**
- Create: `docs/superpowers/plans/2026-04-22-body-composition-tracking-HUMAN-UAT.md`

- [ ] **Step 1: Write the UAT checklist**

Create `docs/superpowers/plans/2026-04-22-body-composition-tracking-HUMAN-UAT.md`:

```markdown
# Body Composition Tracking — Human UAT

Perform on the emulator + physical device.

## Smoke
- [ ] App launches without crash
- [ ] Dashboard shows new "WEIGHT · TODAY" card between Next Workout and Nutrition Rings
- [ ] Nutrition screen shows a third tab "BODY COMP"

## Daily log flow
- [ ] Tap "+ Log" on Dashboard card → modal opens with today's date
- [ ] Enter 177.4 → Save → card updates to show 177.4 (no delta since no yesterday)
- [ ] Relaunch app → Dashboard card still shows 177.4
- [ ] Tap the Edit icon on the card → modal pre-fills with 177.4 → change to 176.9 → Save → card updates

## Collision + edit modes
- [ ] With today's weight already logged, tap "+ Log" again → enter a different value → Save → replace prompt appears → Replace → value updates
- [ ] Long-press a day row in WEEK view → edit modal pre-fills that day's value → no replace prompt when saving

## BODY COMP tab
- [ ] Switch MONTH/WEEK/DAY — slider animates, content changes appropriately
- [ ] Date arrows step by scope-unit (month/7days/day); right arrow disables at today
- [ ] MONTH: chart shows weight line + MA + calorie bars; KPIs populated; month summary list shows reasonable values
- [ ] WEEK: 7 calorie bars + weight line with daily markers; daily breakdown list populates
- [ ] DAY: hero weight + macro rings + meals list (if any meals logged)

## Body fat
- [ ] Tap "+" in BODY COMP header → modal opens → toggle to Body Fat % → enter 18.0 for 2026-04-25 → save
- [ ] MONTH view shows a gold dot on the weight line at 2026-04-25
- [ ] Tap the gold dot → edit modal opens pre-filled with 18.0

## Program overlays (requires an active program)
- [ ] With a program spanning the visible MONTH, dashed vertical lines appear at program start and end
- [ ] Lines labeled "P1 start" / "P1 end" (tiny text at top)

## Edge cases
- [ ] No weights logged anywhere → BODY COMP shows Scale icon + "Log your first weight" CTA
- [ ] Delete a program → body-metric readings survive; program-overlay line disappears
- [ ] Backfill a weight from 10 days ago → MONTH chart updates with historical point
- [ ] Log a weight below 50 lb → Save button stays disabled; inline hint appears
- [ ] Log a body fat % above 60 → Save button stays disabled; inline hint appears
- [ ] Enter a note ("post-race") → saved and visible in edit mode next time

## Data integrity
- [ ] Launch on a fresh install — V24 migration runs, table exists, no errors
- [ ] Restart the app after logging — data persists
```

- [ ] **Step 2: Run the full test suite**

Run: `npx jest`
Expected: All existing + new tests pass (no regressions).

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-04-22-body-composition-tracking-HUMAN-UAT.md
git commit -m "docs(body-comp): human UAT checklist"
```

---

## Post-merge follow-ups

Out of scope for this plan but worth tracking:

1. **Rename `ProteinScreen.tsx` → `NutritionScreen.tsx`.** The screen title, tab bar, and route all say "Nutrition" now; the file name is a leftover. Do as a standalone rename PR with `git mv` + find/replace of imports. No behavior change.
2. **Unit preference (lb/kg toggle).** Add a user-preference settings entry + convert value on display (storage stays in canonical lb). Revisit in v1.1.
3. **Target weight goal line.** Add to Settings; render as a dashed horizontal line at that weight on MONTH and WEEK scopes. Revisit in v1.1 when user has enough data to set a meaningful target.
4. **Apple Health / Google Fit sync.** Major additional feature; separate spec.
5. **Chart perf profile.** If MONTH scope feels janky on older Android devices, move chart data computation into `useMemo` keyed on `{scope, startDate, endDate}` and consider dropping the raw-line layer in favor of MA-only at MONTH scope.
