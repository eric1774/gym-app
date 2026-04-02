/**
 * Compute total calories from macronutrient grams.
 * Protein: 4 cal/g, Carbs: 4 cal/g, Fat: 9 cal/g.
 *
 * Returns the raw number — consumers round if needed.
 */
export function computeCalories(proteinGrams: number, carbGrams: number, fatGrams: number): number {
  return (proteinGrams * 4) + (carbGrams * 4) + (fatGrams * 9);
}
