import { db, executeSql } from './database';

export interface WeightTrendResult {
  today: number | null;
  currentSevenDayMA: number | null;
  previousSevenDayMA: number | null;
  dailySeries: { date: string; weight: number }[];
}

/**
 * Fetch weight trend data for the dashboard weight card.
 *
 *  today:              today's logged weight (null if not logged today)
 *  currentSevenDayMA:  avg of last 7 days' readings (null if insufficient)
 *  previousSevenDayMA: avg of the 7 days before that (null if insufficient)
 *  dailySeries:        readings for the last 30 days (one entry per logged day)
 *
 * Delta is derived downstream: `currentSevenDayMA - previousSevenDayMA`.
 * Comparing 7-day MAs filters out daily water/sodium/glycogen noise.
 */
export async function getWeightTrend(): Promise<WeightTrendResult> {
  const database = await db;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = toDateStr(cutoff);
  const todayStr = toDateStr(new Date());

  const rows = await executeSql(
    database,
    `SELECT recorded_date AS date, value AS weight
       FROM body_metrics
      WHERE metric_type = 'weight'
        AND recorded_date >= ?
      ORDER BY recorded_date ASC`,
    [cutoffStr],
  );

  const series: { date: string; weight: number }[] = [];
  for (let i = 0; i < rows.rows.length; i++) {
    const r = rows.rows.item(i);
    series.push({ date: r.date as string, weight: Number(r.weight) });
  }

  const byDate = new Map(series.map((s) => [s.date, s.weight]));
  const today = byDate.get(todayStr) ?? null;

  return {
    today,
    currentSevenDayMA: avgWindow(byDate, 0, 7),
    previousSevenDayMA: avgWindow(byDate, 7, 7),
    dailySeries: series,
  };
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Average readings in a backward-looking window of `window` days.
 * `offset` = 0 means today..6 days ago; `offset` = 7 means 7..13 days ago.
 * Requires at least (window - 1) readings — tolerates 1 missed day per window.
 */
function avgWindow(byDate: Map<string, number>, offset: number, window: number): number | null {
  const vals: number[] = [];
  for (let i = offset; i < offset + window; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const v = byDate.get(toDateStr(d));
    if (v !== undefined) {
      vals.push(v);
    }
  }
  // Require at least (window - 1) readings for a valid MA — tolerates 1 missed day per window.
  if (vals.length < window - 1) {
    return null;
  }
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
