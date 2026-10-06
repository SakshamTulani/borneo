/**
 * How a reviewer is named on a review (D-150): first name and last initial, never the full name
 * or email. "Aarav Mehta" → "Aarav M.", "Zoya" → "Zoya", "" → "Verified buyer".
 */
export function reviewerName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Verified buyer';
  const last = parts.length > 1 ? ` ${parts.at(-1)![0]!.toUpperCase()}.` : '';
  return `${parts[0]}${last}`;
}

/** Reviews at each star rating, index 0 = 1 star (D-150). Out-of-range ratings are ignored. */
export function ratingCounts(
  rows: { rating: number; count: number }[],
): [number, number, number, number, number] {
  const counts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const r of rows) {
    if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1] = counts[r.rating - 1]! + r.count;
  }
  return counts;
}
