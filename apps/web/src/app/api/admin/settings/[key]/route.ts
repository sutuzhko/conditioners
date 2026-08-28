/**
 * Чтение и обновление одной группы настроек — docs/API.md §5.
 *
 * Группа сохраняется целиком и валидируется своей схемой: у координат свой
 * диапазон, у телефона — свой вид, у формы собственности — свой список.
 *
 * 🔴 Раздел владельца, а не любой сессии панели (ADR-092). Маршруты стояли под
 * `withAdmin`, то есть монтажник читал данные компании и мог переписать
 * реквизиты продавца на всём сайте: страница `/admin/company` закрыта
 * `requireOwnerPage`, но защита в разметке — это подсказка интерфейса, а не
 * защита. В группе лежат персональные данные и адреса доставки уведомлений.
 */
import { json, notFound, readJson, validationError, withOwner } from '@/server/http';
import { getGroup, putGroup } from '@/server/repo/settings';
import { settingSchemas } from '@/entities/settings/model';
import { isSettingKey } from '@/server/repo/settings-schemas';
import { revalidateEverything } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ key: string }> };

export const GET = withOwner(async (_request, context: Context) => {
  const { key } = await context.params;
  if (!isSettingKey(key)) return notFound('Раздел настроек');

  return json(await getGroup(key));
});

export const PUT = withOwner(async (request, context: Context) => {
  const { key } = await context.params;
  if (!isSettingKey(key)) return notFound('Раздел настроек');

  const parsed = settingSchemas[key].safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  await putGroup(key, parsed.data);

  // Контакты и реквизиты стоят в шапке и футере — то есть на каждой странице.
  revalidateEverything();

  return json(parsed.data);
});
