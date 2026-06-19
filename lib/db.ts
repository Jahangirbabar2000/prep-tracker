import { createClient, Client } from '@libsql/client';

function makeClient(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error('TURSO_DATABASE_URL is not set');
  return createClient({ url, authToken });
}

let _client: Client | null = null;

function getClient(): Client {
  if (!_client) _client = makeClient();
  return _client;
}

function toPlain(columns: string[], rows: ArrayLike<unknown>[]): Record<string, unknown>[] {
  return rows.map(row =>
    Object.fromEntries(columns.map((col, i) => [col, (row as unknown[])[i]]))
  );
}

export async function queryOne<T>(sql: string, args: unknown[] = []): Promise<T | null> {
  const result = await getClient().execute({ sql, args: args as never[] });
  if (result.rows.length === 0) return null;
  return toPlain(result.columns, result.rows)[0] as unknown as T;
}

export async function queryAll<T>(sql: string, args: unknown[] = []): Promise<T[]> {
  const result = await getClient().execute({ sql, args: args as never[] });
  return toPlain(result.columns, result.rows) as unknown as T[];
}

export async function execute(
  sql: string,
  args: unknown[] = [],
): Promise<{ lastInsertRowid: bigint; changes: number }> {
  const result = await getClient().execute({ sql, args: args as never[] });
  return { lastInsertRowid: result.lastInsertRowid ?? BigInt(0), changes: result.rowsAffected };
}

/** YYYY-MM-DD string for today in the local timezone — pass this into SQL instead of date('now','localtime') */
export function localToday(): string {
  return new Date().toLocaleDateString('en-CA');
}

/** YYYY-MM-DD string for N days from now in local timezone */
export function localDaysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA');
}

/** "YYYY-MM-DD HH:MM:SS" in the local timezone — use instead of datetime('now','localtime') in INSERT */
export function localNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
