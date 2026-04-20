jest.mock('../database', () => ({
  db: Promise.resolve({}),
  executeSql: jest.fn(),
  runTransaction: jest.fn(),
}));

import { executeSql } from '../database';
import { mockResultSet } from '@test-utils';
import { upsertSessionNote, getSessionNote, getLastSessionNote } from '../notes';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;

describe('upsertSessionNote', () => {
  beforeEach(() => { mockExecuteSql.mockReset(); });

  it('writes an UPSERT keyed on (session_id, exercise_id)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await upsertSessionNote(100, 5, 'felt heavy');
    const [, sql, params] = mockExecuteSql.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO exercise_session_notes/);
    expect(sql).toMatch(/ON CONFLICT\(session_id, exercise_id\)/);
    expect(params[0]).toBe(100);
    expect(params[1]).toBe(5);
    expect(params[2]).toBe('felt heavy');
  });

  it('deletes the row when text is empty', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await upsertSessionNote(100, 5, '');
    const [, sql, params] = mockExecuteSql.mock.calls[0];
    expect(sql).toMatch(/DELETE FROM exercise_session_notes/);
    expect(params).toEqual([100, 5]);
  });
});

describe('getSessionNote', () => {
  beforeEach(() => { mockExecuteSql.mockReset(); });
  it('returns the note string or null', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ notes: 'hello' }]));
    expect(await getSessionNote(100, 5)).toBe('hello');
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    expect(await getSessionNote(100, 5)).toBeNull();
  });
});

describe('getLastSessionNote', () => {
  beforeEach(() => { mockExecuteSql.mockReset(); });
  it('returns the most recent non-empty note for the exercise', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ notes: 'prev' }]));
    expect(await getLastSessionNote(5)).toBe('prev');
    const [, sql] = mockExecuteSql.mock.calls[0];
    expect(sql).toMatch(/ORDER BY .* DESC/);
    expect(sql).toMatch(/LIMIT 1/);
  });
});
