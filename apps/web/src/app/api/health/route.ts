/**
 * Проверка живости для мониторинга и оркестратора контейнеров — docs/API.md §13.
 * Проверяется именно база: поднявшееся приложение без базы бесполезно.
 *
 * Возраст последнего дампа — второе справочное поле, того же рода (ADR-191).
 * Бэкап может перестать сниматься молча, и узнаётся об этом в день
 * восстановления; здесь он виден числом. На статус ответа не влияет так же
 * намеренно: протухший дамп не повод перезапускать сайт.
 *
 * Возраст очереди — справочное поле для внешнего монитора: старейшая
 * созревшая запись, которую воркер до сих пор не разобрал. Растёт — воркер
 * стоит. На статус ответа поле не влияет намеренно: на `/api/health` завязан
 * healthcheck контейнера web, и болезнь воркера не должна валить весь стек.
 */
import { stat } from 'node:fs/promises';

import { db } from '@/server/db';
import { env } from '@/shared/config/env';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';

/**
 * Возраст файла-метки в часах. `null` — если метка не заведена или её нет:
 * оба случая для внешнего монитора значат одно, «сведений нет», и различать
 * их в ответе незачем. Ошибка чтения тоже даёт `null` — проверка живости не
 * имеет права падать из-за недоступного тома.
 */
async function readBackupAgeHours(): Promise<number | null> {
  const markPath = env.BACKUP_MARK_PATH;
  if (markPath === undefined || markPath === '') return null;

  try {
    const mark = await stat(markPath);
    return Math.round((Date.now() - mark.mtimeMs) / 3_600_000);
  } catch {
    return null;
  }
}

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

    return json({ ok: true, queueLagSeconds, backupAgeHours: await readBackupAgeHours() });
  } catch (error) {
    console.error('Проверка здоровья не прошла:', error);
    return json({ ok: false }, 503);
  }
}
