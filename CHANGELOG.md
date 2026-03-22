# Changelog

All notable changes to GymTrack are documented here.

---

## v1.5 — Program Data Export
*March 22, 2026*

### New

- **Export Workout Data**: Export any program's completed workout history as a JSON file. The export includes every set, rep, and weight you logged, organized by week and day with an overall completion percentage.

- **Program Card Menu**: Each program card now has a three-dot menu with Export and Delete options — no more long-press to delete.

- **Export Feedback**: A mint-green toast confirms when your export is saved successfully, or a red toast lets you know if something went wrong.

### Improved

- **Smart Partial Exports**: Partially-finished programs export only the work you actually completed, with an accurate completion percentage that accounts for duplicate sessions correctly.

- **Clean Filenames**: Exported files are automatically named with your program name and today's date (e.g., `Push_Pull_Legs_2026-03-22.json`) — special characters are sanitized.

---

## v1.4 — Test Coverage
*March 15 – 17, 2026*

### Improved

- **App Reliability**: Added 358 automated tests covering every screen, component, and database operation in the app. Code coverage now sits at 82% with enforced quality thresholds — bugs are caught before they reach your phone.

---

## v1.3 — Workout Intelligence & Speed
*March 10 – 14, 2026*

### New

- **Calendar View**: See your complete training history on a monthly calendar. Days you worked out are highlighted with mint circles — tap any day to see exactly what you did, including exercises, sets, weights, and reps.

- **Personal Record Detection**: When you beat a personal record during a workout, a gold celebration banner slides in with a double haptic buzz so you know instantly. PRs are marked with a trophy throughout the app.

- **Workout Summary**: After finishing a workout, you'll see a summary card showing your session duration, total sets, volume lifted, exercises completed, and any PRs you hit before returning home.

- **Next Workout Card**: Your dashboard now shows which workout is up next with the program name, day name, and exercise count. One tap starts your session — no extra navigation needed.

- **Per-Exercise Rest Timer**: Each exercise now shows its own rest duration. Tap the timer label during a workout to adjust rest time with +/- 15 second steppers. Your preference is saved for next time.

- **Superset Support**: Group exercises into supersets when building your program. During a workout, supersets alternate automatically between exercises with a round counter, and rest timers are suppressed between superset exercises so you keep moving.

### Improved

- **Faster Set Logging**: +5 / -5 weight buttons flank the weight input so you can adjust without typing. Weight auto-fills correctly when you re-expand an exercise mid-session.

- **Haptic Feedback**: Feel a subtle pulse when you log a set, complete an exercise, or end a workout. PRs get a stronger double-pulse so they feel distinct.

- **PR Highlights in Calendar**: When viewing a past workout in the calendar, personal records are called out in a gold card showing the exercise name, weight, and reps — so you can always find when you set a PR.

### Fixed

- Fixed PR toast animation that could appear before the screen was ready

---

## v1.2 — Meal Library
*March 9, 2026*

### New

- **Meal Library**: Save your go-to meals and log them to today's protein with a single tap. Meals are organized by type — Breakfast, Lunch, Dinner, and Snack — so you can find what you need fast.

- **Add to Library**: Create new saved meals with a name, protein amount, and meal type. Build up your personal library over time.

- **Swipe to Delete**: Remove meals from your library with a quick swipe gesture.

---

## v1.1 — Protein Tracking
*March 7 – 8, 2026*

### New

- **Protein Tab**: A dedicated tab for tracking your daily protein intake. Set a personal goal and watch your progress throughout the day.

- **Meal Logging**: Add meals with protein amounts and categorize them as Breakfast, Lunch, Dinner, or Snack. Edit or delete entries anytime.

- **Protein Chart**: Visualize your daily protein totals over time with an interactive line chart. Filter by day, week, or month. A goal line shows how you're tracking.

- **Quick-Add Buttons**: Your most recent meals appear as one-tap buttons at the top of the Protein screen for fast re-logging.

- **Streak & Weekly Average**: See how many consecutive days you've hit your protein goal, plus your rolling 7-day average.

### Fixed

- Fixed a layout issue that could cause the protein screen header to remount unexpectedly
- Fixed keyboard overlap on Android when adding meals

---

## v1.0 — MVP
*March 5 – 7, 2026*

### New

- **Exercise Library**: Browse 30+ preset exercises organized by category (Chest, Back, Shoulders, Arms, Legs, Core). Add your own custom exercises anytime.

- **Workout Logging**: Start a session, pick your exercises, and log sets with weight and reps. A ghost reference shows what you did last time so you know what to aim for.

- **Rest Timer**: A countdown timer runs between sets with a banner showing time remaining. Keeps you on track without watching the clock.

- **Training Programs**: Create structured programs with multiple training days. Assign exercises to each day with target sets and rep ranges. Reorder exercises with drag handles.

- **Program-Guided Workouts**: Start a workout from your program and exercises are pre-loaded with targets displayed alongside your logging panel. Complete days to track your weekly progress.

- **Dashboard**: See your recent workout activity, exercise progress over time with line charts, and weekly completion checklists for your active programs.

- **Settings**: Clear workout history, manage your data, and access app info.
