import { expect, test, type Page } from '@playwright/test';

import {
  measureInvariants,
  type InvariantRule,
  type MeasureInput,
  type Violation,
} from './measure';

/**
 * Тесты измерителя инвариантов на синтетическом DOM (issue #454).
 *
 * 🔴 Правило, которое ни разу не падало, не доказано. Каждое правило здесь
 * получает две страницы: с нарушением — и обязано назвать ровно его; без —
 * и обязано промолчать. Витрина не нужна: `page.setContent` рисует маленький
 * HTML в настоящем браузере, где есть раскладка, `elementFromPoint` и
 * `document.fonts`, — того, чего нет в jsdom. Снимков здесь нет намеренно.
 */

const DEFAULT_INPUT: MeasureInput = { theme: 'light', touch: false };

/** Страница целиком: тема в атрибуте, фон под неё, тело — переданная разметка. */
function page(body: string, options: { theme?: 'light' | 'dark'; head?: string } = {}): string {
  const theme = options.theme ?? 'light';
  const background = theme === 'dark' ? '#0b1220' : '#fff';
  return `<!doctype html>
<html data-theme="${theme}">
<head>
<meta charset="utf-8">
<style>html, body { margin: 0; } body { background: ${background}; }</style>
${options.head ?? ''}
</head>
<body>${body}</body>
</html>`;
}

async function measure(
  target: Page,
  html: string,
  input: MeasureInput = DEFAULT_INPUT,
): Promise<readonly Violation[]> {
  await target.setViewportSize({ width: 768, height: 600 });
  await target.setContent(html);
  return target.evaluate(measureInvariants, input);
}

/** Множество нарушенных правил без допущенных — то, что красит работу. */
const rulesOf = (violations: readonly Violation[]): readonly InvariantRule[] =>
  [...new Set(violations.filter((item) => item.allowed === null).map((item) => item.rule))].sort();

const BUTTON = '<button style="width:48px;height:48px">Ок</button>';

test.describe('overflow-x', () => {
  test('документ шире окна — нарушение с числами', async ({ page: p }) => {
    const found = await measure(
      p,
      page('<div style="width:calc(100vw + 200px);height:20px"></div>'),
    );
    expect(rulesOf(found)).toEqual(['overflow-x']);
    expect(found[0]?.detail).toMatch(/scrollWidth \d+ > 768/);
  });

  test('документ по ширине окна — тишина', async ({ page: p }) => {
    expect(rulesOf(await measure(p, page(BUTTON)))).toEqual([]);
  });
});

test.describe('target-size', () => {
  test('цель меньше 24×24 без сенсора — нарушение', async ({ page: p }) => {
    const found = await measure(
      p,
      page('<button aria-label="Закрыть" style="width:18px;height:18px;padding:0"></button>'),
    );
    expect(rulesOf(found)).toEqual(['target-size']);
    expect(found[0]?.element).toBe('button «Закрыть»');
    expect(found[0]?.detail).toBe('18×18 при минимуме 24');
  });

  test('🔴 видимая цель 0×0 — нарушение, а не «скрыта»', async ({ page: p }) => {
    const found = await measure(
      p,
      page(
        '<button aria-label="Пусто" style="display:block;width:0;height:0;padding:0;border:0;overflow:hidden"></button>',
      ),
    );
    expect(rulesOf(found)).toEqual(['target-size']);
    expect(found[0]?.detail).toBe('0×0 при минимуме 24');
  });

  test('в сенсорной раскладке порог 44: 32×32 — нарушение', async ({ page: p }) => {
    const found = await measure(
      p,
      page('<button style="width:32px;height:32px;padding:0">Да</button>'),
      { theme: 'light', touch: true },
    );
    expect(rulesOf(found)).toEqual(['target-size']);
    expect(found[0]?.detail).toBe('32×32 при минимуме 44');
  });

  test('32×32 без сенсора — допустимо', async ({ page: p }) => {
    const found = await measure(
      p,
      page('<button style="width:32px;height:32px;padding:0">Да</button>'),
    );
    expect(rulesOf(found)).toEqual([]);
  });

  test('ссылка в потоке текста исключена — её размер задаёт строка', async ({ page: p }) => {
    const found = await measure(
      p,
      page('<p style="font-size:14px">Читайте <a href="#">условия</a> перед заказом.</p>'),
    );
    expect(rulesOf(found)).toEqual([]);
  });

  test('скрытый по шаблону sr-only ввод с подписью не считается целью', async ({ page: p }) => {
    const found = await measure(
      p,
      page(
        `<label style="display:inline-block;width:60px;height:48px">
           <input type="checkbox" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">
           Согласен
         </label>`,
      ),
    );
    expect(rulesOf(found)).toEqual([]);
  });
});

test.describe('theme', () => {
  test('тёмная тема с белым фоном — нарушение', async ({ page: p }) => {
    const html = page(BUTTON, { theme: 'dark' }).replace('background: #0b1220', 'background: #fff');
    const found = await measure(p, html, { theme: 'dark', touch: false });
    expect(rulesOf(found)).toEqual(['theme']);
    expect(found[0]?.detail).toMatch(/фон rgb\(255, 255, 255\) .* при теме dark/);
  });

  test('атрибут темы не совпадает с запрошенной — нарушение', async ({ page: p }) => {
    const found = await measure(p, page(BUTTON, { theme: 'light' }), {
      theme: 'dark',
      touch: false,
    });
    expect(rulesOf(found)).toEqual(['theme']);
    expect(found.map((item) => item.detail)).toContain('data-theme="light" при теме dark');
  });

  test('тёмная тема с тёмным фоном — тишина', async ({ page: p }) => {
    const found = await measure(p, page(BUTTON, { theme: 'dark' }), {
      theme: 'dark',
      touch: false,
    });
    expect(rulesOf(found)).toEqual([]);
  });
});

test.describe('clipped-text', () => {
  test('строка шире рамки без многоточия — нарушение', async ({ page: p }) => {
    const found = await measure(
      p,
      page(
        '<p style="width:60px;overflow:hidden;white-space:nowrap">Очень длинная строка без переноса</p>',
      ),
    );
    expect(rulesOf(found)).toEqual(['clipped-text']);
    expect(found[0]?.detail).toMatch(/текст шире рамки/);
  });

  test('с многоточием — обрезка задумана, тишина', async ({ page: p }) => {
    const found = await measure(
      p,
      page(
        '<p style="width:60px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Очень длинная строка без переноса</p>',
      ),
    );
    expect(rulesOf(found)).toEqual([]);
  });

  test('абзац выше рамки без обрезки строк — нарушение', async ({ page: p }) => {
    const found = await measure(
      p,
      page(
        '<p style="width:120px;height:20px;overflow:hidden;line-height:20px">Первая строка и вторая строка и третья</p>',
      ),
    );
    expect(rulesOf(found)).toEqual(['clipped-text']);
    expect(found[0]?.detail).toMatch(/текст выше рамки/);
  });
});

test.describe('occlusion', () => {
  test('фиксированная полоса поверх кнопки — нарушение с именем полосы', async ({ page: p }) => {
    const found = await measure(
      p,
      page(
        `<button style="width:48px;height:48px">Ок</button>
         <div class="sticky-bar" style="position:fixed;top:0;left:0;right:0;height:200px;background:rgba(0,0,0,.1)"></div>`,
      ),
    );
    expect(rulesOf(found)).toEqual(['occlusion']);
    expect(found[0]?.element).toBe('button «Ок»');
    expect(found[0]?.detail).toMatch(/сверху div\.sticky-bar/);
  });

  test('открытое модальное окно накрывает страницу законно', async ({ page: p }) => {
    const found = await measure(
      p,
      page(
        `<button style="width:48px;height:48px">Под окном</button>
         <div role="dialog" aria-modal="true" style="position:fixed;inset:0;background:rgba(0,0,0,.5)">
           <button style="width:48px;height:48px;margin:100px">В окне</button>
         </div>`,
      ),
    );
    expect(rulesOf(found)).toEqual([]);
  });

  test('цель ниже первого экрана подводится к центру и проверяется там', async ({ page: p }) => {
    const found = await measure(
      p,
      page(
        `<div style="height:1500px"></div>
         <button style="width:48px;height:48px">Внизу</button>
         <div style="height:600px"></div>`,
      ),
    );
    expect(rulesOf(found)).toEqual([]);
  });
});

test.describe('fonts', () => {
  test('шрифт с несуществующим файлом — нарушение', async ({ page: p }) => {
    const found = await measure(
      p,
      page('<p style="font-family:Призрак">Текст призрачным шрифтом</p>', {
        head: `<style>@font-face { font-family: 'Призрак'; src: url('/nope.woff2'); }</style>`,
      }),
    );
    expect(rulesOf(found)).toEqual(['fonts']);
    expect(found.map((item) => item.detail).join('\n')).toMatch(/Призрак/);
  });

  test('системный шрифт без @font-face — тишина', async ({ page: p }) => {
    const found = await measure(p, page('<p style="font-family:sans-serif">Обычный текст</p>'));
    expect(rulesOf(found)).toEqual([]);
  });
});

test.describe('images', () => {
  test('битая картинка — нарушение', async ({ page: p }) => {
    const found = await measure(
      p,
      page('<img alt="Схема" width="40" height="40" src="data:image/png;base64,bm90IGEgcG5n">'),
    );
    expect(rulesOf(found)).toEqual(['images']);
    expect(found[0]?.element).toBe('img «Схема»');
  });

  test('ленивая картинка за пределами окна не считается', async ({ page: p }) => {
    const found = await measure(
      p,
      page(
        `<div style="height:2000px"></div>
         <img alt="" loading="lazy" width="40" height="40" src="/never-loaded.png">`,
      ),
    );
    expect(rulesOf(found)).toEqual([]);
  });
});

/**
 * Подмена объекта витрины: `setContent` — не навигация, и `addInitScript`
 * на него не срабатывает, поэтому параметры истории подкладываются в уже
 * загруженную страницу перед замером.
 */
async function withStoryParameters(
  target: Page,
  html: string,
  invariants: Readonly<Record<string, unknown>>,
): Promise<readonly Violation[]> {
  await target.setViewportSize({ width: 768, height: 600 });
  await target.setContent(html);
  await target.evaluate((params) => {
    Object.defineProperty(window, '__STORYBOOK_PREVIEW__', {
      value: { currentRender: { story: { parameters: { invariants: params } } } },
    });
  }, invariants);
  return target.evaluate(measureInvariants, DEFAULT_INPUT);
}

const WIDE = page('<div style="width:calc(100vw + 200px);height:20px"></div>');

test.describe('допущения', () => {
  test('правило из parameters.invariants.allow возвращается с причиной, а не глотается', async ({
    page: p,
  }) => {
    const found = await withStoryParameters(p, WIDE, {
      allow: [{ rule: 'overflow-x', reason: 'лента едет от края до края' }],
    });
    expect(rulesOf(found)).toEqual([]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: 'overflow-x', allowed: 'лента едет от края до края' });
  });

  test('допущение без причины видно как «причина не названа»', async ({ page: p }) => {
    const found = await withStoryParameters(p, WIDE, { allow: [{ rule: 'overflow-x' }] });
    expect(found[0]?.allowed).toBe('причина не названа');
  });
});
