jest.mock('react-native-sqlite-storage');
jest.mock('../database');

import { executeSql } from '../database';
import { mockResultSet } from '@test-utils/dbMock';
import {
  getWarmupExercises,
  searchWarmupExercises,
  createWarmupExercise,
  deleteWarmupExercise,
  getWarmupTemplates,
  createWarmupTemplate,
  updateWarmupTemplateName,
  deleteWarmupTemplate,
  getWarmupTemplateWithItems,
  getWarmupTemplatePreview,
  addWarmupTemplateItem,
  removeWarmupTemplateItem,
  reorderWarmupTemplateItems,
  getWarmupSessionItems,
  toggleWarmupSessionItemComplete,
  clearWarmupSessionItems,
  loadWarmupIntoSession,
} from '../warmups';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;
const mockDb = {};
const dbModule = require('../database');
Object.defineProperty(dbModule, 'db', {
  value: Promise.resolve(mockDb),
  writable: true,
});

// ── Shared row fixtures ──────────────────────────────────────────────

const warmupExerciseRow = {
  id: 1,
  name: 'Foam Roll Quads',
  tracking_type: 'duration',
  default_value: 120,
  is_custom: 1,
  created_at: '2026-04-15T10:00:00.000Z',
};

const warmupTemplateRow = {
  id: 1,
  name: 'Upper Body Warmup',
  created_at: '2026-04-15T10:00:00.000Z',
};

const warmupTemplateItemRow = {
  id: 10,
  template_id: 1,
  exercise_id: null,
  warmup_exercise_id: 1,
  tracking_type: 'duration',
  target_value: 120,
  sort_order: 0,
};

const warmupSessionItemRow = {
  id: 1,
  session_id: 10,
  exercise_id: null,
  warmup_exercise_id: 1,
  display_name: 'Foam Roll Quads',
  tracking_type: 'duration',
  target_value: 120,
  is_complete: 0,
  sort_order: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── getWarmupExercises ────────────────────────────────────────────────

describe('getWarmupExercises', () => {
  it('returns all exercises ordered by name', async () => {
    const row2 = { ...warmupExerciseRow, id: 2, name: 'Hip Flexor Stretch', is_custom: 0 };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([warmupExerciseRow, row2]));

    const result = await getWarmupExercises();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 1,
      name: 'Foam Roll Quads',
      trackingType: 'duration',
      defaultValue: 120,
      isCustom: true,
      createdAt: '2026-04-15T10:00:00.000Z',
    });
    expect(result[1].isCustom).toBe(false);
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('ORDER BY name ASC'),
    );
  });

  it('returns empty array when no exercises exist', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getWarmupExercises();

    expect(result).toEqual([]);
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
  });
});

// ── searchWarmupExercises ─────────────────────────────────────────────

describe('searchWarmupExercises', () => {
  it('queries with LIKE and wraps the term in %', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([warmupExerciseRow]));

    const result = await searchWarmupExercises('foam');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Foam Roll Quads');
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('LIKE ?'),
      ['%foam%'],
    );
  });

  it('returns empty array when no matches', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await searchWarmupExercises('xyz');

    expect(result).toEqual([]);
  });
});

// ── createWarmupExercise ──────────────────────────────────────────────

describe('createWarmupExercise', () => {
  it('inserts then selects and returns mapped exercise', async () => {
    // INSERT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 1));
    // SELECT by insertId
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([warmupExerciseRow]));

    const result = await createWarmupExercise('Foam Roll Quads', 'duration', 120);

    expect(result).toEqual({
      id: 1,
      name: 'Foam Roll Quads',
      trackingType: 'duration',
      defaultValue: 120,
      isCustom: true,
      createdAt: '2026-04-15T10:00:00.000Z',
    });
    expect(mockExecuteSql).toHaveBeenCalledTimes(2);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('INSERT INTO warmup_exercises'),
      expect.arrayContaining(['Foam Roll Quads', 'duration', 120]),
    );
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('WHERE id = ?'),
      [1],
    );
  });

  it('defaults null when no defaultValue provided', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 2));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ ...warmupExerciseRow, id: 2, default_value: null }]),
    );

    const result = await createWarmupExercise('Hip Circles', 'reps');

    expect(result.defaultValue).toBeNull();
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('INSERT INTO warmup_exercises'),
      expect.arrayContaining([null]),
    );
  });
});

// ── deleteWarmupExercise ──────────────────────────────────────────────

describe('deleteWarmupExercise', () => {
  it('calls DELETE with correct id', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await deleteWarmupExercise(1);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('DELETE FROM warmup_exercises'),
      [1],
    );
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
  });
});

// ── getWarmupTemplates ────────────────────────────────────────────────

describe('getWarmupTemplates', () => {
  it('returns templates ordered by created_at DESC', async () => {
    const row2 = { id: 2, name: 'Lower Body Warmup', created_at: '2026-04-14T10:00:00.000Z' };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([warmupTemplateRow, row2]));

    const result = await getWarmupTemplates();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 1,
      name: 'Upper Body Warmup',
      createdAt: '2026-04-15T10:00:00.000Z',
    });
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('ORDER BY created_at DESC'),
    );
  });

  it('returns empty array when no templates exist', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getWarmupTemplates();

    expect(result).toEqual([]);
  });
});

// ── createWarmupTemplate ──────────────────────────────────────────────

describe('createWarmupTemplate', () => {
  it('inserts then selects and returns mapped template', async () => {
    // INSERT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 1));
    // SELECT by insertId
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([warmupTemplateRow]));

    const result = await createWarmupTemplate('Upper Body Warmup');

    expect(result).toEqual({
      id: 1,
      name: 'Upper Body Warmup',
      createdAt: '2026-04-15T10:00:00.000Z',
    });
    expect(mockExecuteSql).toHaveBeenCalledTimes(2);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('INSERT INTO warmup_templates'),
      expect.arrayContaining(['Upper Body Warmup']),
    );
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('WHERE id = ?'),
      [1],
    );
  });
});

// ── updateWarmupTemplateName ──────────────────────────────────────────

describe('updateWarmupTemplateName', () => {
  it('updates name with correct params', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await updateWarmupTemplateName(1, 'Full Body Warmup');

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('SET name = ?'),
      ['Full Body Warmup', 1],
    );
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
  });
});

// ── deleteWarmupTemplate ──────────────────────────────────────────────

describe('deleteWarmupTemplate', () => {
  it('deletes template by id (CASCADE handles items)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await deleteWarmupTemplate(1);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('DELETE FROM warmup_templates'),
      [1],
    );
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
  });
});

// ── getWarmupTemplateWithItems ────────────────────────────────────────

describe('getWarmupTemplateWithItems', () => {
  it('returns template and its items with display names', async () => {
    // SELECT template
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([warmupTemplateRow]));
    // SELECT items with JOIN
    const itemRowWithDisplay = {
      ...warmupTemplateItemRow,
      display_name: 'Foam Roll Quads',
      source: 'warmup',
    };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([itemRowWithDisplay]));

    const result = await getWarmupTemplateWithItems(1);

    expect(result.template).toEqual({
      id: 1,
      name: 'Upper Body Warmup',
      createdAt: '2026-04-15T10:00:00.000Z',
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].displayName).toBe('Foam Roll Quads');
    expect(result.items[0].source).toBe('warmup');
    expect(mockExecuteSql).toHaveBeenCalledTimes(2);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('warmup_templates'),
      [1],
    );
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('warmup_template_items'),
      [1],
    );
  });
});

// ── getWarmupTemplatePreview ──────────────────────────────────────────

describe('getWarmupTemplatePreview', () => {
  it('returns itemCount and up to 3 previewNames', async () => {
    // COUNT query
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 5 }]));
    // LIMIT 3 name query
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { display_name: 'Foam Roll Quads' },
        { display_name: 'Hip Circles' },
        { display_name: 'Arm Swings' },
      ]),
    );

    const result = await getWarmupTemplatePreview(1);

    expect(result.itemCount).toBe(5);
    expect(result.previewNames).toEqual(['Foam Roll Quads', 'Hip Circles', 'Arm Swings']);
    expect(mockExecuteSql).toHaveBeenCalledTimes(2);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('COUNT(*)'),
      [1],
    );
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('LIMIT 3'),
      [1],
    );
  });

  it('returns empty previewNames when template has no items', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getWarmupTemplatePreview(1);

    expect(result.itemCount).toBe(0);
    expect(result.previewNames).toEqual([]);
  });
});

// ── addWarmupTemplateItem ─────────────────────────────────────────────

describe('addWarmupTemplateItem', () => {
  it('computes next sort_order then inserts and returns insertId', async () => {
    // sort_order query
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ next_order: 2 }]));
    // INSERT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 10));

    const id = await addWarmupTemplateItem(1, null, 1, 'duration', 120);

    expect(id).toBe(10);
    expect(mockExecuteSql).toHaveBeenCalledTimes(2);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('COALESCE(MAX(sort_order)'),
      [1],
    );
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('INSERT INTO warmup_template_items'),
      [1, null, 1, 'duration', 120, 2],
    );
  });
});

// ── removeWarmupTemplateItem ──────────────────────────────────────────

describe('removeWarmupTemplateItem', () => {
  it('deletes item by id', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await removeWarmupTemplateItem(10);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('DELETE FROM warmup_template_items'),
      [10],
    );
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
  });
});

// ── reorderWarmupTemplateItems ────────────────────────────────────────

describe('reorderWarmupTemplateItems', () => {
  it('updates sort_order for each item in the array order', async () => {
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([], 0))
      .mockResolvedValueOnce(mockResultSet([], 0))
      .mockResolvedValueOnce(mockResultSet([], 0));

    await reorderWarmupTemplateItems(1, [10, 11, 12]);

    expect(mockExecuteSql).toHaveBeenCalledTimes(3);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('SET sort_order = ?'),
      [0, 10, 1],
    );
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('SET sort_order = ?'),
      [1, 11, 1],
    );
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      3,
      mockDb,
      expect.stringContaining('SET sort_order = ?'),
      [2, 12, 1],
    );
  });

  it('does nothing when itemIds is empty', async () => {
    await reorderWarmupTemplateItems(1, []);

    expect(mockExecuteSql).not.toHaveBeenCalled();
  });
});

// ── getWarmupSessionItems ─────────────────────────────────────────────

describe('getWarmupSessionItems', () => {
  it('returns session items ordered by sort_order', async () => {
    const completedRow = { ...warmupSessionItemRow, id: 2, is_complete: 1, sort_order: 1 };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([warmupSessionItemRow, completedRow]));

    const result = await getWarmupSessionItems(10);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 1,
      sessionId: 10,
      exerciseId: null,
      warmupExerciseId: 1,
      displayName: 'Foam Roll Quads',
      trackingType: 'duration',
      targetValue: 120,
      isComplete: false,
      sortOrder: 0,
    });
    expect(result[1].isComplete).toBe(true);
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('ORDER BY sort_order ASC'),
      [10],
    );
  });

  it('returns empty array when no items in session', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getWarmupSessionItems(10);

    expect(result).toEqual([]);
  });
});

// ── toggleWarmupSessionItemComplete ──────────────────────────────────

describe('toggleWarmupSessionItemComplete', () => {
  it('returns false when item not found', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await toggleWarmupSessionItemComplete(1);

    expect(result).toBe(false);
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
  });

  it('toggles from incomplete (0) to complete (1) and returns true', async () => {
    // SELECT: is_complete = 0
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ is_complete: 0 }]));
    // UPDATE
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    const result = await toggleWarmupSessionItemComplete(1);

    expect(result).toBe(true);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('SET is_complete = ?'),
      [1, 1],
    );
  });

  it('toggles from complete (1) to incomplete (0) and returns false', async () => {
    // SELECT: is_complete = 1
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ is_complete: 1 }]));
    // UPDATE
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    const result = await toggleWarmupSessionItemComplete(1);

    expect(result).toBe(false);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('SET is_complete = ?'),
      [0, 1],
    );
  });
});

// ── clearWarmupSessionItems ───────────────────────────────────────────

describe('clearWarmupSessionItems', () => {
  it('deletes all items for the given session', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await clearWarmupSessionItems(10);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('DELETE FROM warmup_session_items'),
      [10],
    );
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
  });
});

// ── loadWarmupIntoSession ─────────────────────────────────────────────

describe('loadWarmupIntoSession', () => {
  it('clears existing items, reads template items, inserts session items', async () => {
    // DELETE existing
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));
    // SELECT template items with display names
    const templateItemRow = {
      exercise_id: null,
      warmup_exercise_id: 1,
      tracking_type: 'duration',
      target_value: 120,
      sort_order: 0,
      display_name: 'Foam Roll Quads',
    };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([templateItemRow]));
    // INSERT session item
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 1));

    await loadWarmupIntoSession(10, 1);

    expect(mockExecuteSql).toHaveBeenCalledTimes(3);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('DELETE FROM warmup_session_items'),
      [10],
    );
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('warmup_template_items'),
      [1],
    );
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      3,
      mockDb,
      expect.stringContaining('INSERT INTO warmup_session_items'),
      [10, null, 1, 'Foam Roll Quads', 'duration', 120, 0],
    );
  });

  it('only clears when template has no items', async () => {
    // DELETE existing
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));
    // SELECT template items — empty
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    await loadWarmupIntoSession(10, 99);

    expect(mockExecuteSql).toHaveBeenCalledTimes(2);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('DELETE FROM warmup_session_items'),
      [10],
    );
  });

  it('inserts multiple items when template has several', async () => {
    // DELETE existing
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));
    // SELECT template items
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        {
          exercise_id: null,
          warmup_exercise_id: 1,
          tracking_type: 'duration',
          target_value: 60,
          sort_order: 0,
          display_name: 'Arm Circles',
        },
        {
          exercise_id: null,
          warmup_exercise_id: 2,
          tracking_type: 'reps',
          target_value: 10,
          sort_order: 1,
          display_name: 'Hip Circles',
        },
      ]),
    );
    // INSERT item 1
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 1));
    // INSERT item 2
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 2));

    await loadWarmupIntoSession(10, 1);

    expect(mockExecuteSql).toHaveBeenCalledTimes(4);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      3,
      mockDb,
      expect.stringContaining('INSERT INTO warmup_session_items'),
      [10, null, 1, 'Arm Circles', 'duration', 60, 0],
    );
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      4,
      mockDb,
      expect.stringContaining('INSERT INTO warmup_session_items'),
      [10, null, 2, 'Hip Circles', 'reps', 10, 1],
    );
  });
});
