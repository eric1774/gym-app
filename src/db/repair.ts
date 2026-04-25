import { db, executeSql } from './database';

export interface DiagnosticCategory {
  label: string;
  issueCount: number;
  details: string[];
}

export interface DiagnosticResult {
  categories: {
    orphanedRecords: DiagnosticCategory;
    emptyData: DiagnosticCategory;
    dataConsistency: DiagnosticCategory;
    duplicateSessions: DiagnosticCategory;
  };
  totalIssues: number;
}

export interface FixResult {
  fixedCount: number;
  details: string[];
}

export async function scanDatabase(): Promise<DiagnosticResult> {
  const database = await db;

  // ── Orphaned Records ──────────────────────────────────────────────────────
  const orphanDetails: string[] = [];
  let orphanCount = 0;

  const orphanChecks: { sql: string; label: string }[] = [
    {
      sql: 'SELECT COUNT(*) as cnt FROM workout_sets WHERE session_id NOT IN (SELECT id FROM workout_sessions)',
      label: 'orphaned workout_sets (missing session)',
    },
    {
      sql: 'SELECT COUNT(*) as cnt FROM exercise_sessions WHERE session_id NOT IN (SELECT id FROM workout_sessions)',
      label: 'orphaned exercise_sessions (missing session)',
    },
    {
      sql: 'SELECT COUNT(*) as cnt FROM heart_rate_samples WHERE session_id NOT IN (SELECT id FROM workout_sessions)',
      label: 'orphaned heart_rate_samples (missing session)',
    },
    {
      sql: 'SELECT COUNT(*) as cnt FROM meal_foods WHERE meal_id NOT IN (SELECT id FROM meals)',
      label: 'orphaned meal_foods (missing meal)',
    },
    {
      sql: 'SELECT COUNT(*) as cnt FROM meal_foods WHERE food_id NOT IN (SELECT id FROM foods)',
      label: 'orphaned meal_foods (missing food)',
    },
  ];

  for (const check of orphanChecks) {
    try {
      const result = await executeSql(database, check.sql);
      const count = result.rows.item(0).cnt as number;
      if (count > 0) {
        orphanCount += count;
        orphanDetails.push(`${count} ${check.label}`);
      }
    } catch {
      // Table may not exist on older installs — skip
    }
  }

  // ── Empty / Abandoned Data ────────────────────────────────────────────────
  const emptyDetails: string[] = [];
  let emptyCount = 0;

  try {
    const abandonedResult = await executeSql(
      database,
      'SELECT COUNT(*) as cnt FROM workout_sessions WHERE completed_at IS NULL AND id NOT IN (SELECT session_id FROM workout_sets)',
    );
    const abandoned = abandonedResult.rows.item(0).cnt as number;
    if (abandoned > 0) {
      emptyCount += abandoned;
      emptyDetails.push(`${abandoned} abandoned session${abandoned > 1 ? 's' : ''} with no sets`);
    }
  } catch {
    // Skip if tables don't exist
  }

  // ── Data Consistency ──────────────────────────────────────────────────────
  const consistencyDetails: string[] = [];
  let consistencyCount = 0;

  // Macro mismatches in meals
  try {
    const macroResult = await executeSql(
      database,
      `SELECT COUNT(*) as cnt FROM meals m
       WHERE EXISTS (SELECT 1 FROM meal_foods mf WHERE mf.meal_id = m.id)
       AND (
         ABS(COALESCE((SELECT SUM(calories) FROM meal_foods WHERE meal_id = m.id), 0) - COALESCE(m.calories, 0)) > 0.5
         OR ABS(COALESCE((SELECT SUM(protein) FROM meal_foods WHERE meal_id = m.id), 0) - COALESCE(m.protein, 0)) > 0.5
         OR ABS(COALESCE((SELECT SUM(carbs) FROM meal_foods WHERE meal_id = m.id), 0) - COALESCE(m.carbs, 0)) > 0.5
         OR ABS(COALESCE((SELECT SUM(fat) FROM meal_foods WHERE meal_id = m.id), 0) - COALESCE(m.fat, 0)) > 0.5
       )`,
    );
    const macroMismatches = macroResult.rows.item(0).cnt as number;
    if (macroMismatches > 0) {
      consistencyCount += macroMismatches;
      consistencyDetails.push(`${macroMismatches} meal${macroMismatches > 1 ? 's' : ''} with mismatched macro totals`);
    }
  } catch {
    // Skip if tables don't exist
  }

  // Sessions with heart rate samples but NULL avg_hr or peak_hr
  try {
    const hrResult = await executeSql(
      database,
      `SELECT COUNT(*) as cnt FROM workout_sessions ws
       WHERE EXISTS (SELECT 1 FROM heart_rate_samples hrs WHERE hrs.session_id = ws.id)
       AND (ws.avg_hr IS NULL OR ws.peak_hr IS NULL)`,
    );
    const hrMismatches = hrResult.rows.item(0).cnt as number;
    if (hrMismatches > 0) {
      consistencyCount += hrMismatches;
      consistencyDetails.push(`${hrMismatches} session${hrMismatches > 1 ? 's' : ''} with HR samples but NULL avg_hr/peak_hr`);
    }
  } catch {
    // Skip if tables don't exist
  }

  // Programs where current_week > weeks
  try {
    const programResult = await executeSql(
      database,
      'SELECT COUNT(*) as cnt FROM programs WHERE current_week > weeks',
    );
    const overflowPrograms = programResult.rows.item(0).cnt as number;
    if (overflowPrograms > 0) {
      consistencyCount += overflowPrograms;
      consistencyDetails.push(`${overflowPrograms} program${overflowPrograms > 1 ? 's' : ''} with current_week > weeks`);
    }
  } catch {
    // Skip if tables don't exist
  }

  // ── Duplicate Sessions ────────────────────────────────────────────────
  const duplicateDetails: string[] = [];
  let duplicateCount = 0;

  try {
    // Count duplicate-session groups: completed_at values that appear in >1 row
    const dupGroupsResult = await executeSql(
      database,
      `SELECT completed_at, COUNT(*) AS cnt
         FROM workout_sessions
         WHERE completed_at IS NOT NULL
         GROUP BY completed_at
         HAVING cnt > 1`,
    );
    let groupCount = 0;
    let extraSessions = 0;
    for (let i = 0; i < dupGroupsResult.rows.length; i++) {
      const row = dupGroupsResult.rows.item(i);
      groupCount++;
      extraSessions += (row.cnt - 1);
    }
    duplicateCount = extraSessions;
    if (extraSessions > 0) {
      // Count affected workout_sets (rows that will be deleted along with the duplicate sessions)
      const dupSetsResult = await executeSql(
        database,
        `SELECT COUNT(*) AS cnt
           FROM workout_sets
           WHERE session_id IN (
             SELECT s.id FROM workout_sessions s
              INNER JOIN (
                SELECT completed_at, MIN(id) AS keep_id
                  FROM workout_sessions
                  WHERE completed_at IS NOT NULL
                  GROUP BY completed_at
                  HAVING COUNT(*) > 1
              ) g ON g.completed_at = s.completed_at
              WHERE s.id <> g.keep_id
           )`,
      );
      const setRows = dupSetsResult.rows.item(0).cnt as number;
      duplicateDetails.push(`${extraSessions} duplicate session${extraSessions > 1 ? 's' : ''} across ${groupCount} group${groupCount > 1 ? 's' : ''} (${setRows} workout_set rows will be removed)`);
    }
  } catch {
    // Skip if tables don't exist
  }

  const totalIssues = orphanCount + emptyCount + consistencyCount + duplicateCount;

  return {
    categories: {
      orphanedRecords: {
        label: 'Orphaned Records',
        issueCount: orphanCount,
        details: orphanDetails,
      },
      emptyData: {
        label: 'Abandoned Data',
        issueCount: emptyCount,
        details: emptyDetails,
      },
      dataConsistency: {
        label: 'Data Consistency',
        issueCount: consistencyCount,
        details: consistencyDetails,
      },
      duplicateSessions: {
        label: 'Duplicate Sessions',
        issueCount: duplicateCount,
        details: duplicateDetails,
      },
    },
    totalIssues,
  };
}

export async function fixDatabaseIssues(result: DiagnosticResult): Promise<FixResult> {
  const database = await db;
  const details: string[] = [];
  let fixedCount = 0;

  // ── Fix Orphaned Records ──────────────────────────────────────────────────
  if (result.categories.orphanedRecords.issueCount > 0) {
    const orphanFixes: { sql: string; label: string }[] = [
      {
        sql: 'DELETE FROM workout_sets WHERE session_id NOT IN (SELECT id FROM workout_sessions)',
        label: 'orphaned workout_sets rows',
      },
      {
        sql: 'DELETE FROM exercise_sessions WHERE session_id NOT IN (SELECT id FROM workout_sessions)',
        label: 'orphaned exercise_sessions rows',
      },
      {
        sql: 'DELETE FROM heart_rate_samples WHERE session_id NOT IN (SELECT id FROM workout_sessions)',
        label: 'orphaned heart_rate_samples rows',
      },
      {
        sql: 'DELETE FROM meal_foods WHERE meal_id NOT IN (SELECT id FROM meals)',
        label: 'orphaned meal_foods rows (missing meal)',
      },
      {
        sql: 'DELETE FROM meal_foods WHERE food_id NOT IN (SELECT id FROM foods)',
        label: 'orphaned meal_foods rows (missing food)',
      },
    ];

    for (const fix of orphanFixes) {
      try {
        const fixResult = await executeSql(database, fix.sql);
        if (fixResult.rowsAffected > 0) {
          fixedCount += fixResult.rowsAffected;
          details.push(`Deleted ${fixResult.rowsAffected} ${fix.label}`);
        }
      } catch {
        // Table may not exist — skip
      }
    }
  }

  // ── Fix Abandoned Sessions ────────────────────────────────────────────────
  if (result.categories.emptyData.issueCount > 0) {
    try {
      const fixResult = await executeSql(
        database,
        'DELETE FROM workout_sessions WHERE completed_at IS NULL AND id NOT IN (SELECT session_id FROM workout_sets)',
      );
      if (fixResult.rowsAffected > 0) {
        fixedCount += fixResult.rowsAffected;
        details.push(`Deleted ${fixResult.rowsAffected} abandoned session${fixResult.rowsAffected > 1 ? 's' : ''}`);
      }
    } catch {
      // Skip if tables don't exist
    }
  }

  // ── Fix Data Consistency ──────────────────────────────────────────────────
  if (result.categories.dataConsistency.issueCount > 0) {
    // Fix macro mismatches
    try {
      const fixResult = await executeSql(
        database,
        `UPDATE meals SET
           calories = (SELECT COALESCE(SUM(calories), 0) FROM meal_foods WHERE meal_id = meals.id),
           protein = (SELECT COALESCE(SUM(protein), 0) FROM meal_foods WHERE meal_id = meals.id),
           carbs = (SELECT COALESCE(SUM(carbs), 0) FROM meal_foods WHERE meal_id = meals.id),
           fat = (SELECT COALESCE(SUM(fat), 0) FROM meal_foods WHERE meal_id = meals.id)
         WHERE EXISTS (SELECT 1 FROM meal_foods mf WHERE mf.meal_id = meals.id)
         AND (
           ABS(COALESCE((SELECT SUM(calories) FROM meal_foods WHERE meal_id = meals.id), 0) - COALESCE(calories, 0)) > 0.5
           OR ABS(COALESCE((SELECT SUM(protein) FROM meal_foods WHERE meal_id = meals.id), 0) - COALESCE(protein, 0)) > 0.5
           OR ABS(COALESCE((SELECT SUM(carbs) FROM meal_foods WHERE meal_id = meals.id), 0) - COALESCE(carbs, 0)) > 0.5
           OR ABS(COALESCE((SELECT SUM(fat) FROM meal_foods WHERE meal_id = meals.id), 0) - COALESCE(fat, 0)) > 0.5
         )`,
      );
      if (fixResult.rowsAffected > 0) {
        fixedCount += fixResult.rowsAffected;
        details.push(`Updated ${fixResult.rowsAffected} meal${fixResult.rowsAffected > 1 ? 's' : ''} with corrected macro totals`);
      }
    } catch {
      // Skip if tables don't exist
    }

    // Fix HR mismatches
    try {
      const fixResult = await executeSql(
        database,
        `UPDATE workout_sessions SET
           avg_hr = (SELECT AVG(hr) FROM heart_rate_samples WHERE session_id = workout_sessions.id),
           peak_hr = (SELECT MAX(hr) FROM heart_rate_samples WHERE session_id = workout_sessions.id)
         WHERE EXISTS (SELECT 1 FROM heart_rate_samples hrs WHERE hrs.session_id = workout_sessions.id)
         AND (avg_hr IS NULL OR peak_hr IS NULL)`,
      );
      if (fixResult.rowsAffected > 0) {
        fixedCount += fixResult.rowsAffected;
        details.push(`Updated ${fixResult.rowsAffected} session${fixResult.rowsAffected > 1 ? 's' : ''} with corrected HR averages`);
      }
    } catch {
      // Skip if tables don't exist
    }

    // Fix program week overflow
    try {
      const fixResult = await executeSql(
        database,
        'UPDATE programs SET current_week = weeks WHERE current_week > weeks',
      );
      if (fixResult.rowsAffected > 0) {
        fixedCount += fixResult.rowsAffected;
        details.push(`Reset ${fixResult.rowsAffected} program${fixResult.rowsAffected > 1 ? 's' : ''} with current_week > weeks`);
      }
    } catch {
      // Skip if tables don't exist
    }
  }

  // ── Fix Duplicate Sessions ────────────────────────────────────────────
  if (result.categories.duplicateSessions.issueCount > 0) {
    try {
      // Compute IDs to delete: every session whose completed_at appears in >1 row, except the lowest id per group.
      const dupIdsResult = await executeSql(
        database,
        `SELECT s.id
           FROM workout_sessions s
           INNER JOIN (
             SELECT completed_at, MIN(id) AS keep_id
               FROM workout_sessions
               WHERE completed_at IS NOT NULL
               GROUP BY completed_at
               HAVING COUNT(*) > 1
           ) g ON g.completed_at = s.completed_at
           WHERE s.id <> g.keep_id`,
      );
      const dupIds: number[] = [];
      for (let i = 0; i < dupIdsResult.rows.length; i++) {
        dupIds.push(dupIdsResult.rows.item(i).id as number);
      }

      if (dupIds.length > 0) {
        // Build placeholder list for IN clause
        const placeholders = dupIds.map(() => '?').join(',');

        // Delete dependent rows first. Two of the FK columns were declared WITHOUT
        // ON DELETE CASCADE in the original schema (workout_sets, exercise_sessions),
        // so explicit DELETE is required regardless of PRAGMA foreign_keys state.
        await executeSql(
          database,
          `DELETE FROM workout_sets WHERE session_id IN (${placeholders})`,
          dupIds,
        );

        // Best-effort cleanup of other session-keyed tables that may exist on this install
        try {
          await executeSql(
            database,
            `DELETE FROM exercise_sessions WHERE session_id IN (${placeholders})`,
            dupIds,
          );
        } catch { /* table may not exist on older installs */ }

        try {
          await executeSql(
            database,
            `DELETE FROM heart_rate_samples WHERE session_id IN (${placeholders})`,
            dupIds,
          );
        } catch { /* table may not exist */ }

        // Finally drop the duplicate session rows themselves
        const sessionDeleteResult = await executeSql(
          database,
          `DELETE FROM workout_sessions WHERE id IN (${placeholders})`,
          dupIds,
        );

        if (sessionDeleteResult.rowsAffected > 0) {
          fixedCount += sessionDeleteResult.rowsAffected;
          details.push(`Deleted ${sessionDeleteResult.rowsAffected} duplicate session${sessionDeleteResult.rowsAffected > 1 ? 's' : ''} (and their workout_set rows)`);
        }
      }
    } catch (err: any) {
      details.push(`Duplicate session cleanup failed: ${err?.message ?? 'unknown error'}`);
    }
  }

  if (details.length === 0) {
    details.push('No issues found to fix');
  }

  return { fixedCount, details };
}
