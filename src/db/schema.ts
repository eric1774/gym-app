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
    created_at TEXT NOT NULL
  )
`;

export const CREATE_WORKOUT_SESSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS workout_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    program_day_id INTEGER
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
