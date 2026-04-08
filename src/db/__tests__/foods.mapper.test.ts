jest.mock('react-native-sqlite-storage');
jest.mock('../database');
import { rowToFood, rowToFoodSearchResult } from '../foods';

describe('rowToFood', () => {
  it('maps food row to Food with camelCase fields and computed calories', () => {
    const row = {
      id: 1,
      fdc_id: 12345,
      name: 'Chicken breast, raw',
      category: 'Poultry',
      protein_per_100g: 23.1,
      carbs_per_100g: 0,
      fat_per_100g: 1.2,
      search_text: 'chicken breast raw poultry',
      is_custom: 0,
    };
    const result = rowToFood(row);
    expect(result.id).toBe(1);
    expect(result.fdcId).toBe(12345);
    expect(result.name).toBe('Chicken breast, raw');
    expect(result.category).toBe('Poultry');
    expect(result.proteinPer100g).toBe(23.1);
    expect(result.carbsPer100g).toBe(0);
    expect(result.fatPer100g).toBe(1.2);
    // computeCalories(23.1, 0, 1.2) = 23.1*4 + 0*4 + 1.2*9 = 92.4 + 0 + 10.8 = 103.2
    expect(result.caloriesPer100g).toBeCloseTo(103.2, 1);
    expect(result.searchText).toBe('chicken breast raw poultry');
    expect(result.isCustom).toBe(false);
  });

  it('maps custom food with null fdc_id and category', () => {
    const row = {
      id: 2,
      fdc_id: null,
      name: 'My Custom Protein Bar',
      category: null,
      protein_per_100g: 20,
      carbs_per_100g: 40,
      fat_per_100g: 15,
      search_text: 'my custom protein bar',
      is_custom: 1,
    };
    const result = rowToFood(row);
    expect(result.fdcId).toBeNull();
    expect(result.category).toBeNull();
    expect(result.isCustom).toBe(true);
    expect(result.name).toBe('My Custom Protein Bar');
  });

  it('computes caloriesPer100g correctly for high-fat food', () => {
    const row = {
      id: 3,
      fdc_id: 99999,
      name: 'Pure Fat',
      category: 'Fats',
      protein_per_100g: 0,
      carbs_per_100g: 0,
      fat_per_100g: 100,
      search_text: 'pure fat',
      is_custom: 0,
    };
    const result = rowToFood(row);
    // computeCalories(0, 0, 100) = 0*4 + 0*4 + 100*9 = 900
    expect(result.caloriesPer100g).toBe(900);
    expect(result.isCustom).toBe(false);
  });
});

describe('rowToFoodSearchResult', () => {
  it('maps food search result with usage count', () => {
    const row = {
      id: 1,
      fdc_id: 12345,
      name: 'Chicken breast, raw',
      category: 'Poultry',
      protein_per_100g: 23.1,
      carbs_per_100g: 0,
      fat_per_100g: 1.2,
      search_text: 'chicken breast raw poultry',
      is_custom: 0,
      usage_count: 12,
    };
    const result = rowToFoodSearchResult(row);
    expect(result.usageCount).toBe(12);
    expect(result.id).toBe(1);
    expect(result.name).toBe('Chicken breast, raw');
    expect(result.isCustom).toBe(false);
    expect(result.caloriesPer100g).toBeCloseTo(103.2, 1);
  });

  it('defaults usageCount to 0 when usage_count is undefined', () => {
    const row = {
      id: 2,
      fdc_id: null,
      name: 'My Food',
      category: null,
      protein_per_100g: 10,
      carbs_per_100g: 20,
      fat_per_100g: 5,
      search_text: 'my food',
      is_custom: 1,
    };
    const result = rowToFoodSearchResult(row as any);
    expect(result.usageCount).toBe(0);
    expect(result.isCustom).toBe(true);
  });
});
