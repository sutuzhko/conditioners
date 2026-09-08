// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { WORK_TYPE_TONES, type WorkTypeTone } from '@/entities/work-type/model';
import { blend, contrastRatio, formatRatio, parseColor, type Color } from '@/shared/lib/color';

/**
 * Палитра видов работ — проверяемое ограничение, а не пожелание в подсказке
 * (ADR-343).
 *
 * 🔴 Владелец выбирает краску из набора, и набор обязан быть читаемым в обеих
 * темах. Проверка идёт по самим правилам CSS-модулей: тест разбирает
 * `.toneAccent`, `.toneInfo` и остальные, достаёт из них токены и меряет
 * контраст пары. Отдельная таблица «краска → токены» рядом с модулями была бы
 * вторым источником правды и разошлась бы с ними молча.
 *
 * Так же проверяется полнота: краска, добавленная в палитру и забытая в
 * модуле, роняет тест, а не даёт метку без оформления.
 */

const STYLES = join(__dirname, '..', '..', 'shared', 'styles');
const TOKENS = readFileSync(join(STYLES, 'tokens.css'), 'utf8');
const UI_TOKENS = readFileSync(join(STYLES, 'ui-tokens.css'), 'utf8');

/** Порог AA для обычного текста: подпись записи — 12px, крупной она не бывает. */
const AA_TEXT = 4.5;

/**
 * Фоны, на которых лежит запись календаря: полотно раздела и карточка.
 * Тёмная врезка `--panel` сюда не входит — сетка календаря на ней не стоит.
 */
const GROUNDS = ['bg', 'card', 'bg-soft'] as const;

type Theme = 'light' | 'dark';

const BLOCK_START: Record<Theme, string> = {
  light: ':root {',
  dark: ":root[data-theme='dark']",
};

/** Объявления одного блока: от селектора до его закрывающей скобки. */
function readBlock(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) return {};

  const body = css.slice(start, css.indexOf('}', start));
  const values: Record<string, string> = {};
  for (const match of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name === undefined || value === undefined) continue;
    values[name] = value.trim();
  }
  return values;
}

function themeValues(theme: Theme): Record<string, string> {
  const light = {
    ...readBlock(TOKENS, BLOCK_START.light),
    ...readBlock(UI_TOKENS, BLOCK_START.light),
  };
  if (theme === 'light') return light;

  return {
    ...light,
    ...readBlock(TOKENS, BLOCK_START.dark),
    ...readBlock(UI_TOKENS, BLOCK_START.dark),
  };
}

const THEMES: Record<Theme, Record<string, string>> = {
  light: themeValues('light'),
  dark: themeValues('dark'),
};

/** Имя класса краски в модуле: `accent` → `.toneAccent`. */
function classOf(tone: WorkTypeTone): string {
  return `.tone${tone.charAt(0).toUpperCase()}${tone.slice(1)}`;
}

type Pair = { readonly background: string; readonly color: string };

/**
 * Пара токенов из правила модуля. Читается сам файл: он и есть место, где
 * краска связана со значениями.
 */
function pairOf(css: string, tone: WorkTypeTone): Pair | null {
  const selector = classOf(tone);
  const start = css.indexOf(`\n${selector} {`);
  if (start < 0) return null;

  const body = css.slice(start, css.indexOf('}', start));
  const background = /background:\s*var\(--([\w-]+)\)/.exec(body)?.[1];
  const color = /(?:^|[\s;])color:\s*var\(--([\w-]+)\)/.exec(body)?.[1];
  if (background === undefined || color === undefined) return null;

  return { background, color };
}

/** Цвет токена, положенный на подложку: тинты в палитре полупрозрачны. */
function over(values: Record<string, string>, token: string, ground: Color): Color | null {
  const parsed = parseColor(values[token] ?? '');
  if (parsed === null) return null;

  return parsed.alpha === 1 ? parsed : blend(parsed, ground);
}

const MODULES: readonly { readonly name: string; readonly css: string }[] = [
  {
    name: 'EventChip.module.css',
    css: readFileSync(join(__dirname, 'EventChip.module.css'), 'utf8'),
  },
  {
    name: 'EventPopover.module.css',
    css: readFileSync(join(__dirname, 'EventPopover.module.css'), 'utf8'),
  },
];

describe.each(MODULES)('Палитра видов работ — $name', ({ css }) => {
  /* 🔴 Полнота набора. Краска, попавшая в палитру и забытая в модуле, дала бы
     запись без фона и без цвета текста — то есть невидимую подпись на белом. */
  it.each(WORK_TYPE_TONES)('краска «%s» описана парой токенов', (tone) => {
    expect(pairOf(css, tone), `в модуле нет правила ${classOf(tone)}`).not.toBeNull();
  });

  describe.each<Theme>(['light', 'dark'])('%s', (theme) => {
    const values = THEMES[theme];

    it.each(WORK_TYPE_TONES)('краска «%s» читается на всех фонах раздела', (tone) => {
      const pair = pairOf(css, tone);
      expect(pair).not.toBeNull();
      if (pair === null) return;

      for (const groundToken of GROUNDS) {
        const ground = parseColor(values[groundToken] ?? '');
        expect(ground, `нет токена --${groundToken}`).not.toBeNull();
        if (ground === null) continue;

        const background = over(values, pair.background, ground);
        expect(background, `нет токена --${pair.background}`).not.toBeNull();
        if (background === null) continue;

        const ink = over(values, pair.color, background);
        expect(ink, `нет токена --${pair.color}`).not.toBeNull();
        if (ink === null) continue;

        const ratio = contrastRatio(ink, background);
        expect(
          ratio,
          `«${tone}» на --${groundToken}: --${pair.color} по --${pair.background} даёт ` +
            `${formatRatio(ratio)}:1 при норме ${AA_TEXT}:1`,
        ).toBeGreaterThanOrEqual(AA_TEXT);
      }
    });
  });
});
