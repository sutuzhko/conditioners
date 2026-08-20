import { getAdminSession } from '@/server/auth';
import { json, unauthorized, withRoute } from '@/server/http';

export const dynamic = 'force-dynamic';

export const GET = withRoute(async () => {
  const session = await getAdminSession();
  if (session === null) return unauthorized();

  return json({
    login: session.login,
    expiresAt: session.expiresAt.toISOString(),
  });
});
