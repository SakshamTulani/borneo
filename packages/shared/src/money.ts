/** Money is integer paise (ADR-0006). Formatting is the only place rupees appear. */
export type Paise = number;

export function formatInr(paise: Paise): string {
  assertPaise(paise);
  const digits = paise % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(paise / 100);
}

export function assertPaise(paise: number): void {
  if (!Number.isSafeInteger(paise)) throw new Error(`paise must be a safe integer, got ${paise}`);
}

/** Whole rupees (e.g. a price filter typed by a customer) to paise. */
export function fromRupees(rupees: number): Paise {
  if (!Number.isSafeInteger(rupees * 100) || !Number.isInteger(rupees))
    throw new Error(`rupees must be a whole number, got ${rupees}`);
  return rupees * 100;
}

export function sumPaise(values: Paise[]): Paise {
  return values.reduce((a, b) => a + b, 0);
}

/** `bps` basis points of `paise`, rounded half up (D-46). Exact via BigInt. */
export function percentOf(paise: Paise, bps: number): Paise {
  assertPaise(paise);
  return Number((BigInt(paise) * BigInt(bps) * 2n + 10_000n) / 20_000n);
}

/** Integer division rounded half up. */
export function divideHalfUp(paise: Paise, divisor: number): Paise {
  assertPaise(paise);
  if (!Number.isSafeInteger(divisor) || divisor <= 0)
    throw new Error(`divisor must be a positive integer, got ${divisor}`);
  return Number((BigInt(paise) * 2n + BigInt(divisor)) / (BigInt(divisor) * 2n));
}

/**
 * Split `total` across `weights` proportionally (weights are line values). Each share is
 * floored; the remainder goes to the last weighted line, spilling backwards so no line gets
 * more than its own weight (ADR-0006, D-46). Shares always sum to `total`.
 */
export function allocate(total: Paise, weights: Paise[]): Paise[] {
  assertPaise(total);
  if (weights.some((w) => !Number.isSafeInteger(w) || w < 0))
    throw new Error('weights must be non-negative integers');
  const sum = weights.reduce((a, b) => a + BigInt(b), 0n);
  if (BigInt(total) > sum) throw new Error('cannot allocate more than the sum of weights');
  if (sum === 0n) return weights.map(() => 0);
  const shares = weights.map((w) => Number((BigInt(total) * BigInt(w)) / sum));
  let remainder = total - sumPaise(shares);
  for (let i = weights.length - 1; i >= 0 && remainder > 0; i--) {
    const add = Math.min(remainder, weights[i]! - shares[i]!);
    shares[i]! += add;
    remainder -= add;
  }
  return shares;
}
