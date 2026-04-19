# Changelog

All notable changes to GymTrack are documented here.

---

## v2.2 — Warmups, Workout Redesign & Macros Export
*April 2026*

### New

- **Warmup Templates**: Build reusable warmup routines from a new Warmups section under the Library tab. Attach a template to any day of a program so it appears at the top of your session, ready to run through before working sets. Add, reorder, and edit items inside each template.

- **Workout Screen Redesign**: A fresh dark V1 look across the whole workout flow — a compact header with live stats and heart-rate pill, cleaner exercise cards with a context "More" menu, and a slide-up NumberPad for fast weight/rep entry. Sessions feel calmer and more focused on the next set.

- **Ghost Reference History**: Your last session for each exercise now appears as a collapsible peek inside the exercise card, so you can pull up historical sets without leaving the workout screen. Tap the History row in the exercise More menu for the full breakdown.

- **Superset Groups**: Pair exercises into supersets on the workout screen. A purple group panel rotates through members as you log sets and schedules rest only after the last member — keeping superset flow tight.

- **Stopwatch for Timed Exercises**: Exercises measured in time (planks, holds, etc.) now have a built-in start/stop stopwatch. The elapsed duration becomes the logged value — no more guessing.

- **Macros Export**: Export your macro history as JSON for any date range from a new Export button on the Macros chart header. Includes your goals and totals per day.

- **Calories Chart Tab**: A fourth tab on the Macro Intake History chart shows calories alongside protein, carbs, and fat — with a derived goal line tracking your daily target.

- **+Time Rest Buttons**: Add or subtract time from an active rest timer without opening settings.

### Improved

- **Dark Sheets Replace White Alerts**: End Workout, Exercise More, and Swap Conflict now use themed dark bottom sheets instead of stock OS alerts — no more jarring white pop-ups mid-session.

- **Cleaner Exercise Card Meta**: Next-set weight and reps stay in sync with the pending NumberPad target, so what you're about to log matches what's shown above.

- **Add Warmup Placement**: The Add Warmup button moved above the exercise list so warmups are the first thing you see.

### Fixed

- Calendar view was flagging every repeated set at a weight/rep combo as a PR — now only the first qualifying set gets the gold trophy, matching the active-workout rule
- PR flags on previously logged sets no longer break when you toggle a set complete/incomplete
- PR toast no longer fires for in-session non-best sets
- Swapping an exercise mid-session correctly preserves edit targets
- History screen keeps the back arrow on the workout stack
- Superset rotation stays on the last member until rest finishes and syncs the NOW badge correctly
- Rest timer preserves rotation state after a mid-round rest
- Exercise More menu shows live next-set numbers
- Height-based rep exercises get the correct stepper and NumberPad labels
- Android navigation bar no longer bleeds through the NumberPad sheet
- AddWarmupItemModal list scrolls cleanly on long lists
- Various modal + library UI polish

---

## v2.1 — Progress Hub & Training Intelligence
*April 2026*

### New

- **Progress Hub**: A redesigned progress screen with a muscle group grid showing weekly volume and strength changes per body part. Tap any muscle group to drill into individual exercise trends with charts, personal records, and session timelines.

- **Session-over-Session Tracking**: A new Sessions tab on the Progress screen shows cards for each training day with volume and strength deltas compared to your previous session. Tap a card to drill down into per-exercise comparisons. Switch between programs with a dropdown selector.

- **Exercise Swap**: Swap exercises mid-workout or from your program editor. A bottom sheet suggests alternatives targeting the same muscle groups.

- **Multi-Category Muscle Groups**: Exercises now map to specific muscle groups instead of broad categories. The library and picker filter by muscle group, giving you more precise control when building programs.

- **Nutrition Rings on Dashboard**: Animated progress rings for protein, carbs, fat, and calories appear on the dashboard. Tap to jump straight to the Health tab's macro tracker.

- **Height-Based Reps**: A new measurement type for exercises like box jumps where height matters. Log height in inches alongside your reps, with display support across workout logging, ghost references, and exercise detail screens.

- **Program Week Names**: Name and annotate your training weeks (e.g., "Deload Week", "Peak Week"). Manage all weeks at once from the program detail screen.

- **Score-Based Leveling**: Your fitness score is now calculated from real training data — volume, consistency, PRs, and badge bonuses — with tuned thresholds for steady long-term progression.

### Improved

- **Custom SVG Muscle Icons**: Replaced emoji-based muscle group indicators with crisp custom SVG icons across all progress screens.

- **Cleaner Dashboard**: Simplified the main dashboard to a static weekly snapshot card showing sessions completed, PRs hit, and volume change at a glance.

- **Frequently Logged Foods**: The list now shows your top 50 most-used foods (up from 10) and scrolls smoothly so you can find what you need faster.

### Fixed

- Fixed strength percentage on session cards showing wrong values when exercises were added or removed between sessions — now only compares exercises you did in both sessions
- Fixed progress cards showing -100% when there was no training data for the week
- Fixed muscle group progress queries using the wrong field for category matching
- Fixed volume calculations incorrectly including height-based rep exercises
- Fixed dashboard content getting clipped behind the tab bar

---

## v2.0 — Badges, Levels & Achievements
*April 2026*

### New

- **93 Badges to Earn**: A full badge system spanning five categories — Fitness, Nutrition, Consistency, Recovery, and Milestones. Each badge has a shield emblem design with five tiers to chase: Bronze, Silver, Gold, Platinum, and Diamond. Earn badges for hitting PRs, building streaks, logging meals, staying hydrated, and more.

- **Leveling System**: Your level (1–100) reflects your real fitness behavior, not just accumulated points. Four subscales — Consistency, Volume Progress, Nutrition Adherence, and Variety — combine into a composite score that determines your rank from Beginner to Legend.

- **Achievements Screen**: Tap "View All" from the dashboard or your level bar to see every badge in the system. Filter by category, tap locked badges to reveal what it takes to earn them, and track your progress with mini progress bars on each badge you're working toward.

- **Celebration Modals**: When you earn a badge, a full-screen celebration appears with a radial glow animation that intensifies by tier — a subtle copper glow for Bronze, a bright prismatic shimmer for Diamond. Dismiss with a single tap.

- **Streak Shields**: Earn protective shields by maintaining 7-day streaks. Shields automatically save your streak if you miss a single day — no more losing a 50-day streak to one off day. Track your available shields (up to 3 per streak type) on the Achievements screen.

- **Comeback Badges**: Life happens. The system rewards you for coming back — "The Phoenix" for returning after a week off, "Rebuild Stronger" for hitting a PR right after a break, and "Resilient" for rebuilding a streak longer than the one you lost.

- **Welcome Highlight Reel**: If you already have workout and nutrition history when the badge system launches, you'll see a personalized showcase of your top 5 achievements on first open — no flood of 20 modals, just a clean summary of what you've already accomplished.

### Improved

- **Dashboard Updated**: A new level bar at the top shows your current level, rank title, and progress to the next level. Below it, a horizontal strip of your most recently earned badges gives you a quick snapshot of your latest achievements. All existing dashboard content remains unchanged below.

---

## v1.9 — Custom Foods & Meal Builder
*April 2026*

### New

- **Custom Food Database**: Create your own foods by entering macros per 100g (protein, carbs, fat). The app calculates exact macro totals for any portion size you log — just enter the grams and it does the math. Your foods are saved and searchable for future use, with your most frequently logged foods surfacing at the top.

- **Meal Builder**: Build complex meals from multiple foods instead of manually entering macro totals. Select foods, dial in portion sizes with a slide-up gram input, and see a live macro total update as you build. One tap logs everything.

- **Smart Portion Suggestions**: When adding a food to a meal, the builder remembers the last portion size you used for that food and pre-fills it as ghost text — no need to type the same amount twice.

- **Repeat Meals**: See a repeat icon on any builder-created meal in your log. Tap it to instantly load all that meal's foods into a new builder session — perfect for meals you eat regularly.

- **Save to Meal Library**: Toggle "Save to Library" when logging a builder meal to save it for one-tap reuse later. You can also start building directly from the Meal Library screen.

- **Strength/Volume Toggle**: Switch between Strength and Volume views on the dashboard, category progress, and exercise progress screens. An inline pill toggle sits next to the time range filters — tap it to see total volume (weight × reps) trends instead of max weight, all the way through your drill-downs.

- **Edit Targets Mid-Workout**: Tap the target reference on any exercise during a workout to adjust sets, reps, and weight on the fly. Changes are saved immediately to your program — no need to leave the session.

### Improved

- **Categorized Daily Log**: Today's Logs now groups your meals by category — Breakfast, Lunch, Dinner, and Snacks — each in its own card with an item count badge. Only categories with entries are shown, keeping the view clean and organized.

- **Edit Builder Meals**: Tap any builder-created meal in your log to reopen it in the builder with all foods pre-loaded. Change portions, add or remove foods, and save your changes.

- **Tab Renamed**: The "Protein" tab is now "Health" to better reflect the full macro and hydration tracking it provides.

- **Progress Delta Badges**: Progress indicators on the dashboard and category screens now show both gains (green) and declines (red) with proper +/− formatting, instead of hiding negative changes.

- **Persistent Stopwatch**: The stopwatch for timed exercises now survives collapsing and re-expanding exercise cards during your workout — no more losing your timer mid-set.

- **Database Health Check**: A new diagnostic tool in Settings replaces the old Repair Data button. Scan your database for issues across multiple categories, see results at a glance, and fix problems with a single tap.

- **Nutrition Precision**: Calendar day detail now displays accurate decimal values for macros and water intake instead of rounding.

### Fixed

- Fixed an issue where the superset round counter could display a number higher than the target total
- Fixed app startup showing an infinite spinner if the database failed to initialize — now shows a clear error message
- Fixed set deletion not updating the live workout volume counter
- Fixed timed exercise deltas showing wrong format in progress badges

---

## v1.8 — Hydration Tracker
*April 5, 2026*

### New

- **Hydration Tracking**: Track your daily water intake with a dedicated Hydration tab. Log water in customizable cup sizes, see an animated water cup visualization filling up as you drink, and monitor your progress throughout the day.

- **Hydration Goal Setup**: First-time users are guided through a simple setup card to set their daily water target. Edit your goal inline anytime without leaving the screen.

- **Hydration Stats Dashboard**: View your hydration stats at a glance — daily progress and streaks displayed in easy-to-read stat cards right on the Hydration tab.

### Improved

- **Tabbed Nutrition Screen**: The nutrition screen now uses a clean tab bar with an underline active indicator, letting you switch between Macros and Hydration views without extra navigation.

---

## v1.7 — Macros Tracking
*March 2026*

### New

- **Full Macro Tracking**: Log protein, carbs, and fat for every meal — not just protein. Each meal entry now shows all three macros with an auto-calculated calorie count, giving you a complete picture of your nutrition.

- **Macro Goals & Progress Charts**: Set daily targets for protein, carbs, and fat, then track your progress with a three-bar visual breakdown. A chart lets you review macro trends over selectable time ranges — week, month, or 3 months.

- **Macro Progress Card**: See your daily macro intake at a glance with a compact progress card showing each macro as a colored bar against your goal, with inline editing to adjust targets on the fly.

### Improved

- **Meal Logging Redesigned**: The Add Meal and Add Library Meal dialogs now have three-macro inputs (protein, carbs, fat) with a live calorie preview, replacing the old protein-only entry flow.

- **Meal Library Updated**: Saved meals now display full macro breakdowns with colorful macro pills, making it easy to see the nutritional profile of each meal at a glance.

### Fixed

- Fixed a database query bug that could cause incorrect results in certain conditions

---

## v1.6 — Heart Rate Monitoring
*March 2026*

### New

- **Bluetooth Heart Rate Pairing**: Connect any standard Bluetooth heart rate monitor from a scan sheet. The app handles permissions, scanning, and pairing — just strap on your sensor and tap to connect.

- **Live BPM During Workouts**: See your current heart rate in the workout header while you train. The display changes color based on your heart rate zone (warm-up, fat burn, cardio, peak) so you can train at the right intensity.

- **Heart Rate Data Saved With Workouts**: Your average and peak heart rate are automatically recorded for every workout session. View them on the workout summary card after finishing, or revisit them anytime in the calendar day detail.

- **Heart Rate in Settings**: A dedicated Heart Rate Monitor card in Settings lets you pair a new device, see your connected sensor, or unpair when needed.

### Improved

- **Auto-Reconnect**: If your heart rate monitor briefly drops connection during a workout, the app automatically reconnects without interrupting your session. A haptic pulse lets you know if the connection is lost.

- **Dashboard Navigation**: A gear icon in the dashboard header gives you quick access to Settings.

### Fixed

- Fixed a hooks ordering crash that could occur when navigating to the workout screen
- Fixed BPM display flickering during sensor reconnection

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
