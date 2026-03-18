# S04: CategoryProgressScreen & Navigation — UAT

**Milestone:** M002
**Written:** 2026-03-17

## UAT Type

- UAT mode: mixed (artifact-driven contract tests + live-runtime on-device verification)
- Why this mode is sufficient: Contract tests prove all data flow, delta formatting, and navigation wiring. Live-runtime is needed to verify sparkline rendering, visual layout, and the full touch-driven navigation chain on a real device.

## Preconditions

- App builds successfully: `cd android && ./gradlew assembleDebug` completes without errors
- App installed on emulator or physical device
- At least one workout session logged with exercises across multiple categories (e.g., chest, back, legs) so CategoryProgress has real data to display
- At least one category should have exercises with 2+ sessions to show meaningful sparklines and deltas
- At least one category should have a timed exercise (e.g., plank) to verify duration formatting

## Smoke Test

Open app → Dashboard shows category cards with sparklines → Tap any category card → CategoryProgressScreen opens with exercise list → Tap back → Returns to Dashboard.

## Test Cases

### 1. Category card opens CategoryProgressScreen with correct title

1. Open the app to the Dashboard tab
2. Observe category cards are displayed (e.g., "Chest", "Back", "Legs")
3. Tap the "Chest" category card
4. **Expected:** CategoryProgressScreen opens with "Chest" as the header title (capitalized). A back arrow (←) is visible in the header.

### 2. Exercise rows display with sparklines and deltas

1. From the Dashboard, tap a category card that has exercises with multiple logged sessions
2. Observe the exercise list on CategoryProgressScreen
3. **Expected:** Each exercise row shows: exercise name (left), a small sparkline chart (right), and metadata below the name including a delta value (e.g., "+2.5 kg") and a relative time (e.g., "3 days ago"). Positive deltas appear in mint/accent color.

### 3. Time range filter pills work

1. On CategoryProgressScreen, observe the 4 filter pills: "1M", "3M", "6M", "All"
2. "All" should be active (highlighted) by default
3. Tap "1M"
4. **Expected:** The pill "1M" becomes highlighted (accent background, dark text). Exercise data reloads — rows may change if some exercises weren't trained in the last month. Sparklines update to show only the last month's data points.
5. Tap "6M"
6. **Expected:** The pill "6M" becomes highlighted. Data reloads with 6-month range.

### 4. Delta formatting for weight-based exercises

1. Navigate to a category with reps-based exercises (e.g., "Chest" with Bench Press)
2. Find an exercise with at least 2 sessions where the latest best is higher than the previous
3. **Expected:** Delta shows as "+X.X kg" format (e.g., "+2.5 kg") in accent/mint color

### 5. Delta formatting for timed exercises

1. Navigate to a category containing a timed exercise (e.g., core with Plank)
2. Find a timed exercise with at least 2 sessions showing improvement
3. **Expected:** Delta shows as "+Xs" format (e.g., "+15s") in accent color

### 6. Delta hidden for new exercises

1. Find an exercise that has only 1 logged session (no previous best to compare)
2. **Expected:** No delta text is shown for that exercise — only the exercise name, relative time, and sparkline are visible

### 7. Non-positive delta shows en-dash

1. Find an exercise where the current best is equal to or lower than the previous best
2. **Expected:** Delta shows as "–" (en-dash character) in secondary/muted color, not accent color

### 8. Navigate to ExerciseProgressScreen from exercise row

1. On CategoryProgressScreen, tap any exercise row
2. **Expected:** ExerciseProgressScreen opens showing the detailed progress for that specific exercise (full chart, session history)
3. Tap back
4. **Expected:** Returns to CategoryProgressScreen with the same category and time range selection preserved

### 9. Full navigation chain: Dashboard → Category → Exercise → back → back

1. Start on Dashboard
2. Tap a category card (e.g., "Back")
3. Verify CategoryProgressScreen opens with "Back" title
4. Tap an exercise row (e.g., "Barbell Row")
5. Verify ExerciseProgressScreen opens for Barbell Row
6. Tap back
7. Verify CategoryProgressScreen shows "Back" exercises again
8. Tap back
9. **Expected:** Dashboard is displayed with all category cards visible. No navigation stack issues.

### 10. Back button from CategoryProgressScreen

1. Navigate to CategoryProgressScreen from Dashboard
2. Tap the ← back arrow in the header
3. **Expected:** Returns to Dashboard immediately

## Edge Cases

### Empty category

1. If a category has no exercises logged in the selected time range (e.g., switch to "1M" for a category only trained 2 months ago)
2. **Expected:** Screen shows "No exercises found" centered text instead of exercise rows

### Single data point exercise

1. Find an exercise with exactly 1 session logged
2. **Expected:** Sparkline renders a single point (or flat line). No delta text is shown (hidden, not "–").

### Rapid time range switching

1. On CategoryProgressScreen, tap through 1M → 3M → 6M → All quickly
2. **Expected:** No crashes, no stale data displayed. The final selected pill is highlighted and data matches that range. No flickering of old data (cancellation flag prevents stale updates).

## Failure Signals

- CategoryProgressScreen shows blank/white screen after tapping a category card — navigation wiring broken
- "No exercises found" when exercises exist — `getCategoryExerciseProgress` query or category param mismatch
- Sparklines don't render (empty space where chart should be) — MiniSparkline component or data format issue
- Delta shows "+0.0 kg" instead of "–" — formatDelta logic not handling non-positive case
- Delta shows for single-session exercises — formatDelta not checking sparklinePoints.length < 2
- Tapping exercise row does nothing — navigation.navigate call not firing or ExerciseProgress route not configured
- Time range pills don't visually change — active state styling not applied
- Data doesn't change when switching time range — useFocusEffect not re-running on timeRange change
- App crashes on back navigation — navigation stack misconfigured

## Requirements Proved By This UAT

- none (no REQUIREMENTS.md tracked)

## Not Proven By This UAT

- Performance with large datasets (100+ exercises per category) — not tested
- Behavior with zero categories in the database — Dashboard empty state covers this, not CategoryProgressScreen
- Network/DB failure recovery — errors are silently caught, no retry mechanism to test

## Notes for Tester

- The 4 pre-existing test failures in protein.test.ts (getStreakDays) are **not related to S04** — ignore them.
- "All" is the default time range when opening CategoryProgressScreen. If you see limited data, check if you accidentally selected "1M".
- The delta formatting has four distinct visual states to verify: hidden (no previousBest), positive weight (+X.X kg), positive duration (+Xs), and non-positive (–). Try to find examples of each.
- Stale dimming (30+ days) is a Dashboard feature from S03, not a CategoryProgressScreen feature. Category cards on Dashboard may appear dimmed, but CategoryProgressScreen rows do not dim.
- The back arrow is a Unicode ← character, not an icon. It should be mint/primary colored.
