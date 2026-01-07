/**
 * Brand color palette for consistent styling across the app
 */
export const colors = {
  /** Positive/success state - green */
  positive: '#9DB38A',
  /** Negative/error state - red */
  negative: '#c17b7b',
  /** Light positive background */
  positiveBg: '#eff3eb',
  /** Negative background with transparency */
  negativeBg: 'rgba(193, 123, 123, 0.1)',
} as const;

export type ColorKey = keyof typeof colors;
