import { getDb } from './db';

export function getConfigOptions(domain: string, field: string): string[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT value FROM config_options WHERE domain = ? AND field = ? ORDER BY sort_order ASC, id ASC'
  ).all(domain, field) as { value: string }[];
  return rows.map(r => r.value);
}
