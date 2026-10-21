// Retain rounding residuals so a large term cannot conceal smaller liabilities.
export function hasFiniteNonNegativeSum(values: readonly number[]): boolean {
  let expansion: number[] = [];
  for (const value of values) {
    if (!Number.isFinite(value) || value < 0) return false;
    let sum = value;
    const next: number[] = [];
    for (const part of expansion) {
      const combined = sum + part;
      if (!Number.isFinite(combined)) return false;
      const recovered = combined - sum;
      const residual = (sum - (combined - recovered)) + (part - recovered);
      if (residual !== 0) next.push(residual);
      sum = combined;
    }
    next.push(sum);
    expansion = next;
  }
  if (expansion[expansion.length - 1] !== Number.MAX_VALUE) return true;
  return (expansion[expansion.length - 2] ?? 0) <= 0;
}
