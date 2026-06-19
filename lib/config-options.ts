import { queryAll } from './db';

export async function getConfigOptions(domain: string, field: string): Promise<string[]> {
  const rows = await queryAll<{ value: string }>(
    'SELECT value FROM config_options WHERE domain = ? AND field = ? ORDER BY sort_order ASC, id ASC',
    [domain, field],
  );
  return rows.map(r => r.value);
}
