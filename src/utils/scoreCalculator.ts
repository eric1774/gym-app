// src/utils/scoreCalculator.ts
import { SQLiteDatabase } from 'react-native-sqlite-storage';
import { executeSql } from '../db/database';

/** Scores returned for each dimension (0–100 each). */
export interface DimensionScores {
  consistencyScore: number;
  fitnessScore: number;
  nutritionScore: number;
  varietyScore: number;
}

const RECENT_DAYS = 90;
const RECENT_WEIGHT = 0.7;
const ALLTIME_WEIGHT = 0.3;
const BADGE_TIER_BONUS = 0.25;

// ── Helper: clamp to 0-100 ──

function clamp100(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

// ── Helper: linear scale ──

function linearScale(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0;
  return clamp100((value / maxValue) * 100);
}

// ── Helper: get date N days ago as YYYY-MM-DD ──

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── Helper: weeks in window ──

function weeksInWindow(days: number, firstDate: string | null): number {
  if (!firstDate) return 1;
  const start = new Date(firstDate);
  const now = new Date();
  const actualDays = Math.min(days, Math.floor((now.getTime() - start.getTime()) / 86400000) + 1);
  return Math.max(1, actualDays / 7);
}

// ══════════════════════════════════════════════════════════════
// CONSISTENCY: workout frequency (60%) + logging frequency (40%)
// ══════════════════════════════════════════════════════════════

async function queryConsistency(db: SQLiteDatabase, sinceDate: string | null): Promise<number> {
  const whereClause = sinceDate ? `WHERE completed_at >= '${sinceDate}'` : 'WHERE completed_at IS NOT NULL';

  // Workout frequency: avg workouts per week
  const sessions = await executeSql(db,
    `SELECT COUNT(*) as cnt, MIN(date(completed_at)) as first_date
     FROM workout_sessions ${whereClause}`);
  const sessionCount = sessions.rows.item(0).cnt as number;
  const firstSessionDate = sessions.rows.item(0).first_date as string | null;
  const sessionWeeks = sinceDate
    ? weeksInWindow(RECENT_DAYS, firstSessionDate)
    : weeksInWindow(36500, firstSessionDate);
  const workoutsPerWeek = sessionCount / sessionWeeks;
  const workoutScore = linearScale(workoutsPerWeek, 7); // 7/week = 100 (daily)

  // Logging frequency: avg days per week with meal or water log
  const logDays = await executeSql(db,
    `SELECT COUNT(DISTINCT local_date) as cnt, MIN(local_date) as first_date FROM (
       SELECT local_date FROM meals ${sinceDate ? `WHERE local_date >= '${sinceDate}'` : ''}
       UNION
       SELECT local_date FROM water_logs ${sinceDate ? `WHERE local_date >= '${sinceDate}'` : ''}
     )`);
  const logDayCount = logDays.rows.item(0).cnt as number;
  const firstLogDate = logDays.rows.item(0).first_date as string | null;
  const logWeeks = sinceDate
    ? weeksInWindow(RECENT_DAYS, firstLogDate)
    : weeksInWindow(36500, firstLogDate);
  const loggingDaysPerWeek = logDayCount / logWeeks;
  const loggingScore = linearScale(loggingDaysPerWeek, 7); // 7/week = 100

  return workoutScore * 0.6 + loggingScore * 0.4;
}

// ══════════════════════════════════════════════════════════════
// FITNESS: self-relative volume (current avg vs all-time max)
// ══════════════════════════════════════════════════════════════

async function queryFitness(db: SQLiteDatabase, sinceDate: string | null): Promise<number> {
  // Get all-time max weekly volume (always needed as the reference)
  const maxWeekly = await executeSql(db,
    `SELECT MAX(week_vol) as max_vol FROM (
       SELECT strftime('%Y-%W', ws.completed_at) as week_key,
              SUM(s.reps * s.weight_kg) as week_vol
       FROM workout_sets s
       JOIN workout_sessions ws ON s.session_id = ws.id
       WHERE ws.completed_at IS NOT NULL
       GROUP BY week_key
     )`);
  const allTimeMaxVol = (maxWeekly.rows.item(0).max_vol as number) || 0;
  if (allTimeMaxVol === 0) return 0;
  // Use 130% of peak as ceiling — even your best week only scores ~77
  const fitnessCeiling = allTimeMaxVol * 1.3;

  // Get average weekly volume in the window
  const whereClause = sinceDate ? `AND ws.completed_at >= '${sinceDate}'` : '';
  const windowVol = await executeSql(db,
    `SELECT SUM(s.reps * s.weight_kg) as total_vol,
            COUNT(DISTINCT strftime('%Y-%W', ws.completed_at)) as week_count
     FROM workout_sets s
     JOIN workout_sessions ws ON s.session_id = ws.id
     WHERE ws.completed_at IS NOT NULL ${whereClause}`);
  const totalVol = (windowVol.rows.item(0).total_vol as number) || 0;
  const weekCount = Math.max(1, (windowVol.rows.item(0).week_count as number) || 1);
  const avgWeeklyVol = totalVol / weekCount;

  return linearScale(avgWeeklyVol, fitnessCeiling);
}

// ══════════════════════════════════════════════════════════════
// NUTRITION: macro adherence (60%) + hydration adherence (40%)
// ══════════════════════════════════════════════════════════════

async function queryNutrition(db: SQLiteDatabase, sinceDate: string | null): Promise<number> {
  const dateFilter = sinceDate ? `AND m.local_date >= '${sinceDate}'` : '';
  const waterDateFilter = sinceDate ? `AND wl.local_date >= '${sinceDate}'` : '';

  // Calculate days in window for denominator
  const daysInWindow = sinceDate ? RECENT_DAYS : await (async () => {
    const first = await executeSql(db,
      `SELECT MIN(local_date) as d FROM meals`);
    if (!first.rows.item(0).d) return 1;
    const start = new Date(first.rows.item(0).d as string);
    return Math.max(1, Math.floor((Date.now() - start.getTime()) / 86400000) + 1);
  })();

  // Get macro goals
  const goalResult = await executeSql(db,
    `SELECT protein_goal, carb_goal, fat_goal FROM macro_settings LIMIT 1`);
  let macroAdherence = 0;

  if (goalResult.rows.length > 0) {
    const pg = goalResult.rows.item(0).protein_goal as number | null;
    const cg = goalResult.rows.item(0).carb_goal as number | null;
    const fg = goalResult.rows.item(0).fat_goal as number | null;
    const goals = [pg, cg, fg].filter(g => g !== null && g > 0);

    if (goals.length >= 2) {
      const mealDays = await executeSql(db,
        `SELECT local_date,
                SUM(protein_grams) as p, SUM(carb_grams) as c, SUM(fat_grams) as f
         FROM meals m
         WHERE 1=1 ${dateFilter}
         GROUP BY local_date`);
      let metDays = 0;
      for (let i = 0; i < mealDays.rows.length; i++) {
        const row = mealDays.rows.item(i);
        let goalsHit = 0;
        if (pg && pg > 0 && (row.p as number) >= pg) goalsHit++;
        if (cg && cg > 0 && (row.c as number) >= cg) goalsHit++;
        if (fg && fg > 0 && (row.f as number) >= fg) goalsHit++;
        if (goalsHit >= 2) metDays++;
      }
      // Use days in window as denominator, not just days with meals
      macroAdherence = (metDays / daysInWindow) * 100;
    }
  }

  // Hydration adherence — also use days in window as denominator
  let hydrationAdherence = 0;
  const waterGoalResult = await executeSql(db,
    `SELECT goal_oz FROM water_settings LIMIT 1`);
  if (waterGoalResult.rows.length > 0) {
    const goalOz = waterGoalResult.rows.item(0).goal_oz as number | null;
    if (goalOz && goalOz > 0) {
      const waterDays = await executeSql(db,
        `SELECT local_date, SUM(amount_oz) as total
         FROM water_logs wl
         WHERE 1=1 ${waterDateFilter}
         GROUP BY local_date`);
      let metDays = 0;
      for (let i = 0; i < waterDays.rows.length; i++) {
        if ((waterDays.rows.item(i).total as number) >= goalOz) metDays++;
      }
      hydrationAdherence = (metDays / daysInWindow) * 100;
    }
  }

  return macroAdherence * 0.6 + hydrationAdherence * 0.4;
}

// ══════════════════════════════════════════════════════════════
// VARIETY: exercise variety (50%) + muscle group coverage (50%)
// ══════════════════════════════════════════════════════════════

async function queryVariety(db: SQLiteDatabase, sinceDate: string | null): Promise<number> {
  const whereClause = sinceDate ? `AND ws.completed_at >= '${sinceDate}'` : '';

  // Distinct exercises used
  const exercises = await executeSql(db,
    `SELECT COUNT(DISTINCT es.exercise_id) as cnt
     FROM exercise_sessions es
     JOIN workout_sessions ws ON es.session_id = ws.id
     WHERE ws.completed_at IS NOT NULL ${whereClause}`);
  const distinctCount = (exercises.rows.item(0).cnt as number) || 0;
  // Log scale: ln(count+1) / ln(26) * 100 — need ~25 distinct exercises for 100
  const exerciseScore = distinctCount === 0 ? 0
    : clamp100(Math.log(distinctCount + 1) / Math.log(26) * 100);

  // Muscle group coverage
  const totalGroups = await executeSql(db,
    `SELECT COUNT(DISTINCT id) as cnt FROM muscle_groups`);
  const totalGroupCount = (totalGroups.rows.item(0).cnt as number) || 0;

  let coverageScore = 0;
  if (totalGroupCount > 0) {
    const hitGroups = await executeSql(db,
      `SELECT COUNT(DISTINCT emg.muscle_group_id) as cnt
       FROM exercise_muscle_groups emg
       JOIN exercise_sessions es ON emg.exercise_id = es.exercise_id
       JOIN workout_sessions ws ON es.session_id = ws.id
       WHERE ws.completed_at IS NOT NULL ${whereClause}`);
    const hitCount = (hitGroups.rows.item(0).cnt as number) || 0;
    coverageScore = (hitCount / totalGroupCount) * 100;
  }

  return exerciseScore * 0.5 + coverageScore * 0.5;
}

// ══════════════════════════════════════════════════════════════
// BADGE BONUSES: +0.5 per earned tier, mapped by category
// ══════════════════════════════════════════════════════════════

interface BadgeBonuses {
  consistency: number;
  fitness: number;
  nutrition: number;
  variety: number;
}

async function queryBadgeBonuses(db: SQLiteDatabase): Promise<BadgeBonuses> {
  const bonuses: BadgeBonuses = { consistency: 0, fitness: 0, nutrition: 0, variety: 0 };

  // Sum tiers per badge category
  const result = await executeSql(db,
    `SELECT b.category, SUM(ub.tier) as total_tiers
     FROM user_badges ub
     JOIN badges b ON ub.badge_id = b.id
     GROUP BY b.category`);

  let milestoneBonus = 0;
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const category = row.category as string;
    const totalTiers = (row.total_tiers as number) || 0;
    const bonus = totalTiers * BADGE_TIER_BONUS;

    switch (category) {
      case 'consistency': bonuses.consistency += bonus; break;
      case 'fitness': bonuses.fitness += bonus; break;
      case 'nutrition': bonuses.nutrition += bonus; break;
      case 'recovery': bonuses.variety += bonus; break;
      case 'milestone': milestoneBonus += bonus; break;
    }
  }

  // Milestone bonus goes to lowest-scoring dimension
  if (milestoneBonus > 0) {
    const min = Math.min(bonuses.consistency, bonuses.fitness, bonuses.nutrition, bonuses.variety);
    if (bonuses.consistency === min) bonuses.consistency += milestoneBonus;
    else if (bonuses.fitness === min) bonuses.fitness += milestoneBonus;
    else if (bonuses.nutrition === min) bonuses.nutrition += milestoneBonus;
    else bonuses.variety += milestoneBonus;
  }

  return bonuses;
}

// ══════════════════════════════════════════════════════════════
// MAIN: Calculate all 4 dimension scores
// ══════════════════════════════════════════════════════════════

export async function calculateAllScores(database: SQLiteDatabase): Promise<DimensionScores> {
  const recentDate = daysAgo(RECENT_DAYS);

  // Query all dimensions for both windows in parallel
  const [
    consistencyRecent, consistencyAllTime,
    fitnessRecent, fitnessAllTime,
    nutritionRecent, nutritionAllTime,
    varietyRecent, varietyAllTime,
    badgeBonuses,
  ] = await Promise.all([
    queryConsistency(database, recentDate),
    queryConsistency(database, null),
    queryFitness(database, recentDate),
    queryFitness(database, null),
    queryNutrition(database, recentDate),
    queryNutrition(database, null),
    queryVariety(database, recentDate),
    queryVariety(database, null),
    queryBadgeBonuses(database),
  ]);

  // Weighted blend: 70% recent + 30% all-time + badge bonus
  // Apply power curve (exponent 1.8) to slow progression — raw 50 → ~29, raw 75 → ~55
  const dampen = (raw: number) => clamp100(Math.pow(raw / 100, 1.8) * 100);

  return {
    consistencyScore: clamp100(
      dampen(consistencyRecent * RECENT_WEIGHT + consistencyAllTime * ALLTIME_WEIGHT) + badgeBonuses.consistency,
    ),
    fitnessScore: clamp100(
      dampen(fitnessRecent * RECENT_WEIGHT + fitnessAllTime * ALLTIME_WEIGHT) + badgeBonuses.fitness,
    ),
    nutritionScore: clamp100(
      dampen(nutritionRecent * RECENT_WEIGHT + nutritionAllTime * ALLTIME_WEIGHT) + badgeBonuses.nutrition,
    ),
    varietyScore: clamp100(
      dampen(varietyRecent * RECENT_WEIGHT + varietyAllTime * ALLTIME_WEIGHT) + badgeBonuses.variety,
    ),
  };
}
