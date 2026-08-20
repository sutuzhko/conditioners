/**
 * Публичное чтение одной группы данных компании — docs/API.md §5.
 * Отдаются только группы с данными организации; настройки интеграций наружу
 * не выходят.
 */
import { json, notFound, withRoute } from '@/server/http';
import { getGroup } from '@/server/repo/settings';
import { PUBLIC_SETTING_KEYS, isSettingKey } from '@/server/repo/settings-schemas';

export const dynamic = 'force-dynamic';

export const GET = withRoute(async (_request, context: { params: Promise<{ key: string }> }) => {
  const { key } = await context.params;

  if (!isSettingKey(key) || !PUBLIC_SETTING_KEYS.includes(key)) {
    return notFound('Раздел настроек');
  }

  const value = await getGroup(key);
  if (value === null) return notFound('Раздел настроек');

  return json(value);
});
