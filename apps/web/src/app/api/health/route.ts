/**
 * Проверка живости для мониторинга и оркестратора контейнеров — docs/API.md §13.
 * Проверяется именно база: поднявшееся приложение без базы бесполезно.
 *
 * Возраст очереди — справочное поле для внешнего монитора: старейшая
 * созревшая запись, которую воркер до сих пор не разобрал. Растёт — воркер
 * стоит. На статус ответа поле не влияет намеренно: на `/api/health` завязан
 * healthcheck контейнера web, и болезнь воркера не должна валить весь стек.
 */
import { db } from '@/server/db';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    await db.$queryRaw`SELECT 1`;

    const oldestDue = await db.notification.findFirst({
      where: { status: 'PENDING', nextTryAt: { lte: new Date() } },
      orderBy: { nextTryAt: 'asc' },
      select: { nextTryAt: true },
    });

    const queueLagSeconds =
      oldestDue === null ? null : Math.round((Date.now() - oldestDue.nextTryAt.getTime()) / 1000);

    return json({ ok: true, queueLagSeconds });
  } catch (error) {
    console.error('Проверка здоровья не прошла:', error);
    return json({ ok: false }, 503);
  }
}
