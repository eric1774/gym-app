import { db, executeSql, runTransaction } from './database';
import { ExerciseCategory, ExerciseMeasurementType } from '../types';

interface PresetExercise {
  name: string;
  category: ExerciseCategory;
  measurementType?: ExerciseMeasurementType;
}

const PRESET_EXERCISES: PresetExercise[] = [
  // Chest
  { name: 'Bench Press', category: 'chest' },
  { name: 'Incline Bench Press', category: 'chest' },
  { name: 'Cable Fly', category: 'chest' },
  { name: 'Push-Up', category: 'chest' },
  { name: 'Chest Dip', category: 'chest' },
  { name: 'Decline Bench Press', category: 'chest' },

  // Back
  { name: 'Deadlift', category: 'back' },
  { name: 'Pull-Up', category: 'back' },
  { name: 'Barbell Row', category: 'back' },
  { name: 'Lat Pulldown', category: 'back' },
  { name: 'Cable Row', category: 'back' },
  { name: 'Face Pull', category: 'back' },

  // Legs
  { name: 'Squat', category: 'legs' },
  { name: 'Romanian Deadlift', category: 'legs' },
  { name: 'Leg Press', category: 'legs' },
  { name: 'Leg Curl', category: 'legs' },
  { name: 'Leg Extension', category: 'legs' },
  { name: 'Calf Raise', category: 'legs' },

  // Shoulders
  { name: 'Overhead Press', category: 'shoulders' },
  { name: 'Lateral Raise', category: 'shoulders' },
  { name: 'Front Raise', category: 'shoulders' },
  { name: 'Arnold Press', category: 'shoulders' },
  { name: 'Rear Delt Fly', category: 'shoulders' },
  { name: 'Shrug', category: 'shoulders' },

  // Arms
  { name: 'Bicep Curl', category: 'arms' },
  { name: 'Hammer Curl', category: 'arms' },
  { name: 'Tricep Pushdown', category: 'arms' },
  { name: 'Skull Crusher', category: 'arms' },
  { name: 'Preacher Curl', category: 'arms' },
  { name: 'Dip', category: 'arms' },

  // Core
  { name: 'Plank', category: 'core' },
  { name: 'Crunch', category: 'core' },
  { name: 'Hanging Leg Raise', category: 'core' },
  { name: 'Cable Crunch', category: 'core' },
  { name: 'Ab Wheel', category: 'core' },
  { name: 'Russian Twist', category: 'core' },

  // Conditioning
  { name: 'Burpees', category: 'conditioning' },
  { name: 'Rowing', category: 'conditioning', measurementType: 'timed' },
  { name: 'Jump Rope', category: 'conditioning', measurementType: 'timed' },
  { name: 'Box Jumps', category: 'conditioning' },
  { name: 'Battle Ropes', category: 'conditioning', measurementType: 'timed' },
  { name: 'Mountain Climbers', category: 'conditioning' },
];

/**
 * Seed preset exercises if the exercises table is empty.
 * All presets: is_custom = 0, default_rest_seconds = 90.
 * Uses a single transaction for atomicity.
 */
export async function seedIfEmpty(): Promise<void> {
  const database = await db;

  const countResult = await executeSql(database, 'SELECT COUNT(*) as cnt FROM exercises');
  const count: number = countResult.rows.item(0).cnt;
  if (count > 0) {
    return;
  }

  const createdAt = new Date().toISOString();
  await runTransaction(database, tx => {
    for (const exercise of PRESET_EXERCISES) {
      tx.executeSql(
        'INSERT INTO exercises (name, category, default_rest_seconds, is_custom, measurement_type, created_at) VALUES (?, ?, 90, 0, ?, ?)',
        [exercise.name, exercise.category, exercise.measurementType ?? 'reps', createdAt],
      );
    }
  });
}
