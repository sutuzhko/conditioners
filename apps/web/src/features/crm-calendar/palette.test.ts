// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PERSON_TONES, type PersonTone } from '@/entities/crm/lib/palette';
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
 * Порог для нетекстового элемента (WCAG 1.4.11): точка клетки месяца букв не
 * несёт, и спрашивать с неё 4,5:1 не за что — но 3:1 обязательны, иначе на
 * телефоне в клетке нет вообще ничего (issue #885).
 */
const AA_GRAPHIC = 3;

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

/* ---------- Точки клетки месяца (issue #885) ---------- */

/**
 * 🔴 Ниже 600px клетка месяца показывает не строки, а точки (issue #547), и
 * краску им даёт свой набор правил: пара «тинт + текст» в шести пикселях не
 * видна вовсе, поэтому точка берёт насыщенную краску пары одним объявлением
 * `color`, а `.dot` заливается ею через `currentcolor`.
 *
 * Проверка та же по смыслу, что и у записей, и заведена ровно потому, что
 * без неё дефект жил три недели: `CalendarGrid.tsx` просил у модуля
 * `.toneAccent`, `.personA` и `.dot`, которых в модуле не было ни одного, —
 * класс приходил пустым, и на телефоне клетка оставалась пустой.
 */
const GRID_CSS = readFileSync(join(__dirname, 'CalendarGrid.module.css'), 'utf8');

/** Имя класса краски человека в модуле: `a` → `.personA`. */
function personClassOf(tone: PersonTone): string {
  return `.person${tone.toUpperCase()}`;
}

/** Токен краски из правила вида `.toneOk { color: var(--ok-ink); }`. */
function inkOf(css: string, selector: string): string | null {
  const start = css.indexOf(`\n${selector} {`);
  if (start < 0) return null;

  const body = css.slice(start, css.indexOf('}', start));

  return /(?:^|[\s;])color:\s*var\(--([\w-]+)\)/.exec(body)?.[1] ?? null;
}

describe('Краски точек клетки месяца — CalendarGrid.module.css', () => {
  const CASES: readonly { readonly title: string; readonly selector: string }[] = [
    ...WORK_TYPE_TONES.map((tone) => ({ title: `вид работ «${tone}»`, selector: classOf(tone) })),
    ...PERSON_TONES.map((tone) => ({ title: `человек «${tone}»`, selector: personClassOf(tone) })),
  ];

  it.each(CASES)('$title описан краской', ({ selector }) => {
    expect(inkOf(GRID_CSS, selector), `в модуле нет правила ${selector}`).not.toBeNull();
  });

  describe.each<Theme>(['light', 'dark'])('%s', (theme) => {
    const values = THEMES[theme];

    it.each(CASES)('$title видна на всех фонах клетки', ({ selector }) => {
      const token = inkOf(GRID_CSS, selector);
      expect(token).not.toBeNull();
      if (token === null) return;

      for (const groundToken of GROUNDS) {
        const ground = parseColor(values[groundToken] ?? '');
        expect(ground, `нет токена --${groundToken}`).not.toBeNull();
        if (ground === null) continue;

        const ink = over(values, token, ground);
        expect(ink, `нет токена --${token}`).not.toBeNull();
        if (ink === null) continue;

        const ratio = contrastRatio(ink, ground);
        expect(
          ratio,
          `${selector} на --${groundToken}: --${token} даёт ${formatRatio(ratio)}:1 ` +
            `при норме ${AA_GRAPHIC}:1`,
        ).toBeGreaterThanOrEqual(AA_GRAPHIC);
      }
    });
  });
});

/* ---------- Полнота модуля (issue #885) ---------- */

/**
 * 🔴 Класс, который компонент просит у модуля, обязан в модуле быть.
 *
 * Дефект #885 состоял ровно в этом: семнадцать имён — точка, её краски,
 * пометка занятости, остаток — приходили из модуля неопределёнными, элемент
 * получал `undefined` вместо класса и оставался без единого правила. Ни один
 * из трёх механизмов проверки этого не видит: пиксельно разделы `Админка/`
 * не снимаются, точка не интерактивна и мимо инвариантов целей проходит, а
 * измерения записывают узел без класса как безымянный `span` — то есть
 * отличить «класса нет» от «узла нет» по файлу нельзя.
 *
 * Проверка ограничена календарём намеренно: по остальному дереву тот же
 * разбор находит ещё шесть мест, и правка их — отдельная задача, а не
 * попутный груз этой.
 */
describe('Модули календаря отвечают на все запрошенные классы', () => {
  const FEATURE = __dirname;

  /** Имена по первой группе совпадения. Пустая группа невозможна, но проверка типов о том не знает. */
  function namesOf(source: string, pattern: RegExp): ReadonlySet<string> {
    const names = new Set<string>();
    for (const match of source.matchAll(pattern)) {
      const name = match[1];
      if (name !== undefined) names.add(name);
    }

    return names;
  }

  /** Имена, которые компонент берёт у модуля: `styles.dot` → `dot`. */
  function requested(source: string): ReadonlySet<string> {
    return namesOf(source, /styles\.([A-Za-z0-9_]+)/g);
  }

  /** Имена, объявленные в модуле. Комментарии выброшены: в них тоже точки. */
  function declared(css: string): ReadonlySet<string> {
    return namesOf(css.replace(/\/\*[\s\S]*?\*\//g, ''), /\.([A-Za-z_][A-Za-z0-9_-]*)/g);
  }

  const PAIRS = readdirSync(FEATURE)
    .filter((name) => /^[A-Za-z]+\.tsx$/.test(name))
    .map((name) => {
      const source = readFileSync(join(FEATURE, name), 'utf8');
      const styles = /import\s+styles\s+from\s+'\.\/([\w.]+\.module\.css)'/.exec(source)?.[1];

      return { name, source, styles };
    })
    .filter(
      (pair): pair is { name: string; source: string; styles: string } => pair.styles !== undefined,
    );

  it('пар «компонент + модуль» найдено больше одной', () => {
    expect(PAIRS.length).toBeGreaterThan(1);
  });

  it.each(PAIRS)('$name', ({ source, styles }) => {
    const have = declared(readFileSync(join(FEATURE, styles), 'utf8'));
    const missing = [...requested(source)].filter((name) => !have.has(name));

    expect(missing, `в ${styles} нет правил: ${missing.join(', ')}`).toEqual([]);
  });
});
