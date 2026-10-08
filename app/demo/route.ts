import { NextRequest, NextResponse } from 'next/server';
import { DEMO_COOKIE } from '@/lib/demo/mode';

// "Try the demo": switch this browser into demo mode and open the app. The
// cookie isn't a secret — it opens page shells, never the API (lib/routing.ts) —
// so the client can read it too (lib/demo/mode.ts).
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/', req.url));
  res.cookies.set(DEMO_COOKIE, '1', { path: '/', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 });
  return res;
}
