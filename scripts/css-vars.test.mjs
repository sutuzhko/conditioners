/**
 * Регресс на несуществующие CSS-переменные.
 *
 * 🔴 Дефект этого класса не даёт ни одного сигнала. `var(--нет-такой)` без
 * запасного значения — это «свойство не задано»: цвет просто не применяется,
 * браузер молчит, Stylelint неизвестные переменные не проверяет, типов у CSS
 * нет. На снимке отсутствующая краска выглядит задуманной, если не знать,
 * какой она должна быть.
 *
 * Найдено дорогой ценой: выпадающий список поиска по календарю оказался
 * прозрачным поверх сетки, потому что было написано `var(--surface)` — токена
 * с таким именем в проекте нет, есть `--card`, `--panel`, `--bg-soft`.
 * Прозрачную панель видно сразу; приглушённый цвет текста — нет (issue #296).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'src');

/** Все файлы стилей приложения: и модули, и глобальные. */
function cssFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return cssFiles(path);

    return name.endsWith('.css') ? [path] : [];
  });
}

const DEFINITION = /(--[a-zA-Z0-9-]+)\s*:/g;
const USAGE = /var\(\s*(--[a-zA-Z0-9-]+)\s*(,|\))/g;

describe('CSS-переменные', () => {
  const files = cssFiles(root);
  const defined = new Set();
  /** имя → откуда на него ссылаются */
  const used = new Map();

  for (const path of files) {
    const text = readFileSync(path, 'utf8');
    const where = path.slice(root.length + 1);

    for (const [, name] of text.matchAll(DEFINITION)) defined.add(name);

    for (const [, name, tail] of text.matchAll(USAGE)) {
      /* Обращение с запасным значением — `var(--x, 12px)` — законно и без
         определения: так пишут необязательную настройку компонента. */
      if (tail === ',') continue;

      used.set(name, [...(used.get(name) ?? []), where]);
    }
  }

  it('файлы стилей находятся и переменные в них есть', () => {
    expect(files.length).toBeGreaterThan(20);
    expect(defined.size).toBeGreaterThan(50);
  });

  it('🔴 каждая переменная, на которую ссылаются, где-то определена', () => {
    const missing = [...used.entries()]
      .filter(([name]) => !defined.has(name))
      .map(([name, where]) => `${name} — ${[...new Set(where)].join(', ')}`);

    expect(missing).toEqual([]);
  });
});
