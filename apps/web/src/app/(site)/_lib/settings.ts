import type { z } from 'zod';

import { settingSchemas, type Settings } from '@/entities/settings/model';
import { getAll } from '@/server/repo/settings';

/**
 * Чтение настроек компании для страниц кластера.
 *
 * Группы разбираются со значениями по умолчанию: битая или пустая запись в
 * базе не имеет права уронить публичную страницу — блоки сами умеют молчать
 * о том, чего в настройках нет (инвариант 8).
 *
 * Группа `extras` сюда не входит: у ставок калькулятора нет значений по
 * умолчанию — считать смету по выдуманным коэффициентам нельзя, и приходят
 * они вместе с прайсом из `getPrices`.
 */
export type SiteSettings = Omit<Settings, 'extras'>;

// z.infer, а не z.ZodType<T>: у схем с .default() тип входа и тип выхода
// различаются, и связывать обобщение по входу — значит получить поля
// необязательными там, где после разбора они уже гарантированы.
function parseGroup<S extends z.ZodTypeAny>(schema: S, raw: unknown): z.infer<S> {
  const parsed = schema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : schema.parse({});
}

export async function loadSettings(): Promise<SiteSettings> {
  const raw = await getAll();

  return {
    company: parseGroup(settingSchemas.company, raw.company),
    contacts: parseGroup(settingSchemas.contacts, raw.contacts),
    address: parseGroup(settingSchemas.address, raw.address),
    geo: parseGroup(settingSchemas.geo, raw.geo),
    area: parseGroup(settingSchemas.area, raw.area),
    legal: parseGroup(settingSchemas.legal, raw.legal),
    warranty: parseGroup(settingSchemas.warranty, raw.warranty),
    /* Публичным страницам рабочее окно не нужно — оно про сетку календаря в
       панели, — но `SiteSettings` собирается по всем ключам разом. */
    schedule: parseGroup(settingSchemas.schedule, raw.schedule),
    payment: parseGroup(settingSchemas.payment, raw.payment),
    social: parseGroup(settingSchemas.social, raw.social),
    seo: parseGroup(settingSchemas.seo, raw.seo),
    achievements: parseGroup(settingSchemas.achievements, raw.achievements),
    specs: parseGroup(settingSchemas.specs, raw.specs),
    notifications: parseGroup(settingSchemas.notifications, raw.notifications),
    integrations: parseGroup(settingSchemas.integrations, raw.integrations),
  };
}

/** Первый телефон компании — запасной путь форм. Нет телефона — пустая строка. */
export function primaryPhone(settings: SiteSettings): string {
  return settings.contacts.phones[0] ?? '';
}
