import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

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

/** Относительная яркость по WCAG 2.1. */
function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;

  const channel = (from: number): number => {
    const c = Number.parseInt(full.slice(from, from + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function contrast(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  const high = Math.max(first, second);
  const low = Math.min(first, second);
  return (high + 0.05) / (low + 0.05);
}

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

/** Только сплошные цвета: rgb() с прозрачностью проверяется в браузере, не здесь. */
function solid(colors: Record<string, string>, name: string): string | null {
  const value = colors[name];
  return value !== undefined && value.startsWith('#') ? value : null;
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

      const ratio = contrast(ink, bg);
      expect(
        ratio,
        `--${token} на --${bgToken} даёт ${ratio.toFixed(2)}:1 при норме ${AA_TEXT}:1`,
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

      const ratio = contrast(line, bg);
      expect(
        ratio,
        `--${token} на --${bgToken} даёт ${ratio.toFixed(2)}:1 при норме ${AA_LARGE}:1`,
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
      .filter((value): value is string => value !== null)
      .map((value) => contrast(value, bg));

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

type Color = { readonly channels: readonly [number, number, number]; readonly alpha: number };

const UI_LIGHT = { ...LIGHT, ...readBlock(UI_TOKENS, ':root {') };
const UI_DARK = { ...UI_LIGHT, ...DARK, ...readBlock(UI_TOKENS, ":root[data-theme='dark']") };

/** `#rrggbb`, `rgb(r g b)` и `rgb(r g b / N%)`; `var(--x)` разворачивается один раз. */
function parse(raw: string | undefined, palette: Record<string, string>): Color | null {
  if (raw === undefined) return null;

  const link = /^var\(\s*--([\w-]+)\s*\)$/.exec(raw.trim());
  const value = link?.[1] === undefined ? raw.trim() : (palette[link[1]] ?? '');

  if (value.startsWith('#')) {
    const hex = value.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex;
    const channel = (from: number): number => Number.parseInt(full.slice(from, from + 2), 16);
    return { channels: [channel(0), channel(2), channel(4)], alpha: 1 };
  }

  const rgb = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*(\d+(?:\.\d+)?)%\s*)?\)$/.exec(value);
  if (rgb === null) return null;

  const [, r, g, b, percent] = rgb;
  if (r === undefined || g === undefined || b === undefined) return null;

  return {
    channels: [Number(r), Number(g), Number(b)],
    alpha: percent === undefined ? 1 : Number(percent) / 100,
  };
}

/** Цвет с прозрачностью поверх непрозрачной подложки — так же, как в браузере. */
function blend(top: Color, bottom: Color): Color {
  const mix = (index: 0 | 1 | 2): number =>
    top.channels[index] * top.alpha + bottom.channels[index] * (1 - top.alpha);

  return { channels: [mix(0), mix(1), mix(2)], alpha: 1 };
}

function hex(color: Color): string {
  const pair = (value: number): string => Math.round(value).toString(16).padStart(2, '0');

  return `#${pair(color.channels[0])}${pair(color.channels[1])}${pair(color.channels[2])}`;
}

function ratio(ink: Color, ground: Color): number {
  return contrast(hex(ink), hex(ground));
}

function color(palette: Record<string, string>, token: string): Color {
  const value = parse(palette[token], palette);
  expect(value, `--${token} не разобран`).not.toBeNull();
  return value ?? { channels: [0, 0, 0], alpha: 1 };
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
      `--line-ui на --${ground} даёт ${value.toFixed(2)}:1 при норме ${AA_LARGE}:1`,
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
          `--${state}-ink на ${where} даёт ${value.toFixed(2)}:1 при норме ${AA_TEXT}:1`,
        ).toBeGreaterThanOrEqual(AA_TEXT);
      }
    }
  });

  it.each(['error', 'ok'] as const)('текст поверх сплошной заливки «%s» читается', (state) => {
    const fill = color(palette, `${state}-ink`);
    const text = color(palette, `on-${state}`);
    const value = ratio(text, fill);

    expect(
      value,
      `--on-${state} на --${state}-ink даёт ${value.toFixed(2)}:1 при норме ${AA_TEXT}:1`,
    ).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
