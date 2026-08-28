import { NextResponse } from 'next/server';
import { SESSION_COOKIE, destroySession, expiredSessionCookieOptions } from '@/server/auth';
import { withSessionRoute } from '@/server/http';

export const dynamic = 'force-dynamic';

export const POST = withSessionRoute(async (request) => {
  await destroySession(request.cookies.get(SESSION_COOKIE)?.value);

  const response = new NextResponse(null, { status: 204 });
  // Cookie гасим в любом случае: даже если сессии в базе уже не было.
  response.cookies.set(SESSION_COOKIE, '', expiredSessionCookieOptions());
  return response;
});
