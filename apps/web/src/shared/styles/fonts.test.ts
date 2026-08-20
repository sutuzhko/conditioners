import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Страж настройки шрифтов. Две из трёх гарнитур прототипа (Space Grotesk,
 * Space Mono) кириллицы не содержали — заголовки на русском падали на системный
 * шрифт. Заменены на Onest и JetBrains Mono; тест не даёт откатиться к набору
 * без кириллицы и ловит потерю файлов при регенерации. См. ADR-025.
 */
const css = readFileSync(join(process.cwd(), 'src/shared/styles/fonts.css'), 'utf-8');

const FAMILIES = ['Onest', 'Manrope', 'JetBrains Mono'] as const;
const CYRILLIC_RANGE = 'U+0400-045F';

describe('самохостинг шрифтов', () => {
  it.each(FAMILIES)('%s объявлен и покрывает кириллицу', (family) => {
    // stylelint снимает кавычки у односложных имён (Onest), у составных оставляет
    const declaration = new RegExp(`font-family:\\s*['"]?${family}['"]?\\s*;`);
    const blocks = css.split('@font-face').filter((b) => declaration.test(b));

    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.some((b) => b.includes(CYRILLIC_RANGE))).toBe(true);
  });

  it('все файлы, на которые ссылается CSS, лежат в public/fonts', () => {
    const refs = [...css.matchAll(/url\('(\/fonts\/[^']+)'\)/g)]
      .map((m) => m[1])
      .filter((r): r is string => r !== undefined);

    expect(refs.length).toBeGreaterThan(0);
    const missing = refs.filter((r) => !existsSync(join(process.cwd(), 'public', r)));
    expect(missing).toEqual([]);
  });

  it('не ссылается на внешние источники — сборка не должна ходить в сеть', () => {
    expect(css).not.toMatch(/https?:\/\//);
  });
});
