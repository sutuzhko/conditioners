/**
 * Проверка живости для мониторинга и оркестратора контейнеров — docs/API.md §10.
 * Проверяется именно база: поднявшееся приложение без базы бесполезно.
 */
import { db } from '@/server/db';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    await db.$queryRaw`SELECT 1`;
    return json({ ok: true });
  } catch (error) {
    console.error('Проверка здоровья не прошла:', error);
    return json({ ok: false }, 503);
  }
}
