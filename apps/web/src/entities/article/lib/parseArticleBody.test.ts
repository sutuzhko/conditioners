import { describe, expect, it } from 'vitest';

import { parseArticleBody } from './parseArticleBody';

const text = (value: string) => ({ kind: 'text', text: value });
const strong = (value: string) => ({ kind: 'strong', text: value });

describe('parseArticleBody', () => {
  it('пустое тело даёт пустой список блоков', () => {
    expect(parseArticleBody('')).toEqual([]);
    expect(parseArticleBody('   \n\n  \n')).toEqual([]);
  });

  it('разбирает заголовки двух уровней', () => {
    expect(parseArticleBody('## Шаг 1\n\n### Поправки')).toEqual([
      { kind: 'heading', level: 2, content: [text('Шаг 1')] },
      { kind: 'heading', level: 3, content: [text('Поправки')] },
    ]);
  });

  it('собирает подряд идущие пункты в один список', () => {
    expect(parseArticleBody('- первый\n- второй')).toEqual([
      { kind: 'list', items: [[text('первый')], [text('второй')]] },
    ]);
  });

  it('разбирает врезку', () => {
    expect(parseArticleBody('> так делать нельзя')).toEqual([
      { kind: 'callout', content: [text('так делать нельзя')] },
    ]);
  });

  it('жирный разбирается внутри любого блока', () => {
    expect(parseArticleBody('Правило: **1 кВт** на 10 м²')).toEqual([
      { kind: 'paragraph', content: [text('Правило: '), strong('1 кВт'), text(' на 10 м²')] },
    ]);
    expect(parseArticleBody('- **07** — до 20 м²')).toEqual([
      { kind: 'list', items: [[strong('07'), text(' — до 20 м²')]] },
    ]);
    expect(parseArticleBody('## Шаг **1**')).toEqual([
      { kind: 'heading', level: 2, content: [text('Шаг '), strong('1')] },
    ]);
  });

  it('незакрытые звёздочки остаются текстом', () => {
    expect(parseArticleBody('цена **очень выгодная')).toEqual([
      { kind: 'paragraph', content: [text('цена **очень выгодная')] },
    ]);
  });

  it('несколько пустых строк подряд — такой же разделитель, как одна', () => {
    const blocks = parseArticleBody('Первый абзац\n\n\n\n\nВторой абзац\n   \n\nТретий');

    expect(blocks).toEqual([
      { kind: 'paragraph', content: [text('Первый абзац')] },
      { kind: 'paragraph', content: [text('Второй абзац')] },
      { kind: 'paragraph', content: [text('Третий')] },
    ]);
  });

  it('заголовок отделяется от текста даже без пустой строки', () => {
    expect(parseArticleBody('## Шаг 1\nБазовое правило')).toEqual([
      { kind: 'heading', level: 2, content: [text('Шаг 1')] },
      { kind: 'paragraph', content: [text('Базовое правило')] },
    ]);
  });

  it('список и абзац в одном блоке не смешиваются', () => {
    expect(parseArticleBody('Добавьте запас, если:\n- окна на юг\n- последний этаж')).toEqual([
      { kind: 'paragraph', content: [text('Добавьте запас, если:')] },
      { kind: 'list', items: [[text('окна на юг')], [text('последний этаж')]] },
    ]);
  });

  it('переносы строк внутри абзаца склеиваются в один текст', () => {
    expect(parseArticleBody('первая строка\nвторая строка')).toEqual([
      { kind: 'paragraph', content: [text('первая строка вторая строка')] },
    ]);
  });

  it('переводы строк Windows не ломают разбор', () => {
    expect(parseArticleBody('## Шаг 1\r\n\r\n- пункт')).toEqual([
      { kind: 'heading', level: 2, content: [text('Шаг 1')] },
      { kind: 'list', items: [[text('пункт')]] },
    ]);
  });

  it('разбирает статью целиком, сохраняя порядок блоков', () => {
    const body = [
      'Кондиционер выбирают раз в 10 лет.',
      '',
      '## Шаг 1. Мощность по площади',
      '',
      'Правило: **1 кВт** на 10 м²:',
      '',
      '- **07** — до 20 м²',
      '- **09** — до 27 м²',
      '',
      '> Запас берут не «на глаз».',
    ].join('\n');

    expect(parseArticleBody(body).map((b) => b.kind)).toEqual([
      'paragraph',
      'heading',
      'paragraph',
      'list',
      'callout',
    ]);
  });

  it('в дереве нет ни одного тега — разметку собирает UI', () => {
    const blocks = parseArticleBody('## <script>alert(1)</script>\n\n- <b>жирный</b>');

    expect(JSON.stringify(blocks)).not.toContain('kind":"html');
    expect(blocks[0]).toEqual({
      kind: 'heading',
      level: 2,
      content: [text('<script>alert(1)</script>')],
    });
  });
});
