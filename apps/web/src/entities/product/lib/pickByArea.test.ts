import { describe, expect, it } from 'vitest';

import { pickByArea, type PickableProduct } from './pickByArea';

type Model = PickableProduct & { readonly badge: string };

const models: Model[] = [
  { badge: '12', areaMax: 35, visible: true, sort: 2 },
  { badge: '07', areaMax: 20, visible: true, sort: 0 },
  { badge: '18', areaMax: 50, visible: true, sort: 3 },
  { badge: '09', areaMax: 27, visible: true, sort: 1 },
];

describe('pickByArea', () => {
  it('берёт первую модель, которой хватает площади', () => {
    expect(pickByArea(models, 25)?.badge).toBe('09');
    expect(pickByArea(models, 1)?.badge).toBe('07');
  });

  it('площадь ровно равная areaMax — модель подходит', () => {
    expect(pickByArea(models, 20)?.badge).toBe('07');
    expect(pickByArea(models, 27)?.badge).toBe('09');
    expect(pickByArea(models, 50)?.badge).toBe('18');
  });

  it('на метр больше — следующий класс', () => {
    expect(pickByArea(models, 21)?.badge).toBe('09');
  });

  it('если не хватает ни одной — самая мощная', () => {
    expect(pickByArea(models, 200)?.badge).toBe('18');
  });

  it('для офиса сдвигается на класс выше', () => {
    expect(pickByArea(models, 25, 'Офис')?.badge).toBe('12');
    expect(pickByArea(models, 20, 'Офис')?.badge).toBe('09');
  });

  it('для офиса сдвигать некуда — остаётся самая мощная', () => {
    expect(pickByArea(models, 50, 'Офис')?.badge).toBe('18');
    expect(pickByArea(models, 200, 'Офис')?.badge).toBe('18');
  });

  it('регистр и пробелы в типе помещения не мешают', () => {
    expect(pickByArea(models, 25, ' офис ')?.badge).toBe('12');
  });

  it('прочие типы помещения сдвига не дают', () => {
    expect(pickByArea(models, 25, 'Квартира')?.badge).toBe('09');
    expect(pickByArea(models, 25, null)?.badge).toBe('09');
    expect(pickByArea(models, 25)?.badge).toBe('09');
  });

  it('скрытые модели в подборе не участвуют', () => {
    const hidden = models.map((m) => (m.badge === '09' ? { ...m, visible: false } : m));

    expect(pickByArea(hidden, 25)?.badge).toBe('12');
  });

  it('пустой список моделей — null, а не выдуманная модель', () => {
    expect(pickByArea([], 25)).toBeNull();
    expect(
      pickByArea(
        models.map((m) => ({ ...m, visible: false })),
        25,
      ),
    ).toBeNull();
  });
});
