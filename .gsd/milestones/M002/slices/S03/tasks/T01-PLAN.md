---
estimated_steps: 6
estimated_files: 2
---

# T01: Wire CategoryProgress route and rewrite Dashboard to render category cards

**Slice:** S03 — Dashboard Redesign — Category Cards
**Milestone:** M002

## Description

Replace the flat exercise list in DashboardScreen with CategorySummaryCard components powered by `getCategorySummaries()`, add the `CategoryProgress` navigation route with a placeholder screen, and remove all dead flat-list code. This is the core production code change for S03 — after this task, the dashboard renders category cards instead of individual exercise rows.

**Relevant skills:** `dark-mint-card-ui` (for styling consistency if needed)

## Steps

1. **Add CategoryProgress route to TabNavigator.** In `src/navigation/TabNavigator.tsx`:
   - Add `CategoryProgress: { category: string }` to the `DashboardStackParamList` type (after the `Settings` entry around line 51)
   - Create an inline placeholder component: `function CategoryProgressPlaceholder() { return (<View style={{ flex: 1, backgroundColor: '#0D1117', justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#8B949E' }}>Category Progress — Coming Soon</Text></View>); }`
   - Register it in `DashboardStackNavigator`: `<DashboardStack.Screen name="CategoryProgress" component={CategoryProgressPlaceholder} />`

2. **Replace data imports in DashboardScreen.** In `src/screens/DashboardScreen.tsx`:
   - Remove the `getRecentlyTrainedExercises` import from `'../db/dashboard'`
   - Add `getCategorySummaries` to the import from `'../db/dashboard'` (keep `getNextWorkoutDay`)
   - Add import: `import { CategorySummaryCard } from '../components/CategorySummaryCard';`
   - Add import: `import { CategorySummary } from '../types';` (add to existing types import)

3. **Replace state and data fetching.**
   - Change `const [exercises, setExercises] = useState<RecentExercise[]>([]);` to `const [categories, setCategories] = useState<CategorySummary[]>([]);`
   - In the `useFocusEffect` callback, replace `getRecentlyTrainedExercises()` with `getCategorySummaries()` and update the result assignment: `setCategories(result);`

4. **Replace the render body.** Replace the `exercises.length === 0` check and the entire `<ScrollView>` block with:
   - Empty state: `categories.length === 0` check (same empty state JSX as before)
   - Category cards: `<ScrollView contentContainerStyle={styles.list}>` containing `{categories.map(summary => { const isStale = Date.now() - new Date(summary.lastTrainedAt).getTime() > 30 * 24 * 60 * 60 * 1000; return (<CategorySummaryCard key={summary.category} summary={summary} isStale={isStale} onPress={() => navigation.navigate('CategoryProgress', { category: summary.category })} />); })}` wrapped in `<View style={{ marginBottom: spacing.sm }}>` per card for spacing
   - Keep all Next Workout card JSX, active session timer, empty state layout exactly as-is

5. **Remove dead code.** Delete from `DashboardScreen.tsx`:
   - `RecentExercise` interface (lines ~26-32)
   - `SubCategory` interface (lines ~34-37)
   - `GroupData` interface (lines ~39-42)
   - `CATEGORY_GROUP_ORDER` constant (lines ~44-48)
   - `groupByCategory()` function (lines ~50-64)
   - `const groups = useMemo(...)` line
   - `handlePress` callback
   - Remove unused imports: `useMemo` from React (if no longer used)
   - Styles to remove: `groupWrapper`, `groupHeaderStrip`, `groupHeader`, `surfaceContainer`, `subCategoryHeader`, `subCategorySpacing`, `card`, `cardRow`, `exerciseName`, `timeAgo`, `category`
   - Keep all styles used by Next Workout card, container, title, list, emptyContainer, emptyText

6. **Verify TypeScript compiles.** Run `npx tsc --noEmit` and confirm no new errors.

## Must-Haves

- [ ] `DashboardStackParamList` includes `CategoryProgress: { category: string }`
- [ ] Placeholder screen registered in `DashboardStackNavigator`
- [ ] DashboardScreen fetches `getCategorySummaries()` not `getRecentlyTrainedExercises()`
- [ ] Each category renders as `CategorySummaryCard` with stale computation (30-day threshold)
- [ ] `onPress` navigates to `CategoryProgress` with `{ category }` param
- [ ] All dead flat-list code removed (interfaces, constants, functions, styles)
- [ ] Next Workout card, active session timer, empty state, `handleQuickStart` all preserved unchanged
- [ ] `formatRelativeTime` import preserved (used by CategorySummaryCard internally, may be needed for future dashboard elements)

## Verification

- `npx tsc --noEmit` — no new type errors (only pre-existing ones)
- Visually inspect `src/screens/DashboardScreen.tsx` — no references to `RecentExercise`, `SubCategory`, `GroupData`, `CATEGORY_GROUP_ORDER`, `groupByCategory`, or `handlePress`
- Visually inspect `src/navigation/TabNavigator.tsx` — `CategoryProgress` present in type and navigator

## Inputs

- `src/screens/DashboardScreen.tsx` — current dashboard with flat exercise list to be replaced
- `src/navigation/TabNavigator.tsx` — navigation types and stack navigator to extend
- `src/components/CategorySummaryCard.tsx` — S02 component, consumed as-is (props: `{ summary: CategorySummary, isStale: boolean, onPress: () => void }`)
- `src/db/dashboard.ts` — S01 function `getCategorySummaries()` returning `CategorySummary[]`
- `src/types/index.ts` — S01 type `CategorySummary` with fields: `category`, `exerciseCount`, `sparklinePoints`, `lastTrainedAt`, `measurementType`, `currentBest`, `previousBest`

## Expected Output

- `src/navigation/TabNavigator.tsx` — `CategoryProgress` route added to types and navigator
- `src/screens/DashboardScreen.tsx` — fully rewritten to render category cards, dead code removed, ~150 lines shorter
