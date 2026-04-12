import type { BadgeDefinition } from '../types';

// Helper to create badge definitions with common patterns
function cumulative(
  id: string,
  name: string,
  description: string,
  category: BadgeDefinition['category'],
  iconName: string,
  thresholds: number[],
  events: BadgeDefinition['relevantEvents'],
  evaluateFn: BadgeDefinition['evaluate'],
): BadgeDefinition {
  return {
    id, name, description, category, iconName,
    tierThresholds: thresholds,
    evaluationType: 'cumulative',
    relevantEvents: events,
    evaluate: evaluateFn,
  };
}

function streak(
  id: string,
  name: string,
  description: string,
  category: BadgeDefinition['category'],
  iconName: string,
  thresholds: number[],
  events: BadgeDefinition['relevantEvents'],
  evaluateFn: BadgeDefinition['evaluate'],
): BadgeDefinition {
  return {
    id, name, description, category, iconName,
    tierThresholds: thresholds,
    evaluationType: 'streak',
    relevantEvents: events,
    evaluate: evaluateFn,
  };
}

function oneTime(
  id: string,
  name: string,
  description: string,
  category: BadgeDefinition['category'],
  iconName: string,
  events: BadgeDefinition['relevantEvents'],
  evaluateFn: BadgeDefinition['evaluate'],
): BadgeDefinition {
  return {
    id, name, description, category, iconName,
    tierThresholds: null,
    evaluationType: 'one_time',
    relevantEvents: events,
    evaluate: evaluateFn,
  };
}

// ── SQL Evaluation Helpers ──
// These return functions that query the DB and return a numeric value.
// The badge engine compares this value against tier thresholds.

function sqlCount(query: string, params: unknown[] = []): BadgeDefinition['evaluate'] {
  return async (db: unknown) => {
    const database = db as { executeSql: (sql: string, params?: unknown[]) => Promise<[{ rows: { length: number; item: (i: number) => Record<string, number> } }]> };
    const [result] = await database.executeSql(query, params);
    if (result.rows.length === 0) return 0;
    return result.rows.item(0).value ?? 0;
  };
}

// ══════════════════════════════════════
// BADGE DEFINITIONS (93 total)
// ══════════════════════════════════════

export const BADGE_DEFINITIONS: BadgeDefinition[] = [

  // ── FITNESS: Volume & Strength (10) ──

  cumulative('ton_club', 'The Ton Club', 'Total lifetime volume lifted', 'fitness', 'dumbbell',
    [2000, 10000, 50000, 200000, 500000], ['SET_LOGGED', 'SESSION_COMPLETED'],
    sqlCount(`SELECT COALESCE(SUM(weight_kg * reps), 0) as value FROM workout_sets WHERE is_warmup = 0`)),

  cumulative('set_stacker', 'Set Stacker', 'Total lifetime sets completed', 'fitness', 'layers',
    [100, 500, 1500, 5000, 15000], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets WHERE is_warmup = 0`)),

  cumulative('rep_machine', 'Rep Machine', 'Total lifetime reps performed', 'fitness', 'repeat',
    [500, 2500, 10000, 30000, 100000], ['SET_LOGGED'],
    sqlCount(`SELECT COALESCE(SUM(reps), 0) as value FROM workout_sets WHERE is_warmup = 0`)),

  cumulative('plate_crusher', 'Plate Crusher', 'Heaviest single set logged', 'fitness', 'weight',
    [135, 185, 225, 315, 405], ['SET_LOGGED'],
    sqlCount(`SELECT COALESCE(MAX(weight_kg), 0) as value FROM workout_sets WHERE is_warmup = 0`)),

  cumulative('pr_collector', 'PR Collector', 'Total personal records achieved', 'fitness', 'trophy',
    [5, 20, 50, 100, 250], ['PR_ACHIEVED'],
    sqlCount(`SELECT COUNT(DISTINCT exercise_id || '-' || weight_kg) as value FROM workout_sets ws
      WHERE ws.weight_kg = (SELECT MAX(ws2.weight_kg) FROM workout_sets ws2 WHERE ws2.exercise_id = ws.exercise_id)
      AND ws.is_warmup = 0`)),

  cumulative('session_warrior', 'Session Warrior', 'Total workout sessions completed', 'fitness', 'calendar-check',
    [10, 50, 150, 400, 1000], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sessions WHERE completed_at IS NOT NULL`)),

  cumulative('marathon_lifter', 'Marathon Lifter', 'Longest single session duration (minutes)', 'fitness', 'clock',
    [30, 45, 60, 90, 120], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COALESCE(MAX((julianday(completed_at) - julianday(started_at)) * 1440), 0) as value
      FROM workout_sessions WHERE completed_at IS NOT NULL`)),

  cumulative('volume_day', 'Volume Day', 'Highest volume in a single session', 'fitness', 'trending-up',
    [2000, 5000, 10000, 20000, 40000], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COALESCE(MAX(session_vol), 0) as value FROM (
      SELECT ws.session_id, SUM(ws.weight_kg * ws.reps) as session_vol
      FROM workout_sets ws WHERE ws.is_warmup = 0 GROUP BY ws.session_id)`)),

  cumulative('superset_king', 'Superset King', 'Total superset groups completed', 'fitness', 'git-merge',
    [10, 50, 150, 400, 1000], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COUNT(DISTINCT superset_group_id) as value FROM program_day_exercises WHERE superset_group_id IS NOT NULL`)),

  cumulative('warmup_disciple', 'Warmup Disciple', 'Total warmup sets logged', 'fitness', 'sun',
    [25, 100, 300, 750, 2000], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets WHERE is_warmup = 1`)),

  // ── FITNESS: Category Mastery (7) ──

  cumulative('chest_commander', 'Chest Commander', 'Total chest sets completed', 'fitness', 'chest',
    [50, 200, 500, 1200, 3000], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets ws JOIN exercises e ON ws.exercise_id = e.id WHERE e.category = 'chest' AND ws.is_warmup = 0`)),

  cumulative('back_boss', 'Back Boss', 'Total back sets completed', 'fitness', 'back',
    [50, 200, 500, 1200, 3000], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets ws JOIN exercises e ON ws.exercise_id = e.id WHERE e.category = 'back' AND ws.is_warmup = 0`)),

  cumulative('leg_legend', 'Leg Legend', 'Total leg sets completed', 'fitness', 'leg',
    [50, 200, 500, 1200, 3000], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets ws JOIN exercises e ON ws.exercise_id = e.id WHERE e.category = 'legs' AND ws.is_warmup = 0`)),

  cumulative('shoulder_sentinel', 'Shoulder Sentinel', 'Total shoulder sets completed', 'fitness', 'shoulder',
    [50, 200, 500, 1200, 3000], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets ws JOIN exercises e ON ws.exercise_id = e.id WHERE e.category = 'shoulders' AND ws.is_warmup = 0`)),

  cumulative('arm_architect', 'Arm Architect', 'Total arm sets completed', 'fitness', 'arm',
    [50, 200, 500, 1200, 3000], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets ws JOIN exercises e ON ws.exercise_id = e.id WHERE e.category = 'arms' AND ws.is_warmup = 0`)),

  cumulative('core_crusher', 'Core Crusher', 'Total core sets completed', 'fitness', 'core',
    [50, 200, 500, 1200, 3000], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets ws JOIN exercises e ON ws.exercise_id = e.id WHERE e.category = 'core' AND ws.is_warmup = 0`)),

  cumulative('conditioning_king', 'Conditioning King', 'Total conditioning sets completed', 'fitness', 'conditioning',
    [50, 200, 500, 1200, 3000], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets ws JOIN exercises e ON ws.exercise_id = e.id WHERE e.category = 'conditioning' AND ws.is_warmup = 0`)),

  // ── FITNESS: Performance & PR (6) ──

  cumulative('new_peak', 'New Peak', 'Most PRs in a single session', 'fitness', 'zap',
    [2, 3, 4, 5, 7], ['PR_ACHIEVED', 'SESSION_COMPLETED'],
    sqlCount(`SELECT COALESCE(MAX(pr_count), 0) as value FROM (
      SELECT session_id, COUNT(*) as pr_count FROM (
        SELECT ws.session_id, ws.exercise_id FROM workout_sets ws
        WHERE ws.is_warmup = 0 AND ws.weight_kg = (
          SELECT MAX(ws2.weight_kg) FROM workout_sets ws2
          WHERE ws2.exercise_id = ws.exercise_id AND ws2.logged_at <= ws.logged_at
        )
        GROUP BY ws.session_id, ws.exercise_id
      ) GROUP BY session_id)`)),

  cumulative('category_conqueror', 'Category Conqueror', 'Categories where you hold a PR in every exercise', 'fitness', 'crown',
    [1, 2, 4, 6, 7], ['PR_ACHIEVED'],
    sqlCount(`SELECT COUNT(*) as value FROM (SELECT 1) WHERE 1=0`)), // Complex — evaluated in badgeEngine

  cumulative('pr_streak', 'PR Streak', 'Consecutive sessions with at least one PR', 'fitness', 'flame',
    [3, 5, 8, 12, 20], ['SESSION_COMPLETED', 'PR_ACHIEVED'],
    sqlCount(`SELECT 0 as value`)), // Streak logic evaluated in badgeEngine

  cumulative('weight_climber', 'Weight Climber', 'Consecutive weight increases on same exercise', 'fitness', 'arrow-up',
    [3, 5, 8, 12, 20], ['SET_LOGGED'],
    sqlCount(`SELECT 0 as value`)), // Evaluated in badgeEngine with exercise context

  cumulative('rep_ranger', 'Rep Ranger', 'Times hitting 10+ reps at heaviest weight', 'fitness', 'target',
    [1, 5, 15, 40, 100], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets ws
      WHERE ws.reps >= 10 AND ws.is_warmup = 0
      AND ws.weight_kg = (SELECT MAX(ws2.weight_kg) FROM workout_sets ws2 WHERE ws2.exercise_id = ws.exercise_id)`)),

  cumulative('the_specialist', 'The Specialist', 'Sessions with a specific program', 'fitness', 'bookmark',
    [10, 25, 50, 100, 200], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COALESCE(MAX(session_count), 0) as value FROM (
      SELECT COUNT(*) as session_count FROM workout_sessions ws
      JOIN program_days pd ON ws.program_day_id = pd.id
      WHERE ws.completed_at IS NOT NULL
      GROUP BY pd.program_id)`)),

  // ── FITNESS: Heart Rate (5) ──

  cumulative('heart_monitor', 'Heart Monitor', 'Sessions with HR monitor connected', 'fitness', 'heart',
    [5, 25, 75, 200, 500], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sessions WHERE avg_hr IS NOT NULL AND completed_at IS NOT NULL`)),

  cumulative('zone_warrior', 'Zone Warrior', 'Minutes in HR Zone 4-5', 'fitness', 'activity',
    [30, 120, 500, 1500, 5000], ['SESSION_COMPLETED'],
    sqlCount(`SELECT 0 as value`)), // Requires HR sample analysis — evaluated in badgeEngine

  cumulative('steady_state', 'Steady State', 'Sessions with avg HR in Zone 2-3', 'fitness', 'minus-circle',
    [5, 20, 50, 120, 300], ['SESSION_COMPLETED'],
    sqlCount(`SELECT 0 as value`)), // Requires HR zone config — evaluated in badgeEngine

  cumulative('peak_performer', 'Peak Performer', 'Sessions reaching 90%+ max HR', 'fitness', 'chevrons-up',
    [3, 10, 30, 75, 200], ['SESSION_COMPLETED'],
    sqlCount(`SELECT 0 as value`)), // Requires max HR config — evaluated in badgeEngine

  cumulative('cardio_king', 'Cardio King', 'Estimated calories burned from HR data', 'fitness', 'flame',
    [1000, 5000, 20000, 75000, 200000], ['SESSION_COMPLETED'],
    sqlCount(`SELECT 0 as value`)), // Requires calorie estimation — evaluated in badgeEngine

  // ── NUTRITION: Protein & Macros (10) ──

  cumulative('protein_machine', 'Protein Machine', 'Total protein grams logged', 'nutrition', 'beef',
    [1000, 5000, 20000, 75000, 200000], ['MEAL_LOGGED'],
    sqlCount(`SELECT COALESCE(SUM(protein_grams), 0) as value FROM meals`)),

  cumulative('macro_master', 'Macro Master', 'Days hitting all 3 macro goals', 'nutrition', 'check-circle',
    [5, 20, 60, 150, 365], ['MEAL_LOGGED'],
    sqlCount(`SELECT 0 as value`)), // Requires goal comparison — evaluated in badgeEngine

  streak('protein_faithful', 'Protein Faithful', 'Consecutive days hitting protein goal', 'nutrition', 'shield',
    [7, 14, 30, 60, 100], ['MEAL_LOGGED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)), // Streak evaluated in badgeEngine

  streak('carb_controller', 'Carb Controller', 'Consecutive days hitting carb goal', 'nutrition', 'pie-chart',
    [7, 14, 30, 60, 100], ['MEAL_LOGGED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  streak('fat_balancer', 'Fat Balancer', 'Consecutive days hitting fat goal', 'nutrition', 'droplet',
    [7, 14, 30, 60, 100], ['MEAL_LOGGED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('calorie_counter', 'Calorie Counter', 'Total calories logged', 'nutrition', 'calculator',
    [20000, 100000, 500000, 1500000, 5000000], ['MEAL_LOGGED'],
    sqlCount(`SELECT COALESCE(SUM((mf.protein * 4 + mf.carbs * 4 + mf.fat * 9) * mf.grams / 100.0), 0) as value FROM meal_foods mf`)),

  streak('triple_threat', 'Triple Threat', 'Consecutive days hitting all 3 macros', 'nutrition', 'award',
    [3, 7, 14, 30, 60], ['MEAL_LOGGED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('protein_overachiever', 'Protein Overachiever', 'Days exceeding protein goal by 20%+', 'nutrition', 'trending-up',
    [5, 20, 50, 120, 300], ['MEAL_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('balanced_plate', 'Balanced Plate', 'Days with macros within 5% of targets', 'nutrition', 'sliders',
    [3, 10, 30, 75, 200], ['MEAL_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('macro_streak_king', 'Macro Streak King', 'Longest ever macro streak (any macro)', 'nutrition', 'king',
    [10, 21, 45, 90, 180], ['MEAL_LOGGED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  // ── NUTRITION: Meal Logging (8) ──

  cumulative('meal_logger', 'Meal Logger', 'Total meals logged', 'nutrition', 'utensils',
    [25, 100, 400, 1000, 3000], ['MEAL_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM meals`)),

  cumulative('full_day_tracker', 'Full Day Tracker', 'Days logging all 4 meal types', 'nutrition', 'calendar',
    [5, 20, 60, 150, 365], ['MEAL_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM (
      SELECT local_date FROM meals GROUP BY local_date
      HAVING COUNT(DISTINCT meal_type) >= 4)`)),

  streak('logging_streak', 'Logging Streak', 'Consecutive days logging at least 1 meal', 'nutrition', 'edit',
    [7, 14, 30, 60, 100], ['MEAL_LOGGED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('breakfast_champion', 'Breakfast Champion', 'Breakfasts logged', 'nutrition', 'coffee',
    [10, 50, 150, 365, 1000], ['MEAL_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM meals WHERE meal_type = 'breakfast'`)),

  cumulative('meal_prep_pro', 'Meal Prep Pro', 'Library meals reused', 'nutrition', 'copy',
    [5, 15, 40, 100, 250], ['MEAL_LOGGED'],
    sqlCount(`SELECT 0 as value`)), // Tracked via library meal usage

  cumulative('food_explorer', 'Food Explorer', 'Distinct foods logged', 'nutrition', 'compass',
    [10, 30, 75, 150, 300], ['MEAL_LOGGED'],
    sqlCount(`SELECT COUNT(DISTINCT food_id) as value FROM meal_foods WHERE food_id IS NOT NULL`)),

  cumulative('meal_builder', 'Meal Builder', 'Multi-food meals created', 'nutrition', 'layers',
    [10, 40, 100, 250, 750], ['MEAL_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM (
      SELECT meal_id FROM meal_foods GROUP BY meal_id HAVING COUNT(*) >= 2)`)),

  cumulative('library_architect', 'Library Architect', 'Saved meals in library', 'nutrition', 'archive',
    [3, 10, 25, 50, 100], ['MEAL_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM meal_library`)),

  // ── NUTRITION: Hydration (6) ──

  streak('water_warrior', 'Water Warrior', 'Consecutive days hitting water goal', 'nutrition', 'droplet',
    [7, 14, 30, 60, 100], ['WATER_LOGGED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('ocean_drinker', 'Ocean Drinker', 'Total lifetime water intake (oz)', 'nutrition', 'waves',
    [500, 2500, 10000, 30000, 100000], ['WATER_LOGGED'],
    sqlCount(`SELECT COALESCE(SUM(amount_oz), 0) as value FROM water_logs`)),

  cumulative('hydration_logger', 'Hydration Logger', 'Total water log entries', 'nutrition', 'plus-circle',
    [25, 100, 300, 750, 2000], ['WATER_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM water_logs`)),

  cumulative('overflowing', 'Overflowing', 'Days exceeding water goal by 50%+', 'nutrition', 'cloud-rain',
    [3, 10, 30, 75, 200], ['WATER_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('early_sipper', 'Early Sipper', 'Days logging water before 9 AM', 'nutrition', 'sunrise',
    [5, 20, 50, 120, 300], ['WATER_LOGGED'],
    sqlCount(`SELECT COUNT(DISTINCT local_date) as value FROM water_logs WHERE time(logged_at) < '09:00:00'`)),

  cumulative('steady_flow', 'Steady Flow', 'Days with 4+ separate water entries', 'nutrition', 'bar-chart',
    [5, 15, 40, 100, 250], ['WATER_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM (
      SELECT local_date FROM water_logs GROUP BY local_date HAVING COUNT(*) >= 4)`)),

  // ── NUTRITION: Milestones (4) ──

  cumulative('custom_chef', 'Custom Chef', 'Custom foods created', 'nutrition', 'chef-hat',
    [5, 15, 35, 75, 150], ['MEAL_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM foods WHERE is_custom = 1`)),

  cumulative('nutrition_nerd', 'Nutrition Nerd', 'Days with full macro breakdowns', 'nutrition', 'book-open',
    [5, 20, 60, 150, 365], ['MEAL_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('goal_setter', 'Goal Setter', 'Macro/water goal updates', 'nutrition', 'settings',
    [1, 3, 6, 12, 24], ['MEAL_LOGGED', 'WATER_LOGGED'],
    sqlCount(`SELECT 0 as value`)), // Would need goal change tracking

  cumulative('snack_tracker', 'Snack Tracker', 'Snacks logged', 'nutrition', 'cookie',
    [10, 40, 100, 250, 750], ['MEAL_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM meals WHERE meal_type = 'snack'`)),

  // ── CONSISTENCY (16) ──

  streak('iron_streak', 'Iron Streak', 'Consecutive days with a workout', 'consistency', 'flame',
    [7, 14, 30, 60, 100], ['SESSION_COMPLETED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('complete_athlete', 'Complete Athlete', 'Days with workout + macros + water all hit', 'consistency', 'star',
    [3, 10, 30, 75, 200], ['SESSION_COMPLETED', 'MEAL_LOGGED', 'WATER_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('weekend_warrior', 'Weekend Warrior', 'Weekends with a workout', 'consistency', 'calendar',
    [4, 12, 26, 52, 100], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COUNT(DISTINCT strftime('%Y-%W', started_at)) as value FROM workout_sessions
      WHERE completed_at IS NOT NULL AND (strftime('%w', started_at) = '0' OR strftime('%w', started_at) = '6')`)),

  cumulative('early_bird', 'Early Bird', 'Workouts started before 8 AM', 'consistency', 'sunrise',
    [5, 20, 50, 120, 300], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sessions
      WHERE completed_at IS NOT NULL AND time(started_at) < '08:00:00'`)),

  cumulative('night_owl', 'Night Owl', 'Workouts started after 8 PM', 'consistency', 'moon',
    [5, 20, 50, 120, 300], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sessions
      WHERE completed_at IS NOT NULL AND time(started_at) >= '20:00:00'`)),

  streak('weekly_regular', 'Weekly Regular', 'Consecutive weeks with 3+ workouts', 'consistency', 'repeat',
    [4, 8, 16, 30, 52], ['SESSION_COMPLETED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  streak('monthly_machine', 'Monthly Machine', 'Consecutive months with 12+ workouts', 'consistency', 'grid',
    [2, 4, 8, 12, 24], ['SESSION_COMPLETED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  streak('full_week_fuel', 'Full Week Fuel', 'Consecutive weeks logging meals every day', 'consistency', 'package',
    [2, 4, 8, 16, 30], ['MEAL_LOGGED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('dual_discipline', 'Dual Discipline', 'Days with workout + all meals logged', 'consistency', 'check-square',
    [5, 20, 60, 150, 365], ['SESSION_COMPLETED', 'MEAL_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  streak('program_loyalist', 'Program Loyalist', 'Consecutive weeks following program', 'consistency', 'clipboard',
    [2, 4, 8, 16, 30], ['SESSION_COMPLETED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('variety_pack', 'Variety Pack', 'Most distinct categories in a single week', 'consistency', 'shuffle',
    [3, 4, 5, 6, 7], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COALESCE(MAX(cat_count), 0) as value FROM (
      SELECT strftime('%Y-%W', ws2.started_at) as week, COUNT(DISTINCT e.category) as cat_count
      FROM workout_sessions ws2
      JOIN exercise_sessions es ON es.session_id = ws2.id
      JOIN exercises e ON e.id = es.exercise_id
      WHERE ws2.completed_at IS NOT NULL
      GROUP BY week)`)),

  cumulative('full_spectrum', 'Full Spectrum', 'Weeks training all 7 categories', 'consistency', 'globe',
    [2, 8, 20, 40, 100], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COUNT(*) as value FROM (
      SELECT strftime('%Y-%W', ws2.started_at) as week
      FROM workout_sessions ws2
      JOIN exercise_sessions es ON es.session_id = ws2.id
      JOIN exercises e ON e.id = es.exercise_id
      WHERE ws2.completed_at IS NOT NULL
      GROUP BY week HAVING COUNT(DISTINCT e.category) = 7)`)),

  cumulative('app_veteran', 'App Veteran', 'Days since first workout', 'consistency', 'award',
    [30, 90, 180, 365, 730], ['APP_OPENED'],
    sqlCount(`SELECT COALESCE(CAST(julianday('now') - julianday(MIN(started_at)) AS INTEGER), 0) as value
      FROM workout_sessions WHERE completed_at IS NOT NULL`)),

  cumulative('rest_day_fuel', 'Rest Day Fuel', 'Rest days with macros tracked', 'consistency', 'battery-charging',
    [5, 20, 50, 120, 300], ['MEAL_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('hydro_athlete', 'Hydro Athlete', 'Workout days with water goal hit', 'consistency', 'zap',
    [5, 20, 60, 150, 400], ['WATER_LOGGED', 'SESSION_COMPLETED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('shield_collector', 'Shield Collector', 'Total streak shields earned', 'consistency', 'shield',
    [3, 10, 25, 60, 150], ['DAY_BOUNDARY'],
    sqlCount(`SELECT COUNT(*) as value FROM streak_shields`)),

  // ── RECOVERY (9) ──

  cumulative('the_phoenix', 'The Phoenix', 'Return after 7+ days off', 'recovery', 'refresh-cw',
    [1, 3, 5, 10, 20], ['SESSION_COMPLETED'],
    sqlCount(`SELECT 0 as value`)), // Evaluated in badgeEngine with gap detection

  cumulative('back_on_track', 'Back on Track', 'Hit macros 3 days after missing a week', 'recovery', 'corner-up-right',
    [1, 3, 6, 12, 25], ['MEAL_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('streak_saver', 'Streak Saver', 'Streak shields consumed', 'recovery', 'life-buoy',
    [1, 5, 12, 25, 50], ['DAY_BOUNDARY'],
    sqlCount(`SELECT COUNT(*) as value FROM streak_shields WHERE used_at IS NOT NULL`)),

  cumulative('rebuild_stronger', 'Rebuild Stronger', 'PR within 7 days of return from 7+ day break', 'recovery', 'trending-up',
    [1, 3, 5, 10, 20], ['PR_ACHIEVED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('hydration_reset', 'Hydration Reset', 'Hit water 3 days after missing 3+', 'recovery', 'droplet',
    [1, 3, 6, 12, 25], ['WATER_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  streak('never_skip_monday', 'Never Skip Monday', 'Consecutive Mondays with a workout', 'recovery', 'calendar',
    [4, 8, 16, 30, 52], ['SESSION_COMPLETED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('resilient', 'Resilient', 'Rebuild a streak higher than before it broke', 'recovery', 'rotate-ccw',
    [1, 3, 5, 10, 20], ['DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('full_recovery', 'Full Recovery', 'After 14+ days off, 7 workouts in 14 days', 'recovery', 'heart',
    [1, 2, 4, 7, 15], ['SESSION_COMPLETED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('second_wind', 'Second Wind', 'Log meal after 5+ days no nutrition tracking', 'recovery', 'wind',
    [1, 3, 6, 12, 25], ['MEAL_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  // ── MILESTONE: One-Time Trophies (12) ──

  oneTime('first_blood', 'First Blood', 'Complete your very first workout', 'milestone', 'star',
    ['SESSION_COMPLETED'],
    sqlCount(`SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END as value FROM workout_sessions WHERE completed_at IS NOT NULL`)),

  oneTime('first_fuel', 'First Fuel', 'Log your very first meal', 'milestone', 'utensils',
    ['MEAL_LOGGED'],
    sqlCount(`SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END as value FROM meals`)),

  oneTime('first_drop', 'First Drop', 'Log your first water intake', 'milestone', 'droplet',
    ['WATER_LOGGED'],
    sqlCount(`SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END as value FROM water_logs`)),

  oneTime('gold_standard', 'Gold Standard', 'Achieve your first personal record', 'milestone', 'trophy',
    ['PR_ACHIEVED'],
    sqlCount(`SELECT 0 as value`)), // Detected by PR event

  oneTime('heart_connected', 'Heart Connected', 'First workout with HR monitor', 'milestone', 'heart',
    ['SESSION_COMPLETED'],
    sqlCount(`SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END as value
      FROM workout_sessions WHERE avg_hr IS NOT NULL AND completed_at IS NOT NULL`)),

  oneTime('program_graduate', 'Program Graduate', 'Complete all weeks of a program', 'milestone', 'graduation-cap',
    ['SESSION_COMPLETED'],
    sqlCount(`SELECT 0 as value`)), // Evaluated in badgeEngine

  oneTime('century_club', 'Century Club', 'Complete your 100th workout', 'milestone', 'hash',
    ['SESSION_COMPLETED'],
    sqlCount(`SELECT CASE WHEN COUNT(*) >= 100 THEN 1 ELSE 0 END as value FROM workout_sessions WHERE completed_at IS NOT NULL`)),

  oneTime('perfect_day', 'Perfect Day', 'Workout + all macros + water + all 4 meal types', 'milestone', 'sun',
    ['SESSION_COMPLETED', 'MEAL_LOGGED', 'WATER_LOGGED'],
    sqlCount(`SELECT 0 as value`)), // Complex cross-domain — evaluated in badgeEngine

  oneTime('recipe_creator', 'Recipe Creator', 'Save your first library meal', 'milestone', 'book',
    ['MEAL_LOGGED'],
    sqlCount(`SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END as value FROM meal_library`)),

  oneTime('custom_creator', 'Custom Creator', 'Create your first custom food', 'milestone', 'edit-3',
    ['MEAL_LOGGED'],
    sqlCount(`SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END as value FROM foods WHERE is_custom = 1`)),

  oneTime('one_year_strong', 'One Year Strong', '365 days since first activity', 'milestone', 'calendar',
    ['APP_OPENED'],
    sqlCount(`SELECT CASE WHEN CAST(julianday('now') - julianday(MIN(started_at)) AS INTEGER) >= 365 THEN 1 ELSE 0 END as value
      FROM workout_sessions WHERE completed_at IS NOT NULL`)),

  oneTime('badge_hunter', 'Badge Hunter', 'Earn your first 10 badges', 'milestone', 'search',
    ['SET_LOGGED', 'SESSION_COMPLETED', 'MEAL_LOGGED', 'WATER_LOGGED', 'PR_ACHIEVED'],
    sqlCount(`SELECT CASE WHEN COUNT(*) >= 10 THEN 1 ELSE 0 END as value FROM user_badges`)),
];

// ── Lookup helpers ──

export function getBadgeDefinition(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find(b => b.id === id);
}

export function getBadgesByCategory(category: BadgeDefinition['category']): BadgeDefinition[] {
  return BADGE_DEFINITIONS.filter(b => b.category === category);
}

export function getBadgesForEvent(eventType: BadgeDefinition['relevantEvents'][number]): BadgeDefinition[] {
  return BADGE_DEFINITIONS.filter(b => b.relevantEvents.includes(eventType));
}
