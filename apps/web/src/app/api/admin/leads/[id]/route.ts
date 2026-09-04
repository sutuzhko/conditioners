import { json, noContent, notFound, readJson, validationError, withOwner } from '@/server/http';
import { findById, update } from '@/server/repo/leads';
import { removeLead } from '@/server/services/leads';
import { leadUpdateSchema } from '@/entities/lead/model';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const GET = withOwner(async (_request, context: Context) => {
  const { id } = await context.params;
  const lead = await findById(id);
  return lead === null ? notFound('Заявка', 'f') : json(lead);
});

/**
 * Меняются статус, разбор отказа и комментарий менеджера.
 * Данные клиента — то, что он прислал; правка их превращает заявку в пересказ.
 * Ревалидации нет: заявки на публичных страницах не показываются.
 *
 * Отмена приезжает сюда: она состояние, а не уничтожение (ADR-310).
 */
export const PATCH = withOwner(async (request, context: Context) => {
  const { id } = await context.params;

  const parsed = leadUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return json(await update(id, parsed.data));
});

/**
 * 🔴 Уничтожение обращения — исполнение требования 152-ФЗ (issue #600).
 *
 * Отличается от отмены `PATCH`-ем принципиально: отмена оставляет обращение в
 * истории и в счётчиках конверсии, удаление не оставляет ничего. В заявке
 * лежат имя, телефон, адрес, комментарий и снимок комнаты — тот же состав
 * данных, что в карточке клиента, где `DELETE` есть с самого начала.
 *
 * Порядок и компенсация — в сервисе (ADR-142): обработчику принадлежат код
 * ответа и проверка доступа, а не последовательность записей.
 */
export const DELETE = withOwner(async (_request, context: Context) => {
  const { id } = await context.params;

  await removeLead(id);
  return noContent();
});
