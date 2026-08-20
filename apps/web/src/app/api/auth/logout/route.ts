import { NextResponse } from 'next/server';
import { SESSION_COOKIE, destroySession } from '@/server/auth';
import { withRoute } from '@/server/http';

export const dynamic = 'force-dynamic';

export const POST = withRoute(async (request) => {
  await destroySession(request.cookies.get(SESSION_COOKIE)?.value);

  const response = new NextResponse(null, { status: 204 });
  // Cookie гасим в любом случае: даже если сессии в базе уже не было.
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
});
