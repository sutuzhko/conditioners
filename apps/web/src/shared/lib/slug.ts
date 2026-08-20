/**
 * Слаги для URL. Владелец пишет названия по-русски, а адрес страницы обязан
 * оставаться латинским и читаемым: кириллица в URL превращается в процентную
 * кашу и в выдаче, и в ссылках, которыми делятся.
 */

/**
 * Таблица подобрана под уже существующие адреса из сидов
 * (`kondicioner`, а не `konditsioner`): менять её после запуска нельзя —
 * это смена URL у проиндексированных страниц.
 */
const CYRILLIC: Readonly<Record<string, string>> = {
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

/** Транслитерация кириллицы в латиницу. Прочие символы возвращаются как есть. */
export function transliterate(input: string): string {
  let out = '';
  for (const char of input.toLowerCase()) {
    out += CYRILLIC[char] ?? char;
  }
  return out;
}

/**
 * Слаг из произвольного заголовка: латиница, цифры и дефисы.
 * Пустая строка на выходе означает, что осмысленных символов не было —
 * вызывающий код обязан это обработать, подставлять «page-1» здесь нельзя.
 */
export function slugify(input: string): string {
  return transliterate(input)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Уникальность обеспечивается числовым суффиксом (`slug-2`, `slug-3`),
 * как описано в контракте админки: слаг генерируется из названия и не должен
 * молча перезаписывать чужой адрес.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const busy = new Set(taken);
  if (!busy.has(base)) return base;

  let n = 2;
  while (busy.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
