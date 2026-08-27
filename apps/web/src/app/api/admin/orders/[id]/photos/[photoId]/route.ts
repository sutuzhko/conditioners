/**
 * Удаление фотографии наряда — docs/API.md §13.
 *
 * Этап решает, кому это доступно: фото «до» снимает и убирает владелец, фото
 * «после» — монтажник своего наряда. Проверку делает репозиторий.
 */
import { noContent, withAdmin } from '@/server/http';
import { removePhoto } from '@/server/repo/order-files';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string; photoId: string }> };

export const DELETE = withAdmin(async (_request, context: Context, session) => {
  const { id, photoId } = await context.params;

  await removePhoto(id, photoId, { role: session.role, userId: session.userId });

  return noContent();
});
