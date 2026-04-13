/**
 * Epley式による推定1RM
 *   1RM = weight × (1 + reps / 30)
 * reps = 1 のときはそのまま weight。reps = 0 or 重量なしは 0。
 */
export function epleyOneRm(
  weightKg: number | null | undefined,
  reps: number | null | undefined
): number {
  if (weightKg == null || weightKg <= 0) return 0;
  if (reps == null || reps <= 0) return 0;
  return weightKg * (1 + reps / 30);
}
