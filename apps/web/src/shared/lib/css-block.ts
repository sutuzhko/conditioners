/**
 * Чтение блока объявлений из исходника CSS — для проверок, которые сверяют
 * токены с числами (issue #880).
 *
 * 🔴 Заведено потому, что «блок до первой закрывающей скобки» — это не разбор,
 * а совпадение. Комментарий, цитирующий правило макета
 * (`/* .pg span{min-width:32px} *\/`), закрывает блок раньше времени, и вторая
 * половина объявлений в разбор не попадает. Проверка плотности тогда объявила
 * восемь токенов панели необъявленными — токены были на месте, врал разбор.
 *
 * 🔴 Опаснее обратное, и ради него всё и переписано: та же слепота **прячет
 * настоящий дефект**. Не разобрав вторую половину блока, проверка не заметит и
 * по-настоящему пропавший там токен — то есть молча выключится.
 *
 * Готовый разборщик CSS не взят намеренно: `postcss` в зависимостях проекта
 * нет (он приезжает со `stylelint` и виден не отовсюду), а новая зависимость
 * ради двадцати строк — плохой обмен. Считаются скобки, комментарии гасятся.
 */

/**
 * Комментарии, заменённые пробелами той же длины.
 *
 * Длина сохраняется нарочно: вызывающий ищет свои селекторы по смещениям
 * (`from` у `@media`), и сдвиг координат превратил бы одну ловушку в другую.
 * Переносы строк остаются, чтобы номер строки в сообщении об ошибке совпадал
 * с исходником.
 */
export function withoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
}

/** Тело блока: от `{` после селектора до парной ему `}`. */
function bodyOf(css: string, start: number): string | null {
  const open = css.indexOf('{', start);
  if (open === -1) return null;

  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return null;
}

/** Вложенные блоки, вырезанные из тела: их объявления принадлежат не этому блоку. */
function withoutNested(body: string): string {
  let depth = 0;
  let out = '';
  for (const char of body) {
    if (char === '{') depth += 1;
    else if (char === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0) out += char;
  }
  return out;
}

/**
 * Пользовательские свойства блока: `--имя` → значение.
 *
 * `selector` ищется как подстрока — вызывающий передаёт то, что стоит в
 * файле. Блока нет — `null`: решение, ронять ли проверку, принимает она сама,
 * а разбор об этом не знает.
 */
export function cssBlock(
  css: string,
  selector: string,
  from = 0,
): Readonly<Record<string, string>> | null {
  const clean = withoutComments(css);
  const start = clean.indexOf(selector, from);
  if (start === -1) return null;

  const body = bodyOf(clean, start);
  if (body === null) return null;

  const values: Record<string, string> = {};
  for (const match of withoutNested(body).matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name === undefined || value === undefined) continue;
    values[name] = value.trim();
  }
  return values;
}
