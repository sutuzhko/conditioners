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

function readTheme(theme: Theme): Record<string, string> {
  const start = TOKENS.indexOf(BLOCK_START[theme]);
  const body = TOKENS.slice(start, TOKENS.indexOf('}', start));

  const values: Record<string, string> = {};
  for (const match of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name === undefined || value === undefined) continue;
    values[name] = value.trim();
  }
  return values;
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
