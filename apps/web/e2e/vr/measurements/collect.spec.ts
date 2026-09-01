import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import {
  collectMeasurements,
  type CollectInput,
  type MeasuredNode,
  type PartialMeasurement,
} from './collect';

/**
 * Тесты коллектора измерений на живом DOM (issue #460): маленькая страница на
 * каждое свойство формата. Здесь проверяется то, ради чего формат придуман —
 * устойчивость к лишней обёртке и к дробным сдвигам, и то, что одна правка
 * стиля меняет ровно одно поле одного узла.
 */

async function collect(page: Page, body: string, head = ''): Promise<PartialMeasurement> {
  await page.setContent(
    `<!doctype html><html><head><style>* { margin: 0; padding: 0; }</style>${head}</head>` +
      `<body><div id="storybook-root">${body}</div></body></html>`,
  );
  /* Тип входа назван явно: в литерале `theme` расширился бы до `string`. */
  const input: CollectInput = { theme: 'light', width: 800 };
  return page.evaluate(collectMeasurements, input);
}

const byKey = (nodes: readonly MeasuredNode[]): Map<string, MeasuredNode> =>
  new Map(nodes.map((node) => [node.key, node]));

/** Узел по ключу; отсутствие — ошибка теста, а не `undefined` в сравнении. */
function must(nodes: Map<string, MeasuredNode>, key: string): MeasuredNode {
  const node = nodes.get(key);
  if (node === undefined) throw new Error(`узла ${key} нет в измерении`);
  return node;
}

/** Поля, которыми два узла различаются, — чтобы утверждать «ровно одно». */
function differingFields(a: MeasuredNode, b: MeasuredNode): readonly string[] {
  const fields: string[] = [];
  for (const field of [
    'x',
    'y',
    'w',
    'h',
    'text',
    'lines',
    'clipped',
    'fixed',
    'parent',
  ] as const) {
    if (JSON.stringify(a[field]) !== JSON.stringify(b[field])) fields.push(field);
  }
  for (const group of ['geometry', 'palette'] as const) {
    const keys = new Set([...Object.keys(a[group]), ...Object.keys(b[group])]);
    for (const key of keys) {
      if (
        JSON.stringify(Reflect.get(a[group], key)) !== JSON.stringify(Reflect.get(b[group], key))
      ) {
        fields.push(`${group}.${key}`);
      }
    }
  }
  return fields;
}

test.describe('устойчивость', () => {
  test('лишняя обёртка вокруг записанного узла не меняет вывода', async ({ page }) => {
    const plain = await collect(
      page,
      `<section class="Pricing__root" style="padding: 16px"><h2 class="Pricing__title">Сколько стоит монтаж</h2></section>`,
    );
    const wrapped = await collect(
      page,
      `<section class="Pricing__root" style="padding: 16px"><div><div><h2 class="Pricing__title">Сколько стоит монтаж</h2></div></div></section>`,
    );
    expect(wrapped.nodes).toEqual(plain.nodes);
    expect(plain.nodes.map((node) => node.key)).toEqual([
      'section.Pricing__root',
      'h2.Pricing__title',
    ]);
    expect(plain.nodes[1]?.parent).toBe('section.Pricing__root');
    expect(plain.nodes[1]?.x).toBe(16);
    expect(plain.nodes[1]?.y).toBe(16);
  });

  test('сдвиг на 0,4px не меняет вывода, на 1px — меняет ровно y одного узла', async ({ page }) => {
    const at = (top: string): Promise<PartialMeasurement> =>
      collect(
        page,
        `<section class="Box__root" style="position: relative; height: 100px"><p class="Box__text" style="position: absolute; top: ${top}">Текст</p></section>`,
      );
    const base = await at('10px');
    const fraction = await at('10.4px');
    const whole = await at('11px');
    expect(fraction.nodes).toEqual(base.nodes);

    const before = byKey(base.nodes);
    const after = byKey(whole.nodes);
    const changed = [...before.keys()].filter(
      (key) => differingFields(must(before, key), must(after, key)).length > 0,
    );
    expect(changed).toEqual(['p.Box__text']);
    expect(differingFields(must(before, 'p.Box__text'), must(after, 'p.Box__text'))).toEqual(['y']);
    expect(after.get('p.Box__text')?.y).toBe(11);
  });

  test('смена радиуса меняет ровно одно поле одного узла', async ({ page }) => {
    const at = (radius: number): Promise<PartialMeasurement> =>
      collect(
        page,
        `<div class="Card__root" style="border-radius: ${radius}px; width: 100px; height: 40px"><button class="Card__cta" type="button">Ок</button></div>`,
      );
    const before = byKey((await at(11)).nodes);
    const after = byKey((await at(12)).nodes);
    expect(differingFields(must(before, 'div.Card__root'), must(after, 'div.Card__root'))).toEqual([
      'geometry.radius',
    ]);
    expect(
      differingFields(must(before, 'button.Card__cta'), must(after, 'button.Card__cta')),
    ).toEqual([]);
    expect(after.get('div.Card__root')?.geometry.radius).toBe('12');
  });
});

test.describe('ключи и координаты', () => {
  test('одинаковые соседи получают #2, #3; ключи вне модуля — тег и роль', async ({ page }) => {
    const result = await collect(
      page,
      `<ul class="List__root"><li class="List__item">а</li><li class="List__item">б</li><li class="List__item">в</li></ul>` +
        `<div role="tablist"><button role="tab" type="button">Вкладка</button></div><img alt="" width="10" height="10">`,
    );
    expect(result.nodes.map((node) => node.key)).toEqual([
      'ul.List__root',
      'li.List__item',
      'li.List__item#2',
      'li.List__item#3',
      'div[role=tablist]',
      'button[role=tab]',
      'img',
    ]);
    expect(result.nodes[3]?.parent).toBe('ul.List__root');
  });

  test('закреплённый узел помечен и считается от окна', async ({ page }) => {
    const result = await collect(
      page,
      `<div style="height: 3000px"></div><div class="Bar__root" style="position: fixed; top: 20px; left: 30px; width: 100px; height: 40px">Панель</div>`,
    );
    const bar = byKey(result.nodes).get('div.Bar__root');
    expect(bar).toMatchObject({ fixed: true, x: 30, y: 20, w: 100, h: 40 });
  });

  test('хешированный класс читается как ?__local', async ({ page }) => {
    const result = await collect(page, `<p class="_title_q5ie7_13">Заголовок</p>`);
    expect(result.nodes[0]?.key).toBe('p.?__title');
  });
});

test.describe('текст, псевдоэлементы, палитра', () => {
  test('текст обрезается до 40 знаков, перенос считается строками', async ({ page }) => {
    const long = 'Очень длинный заголовок, который не помещается в сорок знаков никак';
    const result = await collect(
      page,
      `<p class="Para__root" style="width: 80px; font-size: 16px; font-family: Arial">${long}</p>`,
    );
    const node = result.nodes[0];
    expect(node?.text).toHaveLength(40);
    expect(node?.text).toBe(long.slice(0, 40));
    expect(node?.lines ?? 0).toBeGreaterThanOrEqual(2);
    expect(node?.geometry.font).toMatch(/^Arial 400 16\//);
  });

  test('псевдоэлемент с содержимым — отдельный узел с родителем', async ({ page }) => {
    const result = await collect(
      page,
      `<span class="Tag__root">Метка</span>`,
      `<style>.Tag__root::before { content: '•'; display: inline-block; width: 8px; height: 8px; }</style>`,
    );
    expect(result.nodes.map((node) => node.key)).toEqual([
      'span.Tag__root',
      'span.Tag__root::before',
    ]);
    expect(result.nodes[1]).toMatchObject({ parent: 'span.Tag__root', w: 8, h: 8 });
  });

  test('палитра — hex строчными, прозрачный фон пропущен', async ({ page }) => {
    const result = await collect(
      page,
      `<div class="Card__root" style="background: rgb(15, 23, 42); color: #FFF; border: 1px solid rgba(255, 255, 255, 0.5); box-shadow: 0 1px 2px rgb(0, 0, 0)">Текст</div><p class="Plain__text">Без фона</p>`,
    );
    const nodes = byKey(result.nodes);
    expect(nodes.get('div.Card__root')?.palette).toEqual({
      color: '#ffffff',
      bg: '#0f172a',
      border: '#ffffff80',
      shadow: '#000000 0px 1px 2px 0px',
    });
    expect(nodes.get('div.Card__root')?.geometry.border).toBe('1');
    expect(nodes.get('p.Plain__text')?.palette.bg).toBeUndefined();
  });

  test('скрытый элемент не записан, нулевой — записан с нулями', async ({ page }) => {
    const result = await collect(
      page,
      `<p class="Hidden__x" style="display: none">Нет</p><p class="Gone__x" style="visibility: hidden">Нет</p><div class="Zero__x" style="width: 0; height: 0"></div>`,
    );
    expect(result.nodes.map((node) => node.key)).toEqual(['div.Zero__x']);
    expect(result.nodes[0]).toMatchObject({ w: 0, h: 0 });
  });

  test('переполнение помечается clipped', async ({ page }) => {
    const result = await collect(
      page,
      `<p class="Cell__x" style="width: 40px; overflow: hidden; white-space: nowrap">Очень длинная строка без переноса</p>`,
    );
    expect(result.nodes[0]?.clipped).toBe(true);
  });
});

test.describe('документ и шрифты', () => {
  test('загруженные грани — «Семейство вес», отсортированы, без дублей', async ({ page }) => {
    const woff2 = readFileSync(resolve('public/fonts/Manrope-400-latin.woff2'));
    await page.route('http://fonts.invalid/**', (route) =>
      route.fulfill({ body: woff2, contentType: 'font/woff2' }),
    );
    const result = await collect(
      page,
      `<p class="A__x" style="font-family: Probe; font-weight: 700">Жирный</p><p class="B__x" style="font-family: Probe; font-weight: 400">Обычный</p>`,
      `<style>
        @font-face { font-family: Probe; font-weight: 400; src: url(http://fonts.invalid/a.woff2) format('woff2'); }
        @font-face { font-family: Probe; font-weight: 700; src: url(http://fonts.invalid/b.woff2) format('woff2'); }
      </style>`,
    );
    expect(result.fonts).toEqual(['Probe 400', 'Probe 700']);
    expect(result.document.scrollWidth).toBeGreaterThan(0);
    expect(result.document.scrollHeight).toBeGreaterThan(0);
  });
});
