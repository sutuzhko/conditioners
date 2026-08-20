/**
 * Ворота админки — docs/TECH_DECISIONS §8.
 *
 * Middleware работает на edge и в базу не ходит: здесь проверяется только
 * наличие cookie сессии — дёшево и достаточно, чтобы неавторизованный запрос
 * не доехал до обработчика. Настоящая проверка токена живёт в `server/auth.ts`
 * и вызывается каждым маршрутом админки.
 *
 * 🔴 Страницы админки отдают `noindex, nofollow`: путь закрыт и в robots.txt,
 * но заголовок работает и по прямой ссылке.
 */
import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'session';
const LOGIN_PATH = '/admin/login';
const NOINDEX = 'noindex, nofollow';

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const authenticated = request.cookies.has(SESSION_COOKIE);

  if (pathname.startsWith('/api/admin')) {
    if (authenticated) return NextResponse.next();

    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Нужно войти в админку' } },
      { status: 401, headers: { 'X-Robots-Tag': NOINDEX } },
    );
  }

  const isLoginPage = pathname === LOGIN_PATH;

  if (!authenticated && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = '';
    // Куда вернуть после входа — иначе владелец каждый раз идёт от корня.
    url.searchParams.set('next', `${pathname}${search}`);

    const redirect = NextResponse.redirect(url);
    redirect.headers.set('X-Robots-Tag', NOINDEX);
    return redirect;
  }

  if (authenticated && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.search = '';

    const redirect = NextResponse.redirect(url);
    redirect.headers.set('X-Robots-Tag', NOINDEX);
    return redirect;
  }

  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', NOINDEX);
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
