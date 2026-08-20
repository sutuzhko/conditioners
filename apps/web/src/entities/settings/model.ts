import { z } from 'zod';

import { installRatesSchema } from '@/entities/price/model';

/**
 * Настройки: всё, что владелец правит сам.
 *
 * 🔴 Здесь живёт каждый факт о компании — название, телефон, адрес, реквизиты,
 * координаты. Ни один из них не имеет права появиться в коде (инвариант 8,
 * ADR-009). Расхождение NAP-данных с Яндекс.Бизнесом бьёт по локальной выдаче,
 * а разные телефоны в шапке и футере — типовой способ их получить.
 *
 * Группы намеренно снисходительны к пустоте: владелец заполняет их постепенно,
 * и запрещать сохранение половины формы нельзя. Готовность к запуску проверяет
 * отдельная функция — `lib/readiness`.
 */

/** Строка, которую можно оставить пустой. */
const optionalText = z.string().trim().default('');

/**
 * Телефоны приводятся к единому виду `+7XXXXXXXXXX`: они попадают и в `tel:`,
 * и в разметку `HVACBusiness`, и в Яндекс.Бизнес — три разных написания
 * одного номера поисковик считает тремя организациями.
 */
export const phoneSettingSchema = z
  .string()
  .trim()
  .transform((raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
      return `+7${digits.slice(1)}`;
    }
    if (digits.length === 10) return `+7${digits}`;
    return raw.trim();
  });

export const companySchema = z.object({
  name: optionalText,
  legalName: optionalText,
  tagline: optionalText,
  foundedYear: z.number().int().min(1900).max(2100).nullable().default(null),
});

export const contactsSchema = z.object({
  phones: z.array(phoneSettingSchema).default([]),
  email: optionalText,
  telegram: optionalText,
  whatsapp: optionalText,
  /** Часы работы для человека: «Пн–Вс, 8:00–21:00». */
  hours: optionalText,
  /**
   * То же самое в формате schema.org (`Mo-Su 08:00-21:00`). Хранится отдельно,
   * потому что человеческая запись и машинная должны совпадать по смыслу, а
   * вывести одну из другой надёжно нельзя (инвариант 9).
   */
  openingHours: z.array(z.string().trim()).default([]),
});

/**
 * Адрес хранится по частям: `PostalAddress` в JSON-LD требует отдельных полей,
 * а Яндекс.Бизнес сверяет их построчно. Из частей всегда можно собрать строку,
 * из строки части — нет.
 */
export const addressSchema = z.object({
  country: z.string().trim().default('RU'),
  region: optionalText,
  city: optionalText,
  street: optionalText,
  building: optionalText,
  office: optionalText,
  postalCode: optionalText,
});

export const geoSchema = z.object({
  lat: z.number().min(-90).max(90).nullable().default(null),
  lng: z.number().min(-180).max(180).nullable().default(null),
});

export const areaSchema = z.object({
  served: optionalText,
  districts: z.array(z.string().trim()).default([]),
});

/** Для `form = "ИП"` подпись поля `ogrn` на сайте — «ОГРНИП», для «ООО» — «ОГРН». */
export const legalSchema = z.object({
  form: z.enum(['ИП', 'ООО']).default('ИП'),
  name: optionalText,
  inn: optionalText,
  ogrn: optionalText,
  address: optionalText,
});

/** Ставки калькулятора живут в домене цен — там же, где формула. */
export const extrasSchema = installRatesSchema;

export const warrantySchema = z.object({
  installation: optionalText,
  equipment: optionalText,
});

export const paymentSchema = z.object({
  methods: z.array(z.string().trim()).default([]),
  vat: optionalText,
});

export const socialSchema = z.object({
  links: z.array(z.string().trim()).default([]),
});

export const seoSchema = z.object({
  homeTitle: optionalText,
  homeDescription: optionalText,
  titleSuffix: optionalText,
  ogImage: optionalText,
});

/**
 * Клиентские сервисы. Онлайн-чат сознательно не подключается: общение идёт
 * через Telegram по желанию клиента и через заявку (ADR-024).
 */
export const integrationsSchema = z.object({
  metrikaId: optionalText,
  messengerButtons: z
    .object({ telegram: z.boolean().default(false), whatsapp: z.boolean().default(false) })
    .default({ telegram: false, whatsapp: false }),
  callback: z.object({ enabled: z.boolean().default(true) }).default({ enabled: true }),
});

/** Реестр: `PUT /api/admin/settings/{key}` валидирует тело схемой своего ключа. */
export const settingSchemas = {
  company: companySchema,
  contacts: contactsSchema,
  address: addressSchema,
  geo: geoSchema,
  area: areaSchema,
  legal: legalSchema,
  extras: extrasSchema,
  warranty: warrantySchema,
  payment: paymentSchema,
  social: socialSchema,
  seo: seoSchema,
  integrations: integrationsSchema,
} as const;

export const settingKeySchema = z.enum([
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
  'integrations',
]);

export type SettingKey = z.infer<typeof settingKeySchema>;

export type Settings = {
  readonly [K in SettingKey]: z.infer<(typeof settingSchemas)[K]>;
};

export type Company = Settings['company'];
export type Contacts = Settings['contacts'];
export type Address = Settings['address'];
export type Geo = Settings['geo'];
export type ServiceArea = Settings['area'];
export type Legal = Settings['legal'];
export type Warranty = Settings['warranty'];
export type Payment = Settings['payment'];
export type Social = Settings['social'];
export type Seo = Settings['seo'];
export type Integrations = Settings['integrations'];
