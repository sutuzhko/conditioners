import { describe, expect, it } from 'vitest';

import { buildModel, formatStory, normaliseText, parseStory } from './measurements-format.mjs';

/** Узел частичного измерения в форме контракта с раннером. */
function node(key, parent, box, extra = {}) {
  const [x, y, w, h] = box;
  return { key, parent, fixed: false, x, y, w, h, geometry: {}, palette: {}, ...extra };
}

/** Частичное измерение пары «ширина + тема». */
function partial(width, theme, nodes, extra = {}) {
  return {
    story: 'блоки-цены--basic',
    width,
    theme,
    document: { scrollWidth: width, scrollHeight: 2000 + width },
    fonts: ['Onest 600', 'Manrope 400'],
    nodes,
    ...extra,
  };
}

function baseNodes(theme) {
  const color = theme === 'dark' ? '#f3f5f7' : '#0f172a';
  const bg = theme === 'dark' ? '#0b1220' : '#ffffff';
  return [
    node('section.Pricing__root', null, [0, 0, 375, 820], { palette: { bg } }),
    node('h2.Pricing__title', 'section.Pricing__root', [16, 32, 343, 36], {
      geometry: { font: 'Onest 600 28/36', radius: '0px' },
      palette: { color },
      text: 'Сколько стоит   монтаж',
      lines: 1,
    }),
    node('li.Card__root#2', 'section.Pricing__root', [16, 84, 343, 230], {
      geometry: { radius: '11px', border: '1px solid' },
      palette: { bg, border: '#e2e8f0', shadow: '0 1px 2px #00000033' },
    }),
  ];
}

const fullSet = () =>
  [320, 375].flatMap((width) =>
    ['light', 'dark'].map((theme) => partial(width, theme, baseNodes(theme))),
  );

describe('формат истории', () => {
  it('пишет читаемый текст: шапка, документ, дерево отступом, палитра по темам', () => {
    const text = formatStory(fullSet());
    expect(text).toContain('# блоки-цены--basic · ширины 320 375 · темы light dark');
    expect(text).toContain('шрифты: Manrope 400, Onest 600');
    expect(text).toContain('[документ]\n320 → 320×2320\n375 → 375×2375');
    expect(text).toContain(
      '[геометрия 320]\nsection.Pricing__root  375×820 @0,0\n  h2.Pricing__title  343×36 @16,32  Onest 600 28/36  r0px  lines=1  «Сколько стоит монтаж»',
    );
    expect(text).toContain('  li.Card__root#2  343×230 @16,84  r11px  b1px solid');
    expect(text).toContain(
      '[палитра light]\nsection.Pricing__root  bg #ffffff\n  h2.Pricing__title  color #0f172a',
    );
    expect(text).toContain('[палитра dark]\nsection.Pricing__root  bg #0b1220');
    expect(text).toContain(
      '  li.Card__root#2  bg #ffffff  border #e2e8f0  shadow 0 1px 2px #00000033',
    );
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
  });

  it('🔴 круговой: parse(format(p)) — та же модель, что buildModel(p)', () => {
    const set = fullSet();
    expect(parseStory(formatStory(set))).toEqual(buildModel(set));
  });

  it('🔴 детерминизм: порядок входных файлов не меняет текст', () => {
    const set = fullSet();
    const shuffled = [set[3], set[0], set[2], set[1]];
    expect(formatStory(shuffled)).toBe(formatStory(set));
  });

  it('секции расхождений тёмной темы и палитры по ширине появляются только при расхождении', () => {
    const clean = formatStory(fullSet());
    // `[палитра dark]` есть всегда — расхождение выдаёт только геометрия
    expect(clean).not.toMatch(/\[геометрия \d+ dark\]/);
    expect(clean).not.toContain('@320]');

    const set = fullSet();
    // тёмная тема сдвинула заголовок на 3px — находка
    set[1].nodes[1].y = 35;
    // на 320 карточка в светлой теме другого цвета — находка
    set[0].nodes[2].palette.bg = '#fafafa';
    const text = formatStory(set);
    // в секциях расхождений узлы стоят вразнобой — путь написан явно
    expect(text).toContain(
      '[геометрия 320 dark]\nsection.Pricing__root > h2.Pricing__title  343×36 @16,35',
    );
    expect(text).toContain(
      '[палитра light @320]\nsection.Pricing__root > li.Card__root#2  bg #fafafa',
    );
    expect(parseStory(text)).toEqual(buildModel(set));
  });

  it('расхождение в 1px между темами — не расхождение', () => {
    const set = fullSet();
    set[1].nodes[1].y = 33;
    expect(formatStory(set)).not.toMatch(/\[геометрия \d+ dark\]/);
  });

  it('узел, которого нет в тёмной теме, записан как пропавший', () => {
    const set = fullSet();
    set[1].nodes.pop();
    set[3].nodes.pop();
    const text = formatStory(set);
    expect(text).toContain('[геометрия 320 dark]\n− section.Pricing__root > li.Card__root#2');
    expect(parseStory(text)).toEqual(buildModel(set));
  });

  it('текст нормализован: пробелы схлопнуты, длинное обрезано, кавычка не ломает разбор', () => {
    expect(normaliseText('  Сколько   стоит\nмонтаж ')).toBe('Сколько стоит монтаж');
    expect(normaliseText('а'.repeat(60))).toHaveLength(40);
    expect(normaliseText('«Второй кондиционер» у этих ребят')).toBe(
      '«Второй кондиционер" у этих ребят',
    );
    const set = fullSet();
    for (const p of set) p.nodes[1].text = 'Цитата «внутри» текста';
    expect(parseStory(formatStory(set)).geometry[320][1].text).toBe('Цитата «внутри" текста');
  });

  it('🔴 одинаковые ключи под разными предками — разные узлы: идентичность по пути', () => {
    const set = [320, 375].flatMap((width) =>
      ['light', 'dark'].map((theme) =>
        partial(width, theme, [
          node('ul.List__root', null, [0, 0, width, 200]),
          node('li.Card__root', 'ul.List__root', [0, 0, width, 100]),
          node('span.Card__price', 'li.Card__root', [8, 8, 60, 20], { text: '1' }),
          node('li.Card__root#2', 'ul.List__root', [0, 100, width, 100]),
          node('span.Card__price', 'li.Card__root#2', [8, 8, 60, 20], { text: '2' }),
        ]),
      ),
    );
    const model = buildModel(set);
    expect(model.geometry[320].map((n) => n.path)).toEqual([
      'ul.List__root',
      'ul.List__root > li.Card__root',
      'ul.List__root > li.Card__root > span.Card__price',
      'ul.List__root > li.Card__root#2',
      'ul.List__root > li.Card__root#2 > span.Card__price',
    ]);
    expect(parseStory(formatStory(set))).toEqual(model);
  });

  it('координаты округляются до целых', () => {
    const set = fullSet();
    for (const p of set) p.nodes[1].y = 32.4;
    expect(parseStory(formatStory(set)).geometry[320][1].y).toBe(32);
  });

  it('измерения разных историй в одной модели — ошибка', () => {
    const set = fullSet();
    set[0].story = 'другая--история';
    expect(() => formatStory(set)).toThrow(/разных историй/);
  });

  it('незнакомая строка при разборе — ошибка, а не молчаливый пропуск', () => {
    const text = formatStory(fullSet()).replace('320 → 320×2320', 'мусор');
    expect(() => parseStory(text)).toThrow(/не разобрана строка документа/);
  });
});
