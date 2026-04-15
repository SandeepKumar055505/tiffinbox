/**
 * IST Timezone Helpers
 *
 * TiffinPoint operates in India Standard Time (UTC+5:30).
 * All cutoff checks, cron schedules, and date comparisons
 * MUST use these helpers — never raw `new Date()`.
 *
 * Render servers run in UTC. Without explicit IST handling,
 * a "9 PM cutoff" would run at 9 PM UTC = 2:30 AM IST.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +5:30 in milliseconds

/**
 * Get current date/time in IST as a Date object.
 * The returned Date's UTC methods give IST values.
 * Use getUTC*() methods on the result.
 */
export function nowIST(): Date {
  const now = new Date();
  return new Date(now.getTime() + IST_OFFSET_MS);
}

/**
 * Get today's date string in IST (YYYY-MM-DD).
 */
export function todayIST(): string {
  const ist = nowIST();
  return formatDateIST(ist);
}

/**
 * Get yesterday's date string in IST (YYYY-MM-DD).
 */
export function yesterdayIST(): string {
  const ist = nowIST();
  ist.setUTCDate(ist.getUTCDate() - 1);
  return formatDateIST(ist);
}

/**
 * Get tomorrow's date string in IST (YYYY-MM-DD).
 */
export function tomorrowIST(): string {
  const ist = nowIST();
  ist.setUTCDate(ist.getUTCDate() + 1);
  return formatDateIST(ist);
}

/**
 * Get current hour in IST (0-23).
 */
export function currentHourIST(): number {
  return nowIST().getUTCHours();
}

/**
 * Get current hour and minutes in IST.
 */
export function currentTimeIST(): { hour: number; minute: number } {
  const ist = nowIST();
  return { hour: ist.getUTCHours(), minute: ist.getUTCMinutes() };
}

/**
 * Check if current IST time is before a given hour.
 * Used for cutoff checks: isBeforeCutoffIST(21) = "is it before 9 PM IST?"
 */
export function isBeforeCutoffIST(cutoffHour: number): boolean {
  return currentHourIST() < cutoffHour;
}

/**
 * Check if a given date string (YYYY-MM-DD) is today in IST.
 */
export function isTodayIST(dateStr: string): boolean {
  return dateStr === todayIST();
}

/**
 * Check if a given date string (YYYY-MM-DD) is tomorrow in IST.
 */
export function isTomorrowIST(dateStr: string): boolean {
  return dateStr === tomorrowIST();
}

/**
 * Parse a date string (YYYY-MM-DD) into a Date object at midnight IST.
 * Useful for comparing dates without timezone confusion.
 */
export function parseDateIST(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date where UTC methods return IST values.
  // This matches the "Artificial IST" pattern of nowIST().
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

/**
 * Format a Date to YYYY-MM-DD using its UTC values.
 * Expects a date that was created with IST offset applied.
 */
export function formatDateIST(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get the start of the week (Monday) containing the given date in IST.
 * If no date supplied, uses the current IST date.
 */
export function weekStartIST(date?: string): string {
  const ist = date ? parseDateIST(date) : nowIST();
  const day = ist.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // Mon=0, Sun=6
  ist.setUTCDate(ist.getUTCDate() - diff);
  return formatDateIST(ist);
}

/**
 * Get the end of the week (Sunday) containing the given date in IST.
 * If no date supplied, uses the current IST date.
 */
export function weekEndIST(date?: string): string {
  const ist = date ? parseDateIST(date) : nowIST();
  const day = ist.getUTCDay();
  const diff = day === 0 ? 0 : 7 - day;
  ist.setUTCDate(ist.getUTCDate() + diff);
  return formatDateIST(ist);
}

/**
 * Get the Real UTC range (start/end) for the IST week containing the given date.
 * Returns Date objects in Real UTC for database queries.
 */
export function weekRangeUTC(date?: string): { start: Date; end: Date } {
  const startStr = weekStartIST(date);
  const endStr = weekEndIST(date);

  // Monday 00:00 IST
  const start = new Date(parseDateIST(startStr).getTime() - IST_OFFSET_MS);
  // Following Monday 00:00 IST
  const end = new Date(parseDateIST(endStr).getTime() + 24 * 60 * 60 * 1000 - IST_OFFSET_MS);

  return { start, end };
}

/**
 * Get the Real UTC range (start/end) for a single IST day.
 * Returns Date objects in Real UTC for database queries.
 * dateStr defaults to today IST.
 */
export function dayRangeUTC(dateStr?: string): { start: Date; end: Date } {
  const date = dateStr ? parseDateIST(dateStr) : parseDateIST(todayIST());
  
  // Start of day: 00:00 IST
  const start = new Date(date.getTime() - IST_OFFSET_MS);
  // End of day: 00:00 IST next day
  const end = new Date(date.getTime() + 24 * 60 * 60 * 1000 - IST_OFFSET_MS);

  return { start, end };
}

/**
 * Convert IST hour to UTC cron hour.
 * IST is UTC+5:30, so:
 *   IST 22:00 = UTC 16:30
 *   IST 23:00 = UTC 17:30
 *   IST 00:00 = UTC 18:30 (previous day)
 *
 * Returns { hour, minute } in UTC for cron scheduling.
 */
export function istToCronUTC(istHour: number, istMinute: number = 0): { hour: number; minute: number } {
  let totalMinutes = istHour * 60 + istMinute - 330; // subtract 5h30m
  if (totalMinutes < 0) totalMinutes += 1440; // wrap around midnight
  return {
    hour: Math.floor(totalMinutes / 60),
    minute: totalMinutes % 60,
  };
}

/**
 * Get a cron expression for a given IST time.
 * e.g., cronIST(22, 0) returns "0 30 16 * * *" (22:00 IST = 16:30 UTC)
 */
export function cronIST(istHour: number, istMinute: number = 0): string {
  const { hour, minute } = istToCronUTC(istHour, istMinute);
  return `${minute} ${hour} * * *`;
}

/**
 * Get days between two date strings (YYYY-MM-DD).
 */
export function daysBetween(dateA: string, dateB: string): number {
  const a = parseDateIST(dateA).getTime();
  const b = parseDateIST(dateB).getTime();
  return Math.round(Math.abs(b - a) / (24 * 60 * 60 * 1000));
}

/**
 * Add days to a date string.
 */
export function addDays(dateStr: string, days: number): string {
  const d = parseDateIST(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateIST(d);
}

/**
 * Check if dateStr is in the past (before today IST).
 */
export function isPastIST(dateStr: string): boolean {
  return dateStr < todayIST();
}

/**
 * Check if dateStr is in the future (after today IST).
 */
export function isFutureIST(dateStr: string): boolean {
  return dateStr > todayIST();
}

/**
 * Get the ISO week number for a given date string.
 * Used for multi-week menu rotations.
 */
export function getWeekNumberIST(dateStr: string): number {
  const d = parseDateIST(dateStr);
  const date = new Date(d.getTime());
  date.setUTCHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  date.setUTCDate(date.getUTCDate() + 3 - (date.getUTCDay() + 6) % 7);
  // January 4 is always in week 1.
  const week1 = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getUTCDay() + 6) % 7) / 7);
}
