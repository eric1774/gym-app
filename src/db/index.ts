export { db, initDatabase, executeSql, runTransaction } from './database';
export {
  getExercises,
  getExercisesByCategory,
  addExercise,
  deleteExercise,
  searchExercises,
} from './exercises';
export {
  createSession,
  getActiveSession,
  completeSession,
  getSessionExercises,
  addExerciseToSession,
  markExerciseComplete,
} from './sessions';
export { logSet, getSetsForExerciseInSession, getLastSessionSets, deleteSet } from './sets';
export { seedIfEmpty } from './seed';
export {
  createProgram,
  getPrograms,
  getProgram,
  deleteProgram,
  activateProgram,
  advanceWeek,
  getProgramDays,
  createProgramDay,
  duplicateProgramDay,
  deleteProgramDay,
  renameProgramDay,
  getProgramDayExercises,
  addExerciseToProgramDay,
  removeExerciseFromProgramDay,
  updateExerciseTargets,
  reorderProgramDayExercises,
} from './programs';
export {
  getExerciseProgressData,
  getExerciseHistory,
  deleteExerciseHistorySession,
  getRecentlyTrainedExercises,
  getProgramWeekCompletion,
  getSessionTimeSummary,
  exportAllData,
  getCategorySummaries,
  getCategoryExerciseProgress,
} from './dashboard';
export {
  addMeal,
  updateMeal,
  deleteMeal,
  getMealsByDate,
  getProteinGoal,
  setProteinGoal,
  getDailyProteinTotals,
  getTodayProteinTotal,
  getStreakDays,
  getMacroStreaks,
  get7DayAverage,
  getRecentDistinctMeals,
  addLibraryMeal,
  getLibraryMealsByType,
  deleteLibraryMeal,
} from './protein';
export { exportProgramData } from './export';
export { repairProgramData } from './repair';
// Macro-aware DB functions (Phase 30) — namespaced to avoid collision with frozen protein.ts
import * as macrosDb from './macros';
export { macrosDb };
// Hydration DB functions (Phase 34) — namespaced for water tracking
import * as hydrationDb from './hydration';
export { hydrationDb };
// Food database functions (Phase 38) — namespaced for food search and custom foods
import * as foodsDb from './foods';
export { foodsDb };
