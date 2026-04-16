/**
 * SQL CREATE TABLE statements for GymTrack database.
 * All tables use IF NOT EXISTS so they are safe to run on every app launch.
 */

export const CREATE_EXERCISES_TABLE = `
  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    default_rest_seconds INTEGER NOT NULL DEFAULT 90,
    is_custom INTEGER NOT NULL DEFAULT 0,
    measurement_type TEXT NOT NULL DEFAULT 'reps',
    created_at TEXT NOT NULL
  )
`;

export const CREATE_WORKOUT_SESSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS workout_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    program_day_id INTEGER,
    program_week INTEGER
  )
`;

export const CREATE_WORKOUT_SETS_TABLE = `
  CREATE TABLE IF NOT EXISTS workout_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES workout_sessions(id),
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    set_number INTEGER NOT NULL,
    weight_kg REAL NOT NULL,
    reps INTEGER NOT NULL,
    logged_at TEXT NOT NULL,
    is_warmup INTEGER NOT NULL DEFAULT 0
  )
`;

export const CREATE_EXERCISE_SESSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS exercise_sessions (
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    session_id INTEGER NOT NULL REFERENCES workout_sessions(id),
    is_complete INTEGER NOT NULL DEFAULT 0,
    rest_seconds INTEGER NOT NULL DEFAULT 90,
    PRIMARY KEY (exercise_id, session_id)
  )
`;

// ── Program tables (Phase 2) ────────────────────────────────────────

export const CREATE_PROGRAMS_TABLE = `
  CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    weeks INTEGER NOT NULL,
    start_date TEXT,
    current_week INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )
`;

export const CREATE_PROGRAM_DAYS_TABLE = `
  CREATE TABLE IF NOT EXISTS program_days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )
`;

export const CREATE_PROGRAM_DAY_EXERCISES_TABLE = `
  CREATE TABLE IF NOT EXISTS program_day_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_day_id INTEGER NOT NULL REFERENCES program_days(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    target_sets INTEGER NOT NULL DEFAULT 3,
    target_reps INTEGER NOT NULL DEFAULT 10,
    target_weight_kg REAL NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  )
`;

export const CREATE_PROGRAM_WEEKS_TABLE = `
  CREATE TABLE IF NOT EXISTS program_weeks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    name TEXT,
    details TEXT,
    UNIQUE(program_id, week_number)
  )
`;

// ── Heart Rate tables (Phase 24) ──────────────────────────────────

export const CREATE_HEART_RATE_SAMPLES_TABLE = `
  CREATE TABLE IF NOT EXISTS heart_rate_samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    bpm INTEGER NOT NULL,
    recorded_at TEXT NOT NULL
  )
`;

// -- Macro Settings table (Phase 30) --

export const CREATE_MACRO_SETTINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS macro_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    protein_goal REAL,
    carb_goal REAL,
    fat_goal REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

// ── Gamification tables ────────────────────────────────────────────────

export const CREATE_BADGES_TABLE = `
  CREATE TABLE IF NOT EXISTS badges (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    tier_thresholds TEXT,
    evaluation_type TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  )
`;

export const CREATE_USER_BADGES_TABLE = `
  CREATE TABLE IF NOT EXISTS user_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    badge_id TEXT NOT NULL REFERENCES badges(id),
    tier INTEGER NOT NULL,
    current_value REAL NOT NULL DEFAULT 0,
    earned_at TEXT NOT NULL,
    notified INTEGER NOT NULL DEFAULT 0
  )
`;

export const CREATE_STREAK_SHIELDS_TABLE = `
  CREATE TABLE IF NOT EXISTS streak_shields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shield_type TEXT NOT NULL,
    earned_at TEXT NOT NULL,
    used_at TEXT,
    used_for_date TEXT
  )
`;

export const CREATE_USER_LEVEL_TABLE = `
  CREATE TABLE IF NOT EXISTS user_level (
    id INTEGER PRIMARY KEY NOT NULL DEFAULT 1,
    current_level INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL DEFAULT 'Beginner',
    consistency_score REAL NOT NULL DEFAULT 0,
    fitness_score REAL NOT NULL DEFAULT 0,
    nutrition_score REAL NOT NULL DEFAULT 0,
    variety_score REAL NOT NULL DEFAULT 0,
    last_calculated TEXT NOT NULL
  )
`;

// ── Muscle Group tables ──────────────────────────────────────────────

export const CREATE_MUSCLE_GROUPS_TABLE = `
  CREATE TABLE IF NOT EXISTS muscle_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_category TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  )
`;

export const CREATE_EXERCISE_MUSCLE_GROUPS_TABLE = `
  CREATE TABLE IF NOT EXISTS exercise_muscle_groups (
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    muscle_group_id INTEGER NOT NULL REFERENCES muscle_groups(id),
    is_primary INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (exercise_id, muscle_group_id)
  )
`;

// ── Warmup tables ──────────────────────────────────────────────────

export const CREATE_WARMUP_EXERCISES_TABLE = `
  CREATE TABLE IF NOT EXISTS warmup_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tracking_type TEXT NOT NULL,
    default_value INTEGER,
    is_custom INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )
`;

export const CREATE_WARMUP_TEMPLATES_TABLE = `
  CREATE TABLE IF NOT EXISTS warmup_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`;

export const CREATE_WARMUP_TEMPLATE_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS warmup_template_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES warmup_templates(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id),
    warmup_exercise_id INTEGER REFERENCES warmup_exercises(id),
    tracking_type TEXT NOT NULL,
    target_value INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0
  )
`;

export const CREATE_WARMUP_SESSION_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS warmup_session_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id),
    warmup_exercise_id INTEGER REFERENCES warmup_exercises(id),
    display_name TEXT NOT NULL,
    tracking_type TEXT NOT NULL,
    target_value INTEGER,
    is_complete INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  )
`;
