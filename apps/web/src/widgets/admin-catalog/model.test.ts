import { describe, expect, it } from 'vitest';

import { catalogFilterOf, catalogFilterOn, catalogFilterQuery } from './model';

describe('отбор каталога живёт в адресе (issue #612)', () => {
  it('читает поиск и видимость', () => {
    expect(catalogFilterOf({ q: '  инвертор ', show: 'hidden' })).toEqual({
      query: 'инвертор',
      visibility: 'hidden',
    });
  });

  /* 🔴 Адрес правят руками и присылают друг другу: мусор снимает условие, а не
     роняет раздел (issue #341). */
  it('мусор в параметре снимает условие, а не роняет раздел', () => {
    expect(catalogFilterOf({ show: 'скрытые' })).toEqual({ query: '', visibility: undefined });
  });

  it('пустой отбор в адрес не уезжает', () => {
    expect(catalogFilterQuery(catalogFilterOf({}))).toEqual({});
    expect(catalogFilterOn(catalogFilterOf({}))).toBe(false);
  });

  /* 🔴 Разбивка обязана нести отбор за собой: без него вторая страница
     найденного показывала бы весь каталог. */
  it('разбивка несёт отбор в адрес', () => {
    expect(catalogFilterQuery(catalogFilterOf({ q: 'мульти', show: 'visible' }))).toEqual({
      q: 'мульти',
      show: 'visible',
    });
  });
});
