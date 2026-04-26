# Progress Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Progress / Categories / Sessions screens with a redesigned, exercise-first hub (per `docs/superpowers/specs/2026-04-25-progress-screen-redesign-design.md`) — thin insight strip + segmented [Exercises | Program Days] feed, dual-axis chart on consolidated Exercise Detail, anti-AI-slop neutral deltas across all surfaces.

**Architecture:** New components live in `src/components/progress/`. Six new read-only DB functions in `src/db/progress.ts`. `StrengthVolumeChart` is custom SVG on `react-native-svg` (no new deps). Two existing screens deleted (`CategoryProgressScreen`, `ExerciseProgressScreen`); three rewritten/restyled. Single-PR rollout, atomic commits per task. Type-checker green only after Task 22 (route cleanup).

**Tech Stack:** React Native + TypeScript + Jest + @testing-library/react-native + react-native-svg (already installed) + react-native-sqlite-storage. **No new npm deps. No schema changes.**

**Out of scope:** Animations beyond one `LayoutAnimation` history-row expand. Pull-to-refresh. Per-category Stale thresholds. 1RM math. Search debounce. Tab persistence. Snapshot tests. Removing `react-native-chart-kit` from `package.json` (separate cleanup commit).

---

## File Structure

**New files** (`src/components/progress/`):
- `InsightStrip.tsx` + `__tests__/InsightStrip.test.tsx`
- `PRWatchTile.tsx` + `__tests__/PRWatchTile.test.tsx`
- `StaleTile.tsx` + `__tests__/StaleTile.test.tsx`
- `ProgressSegmentedControl.tsx` + `__tests__/ProgressSegmentedControl.test.tsx`
- `CategoryChipRow.tsx` + `__tests__/CategoryChipRow.test.tsx`
- `ExerciseListRow.tsx` + `__tests__/ExerciseListRow.test.tsx`
- `ProgramDayCard.tsx` + `__tests__/ProgramDayCard.test.tsx`
- `WeeklyTonnageBars.tsx` + `__tests__/WeeklyTonnageBars.test.tsx`
- `StrengthVolumeChart.tsx` + `__tests__/StrengthVolumeChart.test.tsx`
- `ChartInspectCallout.tsx` + `__tests__/ChartInspectCallout.test.tsx`
- `SessionHistoryRow.tsx` + `__tests__/SessionHistoryRow.test.tsx`

**Modified:**
- `src/types/index.ts` — add new interfaces
- `src/db/progress.ts` — add 6 new functions; delete 4 obsolete
- `src/db/__tests__/progress.test.ts` — add tests for new fns; remove for deleted
- `src/screens/ProgressHubScreen.tsx` — full rewrite
- `src/screens/__tests__/ProgressHubScreen.test.tsx` — full rewrite
- `src/screens/ExerciseDetailScreen.tsx` — chart swap, history swap, v6 polish
- `src/screens/__tests__/ExerciseDetailScreen.test.tsx` — update assertions
- `src/screens/SessionDayProgressScreen.tsx` — color fix + tap-to-navigate + v6 polish
- `src/screens/__tests__/SessionDayProgressScreen.test.tsx` — assert textSoft, never danger
- `src/navigation/TabNavigator.tsx` — remove `CategoryProgress` + `ExerciseProgress` from `DashboardStackParamList`, remove screen registrations and imports

**Deleted:**
- `src/screens/CategoryProgressScreen.tsx` + test
- `src/screens/ExerciseProgressScreen.tsx` + test
- `src/components/CategorySummaryCard.tsx` + test
- `src/components/SessionTimelineRow.tsx` + test

**Verification:** `npx tsc --noEmit` green only after Task 22.

---

## Task 1 — Add new types

**Files:**
- Modify: `src/types/index.ts` (append at end, before any final default-export)

- [ ] **Step 1: Read `src/types/index.ts`** — locate `ExerciseCategory` (line 1) and `ExerciseHistorySession` (line 146); confirm where to append.

- [ ] **Step 2: Append new types**

```typescript
// ── Progress Hub redesign (2026-04-25) ────────────────────────────────

export interface ExerciseListItem {
  exerciseId: number;
  exerciseName: string;
  category: ExerciseCategory;
  measurementType: 'reps' | 'timed' | 'height_reps';
  lastTrainedAt: string | null;          // ISO; null if never trained
  sessionCount: number;
  sparklinePoints: number[];             // last up-to-8 best-weight values
  deltaPercent14d: number | null;        // null if <2 sessions in 14d window
}

export interface ProgramDayWeeklyTonnage {
  programDayId: number;
  dayName: string;
  exerciseCount: number;
  lastPerformedAt: string | null;
  weeklyTonnageLb: [number, number, number, number]; // [4wk, 3wk, 2wk, this wk]
  currentWeekTonnageLb: number;          // = weeklyTonnageLb[3]
  deltaPercent2wk: number | null;        // last 2wk vs prior 2wk; null if insufficient
}

export interface PRWatchCandidate {
  exerciseId: number;
  exerciseName: string;
  currentBestLb: number;
  targetLb: number;
  distanceLb: number;
}

export interface StaleExerciseCandidate {
  exerciseId: number;
  exerciseName: string;
  daysSinceLastTrained: number;
  category: ExerciseCategory;
}

export interface ChartPoint {
  sessionId: number;
  date: string;             // ISO
  bestWeightLb: number;     // top working set weight
  volumeLb: number;         // sum(weight × reps), working sets only (excludes warmups)
  isPR: boolean;
}
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (types are unused so far, just adding them)

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): progress redesign types — ExerciseListItem, ProgramDayWeeklyTonnage, PRWatchCandidate, StaleExerciseCandidate, ChartPoint"
```

---

## Task 2 — DB function: `getAllExercisesWithProgress`

**Files:**
- Modify: `src/db/progress.ts` (append new function)
- Modify: `src/db/__tests__/progress.test.ts` (append new describe block)

**Note:** All weight columns in DB are `weight_kg` BUT (per recent fix `6489120`) the DB stores values as lb already — column name is misleading. Treat values as lb in queries; do not multiply by 2.20462.

- [ ] **Step 1: Write failing tests**

Append to `src/db/__tests__/progress.test.ts`:

```typescript
// ── getAllExercisesWithProgress ──────────────────────────────────────

import { getAllExercisesWithProgress } from '../progress';

describe('getAllExercisesWithProgress', () => {
  it('returns all exercises sorted by recent when filter=all', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 1, name: 'Bench Press', category: 'chest', measurement_type: 'reps',
        last_trained_at: '2026-04-22T00:00:00Z', session_count: 12 },
      { id: 2, name: 'Squat', category: 'legs', measurement_type: 'reps',
        last_trained_at: '2026-04-20T00:00:00Z', session_count: 8 },
    ]));
    // Sparkline + delta query per exercise (2 queries × 2 exercises = 4 more)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { date: '2026-04-22', best: 195 }, { date: '2026-04-19', best: 190 },
    ]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { date: '2026-04-22', best: 195 }, { date: '2026-04-08', best: 185 },
    ]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { date: '2026-04-20', best: 275 }, { date: '2026-04-18', best: 270 },
    ]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { date: '2026-04-20', best: 275 }, { date: '2026-04-06', best: 265 },
    ]));

    const result = await getAllExercisesWithProgress('all', '', 'recent');
    expect(result.length).toBe(2);
    expect(result[0].exerciseName).toBe('Bench Press');
    expect(result[0].sparklinePoints.length).toBeGreaterThan(0);
  });

  it('returns deltaPercent14d=null when fewer than 2 sessions in 14d window', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 1, name: 'X', category: 'chest', measurement_type: 'reps',
        last_trained_at: '2026-04-22T00:00:00Z', session_count: 1 },
    ]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ date: '2026-04-22', best: 100 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ date: '2026-04-22', best: 100 }]));

    const result = await getAllExercisesWithProgress('all', '', 'recent');
    expect(result[0].deltaPercent14d).toBeNull();
  });

  it('filters by category when filter set', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getAllExercisesWithProgress('legs', '', 'recent');
    const sql = mockExecuteSql.mock.calls[0][1] as string;
    expect(sql).toContain('category');
    const params = mockExecuteSql.mock.calls[0][2] as unknown[];
    expect(params).toContain('legs');
  });

  it('case-insensitive name search filter', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getAllExercisesWithProgress('all', 'BENCH', 'recent');
    const sql = mockExecuteSql.mock.calls[0][1] as string;
    expect(sql.toLowerCase()).toContain('like');
    const params = mockExecuteSql.mock.calls[0][2] as unknown[];
    expect(params).toContain('%bench%');
  });

  it('sort=movers ranks by absolute deltaPercent14d', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 1, name: 'Up7', category: 'chest', measurement_type: 'reps',
        last_trained_at: '2026-04-22T00:00:00Z', session_count: 5 },
      { id: 2, name: 'Down12', category: 'back', measurement_type: 'reps',
        last_trained_at: '2026-04-21T00:00:00Z', session_count: 5 },
    ]));
    // Up7: 7% gain
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ date: '2026-04-22', best: 100 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { date: '2026-04-22', best: 107 }, { date: '2026-04-15', best: 100 },
    ]));
    // Down12: -12% drop
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ date: '2026-04-21', best: 88 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { date: '2026-04-21', best: 88 }, { date: '2026-04-15', best: 100 },
    ]));

    const result = await getAllExercisesWithProgress('all', '', 'movers');
    expect(result[0].exerciseName).toBe('Down12'); // |12| > |7|
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=progress.test`
Expected: FAIL — `getAllExercisesWithProgress is not a function`

- [ ] **Step 3: Implement function**

Append to `src/db/progress.ts`:

```typescript
import { ExerciseListItem } from '../types';

const SPARKLINE_MAX_POINTS = 8;
const TOP_MOVERS_WINDOW_DAYS = 14;

/**
 * All exercises with progress data, optionally filtered/searched.
 * One base query for exercise rows + 2 queries per exercise for sparkline & delta.
 */
export async function getAllExercisesWithProgress(
  filter: string = 'all',
  search: string = '',
  sort: 'movers' | 'recent' | 'name' = 'recent',
): Promise<ExerciseListItem[]> {
  const database = await db;

  const whereParts: string[] = [];
  const params: unknown[] = [];
  if (filter !== 'all') {
    whereParts.push('e.category = ?');
    params.push(filter);
  }
  if (search.length > 0) {
    whereParts.push('LOWER(e.name) LIKE ?');
    params.push(`%${search.toLowerCase()}%`);
  }
  const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  const baseResult = await executeSql(
    database,
    `SELECT e.id, e.name, e.category, e.measurement_type,
            MAX(wss.completed_at) AS last_trained_at,
            COUNT(DISTINCT wss.id) AS session_count
       FROM exercises e
       LEFT JOIN workout_sets ws ON ws.exercise_id = e.id
            AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
       LEFT JOIN workout_sessions wss ON wss.id = ws.session_id
            AND wss.completed_at IS NOT NULL
       ${whereSql}
       GROUP BY e.id
       ORDER BY last_trained_at DESC NULLS LAST`,
    params,
  );

  const items: ExerciseListItem[] = [];
  for (let i = 0; i < baseResult.rows.length; i++) {
    const row = baseResult.rows.item(i);

    // Sparkline: last up-to-8 sessions, max(weight) per session
    const sparkResult = await executeSql(
      database,
      `SELECT wss.completed_at AS date, MAX(ws.weight_kg) AS best
         FROM workout_sets ws
         INNER JOIN workout_sessions wss ON wss.id = ws.session_id
         WHERE ws.exercise_id = ? AND wss.completed_at IS NOT NULL
           AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
         GROUP BY wss.id
         ORDER BY wss.completed_at DESC
         LIMIT ?`,
      [row.id, SPARKLINE_MAX_POINTS],
    );
    const sparklinePoints: number[] = [];
    for (let s = sparkResult.rows.length - 1; s >= 0; s--) {
      const v = sparkResult.rows.item(s).best;
      if (typeof v === 'number') { sparklinePoints.push(v); }
    }

    // Delta: best in 14d window vs first session in window
    const cutoff = new Date(Date.now() - TOP_MOVERS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const deltaResult = await executeSql(
      database,
      `SELECT wss.completed_at AS date, MAX(ws.weight_kg) AS best
         FROM workout_sets ws
         INNER JOIN workout_sessions wss ON wss.id = ws.session_id
         WHERE ws.exercise_id = ? AND wss.completed_at >= ?
           AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
         GROUP BY wss.id
         ORDER BY wss.completed_at ASC`,
      [row.id, cutoff],
    );
    let deltaPercent14d: number | null = null;
    if (deltaResult.rows.length >= 2) {
      const first = deltaResult.rows.item(0).best;
      const last = deltaResult.rows.item(deltaResult.rows.length - 1).best;
      if (first > 0) {
        deltaPercent14d = ((last - first) / first) * 100;
      }
    }

    items.push({
      exerciseId: row.id,
      exerciseName: row.name,
      category: row.category,
      measurementType: row.measurement_type ?? 'reps',
      lastTrainedAt: row.last_trained_at ?? null,
      sessionCount: row.session_count ?? 0,
      sparklinePoints,
      deltaPercent14d,
    });
  }

  if (sort === 'movers') {
    items.sort((a, b) => Math.abs(b.deltaPercent14d ?? 0) - Math.abs(a.deltaPercent14d ?? 0));
  } else if (sort === 'name') {
    items.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  }
  // sort='recent' uses base query order (last_trained_at DESC)

  return items;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=progress.test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/progress.ts src/db/__tests__/progress.test.ts
git commit -m "feat(db): getAllExercisesWithProgress for redesigned hub feed"
```

---

## Task 3 — DB function: `getTopMovers`

**Files:**
- Modify: `src/db/progress.ts`
- Modify: `src/db/__tests__/progress.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/db/__tests__/progress.test.ts`:

```typescript
import { getTopMovers } from '../progress';

describe('getTopMovers', () => {
  it('returns up to N exercises ranked by |deltaPercent|', async () => {
    // Mock the underlying getAllExercisesWithProgress queries
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 1, name: 'BiggestMover', category: 'chest', measurement_type: 'reps',
        last_trained_at: '2026-04-22T00:00:00Z', session_count: 5 },
    ]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ date: '2026-04-22', best: 120 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { date: '2026-04-22', best: 120 }, { date: '2026-04-15', best: 100 },
    ]));

    const result = await getTopMovers(14, 3);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result[0].deltaPercent14d).not.toBeNull();
  });

  it('excludes exercises with null deltaPercent14d', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 1, name: 'OnlyOneSession', category: 'chest', measurement_type: 'reps',
        last_trained_at: '2026-04-22T00:00:00Z', session_count: 1 },
    ]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ date: '2026-04-22', best: 100 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ date: '2026-04-22', best: 100 }]));

    const result = await getTopMovers(14, 3);
    expect(result.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=progress.test`
Expected: FAIL — `getTopMovers is not a function`

- [ ] **Step 3: Implement function**

Append to `src/db/progress.ts`:

```typescript
const TOP_MOVERS_LIMIT = 3;

/** Top N exercises by absolute % change in best weight over the window. */
export async function getTopMovers(
  windowDays: number = TOP_MOVERS_WINDOW_DAYS,
  limit: number = TOP_MOVERS_LIMIT,
): Promise<ExerciseListItem[]> {
  const all = await getAllExercisesWithProgress('all', '', 'movers');
  return all
    .filter(e => e.deltaPercent14d !== null)
    .slice(0, limit);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=progress.test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/progress.ts src/db/__tests__/progress.test.ts
git commit -m "feat(db): getTopMovers — top N exercises by abs % change"
```

---

## Task 4 — DB function: `getProgramDayWeeklyTonnage`

**Files:**
- Modify: `src/db/progress.ts`
- Modify: `src/db/__tests__/progress.test.ts`

- [ ] **Step 1: Read existing patterns** for program-day → session linkage in current `getSessionDayProgress` (already in `src/db/progress.ts`) to understand the program → program_days → workout_sessions relationship.

- [ ] **Step 2: Write failing tests**

Append to `src/db/__tests__/progress.test.ts`:

```typescript
import { getProgramDayWeeklyTonnage } from '../progress';

describe('getProgramDayWeeklyTonnage', () => {
  it('returns one row per program day with 4-tuple weeklyTonnageLb', async () => {
    // Day rows
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 10, name: 'Push Day', exercise_count: 6, last_performed_at: '2026-04-22T00:00:00Z' },
    ]));
    // Weekly tonnage for day 10 (4 rows: w-3, w-2, w-1, this)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { week_offset: 3, tonnage: 9500 },
      { week_offset: 2, tonnage: 13200 },
      { week_offset: 1, tonnage: 17400 },
      { week_offset: 0, tonnage: 18450 },
    ]));

    const result = await getProgramDayWeeklyTonnage(1);
    expect(result.length).toBe(1);
    expect(result[0].dayName).toBe('Push Day');
    expect(result[0].weeklyTonnageLb).toEqual([9500, 13200, 17400, 18450]);
    expect(result[0].currentWeekTonnageLb).toBe(18450);
  });

  it('deltaPercent2wk null when fewer than 4 weeks of data', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 10, name: 'Push', exercise_count: 6, last_performed_at: '2026-04-22T00:00:00Z' },
    ]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { week_offset: 1, tonnage: 1000 },
      { week_offset: 0, tonnage: 1100 },
    ]));

    const result = await getProgramDayWeeklyTonnage(1);
    expect(result[0].deltaPercent2wk).toBeNull();
    expect(result[0].weeklyTonnageLb).toEqual([0, 0, 1000, 1100]);
  });

  it('deltaPercent2wk = (last2wk - prior2wk)/prior2wk * 100 when 4 weeks present', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 10, name: 'Push', exercise_count: 6, last_performed_at: '2026-04-22T00:00:00Z' },
    ]));
    // prior 2wk = 9500+13200=22700; last 2wk = 17400+18450=35850 → +57.9%
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { week_offset: 3, tonnage: 9500 },
      { week_offset: 2, tonnage: 13200 },
      { week_offset: 1, tonnage: 17400 },
      { week_offset: 0, tonnage: 18450 },
    ]));

    const result = await getProgramDayWeeklyTonnage(1);
    expect(result[0].deltaPercent2wk).toBeCloseTo(57.93, 1);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=progress.test`
Expected: FAIL

- [ ] **Step 4: Implement function**

Append to `src/db/progress.ts`:

```typescript
import { ProgramDayWeeklyTonnage } from '../types';

/**
 * Weekly tonnage for each day in a program, last 4 weeks.
 * weekly bins: week_offset 0 = current week (Mon-now), 1 = prior, 2 = etc.
 * Uses same-point-in-week comparison: "this week" = Mon → now.
 */
export async function getProgramDayWeeklyTonnage(
  programId: number,
): Promise<ProgramDayWeeklyTonnage[]> {
  const database = await db;

  // Day rows for this program
  const daysResult = await executeSql(
    database,
    `SELECT pd.id, pd.name,
            (SELECT COUNT(*) FROM program_day_exercises pde WHERE pde.program_day_id = pd.id) AS exercise_count,
            (SELECT MAX(wss.completed_at)
               FROM workout_sessions wss
               WHERE wss.program_day_id = pd.id AND wss.completed_at IS NOT NULL) AS last_performed_at
       FROM program_days pd
       WHERE pd.program_id = ?
       ORDER BY pd.day_order ASC`,
    [programId],
  );

  const days: ProgramDayWeeklyTonnage[] = [];
  const now = new Date();
  const thisWeekStart = getWeekStart(now);

  for (let i = 0; i < daysResult.rows.length; i++) {
    const row = daysResult.rows.item(i);

    // Compute week boundaries for last 4 weeks
    const weekBins: { weekOffset: number; startISO: string; endISO: string }[] = [];
    for (let off = 0; off < 4; off++) {
      const weekStart = new Date(new Date(thisWeekStart).getTime() - off * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = off === 0
        ? now
        : new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      // Same-point-in-week for prior weeks: cap by elapsed-since-Mon
      const weekEndAdj = off === 0
        ? weekEnd
        : (() => {
            const elapsedMs = now.getTime() - new Date(thisWeekStart).getTime();
            return new Date(weekStart.getTime() + elapsedMs);
          })();
      weekBins.push({
        weekOffset: off,
        startISO: weekStart.toISOString(),
        endISO: weekEndAdj.toISOString(),
      });
    }

    // Tonnage per week bin
    const params: unknown[] = [];
    const caseExpr = weekBins.map((b, idx) => {
      params.push(b.startISO, b.endISO);
      return `WHEN wss.completed_at >= ? AND wss.completed_at < ? THEN ${idx}`;
    }).join(' ');

    const tonnageResult = await executeSql(
      database,
      `SELECT
         CASE ${caseExpr} ELSE -1 END AS week_offset,
         SUM(ws.weight_kg * ws.reps) AS tonnage
       FROM workout_sets ws
       INNER JOIN workout_sessions wss ON wss.id = ws.session_id
       WHERE wss.program_day_id = ?
         AND wss.completed_at IS NOT NULL
         AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
       GROUP BY week_offset
       HAVING week_offset >= 0`,
      [...params, row.id],
    );

    const tonnageByOffset: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (let r = 0; r < tonnageResult.rows.length; r++) {
      const tr = tonnageResult.rows.item(r);
      tonnageByOffset[tr.week_offset] = tr.tonnage ?? 0;
    }
    // Build [4wk, 3wk, 2wk, this] = [offset 3, 2, 1, 0]
    const weeklyTonnageLb: [number, number, number, number] = [
      tonnageByOffset[3], tonnageByOffset[2], tonnageByOffset[1], tonnageByOffset[0],
    ];
    const currentWeekTonnageLb = tonnageByOffset[0];

    // Delta: last 2wk vs prior 2wk
    const last2 = tonnageByOffset[0] + tonnageByOffset[1];
    const prior2 = tonnageByOffset[2] + tonnageByOffset[3];
    let deltaPercent2wk: number | null = null;
    if (prior2 > 0 && (tonnageByOffset[3] > 0 && tonnageByOffset[2] > 0 || prior2 > 0)) {
      // Require at least some data in prior 2wk
      deltaPercent2wk = ((last2 - prior2) / prior2) * 100;
    }
    // If we don't have 4 full weeks of data, return null
    if (tonnageByOffset[3] === 0 || tonnageByOffset[2] === 0) {
      deltaPercent2wk = null;
    }

    days.push({
      programDayId: row.id,
      dayName: row.name,
      exerciseCount: row.exercise_count ?? 0,
      lastPerformedAt: row.last_performed_at ?? null,
      weeklyTonnageLb,
      currentWeekTonnageLb,
      deltaPercent2wk,
    });
  }

  return days;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=progress.test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/db/progress.ts src/db/__tests__/progress.test.ts
git commit -m "feat(db): getProgramDayWeeklyTonnage — 4wk weekly bins, 2wk-vs-prior-2wk delta"
```

---

## Task 5 — DB function: `getPRWatch`

**Files:**
- Modify: `src/db/progress.ts`
- Modify: `src/db/__tests__/progress.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { getPRWatch } from '../progress';

describe('getPRWatch', () => {
  it('returns null when no exercise within threshold', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 1, name: 'Far', category: 'chest', measurement_type: 'reps',
        current_best: 100, session_count: 5 },
    ]));
    const result = await getPRWatch(10);
    // current_best 100 → next target 105 → distance 5 → within 10, should return
    expect(result).not.toBeNull();
    expect(result?.targetLb).toBe(105);
    expect(result?.distanceLb).toBe(5);
  });

  it('returns smallest distance candidate when multiple qualify', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 1, name: 'Bench', category: 'chest', measurement_type: 'reps',
        current_best: 195, session_count: 12, last_trained_at: '2026-04-22T00:00:00Z' },
      { id: 2, name: 'Squat', category: 'legs', measurement_type: 'reps',
        current_best: 273, session_count: 8, last_trained_at: '2026-04-20T00:00:00Z' },
    ]));
    // Bench: 195 → 200 → distance 5
    // Squat: 273 → 275 → distance 2
    const result = await getPRWatch(10);
    expect(result?.exerciseName).toBe('Squat');
    expect(result?.distanceLb).toBe(2);
  });

  it('excludes timed and height_reps measurement types', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getPRWatch();
    const sql = mockExecuteSql.mock.calls[0][1] as string;
    expect(sql).toContain("measurement_type = 'reps'");
  });

  it('returns null when only timed/height_reps exercises exist', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([])); // SQL filter excludes them
    const result = await getPRWatch();
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=progress.test`
Expected: FAIL

- [ ] **Step 3: Implement function**

```typescript
import { PRWatchCandidate } from '../types';

const PR_WATCH_MAX_LB = 10;
const PR_WATCH_INCREMENT_LB = 5;

/** Closest exercise to its current PR — within `maxLb`, or null. */
export async function getPRWatch(
  maxLb: number = PR_WATCH_MAX_LB,
): Promise<PRWatchCandidate | null> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT e.id, e.name, e.category,
            MAX(ws.weight_kg) AS current_best,
            COUNT(DISTINCT wss.id) AS session_count,
            MAX(wss.completed_at) AS last_trained_at
       FROM exercises e
       INNER JOIN workout_sets ws ON ws.exercise_id = e.id
            AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
       INNER JOIN workout_sessions wss ON wss.id = ws.session_id
            AND wss.completed_at IS NOT NULL
       WHERE e.measurement_type = 'reps'
       GROUP BY e.id
       HAVING session_count >= 3 AND current_best > 0`,
    [],
  );

  let bestCandidate: PRWatchCandidate | null = null;
  let bestRecency: string = '';

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const currentBest = row.current_best;
    const target = Math.ceil((currentBest + 1) / PR_WATCH_INCREMENT_LB) * PR_WATCH_INCREMENT_LB;
    const distance = target - currentBest;
    if (distance <= 0 || distance > maxLb) { continue; }

    const candidate: PRWatchCandidate = {
      exerciseId: row.id,
      exerciseName: row.name,
      currentBestLb: currentBest,
      targetLb: target,
      distanceLb: distance,
    };

    if (bestCandidate === null
        || distance < bestCandidate.distanceLb
        || (distance === bestCandidate.distanceLb && row.last_trained_at > bestRecency)) {
      bestCandidate = candidate;
      bestRecency = row.last_trained_at ?? '';
    }
  }

  return bestCandidate;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=progress.test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/progress.ts src/db/__tests__/progress.test.ts
git commit -m "feat(db): getPRWatch — closest rep-based exercise to next 5-lb target"
```

---

## Task 6 — DB function: `getStaleExercise`

**Files:**
- Modify: `src/db/progress.ts`
- Modify: `src/db/__tests__/progress.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { getStaleExercise } from '../progress';

describe('getStaleExercise', () => {
  it('returns null when nothing past threshold', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    const result = await getStaleExercise(14, 90);
    expect(result).toBeNull();
  });

  it('returns the longest-untrained exercise within [min,max] days', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 5, name: 'Deadlift', category: 'legs', days_since: 14 },
    ]));
    const result = await getStaleExercise(14, 90);
    expect(result?.exerciseName).toBe('Deadlift');
    expect(result?.daysSinceLastTrained).toBe(14);
  });

  it('SQL excludes archived programs', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getStaleExercise();
    const sql = mockExecuteSql.mock.calls[0][1] as string;
    expect(sql).toMatch(/archived|is_archived/i);
  });

  it('SQL excludes daysSinceLastTrained > 90', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getStaleExercise(14, 90);
    const params = mockExecuteSql.mock.calls[0][2] as unknown[];
    // Two thresholds passed: minDays cutoff, maxDays cutoff
    expect(params.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=progress.test`
Expected: FAIL

- [ ] **Step 3: Implement function**

**First check:** verify `programs` table has an archived column. Run:

```bash
grep -n "archived\|is_archived" /c/Users/eolson/WorkPC-Development/src/db/migrations.ts
```

Expected: at least one match. Use the actual column name in the SQL below (assume `is_archived` if found; substitute as needed).

```typescript
import { StaleExerciseCandidate } from '../types';

const STALE_MIN_DAYS = 14;
const STALE_MAX_DAYS = 90;

/**
 * Longest-untrained exercise that is part of a non-archived program,
 * with min <= days <= max. Anything older than max is "unused", not "stale".
 */
export async function getStaleExercise(
  minDays: number = STALE_MIN_DAYS,
  maxDays: number = STALE_MAX_DAYS,
): Promise<StaleExerciseCandidate | null> {
  const database = await db;
  const minCutoffISO = new Date(Date.now() - minDays * 24 * 60 * 60 * 1000).toISOString();
  const maxCutoffISO = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000).toISOString();

  const result = await executeSql(
    database,
    `SELECT e.id, e.name, e.category,
            MAX(wss.completed_at) AS last_trained_at,
            CAST((julianday('now') - julianday(MAX(wss.completed_at))) AS INTEGER) AS days_since
       FROM exercises e
       INNER JOIN program_day_exercises pde ON pde.exercise_id = e.id
       INNER JOIN program_days pd ON pd.id = pde.program_day_id
       INNER JOIN programs p ON p.id = pd.program_id
       INNER JOIN workout_sets ws ON ws.exercise_id = e.id
            AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
       INNER JOIN workout_sessions wss ON wss.id = ws.session_id
            AND wss.completed_at IS NOT NULL
       WHERE COALESCE(p.is_archived, 0) = 0
       GROUP BY e.id
       HAVING MAX(wss.completed_at) <= ? AND MAX(wss.completed_at) >= ?
       ORDER BY days_since DESC
       LIMIT 1`,
    [minCutoffISO, maxCutoffISO],
  );

  if (result.rows.length === 0) { return null; }
  const row = result.rows.item(0);
  return {
    exerciseId: row.id,
    exerciseName: row.name,
    daysSinceLastTrained: row.days_since,
    category: row.category,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=progress.test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/progress.ts src/db/__tests__/progress.test.ts
git commit -m "feat(db): getStaleExercise — programmed exercise with longest training gap"
```

---

## Task 7 — DB function: `getExerciseChartData`

**Files:**
- Modify: `src/db/progress.ts`
- Modify: `src/db/__tests__/progress.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { getExerciseChartData } from '../progress';

describe('getExerciseChartData', () => {
  it('returns chronological session points with bestWeight + volume', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { session_id: 1, date: '2026-01-15T00:00:00Z', best_weight: 175, volume: 1640 },
      { session_id: 2, date: '2026-02-01T00:00:00Z', best_weight: 180, volume: 1720 },
      { session_id: 3, date: '2026-02-20T00:00:00Z', best_weight: 195, volume: 2025 },
    ]));
    const result = await getExerciseChartData(1, '6M');
    expect(result.length).toBe(3);
    expect(result[0].bestWeightLb).toBe(175);
    expect(result[2].volumeLb).toBe(2025);
  });

  it('isPR set when bestWeight is running max', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { session_id: 1, date: '2026-01-15T00:00:00Z', best_weight: 175, volume: 1000 },
      { session_id: 2, date: '2026-02-01T00:00:00Z', best_weight: 170, volume: 1000 },
      { session_id: 3, date: '2026-02-20T00:00:00Z', best_weight: 180, volume: 1000 },
    ]));
    const result = await getExerciseChartData(1, '6M');
    expect(result[0].isPR).toBe(true);   // first session always PR
    expect(result[1].isPR).toBe(false);  // 170 < running max 175
    expect(result[2].isPR).toBe(true);   // 180 > running max 175
  });

  it('range filter passed as date cutoff', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getExerciseChartData(1, '1M');
    const params = mockExecuteSql.mock.calls[0][2] as unknown[];
    expect(params).toContain(1);
    expect(params.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=progress.test`
Expected: FAIL

- [ ] **Step 3: Implement function**

```typescript
import { ChartPoint } from '../types';

/**
 * Per-session strength + volume points for the dual-axis chart.
 * Working sets only; warmups excluded. Chronological order.
 * isPR = running-max best weight at the time of that session.
 */
export async function getExerciseChartData(
  exerciseId: number,
  range: '1M' | '3M' | '6M' | '1Y',
): Promise<ChartPoint[]> {
  const database = await db;
  const months = range === '1M' ? 1 : range === '3M' ? 3 : range === '6M' ? 6 : 12;
  const cutoffISO = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d.toISOString();
  })();

  const result = await executeSql(
    database,
    `SELECT wss.id AS session_id, wss.completed_at AS date,
            MAX(ws.weight_kg) AS best_weight,
            SUM(ws.weight_kg * ws.reps) AS volume
       FROM workout_sets ws
       INNER JOIN workout_sessions wss ON wss.id = ws.session_id
       WHERE ws.exercise_id = ?
         AND wss.completed_at IS NOT NULL
         AND wss.completed_at >= ?
         AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
       GROUP BY wss.id
       ORDER BY wss.completed_at ASC`,
    [exerciseId, cutoffISO],
  );

  const points: ChartPoint[] = [];
  let runningMax = 0;
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const isPR = row.best_weight > runningMax;
    if (isPR) { runningMax = row.best_weight; }
    points.push({
      sessionId: row.session_id,
      date: row.date,
      bestWeightLb: row.best_weight ?? 0,
      volumeLb: row.volume ?? 0,
      isPR,
    });
  }
  return points;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=progress.test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/progress.ts src/db/__tests__/progress.test.ts
git commit -m "feat(db): getExerciseChartData — combined strength+volume per session w/ isPR running max"
```

---

## Task 8 — Component: `PRWatchTile`

**Files:**
- Create: `src/components/progress/PRWatchTile.tsx`
- Create: `src/components/progress/__tests__/PRWatchTile.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/progress/__tests__/PRWatchTile.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PRWatchTile } from '../PRWatchTile';
import { PRWatchCandidate } from '../../../types';

const candidate: PRWatchCandidate = {
  exerciseId: 1,
  exerciseName: 'Bench Press',
  currentBestLb: 195,
  targetLb: 200,
  distanceLb: 5,
};

describe('PRWatchTile', () => {
  it('renders exercise name and distance text', () => {
    const { getByText } = render(
      <PRWatchTile candidate={candidate} onPress={() => {}} />,
    );
    expect(getByText('Bench Press')).toBeTruthy();
    expect(getByText('−5 lb away')).toBeTruthy();
  });

  it('renders the PR Watch label in gold', () => {
    const { getByTestId } = render(
      <PRWatchTile candidate={candidate} onPress={() => {}} />,
    );
    const label = getByTestId('pr-watch-label');
    const flatStyle = Array.isArray(label.props.style)
      ? Object.assign({}, ...label.props.style)
      : label.props.style;
    expect(flatStyle.color).toBe('#FFB800'); // colors.prGold
  });

  it('calls onPress with exerciseId when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <PRWatchTile candidate={candidate} onPress={onPress} />,
    );
    fireEvent.press(getByTestId('pr-watch-tile'));
    expect(onPress).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=PRWatchTile`
Expected: FAIL — module not found

- [ ] **Step 3: Implement component**

Create `src/components/progress/PRWatchTile.tsx`:

```typescript
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { PRWatchCandidate } from '../../types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { fontSize, weightSemiBold, weightBold } from '../../theme/typography';

interface Props {
  candidate: PRWatchCandidate;
  onPress: (exerciseId: number) => void;
}

export const PRWatchTile: React.FC<Props> = ({ candidate, onPress }) => (
  <TouchableOpacity
    testID="pr-watch-tile"
    style={styles.tile}
    activeOpacity={0.7}
    onPress={() => onPress(candidate.exerciseId)}>
    <Text testID="pr-watch-label" style={styles.label}>★ PR Watch</Text>
    <Text style={styles.body} numberOfLines={1}>{candidate.exerciseName}</Text>
    <Text style={styles.sub}>−{candidate.distanceLb} lb away</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.surface,
    borderColor: colors.goldBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.sm,
    flex: 1,
  },
  label: {
    color: colors.prGold,
    fontSize: 9,
    fontWeight: weightBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  body: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    marginTop: 2,
  },
  sub: {
    color: colors.secondary,
    fontSize: fontSize.xs,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=PRWatchTile`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/progress/PRWatchTile.tsx src/components/progress/__tests__/PRWatchTile.test.tsx
git commit -m "feat(progress): PRWatchTile — gold-zone closest-PR tile"
```

---

## Task 9 — Component: `StaleTile`

**Files:**
- Create: `src/components/progress/StaleTile.tsx`
- Create: `src/components/progress/__tests__/StaleTile.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StaleTile } from '../StaleTile';
import { StaleExerciseCandidate } from '../../../types';

const candidate: StaleExerciseCandidate = {
  exerciseId: 5,
  exerciseName: 'Deadlift',
  daysSinceLastTrained: 14,
  category: 'legs',
};

describe('StaleTile', () => {
  it('renders exercise name and days-since text', () => {
    const { getByText } = render(<StaleTile candidate={candidate} onPress={() => {}} />);
    expect(getByText('Deadlift')).toBeTruthy();
    expect(getByText('14d ago')).toBeTruthy();
  });

  it('label uses secondary slate color, NOT danger red', () => {
    const { getByTestId } = render(<StaleTile candidate={candidate} onPress={() => {}} />);
    const label = getByTestId('stale-label');
    const flatStyle = Array.isArray(label.props.style)
      ? Object.assign({}, ...label.props.style)
      : label.props.style;
    expect(flatStyle.color).toBe('#8E9298'); // colors.secondary
    expect(flatStyle.color).not.toBe('#D9534F'); // colors.danger
  });

  it('calls onPress with exerciseId when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<StaleTile candidate={candidate} onPress={onPress} />);
    fireEvent.press(getByTestId('stale-tile'));
    expect(onPress).toHaveBeenCalledWith(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=StaleTile`
Expected: FAIL

- [ ] **Step 3: Implement component**

```typescript
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { StaleExerciseCandidate } from '../../types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { fontSize, weightSemiBold, weightBold } from '../../theme/typography';

interface Props {
  candidate: StaleExerciseCandidate;
  onPress: (exerciseId: number) => void;
}

export const StaleTile: React.FC<Props> = ({ candidate, onPress }) => (
  <TouchableOpacity
    testID="stale-tile"
    style={styles.tile}
    activeOpacity={0.7}
    onPress={() => onPress(candidate.exerciseId)}>
    <Text testID="stale-label" style={styles.label}>Stale</Text>
    <Text style={styles.body} numberOfLines={1}>{candidate.exerciseName}</Text>
    <Text style={styles.sub}>{candidate.daysSinceLastTrained}d ago</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.surface,
    borderColor: colors.slateBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.sm,
    flex: 1,
  },
  label: {
    color: colors.secondary,
    fontSize: 9,
    fontWeight: weightBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  body: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    marginTop: 2,
  },
  sub: {
    color: colors.secondary,
    fontSize: fontSize.xs,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=StaleTile`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/progress/StaleTile.tsx src/components/progress/__tests__/StaleTile.test.tsx
git commit -m "feat(progress): StaleTile — slate-zone longest-untrained tile"
```

---

## Task 10 — Component: `InsightStrip`

**Files:**
- Create: `src/components/progress/InsightStrip.tsx`
- Create: `src/components/progress/__tests__/InsightStrip.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { InsightStrip } from '../InsightStrip';
import { PRWatchCandidate, StaleExerciseCandidate } from '../../../types';

const pr: PRWatchCandidate = {
  exerciseId: 1, exerciseName: 'Bench', currentBestLb: 195, targetLb: 200, distanceLb: 5,
};
const stale: StaleExerciseCandidate = {
  exerciseId: 5, exerciseName: 'Deadlift', daysSinceLastTrained: 14, category: 'legs',
};

describe('InsightStrip', () => {
  it('renders both tiles when both candidates provided', () => {
    const { getByTestId } = render(
      <InsightStrip prCandidate={pr} staleCandidate={stale} onTilePress={() => {}} />,
    );
    expect(getByTestId('pr-watch-tile')).toBeTruthy();
    expect(getByTestId('stale-tile')).toBeTruthy();
  });

  it('hides entire strip when both null', () => {
    const { queryByTestId } = render(
      <InsightStrip prCandidate={null} staleCandidate={null} onTilePress={() => {}} />,
    );
    expect(queryByTestId('insight-strip')).toBeNull();
  });

  it('renders only PR tile when stale is null', () => {
    const { getByTestId, queryByTestId } = render(
      <InsightStrip prCandidate={pr} staleCandidate={null} onTilePress={() => {}} />,
    );
    expect(getByTestId('pr-watch-tile')).toBeTruthy();
    expect(queryByTestId('stale-tile')).toBeNull();
  });

  it('forwards tile press with exerciseId', () => {
    const onTilePress = jest.fn();
    const { getByTestId } = render(
      <InsightStrip prCandidate={pr} staleCandidate={stale} onTilePress={onTilePress} />,
    );
    fireEvent.press(getByTestId('pr-watch-tile'));
    expect(onTilePress).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=InsightStrip`
Expected: FAIL

- [ ] **Step 3: Implement component**

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PRWatchCandidate, StaleExerciseCandidate } from '../../types';
import { PRWatchTile } from './PRWatchTile';
import { StaleTile } from './StaleTile';
import { spacing } from '../../theme/spacing';

interface Props {
  prCandidate: PRWatchCandidate | null;
  staleCandidate: StaleExerciseCandidate | null;
  onTilePress: (exerciseId: number) => void;
}

export const InsightStrip: React.FC<Props> = ({ prCandidate, staleCandidate, onTilePress }) => {
  if (prCandidate === null && staleCandidate === null) { return null; }
  return (
    <View testID="insight-strip" style={styles.strip}>
      {prCandidate && <PRWatchTile candidate={prCandidate} onPress={onTilePress} />}
      {staleCandidate && <StaleTile candidate={staleCandidate} onPress={onTilePress} />}
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=InsightStrip`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/progress/InsightStrip.tsx src/components/progress/__tests__/InsightStrip.test.tsx
git commit -m "feat(progress): InsightStrip — composes PRWatchTile + StaleTile, hides if both null"
```

---

## Task 11 — Component: `ProgressSegmentedControl`

**Files:**
- Create: `src/components/progress/ProgressSegmentedControl.tsx`
- Create: `src/components/progress/__tests__/ProgressSegmentedControl.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProgressSegmentedControl } from '../ProgressSegmentedControl';

describe('ProgressSegmentedControl', () => {
  it('renders both tab labels', () => {
    const { getByText } = render(
      <ProgressSegmentedControl active="exercises" onChange={() => {}} />,
    );
    expect(getByText('Exercises')).toBeTruthy();
    expect(getByText('Program Days')).toBeTruthy();
  });

  it('marks the active tab visually distinct', () => {
    const { getByTestId } = render(
      <ProgressSegmentedControl active="programDays" onChange={() => {}} />,
    );
    const active = getByTestId('seg-tab-programDays');
    const inactive = getByTestId('seg-tab-exercises');
    const flatActive = Array.isArray(active.props.style)
      ? Object.assign({}, ...active.props.style)
      : active.props.style;
    const flatInactive = Array.isArray(inactive.props.style)
      ? Object.assign({}, ...inactive.props.style)
      : inactive.props.style;
    expect(flatActive.backgroundColor).not.toBe(flatInactive.backgroundColor);
  });

  it('calls onChange when inactive tab tapped', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ProgressSegmentedControl active="exercises" onChange={onChange} />,
    );
    fireEvent.press(getByTestId('seg-tab-programDays'));
    expect(onChange).toHaveBeenCalledWith('programDays');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=ProgressSegmentedControl`
Expected: FAIL

- [ ] **Step 3: Implement component**

```typescript
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fontSize, weightSemiBold } from '../../theme/typography';

export type ProgressTab = 'exercises' | 'programDays';

interface Props {
  active: ProgressTab;
  onChange: (tab: ProgressTab) => void;
}

export const ProgressSegmentedControl: React.FC<Props> = ({ active, onChange }) => (
  <View style={styles.container}>
    <TouchableOpacity
      testID="seg-tab-exercises"
      style={[styles.tab, active === 'exercises' && styles.tabActive]}
      activeOpacity={0.7}
      onPress={() => onChange('exercises')}>
      <Text style={[styles.text, active === 'exercises' && styles.textActive]}>Exercises</Text>
    </TouchableOpacity>
    <TouchableOpacity
      testID="seg-tab-programDays"
      style={[styles.tab, active === 'programDays' && styles.tabActive]}
      activeOpacity={0.7}
      onPress={() => onChange('programDays')}>
      <Text style={[styles.text, active === 'programDays' && styles.textActive]}>Program Days</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: colors.surfaceElevated,
  },
  text: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  textActive: {
    color: colors.accent,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=ProgressSegmentedControl`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/progress/ProgressSegmentedControl.tsx src/components/progress/__tests__/ProgressSegmentedControl.test.tsx
git commit -m "feat(progress): ProgressSegmentedControl [Exercises | Program Days]"
```

---

## Task 12 — Component: `CategoryChipRow`

**Files:**
- Create: `src/components/progress/CategoryChipRow.tsx`
- Create: `src/components/progress/__tests__/CategoryChipRow.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CategoryChipRow } from '../CategoryChipRow';

describe('CategoryChipRow', () => {
  it('renders All chip plus all categories', () => {
    const { getByText } = render(
      <CategoryChipRow active="all" onChange={() => {}} />,
    );
    expect(getByText('All')).toBeTruthy();
    expect(getByText('Chest')).toBeTruthy();
    expect(getByText('Legs')).toBeTruthy();
  });

  it('All chip is the initial active state', () => {
    const { getByTestId } = render(
      <CategoryChipRow active="all" onChange={() => {}} />,
    );
    const allChip = getByTestId('chip-all');
    const flat = Array.isArray(allChip.props.style)
      ? Object.assign({}, ...allChip.props.style)
      : allChip.props.style;
    expect(flat.backgroundColor).toBe('#8DC28A'); // colors.accent
  });

  it('calls onChange with category key when chip pressed', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <CategoryChipRow active="all" onChange={onChange} />,
    );
    fireEvent.press(getByTestId('chip-chest'));
    expect(onChange).toHaveBeenCalledWith('chest');
  });

  it('All chip resets active to all', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <CategoryChipRow active="chest" onChange={onChange} />,
    );
    fireEvent.press(getByTestId('chip-all'));
    expect(onChange).toHaveBeenCalledWith('all');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=CategoryChipRow`
Expected: FAIL

- [ ] **Step 3: Implement component**

```typescript
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ExerciseCategory, EXERCISE_CATEGORIES } from '../../types';
import { colors } from '../../theme/colors';
import { fontSize, weightMedium, weightSemiBold } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export type ChipFilter = 'all' | ExerciseCategory;

interface Props {
  active: ChipFilter;
  onChange: (filter: ChipFilter) => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const CategoryChipRow: React.FC<Props> = ({ active, onChange }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.container}>
    <TouchableOpacity
      testID="chip-all"
      style={[styles.chip, active === 'all' && styles.chipActive]}
      activeOpacity={0.7}
      onPress={() => onChange('all')}>
      <Text style={[styles.text, active === 'all' && styles.textActive]}>All</Text>
    </TouchableOpacity>
    {EXERCISE_CATEGORIES.map(cat => (
      <TouchableOpacity
        key={cat}
        testID={`chip-${cat}`}
        style={[styles.chip, active === cat && styles.chipActive]}
        activeOpacity={0.7}
        onPress={() => onChange(cat)}>
        <Text style={[styles.text, active === cat && styles.textActive]}>{cap(cat)}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  container: { gap: 5, paddingRight: spacing.base, marginBottom: 10 },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderWidth: 0,
  },
  text: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    fontWeight: weightMedium,
  },
  textActive: {
    color: colors.onAccent,
    fontWeight: weightSemiBold,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=CategoryChipRow`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/progress/CategoryChipRow.tsx src/components/progress/__tests__/CategoryChipRow.test.tsx
git commit -m "feat(progress): CategoryChipRow — single-select horizontal filter"
```

---

## Task 13 — Component: `ExerciseListRow`

**Files:**
- Create: `src/components/progress/ExerciseListRow.tsx`
- Create: `src/components/progress/__tests__/ExerciseListRow.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ExerciseListRow } from '../ExerciseListRow';
import { ExerciseListItem } from '../../../types';

jest.mock('../../MiniSparkline', () => {
  const { View } = require('react-native');
  return { MiniSparkline: (props: { data: number[] }) => <View testID="mini-sparkline" {...props} /> };
});

const item: ExerciseListItem = {
  exerciseId: 1,
  exerciseName: 'Bench Press',
  category: 'chest',
  measurementType: 'reps',
  lastTrainedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  sessionCount: 12,
  sparklinePoints: [180, 185, 190, 195],
  deltaPercent14d: 7.4,
};

describe('ExerciseListRow', () => {
  it('renders name, category meta, sparkline, delta', () => {
    const { getByText, getByTestId } = render(
      <ExerciseListRow item={item} onPress={() => {}} />,
    );
    expect(getByText('Bench Press')).toBeTruthy();
    expect(getByTestId('mini-sparkline')).toBeTruthy();
    expect(getByText(/▲ 7%/)).toBeTruthy();
  });

  it('renders em-dash when delta is null', () => {
    const { getByText } = render(
      <ExerciseListRow item={{ ...item, deltaPercent14d: null }} onPress={() => {}} />,
    );
    expect(getByText('—')).toBeTruthy();
  });

  it('uses textSoft slate for negative delta, never danger red', () => {
    const { getByTestId } = render(
      <ExerciseListRow item={{ ...item, deltaPercent14d: -5 }} onPress={() => {}} />,
    );
    const delta = getByTestId('exercise-row-delta');
    const flat = Array.isArray(delta.props.style)
      ? Object.assign({}, ...delta.props.style)
      : delta.props.style;
    expect(flat.color).toBe('#BDC3CB'); // colors.textSoft
    expect(flat.color).not.toBe('#D9534F');
  });

  it('left accent stripe uses category color', () => {
    const { getByTestId } = render(
      <ExerciseListRow item={item} onPress={() => {}} />,
    );
    const accent = getByTestId('exercise-row-accent');
    const flat = Array.isArray(accent.props.style)
      ? Object.assign({}, ...accent.props.style)
      : accent.props.style;
    expect(flat.backgroundColor).toBe('#E8845C'); // chest color
  });

  it('calls onPress with exerciseId', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ExerciseListRow item={item} onPress={onPress} />,
    );
    fireEvent.press(getByTestId('exercise-row'));
    expect(onPress).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=ExerciseListRow`
Expected: FAIL

- [ ] **Step 3: Implement component**

```typescript
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { ExerciseListItem } from '../../types';
import { MiniSparkline } from '../MiniSparkline';
import { formatRelativeTime } from '../../utils/formatRelativeTime';
import { colors, getCategoryColor } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { fontSize, weightSemiBold } from '../../theme/typography';

interface Props {
  item: ExerciseListItem;
  onPress: (exerciseId: number) => void;
}

const formatDelta = (pct: number | null): string => {
  if (pct === null) { return '—'; }
  const rounded = Math.round(pct);
  if (rounded === 0) { return '— 0%'; }
  if (rounded > 0) { return `▲ ${rounded}%`; }
  return `▼ ${Math.abs(rounded)}%`;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const ExerciseListRow: React.FC<Props> = ({ item, onPress }) => {
  const accent = getCategoryColor(item.category);
  const lastTrainedText = item.lastTrainedAt ? formatRelativeTime(item.lastTrainedAt) : '—';
  return (
    <TouchableOpacity
      testID="exercise-row"
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => onPress(item.exerciseId)}>
      <View testID="exercise-row-accent" style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>{item.exerciseName}</Text>
        <Text style={styles.meta}>
          {cap(item.category)} · {item.sessionCount} sessions · {lastTrainedText}
        </Text>
      </View>
      <View style={styles.sparkline}>
        <MiniSparkline
          data={item.sparklinePoints.length > 0 ? item.sparklinePoints : [0]}
          width={50}
          height={24}
          color={accent}
          strokeWidth={1.5}
        />
      </View>
      <Text testID="exercise-row-delta" style={styles.delta}>
        {formatDelta(item.deltaPercent14d)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.slateBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 9,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    position: 'relative',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 2.5,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  left: { flex: 1, minWidth: 0, paddingLeft: spacing.xs + 1 },
  name: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    marginBottom: 2,
  },
  meta: { color: colors.secondary, fontSize: fontSize.xs },
  sparkline: { width: 50, height: 24 },
  delta: {
    color: colors.textSoft,
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
    minWidth: 48,
    textAlign: 'right',
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=ExerciseListRow`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/progress/ExerciseListRow.tsx src/components/progress/__tests__/ExerciseListRow.test.tsx
git commit -m "feat(progress): ExerciseListRow — accent stripe + sparkline + neutral delta"
```

---

## Task 14 — Component: `WeeklyTonnageBars`

**Files:**
- Create: `src/components/progress/WeeklyTonnageBars.tsx`
- Create: `src/components/progress/__tests__/WeeklyTonnageBars.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { WeeklyTonnageBars } from '../WeeklyTonnageBars';

describe('WeeklyTonnageBars', () => {
  it('renders 4 bars', () => {
    const { getAllByTestId } = render(
      <WeeklyTonnageBars values={[9500, 13200, 17400, 18450]} />,
    );
    expect(getAllByTestId(/^bar-/)).toHaveLength(4);
  });

  it('current week bar (last) uses mint accent', () => {
    const { getByTestId } = render(
      <WeeklyTonnageBars values={[9500, 13200, 17400, 18450]} />,
    );
    const cur = getByTestId('bar-3');
    const flat = Array.isArray(cur.props.style)
      ? Object.assign({}, ...cur.props.style)
      : cur.props.style;
    expect(flat.backgroundColor).toBe('#8DC28A');
  });

  it('historical bars use slate', () => {
    const { getByTestId } = render(
      <WeeklyTonnageBars values={[9500, 13200, 17400, 18450]} />,
    );
    const hist = getByTestId('bar-0');
    const flat = Array.isArray(hist.props.style)
      ? Object.assign({}, ...hist.props.style)
      : hist.props.style;
    expect(flat.backgroundColor).toBe('#5B7A95');
  });

  it('renders timeline labels 4w / 3w / 2w / this', () => {
    const { getByText } = render(
      <WeeklyTonnageBars values={[9500, 13200, 17400, 18450]} />,
    );
    expect(getByText('4w ago')).toBeTruthy();
    expect(getByText('this')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=WeeklyTonnageBars`
Expected: FAIL

- [ ] **Step 3: Implement component**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fontSize } from '../../theme/typography';

interface Props {
  values: [number, number, number, number]; // [4wk, 3wk, 2wk, this]
}

const formatVal = (v: number): string => {
  if (v >= 1000) { return `${(v / 1000).toFixed(1)}k`; }
  return `${Math.round(v)}`;
};

export const WeeklyTonnageBars: React.FC<Props> = ({ values }) => {
  const max = Math.max(...values, 1);
  const labels = ['4w ago', '3w', '2w', 'this'];
  return (
    <View>
      <View style={styles.barRow}>
        {values.map((v, i) => {
          const heightPct = (v / max) * 100;
          const isCur = i === values.length - 1;
          return (
            <View key={i} style={styles.barWrap}>
              <Text style={[styles.label, isCur && styles.labelCur]}>{formatVal(v)}</Text>
              <View
                testID={`bar-${i}`}
                style={[
                  styles.bar,
                  {
                    height: `${heightPct}%`,
                    backgroundColor: isCur ? colors.accent : colors.slate,
                    opacity: isCur ? 1 : 0.65,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.timeRow}>
        {labels.map(l => <Text key={l} style={styles.tick}>{l}</Text>)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  barRow: { flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 28, paddingHorizontal: 2 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 2, borderTopRightRadius: 2, minHeight: 3 },
  label: { fontSize: 8, color: colors.secondary, marginBottom: 1 },
  labelCur: { color: colors.accent },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  tick: { flex: 1, textAlign: 'center', fontSize: 8, color: colors.secondary },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=WeeklyTonnageBars`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/progress/WeeklyTonnageBars.tsx src/components/progress/__tests__/WeeklyTonnageBars.test.tsx
git commit -m "feat(progress): WeeklyTonnageBars — 4 bars, mint current, slate history, value labels"
```

---

## Task 15 — Component: `ProgramDayCard`

**Files:**
- Create: `src/components/progress/ProgramDayCard.tsx`
- Create: `src/components/progress/__tests__/ProgramDayCard.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProgramDayCard } from '../ProgramDayCard';
import { ProgramDayWeeklyTonnage } from '../../../types';

jest.mock('../WeeklyTonnageBars', () => {
  const { View } = require('react-native');
  return { WeeklyTonnageBars: () => <View testID="weekly-bars" /> };
});

const day: ProgramDayWeeklyTonnage = {
  programDayId: 10,
  dayName: 'Push Day',
  exerciseCount: 6,
  lastPerformedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  weeklyTonnageLb: [9500, 13200, 17400, 18450],
  currentWeekTonnageLb: 18450,
  deltaPercent2wk: 6,
};

describe('ProgramDayCard', () => {
  it('renders day name + tonnage value', () => {
    const { getByText } = render(<ProgramDayCard day={day} onPress={() => {}} />);
    expect(getByText('Push Day')).toBeTruthy();
    expect(getByText(/18,450/)).toBeTruthy();
  });

  it('renders delta text "vs prior 2wk"', () => {
    const { getByText } = render(<ProgramDayCard day={day} onPress={() => {}} />);
    expect(getByText(/▲ 6% vs prior 2wk/)).toBeTruthy();
  });

  it('renders em-dash when delta is null', () => {
    const { getByText } = render(
      <ProgramDayCard day={{ ...day, deltaPercent2wk: null }} onPress={() => {}} />,
    );
    expect(getByText(/—/)).toBeTruthy();
  });

  it('delta uses textSoft slate, never danger red', () => {
    const { getByTestId } = render(
      <ProgramDayCard day={{ ...day, deltaPercent2wk: -4 }} onPress={() => {}} />,
    );
    const delta = getByTestId('day-delta');
    const flat = Array.isArray(delta.props.style)
      ? Object.assign({}, ...delta.props.style)
      : delta.props.style;
    expect(flat.color).toBe('#BDC3CB');
  });

  it('calls onPress with programDayId', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<ProgramDayCard day={day} onPress={onPress} />);
    fireEvent.press(getByTestId('day-card'));
    expect(onPress).toHaveBeenCalledWith(10);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=ProgramDayCard`
Expected: FAIL

- [ ] **Step 3: Implement component**

```typescript
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { ProgramDayWeeklyTonnage } from '../../types';
import { WeeklyTonnageBars } from './WeeklyTonnageBars';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../../theme/typography';

interface Props {
  day: ProgramDayWeeklyTonnage;
  onPress: (programDayId: number) => void;
}

const formatDelta = (pct: number | null): string => {
  if (pct === null) { return '— vs prior 2wk'; }
  const r = Math.round(pct);
  if (r === 0) { return '— 0% vs prior 2wk'; }
  if (r > 0) { return `▲ ${r}% vs prior 2wk`; }
  return `▼ ${Math.abs(r)}% vs prior 2wk`;
};

const formatRelativeShort = (iso: string | null): string => {
  if (!iso) { return '—'; }
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days === 0) { return 'today'; }
  if (days === 1) { return 'yesterday'; }
  const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return weekdays[new Date(iso).getDay()];
};

export const ProgramDayCard: React.FC<Props> = ({ day, onPress }) => (
  <TouchableOpacity
    testID="day-card"
    style={styles.card}
    activeOpacity={0.7}
    onPress={() => onPress(day.programDayId)}>
    <View style={styles.header}>
      <View>
        <Text style={styles.name}>{day.dayName}</Text>
        <Text style={styles.sub}>
          Last: {formatRelativeShort(day.lastPerformedAt)} · {day.exerciseCount} exercises
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.tonnage}>
          {day.currentWeekTonnageLb.toLocaleString()}<Text style={styles.unit}> lb</Text>
        </Text>
        <Text testID="day-delta" style={styles.delta}>{formatDelta(day.deltaPercent2wk)}</Text>
      </View>
    </View>
    <View style={styles.barsBlock}>
      <Text style={styles.axisLabel}>Weekly · last 4wk</Text>
      <WeeklyTonnageBars values={day.weeklyTonnageLb} />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.slateBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm + 3,
    marginBottom: 7,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  name: { color: colors.primary, fontSize: fontSize.sm, fontWeight: weightBold },
  sub: { color: colors.secondary, fontSize: fontSize.xs, marginTop: 1 },
  tonnage: { color: colors.primary, fontSize: fontSize.md, fontWeight: weightBold },
  unit: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: '500' },
  delta: { color: colors.textSoft, fontSize: fontSize.xs, fontWeight: weightSemiBold, marginTop: 2 },
  barsBlock: { marginTop: spacing.sm, paddingTop: 7, borderTopWidth: 1, borderTopColor: colors.border },
  axisLabel: { color: colors.secondary, fontSize: 8, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=ProgramDayCard`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/progress/ProgramDayCard.tsx src/components/progress/__tests__/ProgramDayCard.test.tsx
git commit -m "feat(progress): ProgramDayCard — tonnage + neutral delta + WeeklyTonnageBars"
```

---

## Task 16 — Component: `SessionHistoryRow`

**Files:**
- Create: `src/components/progress/SessionHistoryRow.tsx`
- Create: `src/components/progress/__tests__/SessionHistoryRow.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SessionHistoryRow } from '../SessionHistoryRow';
import { ExerciseHistorySession } from '../../../types';

const session: ExerciseHistorySession = {
  sessionId: 100,
  date: '2026-04-22T00:00:00Z',
  sets: [
    { setNumber: 1, weightLbs: 175, reps: 5, isWarmup: false },
    { setNumber: 2, weightLbs: 175, reps: 5, isWarmup: false },
    { setNumber: 3, weightLbs: 195, reps: 3, isWarmup: false },
  ],
};

describe('SessionHistoryRow', () => {
  it('renders top set + total volume in collapsed state', () => {
    const { getByText } = render(
      <SessionHistoryRow session={session} isPR={true} onLongPress={() => {}} />,
    );
    // Top set: 195 × 3
    expect(getByText(/195 × 3/)).toBeTruthy();
    // Volume: 175*5 + 175*5 + 195*3 = 875 + 875 + 585 = 2335
    expect(getByText(/2,335/)).toBeTruthy();
  });

  it('does not render set list initially (collapsed)', () => {
    const { queryByTestId } = render(
      <SessionHistoryRow session={session} isPR={false} onLongPress={() => {}} />,
    );
    expect(queryByTestId('expanded-set-1')).toBeNull();
  });

  it('renders all sets after tap (expanded)', () => {
    const { getByTestId, queryByTestId } = render(
      <SessionHistoryRow session={session} isPR={false} onLongPress={() => {}} />,
    );
    fireEvent.press(getByTestId('history-row-100'));
    expect(queryByTestId('expanded-set-1')).toBeTruthy();
    expect(queryByTestId('expanded-set-2')).toBeTruthy();
    expect(queryByTestId('expanded-set-3')).toBeTruthy();
  });

  it('collapses when tapped again', () => {
    const { getByTestId, queryByTestId } = render(
      <SessionHistoryRow session={session} isPR={false} onLongPress={() => {}} />,
    );
    fireEvent.press(getByTestId('history-row-100'));
    fireEvent.press(getByTestId('history-row-100'));
    expect(queryByTestId('expanded-set-1')).toBeNull();
  });

  it('renders PR badge when isPR=true', () => {
    const { getByText } = render(
      <SessionHistoryRow session={session} isPR={true} onLongPress={() => {}} />,
    );
    expect(getByText('PR')).toBeTruthy();
  });

  it('calls onLongPress with sessionId on long press', () => {
    const onLongPress = jest.fn();
    const { getByTestId } = render(
      <SessionHistoryRow session={session} isPR={false} onLongPress={onLongPress} />,
    );
    fireEvent(getByTestId('history-row-100'), 'longPress');
    expect(onLongPress).toHaveBeenCalledWith(100);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=SessionHistoryRow`
Expected: FAIL

- [ ] **Step 3: Implement component**

```typescript
import React, { useState } from 'react';
import { TouchableOpacity, View, Text, LayoutAnimation, StyleSheet } from 'react-native';
import { ExerciseHistorySession } from '../../types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../../theme/typography';

interface Props {
  session: ExerciseHistorySession;
  isPR: boolean;
  onLongPress: (sessionId: number) => void;
}

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

export const SessionHistoryRow: React.FC<Props> = ({ session, isPR, onLongPress }) => {
  const [expanded, setExpanded] = useState(false);
  const working = session.sets.filter(s => !s.isWarmup);
  const topSet = working.reduce((max, s) => s.weightLbs > max.weightLbs ? s : max, working[0]);
  const totalVol = working.reduce((sum, s) => sum + s.weightLbs * s.reps, 0);
  const otherCount = working.length - 1;
  const otherWeight = working.find(s => s !== topSet)?.weightLbs;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(e => !e);
  };

  return (
    <TouchableOpacity
      testID={`history-row-${session.sessionId}`}
      style={styles.row}
      activeOpacity={0.7}
      onPress={toggle}
      onLongPress={() => onLongPress(session.sessionId)}>
      <View style={styles.headRow}>
        <Text style={styles.date}>{formatDate(session.date)}</Text>
        <View style={styles.summary}>
          <Text style={styles.summaryMain}>
            {topSet ? `${topSet.weightLbs} × ${topSet.reps}` : '—'}
          </Text>
          {otherCount > 0 && (
            <Text style={styles.summarySub}>
              +{otherCount} {otherCount === 1 ? 'set' : 'sets'}{otherWeight ? ` at ${otherWeight}` : ''}
            </Text>
          )}
        </View>
        {isPR && <Text style={styles.prBadge}>PR</Text>}
        <Text style={styles.vol}>{totalVol.toLocaleString()}</Text>
        <Text style={styles.chev}>{expanded ? '▾' : '›'}</Text>
      </View>
      {expanded && (
        <View style={styles.expanded}>
          {session.sets.map(s => (
            <Text key={s.setNumber} testID={`expanded-set-${s.setNumber}`} style={[styles.setLine, s.isWarmup && styles.setLineWarmup]}>
              Set {s.setNumber}: {s.weightLbs}lb × {s.reps}{s.isWarmup ? ' (warmup)' : ''}
            </Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.slateBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginBottom: 5,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  date: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: weightSemiBold, minWidth: 42 },
  summary: { flex: 1, minWidth: 0 },
  summaryMain: { color: colors.primary, fontSize: fontSize.sm, fontWeight: weightSemiBold },
  summarySub: { color: colors.secondary, fontSize: 9 },
  prBadge: {
    color: colors.prGold,
    fontSize: 9,
    fontWeight: weightBold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.goldGlow,
    borderRadius: 4,
  },
  vol: { color: colors.textSoft, fontSize: fontSize.xs },
  chev: { color: colors.secondary, fontSize: fontSize.md, marginLeft: 4 },
  expanded: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border },
  setLine: { color: colors.primary, fontSize: fontSize.xs, lineHeight: 18 },
  setLineWarmup: { color: colors.secondary },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=SessionHistoryRow`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/progress/SessionHistoryRow.tsx src/components/progress/__tests__/SessionHistoryRow.test.tsx
git commit -m "feat(progress): SessionHistoryRow — collapsed top set + tap-to-expand"
```

---

## Task 17 — Component: `StrengthVolumeChart`

**Files:**
- Create: `src/components/progress/StrengthVolumeChart.tsx`
- Create: `src/components/progress/__tests__/StrengthVolumeChart.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StrengthVolumeChart } from '../StrengthVolumeChart';
import { ChartPoint } from '../../../types';

const points: ChartPoint[] = [
  { sessionId: 1, date: '2026-01-15T00:00:00Z', bestWeightLb: 175, volumeLb: 1640, isPR: true },
  { sessionId: 2, date: '2026-02-01T00:00:00Z', bestWeightLb: 180, volumeLb: 1720, isPR: true },
  { sessionId: 3, date: '2026-02-20T00:00:00Z', bestWeightLb: 195, volumeLb: 2025, isPR: true },
];

describe('StrengthVolumeChart', () => {
  it('renders empty state when fewer than 2 points', () => {
    const { getByText } = render(
      <StrengthVolumeChart points={[points[0]]} onPointTap={() => {}} />,
    );
    expect(getByText(/Log 2\+ sessions/)).toBeTruthy();
  });

  it('renders bars and line when 2+ points', () => {
    const { getAllByTestId } = render(
      <StrengthVolumeChart points={points} onPointTap={() => {}} />,
    );
    expect(getAllByTestId(/^chart-bar-/)).toHaveLength(3);
    expect(getAllByTestId(/^chart-point-/)).toHaveLength(3);
  });

  it('calls onPointTap with full ChartPoint on tap', () => {
    const onPointTap = jest.fn();
    const { getByTestId } = render(
      <StrengthVolumeChart points={points} onPointTap={onPointTap} />,
    );
    fireEvent.press(getByTestId('chart-point-1'));
    expect(onPointTap).toHaveBeenCalledWith(points[1]);
  });

  it('renders y-axis tick labels in mint (left) and slate (right)', () => {
    const { getAllByTestId } = render(
      <StrengthVolumeChart points={points} onPointTap={() => {}} />,
    );
    const mintTicks = getAllByTestId(/^y-tick-mint-/);
    const slateTicks = getAllByTestId(/^y-tick-slate-/);
    expect(mintTicks.length).toBeGreaterThan(0);
    expect(slateTicks.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=StrengthVolumeChart`
Expected: FAIL

- [ ] **Step 3: Implement component**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, GestureResponderEvent } from 'react-native';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';
import { ChartPoint } from '../../types';
import { colors } from '../../theme/colors';
import { fontSize, weightBold, weightSemiBold } from '../../theme/typography';

interface Props {
  points: ChartPoint[];
  onPointTap: (p: ChartPoint) => void;
}

const VIEW_W = 220;
const VIEW_H = 130;
const PAD_TOP = 8;
const PAD_BOTTOM = 14;

const niceMin = (v: number) => v * 0.95;
const niceMax = (v: number) => v * 1.05;

export const StrengthVolumeChart: React.FC<Props> = ({ points, onPointTap }) => {
  if (points.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Log 2+ sessions to see your trend</Text>
      </View>
    );
  }

  const weights = points.map(p => p.bestWeightLb);
  const volumes = points.map(p => p.volumeLb);
  const wMin = niceMin(Math.min(...weights));
  const wMax = niceMax(Math.max(...weights));
  const vMin = niceMin(Math.min(...volumes));
  const vMax = niceMax(Math.max(...volumes));

  const xFor = (i: number) => (i / (points.length - 1)) * VIEW_W;
  const yWeight = (w: number) => {
    const usable = VIEW_H - PAD_TOP - PAD_BOTTOM;
    return PAD_TOP + (1 - (w - wMin) / (wMax - wMin)) * usable;
  };
  const yVolume = (v: number) => {
    const usable = VIEW_H - PAD_TOP - PAD_BOTTOM;
    return PAD_TOP + (1 - (v - vMin) / (vMax - vMin)) * usable;
  };

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yWeight(p.bestWeightLb)}`)
    .join(' ');

  const barWidth = VIEW_W / points.length * 0.6;

  const wTicks = [wMax, wMax - (wMax - wMin) * 0.33, wMax - (wMax - wMin) * 0.66, wMin];
  const vTicks = [vMax, vMax - (vMax - vMin) * 0.33, vMax - (vMax - vMin) * 0.66, vMin];

  return (
    <View style={styles.container}>
      <View style={styles.dualAxis}>
        <View style={styles.yAxis}>
          <Text style={[styles.axisHeader, { color: colors.accent }]}>━ lb</Text>
          {wTicks.map((t, i) => (
            <Text key={i} testID={`y-tick-mint-${i}`} style={styles.tickMint}>{Math.round(t)}</Text>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={{ width: '100%', height: VIEW_H }}>
            {/* Dashed grid lines */}
            <Line x1={0} y1={VIEW_H * 0.25} x2={VIEW_W} y2={VIEW_H * 0.25}
                  stroke="rgba(255,255,255,0.04)" strokeDasharray="2,3" />
            <Line x1={0} y1={VIEW_H * 0.5} x2={VIEW_W} y2={VIEW_H * 0.5}
                  stroke="rgba(255,255,255,0.04)" strokeDasharray="2,3" />
            <Line x1={0} y1={VIEW_H * 0.75} x2={VIEW_W} y2={VIEW_H * 0.75}
                  stroke="rgba(255,255,255,0.04)" strokeDasharray="2,3" />
            {/* Bars */}
            {points.map((p, i) => {
              const x = xFor(i) - barWidth / 2;
              const y = yVolume(p.volumeLb);
              const h = (VIEW_H - PAD_BOTTOM) - y;
              return (
                <Rect key={i} testID={`chart-bar-${i}`}
                      x={x} y={y} width={barWidth} height={h}
                      fill={colors.slate} fillOpacity={0.45} rx={1.5} />
              );
            })}
            {/* Line */}
            <Path d={linePath} stroke={colors.accent} strokeWidth={2.5} fill="none" />
            {/* Points */}
            {points.map((p, i) => (
              <Circle key={i} cx={xFor(i)} cy={yWeight(p.bestWeightLb)} r={3}
                      fill={p.isPR && i === points.length - 1 ? colors.prGold : colors.accent}
                      stroke={p.isPR && i === points.length - 1 ? colors.surfaceElevated : 'none'}
                      strokeWidth={p.isPR && i === points.length - 1 ? 1.5 : 0} />
            ))}
          </Svg>
          {/* Tap targets overlaid (since SVG taps inside react-native-svg are flaky) */}
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {points.map((p, i) => {
              const cx = xFor(i) / VIEW_W * 100;
              return (
                <TouchableOpacity
                  key={i}
                  testID={`chart-point-${i}`}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  style={{ position: 'absolute', left: `${cx}%`, top: '0%', width: 18, height: VIEW_H, marginLeft: -9 }}
                  onPress={() => onPointTap(p)}
                />
              );
            })}
          </View>
        </View>
        <View style={styles.yAxis}>
          <Text style={[styles.axisHeader, { color: colors.slate }]}>▮ k lb</Text>
          {vTicks.map((t, i) => (
            <Text key={i} testID={`y-tick-slate-${i}`} style={styles.tickSlate}>
              {Math.round(t / 1000)}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.slateBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 11,
  },
  dualAxis: { flexDirection: 'row', gap: 5 },
  yAxis: { width: 30, justifyContent: 'space-between', paddingVertical: 6 },
  axisHeader: { fontSize: 8, fontWeight: weightBold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 },
  tickMint: { color: colors.accent, fontSize: 9, fontWeight: weightSemiBold, textAlign: 'right' },
  tickSlate: { color: colors.slate, fontSize: 9, fontWeight: weightSemiBold, textAlign: 'left' },
  empty: {
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
  emptyText: { color: colors.secondary, fontSize: fontSize.sm },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=StrengthVolumeChart`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/progress/StrengthVolumeChart.tsx src/components/progress/__tests__/StrengthVolumeChart.test.tsx
git commit -m "feat(progress): StrengthVolumeChart — custom SVG dual-axis (mint line + slate bars + gold PR dot)"
```

---

## Task 18 — Component: `ChartInspectCallout`

**Files:**
- Create: `src/components/progress/ChartInspectCallout.tsx`
- Create: `src/components/progress/__tests__/ChartInspectCallout.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { ChartInspectCallout } from '../ChartInspectCallout';
import { ChartPoint } from '../../../types';

const point: ChartPoint = {
  sessionId: 5, date: '2026-04-22T00:00:00Z', bestWeightLb: 195, volumeLb: 18450, isPR: true,
};

describe('ChartInspectCallout', () => {
  it('renders point details', () => {
    const { getByText } = render(<ChartInspectCallout point={point} />);
    expect(getByText(/Apr 22/)).toBeTruthy();
    expect(getByText(/195 lb/)).toBeTruthy();
    expect(getByText(/18,450 vol/)).toBeTruthy();
  });

  it('shows PR badge when point.isPR=true', () => {
    const { getByText } = render(<ChartInspectCallout point={point} />);
    expect(getByText(/PR/)).toBeTruthy();
  });

  it('renders hint sub-line', () => {
    const { getByText } = render(<ChartInspectCallout point={point} />);
    expect(getByText(/Tap any point/i)).toBeTruthy();
  });

  it('renders empty fallback when point is null', () => {
    const { getByText } = render(<ChartInspectCallout point={null} />);
    expect(getByText(/No session selected/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=ChartInspectCallout`
Expected: FAIL

- [ ] **Step 3: Implement component**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChartPoint } from '../../types';
import { colors } from '../../theme/colors';
import { fontSize, weightSemiBold } from '../../theme/typography';

interface Props {
  point: ChartPoint | null;
}

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

export const ChartInspectCallout: React.FC<Props> = ({ point }) => {
  if (point === null) {
    return (
      <View style={styles.callout}>
        <Text style={styles.empty}>No session selected · tap a point</Text>
      </View>
    );
  }
  const parts = [
    formatDate(point.date),
    `${point.bestWeightLb} lb`,
    `${point.volumeLb.toLocaleString()} vol`,
  ];
  if (point.isPR) { parts.push('PR'); }
  return (
    <View style={styles.callout}>
      <Text style={styles.dot}>●</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.body}>{parts.join(' · ')}</Text>
        <Text style={styles.hint}>Tap any point on the chart for session details</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: colors.accentGlow,
    borderColor: 'rgba(141,194,138,0.20)',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
  },
  dot: { color: colors.prGold, fontSize: 14 },
  body: { color: colors.primary, fontSize: fontSize.xs, fontWeight: weightSemiBold },
  hint: { color: colors.secondary, fontSize: 9 },
  empty: { color: colors.secondary, fontSize: fontSize.xs },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=ChartInspectCallout`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/progress/ChartInspectCallout.tsx src/components/progress/__tests__/ChartInspectCallout.test.tsx
git commit -m "feat(progress): ChartInspectCallout — tapped point details w/ PR badge"
```

---

## Task 19 — Rewrite `ProgressHubScreen`

**Files:**
- Modify: `src/screens/ProgressHubScreen.tsx` (full rewrite)
- Modify: `src/screens/__tests__/ProgressHubScreen.test.tsx` (full rewrite)

- [ ] **Step 1: Read existing screen** to understand current structure (`src/screens/ProgressHubScreen.tsx` has the current Categories grid + Sessions tab — replace entirely).

- [ ] **Step 2: Write the new test suite (full rewrite)**

Replace `src/screens/__tests__/ProgressHubScreen.test.tsx` contents:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ProgressHubScreen } from '../ProgressHubScreen';

jest.mock('../../db/progress', () => ({
  getAllExercisesWithProgress: jest.fn(async () => [
    { exerciseId: 1, exerciseName: 'Bench Press', category: 'chest', measurementType: 'reps',
      lastTrainedAt: new Date().toISOString(), sessionCount: 12, sparklinePoints: [180,185,195], deltaPercent14d: 7 },
    { exerciseId: 2, exerciseName: 'Squat', category: 'legs', measurementType: 'reps',
      lastTrainedAt: new Date().toISOString(), sessionCount: 8, sparklinePoints: [240,250,275], deltaPercent14d: 4 },
  ]),
  getTopMovers: jest.fn(async () => []),
  getProgramDayWeeklyTonnage: jest.fn(async () => []),
  getPRWatch: jest.fn(async () => null),
  getStaleExercise: jest.fn(async () => null),
}));
jest.mock('../../db/programs', () => ({
  getProgramsWithSessionData: jest.fn(async () => []),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
    useFocusEffect: (cb: () => void | (() => void)) => { React.useEffect(() => cb(), []); },
  };
});

beforeEach(() => { mockNavigate.mockClear(); });

const renderScreen = () => render(
  <NavigationContainer>
    <ProgressHubScreen />
  </NavigationContainer>,
);

describe('ProgressHubScreen', () => {
  it('renders Exercises tab as initial state', async () => {
    const { findByTestId } = renderScreen();
    expect(await findByTestId('seg-tab-exercises')).toBeTruthy();
  });

  it('switches to Program Days tab', async () => {
    const { findByTestId } = renderScreen();
    fireEvent.press(await findByTestId('seg-tab-programDays'));
    expect(await findByTestId('seg-tab-programDays')).toBeTruthy();
  });

  it('navigates to ExerciseDetail on row tap', async () => {
    const { findAllByTestId } = renderScreen();
    const rows = await findAllByTestId('exercise-row');
    fireEvent.press(rows[0]);
    expect(mockNavigate).toHaveBeenCalledWith('ExerciseDetail', expect.objectContaining({ exerciseId: 1 }));
  });

  it('hides insight strip when both PR Watch and Stale return null', async () => {
    const { queryByTestId, findByTestId } = renderScreen();
    await findByTestId('seg-tab-exercises'); // wait for mount
    await waitFor(() => {
      expect(queryByTestId('insight-strip')).toBeNull();
    });
  });

  it('filters list by category chip', async () => {
    const { getAllExercisesWithProgress } = require('../../db/progress');
    const { findByTestId } = renderScreen();
    fireEvent.press(await findByTestId('chip-chest'));
    await waitFor(() => {
      expect(getAllExercisesWithProgress).toHaveBeenCalledWith('chest', '', 'recent');
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=ProgressHubScreen`
Expected: FAIL — current implementation has Categories tab, doesn't match new tests.

- [ ] **Step 4: Rewrite `src/screens/ProgressHubScreen.tsx`**

Replace the file's contents with:

```typescript
import React, { useState, useCallback } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getAllExercisesWithProgress,
  getTopMovers,
  getProgramDayWeeklyTonnage,
  getPRWatch,
  getStaleExercise,
} from '../db/progress';
import { getProgramsWithSessionData } from '../db/programs';
import {
  ExerciseListItem,
  ProgramDayWeeklyTonnage,
  PRWatchCandidate,
  StaleExerciseCandidate,
  ProgramSelectorItem,
} from '../types';
import { DashboardStackParamList } from '../navigation/TabNavigator';
import { InsightStrip } from '../components/progress/InsightStrip';
import {
  ProgressSegmentedControl,
  ProgressTab,
} from '../components/progress/ProgressSegmentedControl';
import { CategoryChipRow, ChipFilter } from '../components/progress/CategoryChipRow';
import { ExerciseListRow } from '../components/progress/ExerciseListRow';
import { ProgramDayCard } from '../components/progress/ProgramDayCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';

type Nav = NativeStackNavigationProp<DashboardStackParamList, 'ProgressHub'>;

export function ProgressHubScreen() {
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState<ProgressTab>('exercises');
  const [chipFilter, setChipFilter] = useState<ChipFilter>('all');
  const [search, setSearch] = useState('');

  const [exercises, setExercises] = useState<ExerciseListItem[]>([]);
  const [topMovers, setTopMovers] = useState<ExerciseListItem[]>([]);
  const [days, setDays] = useState<ProgramDayWeeklyTonnage[]>([]);
  const [programs, setPrograms] = useState<ProgramSelectorItem[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [prCandidate, setPRCandidate] = useState<PRWatchCandidate | null>(null);
  const [staleCandidate, setStaleCandidate] = useState<StaleExerciseCandidate | null>(null);

  // Insight strip — runs once on mount
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pr, stale, progs] = await Promise.all([
          getPRWatch(),
          getStaleExercise(),
          getProgramsWithSessionData(),
        ]);
        if (cancelled) { return; }
        setPRCandidate(pr);
        setStaleCandidate(stale);
        setPrograms(progs);
        if (progs.length > 0 && selectedProgramId === null) {
          setSelectedProgramId(progs[0].id);
        }
      } catch (err) { console.warn('ProgressHub insight fetch failed:', err); }
    })();
    return () => { cancelled = true; };
  }, []));

  // Exercises feed — refetches when filter / search changes
  useFocusEffect(useCallback(() => {
    if (activeTab !== 'exercises') { return; }
    let cancelled = false;
    (async () => {
      try {
        const filter = chipFilter === 'all' ? 'all' : chipFilter;
        const [list, movers] = await Promise.all([
          getAllExercisesWithProgress(filter, search, 'recent'),
          search === '' ? getTopMovers() : Promise.resolve([]),
        ]);
        if (cancelled) { return; }
        setExercises(list);
        setTopMovers(movers);
      } catch (err) { console.warn('ProgressHub exercises fetch failed:', err); }
    })();
    return () => { cancelled = true; };
  }, [activeTab, chipFilter, search]));

  // Program days feed
  useFocusEffect(useCallback(() => {
    if (activeTab !== 'programDays' || selectedProgramId === null) { return; }
    let cancelled = false;
    (async () => {
      try {
        const data = await getProgramDayWeeklyTonnage(selectedProgramId);
        if (!cancelled) { setDays(data); }
      } catch (err) { console.warn('ProgressHub days fetch failed:', err); }
    })();
    return () => { cancelled = true; };
  }, [activeTab, selectedProgramId]));

  const goToExercise = (exerciseId: number) => {
    const ex = exercises.find(e => e.exerciseId === exerciseId)
      ?? topMovers.find(e => e.exerciseId === exerciseId)
      ?? null;
    if (ex) {
      navigation.navigate('ExerciseDetail', {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        measurementType: ex.measurementType,
        category: ex.category,
      });
    } else {
      // fallback for tile-driven nav (PR Watch / Stale) — minimal params
      navigation.navigate('ExerciseDetail', { exerciseId, exerciseName: '' });
    }
  };

  const goToProgramDay = (programDayId: number) => {
    const day = days.find(d => d.programDayId === programDayId);
    if (day) {
      navigation.navigate('SessionDayProgress', { programDayId, dayName: day.dayName });
    }
  };

  const isSearch = search.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress</Text>
        <Text style={styles.headerMeta}>
          {activeTab === 'exercises' ? `${exercises.length} lifts` : `${days.length} days`}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <InsightStrip
          prCandidate={prCandidate}
          staleCandidate={staleCandidate}
          onTilePress={goToExercise}
        />

        <ProgressSegmentedControl active={activeTab} onChange={setActiveTab} />

        {activeTab === 'exercises' ? (
          <>
            <TextInput
              style={styles.search}
              placeholder="Search exercises…"
              placeholderTextColor={colors.secondary}
              value={search}
              onChangeText={setSearch}
            />
            <CategoryChipRow active={chipFilter} onChange={setChipFilter} />

            {!isSearch && topMovers.length > 0 && (
              <>
                <Text style={styles.sectionH}>Top Movers · 14d</Text>
                {topMovers.map(item => (
                  <ExerciseListRow key={`mv-${item.exerciseId}`} item={item} onPress={goToExercise} />
                ))}
              </>
            )}

            <Text style={styles.sectionH}>{isSearch ? 'Results' : 'All Exercises'}</Text>
            {exercises.length === 0 ? (
              <Text style={styles.empty}>
                {isSearch ? `No exercises match '${search}'.`
                  : chipFilter === 'all' ? 'Log your first workout to see exercises here.'
                  : `No ${chipFilter} exercises tracked yet.`}
              </Text>
            ) : (
              exercises.map(item => (
                <ExerciseListRow key={item.exerciseId} item={item} onPress={goToExercise} />
              ))
            )}
          </>
        ) : (
          <>
            {programs.length === 0 ? (
              <Text style={styles.empty}>Create a program to track day trends.</Text>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.progChipRow}>
                  {programs.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      testID={`prog-chip-${p.id}`}
                      style={[styles.progChip, selectedProgramId === p.id && styles.progChipActive]}
                      activeOpacity={0.7}
                      onPress={() => setSelectedProgramId(p.id)}>
                      <Text style={[styles.progChipText, selectedProgramId === p.id && styles.progChipTextActive]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.sectionH}>Last 4 weeks · weekly tonnage</Text>
                {days.length === 0 ? (
                  <Text style={styles.empty}>Complete a program workout to see day trends.</Text>
                ) : (
                  days.map(d => <ProgramDayCard key={d.programDayId} day={d} onPress={goToProgramDay} />)
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  backButton: { marginRight: spacing.md, padding: spacing.xs, minWidth: 44, minHeight: 44, justifyContent: 'center' },
  backArrow: { color: colors.primary, fontSize: fontSize.xl },
  headerTitle: { color: colors.primary, fontSize: fontSize.lg, fontWeight: weightBold, flex: 1 },
  headerMeta: { color: colors.secondary, fontSize: fontSize.xs },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.base, paddingBottom: spacing.xxxl },
  search: {
    backgroundColor: colors.surface,
    borderColor: colors.border, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 11, paddingVertical: 8,
    color: colors.primary, fontSize: fontSize.sm,
    marginBottom: 8,
  },
  sectionH: {
    color: colors.secondary, fontSize: 9, fontWeight: weightBold,
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginTop: 10, marginBottom: 6,
  },
  empty: { color: colors.secondary, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.xl },
  progChipRow: { gap: 5, marginBottom: 8 },
  progChip: {
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  progChipActive: { backgroundColor: colors.accent, borderWidth: 0 },
  progChipText: { color: colors.secondary, fontSize: fontSize.xs },
  progChipTextActive: { color: colors.onAccent, fontWeight: weightBold },
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=ProgressHubScreen`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/screens/ProgressHubScreen.tsx src/screens/__tests__/ProgressHubScreen.test.tsx
git commit -m "feat(progress): rewrite ProgressHubScreen — exercise-first feed + program-day cards"
```

---

## Task 20 — Rewrite `ExerciseDetailScreen`

**Files:**
- Modify: `src/screens/ExerciseDetailScreen.tsx`
- Modify: `src/screens/__tests__/ExerciseDetailScreen.test.tsx`

- [ ] **Step 1: Read existing screen** to preserve hero stats / time range pills (which work) and identify the chart + history sections to replace.

- [ ] **Step 2: Update test file** — replace contents:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ExerciseDetailScreen } from '../ExerciseDetailScreen';

jest.mock('../../db/progress', () => ({
  getExerciseChartData: jest.fn(async () => [
    { sessionId: 1, date: '2026-04-19T00:00:00Z', bestWeightLb: 185, volumeLb: 1850, isPR: true },
    { sessionId: 2, date: '2026-04-22T00:00:00Z', bestWeightLb: 195, volumeLb: 2025, isPR: true },
  ]),
}));
jest.mock('../../db/dashboard', () => ({
  getExerciseHistory: jest.fn(async () => [
    { sessionId: 2, date: '2026-04-22T00:00:00Z', sets: [
      { setNumber: 1, weightLbs: 175, reps: 5, isWarmup: false },
      { setNumber: 2, weightLbs: 195, reps: 3, isWarmup: false },
    ]},
  ]),
  deleteExerciseHistorySession: jest.fn(),
}));

const mockNavigate = jest.fn();
const useRouteMock = jest.fn(() => ({ params: {
  exerciseId: 1, exerciseName: 'Bench Press', measurementType: 'reps', category: 'chest',
}}));
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
    useRoute: () => useRouteMock(),
    useFocusEffect: (cb: () => void | (() => void)) => { React.useEffect(() => cb(), []); },
  };
});

const renderScreen = () => render(
  <NavigationContainer><ExerciseDetailScreen /></NavigationContainer>,
);

describe('ExerciseDetailScreen', () => {
  it('renders dual-axis chart', async () => {
    const { findAllByTestId } = renderScreen();
    expect((await findAllByTestId(/^chart-bar-/)).length).toBeGreaterThan(0);
  });

  it('renders hero stats Best / Vol 30d / PRs 90d', async () => {
    const { findByText } = renderScreen();
    expect(await findByText(/Best/i)).toBeTruthy();
    expect(await findByText(/PRs/i)).toBeTruthy();
  });

  it('refetches chart on time-range pill press', async () => {
    const { getExerciseChartData } = require('../../db/progress');
    const { findByTestId } = renderScreen();
    fireEvent.press(await findByTestId('range-pill-1M'));
    await waitFor(() => {
      expect(getExerciseChartData).toHaveBeenCalledWith(1, '1M');
    });
  });

  it('expands history row on press', async () => {
    const { findByTestId, queryByTestId } = renderScreen();
    fireEvent.press(await findByTestId('history-row-2'));
    expect(queryByTestId('expanded-set-1')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=ExerciseDetailScreen`
Expected: FAIL

- [ ] **Step 4: Modify `src/screens/ExerciseDetailScreen.tsx`** — keep the hero stats + range pills + header structure; replace the chart + history sections.

The full rewritten file should:

1. Remove `LineChart` import from `react-native-chart-kit`.
2. Remove `SessionTimelineRow` import.
3. Add `StrengthVolumeChart`, `ChartInspectCallout`, `SessionHistoryRow` imports.
4. Add `getExerciseChartData` import from `../db/progress`.
5. Replace `progressData` state with `chartPoints: ChartPoint[]`.
6. Replace `chartData` `useMemo` block with direct prop pass to `StrengthVolumeChart`.
7. Add state `inspectedPoint: ChartPoint | null` (defaults to last point).
8. Render `<StrengthVolumeChart points={chartPoints} onPointTap={setInspectedPoint} />`.
9. Render `<ChartInspectCallout point={inspectedPoint ?? chartPoints[chartPoints.length - 1] ?? null} />`.
10. Replace history list rendering with `SessionHistoryRow` instead of expanded `historyCard` view.
11. Add `testID` `range-pill-${range}` to each time-range pill button.
12. Wire long-press of `SessionHistoryRow` to `Alert` with "View Full Workout" → `SessionBreakdown` and "Delete" → `confirmDeleteHistory`.
13. Drop the `weightChangePercent` insight text (the chart conveys it).

Patch outline (apply to existing file):

```diff
- import { LineChart } from 'react-native-chart-kit';
- import { SessionTimelineRow } from '../components/SessionTimelineRow';
- import { getExerciseProgressData, getExerciseVolumeData, getExerciseHistory } from '../db/dashboard';
- import { getExerciseInsights } from '../db/progress';
+ import { getExerciseChartData } from '../db/progress';
+ import { getExerciseHistory, deleteExerciseHistorySession } from '../db/dashboard';
+ import { StrengthVolumeChart } from '../components/progress/StrengthVolumeChart';
+ import { ChartInspectCallout } from '../components/progress/ChartInspectCallout';
+ import { SessionHistoryRow } from '../components/progress/SessionHistoryRow';
+ import { ChartPoint } from '../types';
```

State changes:

```diff
- const [progressData, setProgressData] = useState<ExerciseProgressPoint[]>([]);
- const [insights, setInsights] = useState<ExerciseInsights>({...});
+ const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
+ const [inspectedPoint, setInspectedPoint] = useState<ChartPoint | null>(null);
- const [viewMode, setViewMode] = useState<'strength' | 'volume'>('strength');  // remove
```

`useFocusEffect` body:

```typescript
useFocusEffect(useCallback(() => {
  let cancelled = false;
  (async () => {
    try {
      const [chart, history] = await Promise.all([
        getExerciseChartData(exerciseId, timeRange),
        getExerciseHistory(exerciseId),
      ]);
      if (!cancelled) {
        setChartPoints(chart);
        setHistoryData(history);
        setInspectedPoint(chart[chart.length - 1] ?? null);
      }
    } catch (err) { console.warn('ExerciseDetail fetch failed:', err); }
  })();
  return () => { cancelled = true; };
}, [exerciseId, timeRange]));
```

Chart + callout JSX (replace existing chart container):

```jsx
<StrengthVolumeChart points={chartPoints} onPointTap={setInspectedPoint} />
<ChartInspectCallout point={inspectedPoint} />
```

History row mapping (replace existing `filteredHistory.map(...)`):

```typescript
const handleLongPress = useCallback((sessionId: number) => {
  const session = historyData.find(s => s.sessionId === sessionId);
  if (!session) { return; }
  Alert.alert(
    formatDateReadable(session.date),
    undefined,
    [
      { text: 'View Full Workout', onPress: () => navigation.navigate('SessionBreakdown', {
        sessionId, exerciseId, exerciseName, sessionDate: session.date,
      })},
      { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteHistory(sessionId) },
      { text: 'Cancel', style: 'cancel' },
    ],
  );
}, [historyData, exerciseId, exerciseName, navigation, confirmDeleteHistory]);

// in JSX:
{historyData.length === 0 ? (
  <Text style={styles.emptyText}>No sessions in this period.</Text>
) : (
  historyData.map((session) => {
    const isPR = chartPoints.find(p => p.sessionId === session.sessionId)?.isPR ?? false;
    return (
      <SessionHistoryRow
        key={session.sessionId}
        session={session}
        isPR={isPR}
        onLongPress={handleLongPress}
      />
    );
  })
)}
```

Time range pills — add `testID="range-pill-{range}"` to each button.

Drop `viewMode` toggle entirely (chart shows both metrics).

- [ ] **Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (or at most callsite errors for `CategoryProgress` / `ExerciseProgress` routes — those will be cleaned in Task 22).

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=ExerciseDetailScreen`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/screens/ExerciseDetailScreen.tsx src/screens/__tests__/ExerciseDetailScreen.test.tsx
git commit -m "feat(progress): rewrite ExerciseDetailScreen w/ dual-axis chart + collapsed history"
```

---

## Task 21 — Restyle `SessionDayProgressScreen` (color fix + tap-to-navigate)

**Files:**
- Modify: `src/screens/SessionDayProgressScreen.tsx`
- Modify: `src/screens/__tests__/SessionDayProgressScreen.test.tsx`

- [ ] **Step 1: Update test** to assert neutral slate deltas + tap-to-navigate

Replace `src/screens/__tests__/SessionDayProgressScreen.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SessionDayProgressScreen } from '../SessionDayProgressScreen';
import { colors } from '../../theme/colors';

jest.mock('../../db/progress', () => ({
  getSessionDayExerciseProgress: jest.fn(async () => [
    { exerciseId: 1, exerciseName: 'Bench Press', volumeChangePercent: 4, strengthChangePercent: 5,
      measurementType: 'reps', category: 'chest' },
    { exerciseId: 2, exerciseName: 'OHP', volumeChangePercent: -5, strengthChangePercent: 0,
      measurementType: 'reps', category: 'shoulders' },
  ]),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
    useRoute: () => ({ params: { programDayId: 10, dayName: 'Push Day' } }),
    useFocusEffect: (cb: () => void | (() => void)) => { React.useEffect(() => cb(), []); },
  };
});

beforeEach(() => mockNavigate.mockClear());

const renderScreen = () => render(
  <NavigationContainer><SessionDayProgressScreen /></NavigationContainer>,
);

describe('SessionDayProgressScreen', () => {
  it('renders all exercises with vol and str deltas', async () => {
    const { findByText, getByText } = renderScreen();
    expect(await findByText('Bench Press')).toBeTruthy();
    expect(getByText('OHP')).toBeTruthy();
  });

  it('negative deltas use textSoft slate, NEVER danger red', async () => {
    const { findAllByTestId } = renderScreen();
    const negativeBadges = await findAllByTestId('delta-negative');
    negativeBadges.forEach(badge => {
      const flat = Array.isArray(badge.props.style)
        ? Object.assign({}, ...badge.props.style)
        : badge.props.style;
      expect(flat.color).toBe(colors.textSoft);
      expect(flat.color).not.toBe(colors.danger);
    });
  });

  it('navigates to ExerciseDetail on row tap', async () => {
    const { findAllByTestId } = renderScreen();
    const rows = await findAllByTestId('sd-exercise-row');
    fireEvent.press(rows[0]);
    expect(mockNavigate).toHaveBeenCalledWith('ExerciseDetail', expect.objectContaining({ exerciseId: 1 }));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=SessionDayProgressScreen`
Expected: FAIL — current implementation uses `colors.danger` for negative.

- [ ] **Step 3: Modify `src/screens/SessionDayProgressScreen.tsx`**

Apply these edits:

```diff
function formatDelta(value: number | null): { text: string; color: string } {
  if (value === null) {
    return { text: '—', color: colors.secondary };
  }
  const rounded = Math.round(value);
  if (rounded >= 0) {
-     return { text: `+${rounded}%`, color: colors.accent };
+     return { text: `▲ ${rounded}%`, color: colors.textSoft };
  }
- return { text: `−${Math.abs(rounded)}%`, color: colors.danger };
+ return { text: `▼ ${Math.abs(rounded)}%`, color: colors.textSoft };
}
```

Wrap `ExerciseRow` body in a `TouchableOpacity` so it navigates:

```typescript
function ExerciseRow({ exercise, onPress }: { exercise: SessionDayExerciseProgress; onPress: () => void }) {
  const vol = formatDelta(exercise.volumeChangePercent);
  const str = formatDelta(exercise.strengthChangePercent);

  return (
    <TouchableOpacity testID="sd-exercise-row" style={styles.exerciseRow} activeOpacity={0.7} onPress={onPress}>
      <Text style={styles.exerciseName} numberOfLines={1}>{exercise.exerciseName}</Text>
      <View style={styles.deltaRow}>
        <View style={styles.deltaItem}>
          <Text style={styles.deltaLabel}>Vol</Text>
          <View style={[styles.deltaBadge, { backgroundColor: 'rgba(91,122,149,0.10)' }]}>
            <Text testID={(exercise.volumeChangePercent ?? 0) < 0 ? 'delta-negative' : 'delta'}
                  style={[styles.deltaValue, { color: vol.color }]}>{vol.text}</Text>
          </View>
        </View>
        <View style={styles.deltaItem}>
          <Text style={styles.deltaLabel}>Str</Text>
          <View style={[styles.deltaBadge, { backgroundColor: 'rgba(91,122,149,0.10)' }]}>
            <Text testID={(exercise.strengthChangePercent ?? 0) < 0 ? 'delta-negative' : 'delta'}
                  style={[styles.deltaValue, { color: str.color }]}>{str.text}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
```

Wire navigation in the screen body:

```typescript
exercises.map(exercise => (
  <ExerciseRow key={exercise.exerciseId} exercise={exercise} onPress={() =>
    navigation.navigate('ExerciseDetail', {
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      measurementType: exercise.measurementType,
      category: exercise.category,
    })
  } />
))
```

The `SessionDayExerciseProgress` type may not currently include `category`/`measurementType` — if that's the case, also extend the type and the corresponding DB function (`getSessionDayExerciseProgress`) to include them. Verify by reading `src/types/index.ts` and `src/db/progress.ts` for the current shape.

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=SessionDayProgressScreen`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/screens/SessionDayProgressScreen.tsx src/screens/__tests__/SessionDayProgressScreen.test.tsx
git commit -m "fix(progress): SessionDayProgressScreen — neutral slate deltas + tap-to-detail nav"
```

---

## Task 22 — Navigation cleanup, deletions, type-checker green

**Files:**
- Modify: `src/navigation/TabNavigator.tsx`
- Delete: `src/screens/CategoryProgressScreen.tsx` + test
- Delete: `src/screens/ExerciseProgressScreen.tsx` + test
- Delete: `src/components/CategorySummaryCard.tsx` + test
- Delete: `src/components/SessionTimelineRow.tsx` + test
- Delete obsolete DB functions in `src/db/progress.ts`

- [ ] **Step 1: Find all callsites of routes/screens to be removed**

Run:

```bash
grep -rn "CategoryProgress\b\|ExerciseProgress\b" /c/Users/eolson/WorkPC-Development/src --include="*.tsx" --include="*.ts" | grep -v "__tests__\|\.snap\|ExerciseProgressPoint"
```

Save the list — every match needs to either be deleted or rewritten to use `ProgressHub` / `ExerciseDetail`.

- [ ] **Step 2: Modify `src/navigation/TabNavigator.tsx`**

```diff
- import { ExerciseProgressScreen } from '../screens/ExerciseProgressScreen';
- import { CategoryProgressScreen } from '../screens/CategoryProgressScreen';

- export type WorkoutStackParamList = {
-   WorkoutHome: undefined;
-   ExerciseProgress: { exerciseId: number; exerciseName: string; ... };
-   ExerciseDetail: ...;
-   SessionBreakdown: ...;
- };
+ export type WorkoutStackParamList = {
+   WorkoutHome: undefined;
+   ExerciseDetail: { exerciseId: number; exerciseName: string; measurementType?: 'reps' | 'timed' | 'height_reps'; category?: string };
+   SessionBreakdown: { sessionId: number; exerciseId: number; exerciseName: string; sessionDate: string };
+ };

- export type DashboardStackParamList = {
-   ...
-   ExerciseProgress: { ... };
-   CategoryProgress: { category: string; viewMode?: 'strength' | 'volume' };
-   ...
- };
+ export type DashboardStackParamList = {
+   DashboardHome: undefined;
+   Settings: undefined;
+   Achievements: undefined;
+   ProgressHub: undefined;
+   ExerciseDetail: { exerciseId: number; exerciseName: string; measurementType?: 'reps' | 'timed' | 'height_reps'; category?: string };
+   SessionBreakdown: { sessionId: number; exerciseId: number; exerciseName: string; sessionDate: string };
+   SessionDayProgress: { programDayId: number; dayName: string };
+ };
```

In `WorkoutStackNavigator`:

```diff
-     <WorkoutStack.Screen name="ExerciseProgress" component={ExerciseProgressScreen} />
```

In `DashboardStackNavigator`:

```diff
-     <DashboardStack.Screen name="ExerciseProgress" component={ExerciseProgressScreen} />
-     <DashboardStack.Screen name="CategoryProgress" component={CategoryProgressScreen} />
```

- [ ] **Step 3: Fix all remaining `ExerciseProgress` / `CategoryProgress` callsites**

Run the grep from Step 1 again and convert each `navigate('ExerciseProgress', ...)` to `navigate('ExerciseDetail', ...)`. Convert any `navigate('CategoryProgress', { category })` to `navigate('ProgressHub')` (the chip filter is in-screen state, not a route param — caller cannot pre-filter).

- [ ] **Step 4: Delete dead screen files**

```bash
git rm src/screens/CategoryProgressScreen.tsx
git rm src/screens/__tests__/CategoryProgressScreen.test.tsx
git rm src/screens/ExerciseProgressScreen.tsx
git rm src/screens/__tests__/ExerciseProgressScreen.test.tsx
git rm src/components/CategorySummaryCard.tsx
git rm src/components/__tests__/CategorySummaryCard.test.tsx
git rm src/components/SessionTimelineRow.tsx
git rm src/components/__tests__/SessionTimelineRow.test.tsx
```

- [ ] **Step 5: Delete obsolete DB functions**

Edit `src/db/progress.ts`: remove `getMuscleGroupProgress`, `getCategoryExerciseProgress`, `getCategoryExerciseVolumeProgress`, `getExerciseInsights`. Remove their tests from `src/db/__tests__/progress.test.ts`.

Verify nothing else references them:

```bash
grep -rn "getMuscleGroupProgress\|getCategoryExerciseProgress\|getCategoryExerciseVolumeProgress\|getExerciseInsights" /c/Users/eolson/WorkPC-Development/src --include="*.tsx" --include="*.ts"
```

Expected output: empty (zero matches).

- [ ] **Step 6: Run full type check**

Run: `npx tsc --noEmit`
Expected: PASS — zero errors. If any remain, they're stragglers from Step 3; fix until green.

- [ ] **Step 7: Run full test suite**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(progress): delete CategoryProgressScreen + ExerciseProgressScreen + obsolete DB fns

- Remove CategoryProgress and ExerciseProgress routes from DashboardStackParamList + WorkoutStackParamList
- Delete CategoryProgressScreen, ExerciseProgressScreen, CategorySummaryCard, SessionTimelineRow + tests
- Delete getMuscleGroupProgress, getCategoryExerciseProgress, getCategoryExerciseVolumeProgress, getExerciseInsights
- Redirect any in-codebase navigation callers to ExerciseDetail / ProgressHub"
```

---

## Task 23 — On-device smoke test pass

**Files:** None modified. Manual verification only.

- [ ] **Step 1: Build and deploy to emulator**

Use the `/deploy` skill or run:

```bash
cd /c/Users/eolson/WorkPC-Development && npm run android
```

Expected: app launches on connected emulator.

- [ ] **Step 2: Run smoke test checklist**

For each step, verify the expected outcome — note any deviation:

1. Open app → tap Volume card on Dashboard.
   - Expected: navigates to `ProgressHub`.
2. Hub Exercises tab loads.
   - Expected: search input visible, chip row visible, exercise rows render with sparklines.
3. Insight strip visible (or honestly hidden if PR Watch + Stale both null).
   - Expected: tile-or-hidden based on data; never empty placeholder.
4. Tap a category chip → list filters.
   - Expected: only matching-category exercises shown.
5. Tap a row → Exercise Detail loads.
   - Expected: hero stats (Best/Vol30d/PRs90d) + dual-axis chart + collapsed history rows.
6. Tap a chart point → Inspect Callout updates with that session's date / weight / volume.
   - Expected: callout reflects tapped point; PR badge visible if applicable.
7. Tap a history row → expands inline, chevron rotates › → ▾.
   - Expected: full set list reveals; tap again collapses.
8. Long-press a history row → menu appears with "View Full Workout" + "Delete" + "Cancel".
   - Expected: tapping View Full Workout navigates to SessionBreakdown.
9. Back to Hub. Switch to Program Days tab.
   - Expected: program selector chip row + day cards with weekly bars + delta in slate.
10. Tap a Program Day → SessionDayProgress loads.
    - Expected: per-exercise vol/str deltas. **All deltas in slate, never red.** Tap a row → ExerciseDetail loads.

- [ ] **Step 3: Note any deviations and fix**

Any failed step should generate a follow-up commit with the targeted fix. If all 10 pass, proceed.

- [ ] **Step 4: Final commit**

If anything was tweaked during smoke test:

```bash
git add -A
git commit -m "fix(progress): smoke test follow-ups — <describe>"
```

If nothing changed, no commit needed.

---

## Self-Review Notes

**Spec coverage check:**
- ✅ All 6 new DB functions implemented (Tasks 2-7)
- ✅ All 11 new components implemented (Tasks 8-18)
- ✅ All 3 modified screens addressed (Tasks 19-21)
- ✅ Navigation cleanup (Task 22)
- ✅ Anti-AI-slop fix in SessionDayProgressScreen (Task 21)
- ✅ react-native-chart-kit removed from ExerciseDetailScreen (Task 20)
- ✅ Smoke test (Task 23)

**Algorithm constants** all named and defaulted per spec:
`PR_WATCH_MAX_LB=10`, `PR_WATCH_INCREMENT_LB=5`, `STALE_MIN_DAYS=14`, `STALE_MAX_DAYS=90`, `TOP_MOVERS_WINDOW_DAYS=14`, `TOP_MOVERS_LIMIT=3`, `SPARKLINE_MAX_POINTS=8`.

**Type consistency check:**
- `ExerciseListItem` used by Tasks 2, 3, 13, 19 — same fields throughout.
- `ProgramDayWeeklyTonnage` used by Tasks 4, 15, 19 — same shape.
- `ChartPoint` used by Tasks 7, 17, 18, 20 — same fields.
- `PRWatchCandidate` / `StaleExerciseCandidate` used by Tasks 5, 6, 8, 9, 10, 19 — consistent.

**Risks called out in spec, addressed in plan:**
- Dual-axis scaling pitfall → `niceMin/niceMax` with 5% padding in Task 17.
- Stale archived programs → SQL filter `COALESCE(p.is_archived, 0) = 0` in Task 6.
- Type errors from route deletion → Task 22 Step 6 verifies green.
- `react-native-chart-kit` orphan → not removed from `package.json` per spec; cleanup in separate commit.

**No placeholders.** All steps include exact code, exact paths, exact commands.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-25-progress-screen-redesign.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration on a 23-task plan with ~115 test assertions. Best for a multi-component plan where context per task fits comfortably and reviews surface drift quickly.

**2. Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints for review.

Which approach?
