/**
 * Данные компании — docs/PROJECT.md §3 «Ключи Setting», ADR-009.
 *
 * 🔴 Инвариант 8: ни одного факта об организации в коде. Здесь описана только
 * форма данных, но не сами данные — значения приходят из базы.
 *
 * Адрес хранится по частям: `PostalAddress` в JSON-LD требует отдельных полей,
 * из частей строку собрать можно, из строки части — нет.
 */
import { z } from 'zod';

/** Заглушка из сидов. Она должна быть заметной и не имеет права уехать в прод. */
export const PLACEHOLDER = 'ЗАПОЛНИТЕ В АДМИНКЕ';

/**
 * Телефон приводится к единому виду: разные записи одного номера в шапке и в
 * разметке — типовой способ разойтись с карточкой Яндекс.Бизнеса (ADR-009).
 * Всё, что не похоже на российский номер (в том числе заглушка), остаётся как есть.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const national =
    digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))
      ? digits.slice(1)
      : digits.length === 10
        ? digits
        : null;

  if (national === null) return raw.trim();

  return `+7 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6, 8)}-${national.slice(8, 10)}`;
}

const text = z.string().trim().max(300);
const longText = z.string().trim().max(2000);
const optionalUrl = z.union([z.literal(''), z.string().trim().url('Ссылка указана неверно')]);
const phone = z.string().trim().min(1).max(60).transform(normalizePhone);
const time = z.string().regex(/^\d{2}:\d{2}$/, 'Время в формате ЧЧ:ММ');

const weekday = z.enum(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);

export const settingsSchemas = {
  company: z
    .object({
      name: text,
      legalName: text,
      tagline: text,
      foundedYear: z.coerce.number().int().min(1900).max(2100).nullable(),
    })
    .strict(),

  contacts: z
    .object({
      phones: z.array(phone).max(5),
      // Заглушка пропускается явным литералом: пока владелец не заполнил почту,
      // сохранять группу можно, но мусор вместо адреса — нельзя.
      email: z.union([
        z.literal(''),
        z.literal(PLACEHOLDER),
        z.string().trim().email('Проверьте адрес почты'),
      ]),
      telegram: text,
      whatsapp: text,
      hours: text,
      // Машиночитаемое расписание для `openingHours` в JSON-LD. Строка `hours`
      // остаётся тем, что видит человек: «Пн–Вс, 8:00–21:00».
      openingHours: z
        .array(z.object({ days: z.array(weekday).min(1), opens: time, closes: time }).strict())
        .max(7)
        .optional()
        .default([]),
    })
    .strict(),

  address: z
    .object({
      country: z.string().trim().length(2, 'Код страны из двух букв, например RU'),
      region: text,
      city: text,
      street: text,
      building: text,
      office: text,
      postalCode: text,
    })
    .strict(),

  geo: z
    .object({
      lat: z.coerce.number().min(-90).max(90).nullable(),
      lng: z.coerce.number().min(-180).max(180).nullable(),
    })
    .strict(),

  area: z
    .object({
      served: text,
      districts: z.array(text).max(50),
    })
    .strict(),

  legal: z
    .object({
      // Для ИП подпись поля ogrn — «ОГРНИП», для ООО — «ОГРН» (docs/API.md §5)
      form: z.enum(['ИП', 'ООО'], { errorMap: () => ({ message: 'Форма — ИП или ООО' }) }),
      name: text,
      inn: text,
      ogrn: text,
      address: text,
    })
    .strict(),

  extras: z
    .object({
      trassaPerM: z.coerce.number().int().min(0),
      shtrobPerM: z.coerce.number().int().min(0),
      heightWorks: z.coerce.number().int().min(0),
    })
    .strict(),

  warranty: z.object({ installation: longText, equipment: longText }).strict(),

  payment: z.object({ methods: z.array(text).max(20), vat: text }).strict(),

  social: z.object({ links: z.array(optionalUrl).max(20) }).strict(),

  seo: z
    .object({
      homeTitle: text,
      homeDescription: longText,
      titleSuffix: text,
      ogImage: text,
    })
    .strict(),

  integrations: z
    .object({
      metrikaId: text,
      messengerButtons: z.object({ telegram: z.boolean(), whatsapp: z.boolean() }).strict(),
      callback: z.object({ enabled: z.boolean() }).strict(),
    })
    .strict(),
} as const;

export type SettingKey = keyof typeof settingsSchemas;

export const SETTING_KEYS = Object.keys(settingsSchemas) as SettingKey[];

/**
 * Наружу отдаются только группы с данными компании. `integrations` — настройки
 * приложения, публичного чтения им не нужно (docs/API.md §5).
 */
export const PUBLIC_SETTING_KEYS: readonly SettingKey[] = [
  'company',
  'contacts',
  'address',
  'geo',
  'area',
  'legal',
  'extras',
  'warranty',
  'payment',
  'social',
  'seo',
];

export function isSettingKey(value: string): value is SettingKey {
  return Object.prototype.hasOwnProperty.call(settingsSchemas, value);
}

/**
 * Поля, без которых сайт врёт посетителю или теряет данные в разметке.
 * Пустой `office`, второй телефон или соцсети обязательными не считаются.
 */
export const REQUIRED_FIELDS: Record<SettingKey, readonly string[]> = {
  company: ['name', 'legalName', 'tagline'],
  contacts: ['phones', 'email', 'hours'],
  address: ['country', 'region', 'city', 'street', 'building', 'postalCode'],
  geo: ['lat', 'lng'],
  area: ['served'],
  legal: ['form', 'name', 'inn', 'ogrn', 'address'],
  extras: ['trassaPerM', 'shtrobPerM', 'heightWorks'],
  warranty: ['installation', 'equipment'],
  payment: ['methods', 'vat'],
  social: [],
  seo: ['homeTitle', 'homeDescription', 'titleSuffix'],
  integrations: [],
};
