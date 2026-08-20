/**
 * Транслитерация в слаг.
 *
 * ⚠️ Временная копия: доменные утилиты слагов — зона агента A (`shared/lib`).
 * Когда его модуль появится, этот файл заменяется на реэкспорт, чтобы правило
 * «одна функция — одно место» не нарушалось.
 *
 * Правила адресов — docs/SEO.md §1: только строчная латиница и дефис.
 */
const MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

export function slugify(source: string): string {
  const transliterated = source
    .toLowerCase()
    .split('')
    .map((char) => MAP[char] ?? char)
    .join('');

  return transliterated
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/**
 * Уникальный слаг: к занятому дописывается числовой суффикс.
 * `isTaken` спрашивает базу — сама функция остаётся чистой и тестируемой.
 */
export async function uniqueSlug(
  source: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(source) || 'element';

  if (!(await isTaken(base))) return base;

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }

  return `${base}-${Date.now()}`;
}
