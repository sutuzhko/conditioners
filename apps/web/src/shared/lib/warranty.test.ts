import { describe, expect, it } from 'vitest';

import { warrantyTerms } from './warranty';

const labels = { installation: 'На монтаж', equipment: 'На оборудование' };

describe('warrantyTerms', () => {
  it('отдаёт оба срока с подписями блока', () => {
    expect(warrantyTerms({ installation: '2 года', equipment: '3 года' }, labels)).toEqual([
      { label: 'На монтаж', value: '2 года' },
      { label: 'На оборудование', value: '3 года' },
    ]);
  });

  // 🔴 Инвариант 8: незаполненный срок ничем не подменяется — его просто нет.
  it('незаполненное поле выпадает, а не подставляется умолчанием', () => {
    expect(warrantyTerms({ installation: '  ', equipment: '3 года' }, labels)).toEqual([
      { label: 'На оборудование', value: '3 года' },
    ]);
  });

  it('обе пустые — строк нет, блок гарантии не рисуется', () => {
    expect(warrantyTerms({ installation: '', equipment: '   ' }, labels)).toEqual([]);
  });

  it('настройки не переданы — тоже пусто', () => {
    expect(warrantyTerms(undefined, labels)).toEqual([]);
  });
});
