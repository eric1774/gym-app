jest.mock('react-native-sqlite-storage');
jest.mock('../database');
import { rowToMacroMeal, rowToMacroSettings, rowToMacroLibraryMeal } from '../macros';

describe('rowToMacroMeal', () => {
  it('maps macro meal row to MacroMeal with camelCase fields and computed calories', () => {
    const row = {
      id: 1,
      protein_grams: 30,
      carb_grams: 50,
      fat_grams: 15,
      description: 'Chicken with rice',
      meal_type: 'lunch',
      logged_at: '2026-03-15T12:00:00',
      local_date: '2026-03-15',
      created_at: '2026-03-15T10:00:00',
    };
    const result = rowToMacroMeal(row);
    expect(result).toEqual({
      id: 1,
      protein: 30,
      carbs: 50,
      fat: 15,
      calories: 30 * 4 + 50 * 4 + 15 * 9, // 120 + 200 + 135 = 455
      description: 'Chicken with rice',
      mealType: 'lunch',
      loggedAt: '2026-03-15T12:00:00',
      localDate: '2026-03-15',
      createdAt: '2026-03-15T10:00:00',
    });
  });

  it('computes calories correctly for zero macros', () => {
    const row = {
      id: 2,
      protein_grams: 0,
      carb_grams: 0,
      fat_grams: 0,
      description: 'Water',
      meal_type: 'snack',
      logged_at: '2026-03-15T08:00:00',
      local_date: '2026-03-15',
      created_at: '2026-03-15T08:00:00',
    };
    const result = rowToMacroMeal(row);
    expect(result.calories).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.carbs).toBe(0);
    expect(result.fat).toBe(0);
  });
});

describe('rowToMacroSettings', () => {
  it('maps macro settings row to MacroSettings with camelCase fields', () => {
    const row = {
      id: 1,
      protein_goal: 150,
      carb_goal: 200,
      fat_goal: 65,
      created_at: '2026-01-01T00:00:00',
      updated_at: '2026-03-15T10:00:00',
    };
    expect(rowToMacroSettings(row)).toEqual({
      id: 1,
      proteinGoal: 150,
      carbGoal: 200,
      fatGoal: 65,
      createdAt: '2026-01-01T00:00:00',
      updatedAt: '2026-03-15T10:00:00',
    });
  });

  it('maps null goal columns correctly', () => {
    const row = {
      id: 1,
      protein_goal: 150,
      carb_goal: null,
      fat_goal: null,
      created_at: '2026-01-01T00:00:00',
      updated_at: '2026-03-15T10:00:00',
    };
    const result = rowToMacroSettings(row);
    expect(result.proteinGoal).toBe(150);
    expect(result.carbGoal).toBeNull();
    expect(result.fatGoal).toBeNull();
  });
});

describe('rowToMacroLibraryMeal', () => {
  it('maps macro library meal row to MacroLibraryMeal with camelCase fields and computed calories', () => {
    const row = {
      id: 1,
      name: 'Protein Shake',
      protein_grams: 50,
      carb_grams: 20,
      fat_grams: 5,
      meal_type: 'snack',
      created_at: '2026-03-15T10:00:00',
    };
    expect(rowToMacroLibraryMeal(row)).toEqual({
      id: 1,
      name: 'Protein Shake',
      protein: 50,
      carbs: 20,
      fat: 5,
      calories: 50 * 4 + 20 * 4 + 5 * 9, // 200 + 80 + 45 = 325
      mealType: 'snack',
      createdAt: '2026-03-15T10:00:00',
    });
  });
});
