jest.mock('../database');
import { rowToMeal, rowToProteinSettings, rowToLibraryMeal } from '../protein';

describe('rowToMeal', () => {
  it('maps meal row to Meal with camelCase fields', () => {
    const row = {
      id: 1,
      protein_grams: 30,
      description: 'Chicken',
      meal_type: 'lunch',
      logged_at: '2026-01-01T12:00:00',
      local_date: '2026-01-01',
      created_at: '2026-01-01T12:00:00',
    };
    expect(rowToMeal(row)).toEqual({
      id: 1,
      proteinGrams: 30,
      description: 'Chicken',
      mealType: 'lunch',
      loggedAt: '2026-01-01T12:00:00',
      localDate: '2026-01-01',
      createdAt: '2026-01-01T12:00:00',
    });
  });
});

describe('rowToProteinSettings', () => {
  it('maps protein settings row to ProteinSettings with camelCase fields', () => {
    const row = {
      id: 1,
      daily_goal_grams: 150,
      created_at: '2026-01-01T00:00:00',
      updated_at: '2026-01-01T12:00:00',
    };
    expect(rowToProteinSettings(row)).toEqual({
      id: 1,
      dailyGoalGrams: 150,
      createdAt: '2026-01-01T00:00:00',
      updatedAt: '2026-01-01T12:00:00',
    });
  });
});

describe('rowToLibraryMeal', () => {
  it('maps library meal row to LibraryMeal with camelCase fields', () => {
    const row = {
      id: 1,
      name: 'Greek Yogurt',
      protein_grams: 20,
      meal_type: 'snack',
      created_at: '2026-01-01T00:00:00',
    };
    expect(rowToLibraryMeal(row)).toEqual({
      id: 1,
      name: 'Greek Yogurt',
      proteinGrams: 20,
      mealType: 'snack',
      createdAt: '2026-01-01T00:00:00',
    });
  });
});
