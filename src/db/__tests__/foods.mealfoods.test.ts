jest.mock('react-native-sqlite-storage');
jest.mock('../database');
import { rowToMealFood } from '../foods';
import { computeCalories } from '../../utils/macros';

describe('rowToMealFood', () => {
  it('maps meal_foods row to MealFood with camelCase fields and computed calories', () => {
    const row = {
      id: 1,
      meal_id: 10,
      food_id: 5,
      food_name: 'Chicken Breast',
      grams: 150,
      protein: 46.5,
      carbs: 0,
      fat: 5.4,
    };
    const result = rowToMealFood(row);
    expect(result.id).toBe(1);
    expect(result.mealId).toBe(10);
    expect(result.foodId).toBe(5);
    expect(result.foodName).toBe('Chicken Breast');
    expect(result.grams).toBe(150);
    expect(result.protein).toBe(46.5);
    expect(result.carbs).toBe(0);
    expect(result.fat).toBe(5.4);
    expect(result.calories).toBeCloseTo(computeCalories(46.5, 0, 5.4), 5);
  });

  it('computes calories correctly for high-carb food', () => {
    const row = {
      id: 2,
      meal_id: 10,
      food_id: 8,
      food_name: 'White Rice',
      grams: 200,
      protein: 5.4,
      carbs: 56.4,
      fat: 0.6,
    };
    const result = rowToMealFood(row);
    // computeCalories(5.4, 56.4, 0.6) = 5.4*4 + 56.4*4 + 0.6*9 = 21.6 + 225.6 + 5.4 = 252.6
    expect(result.calories).toBeCloseTo(252.6, 1);
    expect(result.calories).toBeCloseTo(computeCalories(5.4, 56.4, 0.6), 5);
  });

  it('handles zero grams with zero macros', () => {
    const row = {
      id: 3,
      meal_id: 10,
      food_id: 1,
      food_name: 'Nothing',
      grams: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
    const result = rowToMealFood(row);
    expect(result.grams).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.carbs).toBe(0);
    expect(result.fat).toBe(0);
    expect(result.calories).toBe(0);
  });
});
