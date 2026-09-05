import { describe, expect, it } from 'vitest';

import { articleFilterOf, articleFilterOn, articleFilterQuery } from './model';

describe('отбор статей живёт в адресе (issue #614)', () => {
  it('читает поиск, рубрику, состояние и порядок', () => {
    expect(
      articleFilterOf({ q: '  штроба ', category: 'Монтаж', state: 'draft', order: 'old' }),
    ).toEqual({ query: 'штроба', category: 'Монтаж', state: 'draft', order: 'old' });
  });

  /* 🔴 Адрес правят руками и присылают друг другу: мусор снимает условие, а не
     роняет раздел (issue #341). */
  it('мусор в параметрах снимает условие, а не роняет раздел', () => {
    expect(articleFilterOf({ state: 'черновик', order: 'вниз' })).toEqual({
      query: '',
      category: '',
      state: undefined,
      order: undefined,
    });
  });

  it('пустой отбор и умолчание порядка в адрес не уезжают', () => {
    expect(articleFilterQuery(articleFilterOf({}))).toEqual({});
    expect(articleFilterQuery(articleFilterOf({ order: 'new' }))).toEqual({});
    expect(articleFilterOn(articleFilterOf({ order: 'new' }))).toBe(false);
  });

  /* 🔴 Разбивка обязана нести отбор за собой: без него вторая страница
     найденного показывала бы весь раздел (issue #612). */
  it('разбивка несёт отбор в адрес', () => {
    expect(articleFilterQuery(articleFilterOf({ q: 'трасса', state: 'published' }))).toEqual({
      q: 'трасса',
      state: 'published',
    });
  });
});
