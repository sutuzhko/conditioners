/**
 * Регресс на набор порогов адаптива — DESIGN_BRIEF §6.
 *
 * 🔴 До этой работы порогов было **семнадцать** на 113 медиа-запросов: 359,
 * 399, 480, 520, 560, 599, 600, 620, 700, 720, 760, 899, 900, 999, 1000, 1040,
 * 1100. Раскладка ломалась в случайных местах, и проверить её было негде: на
 * четырёх ширинах снимков (320, 375, 768, 1200) тринадцать из семнадцати
 * порогов не срабатывают вовсе.
 *
 * Восемнадцатый порог заводится одной строкой и незаметен в диффе — поэтому
 * его ловит машина, а не внимательность.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'src');

/** Набор из DESIGN_BRIEF §6. Границу пишут и как `600`, и как `599`. */
const SET = [600, 900, 1200];

/**
 * Исключения — список закрытый и с причиной. Новый порог сюда добавляется
 * вместе со строкой в таблице DESIGN_BRIEF §6: список без причины — это не
 * исключение, а второй набор порогов.
 */
const EXCEPTIONS = new Map([
  [1000, 'полная навигация в шапке: семь пунктов, бренд, телефон и кнопка'],
]);

/** Медиа-запрос считает `em` от корневого кегля браузера, а не страницы. */
const ROOT_FONT_PX = 16;

const allowed = new Set([
  ...SET,
  ...SET.map((w) => w - 1),
  ...EXCEPTIONS.keys(),
  ...[...EXCEPTIONS.keys()].map((w) => w - 1),
]);

function cssFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return cssFiles(path);

    return name.endsWith('.css') ? [path] : [];
  });
}

describe('пороги адаптива', () => {
  const files = cssFiles(root);

  it('файлы стилей находятся', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('🔴 каждый порог по ширине — из набора DESIGN_BRIEF §6', () => {
    const strays = [];

    for (const path of files) {
      const where = path.slice(root.length + 1);

      readFileSync(path, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (!line.includes('@media') || !line.includes('width')) return;

          /* 🔴 Разбирается запрос целиком, а не «число после слова width».
             Двусторонний диапазон `(640px <= width < 900px)` держит первую
             границу **перед** словом, и прежняя проверка её не видела вовсе —
             а именно этим синтаксисом написан весь проект (ревью #303). */
          for (const [query] of line.matchAll(/\([^)]*\bwidth\b[^)]*\)/g)) {
            for (const [, value, unit] of query.matchAll(/(\d+(?:\.\d+)?)(px|em|rem)/g)) {
              /* `em` и `rem` в медиа-запросе считаются от 16px корня — и это
                 единственный полностью бесшумный способ завести свой порог. */
              const width = unit === 'px' ? Number(value) : Number(value) * ROOT_FONT_PX;
              if (allowed.has(width)) continue;

              strays.push(`${where}:${index + 1} — ${value}${unit}`);
            }
          }
        });
    }

    expect(strays).toEqual([]);
  });
});
