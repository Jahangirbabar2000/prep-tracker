import { NextRequest, NextResponse } from 'next/server';
import { DEMO_COOKIE } from '@/lib/demo/mode';
import { safeNextPath } from '@/lib/routing';

// Leave demo mode, then go to `next` (e.g. /login) or home. The demo's local
// data is deleted by the page before it navigates here (DemoBar).
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL(safeNextPath(req.nextUrl.searchParams.get('next')), req.url));
  res.cookies.set(DEMO_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
