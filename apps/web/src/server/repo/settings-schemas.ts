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
  LEGAL_FORMS,
  normalizeSettingPhone,
  settingKeySchema,
  settingSchemas,
  type LegalForm,
  type SettingKey,
} from '@/entities/settings/model';
import { SETTING_PLACEHOLDER } from '@/entities/settings/lib/readiness';
import { publicLegal } from '@/entities/settings/lib/legal';

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
 * Обязательные поля группы `legal` — свои у каждой формы регистрации
 * (ADR-112, PROJECT §5.1). У предпринимателя нет КПП, у общества нет органа
 * регистрации: один список на обе формы требовал бы полей, которых в группе
 * не бывает.
 */
type LegalRequiredFields = Readonly<Record<LegalForm, readonly string[]>>;

type RequiredFieldsMap = Readonly<Record<Exclude<SettingKey, 'legal'>, readonly string[]>> & {
  readonly legal: LegalRequiredFields;
};

/**
 * Поля, без которых сайт врёт посетителю или теряет данные в разметке.
 * Пустой `office`, второй телефон или соцсети обязательными не считаются.
 *
 * 🔴 Список один на проект: вторая копия рядом разошлась бы с этой на первой
 * же правке состава реквизитов.
 */
export const REQUIRED_FIELDS: RequiredFieldsMap = {
  company: ['name', 'tagline'],
  contacts: ['phones', 'email', 'hours'],
  address: ['country', 'region', 'city', 'street', 'building', 'postalCode'],
  geo: ['lat', 'lng'],
  area: ['served'],
  /* 🔴 Обязательно то, без чего сайт врёт посетителю: ЗоЗПП ст. 9 и Правила
     продажи (ПП РФ № 2463) требуют наименование продавца, сведения о
     регистрации и адрес. У предпринимателя закон прямо требует дату и орган
     регистрации; у общества — сокращённое наименование, которым подписан
     футер, и место нахождения.

     Чего здесь нет и быть не должно: КПП, руководителя, банковских
     реквизитов и адреса регистрации предпринимателя. На витрину они не
     выводятся (адрес ИП — как правило домашний, то есть ПДн), нужны счетам и
     договорам, и требовать их перед запуском не с чего. */
  legal: {
    ИП: ['form', 'name', 'inn', 'ogrn', 'regDate', 'regAuthority'],
    ООО: ['form', 'name', 'shortName', 'inn', 'ogrn', 'address'],
  },
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

/**
 * Форма регистрации сохранённой группы.
 *
 * 🔴 Группа без формы читается как «ИП» — ровно так её разбирает схема
 * (`withDefaultForm` в `entities/settings/model`). Разойтись проверке с
 * разбором нельзя: отчёт бы требовал полей, которых в разобранной группе
 * не существует.
 */
function legalFormOf(group: unknown): LegalForm {
  if (typeof group !== 'object' || group === null || !('form' in group)) return LEGAL_FORMS[0];

  const stored = group.form;
  if (typeof stored !== 'string') return LEGAL_FORMS[0];

  return LEGAL_FORMS.find((form) => form === stored) ?? LEGAL_FORMS[0];
}

/**
 * Обязательные поля группы. У всех групп набор постоянный, у `legal` его
 * задаёт сохранённая форма регистрации.
 */
export function requiredFields(key: SettingKey, group: unknown): readonly string[] {
  if (key === 'legal') return REQUIRED_FIELDS.legal[legalFormOf(group)];

  return REQUIRED_FIELDS[key];
}

/**
 * Значение группы в том виде, в каком его можно отдать наружу.
 *
 * 🔴 У реквизитов есть непубликуемая часть: адрес регистрации предпринимателя
 * (как правило домашний, то есть персональные данные) и банковские
 * реквизиты — они нужны счетам, а не витрине (PROJECT §5.1). До появления этой
 * функции публичный маршрут отдавал группу как есть, и запрет держался лишь
 * тем, что страницы сайта ходят через `publicRequisites`. Дверей было две.
 *
 * Остальные группы публикуются целиком: в них нет ничего, чего нет на
 * странице.
 */
export function publicValue(key: SettingKey, value: unknown): unknown {
  if (key !== 'legal') return value;

  /* Битую или старую запись наружу не отдаём вовсе: разобрать её мы не можем,
     а «отдать как есть» — это ровно то, что здесь и чинится. */
  const parsed = settingSchemas.legal.safeParse(value);

  return parsed.success ? publicLegal(parsed.data) : null;
}
