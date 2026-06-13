/**
 * Format an ISO date string (YYYY-MM-DD or datetime) as MM-DD-YYYY.
 * Dates are stored as YYYY-MM-DD in the DB — this is display-only.
 */
export function fmtDate(iso: string): string {
  const s = iso.slice(0, 10); // take just YYYY-MM-DD portion
  const [y, m, d] = s.split('-');
  return `${m}-${d}-${y}`;
}

/**
 * Like fmtDate but shows "Today" when the date matches today's local date.
 */
export function fmtDateOrToday(iso: string): string {
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  if (iso.slice(0, 10) === today) return 'Today';
  return fmtDate(iso);
}
