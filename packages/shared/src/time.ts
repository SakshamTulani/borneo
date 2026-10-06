// India Standard Time is UTC+05:30 all year (no DST), so fixed-offset math is exact.
const IST_OFFSET_MS = 330 * 60_000;
export const DAY_MS = 86_400_000;
export const MINUTE_MS = 60_000;

/** Calendar date in IST, "YYYY-MM-DD". */
export function istDate(ms: number): string {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Last millisecond of `days` calendar days after the IST date of `ms`. */
export function endOfIstDayAfter(ms: number, days: number): number {
  const startOfDay = Date.parse(`${istDate(ms)}T00:00:00.000Z`) - IST_OFFSET_MS;
  return startOfDay + (days + 1) * DAY_MS - 1;
}

export function addIstDays(ms: number, days: number): string {
  return istDate(ms + days * DAY_MS);
}
