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
} from './protein';
