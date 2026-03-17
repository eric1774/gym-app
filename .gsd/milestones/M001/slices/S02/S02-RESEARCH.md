# Phase 5: Protein Tab and Meal Logging - Research

**Researched:** 2026-03-07
**Domain:** React Native UI (bottom tab, progress bar, modal forms, list CRUD, swipe gestures)
**Confidence:** HIGH

## Summary

Phase 5 builds a new Protein tab screen with daily goal tracking, meal CRUD operations, and a progress bar. The entire data layer (protein repository, types, date utilities) was completed in Phase 4 and is already exported from `src/db/index.ts`. This phase is purely UI work.

The project has strong established patterns for every UI primitive needed: bottom tabs with inline SVG icons (TabNavigator.tsx), modal forms with add/edit mode (AddExerciseModal.tsx), horizontal pill selectors (ExerciseCategoryTabs.tsx), progress bars using View width percentage (RestTimerBanner.tsx), Alert.alert for delete confirmations, and FlatList/ScrollView for lists. All of these can be directly replicated for the protein domain.

**Primary recommendation:** Build entirely with existing React Native built-in components and project patterns. No new npm dependencies needed. Swipe-to-delete uses PanResponder + Animated (already used in SetListItem.tsx). Date/time backdate uses simple TextInput-based date entry or a custom picker modal with ScrollView selectors, avoiding native DatePicker dependencies.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Goal progress bar at top of screen, always visible without scrolling
- Horizontal progress bar (not circular gauge) showing percentage + "Xg / Yg" text
- Full-width "Add Meal" button below the progress bar
- Today's meal list below the Add Meal button, scrollable
- Protein tab positioned as rightmost (5th) tab: Home, Library, Programs, Workout, Protein
- First visit (no goal set): inline goal setup directly on the Protein screen -- input field with "Set your daily goal" prompt and Set Goal button
- No modal or separate screen for initial goal setup
- 200g shown as grey placeholder text (not pre-filled) -- user must type their own value
- After goal is set, progress bar replaces the setup prompt
- To change goal: tap the progress bar area -> inline edit transforms in-place with editable input + Save/Cancel buttons
- Full-screen modal following existing AddExerciseModal pattern for Add/Edit Meal
- Meal type picker: horizontal pill buttons (4 pills: Breakfast, Lunch, Dinner, Snack) -- similar to ExerciseCategoryTabs component
- Meal type is required
- Protein grams: numeric keypad with decimal support (allows 30.5g etc.)
- Description field: optional -- user can skip for quick logging
- Backdate option included: optional "When?" field defaults to now, allows picking a different date/time
- Same modal used for edit mode (pre-filled with existing meal data)
- Flat chronological list, newest meal first (matches getMealsByDate query order)
- Each row shows: meal type label, description (if any), protein grams
- Tap a meal row -> opens edit modal (same as Add Meal, pre-filled)
- Swipe left to reveal red Delete button -> confirmation alert before deletion
- Empty state: simple text "No meals logged today" -- minimal, no illustrations

### Claude's Discretion
- Carrot icon SVG design for the Protein tab
- Exact styling, spacing, and animation of progress bar fill
- Date/time picker implementation for backdate option
- Swipe-to-delete gesture library choice or implementation
- Loading states and error handling
- Header styling and screen title treatment

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | User can see a "Protein" tab with carrot icon in bottom navigation | TabNavigator.tsx pattern: add 5th tab with inline SVG CarrotIcon component, ProteinTab entry in TabParamList, ProteinStackNavigator |
| GOAL-01 | User can set a daily protein goal (e.g., 200g) | protein.ts `setProteinGoal()` + `getProteinGoal()` already exist; UI is inline goal setup form on first visit, then tap-to-edit on progress bar |
| GOAL-02 | User can see a progress bar that fills as meals are logged | RestTimerBanner.tsx progress bar pattern (View width percentage); `getTodayProteinTotal()` for current value, `getProteinGoal()` for max |
| GOAL-03 | Progress bar resets at midnight for each new day | `getTodayProteinTotal()` uses `getLocalDateString()` which auto-resets per calendar day; `useFocusEffect` re-fetches on tab focus |
| MEAL-01 | User can tap "Add Meal" to open a modal with protein amount and description | AddExerciseModal.tsx pattern: Modal with form state, submit/cancel, reset on close; MealTypePills component from ExerciseCategoryTabs pattern |
| MEAL-02 | User can view today's logged meals below the Add Meal button | `getMealsByDate(getLocalDateString())` returns meals newest-first; FlatList rendering with meal row component |
| MEAL-03 | User can edit a meal's description, amount, or date | Same modal as MEAL-01 in edit mode (editMeal prop); `updateMeal()` repository function |
| MEAL-04 | User can delete a meal entry from the history view | Swipe-to-delete with PanResponder + Animated (SetListItem pattern) + Alert.alert confirmation + `deleteMeal()` |

</phase_requirements>

## Standard Stack

### Core (already installed -- zero new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native | 0.84.1 | Framework | Project framework |
| @react-navigation/bottom-tabs | ^7.15.5 | Tab navigator | Already used for 4-tab layout |
| @react-navigation/native-stack | ^7.14.4 | Stack navigator | Already used in other tabs |
| react-native-svg | ^15.15.3 | SVG icons | Already used for all tab icons |
| react-native-safe-area-context | ^5.5.2 | Safe area insets | Already used in all screens |
| react-native-sqlite-storage | ^6.0.1 | SQLite database | Already used for data layer |

### Supporting (built-in React Native APIs)

| API | Purpose | When to Use |
|-----|---------|-------------|
| `Animated` + `PanResponder` | Swipe-to-delete gesture | MealListItem swipe interaction |
| `Alert.alert()` | Delete confirmation dialog | Before deleting a meal |
| `Modal` | Add/Edit Meal form | Full-screen modal sheet |
| `TextInput` with `keyboardType="decimal-pad"` | Numeric input with decimals | Protein grams entry |
| `FlatList` | Scrollable meal list | Today's meal history |
| `View` width percentage | Progress bar fill | Protein goal progress |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PanResponder swipe | react-native-gesture-handler Swipeable | Better perf but adds native dependency -- project has zero gesture handler deps, PanResponder is sufficient for single-row swipe |
| Custom date picker | @react-native-community/datetimepicker | Native look but adds native dependency requiring rebuild -- simple custom picker or text input sufficient for occasional backdating |
| Animated width progress bar | react-native-progress or Reanimated | Overkill for a static percentage bar -- existing RestTimerBanner pattern works perfectly |

**Installation:** None required. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure

```
src/
  screens/
    ProteinScreen.tsx          # Main protein tab screen (goal + meals)
    AddMealModal.tsx           # Add/Edit meal modal
  components/
    ProteinProgressBar.tsx     # Goal progress bar with tap-to-edit
    GoalSetupForm.tsx          # Inline first-time goal setup
    MealListItem.tsx           # Swipeable meal row
    MealTypePills.tsx          # Horizontal pill selector (Breakfast/Lunch/Dinner/Snack)
  navigation/
    TabNavigator.tsx           # Modified: add ProteinTab (5th tab)
```

### Pattern 1: Tab Navigator Extension

**What:** Add 5th tab following the exact pattern of existing 4 tabs.
**When to use:** This is the only way to add the Protein tab.
**Example:**

```typescript
// In TabNavigator.tsx -- follows existing icon pattern exactly
export type TabParamList = {
  DashboardTab: undefined;
  LibraryTab: undefined;
  ProgramsTab: undefined;
  WorkoutTab: undefined;
  ProteinTab: undefined;  // NEW
};

export type ProteinStackParamList = {
  ProteinHome: undefined;
};

// CarrotIcon follows same pattern as HomeIcon, BookIcon, etc.
function CarrotIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      {/* Carrot SVG paths */}
    </Svg>
  );
}

// ProteinStackNavigator wraps ProteinScreen (like WorkoutStackNavigator)
function ProteinStackNavigator() {
  return (
    <ProteinStack.Navigator screenOptions={{ headerShown: false }}>
      <ProteinStack.Screen name="ProteinHome" component={ProteinScreen} />
    </ProteinStack.Navigator>
  );
}

// Add as 5th tab (rightmost)
<Tab.Screen
  name="ProteinTab"
  component={ProteinStackNavigator}
  options={{
    tabBarLabel: 'Protein',
    tabBarIcon: ({ color }) => <CarrotIcon color={color} />,
  }}
/>
```

### Pattern 2: Screen with Conditional Rendering (Goal Setup vs. Tracking)

**What:** ProteinScreen renders two different views based on whether a goal is set.
**When to use:** First visit vs. returning user flow.
**Example:**

```typescript
// ProteinScreen.tsx
export function ProteinScreen() {
  const [goal, setGoal] = useState<number | null>(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Re-fetch on tab focus (handles midnight reset naturally)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [g, total, todayMeals] = await Promise.all([
          getProteinGoal(),
          getTodayProteinTotal(),
          getMealsByDate(getLocalDateString()),
        ]);
        if (!cancelled) {
          setGoal(g);
          setTodayTotal(total);
          setMeals(todayMeals);
          setIsLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, []),
  );

  if (isLoading) return <ActivityIndicator />;

  // No goal set: show inline setup
  if (goal === null) {
    return <GoalSetupForm onGoalSet={(g) => setGoal(g)} />;
  }

  // Goal set: show progress + meals
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ProteinProgressBar goal={goal} current={todayTotal} onGoalChanged={setGoal} />
      <AddMealButton onPress={() => setModalVisible(true)} />
      <MealList meals={meals} onEdit={handleEdit} onDelete={handleDelete} />
    </SafeAreaView>
  );
}
```

### Pattern 3: Modal with Add/Edit Mode (from AddExerciseModal)

**What:** Same modal component serves both "add new" and "edit existing" modes, with pre-filling on edit.
**When to use:** AddMealModal for both adding and editing meals.
**Example:**

```typescript
// AddMealModal.tsx -- follows AddExerciseModal pattern exactly
interface AddMealModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: (meal: Meal) => void;
  editMeal?: Meal | null;  // When set, operates in edit mode
}

export function AddMealModal({ visible, onClose, onSaved, editMeal }: AddMealModalProps) {
  const isEditMode = !!editMeal;
  const [proteinGrams, setProteinGrams] = useState('');
  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [loggedAt, setLoggedAt] = useState<Date>(new Date());

  // Pre-fill when editing
  React.useEffect(() => {
    if (editMeal && visible) {
      setProteinGrams(String(editMeal.proteinGrams));
      setDescription(editMeal.description);
      setMealType(editMeal.mealType);
      setLoggedAt(new Date(editMeal.loggedAt));
    }
  }, [editMeal, visible]);

  const handleSubmit = async () => {
    if (isEditMode && editMeal) {
      const updated = await updateMeal(editMeal.id, parseFloat(proteinGrams), description, mealType!, loggedAt);
      onSaved(updated);
    } else {
      const meal = await addMeal(parseFloat(proteinGrams), description, mealType!, loggedAt);
      onSaved(meal);
    }
    handleClose();
  };
  // ...
}
```

### Pattern 4: Swipe-to-Delete with PanResponder

**What:** Swipe left on a meal row to reveal a Delete button, using React Native built-in PanResponder and Animated.
**When to use:** MealListItem component for each meal row.
**Example:**

```typescript
// MealListItem.tsx -- swipe-to-delete using PanResponder + Animated
export function MealListItem({ meal, onEdit, onDelete }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const DELETE_THRESHOLD = -80; // Width of delete button area

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) { // Only allow left swipe
          translateX.setValue(Math.max(gs.dx, DELETE_THRESHOLD));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < DELETE_THRESHOLD / 2) {
          // Snap open
          Animated.spring(translateX, { toValue: DELETE_THRESHOLD, useNativeDriver: true }).start();
        } else {
          // Snap closed
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  return (
    <View style={styles.swipeContainer}>
      {/* Delete button behind the row */}
      <TouchableOpacity style={styles.deleteAction} onPress={onDelete}>
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
      {/* Sliding meal row */}
      <Animated.View
        style={[styles.mealRow, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}>
        <TouchableOpacity onPress={() => onEdit(meal)} activeOpacity={0.7}>
          {/* Meal content */}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
```

### Pattern 5: Inline Goal Editing (Tap Progress Bar -> In-Place Edit)

**What:** Tapping the progress bar transforms it into an editable input with Save/Cancel.
**When to use:** ProteinProgressBar component for changing the daily goal.

```typescript
// ProteinProgressBar.tsx
export function ProteinProgressBar({ goal, current, onGoalChanged }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(goal));

  if (isEditing) {
    return (
      <View style={styles.editContainer}>
        <TextInput
          style={styles.goalInput}
          value={editValue}
          onChangeText={setEditValue}
          keyboardType="number-pad"
          autoFocus
        />
        <TouchableOpacity onPress={handleSave}><Text>Save</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setIsEditing(false)}><Text>Cancel</Text></TouchableOpacity>
      </View>
    );
  }

  const progress = goal > 0 ? Math.min(current / goal, 1) : 0;
  const percentage = Math.round(progress * 100);

  return (
    <TouchableOpacity onPress={() => { setEditValue(String(goal)); setIsEditing(true); }}>
      <Text style={styles.progressText}>{percentage}% -- {current}g / {goal}g</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </TouchableOpacity>
  );
}
```

### Anti-Patterns to Avoid

- **Do NOT use Context/Provider for protein state:** The protein screen is self-contained with no cross-tab state sharing. Use local useState + useFocusEffect to re-fetch. The workout domain uses SessionContext because state must persist across navigation -- protein does not have this requirement.
- **Do NOT animate progress bar on every meal add:** A simple re-render with the new width percentage is sufficient. Adding Animated.timing for the progress fill would introduce unnecessary complexity for negligible visual benefit.
- **Do NOT use FlatList for a small list:** Today's meals are typically 3-6 items. A simple ScrollView with mapped items would work, but FlatList is fine for future-proofing if users log many meals.
- **Do NOT create a separate "EditGoal" screen or modal:** The user decided on inline editing (tap progress bar -> in-place edit). Keep it simple.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Protein data CRUD | Custom SQL queries | `src/db/protein.ts` exports (addMeal, updateMeal, deleteMeal, getMealsByDate, etc.) | Already complete from Phase 4 with proper date handling |
| Local date strings | Manual date formatting | `src/utils/dates.ts` (getLocalDateString, getLocalDateTimeString) | Handles timezone-safe day boundaries correctly |
| Meal type constants | Hardcoded strings | `MEAL_TYPES` array and `MealType` type from `src/types/index.ts` | Type-safe, already defined |
| SVG tab icons | PNG/image assets | Inline SVG components with `react-native-svg` (existing pattern) | Matches all other tab icons, color prop works with tint |
| Delete confirmation | Custom modal | `Alert.alert()` with destructive button | Existing pattern used in 5+ places in the codebase |
| Tab navigation setup | Manual navigation | `createBottomTabNavigator` with typed params | Existing pattern, just add one more entry |

**Key insight:** Phase 4 built the entire data layer. Phase 5 is 100% UI. Every database operation needed is already a tested, exported function.

## Common Pitfalls

### Pitfall 1: Midnight Reset Not Working
**What goes wrong:** Progress bar shows yesterday's total when the app stays open past midnight.
**Why it happens:** State is cached from the last `useFocusEffect` call and not re-fetched on date change.
**How to avoid:** Use `useFocusEffect` to re-fetch `getTodayProteinTotal()` and `getMealsByDate(getLocalDateString())` every time the tab gains focus. `getLocalDateString()` is called at fetch time, so it naturally returns the new date. No timer or AppState listener needed -- tab focus handles it.
**Warning signs:** After midnight, progress bar still shows values from yesterday.

### Pitfall 2: addMeal Throws When No Goal Set
**What goes wrong:** Calling `addMeal()` before `setProteinGoal()` throws `"Protein goal must be set before logging meals"`.
**Why it happens:** Phase 4 decision -- `addMeal` enforces goal-first workflow.
**How to avoid:** The UI already handles this by showing `GoalSetupForm` when `getProteinGoal()` returns null. The "Add Meal" button only appears after goal is set. Still wrap `addMeal` in try/catch for safety.
**Warning signs:** Error when tapping Add Meal on first use.

### Pitfall 3: Decimal Protein Input Parsing
**What goes wrong:** User enters "30.5" but `parseInt` converts to 30, losing the decimal.
**Why it happens:** Using `parseInt` instead of `parseFloat` for protein grams.
**How to avoid:** Always use `parseFloat()` for protein grams. Validate: not NaN, greater than 0, reasonable max (e.g., 500g). Use `keyboardType="decimal-pad"` on TextInput.
**Warning signs:** Protein totals consistently lower than entered values.

### Pitfall 4: Stale Meal List After Add/Edit/Delete
**What goes wrong:** After adding/editing/deleting a meal, the list and progress bar don't update.
**Why it happens:** Not re-fetching data after mutation.
**How to avoid:** After every mutation (add/edit/delete), re-fetch both `getTodayProteinTotal()` and `getMealsByDate()` and update state. The `onSaved` callback from AddMealModal should trigger this refresh.
**Warning signs:** Meal appears in list only after switching tabs and back.

### Pitfall 5: 5-Tab Layout Cramped on Small Screens
**What goes wrong:** Tab labels overlap or get truncated on small Android phones.
**Why it happens:** 5 tabs with labels at fontSize 11 can be tight on narrow screens.
**How to avoid:** Keep tab labels short ("Protein" is 7 chars, similar to "Workout"). The existing tab bar config with fontSize 11 and weight 600 should work. Test on a 5-inch screen width.
**Warning signs:** Tab labels cut off or overlapping on smaller devices.

### Pitfall 6: PanResponder Conflicts with ScrollView
**What goes wrong:** Swipe-to-delete gesture conflicts with FlatList/ScrollView vertical scrolling.
**Why it happens:** PanResponder captures all touch movements by default.
**How to avoid:** In `onMoveShouldSetPanResponder`, only capture when horizontal movement (|dx|) exceeds vertical movement (|dy|) AND exceeds a minimum threshold (10px). This ensures vertical scrolling works normally.
**Warning signs:** User can't scroll the meal list, or swipe gesture triggers during scrolling.

### Pitfall 7: Backdate Affects Wrong Day
**What goes wrong:** User backdates a meal to yesterday but it appears in today's list.
**Why it happens:** If backdate only changes `logged_at` but not `local_date`.
**How to avoid:** The repository's `addMeal` already calculates `local_date` from `loggedAt` parameter automatically. Similarly, `updateMeal` recalculates `local_date` from `loggedAt`. After backdating, the meal will correctly appear on the backdated day, not today. The UI should re-fetch today's meals after save -- the backdated meal will simply not appear in today's list (correct behavior).
**Warning signs:** Meal backdated to yesterday still shows in today's list.

## Code Examples

### Carrot Icon SVG (22px, matching existing tab icons)

```typescript
// Source: Custom design following existing tab icon pattern in TabNavigator.tsx
function CarrotIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      {/* Carrot body */}
      <Path
        d="M12 22C12 22 7 15 7 10C7 7.5 9.24 4 12 4C14.76 4 17 7.5 17 10C17 15 12 22 12 22Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Carrot leaves */}
      <Path
        d="M12 4C12 4 10 2 8 2M12 4C12 4 14 2 16 2M12 4V2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
```

Note: The exact carrot design is at Claude's discretion. The pattern above shows the correct structure matching existing icons. A simpler or more stylized carrot may be preferable.

### MealTypePills (from ExerciseCategoryTabs pattern)

```typescript
// Source: Based on src/components/ExerciseCategoryTabs.tsx pattern
import { MEAL_TYPES, MealType } from '../types';

interface MealTypePillsProps {
  selected: MealType | null;
  onSelect: (t: MealType) => void;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function MealTypePills({ selected, onSelect }: MealTypePillsProps) {
  return (
    <View style={styles.row}>
      {MEAL_TYPES.map(type => {
        const isSelected = type === selected;
        return (
          <TouchableOpacity
            key={type}
            onPress={() => onSelect(type)}
            style={[styles.pill, isSelected ? styles.pillSelected : styles.pillUnselected]}>
            <Text style={[styles.pillText, isSelected ? styles.pillTextSelected : styles.pillTextUnselected]}>
              {capitalize(type)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
```

Note: Unlike ExerciseCategoryTabs which uses ScrollView (7 items), MealTypePills has only 4 items and can use a simple `flexDirection: 'row'` View with flex: 1 on each pill. No horizontal scrolling needed.

### Progress Bar (from RestTimerBanner pattern)

```typescript
// Source: Based on src/components/RestTimerBanner.tsx progress bar pattern
const progress = goal > 0 ? Math.min(current / goal, 1) : 0;
const percentage = Math.round(progress * 100);

<View>
  <Text style={styles.progressText}>{percentage}% {'\u2014'} {current}g / {goal}g</Text>
  <View style={styles.progressTrack}>
    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
  </View>
</View>

// Styles
progressTrack: {
  height: 8,
  backgroundColor: colors.surfaceElevated,
  borderRadius: 4,
  overflow: 'hidden',
},
progressFill: {
  height: 8,
  backgroundColor: colors.accent,
  borderRadius: 4,
},
```

### Backdate Implementation (Claude's Discretion)

**Recommendation:** Use a simple "When?" touchable that defaults to "Now" and opens a custom picker when tapped. Given the project's zero-dependency constraint and the fact that backdating is an optional, infrequent action, a simple approach is best:

```typescript
// Option A (Recommended): Simple date text input
// Show "Now" by default. Tap to show date/time text inputs.
// Format: "YYYY-MM-DD HH:MM" text input with validation.
// Pros: No dependencies, simple, matches project style.

// Option B: Custom ScrollView wheel picker
// Build a modal with 3 ScrollViews (month/day/hour).
// Pros: Better UX. Cons: More code to build.

// Option C: @react-native-community/datetimepicker
// Native platform picker. Requires `npx pod-install` and native rebuild.
// Pros: Best UX. Cons: Adds native dependency, rebuild required.
```

**Recommended: Option A** -- a touchable that shows/hides date and time TextInput fields. The user types "2026-03-06 14:30" or similar. Validation ensures the date is valid and not in the future. This matches the project's minimal, no-extra-dependencies philosophy. For a gym app where backdating is rare (forgot to log a meal earlier), this is sufficient.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate add/edit screens | Single modal with mode prop | React Native standard | Less navigation, faster UX |
| react-native-gesture-handler for swipe | PanResponder sufficient for simple swipe | Always available | No extra dependency for single-direction swipe |
| Circular progress gauge | Horizontal progress bar | User decision | Simpler, more informative at a glance |
| UTC date strings | Local date strings via getLocalDateString() | Phase 4 decision | Correct day boundaries |

**Deprecated/outdated:**
- `DatePickerIOS` is deprecated in React Native -- use @react-native-community/datetimepicker if adding native picker
- `componentWillReceiveProps` pattern for edit mode pre-fill -- use `useEffect` with dependency array (already the project pattern)

## Open Questions

1. **Carrot Icon SVG Design**
   - What we know: Must be 22x22 viewBox 0 0 24 24, stroke-only, color prop for tint
   - What's unclear: Exact carrot shape/style
   - Recommendation: Create a simple stylized carrot (tapered body + leaf sprouts). Test at 22px for clarity. Can iterate on design after initial implementation.

2. **Progress Bar Animation**
   - What we know: RestTimerBanner uses static width percentage (no animation)
   - What's unclear: Whether progress bar should animate when updating
   - Recommendation: Start with no animation (instant width update on re-render). Add subtle Animated.timing for width changes only if it feels too abrupt during testing.

3. **Backdate Picker UX**
   - What we know: User wants "When?" field with default "now" and option to pick different date/time
   - What's unclear: Exact picker style -- text input vs custom wheel
   - Recommendation: Start with touchable "Now" label that expands to show date + time TextInputs. Simple, no dependencies, can upgrade later if needed.

## Sources

### Primary (HIGH confidence)
- **Project source code** (TabNavigator.tsx, AddExerciseModal.tsx, ExerciseCategoryTabs.tsx, RestTimerBanner.tsx, SetListItem.tsx, protein.ts, types/index.ts, dates.ts) -- Direct analysis of existing patterns, the authoritative source for project conventions
- **Phase 4 repository API** (src/db/protein.ts, src/db/index.ts) -- Complete data layer already built and exported

### Secondary (MEDIUM confidence)
- [PanResponder official docs](https://reactnative.dev/docs/panresponder) -- React Native built-in gesture API
- [@react-native-community/datetimepicker npm](https://www.npmjs.com/package/@react-native-community/datetimepicker) -- Alternative date picker (not recommended for this project)
- [React Native Animated API](https://reactnative.dev/docs/animated) -- For swipe gesture translateX animation

### Tertiary (LOW confidence)
- [Swipeable component with Animated API - DEV Community](https://dev.to/paulo_s/swipeable-component-with-the-animated-api-4hef) -- Community tutorial on PanResponder swipe pattern
- [React Native FlatList swipe to delete](https://vocal.media/education/react-native-flatlist-swipe-to-delete-item) -- Community implementation reference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all libraries already installed and patterned
- Architecture: HIGH -- every UI pattern needed exists in the codebase and can be directly replicated
- Pitfalls: HIGH -- known issues documented from Phase 4 decisions (addMeal throws, date boundaries) and standard React Native gotchas (PanResponder + ScrollView, decimal parsing)

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable -- no moving parts, all dependencies locked)