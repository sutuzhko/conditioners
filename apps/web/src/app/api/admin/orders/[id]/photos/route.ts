/**
 * Фотографии наряда — docs/API.md §13, разбор — docs/CRM.md §3.3.
 *
 * Маршрут открыт обеим ролям, но этапы у них разные: «до» — место установки,
 * его снимает владелец; «после» — выполненные работы, их снимает монтажник.
 * 🔴 Правило проверяет репозиторий, а не форма: у монтажника нет кнопки
 * «загрузить фото до», но защита не в этом (CRM.md §6).
 */
import { isPhotoStage } from '@/entities/order/model';
import { apiError, json, withAdmin } from '@/server/http';
import { addPhoto } from '@/server/repo/order-files';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const POST = withAdmin(async (request, context: Context, session) => {
  const { id } = await context.params;

  const form = await request.formData();

  const file = form.get('photo');
  if (!(file instanceof File)) {
    return apiError('validation_error', 'Приложите файл изображения', { field: 'photo' });
  }

  const stage = form.get('stage');
  if (typeof stage !== 'string' || !isPhotoStage(stage)) {
    return apiError('validation_error', 'Выберите, до работ снимок или после', { field: 'stage' });
  }

  const viewer = { role: session.role, userId: session.userId };

  return json(await addPhoto(id, stage, viewer, file), 201);
});
