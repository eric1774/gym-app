jest.mock('../database');
jest.mock('../exercises');
jest.mock('../sessions');
jest.mock('../sets');
jest.mock('../seed');
jest.mock('../programs');
jest.mock('../dashboard');
jest.mock('../protein');
jest.mock('../macros');

// Trivial import test to register the barrel export file for coverage.
// The db/index.ts file re-exports from all submodules — it has no logic.
describe('db/index barrel exports', () => {
  it('exports expected functions from database module', async () => {
    const db = require('../index');
    expect(db.initDatabase).toBeDefined();
    expect(db.executeSql).toBeDefined();
    expect(db.runTransaction).toBeDefined();
  });

  it('exports expected functions from exercises module', async () => {
    const db = require('../index');
    expect(db.getExercises).toBeDefined();
    expect(db.addExercise).toBeDefined();
    expect(db.deleteExercise).toBeDefined();
  });

  it('exports expected functions from sessions module', async () => {
    const db = require('../index');
    expect(db.createSession).toBeDefined();
    expect(db.getActiveSession).toBeDefined();
  });

  it('exports expected functions from protein module', async () => {
    const db = require('../index');
    expect(db.addMeal).toBeDefined();
    expect(db.getProteinGoal).toBeDefined();
    expect(db.setProteinGoal).toBeDefined();
  });
});
