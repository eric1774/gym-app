jest.mock('../database');

import { db, executeSql, runTransaction } from '../database';
import { mockResultSet } from '@test-utils';
import {
  createProgram,
  getPrograms,
  getProgram,
  deleteProgram,
  activateProgram,
  advanceWeek,
  decrementWeek,
  getProgramDays,
  createProgramDay,
  duplicateProgramDay,
  deleteProgramDay,
  renameProgramDay,
  renameProgram,
  getProgramDayExercises,
  addExerciseToProgramDay,
  removeExerciseFromProgramDay,
  updateExerciseTargets,
  reorderProgramDays,
  reorderProgramDayExercises,
  createSupersetGroup,
  removeSupersetGroup,
  getExercisesForWeekDay,
} from '../programs';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;
const mockRunTransaction = runTransaction as jest.MockedFunction<typeof runTransaction>;
const mockDb = {};
const dbModule = require('../database');
Object.defineProperty(dbModule, 'db', {
  value: Promise.resolve(mockDb),
  writable: true,
});

// ── Shared row fixtures ─────────────────────────────────────────────

const programRow = {
  id: 1,
  name: 'PPL',
  weeks: 8,
  start_date: null,
  current_week: 1,
  created_at: '2026-01-01T00:00:00',
};

const programRow2 = {
  id: 2,
  name: 'Full Body',
  weeks: 4,
  start_date: '2026-02-01',
  current_week: 2,
  created_at: '2026-01-15T00:00:00',
};

const dayRow = {
  id: 5,
  program_id: 1,
  name: 'Push Day',
  sort_order: 1,
  created_at: '2026-01-01T00:00:00',
};

const exerciseRow = {
  id: 7,
  program_day_id: 5,
  exercise_id: 10,
  target_sets: 4,
  target_reps: 12,
  target_weight_kg: 60,
  sort_order: 1,
  superset_group_id: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Program CRUD ─────────────────────────────────────────────────────

describe('createProgram', () => {
  it('inserts a new program and returns the inserted Program', async () => {
    // INSERT returns insertId=1
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 1));
    // SELECT returns program row
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([programRow]));

    const result = await createProgram('PPL', 8);

    expect(result).toEqual({
      id: 1,
      name: 'PPL',
      weeks: 8,
      startDate: null,
      currentWeek: 1,
      createdAt: '2026-01-01T00:00:00',
    });
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('INSERT INTO programs'),
      expect.arrayContaining(['PPL', 8]),
    );
  });
});

describe('getPrograms', () => {
  it('returns array of Program objects ordered by created_at DESC', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([programRow, programRow2]));

    const result = await getPrograms();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('PPL');
    expect(result[1].name).toBe('Full Body');
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('ORDER BY created_at DESC'),
    );
  });

  it('returns empty array when no programs exist', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getPrograms();

    expect(result).toEqual([]);
  });
});

describe('getProgram', () => {
  it('returns Program when found', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([programRow]));

    const result = await getProgram(1);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(1);
    expect(result!.name).toBe('PPL');
  });

  it('returns null when program not found', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getProgram(999);

    expect(result).toBeNull();
  });
});

describe('deleteProgram', () => {
  it('calls DELETE with the correct program id', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await deleteProgram(1);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('DELETE FROM programs'),
      [1],
    );
  });
});

describe('activateProgram', () => {
  it('calls UPDATE setting start_date to a non-null string containing the program id', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await activateProgram(1);

    const call = mockExecuteSql.mock.calls[0];
    expect(call[1]).toContain('SET start_date');
    const params = call[2] as unknown[];
    expect(typeof params[0]).toBe('string'); // start_date is a string
    expect(params[0]).not.toBeNull();
    expect(params[1]).toBe(1); // WHERE id = ?
  });
});

describe('advanceWeek', () => {
  it('calls UPDATE then SELECT and returns new week value', async () => {
    // UPDATE
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));
    // SELECT returns current_week=3
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ current_week: 3 }]));

    const result = await advanceWeek(1);

    expect(result).toBe(3);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('MIN(current_week + 1, weeks)'),
      [1],
    );
  });
});

describe('decrementWeek', () => {
  it('calls UPDATE then SELECT and returns floored week value', async () => {
    // UPDATE
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));
    // SELECT returns current_week=1 (floored at 1)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ current_week: 1 }]));

    const result = await decrementWeek(1);

    expect(result).toBe(1);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('MAX(current_week - 1, 1)'),
      [1],
    );
  });
});

// ── Program Day CRUD ─────────────────────────────────────────────────

describe('getProgramDays', () => {
  it('returns array of ProgramDay objects ordered by sort_order', async () => {
    const day2 = { ...dayRow, id: 6, name: 'Pull Day', sort_order: 2 };
    const day3 = { ...dayRow, id: 7, name: 'Leg Day', sort_order: 3 };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([dayRow, day2, day3]));

    const result = await getProgramDays(1);

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Push Day');
    expect(result[1].name).toBe('Pull Day');
    expect(result[2].name).toBe('Leg Day');
  });

  it('returns empty array when program has no days', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getProgramDays(1);

    expect(result).toEqual([]);
  });
});

describe('createProgramDay', () => {
  it('inserts a new day using count+1 as sort_order and returns ProgramDay', async () => {
    // COUNT returns 2 existing days → sortOrder=3
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 2 }]));
    // INSERT returns insertId=5
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 5));
    // SELECT returns inserted row
    const insertedDayRow = { ...dayRow, id: 5, sort_order: 3 };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([insertedDayRow]));

    const result = await createProgramDay(1, 'Push Day');

    expect(result.id).toBe(5);
    expect(result.sortOrder).toBe(3);
    expect(result.name).toBe('Push Day');
    // Verify INSERT was called with sortOrder=3
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('INSERT INTO program_days'),
      expect.arrayContaining([3]),
    );
  });
});

describe('duplicateProgramDay', () => {
  it('creates a copy of the day with (Copy) suffix and remaps superset group IDs', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

    const origDayRow = { id: 1, program_id: 1, name: 'Push Day', sort_order: 1, created_at: '2026-01-01T00:00:00' };
    // Two exercises share superset_group_id=100; one has null
    const ex1 = { id: 10, program_day_id: 1, exercise_id: 5, target_sets: 3, target_reps: 10, target_weight_kg: 0, sort_order: 1, superset_group_id: 100 };
    const ex2 = { id: 11, program_day_id: 1, exercise_id: 6, target_sets: 3, target_reps: 10, target_weight_kg: 0, sort_order: 2, superset_group_id: 100 };
    const ex3 = { id: 12, program_day_id: 1, exercise_id: 7, target_sets: 3, target_reps: 10, target_weight_kg: 0, sort_order: 3, superset_group_id: null };

    // SELECT original day
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([origDayRow]));
    // COUNT existing days
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 1 }]));
    // INSERT copy day → insertId=10
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 10));
    // SELECT exercises for original day
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([ex1, ex2, ex3]));
    // INSERT each exercise copy (3 exercises)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 20));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 21));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 22));
    // SELECT new day row
    const copiedDayRow = { id: 10, program_id: 1, name: 'Push Day (Copy)', sort_order: 2, created_at: '2026-01-01T00:00:00' };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([copiedDayRow]));

    const result = await duplicateProgramDay(1);

    expect(result.name).toBe('Push Day (Copy)');
    expect(result.id).toBe(10);

    // Verify exercise INSERT calls for superset group remapping
    // ex1 and ex2 share old group 100 → should share new group 1700000000000
    // ex3 has no group → should remain null
    const exerciseInserts = mockExecuteSql.mock.calls.filter(call =>
      (call[1] as string).includes('INSERT INTO program_day_exercises'),
    );
    expect(exerciseInserts).toHaveLength(3);

    const ex1Params = exerciseInserts[0][2] as unknown[];
    const ex2Params = exerciseInserts[1][2] as unknown[];
    const ex3Params = exerciseInserts[2][2] as unknown[];

    // ex1 and ex2 had group 100, both should get the same new group ID
    const newGroupIdForEx1 = ex1Params[ex1Params.length - 1];
    const newGroupIdForEx2 = ex2Params[ex2Params.length - 1];
    expect(newGroupIdForEx1).not.toBe(100); // old group ID remapped
    expect(newGroupIdForEx1).toBe(newGroupIdForEx2); // shared new group ID
    expect(ex3Params[ex3Params.length - 1]).toBeNull(); // no group → null

    jest.restoreAllMocks();
  });
});

describe('deleteProgramDay', () => {
  it('calls DELETE with the correct day id', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await deleteProgramDay(5);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('DELETE FROM program_days'),
      [5],
    );
  });
});

describe('renameProgramDay', () => {
  it('calls UPDATE with new name and day id', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await renameProgramDay(5, 'Leg Day');

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('UPDATE program_days SET name'),
      ['Leg Day', 5],
    );
  });
});

// ── renameProgram ───────────────────────────────────────────────────

describe('renameProgram', () => {
  it('calls UPDATE with new name and program id', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await renameProgram(1, 'New Name');

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('UPDATE programs SET name'),
      ['New Name', 1],
    );
  });
});

// ── Program Day Exercise CRUD ──────────────────────────────────────

describe('getProgramDayExercises', () => {
  it('returns array of ProgramDayExercise objects ordered by sort_order', async () => {
    const ex2 = { ...exerciseRow, id: 8, sort_order: 2 };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([exerciseRow, ex2]));

    const result = await getProgramDayExercises(5);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(7);
    expect(result[1].id).toBe(8);
  });
});

describe('addExerciseToProgramDay', () => {
  it('inserts exercise with explicit params and returns ProgramDayExercise', async () => {
    const insertedExRow = { ...exerciseRow, id: 7, target_sets: 4, target_reps: 12, target_weight_kg: 60 };
    // COUNT → sortOrder=2
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 1 }]));
    // INSERT → insertId=7
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 7));
    // SELECT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([insertedExRow]));

    const result = await addExerciseToProgramDay(5, 10, 4, 12, 60);

    expect(result.id).toBe(7);
    expect(result.targetSets).toBe(4);
    expect(result.targetReps).toBe(12);
    expect(result.targetWeightLbs).toBe(60);
  });

  it('uses default targetSets=3, targetReps=10, targetWeightLbs=0 when not provided', async () => {
    const defaultExRow = { ...exerciseRow, id: 8, target_sets: 3, target_reps: 10, target_weight_kg: 0 };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 8));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([defaultExRow]));

    const result = await addExerciseToProgramDay(5, 10);

    expect(result.targetSets).toBe(3);
    expect(result.targetReps).toBe(10);
    expect(result.targetWeightLbs).toBe(0);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('INSERT INTO program_day_exercises'),
      expect.arrayContaining([3, 10, 0]),
    );
  });
});

describe('removeExerciseFromProgramDay', () => {
  it('calls DELETE with the correct program_day_exercises id', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await removeExerciseFromProgramDay(7);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('DELETE FROM program_day_exercises'),
      [7],
    );
  });
});

describe('updateExerciseTargets', () => {
  it('calls UPDATE with sets, reps, weight, id in correct order', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await updateExerciseTargets(7, 5, 8, 80);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('UPDATE program_day_exercises SET target_sets'),
      [5, 8, 80, 7],
    );
  });
});

// ── Reorder functions (use runTransaction) ──────────────────────────

describe('reorderProgramDays', () => {
  it('calls tx.executeSql once per day with correct sort_order and id', async () => {
    let capturedTx: { executeSql: jest.Mock } | null = null;
    mockRunTransaction.mockImplementation(async (_db, work) => {
      const tx = { executeSql: jest.fn() };
      capturedTx = tx;
      work(tx as any);
    });

    await reorderProgramDays(1, [3, 1, 2]);

    expect(capturedTx).not.toBeNull();
    expect(capturedTx!.executeSql).toHaveBeenCalledTimes(3);
    expect(capturedTx!.executeSql).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('UPDATE program_days SET sort_order'),
      [0, 3, 1],
    );
    expect(capturedTx!.executeSql).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE program_days SET sort_order'),
      [1, 1, 1],
    );
    expect(capturedTx!.executeSql).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('UPDATE program_days SET sort_order'),
      [2, 2, 1],
    );
  });
});

describe('reorderProgramDayExercises', () => {
  it('calls tx.executeSql once per exercise with correct sort_order and id', async () => {
    let capturedTx: { executeSql: jest.Mock } | null = null;
    mockRunTransaction.mockImplementation(async (_db, work) => {
      const tx = { executeSql: jest.fn() };
      capturedTx = tx;
      work(tx as any);
    });

    await reorderProgramDayExercises(5, [7, 9]);

    expect(capturedTx).not.toBeNull();
    expect(capturedTx!.executeSql).toHaveBeenCalledTimes(2);
    expect(capturedTx!.executeSql).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('UPDATE program_day_exercises SET sort_order'),
      [0, 7, 5],
    );
    expect(capturedTx!.executeSql).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE program_day_exercises SET sort_order'),
      [1, 9, 5],
    );
  });
});

// ── Superset functions (use runTransaction) ──────────────────────────

describe('createSupersetGroup', () => {
  it('calls tx.executeSql once with IN clause containing all exercise ids and a fixed group id', async () => {
    const fixedGroupId = 1700000000000;
    jest.spyOn(Date, 'now').mockReturnValue(fixedGroupId);

    let capturedTx: { executeSql: jest.Mock } | null = null;
    mockRunTransaction.mockImplementation(async (_db, work) => {
      const tx = { executeSql: jest.fn() };
      capturedTx = tx;
      work(tx as any);
    });

    await createSupersetGroup(5, [5, 7, 9]);

    expect(capturedTx).not.toBeNull();
    expect(capturedTx!.executeSql).toHaveBeenCalledTimes(1);
    const [sql, params] = capturedTx!.executeSql.mock.calls[0];
    expect(sql).toContain('IN (?, ?, ?)');
    expect(params[0]).toBe(fixedGroupId); // group id
    expect(params[1]).toBe(5);            // day id
    expect(params[2]).toBe(5);            // exercise id 1
    expect(params[3]).toBe(7);            // exercise id 2
    expect(params[4]).toBe(9);            // exercise id 3

    jest.restoreAllMocks();
  });
});

describe('removeSupersetGroup', () => {
  it('calls UPDATE setting superset_group_id=NULL for matching day and group', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await removeSupersetGroup(5, 1700000000000);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('superset_group_id = NULL'),
      [5, 1700000000000],
    );
  });
});

describe('getExercisesForWeekDay', () => {
  beforeEach(() => {
    mockExecuteSql.mockReset();
  });

  it('returns base values when no overrides exist', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      {
        program_day_exercise_id: 10,
        exercise_id: 5,
        sort_order: 1,
        superset_group_id: null,
        sets: 4,
        reps: 8,
        weight_kg: 135,
        notes: null,
        override_row_exists: 0,
        sets_overridden: 0,
        reps_overridden: 0,
        weight_overridden: 0,
        notes_overridden: 0,
      },
    ]));

    const rows = await getExercisesForWeekDay(99, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      programDayExerciseId: 10,
      sets: 4,
      reps: 8,
      weightLbs: 135,
      notes: null,
      overrideRowExists: false,
      setsOverridden: false,
    });
  });

  it('passes programDayId and weekNumber as parameters', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getExercisesForWeekDay(42, 3);
    const [, sql, params] = mockExecuteSql.mock.calls[0];
    expect(sql.toLowerCase()).toContain('left join program_week_day_exercise_overrides');
    expect(params).toEqual([3, 42]);
  });

  it('reflects partial override (sets only)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      {
        program_day_exercise_id: 10,
        exercise_id: 5,
        sort_order: 1,
        superset_group_id: null,
        sets: 5,
        reps: 8,
        weight_kg: 135,
        notes: null,
        override_row_exists: 1,
        sets_overridden: 1,
        reps_overridden: 0,
        weight_overridden: 0,
        notes_overridden: 0,
      },
    ]));
    const rows = await getExercisesForWeekDay(99, 3);
    expect(rows[0].setsOverridden).toBe(true);
    expect(rows[0].repsOverridden).toBe(false);
    expect(rows[0].overrideRowExists).toBe(true);
  });
});
