import { describe, expect, it } from 'vitest';

import { parseArticleBody } from '@/entities/article/lib/parseArticleBody';

import { articleOutline, inlineText } from './outline';

const outline = (body: string) => articleOutline(parseArticleBody(body));

describe('Оглавление статьи', () => {
  it('якорь заголовка — слаг его текста', () => {
    const { headings } = outline('## Шаг 1. Мощность по площади');

    expect(headings).toEqual([
      { id: 'shag-1-moschnost-po-ploschadi', level: 2, text: 'Шаг 1. Мощность по площади' },
    ]);
  });

  it('в оглавление идут только заголовки второго уровня', () => {
    const { headings } = outline('## Первый\n\n### Вложенный\n\n## Второй');

    expect(headings.map((h) => h.text)).toEqual(['Первый', 'Второй']);
  });

  it('🔴 `###` до первого `##` поднимается до второго уровня: пропуск уровня — баг', () => {
    const { blocks, headings } = outline('### Сразу третий\n\n## Потом второй');

    expect(blocks.map((b) => (b.kind === 'heading' ? b.level : b.kind))).toEqual([2, 2]);
    expect(headings.map((h) => h.text)).toEqual(['Сразу третий', 'Потом второй']);
  });

  it('одинаковые заголовки получают разные якоря', () => {
    const { headings } = outline('## Итог\n\n## Итог');

    expect(headings.map((h) => h.id)).toEqual(['itog', 'itog-2']);
  });

  it('заголовок без букв всё равно получает якорь', () => {
    const { headings } = outline('## ???');

    expect(headings.map((h) => h.id)).toEqual(['razdel']);
  });

  it('жирный внутри заголовка не попадает в текст оглавления тегом', () => {
    const { headings } = outline('## Шаг **1**');

    expect(headings.map((h) => h.text)).toEqual(['Шаг 1']);
  });

  it('прочие блоки проходят насквозь в исходном порядке', () => {
    const { blocks } = outline('Абзац\n\n## Раздел\n\n- пункт\n\n> врезка');

    expect(blocks.map((b) => b.kind)).toEqual(['paragraph', 'heading', 'list', 'callout']);
  });

  it('пустое тело даёт пустое оглавление', () => {
    expect(outline('')).toEqual({ blocks: [], headings: [] });
  });
});

describe('inlineText', () => {
  it('склеивает узлы в чистый текст', () => {
    expect(
      inlineText([
        { kind: 'text', text: 'Правило: ' },
        { kind: 'strong', text: '1 кВт' },
      ]),
    ).toBe('Правило: 1 кВт');
  });
});
