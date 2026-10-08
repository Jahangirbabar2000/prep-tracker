import { describe, expect, it } from 'vitest';
import { describeSyncFailure } from './syncFailure';

describe('describeSyncFailure', () => {
  it('names the missing env var', () => {
    expect(describeSyncFailure(new Error('TURSO_DATABASE_URL is not set'))).toMatch(/TURSO_DATABASE_URL/);
  });

  it('points an unmigrated database at db:migrate', () => {
    expect(describeSyncFailure(new Error('SQLITE_ERROR: no such table: problems'))).toMatch(/npm run db:migrate/);
  });

  it('keeps any other database error generic', () => {
    const text = describeSyncFailure(new Error('SQLITE_IOERR: disk I/O error at /var/data/prep.db'));
    expect(text).not.toMatch(/var\/data|SQLITE/);
    expect(text).toMatch(/logs/);
  });
});
