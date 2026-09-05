import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { blend, contrastRatio, formatRatio, parseColor, type Color } from '@/shared/lib/color';

/**
 * Контраст пар «цвет текста × фон» по токенам — машиной, а не глазом.
 *
 * 🔴 Заведено по итогам сплошного аудита интерфейса (ADR-158). Светлая тема
 * не проходила AA в 535 местах на двух переменных, и накопилось это незаметно
 * именно потому, что каждое отдельное место выглядит приемлемо: приглушённая
 * подпись на белом «читается», пока её не измеришь. Повторный сплошной обход
 * стоит дня, эта проверка — миллисекунд.
 *
 * Проверяются только токены. Собственные цвета в модулях запрещены правилом
 * проекта, поэтому источник у всех цветов один — этот файл.
 */

const TOKENS = readFileSync(join(__dirname, 'tokens.css'), 'utf8');
const UI_TOKENS = readFileSync(join(__dirname, 'ui-tokens.css'), 'utf8');

/** Порог AA для обычного текста. Крупный текст и границы — 3:1, см. LARGE. */
const AA_TEXT = 4.5;
/** Порог AA для крупного текста и нетекстовых границ (WCAG 1.4.3, 1.4.11). */
const AA_LARGE = 3;

type Theme = 'light' | 'dark' | 'panel';

/**
 * Значения токенов темы. Светлая живёт в `:root`, тёмная — в
 * `:root[data-theme='dark']` и переопределяет только часть переменных.
 */
const BLOCK_START: Record<Theme, string> = {
  light: ':root {',
  dark: ":root[data-theme='dark']",
  panel: "[data-ground='panel']",
};

/** Объявления одного блока: от селектора до его закрывающей скобки. */
function readBlock(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const body = css.slice(start, css.indexOf('}', start));

  const values: Record<string, string> = {};
  for (const match of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name === undefined || value === undefined) continue;
    values[name] = value.trim();
  }
  return values;
}

function readTheme(theme: Theme): Record<string, string> {
  return readBlock(TOKENS, BLOCK_START[theme]);
}

const LIGHT = readTheme('light');
const DARK = { ...LIGHT, ...readTheme('dark') };

/**
 * 🔴 Тёмная подложка внутри светлой темы — отдельный грунт, а не тема.
 *
 * Подвал и карточки на `--panel` живут посреди светлой страницы, и уровни,
 * подобранные под белый фон, на них не читаются. Пропущенный в первой версии
 * этой проверки, этот случай и дал регресс: токены починили под белое, а
 * подвал стал хуже, чем был, — нашлось только замером в браузере.
 */
const PANEL = { ...LIGHT, ...readTheme('panel'), bg: LIGHT.panel ?? '#0f172a' };

/**
 * Фоны, на которых стоит текст. Полупрозрачные и градиентные подложки в
 * список не входят: у них нет одного значения, и мерить их надо в браузере.
 */
const BACKGROUNDS = ['bg', 'bg-soft', 'card', 'accent-bg', 'stripe-a', 'stripe-b', 'field'];

/** Уровни текста. Все обязаны читаться на любом фоне из списка. */
const TEXT = ['ink', 'ink2', 'body', 'muted', 'faint', 'accent-text'];

/** Границы и рамки: им довольно 3:1 — это не текст. */
const LINES = ['accent-ink'];

function palette(theme: Theme): Record<string, string> {
  if (theme === 'light') return LIGHT;
  return theme === 'dark' ? DARK : PANEL;
}

/** У грунта фон один — сама подложка; полосок и полей на нём нет. */
function backgroundsFor(theme: Theme): readonly string[] {
  return theme === 'panel' ? ['bg'] : BACKGROUNDS;
}

/** Только непрозрачные цвета: полупрозрачные кладутся на подложку отдельно. */
function solid(colors: Record<string, string>, name: string): Color | null {
  const value = colors[name];
  if (value === undefined) return null;

  const parsed = parseColor(value);
  return parsed !== null && parsed.alpha === 1 ? parsed : null;
}

describe.each<Theme>(['light', 'dark', 'panel'])('Контраст токенов — %s', (theme) => {
  const colors = palette(theme);
  const grounds = backgroundsFor(theme);

  it.each(TEXT)('«%s» читается на всех фонах', (token) => {
    const ink = solid(colors, token);
    expect(ink).not.toBeNull();
    if (ink === null) return;

    for (const bgToken of grounds) {
      const bg = solid(colors, bgToken);
      if (bg === null) continue;

      const ratio = contrastRatio(ink, bg);
      expect(
        ratio,
        `--${token} на --${bgToken} даёт ${formatRatio(ratio)}:1 при норме ${AA_TEXT}:1`,
      ).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it.each(LINES)('«%s» различима как граница на всех фонах', (token) => {
    const line = solid(colors, token);
    expect(line).not.toBeNull();
    if (line === null) return;

    for (const bgToken of grounds) {
      const bg = solid(colors, bgToken);
      if (bg === null) continue;

      const ratio = contrastRatio(line, bg);
      expect(
        ratio,
        `--${token} на --${bgToken} даёт ${formatRatio(ratio)}:1 при норме ${AA_LARGE}:1`,
      ).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  /* 🔴 Иерархия приглушения — часть требования, а не вкус: если «faint»
     окажется темнее «muted», подпись станет заметнее текста, ради которого
     она стоит. Проверяется здесь же, потому что чинится тем же файлом. */
  it('уровни текста идут от тёмного к светлому и не схлопываются', () => {
    const bg = solid(colors, 'bg');
    expect(bg).not.toBeNull();
    if (bg === null) return;

    const steps = ['ink', 'ink2', 'body', 'muted', 'faint']
      .map((token) => solid(colors, token))
      .filter((value): value is Color => value !== null)
      .map((value) => contrastRatio(value, bg));

    for (let i = 1; i < steps.length; i += 1) {
      const previous = steps[i - 1];
      const current = steps[i];
      if (previous === undefined || current === undefined) continue;

      expect(current, `уровень ${i} не светлее предыдущего`).toBeLessThan(previous);
    }
  });
});

/* ───────────────────────────────────────────────────────────────────────────
   Семантические токены: граница контрола, краски состояний, текст поверх
   заливки.

   🔴 Считаются со смешиванием слоёв, а не по номиналу. Половина поверхностей
   панели тонирована, и краска ложится на подложку, произведённую от неё же:
   именно так «5,5:1 по токену» превращалось в 4,5:1 на экране, а порог AA
   выглядел взятым (ADR-181). Прозрачность здесь раскладывается ровно так же,
   как её раскладывает браузер.
   ─────────────────────────────────────────────────────────────────────────── */

const UI_LIGHT = { ...LIGHT, ...readBlock(UI_TOKENS, ':root {') };
const UI_DARK = { ...UI_LIGHT, ...DARK, ...readBlock(UI_TOKENS, ":root[data-theme='dark']") };

/** `var(--x)` в значении токена — ссылка на соседний токен той же темы. */
function resolve(palette: Record<string, string>, token: string): string {
  const raw = palette[token] ?? '';
  const link = /^var\(\s*--([\w-]+)\s*\)$/.exec(raw);

  return link?.[1] === undefined ? raw : (palette[link[1]] ?? '');
}

function color(palette: Record<string, string>, token: string): Color {
  const value = parseColor(resolve(palette, token));
  expect(value, `--${token} не разобран`).not.toBeNull();

  return value ?? { channels: [0, 0, 0], alpha: 1 };
}

function ratio(ink: Color, ground: Color): number {
  return contrastRatio(ink, ground);
}

/** Поверхности, на которых стоят чипы и поля панели. */
const GROUNDS = ['card', 'bg-soft'] as const;

/** Краски состояний: чип с текстом, подложка чипа произведена от той же краски. */
const STATES = ['ok', 'warn', 'error', 'info'] as const;

const THEMES: ReadonlyArray<readonly [string, Record<string, string>]> = [
  ['светлая', UI_LIGHT],
  ['тёмная', UI_DARK],
];

describe.each(THEMES)('Семантические токены — %s тема', (_name, palette) => {
  it.each(GROUNDS)('граница контрола различима на «%s»', (ground) => {
    const line = color(palette, 'line-ui');
    const surface = color(palette, ground);
    const value = ratio(line, surface);

    expect(
      value,
      `--line-ui на --${ground} даёт ${formatRatio(value)}:1 при норме ${AA_LARGE}:1`,
    ).toBeGreaterThanOrEqual(AA_LARGE);
  });

  it.each(STATES)('краска «%s» читается и на чистой поверхности, и на своём тинте', (state) => {
    const ink = color(palette, `${state}-ink`);
    const tint = color(palette, `${state}-bg`);

    for (const ground of GROUNDS) {
      const surface = color(palette, ground);
      const tinted = blend(tint, surface);

      for (const [where, value] of [
        [`--${ground}`, ratio(ink, surface)],
        [`тинте на --${ground}`, ratio(ink, tinted)],
      ] as const) {
        expect(
          value,
          `--${state}-ink на ${where} даёт ${formatRatio(value)}:1 при норме ${AA_TEXT}:1`,
        ).toBeGreaterThanOrEqual(AA_TEXT);
      }
    }
  });

  /* 🔴 Метка данных обязана отделяться от поверхности: график читают по
     линии, а не по подписи. Различимость самих серий между собой цветом не
     обеспечивается вовсе (1,36:1 и 1,08:1) — за неё отвечают штрих и подписи
     концов, и проверяются они на историях, а не здесь. */
  it.each(['s1', 's2'] as const)('серия «%s» отделяется от поверхности', (series) => {
    const mark = color(palette, series);

    for (const ground of GROUNDS) {
      const value = ratio(mark, color(palette, ground));
      expect(
        value,
        `--${series} на --${ground} даёт ${formatRatio(value)}:1 при норме ${AA_LARGE}:1`,
      ).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it.each(['error', 'ok'] as const)('текст поверх сплошной заливки «%s» читается', (state) => {
    const fill = color(palette, `${state}-ink`);
    const text = color(palette, `on-${state}`);
    const value = ratio(text, fill);

    expect(
      value,
      `--on-${state} на --${state}-ink даёт ${formatRatio(value)}:1 при норме ${AA_TEXT}:1`,
    ).toBeGreaterThanOrEqual(AA_TEXT);
  });

  /* ─────────────────────────────────────────────────────────────────────────
     🔴 Подсвеченная строка таблицы — просроченный наряд, отказ, «пора
     заказать» (issue #329).

     Здесь тинт складывается со своей подложкой: строка залита `--error-bg`
     поверх карточки или полосы зебры, и запас, которого хватало на чистой
     поверхности, уходит в минус. Отсюда два правила самой строки, и оба
     проверяются ниже, а не берутся на слово:

     - приглушённый текст поднимается на ступень: `--muted` на этом тинте
       даёт 4,4:1 при норме 4,5, поэтому строка переопределяет его на `--body`;
     - мягкая плашка становится обведённой (`--badge-fill: transparent`),
       иначе её собственный тинт ложится вторым слоем и красное на красном
       даёт те же 4,4:1.
     ───────────────────────────────────────────────────────────────────────── */
  describe('подсвеченная строка срыва', () => {
    /** Подложки, на которых строка может стоять: карточка и обе полосы зебры. */
    const ROW_GROUNDS = ['card', 'stripe-a', 'stripe-b'] as const;

    /** Грунт самой строки: тинт ошибки поверх её подложки. */
    const rowGround = (ground: string): Color =>
      blend(color(palette, 'error-bg'), color(palette, ground));

    it.each(ROW_GROUNDS)('текст строки читается на тинте поверх «%s»', (ground) => {
      const surface = rowGround(ground);

      /* `--muted` в списке нет намеренно: строка его и переопределяет.
         Проверяются те уровни, которые на ней действительно остаются. */
      for (const token of ['ink', 'ink2', 'body']) {
        const value = ratio(color(palette, token), surface);
        expect(
          value,
          `--${token} на строке срыва поверх --${ground} даёт ${formatRatio(value)}:1 ` +
            `при норме ${AA_TEXT}:1`,
        ).toBeGreaterThanOrEqual(AA_TEXT);
      }
    });

    it.each(ROW_GROUNDS)('обведённая плашка читается на строке поверх «%s»', (ground) => {
      const surface = rowGround(ground);

      /* Плашка на такой строке лишена собственной заливки, поэтому её краска
         ложится прямо на тинт строки — один слой, а не два. */
      for (const state of ['ok', 'warn', 'error', 'info'] as const) {
        const value = ratio(color(palette, `${state}-ink`), surface);
        expect(
          value,
          `--${state}-ink на строке срыва поверх --${ground} даёт ${formatRatio(value)}:1 ` +
            `при норме ${AA_TEXT}:1`,
        ).toBeGreaterThanOrEqual(AA_TEXT);
      }
    });

    /* 🔴 Граница контрола на такой строке — не `--line-ui`, а краска самой
       строки. Найдено здесь же: обычная `--line-ui` даёт на её тинте от
       2,56:1 до 2,88:1 при норме 1.4.11 в 3:1, то есть подчёркнутое поле в
       строке срыва оставалось без видимой границы. Строка переопределяет
       `--line-ui` на `--error-ink` (Table.module.css), и проверяется то,
       что она ставит на самом деле. */
    it.each(ROW_GROUNDS)('граница контрола различима на строке поверх «%s»', (ground) => {
      const surface = rowGround(ground);
      const weak = ratio(color(palette, 'line-ui'), surface);
      const value = ratio(color(palette, 'error-ink'), surface);

      expect(
        weak,
        `--line-ui внезапно проходит на строке срыва поверх --${ground} ` +
          `(${formatRatio(weak)}:1) — переопределение в Table.module.css больше не нужно`,
      ).toBeLessThan(AA_LARGE);

      expect(
        value,
        `--error-ink как граница контрола на строке срыва поверх --${ground} даёт ` +
          `${formatRatio(value)}:1 при норме ${AA_LARGE}:1`,
      ).toBeGreaterThanOrEqual(AA_LARGE);
    });
  });

  /* ─────────────────────────────────────────────────────────────────────────
     🔴 Круглые действия строки: открыть, править, убрать (issue #574, #575).

     Каждое — тинт со своим значком поверх него, и значок здесь несёт смысл:
     по нему отличают «править» от «удалить». Значит, действует норма
     нетекстового контраста (WCAG 1.4.11) — 3:1, а не «выглядит нормально».
     Тинт при этом складывается с подложкой строки, как и у строки срыва:
     запас, которого хватало на чистой карточке, уходит именно здесь.
     ───────────────────────────────────────────────────────────────────────── */
  describe('действия строки', () => {
    /** Тон действия: подложка кружка и краска значка на ней. */
    const TONES: ReadonlyArray<readonly [string, string, string]> = [
      ['открыть', 'bg-soft', 'ink2'],
      ['править', 'accent-bg', 'accent-text'],
      ['убрать', 'error-bg', 'error-ink'],
    ];

    it.each(TONES)('значок действия «%s» различим на своём тинте', (_tone, tint, ink) => {
      for (const ground of GROUNDS) {
        const surface = blend(color(palette, tint), color(palette, ground));
        const value = ratio(color(palette, ink), surface);

        expect(
          value,
          `--${ink} на --${tint} поверх --${ground} даёт ${formatRatio(value)}:1 ` +
            `при норме ${AA_LARGE}:1`,
        ).toBeGreaterThanOrEqual(AA_LARGE);
      }
    });
  });
});
