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

/** Метки могут прийти отдельными полями формы либо остаться в адресе страницы-источника. */
function collectUtm(
  fields: Readonly<Record<string, string>>,
  sourceUrl: string | null,
): Readonly<Record<string, string>> | null {
  const collected: Record<string, string> = {};

  if (sourceUrl !== null) {
    try {
      const parsed = new URL(sourceUrl);
      for (const key of UTM_KEYS) {
        const value = trimmedOrNull(parsed.searchParams.get(key), MAX_VALUE_LENGTH);
        if (value !== null) collected[key] = value;
      }
    } catch {
      // адрес пришёл от клиента и может быть каким угодно — просто нечего разбирать
    }
  }

  for (const key of UTM_KEYS) {
    const value = trimmedOrNull(fields[key], MAX_VALUE_LENGTH);
    if (value !== null) collected[key] = value;
  }

  return Object.keys(collected).length === 0 ? null : collected;
}

export function collectTracking(
  request: Request,
  fields: Readonly<Record<string, string>>,
): Tracking {
  const header = request.headers.get('referer');
  const sourceUrl = trimmedOrNull(fields.sourceUrl ?? header, MAX_URL_LENGTH);
  const referrer = trimmedOrNull(fields.referrer, MAX_URL_LENGTH);

  return { sourceUrl, referrer, utm: collectUtm(fields, sourceUrl) };
}
