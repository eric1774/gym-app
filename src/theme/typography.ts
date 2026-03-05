export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  display: 40,
} as const;

export const weightRegular = '400' as const;
export const weightMedium = '500' as const;
export const weightSemiBold = '600' as const;
export const weightBold = '700' as const;

export const typography = {
  fontSize,
  weightRegular,
  weightMedium,
  weightSemiBold,
  weightBold,
} as const;
