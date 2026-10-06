// Presentation-only formatting. India time, en-IN locale (D-01).
const TZ = 'Asia/Kolkata';

const day = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: TZ,
});
const dateTime = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: TZ,
});

// ICU emits thin/narrow no-break spaces that differ across Node and browsers.
const plainSpaces = (s: string) => s.replace(/[\u2009\u202f\u00a0]/g, ' ');

/** "Thu, 9 Oct – Sat, 11 Oct" for delivery estimates (D-52). */
export function formatDateRange(fromIso: string, toIso: string): string {
  return plainSpaces(day.formatRange(new Date(fromIso), new Date(toIso)));
}

export function formatDay(iso: string): string {
  return plainSpaces(day.format(new Date(iso)));
}

export function formatDateTime(iso: string): string {
  return plainSpaces(dateTime.format(new Date(iso)));
}

/** "1d 04h 12m" above a day, otherwise "04:12:09". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}
