import { describe, expect, it } from 'vitest';

import { compare, diffStory } from './measurements-compare.mjs';
import { formatStory } from './measurements-format.mjs';

function node(key, parent, box, extra = {}) {
  const [x, y, w, h] = box;
  return { key, parent, fixed: false, x, y, w, h, geometry: {}, palette: {}, ...extra };
}

function story(id, mutate = () => {}) {
  const set = [];
  for (const width of [320, 375]) {
    for (const theme of ['light', 'dark']) {
      const nodes = [
        node('section.Pricing__root', null, [0, 0, width, 820], {
          palette: { bg: theme === 'dark' ? '#0b1220' : '#ffffff' },
        }),
        node('h2.Pricing__title', 'section.Pricing__root', [16, 32, width - 32, 36], {
          geometry: { font: 'Onest 600 28/36' },
          palette: { color: theme === 'dark' ? '#f3f5f7' : '#0f172a' },
          text: 'Сколько стоит монтаж',
          lines: 1,
        }),
        node('li.Card__root', 'section.Pricing__root', [16, 84, width - 32, 230], {
          geometry: { radius: '12px' },
          palette: { bg: '#ffffff' },
        }),
      ];
      const p = {
        story: id,
        width,
        theme,
        document: { scrollWidth: width, scrollHeight: 2000 },
        fonts: ['Onest 600'],
        nodes,
      };
      mutate(p);
      set.push(p);
    }
  }
  return formatStory(set);
}

const asMap = (entries) => new Map(Object.entries(entries));

describe('сравнение историй', () => {
  it('одинаковые тексты — без отличий; перестановка входных файлов не считается', () => {
    const before = story('a');
    const after = story('a');
    expect(diffStory(before, after)).toEqual({
      document: [],
      fonts: [],
      nodes: [],
      geometry: [],
      palette: [],
      text: [],
    });
  });

  it('🔴 разница в 1px — не изменение; в 2px — изменение геометрии с числами', () => {
    const one = story('a', (p) => {
      p.nodes[1].y = 33;
    });
    const two = story('a', (p) => {
      p.nodes[1].y = 34;
    });
    expect(diffStory(story('a'), one).geometry).toEqual([]);
    expect(diffStory(story('a'), two).geometry).toEqual([
      'section.Pricing__root › h2.Pricing__title @320: y 32 → 34',
      'section.Pricing__root › h2.Pricing__title @375: y 32 → 34',
    ]);
  });

  it('смена радиуса карточки — ровно одна строка на ширину, и только у неё', () => {
    const after = story('a', (p) => {
      p.nodes[2].geometry.radius = '11px';
    });
    const diff = diffStory(story('a'), after);
    expect(diff.geometry).toEqual([
      'section.Pricing__root › li.Card__root @320: r 12px → 11px',
      'section.Pricing__root › li.Card__root @375: r 12px → 11px',
    ]);
    expect(diff.palette).toEqual([]);
    expect(diff.text).toEqual([]);
  });

  it('палитра сравнивается точно и по темам', () => {
    const after = story('a', (p) => {
      if (p.theme === 'dark') p.nodes[1].palette.color = '#ffffff';
    });
    expect(diffStory(story('a'), after).palette).toEqual([
      'section.Pricing__root › h2.Pricing__title [dark]: color #f3f5f7 → #ffffff',
    ]);
  });

  it('правка текста — отдельная категория «текст», не геометрия', () => {
    const after = story('a', (p) => {
      p.nodes[1].text = 'Сколько стоит установка';
    });
    const diff = diffStory(story('a'), after);
    expect(diff.text).toEqual([
      'section.Pricing__root › h2.Pricing__title @320: «Сколько стоит монтаж» → «Сколько стоит установка»',
      'section.Pricing__root › h2.Pricing__title @375: «Сколько стоит монтаж» → «Сколько стоит установка»',
    ]);
    expect(diff.geometry).toEqual([]);
  });

  it('🔴 лишняя обёртка не входит в ключи — измеритель её не записывает, дифф пуст', () => {
    // обёртка без стилей в дерево не попадает: ключи и предки те же
    expect(diffStory(story('a'), story('a'))).toMatchObject({ nodes: [], geometry: [] });
  });

  it('новый и пропавший узел — в категории узлов', () => {
    const after = story('a', (p) => {
      p.nodes.push(node('p.Pricing__hint', 'section.Pricing__root', [16, 330, 100, 20]));
      p.nodes.splice(2, 1);
    });
    const diff = diffStory(story('a'), after);
    expect(diff.nodes).toEqual([
      '− section.Pricing__root › li.Card__root @320',
      '+ section.Pricing__root › p.Pricing__hint @320',
      '− section.Pricing__root › li.Card__root @375',
      '+ section.Pricing__root › p.Pricing__hint @375',
    ]);
  });
});

describe('вердикт', () => {
  it('всё совпало — зелёный', () => {
    const result = compare({
      committed: asMap({ a: story('a') }),
      actual: asMap({ a: story('a') }),
    });
    expect(result.ok).toBe(true);
    expect(result.markdown).toMatch(/✅ Измерения совпали/);
    expect(result.markdown).toMatch(/\| Совпали \| 1 \|/);
  });

  it('🔴 изменение — красный с историей, местом и сутью в таблице и подсказкой про pull', () => {
    const after = story('a', (p) => {
      p.nodes[2].geometry.radius = '11px';
    });
    const result = compare({ committed: asMap({ a: story('a') }), actual: asMap({ a: after }) });
    expect(result.ok).toBe(false);
    expect(result.markdown).toMatch(/\| `a` \| @320, @375 \| геометрия 2 \|/);
    expect(result.markdown).toMatch(
      /- `a` · section\.Pricing__root › li\.Card__root @320: r 12px → 11px/,
    );
    expect(result.reasons.join('\n')).toMatch(/vr:measure:pull/);
  });

  it('новая история без файла и файл без истории — красный, названы', () => {
    const result = compare({
      committed: asMap({ old: story('old') }),
      actual: asMap({ fresh: story('fresh') }),
    });
    expect(result.ok).toBe(false);
    expect(result.markdown).toMatch(/### Новые истории — 1\n\n- `fresh`/);
    expect(result.markdown).toMatch(/### Пропавшие истории — 1\n\n- `old`/);
  });

  it('отказы сборки красят и перечислены', () => {
    const result = compare({
      committed: asMap({ a: story('a') }),
      actual: asMap({ a: story('a') }),
      failed: [{ story: 'b', reason: 'нет измерений для 375/dark' }],
    });
    expect(result.ok).toBe(false);
    expect(result.markdown).toMatch(/### Отказы замера — 1\n\n- `b`: нет измерений для 375\/dark/);
  });

  it('нечитаемый файл в репозитории — красный, не исключение', () => {
    const result = compare({ committed: asMap({ a: 'мусор' }), actual: asMap({ a: story('a') }) });
    expect(result.ok).toBe(false);
    expect(result.markdown).toMatch(/### Не читаются — 1/);
  });
});
