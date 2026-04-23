# Body Composition Tracking — Weight & Body Fat %

**Date:** 2026-04-22
**New tab:** `BODY COMP` on `src/screens/ProteinScreen.tsx`
**New table:** `body_metrics` (migration V22)
**Chart library:** add `victory-native` (existing `react-native-chart-kit` lacks dual-axis support)
**Scope:** Daily weight + periodic body-fat tracking with a dual-axis calorie-correlation chart. One new tab, one Dashboard card, one shared log modal, one new DB table.

## Goal

Let the user track daily weight and occasional body-fat % readings, and see how their calorie intake correlates with their weight trend over time. The core experience is a single overlay chart where the weight line (mint) and daily calorie bars (muted) share a timeline — making the question *"is my intake driving this weight change?"* answerable at a glance.

## Primary user job

> "I weigh in every morning and log what I eat. At any point I want to open the app and see whether my current calorie intake is moving the needle on my weight, zoomable from month → week → day."

## Non-goals (explicitly out of v1)

- Target-weight / goal-line overlays on the chart. Revisit in v1.1 once real data exists.
- Unit toggle (lb/kg). Schema supports it; UI does not.
- Historical body-fat imports. User starts logging from 2026-04-25.
- Intra-day weight entries. One reading per day per metric.
- Notifications / reminders to weigh in. Out of scope.
- Apple Health / Google Fit sync. Out of scope.
- Exporting body-metrics data. Out of scope.

---

## UX Contract

### Placement

- **Nutrition screen (`ProteinScreen.tsx`) gains a 3rd top-level tab `BODY COMP`** using the existing `TabBar` pattern (same mint-underline indicator as MACROS / HYDRATION).
- **Dashboard gains a new `DashboardWeightCard`** inserted between `NextWorkoutCard` and `NutritionRingsCard`. Card shows today's weight (or "Not logged" + inline "+ Log" CTA). Tapping "+ Log" opens the shared log modal.

### BODY COMP tab layout (top to bottom)

1. **Header log button** — "+" icon in the **Nutrition screen's header** (top-right, right of the "Nutrition" title). Visible only when BODY COMP tab is active (swap in/out based on active tab). Opens the shared log modal. Used for backfilling, editing, or logging body-fat %.
2. **Scope segmented control** — `[MONTH] [WEEK] [DAY]`, pill-style with an animated slider between segments.
3. **Date navigator** — `‹  {label}  ›` row. Label is scope-aware: "April 2026" / "Apr 15 – 21, 2026" / "Wed · Apr 17, 2026". Arrows step one scope-unit at a time. Future dates are disabled.
4. **KPI row** — scope-dependent (see per-view specs below).
5. **Chart** (MONTH, WEEK) or **Macro rings + meal list** (DAY).
6. **Summary list** — scope-dependent rows.

### Per-scope views

**MONTH view**
- KPIs: AVG WEIGHT (with "↓ X.X vs prev month"), AVG CALS (with "goal 2200"), BODY FAT (latest reading in range, or "—" + "next due").
- Chart: dual-axis overlay.
  - Left axis: weight (lbs).
    - Raw daily line (light mint, 1.2px).
    - 7-day moving average line (bold mint, 2.5px) — the visual lead.
    - Gold dots at body-fat reading dates on the weight line. Tiny "18%" label above each.
  - Right axis: calories (kcal).
    - One bar per day. Color-coded: mint shade for at/under goal, orange when over goal.
  - Program-boundary overlays (MONTH scope only): thin dashed vertical lines at each program's `startDate` and `startDate + weeks * 7` dates that fall within the visible range, labeled "P1 start", "P1 end" in 9px text at the top. Omitted at WEEK and DAY scopes to avoid clutter.
- Summary list: Monthly weight change, Days logged (X / Y), Days over calorie goal, Rate (lb/week).

**WEEK view**
- KPIs: WEEK AVG (with "↓ X.X vs last wk"), AVG CALS.
- Chart: same overlay, 7 data points.
  - Weight line with 5-point circles at each day's reading.
  - Weight value annotated above each point (e.g., "177.4").
  - Calorie bars with a dashed horizontal goal line (e.g., 2200) across the chart, labeled "2200 goal" at the right edge.
  - X-axis: `M T W T F S S` day letters + numeric date below.
- Summary list: one tappable row per day — "Mon Apr 15 · 177.4 · 2,150 kcal". Tap → jumps to DAY view for that date. Rows exceeding the calorie goal are rendered in orange.

**DAY view**
- No time-series chart (single reading per day).
- Hero: big weight number (48px) with delta vs prior day and vs month start.
- KPIs: CALORIES (X / goal with "N under/over goal"), 7-DAY MA (smoothed trend).
- Macro rings: P / C / F cards with circular progress rings and "185 / 180 g" style values.
- Meals list: each meal logged that day — "Breakfast · 7:15 AM · 486 kcal" with one line of item summary.

### Log modal (`LogBodyMetricModal`)

Shared modal for weight and body-fat entry.

- **Mode toggle at top:** `[Weight] [Body Fat %]` pill switcher.
- **Value input:** numeric keypad, 0.1 precision. Range 50–500 for weight (lb), 3–60 for body fat (%).
- **Date picker:** defaults to today. Cannot select future dates.
- **Note field:** optional, 140-char max, single line. Placeholder "e.g. post-race, traveling".
- **Save button:** disabled until input is in range.
- **Open-in-edit-mode** (from Dashboard card's Edit icon or tapping a logged reading): modal pre-fills the existing value, date, and note for that `(metric_type, date)` row. Saving updates in place (no replace confirmation — the user explicitly entered edit mode).
- **Collision behavior** (add-mode save hits an existing row): modal prompts "Replace existing reading?" with Replace / Cancel buttons. Only applies when the modal was opened in add-mode (e.g., from "+ Log today") and the user then selects a date that happens to have a prior reading.
- **Auto program-link:** on save, query `programs` for any program where `startDate <= date <= startDate + weeks * 7` and set `program_id` automatically. If multiple match (shouldn't happen, but defensively), link to the most recent.

### Dashboard card (`DashboardWeightCard`)

- **Not-logged state:** label "WEIGHT · TODAY", value row shows "Not logged", subline shows yesterday's reading if any ("Yesterday: 176.8 lb"), prominent mint "+ Log" button (pill, 10px font).
- **Logged state:** today's weight (larger, bold), "↓ 0.6 vs yesterday" delta in mint (down=mint, up=orange, flat=neutral gray), small "Edit" icon button opening the log modal in edit mode.
- Tapping the card body (not the button) navigates to the Nutrition screen's BODY COMP tab.

### Empty / edge states

- **Never logged:** BODY COMP tab shows a centered dumbbell / scale illustration + "Log your first weight" CTA.
- **One reading only:** chart shows a single point (no line); KPIs show the value + "—" for deltas.
- **Gaps in data:** chart line has gaps (no interpolation). 7-day MA window skips missing days.
- **No program yet:** program-boundary overlays not rendered.

---

## Data Model

### Migration V22 — create `body_metrics`

```sql
CREATE TABLE body_metrics (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_type    TEXT NOT NULL CHECK (metric_type IN ('weight', 'body_fat')),
  value          REAL NOT NULL,
  unit           TEXT NOT NULL,           -- 'lb' for weight, 'percent' for body_fat
  recorded_date  TEXT NOT NULL,           -- ISO YYYY-MM-DD (day precision, no time)
  program_id     INTEGER,                 -- FK → programs.id (nullable)
  note           TEXT,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
  UNIQUE(metric_type, recorded_date)
);

CREATE INDEX idx_body_metrics_type_date ON body_metrics (metric_type, recorded_date);
CREATE INDEX idx_body_metrics_program ON body_metrics (program_id);
```

**Rationale:**
- `recorded_date` as `TEXT` (ISO date, no time component) makes "one reading per day" enforceable by the `UNIQUE` constraint with zero timezone-edge-case handling.
- `unit` column makes future kg/cm support a data-only change (no schema migration). V22 seeds `unit='lb'` for weight rows and `unit='percent'` for body-fat rows.
- `program_id` FK with `ON DELETE SET NULL` — if the user deletes a program, their body-fat readings don't cascade away; they just become unassociated.

### Migration V22 — `down`

```sql
DROP INDEX IF EXISTS idx_body_metrics_program;
DROP INDEX IF EXISTS idx_body_metrics_type_date;
DROP TABLE IF EXISTS body_metrics;
```

### TypeScript types (`src/types/index.ts`)

```ts
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
  createdAt: number;
  updatedAt: number;
}

export type BodyCompScope = 'month' | 'week' | 'day';
```

---

## Component Architecture

### New files

| File | Responsibility |
|---|---|
| `src/screens/BodyCompView.tsx` | Root content for the BODY COMP tab. Owns scope + date state, composes the child components. |
| `src/components/OverlayChart.tsx` | Dual-axis weight + calories chart. Receives `{ weights, calories, bodyFat, scope, dateRange, programs }`. |
| `src/components/DashboardWeightCard.tsx` | Dashboard card. Shows today's weight or "Not logged" CTA. |
| `src/components/LogBodyMetricModal.tsx` | Shared log modal for weight + body fat. Mode-toggle at top. |
| `src/components/BodyCompScopeBar.tsx` | Animated segmented control: MONTH / WEEK / DAY. |
| `src/components/BodyCompDateNav.tsx` | Scope-aware `‹ label ›` navigator. Disables future arrow at today's scope-unit. |
| `src/components/BodyCompDayView.tsx` | DAY-scope layout (hero weight, macro rings, meal list). Not a chart. |
| `src/components/BodyCompMonthSummary.tsx` | MONTH summary list (weight change, days logged, rate/week). |
| `src/components/BodyCompWeekSummary.tsx` | WEEK daily-breakdown list, tappable rows. |
| `src/components/icons/Scale.tsx` | Empty-state illustration. |
| `src/db/bodyMetrics.ts` | All body_metrics queries + aggregates. |
| — | V22 up/down is registered inline in `src/db/migrations.ts` (matches the existing V1–V21 inline pattern; no per-migration file). |

### Touched files

| File | Change |
|---|---|
| `src/screens/ProteinScreen.tsx` | Add BODY COMP as third tab. Extend tab state to `'macros' \| 'hydration' \| 'bodyComp'`. Render `<BodyCompView />` when active. |
| `src/screens/DashboardScreen.tsx` | Insert `<DashboardWeightCard />` between `NextWorkoutCard` and `NutritionRingsCard`. Navigation prop to jump to Nutrition screen's BODY COMP tab. |
| `src/db/schema.ts` | Append body_metrics CREATE TABLE. |
| `src/db/migrations.ts` | Register V22 up/down. |
| `src/types/index.ts` | Add `BodyMetric`, `BodyMetricType`, `BodyMetricUnit`, `BodyCompScope`. |
| `package.json` | Add `victory-native` + its peer dep `react-native-svg` (already present — verify). |

### Chart library: `victory-native`

- Current MacroChart uses `react-native-chart-kit`. That library does **not** support dual y-axes.
- `victory-native` is the minimum-risk add: mature, dual-axis via two `<VictoryAxis dependentAxis />` with independent `tickValues`, composable with `VictoryLine`, `VictoryBar`, `VictoryScatter` for the gold BF% dots.
- Tradeoff: ~300 KB to the bundle, and a second chart library alongside `chart-kit`. Acceptable because the MacroChart stays on `chart-kit` (no reason to migrate it).
- Alternative considered: custom SVG composition with `react-native-svg`. Rejected due to complexity cost — we'd reimplement scale computation, tick generation, and gesture handling ourselves.

---

## Data Flow

### Logging a reading (happy path)

**Add-mode (from "+ Log" buttons):**
1. User taps `+` on `DashboardWeightCard` or the Nutrition screen header when BODY COMP is active.
2. `LogBodyMetricModal` opens in add-mode. Defaults: mode=Weight, date=today, no note, empty value.
3. User enters value, optionally adjusts date/note, taps Save.
4. Collision check: does a row exist for `(metric_type, recorded_date)`?
   - If **yes**: modal prompts "Replace existing reading?" → on confirm, fall through to UPDATE; on cancel, stay in modal.
   - If **no**: fall through to INSERT.
5. INSERT or UPDATE runs. On INSERT, `program_id` is auto-linked by matching `programs` where `recorded_date` ∈ `[startDate, startDate + weeks * 7)`. On UPDATE, `program_id` is re-computed from the new date.
6. Modal dismisses. Queries invalidate → `DashboardWeightCard` + `BodyCompView` re-render.

**Edit-mode (from an existing reading):**
1. User taps the Edit icon on `DashboardWeightCard` (logged state), or taps a row in WEEK summary list, or taps an existing BF% dot on the chart.
2. `LogBodyMetricModal` opens in edit-mode, pre-filled with the existing value, date, and note.
3. User adjusts fields, taps Save.
4. UPDATE runs (no collision prompt — the user explicitly entered edit mode to modify this row). `program_id` is re-computed if the date changed.
5. Modal dismisses. Queries invalidate → re-render.

### Chart query (MONTH scope example)

```ts
// Pseudocode shape — actual impl uses react-native-sqlite-storage.
async function getMonthData(startDate: string, endDate: string) {
  const weights = await db.all(`
    SELECT recorded_date, value FROM body_metrics
    WHERE metric_type = 'weight' AND recorded_date BETWEEN ? AND ?
    ORDER BY recorded_date
  `, [startDate, endDate]);

  const bodyFat = await db.all(`
    SELECT recorded_date, value FROM body_metrics
    WHERE metric_type = 'body_fat' AND recorded_date BETWEEN ? AND ?
    ORDER BY recorded_date
  `, [startDate, endDate]);

  const calories = await db.all(`
    SELECT DATE(logged_at) as date, SUM(calories) as total
    FROM meals
    WHERE DATE(logged_at) BETWEEN ? AND ?
    GROUP BY DATE(logged_at)
    ORDER BY date
  `, [startDate, endDate]);

  const programs = await db.all(`
    SELECT id, name, startDate, weeks FROM programs
    WHERE startDate IS NOT NULL
      AND DATE(startDate, '+' || (weeks * 7) || ' days') >= ?
      AND startDate <= ?
  `, [startDate, endDate]);

  return { weights, bodyFat, calories, programs };
}
```

WEEK is the same query over 7 days. DAY uses `getDailyDetail(date)` returning weight + meals list for that date.

### Derived values (computed client-side)

- **7-day moving average** of weight: for each date in the result set, average the weights from `[date - 6 days, date]` that exist. Skip dates with fewer than 3 data points in the window (return `null`, chart shows gap).
- **Daily delta** (DAY view): today's weight – yesterday's weight. `null` if either missing.
- **Monthly/weekly delta**: last reading – first reading in the range.
- **Rate**: `(last_weight - first_weight) / (days_in_range / 7)` → lb/week.

---

## Edge Cases & Error Handling

| Scenario | Behavior |
|---|---|
| User has never logged a weight | BODY COMP tab shows empty state (Scale icon + "Log your first weight" CTA). Dashboard card shows "Not logged" with prominent + Log button. |
| Only one weight reading exists | Chart shows a single dot, no line. KPIs show value + "—" for deltas. |
| Gaps in daily logging | Chart line breaks at gap (no interpolation). 7-day MA null if <3 points in window. |
| User logs weight for a future date | Date picker prevents selecting future. If somehow submitted, insert-time validation rejects. |
| User enters out-of-range value | Save button disabled; inline hint "Weight must be 50–500 lb". |
| User logs same date twice | Collision detected on upsert; modal asks "Replace existing reading?" before overwrite. |
| User deletes a program | `body_metrics.program_id` set to NULL (FK `ON DELETE SET NULL`). Readings survive; program-overlay line disappears. |
| No programs exist | Program-boundary overlays simply not rendered. |
| Leap-year / timezone issues | `recorded_date` is a TEXT ISO date stored as local-date; no UTC conversion. Device timezone at write time determines "today". |
| Chart with zero data in range | Show "No data in this range" placeholder inside chart card; KPIs show "—". |

---

## Testing Strategy

### Unit / query tests (`src/db/bodyMetrics.test.ts`)

- V22 migration applies successfully; table + indexes + unique constraint exist.
- `upsert` inserts when no collision; updates when collision.
- `upsert` auto-links `program_id` when date falls in a program window.
- `getMonthData` returns correct shape for empty DB / single-reading / 30-day dataset.
- 7-day moving average helper returns nulls for insufficient windows.

### Component tests

- `OverlayChart`: renders with N = 0, 1, 7, 30 data points without crashing.
- `BodyCompScopeBar`: tapping a segment calls `onChange` with the new scope; slider animates to the correct position.
- `BodyCompDateNav`: forward arrow disabled when at current period; label format matches scope.
- `LogBodyMetricModal`: Save disabled on out-of-range input; toggle switches between weight and body-fat modes; replace-confirmation fires on collision.
- `DashboardWeightCard`: renders both "not logged" and "logged" states correctly; tap navigates appropriately.

### Integration

- End-to-end: log a weight from the Dashboard card → assert it appears as a data point on the BODY COMP MONTH chart for today's date.
- Log a body-fat reading for 2026-04-25 → assert gold dot appears on MONTH chart at that date.
- Switch MONTH → WEEK → DAY → assert query shape + render correctness at each scope.

### Manual UAT (to be enumerated in `HUMAN-UAT.md` during planning)

- Log today's weight from Dashboard → see delta from yesterday on the card.
- Open BODY COMP → switch MONTH/WEEK/DAY, confirm data shape changes.
- Backfill a weight for 3 days ago → chart updates.
- Log body fat % for 2026-04-25 → gold dot + tiny "%" label appears on chart.
- Delete a program → confirm body-metric readings survive and `program_id` becomes null.
- Force a collision (log today's weight twice) → confirm replace prompt.

---

## Implementation Phasing

Designed to land as a single phase but with natural commit boundaries:

1. **Data layer** — schema, migration V22, types, `bodyMetrics.ts` queries + tests.
2. **Log modal** — `LogBodyMetricModal` + its integration with queries.
3. **Dashboard card** — `DashboardWeightCard` wired to queries + modal.
4. **BODY COMP tab scaffolding** — ProteinScreen tab integration, scope bar, date nav, empty state.
5. **Overlay chart** — `OverlayChart` with victory-native, rendering MONTH scope.
6. **WEEK + DAY views** — reuse chart for WEEK, render DAY as non-chart layout.
7. **Summary lists + polish** — per-scope summary rows, program boundary overlays, MA overlay, empty/gap handling.
8. **Tests** — unit, component, and integration tests per the strategy above.

---

## Risks & Open Questions

- **`victory-native` bundle impact** — Add `~300KB` to the app. Acceptable for the feature value, but flag in implementation review.
- **Chart rerender cost at MONTH scope** — 30 weight points + 30 calorie bars + MA overlay + BF dots + program lines. Profile on older devices; if janky, pre-compute chart data in a useMemo keyed on `{scope, dateRange}`.
- **ProteinScreen.tsx naming** — File is named `ProteinScreen` but screen title is "Nutrition" and tabs are now MACROS / HYDRATION / BODY COMP. Rename to `NutritionScreen` would be cleaner but is out of scope for this design. Flag for a follow-up rename PR.

## Dependencies (pre-implementation checklist)

- Confirm `react-native-svg` is already in `package.json` (required peer dep of `victory-native`).
- Verify `meals` table has `logged_at` or equivalent timestamp for daily aggregation (used in `getMonthData` query).
- Confirm `TabBar` component's API supports 3 tabs (it's generic in usage today, but verify).
