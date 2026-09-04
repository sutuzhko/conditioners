import { describe, expect, it } from 'vitest';

import { applyMarkup } from './markup';

describe('Панель инструментов редактора статьи', () => {
  it('делает выделенную строку подзаголовком', () => {
    const result = applyMarkup('Коротко о главном', 0, 7, 'h2');

    expect(result.body).toBe('## Коротко о главном');
  });

  it('повторное нажатие снимает разметку: кнопка — переключатель', () => {
    const once = applyMarkup('Коротко', 0, 7, 'h2');
    const twice = applyMarkup(once.body, once.selectionStart, once.selectionEnd, 'h2');

    expect(twice.body).toBe('Коротко');
  });

  /**
   * 🔴 Заголовок второго уровня, к которому применили третий, обязан стать
   * третьим. Иначе в тексте копятся решётки, а разбор увидит «### ##».
   */
  it('меняет уровень заголовка, а не накапливает решётки', () => {
    const h2 = applyMarkup('Коротко', 0, 7, 'h2');
    const h3 = applyMarkup(h2.body, h2.selectionStart, h2.selectionEnd, 'h3');

    expect(h3.body).toBe('### Коротко');
  });

  it('размечает списком все задетые строки разом', () => {
    const source = 'штробление\nтрасса\nвакуумирование';
    const result = applyMarkup(source, 0, source.length, 'list');

    expect(result.body).toBe('- штробление\n- трасса\n- вакуумирование');
  });

  it('врезка ставится своим знаком', () => {
    expect(applyMarkup('Важное', 0, 6, 'callout').body).toBe('> Важное');
  });

  it('жирным оборачивает выделение и снимает его повторным нажатием', () => {
    const on = applyMarkup('цена монтажа', 0, 4, 'bold');
    expect(on.body).toBe('**цена** монтажа');

    const off = applyMarkup(on.body, 0, 8, 'bold');
    expect(off.body).toBe('цена монтажа');
  });

  /** Без выделения курсор встаёт между звёздочками — набранное будет жирным. */
  it('без выделения ставит курсор внутрь жирного', () => {
    const result = applyMarkup('цена ', 5, 5, 'bold');

    expect(result.body).toBe('цена ****');
    expect(result.selectionStart).toBe(7);
    expect(result.selectionEnd).toBe(7);
  });

  it('размечает строку, в которую попал курсор, а не весь текст', () => {
    const source = 'первый абзац\nвторой абзац';
    const result = applyMarkup(source, 15, 15, 'h3');

    expect(result.body).toBe('первый абзац\n### второй абзац');
  });
});
