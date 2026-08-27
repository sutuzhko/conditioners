/**
 * Серверная обвязка настроек — docs/PROJECT.md §3 «Ключи Setting», ADR-009.
 *
 * 🔴 Самих схем здесь нет. Они живут в `entities/settings/model.ts` и общие для
 * формы админки, админ-API и публичного чтения. Копия в этом файле не знала про
 * `trassaIncludedM` и `heightFloorFrom` из ADR-029: владелец сохранял включённые
 * метры трассы, а обратно они не читались — калькулятор считал по умолчаниям.
 * Для сайта, который обещает «не врать в цене», это прямое нарушение красной
 * линии, а не расхождение схем (ADR-030).
 *
 * Здесь остаётся только серверное: реестр ключей, что отдаётся наружу и что
 * обязано быть заполнено перед запуском.
 */
import {
  normalizeSettingPhone,
  settingKeySchema,
  settingSchemas,
  type SettingKey,
} from '@/entities/settings/model';
import { SETTING_PLACEHOLDER } from '@/entities/settings/lib/readiness';

export type { SettingKey };

/** Заглушка из сидов. Она должна быть заметной и не имеет права уехать в прод. */
export const PLACEHOLDER = SETTING_PLACEHOLDER;

/**
 * Приведение телефона к единому виду. Реализация одна — доменная: разные записи
 * одного номера в шапке и в разметке это типовой способ разойтись с карточкой
 * Яндекс.Бизнеса (ADR-009).
 */
export const normalizePhone = normalizeSettingPhone;

export const SETTING_KEYS: readonly SettingKey[] = settingKeySchema.options;

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
  // справочник нужен сайту: по нему группируются характеристики в карточке
  // товара и упорядочиваются строки таблицы сравнения
  'specs',
];

export function isSettingKey(value: string): value is SettingKey {
  return Object.prototype.hasOwnProperty.call(settingSchemas, value);
}

/**
 * Поля, без которых сайт врёт посетителю или теряет данные в разметке.
 * Пустой `office`, второй телефон или соцсети обязательными не считаются.
 */
export const REQUIRED_FIELDS: Record<SettingKey, readonly string[]> = {
  company: ['name', 'tagline'],
  contacts: ['phones', 'email', 'hours'],
  address: ['country', 'region', 'city', 'street', 'building', 'postalCode'],
  geo: ['lat', 'lng'],
  area: ['served'],
  legal: ['form', 'name', 'inn', 'ogrn', 'address'],
  extras: ['trassaPerM', 'shtrobPerM', 'heightWorks'],
  warranty: ['installation', 'equipment'],
  /* Рабочее окно всегда заполнено умолчанием: пустым оно быть не может, и
     требовать его перед запуском не с чего. */
  schedule: [],
  payment: ['methods', 'vat'],
  social: [],
  seo: ['homeTitle', 'homeDescription', 'titleSuffix'],
  // цифры полосы первого экрана необязательны: нет — полосы просто не будет
  achievements: [],
  // справочник характеристик — подсказка, а не обязательство: пустой он
  // означает «характеристики без групп», ровно как было до его появления
  specs: [],
  /* Каналы уведомлений обязательными полями не описываются: выключить оба —
     осознанный выбор владельца, а заявка всё равно попадает в админку. */
  notifications: [],
  integrations: [],
};
