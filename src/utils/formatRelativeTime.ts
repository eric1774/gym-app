export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) { return 'just now'; }
  if (diffMin < 60) { return diffMin + 'm ago'; }
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) { return diffHrs + 'h ago'; }
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) { return diffDays + 'd ago'; }
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) { return diffWeeks + 'w ago'; }
  const diffMonths = Math.floor(diffDays / 30);
  return diffMonths + 'mo ago';
}
