/**
 * Документы наряда — docs/API.md §13, юридический разбор — docs/CRM.md §9.
 *
 * 🔴 Только владелец: договор, акт и гарантийный талон подписывает он.
 * Монтажник документы читает — своего наряда и через закрытую выдачу файла.
 */
import { isOrderDocKind } from '@/entities/order/model';
import { apiError, json, withOwner } from '@/server/http';
import { addDocument } from '@/server/repo/order-files';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const POST = withOwner(async (request, context: Context) => {
  const { id } = await context.params;

  const form = await request.formData();

  const file = form.get('file');
  if (!(file instanceof File)) {
    return apiError('validation_error', 'Приложите файл документа', { field: 'file' });
  }

  const kind = form.get('kind');
  if (typeof kind !== 'string' || !isOrderDocKind(kind)) {
    return apiError('validation_error', 'Выберите вид документа', { field: 'kind' });
  }

  const name = form.get('name');

  return json(await addDocument(id, kind, typeof name === 'string' ? name : null, file), 201);
});
