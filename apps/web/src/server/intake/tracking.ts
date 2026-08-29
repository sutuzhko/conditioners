/**
 * Происхождение заявки: страница-источник, реферер и рекламные метки.
 * В прототипе не сохранялось ничего — без этих полей нельзя понять, какие
 * страницы и какие каналы приносят обращения (docs/PROJECT.md §2.6).
 */
export type Tracking = {
  readonly sourceUrl: string | null;
  readonly referrer: string | null;
  readonly utm: Readonly<Record<string, string>> | null;
};

const UTM_KEYS: readonly string[] = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  // идентификаторы клика Яндекс.Директа и Google Ads — без них не связать заявку с объявлением
  'yclid',
  'gclid',
];

const MAX_URL_LENGTH = 2000;
const MAX_VALUE_LENGTH = 200;

function trimmedOrNull(value: string | undefined | null, max: number): string | null {
  if (value === undefined || value === null) return null;
  const text = value.trim();
  if (text === '') return null;
  return text.slice(0, max);
}

/**
 * Метки берутся из адреса страницы-источника и только оттуда.
 *
 * 🔴 Раньше они принимались ещё и полями формы, причём поля имели приоритет.
 * Контракт [API §8](../../../../docs/API.md) требует обратного дословно, и не
 * ради чистоты: атрибуция решает, куда владелец тратит рекламный бюджет, а
 * поле в теле публичного `POST` принимается без сессии кем угодно. Приписать
 * себе чужие заявки было делом одного запроса.
 */
function collectUtm(sourceUrl: string | null): Readonly<Record<string, string>> | null {
  const collected: Record<string, string> = {};

  if (sourceUrl !== null) {
    try {
      const parsed = new URL(sourceUrl);
      for (const key of UTM_KEYS) {
        const value = trimmedOrNull(parsed.searchParams.get(key), MAX_VALUE_LENGTH);
        if (value !== null) collected[key] = value;
      }
    } catch {
      // заголовок ставит браузер, но испорченный адрес — не повод падать
    }
  }

  return Object.keys(collected).length === 0 ? null : collected;
}

/**
 * 🔴 Происхождение собирается из заголовков запроса, а не из его тела.
 *
 * Тело публичного `POST` — это то, что прислал кто угодно. Пока `sourceUrl` и
 * метки читались оттуда, приписать заявку чужой кампании можно было одним
 * запросом, и владелец увидел бы это в отчёте как настоящий канал.
 *
 * 🔴 `referrer` остаётся пустым сознательно. Внешний реферер — это то, откуда
 * человек пришёл на сайт, и в заголовках запроса на отправку формы его нет:
 * там лежит адрес самой страницы с формой. Раньше он читался из тела, то есть
 * был не данными, а заявлением отправителя. Настоящая внешняя атрибуция
 * требует своего механизма и отдельного решения (issue #73); до него честнее
 * пустая колонка, чем заполненная тем, что прислали.
 */
export function collectTracking(request: Request): Tracking {
  const sourceUrl = trimmedOrNull(request.headers.get('referer'), MAX_URL_LENGTH);

  return { sourceUrl, referrer: null, utm: collectUtm(sourceUrl) };
}
