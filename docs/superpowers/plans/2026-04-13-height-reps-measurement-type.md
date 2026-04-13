# Height + Reps Measurement Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `height_reps` measurement type so exercises like Box Jumps can track height (inches) + reps as their progression metric.

**Architecture:** Reuse the existing `weight_kg` column to store height in inches when `measurementType === 'height_reps'`. The measurement type value tells UI components how to label and display the value. Volume calculations exclude `height_reps` exercises since height x reps is not meaningful volume.

**Tech Stack:** React Native, TypeScript, SQLite (react-native-sqlite-storage)

**Spec:** `docs/superpowers/specs/2026-04-13-height-reps-measurement-type-design.md`

---

### Task 1: Add `height_reps` to the type system

**Files:**
- Modify: `src/types/index.ts:22`
- Modify: `src/db/dashboard.ts:877` (exportAllData measurementType cast)
- Modify: `src/db/dashboard.ts:536-537` (dominantType)
- Modify: `src/db/dashboard.ts:607` (CategoryExerciseProgress measurementType)
- Modify: `src/db/dashboard.ts:614` (cast)

- [ ] **Step 1: Update ExerciseMeasurementType**

In `src/types/index.ts`, change line 22:

```typescript
// Before:
export type ExerciseMeasurementType = 'reps' | 'timed';

// After:
export type ExerciseMeasurementType = 'reps' | 'timed' | 'height_reps';
```

- [ ] **Step 2: Fix all narrow casts in dashboard.ts**

Several places in `src/db/dashboard.ts` cast to `'reps' | 'timed'` which will now be incomplete. Update them to use `ExerciseMeasurementType`:

At line 536, change the `dominantType` variable:
```typescript
// Before:
let dominantType: 'reps' | 'timed' = 'reps';

// After:
let dominantType: ExerciseMeasurementType = 'reps';
```

At line 607, change the type annotation:
```typescript
// Before:
measurementType: 'reps' | 'timed';

// After:
measurementType: ExerciseMeasurementType;
```

At line 614, change the cast:
```typescript
// Before:
const measurementType = (row.measurement_type ?? 'reps') as 'reps' | 'timed';

// After:
const measurementType = (row.measurement_type ?? 'reps') as ExerciseMeasurementType;
```

At line 877 in `exportAllData`, change the cast:
```typescript
// Before:
measurementType: (r.measurement_type ?? 'reps') as 'reps' | 'timed',

// After:
measurementType: (r.measurement_type ?? 'reps') as ExerciseMeasurementType,
```

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No new errors (there may be pre-existing ones unrelated to this change).

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/db/dashboard.ts
git commit -m "feat: add height_reps to ExerciseMeasurementType"
```

---

### Task 2: Update AddExerciseModal with third toggle option

**Files:**
- Modify: `src/screens/AddExerciseModal.tsx:128-162`

- [ ] **Step 1: Add Height toggle button**

In `src/screens/AddExerciseModal.tsx`, find the `toggleRow` View (lines 129-162) and add a third button after the Timed button:

```typescript
// Replace the entire toggleRow View block (lines 129-162) with:
<View style={styles.toggleRow}>
  <TouchableOpacity
    style={[
      styles.toggleButton,
      measurementType === 'reps' ? styles.toggleActive : styles.toggleInactive,
    ]}
    onPress={() => setMeasurementType('reps')}>
    <Text
      style={[
        styles.toggleText,
        measurementType === 'reps'
          ? styles.toggleTextActive
          : styles.toggleTextInactive,
      ]}>
      Reps
    </Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[
      styles.toggleButton,
      measurementType === 'timed' ? styles.toggleActive : styles.toggleInactive,
    ]}
    onPress={() => setMeasurementType('timed')}>
    <Text
      style={[
        styles.toggleText,
        measurementType === 'timed'
          ? styles.toggleTextActive
          : styles.toggleTextInactive,
      ]}>
      Timed
    </Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[
      styles.toggleButton,
      measurementType === 'height_reps' ? styles.toggleActive : styles.toggleInactive,
    ]}
    onPress={() => setMeasurementType('height_reps')}>
    <Text
      style={[
        styles.toggleText,
        measurementType === 'height_reps'
          ? styles.toggleTextActive
          : styles.toggleTextInactive,
      ]}>
      Height
    </Text>
  </TouchableOpacity>
</View>
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/AddExerciseModal.tsx
git commit -m "feat: add Height toggle to AddExerciseModal"
```

---

### Task 3: Update SetLoggingPanel for height_reps input

**Files:**
- Modify: `src/components/SetLoggingPanel.tsx`

The `SetLoggingPanel` currently branches on `isTimed` to decide between stopwatch UI and weight+reps UI. For `height_reps`, we reuse the weight+reps branch but change labels and stepper increments.

- [ ] **Step 1: Add isHeightReps flag and adjust stepper/placeholder**

In `src/components/SetLoggingPanel.tsx`:

At line 64, after `const isTimed = measurementType === 'timed';`, add:
```typescript
const isHeightReps = measurementType === 'height_reps';
```

At line 102, change the `handleStepWeight` callback to use conditional step size:
```typescript
// Before:
const handleStepWeight = useCallback((delta: number) => {
  const current = parseFloat(weightInput) || 0;
  const newWeight = Math.max(0, current + delta);
  setWeightInput(String(newWeight));
  HapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
}, [weightInput]);

// After:
const stepSize = isHeightReps ? 2 : 5;

const handleStepWeight = useCallback((delta: number) => {
  const current = parseFloat(weightInput) || 0;
  const newWeight = Math.max(0, current + delta);
  setWeightInput(String(newWeight));
  HapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
}, [weightInput]);
```

In the JSX, update the stepper buttons (around lines 225-250). Change the `-5` and `+5` stepper values:

```typescript
// Before (line 228-230):
<TouchableOpacity
  style={[styles.stepperButton, isWeightAtZero && styles.stepperButtonDisabled]}
  onPress={() => handleStepWeight(-5)}
  disabled={isWeightAtZero}
  activeOpacity={0.7}>
  <Text style={[styles.stepperText, isWeightAtZero && styles.stepperTextDisabled]}>-5</Text>
</TouchableOpacity>

// After:
<TouchableOpacity
  style={[styles.stepperButton, isWeightAtZero && styles.stepperButtonDisabled]}
  onPress={() => handleStepWeight(-stepSize)}
  disabled={isWeightAtZero}
  activeOpacity={0.7}>
  <Text style={[styles.stepperText, isWeightAtZero && styles.stepperTextDisabled]}>-{stepSize}</Text>
</TouchableOpacity>
```

And the `+5` button (around line 244-249):
```typescript
// Before:
<TouchableOpacity
  style={styles.stepperButton}
  onPress={() => handleStepWeight(5)}
  activeOpacity={0.7}>
  <Text style={styles.stepperText}>+5</Text>
</TouchableOpacity>

// After:
<TouchableOpacity
  style={styles.stepperButton}
  onPress={() => handleStepWeight(stepSize)}
  activeOpacity={0.7}>
  <Text style={styles.stepperText}>+{stepSize}</Text>
</TouchableOpacity>
```

Update the weight input placeholder (line 237):
```typescript
// Before:
placeholder="lb"

// After:
placeholder={isHeightReps ? 'in' : 'lb'}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SetLoggingPanel.tsx
git commit -m "feat: height_reps support in SetLoggingPanel"
```

---

### Task 4: Update SetListItem display format

**Files:**
- Modify: `src/components/SetListItem.tsx`

- [ ] **Step 1: Add measurementType prop and conditional display**

In `src/components/SetListItem.tsx`:

Update the Props interface (line 14-18):
```typescript
// Before:
interface Props {
  set: WorkoutSet;
  onDelete: (id: number) => void;
  isTimed?: boolean;
}

// After:
interface Props {
  set: WorkoutSet;
  onDelete: (id: number) => void;
  isTimed?: boolean;
  isHeightReps?: boolean;
}
```

Update the component destructuring (line 26):
```typescript
// Before:
export const SetListItem = React.memo(function SetListItem({ set, onDelete, isTimed = false }: Props) {

// After:
export const SetListItem = React.memo(function SetListItem({ set, onDelete, isTimed = false, isHeightReps = false }: Props) {
```

Update the display text (line 45-48):
```typescript
// Before:
<Text style={styles.setText}>
  {isTimed
    ? `Set ${set.setNumber}: ${formatDuration(set.reps)}`
    : `Set ${set.setNumber}: ${set.weightLbs}lb × ${set.reps} reps${set.isWarmup ? ' (warmup)' : ''}`}
</Text>

// After:
<Text style={styles.setText}>
  {isTimed
    ? `Set ${set.setNumber}: ${formatDuration(set.reps)}`
    : `Set ${set.setNumber}: ${set.weightLbs}${isHeightReps ? 'in' : 'lb'} × ${set.reps} reps${set.isWarmup ? ' (warmup)' : ''}`}
</Text>
```

- [ ] **Step 2: Pass isHeightReps from SetLoggingPanel**

In `src/components/SetLoggingPanel.tsx`, find where `SetListItem` is rendered (line 183):

```typescript
// Before:
<SetListItem key={set.id} set={set} onDelete={handleDelete} isTimed={isTimed} />

// After:
<SetListItem key={set.id} set={set} onDelete={handleDelete} isTimed={isTimed} isHeightReps={isHeightReps} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SetListItem.tsx src/components/SetLoggingPanel.tsx
git commit -m "feat: display height in inches in SetListItem"
```

---

### Task 5: Update GhostReference display format

**Files:**
- Modify: `src/components/GhostReference.tsx`

- [ ] **Step 1: Add isHeightReps prop and conditional display**

In `src/components/GhostReference.tsx`:

Update the Props interface (line 8-11):
```typescript
// Before:
interface Props {
  sets: WorkoutSet[];
  isTimed?: boolean;
}

// After:
interface Props {
  sets: WorkoutSet[];
  isTimed?: boolean;
  isHeightReps?: boolean;
}
```

Update the component signature (line 19):
```typescript
// Before:
export function GhostReference({ sets, isTimed = false }: Props) {

// After:
export function GhostReference({ sets, isTimed = false, isHeightReps = false }: Props) {
```

Update both display texts. First the vertical list (line 33-36):
```typescript
// Before:
<Text key={s.id} style={styles.setText}>
  {isTimed
    ? `Set ${s.setNumber}: ${formatDuration(s.reps)}`
    : `Set ${s.setNumber}: ${s.weightLbs}lb × ${s.reps} reps`}
</Text>

// After:
<Text key={s.id} style={styles.setText}>
  {isTimed
    ? `Set ${s.setNumber}: ${formatDuration(s.reps)}`
    : `Set ${s.setNumber}: ${s.weightLbs}${isHeightReps ? 'in' : 'lb'} × ${s.reps} reps`}
</Text>
```

Then the horizontal row (line 43-46):
```typescript
// Before:
<Text key={s.id} style={styles.setText}>
  {isTimed
    ? `Set ${s.setNumber}: ${formatDuration(s.reps)}`
    : `Set ${s.setNumber}: ${s.weightLbs}lb × ${s.reps}`}
  {idx < sets.length - 1 ? '   ' : ''}
</Text>

// After:
<Text key={s.id} style={styles.setText}>
  {isTimed
    ? `Set ${s.setNumber}: ${formatDuration(s.reps)}`
    : `Set ${s.setNumber}: ${s.weightLbs}${isHeightReps ? 'in' : 'lb'} × ${s.reps}`}
  {idx < sets.length - 1 ? '   ' : ''}
</Text>
```

- [ ] **Step 2: Pass isHeightReps from SetLoggingPanel**

In `src/components/SetLoggingPanel.tsx`, find where `GhostReference` is rendered (line 177):

```typescript
// Before:
<GhostReference sets={lastSessionSets} isTimed={isTimed} />

// After:
<GhostReference sets={lastSessionSets} isTimed={isTimed} isHeightReps={isHeightReps} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/GhostReference.tsx src/components/SetLoggingPanel.tsx
git commit -m "feat: display height in inches in GhostReference"
```

---

### Task 6: Update ExerciseDetailScreen for height_reps

**Files:**
- Modify: `src/screens/ExerciseDetailScreen.tsx`

This is the largest UI change. For `height_reps` exercises: hero stat labels change, volume stat is hidden, insight text says "Height" instead of "Weight", chart Y-axis suffix changes, and the strength/volume toggle is hidden.

- [ ] **Step 1: Add isHeightReps flag**

In `src/screens/ExerciseDetailScreen.tsx`, after line 46 (`const { exerciseId, exerciseName, measurementType, category } = route.params;`), add:

```typescript
const isHeightReps = measurementType === 'height_reps';
```

- [ ] **Step 2: Update hero stats section**

Replace the hero stats View (lines 167-186):

```typescript
// Before:
<View style={styles.heroRow}>
  <View style={styles.heroStat}>
    <Text style={[styles.heroValue, { color: accentColor }]}>
      {bestWeight > 0 ? bestWeight : '—'}
    </Text>
    <Text style={styles.heroLabel}>Best (lbs)</Text>
  </View>
  <View style={styles.heroStat}>
    <Text style={[styles.heroValue, { color: '#818CF8' }]}>
      {totalVolume > 0 ? totalVolume.toLocaleString() : '—'}
    </Text>
    <Text style={styles.heroLabel}>Volume (lbs)</Text>
  </View>
  <View style={styles.heroStat}>
    <Text style={[styles.heroValue, { color: colors.prGold }]}>
      {sessionCount}
    </Text>
    <Text style={styles.heroLabel}>Sessions</Text>
  </View>
</View>

// After:
<View style={styles.heroRow}>
  <View style={styles.heroStat}>
    <Text style={[styles.heroValue, { color: accentColor }]}>
      {bestWeight > 0 ? bestWeight : '—'}
    </Text>
    <Text style={styles.heroLabel}>{isHeightReps ? 'Best (in)' : 'Best (lbs)'}</Text>
  </View>
  {!isHeightReps && (
    <View style={styles.heroStat}>
      <Text style={[styles.heroValue, { color: '#818CF8' }]}>
        {totalVolume > 0 ? totalVolume.toLocaleString() : '—'}
      </Text>
      <Text style={styles.heroLabel}>Volume (lbs)</Text>
    </View>
  )}
  <View style={styles.heroStat}>
    <Text style={[styles.heroValue, { color: colors.prGold }]}>
      {sessionCount}
    </Text>
    <Text style={styles.heroLabel}>Sessions</Text>
  </View>
</View>
```

- [ ] **Step 3: Update insight text**

In the `insightText` useMemo (lines 110-121), update the weight direction text:

```typescript
// Before:
if (weightChangePercent !== null) {
  const direction = weightChangePercent >= 0 ? 'up' : 'down';
  return `Weight ${direction} ${Math.round(Math.abs(weightChangePercent))}% in ${periodLabel}`;
}

// After:
if (weightChangePercent !== null) {
  const direction = weightChangePercent >= 0 ? 'up' : 'down';
  const label = isHeightReps ? 'Height' : 'Weight';
  return `${label} ${direction} ${Math.round(Math.abs(weightChangePercent))}% in ${periodLabel}`;
}
```

Note: add `isHeightReps` to the useMemo dependency array:

```typescript
// Before:
}, [insights]);

// After:
}, [insights, isHeightReps]);
```

- [ ] **Step 4: Hide strength/volume toggle for height_reps**

Wrap the `modePill` View (lines 211-228) with a conditional:

```typescript
// Before:
<View style={styles.modePill}>
  ...toggle buttons...
</View>

// After:
{!isHeightReps && (
  <View style={styles.modePill}>
    ...toggle buttons...
  </View>
)}
```

- [ ] **Step 5: Update chart Y-axis suffix**

At line 242, change the yAxisSuffix:

```typescript
// Before:
yAxisSuffix={isVolume ? '' : ' lb'}

// After:
yAxisSuffix={isVolume ? '' : (isHeightReps ? ' in' : ' lb')}
```

- [ ] **Step 6: Update SessionTimelineRow pill format for height_reps**

In `src/components/SessionTimelineRow.tsx`, the pills show `{s.weightLbs}×{s.reps}` with no unit label. This is fine for weight (contextually obvious), but for height we should add "in":

Update the Props interface (line 8-14):
```typescript
// Before:
interface SessionTimelineRowProps {
  session: ExerciseHistorySession;
  index: number;
  totalSessions: number;
  isPR?: boolean;
  onPress: () => void;
}

// After:
interface SessionTimelineRowProps {
  session: ExerciseHistorySession;
  index: number;
  totalSessions: number;
  isPR?: boolean;
  isHeightReps?: boolean;
  onPress: () => void;
}
```

Update the destructuring (line 23):
```typescript
// Before:
export function SessionTimelineRow({
  session,
  index,
  totalSessions,
  isPR,
  onPress,
}: SessionTimelineRowProps) {

// After:
export function SessionTimelineRow({
  session,
  index,
  totalSessions,
  isPR,
  isHeightReps = false,
  onPress,
}: SessionTimelineRowProps) {
```

Update the pill text (line 46-47):
```typescript
// Before:
<Text style={styles.pillText}>
  {s.weightLbs}{'\u00D7'}{s.reps}
</Text>

// After:
<Text style={styles.pillText}>
  {s.weightLbs}{isHeightReps ? 'in' : ''}{'\u00D7'}{s.reps}
</Text>
```

For the volume display on the right side (line 55), hide it for height_reps:
```typescript
// Before:
<Text style={styles.volume}>{volume.toLocaleString()}</Text>

// After:
{!isHeightReps && <Text style={styles.volume}>{volume.toLocaleString()}</Text>}
```

- [ ] **Step 7: Pass isHeightReps to SessionTimelineRow**

In `src/screens/ExerciseDetailScreen.tsx`, where `SessionTimelineRow` is rendered (around line 286):

```typescript
// Before:
<SessionTimelineRow
  key={session.sessionId}
  session={session}
  index={index}
  totalSessions={filteredHistory.length}
  isPR={isPR}
  onPress={() => ...}
/>

// After:
<SessionTimelineRow
  key={session.sessionId}
  session={session}
  index={index}
  totalSessions={filteredHistory.length}
  isPR={isPR}
  isHeightReps={isHeightReps}
  onPress={() => ...}
/>
```

- [ ] **Step 8: Commit**

```bash
git add src/screens/ExerciseDetailScreen.tsx src/components/SessionTimelineRow.tsx
git commit -m "feat: height_reps display in ExerciseDetailScreen"
```

---

### Task 7: Exclude height_reps from volume calculations

**Files:**
- Modify: `src/db/progress.ts` (weekly snapshot + muscle group progress)
- Modify: `src/utils/scoreCalculator.ts` (fitness score)

Volume = `SUM(weight_kg * reps)`. For `height_reps` exercises, `weight_kg` stores inches, so including them in volume would be nonsensical. We need to JOIN to `exercises` and filter out `measurement_type = 'height_reps'`.

- [ ] **Step 1: Exclude from weekly snapshot volume queries**

In `src/db/progress.ts`, update the "this week's volume" query (lines 94-103). Add a JOIN to exercises and a WHERE clause:

```sql
-- Before:
SELECT SUM(ws.weight_kg * ws.reps) AS volume
FROM workout_sets ws
INNER JOIN workout_sessions wss ON wss.id = ws.session_id
WHERE wss.completed_at >= ?
  AND wss.completed_at < ?
  AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)

-- After:
SELECT SUM(ws.weight_kg * ws.reps) AS volume
FROM workout_sets ws
INNER JOIN workout_sessions wss ON wss.id = ws.session_id
INNER JOIN exercises e ON e.id = ws.exercise_id
WHERE wss.completed_at >= ?
  AND wss.completed_at < ?
  AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
  AND e.measurement_type != 'height_reps'
```

Apply the same change to the "previous week's volume" query (lines 107-116):

```sql
-- Before:
SELECT SUM(ws.weight_kg * ws.reps) AS volume
FROM workout_sets ws
INNER JOIN workout_sessions wss ON wss.id = ws.session_id
WHERE wss.completed_at >= ?
  AND wss.completed_at < ?
  AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)

-- After:
SELECT SUM(ws.weight_kg * ws.reps) AS volume
FROM workout_sets ws
INNER JOIN workout_sessions wss ON wss.id = ws.session_id
INNER JOIN exercises e ON e.id = ws.exercise_id
WHERE wss.completed_at >= ?
  AND wss.completed_at < ?
  AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
  AND e.measurement_type != 'height_reps'
```

- [ ] **Step 2: Exclude from muscle group progress volume queries**

In `src/db/progress.ts`, the `getMuscleGroupProgress` function's "this week's volume per category" query (lines 142-155) and "last week's volume per category" query (lines 159-173) already JOIN to `exercises` via `exercise_muscle_groups`. Add the filter to both:

```sql
-- Add to both queries after the existing WHERE clauses:
AND e.measurement_type != 'height_reps'
```

Wait — these queries don't currently JOIN to `exercises`. They join `workout_sets` -> `exercise_muscle_groups` -> `muscle_groups`. We need to add the JOIN:

For the this-week query (lines 142-155):
```sql
-- Before:
SELECT mg.parent_category AS category, SUM(ws.weight_kg * ws.reps) AS volume
FROM workout_sets ws
INNER JOIN workout_sessions wss ON wss.id = ws.session_id
INNER JOIN exercise_muscle_groups emg ON emg.exercise_id = ws.exercise_id
INNER JOIN muscle_groups mg ON mg.id = emg.muscle_group_id
WHERE wss.completed_at >= ?
  AND wss.completed_at < ?
  AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
  AND emg.is_primary = 1
  AND mg.parent_category != 'stretching'
GROUP BY mg.parent_category

-- After:
SELECT mg.parent_category AS category, SUM(ws.weight_kg * ws.reps) AS volume
FROM workout_sets ws
INNER JOIN workout_sessions wss ON wss.id = ws.session_id
INNER JOIN exercises e ON e.id = ws.exercise_id
INNER JOIN exercise_muscle_groups emg ON emg.exercise_id = ws.exercise_id
INNER JOIN muscle_groups mg ON mg.id = emg.muscle_group_id
WHERE wss.completed_at >= ?
  AND wss.completed_at < ?
  AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
  AND emg.is_primary = 1
  AND mg.parent_category != 'stretching'
  AND e.measurement_type != 'height_reps'
GROUP BY mg.parent_category
```

Apply the same changes to the last-week query (lines 159-173) — add `INNER JOIN exercises e ON e.id = ws.exercise_id` and `AND e.measurement_type != 'height_reps'`.

- [ ] **Step 3: Exclude from score calculator fitness query**

In `src/utils/scoreCalculator.ts`, update the `queryFitness` function. Both SQL queries (lines 93-100 and 108-113) need the exclusion:

For the all-time max weekly volume query (lines 92-100):
```sql
-- Before:
SELECT MAX(week_vol) as max_vol FROM (
  SELECT strftime('%Y-%W', ws.completed_at) as week_key,
         SUM(s.reps * s.weight_kg) as week_vol
  FROM workout_sets s
  JOIN workout_sessions ws ON s.session_id = ws.id
  WHERE ws.completed_at IS NOT NULL
  GROUP BY week_key
)

-- After:
SELECT MAX(week_vol) as max_vol FROM (
  SELECT strftime('%Y-%W', ws.completed_at) as week_key,
         SUM(s.reps * s.weight_kg) as week_vol
  FROM workout_sets s
  JOIN workout_sessions ws ON s.session_id = ws.id
  JOIN exercises e ON e.id = s.exercise_id
  WHERE ws.completed_at IS NOT NULL
    AND e.measurement_type != 'height_reps'
  GROUP BY week_key
)
```

For the window volume query (lines 108-113):
```sql
-- Before:
SELECT SUM(s.reps * s.weight_kg) as total_vol,
       COUNT(DISTINCT strftime('%Y-%W', ws.completed_at)) as week_count
FROM workout_sets s
JOIN workout_sessions ws ON s.session_id = ws.id
WHERE ws.completed_at IS NOT NULL ${whereClause}

-- After:
SELECT SUM(s.reps * s.weight_kg) as total_vol,
       COUNT(DISTINCT strftime('%Y-%W', ws.completed_at)) as week_count
FROM workout_sets s
JOIN workout_sessions ws ON s.session_id = ws.id
JOIN exercises e ON e.id = s.exercise_id
WHERE ws.completed_at IS NOT NULL
  AND e.measurement_type != 'height_reps'
  ${whereClause}
```

- [ ] **Step 4: Commit**

```bash
git add src/db/progress.ts src/utils/scoreCalculator.ts
git commit -m "fix: exclude height_reps exercises from volume calculations"
```

---

### Task 8: Build, deploy, and manual verification

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No new errors.

- [ ] **Step 2: Run tests**

Run: `npx jest --passWithNoTests 2>&1 | tail -20`
Expected: All existing tests pass.

- [ ] **Step 3: Build and deploy to emulator**

Run the deploy skill to build and install the APK.

- [ ] **Step 4: Manual verification checklist**

1. Open Exercise Library → find Box Jumps → Edit → change measurement from "Reps" to "Height" → Save
2. Start a workout → add Box Jumps → verify input shows "in" placeholder and -2/+2 steppers
3. Log a set (e.g., 24in × 8 reps) → verify SetListItem shows "24in × 8 reps"
4. Log a second set → verify GhostReference shows last session in inches format
5. Check the dashboard "this week" card → verify Box Jumps volume is NOT included in the total
6. Navigate to Box Jumps detail screen → verify "Best (in)" label, no volume stat, chart shows " in" suffix, no strength/volume toggle
