jest.mock('react-native-sqlite-storage');
jest.mock('../database');

import { executeSql } from '../database';
import { mockResultSet } from '@test-utils/dbMock';
import {
  getAllMuscleGroups,
  getMuscleGroupsByCategory,
  getExerciseMuscleGroups,
  setExerciseMuscleGroups,
  getExercisesByMuscleGroups,
} from '../muscleGroups';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;
const mockDb = {};
const dbModule = require('../database');
Object.defineProperty(dbModule, 'db', {
  value: Promise.resolve(mockDb),
  writable: true,
});

beforeEach(() => jest.clearAllMocks());

describe('getAllMuscleGroups', () => {
  it('returns all muscle groups ordered by parent_category and sort_order', async () => {
    const row = { id: 1, name: 'Quads', parent_category: 'legs', sort_order: 1 };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([row]));

    const result = await getAllMuscleGroups();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 1, name: 'Quads', parentCategory: 'legs', sortOrder: 1 });
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('ORDER BY parent_category, sort_order'),
    );
  });
});

describe('getMuscleGroupsByCategory', () => {
  it('returns muscle groups filtered by parent_category', async () => {
    const row = { id: 5, name: 'Biceps', parent_category: 'arms', sort_order: 1 };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([row]));

    const result = await getMuscleGroupsByCategory('arms');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Biceps');
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('parent_category = ?'),
      ['arms'],
    );
  });
});

describe('getExerciseMuscleGroups', () => {
  it('returns muscle group mappings for an exercise', async () => {
    const row = { exercise_id: 1, muscle_group_id: 3, is_primary: 1, name: 'Chest', parent_category: 'chest', sort_order: 3 };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([row]));

    const result = await getExerciseMuscleGroups(1);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      muscleGroupId: 3,
      name: 'Chest',
      parentCategory: 'chest',
      isPrimary: true,
    });
  });
});

describe('getExercisesByMuscleGroups', () => {
  it('returns exercises sorted by match count descending', async () => {
    const row1 = { id: 2, name: 'Incline Bench', category: 'chest', default_rest_seconds: 90, is_custom: 0, measurement_type: 'reps', created_at: '2026-01-01', match_count: 3 };
    const row2 = { id: 3, name: 'Cable Fly', category: 'chest', default_rest_seconds: 90, is_custom: 0, measurement_type: 'reps', created_at: '2026-01-01', match_count: 1 };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([row1, row2]));

    const result = await getExercisesByMuscleGroups([1, 2, 3], [10]);

    expect(result).toHaveLength(2);
    expect(result[0].exercise.name).toBe('Incline Bench');
    expect(result[0].matchCount).toBe(3);
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('GROUP BY'),
      expect.any(Array),
    );
  });
});
