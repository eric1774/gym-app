import { db, executeSql } from './database';
import {
  WarmupExercise,
  WarmupTemplate,
  WarmupTemplateItem,
  WarmupTemplateItemWithName,
  WarmupSessionItem,
  WarmupTrackingType,
} from '../types';

// ── Row mappers ─────────────────────────────────────────────────────

function rowToWarmupExercise(row: {
  id: number;
  name: string;
  tracking_type: string;
  default_value: number | null;
  is_custom: number;
  created_at: string;
}): WarmupExercise {
  return {
    id: row.id,
    name: row.name,
    trackingType: row.tracking_type as WarmupTrackingType,
    defaultValue: row.default_value ?? null,
    isCustom: row.is_custom === 1,
    createdAt: row.created_at,
  };
}

function rowToWarmupTemplate(row: {
  id: number;
  name: string;
  created_at: string;
}): WarmupTemplate {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

function rowToWarmupTemplateItem(row: {
  id: number;
  template_id: number;
  exercise_id: number | null;
  warmup_exercise_id: number | null;
  tracking_type: string;
  target_value: number | null;
  sort_order: number;
}): WarmupTemplateItem {
  return {
    id: row.id,
    templateId: row.template_id,
    exerciseId: row.exercise_id ?? null,
    warmupExerciseId: row.warmup_exercise_id ?? null,
    trackingType: row.tracking_type as WarmupTrackingType,
    targetValue: row.target_value ?? null,
    sortOrder: row.sort_order,
  };
}

function rowToWarmupSessionItem(row: {
  id: number;
  session_id: number;
  exercise_id: number | null;
  warmup_exercise_id: number | null;
  display_name: string;
  tracking_type: string;
  target_value: number | null;
  is_complete: number;
  sort_order: number;
}): WarmupSessionItem {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id ?? null,
    warmupExerciseId: row.warmup_exercise_id ?? null,
    displayName: row.display_name,
    trackingType: row.tracking_type as WarmupTrackingType,
    targetValue: row.target_value ?? null,
    isComplete: row.is_complete === 1,
    sortOrder: row.sort_order,
  };
}

// ── Warmup Exercises ────────────────────────────────────────────────

/** Return all warmup exercises ordered by name. */
export async function getWarmupExercises(): Promise<WarmupExercise[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT id, name, tracking_type, default_value, is_custom, created_at FROM warmup_exercises ORDER BY name ASC',
  );
  const rows: WarmupExercise[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(rowToWarmupExercise(result.rows.item(i)));
  }
  return rows;
}

/** Search warmup exercises by name (case-insensitive substring match). */
export async function searchWarmupExercises(query: string): Promise<WarmupExercise[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT id, name, tracking_type, default_value, is_custom, created_at FROM warmup_exercises WHERE name LIKE ? ORDER BY name ASC',
    [`%${query}%`],
  );
  const rows: WarmupExercise[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(rowToWarmupExercise(result.rows.item(i)));
  }
  return rows;
}

/** Create a new warmup exercise. Returns the inserted row. */
export async function createWarmupExercise(
  name: string,
  trackingType: WarmupTrackingType,
  defaultValue?: number | null,
): Promise<WarmupExercise> {
  const database = await db;
  const createdAt = new Date().toISOString();
  const result = await executeSql(
    database,
    'INSERT INTO warmup_exercises (name, tracking_type, default_value, is_custom, created_at) VALUES (?, ?, ?, 1, ?)',
    [name, trackingType, defaultValue ?? null, createdAt],
  );
  const row = await executeSql(
    database,
    'SELECT id, name, tracking_type, default_value, is_custom, created_at FROM warmup_exercises WHERE id = ?',
    [result.insertId],
  );
  return rowToWarmupExercise(row.rows.item(0));
}

/** Delete a warmup exercise by id. */
export async function deleteWarmupExercise(id: number): Promise<void> {
  const database = await db;
  await executeSql(database, 'DELETE FROM warmup_exercises WHERE id = ?', [id]);
}

// ── Warmup Templates ────────────────────────────────────────────────

/** Return all warmup templates ordered by created_at DESC. */
export async function getWarmupTemplates(): Promise<WarmupTemplate[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT id, name, created_at FROM warmup_templates ORDER BY created_at DESC',
  );
  const rows: WarmupTemplate[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(rowToWarmupTemplate(result.rows.item(i)));
  }
  return rows;
}

/** Create a new warmup template. Returns the inserted row. */
export async function createWarmupTemplate(name: string): Promise<WarmupTemplate> {
  const database = await db;
  const createdAt = new Date().toISOString();
  const result = await executeSql(
    database,
    'INSERT INTO warmup_templates (name, created_at) VALUES (?, ?)',
    [name, createdAt],
  );
  const row = await executeSql(
    database,
    'SELECT id, name, created_at FROM warmup_templates WHERE id = ?',
    [result.insertId],
  );
  return rowToWarmupTemplate(row.rows.item(0));
}

/** Update the name of a warmup template. */
export async function updateWarmupTemplateName(id: number, name: string): Promise<void> {
  const database = await db;
  await executeSql(database, 'UPDATE warmup_templates SET name = ? WHERE id = ?', [name, id]);
}

/** Delete a warmup template by id. CASCADE handles warmup_template_items. */
export async function deleteWarmupTemplate(id: number): Promise<void> {
  const database = await db;
  await executeSql(database, 'DELETE FROM warmup_templates WHERE id = ?', [id]);
}

// ── Warmup Template Items ───────────────────────────────────────────

/**
 * Return a template with its items, each item resolved with a display name.
 * Items are ordered by sort_order ASC.
 */
export async function getWarmupTemplateWithItems(
  templateId: number,
): Promise<{ template: WarmupTemplate; items: WarmupTemplateItemWithName[] }> {
  const database = await db;

  const tplRow = await executeSql(
    database,
    'SELECT id, name, created_at FROM warmup_templates WHERE id = ?',
    [templateId],
  );
  const template = rowToWarmupTemplate(tplRow.rows.item(0));

  const itemsResult = await executeSql(
    database,
    `SELECT
       wti.id,
       wti.template_id,
       wti.exercise_id,
       wti.warmup_exercise_id,
       wti.tracking_type,
       wti.target_value,
       wti.sort_order,
       CASE
         WHEN wti.exercise_id IS NOT NULL THEN e.name
         ELSE we.name
       END AS display_name,
       CASE
         WHEN wti.exercise_id IS NOT NULL THEN 'library'
         ELSE 'warmup'
       END AS source
     FROM warmup_template_items wti
     LEFT JOIN exercises e ON e.id = wti.exercise_id
     LEFT JOIN warmup_exercises we ON we.id = wti.warmup_exercise_id
     WHERE wti.template_id = ?
     ORDER BY wti.sort_order ASC`,
    [templateId],
  );

  const items: WarmupTemplateItemWithName[] = [];
  for (let i = 0; i < itemsResult.rows.length; i++) {
    const row = itemsResult.rows.item(i);
    items.push({
      ...rowToWarmupTemplateItem(row),
      displayName: row.display_name as string,
      source: row.source as 'library' | 'warmup',
    });
  }

  return { template, items };
}

/**
 * Return a lightweight preview of a template: item count and first 3 display names.
 */
export async function getWarmupTemplatePreview(
  templateId: number,
): Promise<{ itemCount: number; previewNames: string[] }> {
  const database = await db;

  const countResult = await executeSql(
    database,
    'SELECT COUNT(*) as cnt FROM warmup_template_items WHERE template_id = ?',
    [templateId],
  );
  const itemCount: number = countResult.rows.item(0).cnt;

  const previewResult = await executeSql(
    database,
    `SELECT
       CASE
         WHEN wti.exercise_id IS NOT NULL THEN e.name
         ELSE we.name
       END AS display_name
     FROM warmup_template_items wti
     LEFT JOIN exercises e ON e.id = wti.exercise_id
     LEFT JOIN warmup_exercises we ON we.id = wti.warmup_exercise_id
     WHERE wti.template_id = ?
     ORDER BY wti.sort_order ASC
     LIMIT 3`,
    [templateId],
  );

  const previewNames: string[] = [];
  for (let i = 0; i < previewResult.rows.length; i++) {
    previewNames.push(previewResult.rows.item(i).display_name as string);
  }

  return { itemCount, previewNames };
}

/**
 * Add an item to a warmup template.
 * sort_order is auto-computed as max(sort_order) + 1 for the template.
 * Returns the inserted item id.
 */
export async function addWarmupTemplateItem(
  templateId: number,
  exerciseId: number | null,
  warmupExerciseId: number | null,
  trackingType: WarmupTrackingType,
  targetValue: number | null,
): Promise<number> {
  const database = await db;

  const sortResult = await executeSql(
    database,
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM warmup_template_items WHERE template_id = ?',
    [templateId],
  );
  const sortOrder: number = sortResult.rows.item(0).next_order;

  const result = await executeSql(
    database,
    'INSERT INTO warmup_template_items (template_id, exercise_id, warmup_exercise_id, tracking_type, target_value, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [templateId, exerciseId, warmupExerciseId, trackingType, targetValue, sortOrder],
  );
  return result.insertId;
}

/** Remove a single item from a warmup template. */
export async function removeWarmupTemplateItem(id: number): Promise<void> {
  const database = await db;
  await executeSql(database, 'DELETE FROM warmup_template_items WHERE id = ?', [id]);
}

/**
 * Reorder warmup template items by updating sort_order for each id in the
 * provided array. The index position of each id becomes its new sort_order.
 */
export async function reorderWarmupTemplateItems(
  templateId: number,
  itemIds: number[],
): Promise<void> {
  const database = await db;
  for (let i = 0; i < itemIds.length; i++) {
    await executeSql(
      database,
      'UPDATE warmup_template_items SET sort_order = ? WHERE id = ? AND template_id = ?',
      [i, itemIds[i], templateId],
    );
  }
}

// ── Warmup Session Items ────────────────────────────────────────────

/**
 * Load a warmup template into a session.
 * Clears any existing warmup_session_items for the session first,
 * then inserts one row per template item (with resolved display names).
 */
export async function loadWarmupIntoSession(
  sessionId: number,
  templateId: number,
): Promise<void> {
  const database = await db;

  await executeSql(
    database,
    'DELETE FROM warmup_session_items WHERE session_id = ?',
    [sessionId],
  );

  const itemsResult = await executeSql(
    database,
    `SELECT
       wti.exercise_id,
       wti.warmup_exercise_id,
       wti.tracking_type,
       wti.target_value,
       wti.sort_order,
       CASE
         WHEN wti.exercise_id IS NOT NULL THEN e.name
         ELSE we.name
       END AS display_name
     FROM warmup_template_items wti
     LEFT JOIN exercises e ON e.id = wti.exercise_id
     LEFT JOIN warmup_exercises we ON we.id = wti.warmup_exercise_id
     WHERE wti.template_id = ?
     ORDER BY wti.sort_order ASC`,
    [templateId],
  );

  for (let i = 0; i < itemsResult.rows.length; i++) {
    const row = itemsResult.rows.item(i);
    await executeSql(
      database,
      'INSERT INTO warmup_session_items (session_id, exercise_id, warmup_exercise_id, display_name, tracking_type, target_value, is_complete, sort_order) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
      [
        sessionId,
        row.exercise_id ?? null,
        row.warmup_exercise_id ?? null,
        row.display_name as string,
        row.tracking_type as string,
        row.target_value ?? null,
        row.sort_order as number,
      ],
    );
  }
}

/** Return all warmup session items for a session, ordered by sort_order. */
export async function getWarmupSessionItems(sessionId: number): Promise<WarmupSessionItem[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT id, session_id, exercise_id, warmup_exercise_id, display_name, tracking_type, target_value, is_complete, sort_order FROM warmup_session_items WHERE session_id = ? ORDER BY sort_order ASC',
    [sessionId],
  );
  const rows: WarmupSessionItem[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(rowToWarmupSessionItem(result.rows.item(i)));
  }
  return rows;
}

/**
 * Toggle the is_complete flag for a warmup session item.
 * Returns the new isComplete value.
 */
export async function toggleWarmupSessionItemComplete(id: number): Promise<boolean> {
  const database = await db;
  const current = await executeSql(
    database,
    'SELECT is_complete FROM warmup_session_items WHERE id = ?',
    [id],
  );
  if (current.rows.length === 0) {
    return false;
  }
  const currentValue: number = current.rows.item(0).is_complete;
  const newValue = currentValue === 1 ? 0 : 1;
  await executeSql(
    database,
    'UPDATE warmup_session_items SET is_complete = ? WHERE id = ?',
    [newValue, id],
  );
  return newValue === 1;
}

/** Delete all warmup session items for a given session. */
export async function clearWarmupSessionItems(sessionId: number): Promise<void> {
  const database = await db;
  await executeSql(database, 'DELETE FROM warmup_session_items WHERE session_id = ?', [sessionId]);
}
