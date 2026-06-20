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

const TZ = 'America/New_York';

/** YYYY-MM-DD string for today in Eastern time */
export function localToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

/** YYYY-MM-DD string for N days from now in Eastern time */
export function localDaysFromNow(n: number): string {
  const d = new Date(Date.now() + n * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

/** "YYYY-MM-DD HH:MM:SS" in Eastern time */
export function localNow(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}
