/**
 * Local date/datetime string utilities.
 *
 * These functions use local time components (getFullYear, getMonth, getDate,
 * getHours, getMinutes, getSeconds) instead of toISOString() which converts
 * to UTC. This is critical for day-boundary correctness: a meal logged at
 * 11:30 PM local time must appear under "today", not tomorrow in UTC.
 */

/**
 * Returns a local date string in YYYY-MM-DD format.
 *
 * Uses date.getFullYear(), date.getMonth()+1, date.getDate() with
 * zero-padding. Does NOT use toISOString() which would convert to UTC
 * and could shift the date across day boundaries.
 *
 * @param date - Date to format; defaults to new Date() (current local time)
 * @returns YYYY-MM-DD string in local timezone
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a local datetime string in YYYY-MM-DDTHH:MM:SS format (no Z suffix).
 *
 * Uses local time components (getHours, getMinutes, getSeconds) to avoid
 * UTC conversion. The absence of the Z suffix signals that this is a local
 * datetime, not a UTC timestamp.
 *
 * @param date - Date to format; defaults to new Date() (current local time)
 * @returns YYYY-MM-DDTHH:MM:SS string in local timezone (no Z suffix)
 */
export function getLocalDateTimeString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}
