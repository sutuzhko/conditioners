/**
 * Пометка у записи журнала — docs/API.md §18.
 *
 * 🔴 `PATCH` — единственный метод этого адреса, и правит он одно поле.
 * `DELETE` здесь не забыт: построчного удаления в API нет вовсе (ADR-345,
 * issue #821). Убрать из журнала одну неудобную строку не должно быть
 * возможно ни владельцу, ни ошибкой клиента — есть только чистка за период,
 * и она оставляет свой след.
 *
 * 🔴 Попытка переписать автора, время или состав изменений — 403, а не 400.
 * Разница не косметическая: 400 читается как «поправьте тело и повторите», а
 * повторять здесь нечего — этого нельзя. Журнал, в котором переписывается
 * автор, доказывает ровно столько же, сколько пустой (инвариант 7).
 */
import { activityImmutableFieldsIn, activityNoteSchema } from '@/entities/activity/model';
import { apiError, json, readJson, validationError, withOwner } from '@/server/http';
import { setNote } from '@/server/repo/activity';

export const dynamic = 'force-dynamic';

const IMMUTABLE_REFUSAL = 'Событие журнала не переписывается: у записи правится только пометка';

export const PATCH = withOwner(async (request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  const body = await readJson(request);

  const immutable = activityImmutableFieldsIn(body);
  if (immutable.length > 0) {
    return apiError('forbidden', IMMUTABLE_REFUSAL, { field: immutable[0] });
  }

  const parsed = activityNoteSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  return json(await setNote(id, parsed.data.note));
});
