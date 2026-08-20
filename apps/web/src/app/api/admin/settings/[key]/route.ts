/**
 * Чтение и обновление одной группы настроек — docs/API.md §5.
 *
 * Группа сохраняется целиком и валидируется своей схемой: у координат свой
 * диапазон, у телефона — свой вид, у формы собственности — свой список.
 */
import { json, notFound, readJson, validationError, withAdmin } from '@/server/http';
import { getGroup, putGroup } from '@/server/repo/settings';
import { settingSchemas } from '@/entities/settings/model';
import { isSettingKey } from '@/server/repo/settings-schemas';
import { revalidateEverything } from '@/server/revalidate';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ key: string }> };

export const GET = withAdmin(async (_request, context: Context) => {
  const { key } = await context.params;
  if (!isSettingKey(key)) return notFound('Раздел настроек');

  return json(await getGroup(key));
});

export const PUT = withAdmin(async (request, context: Context) => {
  const { key } = await context.params;
  if (!isSettingKey(key)) return notFound('Раздел настроек');

  const parsed = settingSchemas[key].safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  await putGroup(key, parsed.data);

  // Контакты и реквизиты стоят в шапке и футере — то есть на каждой странице.
  revalidateEverything();

  return json(parsed.data);
});
