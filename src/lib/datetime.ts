/**
 * Unified datetime formatting utilities.
 * All functions use undefined locale so the browser follows the system locale,
 * and rely on the JS Date constructor to convert UTC timestamps to local time.
 */

/** Full date + time with year: "2026/02/26 14:30:05" (local) */
export function formatDateTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

/** Date only: "2026/02/26" (local) */
export function formatDate(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

/** Date + time without seconds, with year: "2026/02/26 14:30" (local) */
export function formatDateTimeShort(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

/** Hour label for trend charts: "14:00" in local time */
export function formatChartHour(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}
