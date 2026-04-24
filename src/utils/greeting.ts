export function greeting(now: Date, firstName?: string | null): string {
  const h = now.getHours();
  const base = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  if (firstName && firstName.trim().length > 0) {
    return `${base}, ${firstName.trim()}`;
  }
  return base;
}
