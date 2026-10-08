// What to tell the person when /api/sync can't read the database.
//
// The two setup mistakes a fresh deployment actually hits each get the fix
// spelled out; anything else stays generic, because this goes to whoever
// opened the app and a raw database error can describe the server's internals.

export function describeSyncFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('TURSO_DATABASE_URL is not set')) {
    return 'No database is configured. Set TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN for Turso) in the deployment’s environment variables, then redeploy.';
  }
  if (/no such table/i.test(message)) {
    return 'The database has no tables yet. Run `npm run db:migrate` against it (with TURSO_DATABASE_URL and TURSO_AUTH_TOKEN set), then reload.';
  }
  return 'The server couldn’t read the database. Check the deployment’s logs.';
}
