import { describe, expect, it } from 'vitest';

import { toRequestBody } from './lib';
import { filledProduct } from './fixtures';

describe('Модель каталога — тело запроса', () => {
  it('незаполненные поля уходят как null, а не пустой строкой', () => {
    const body = toRequestBody({ ...filledProduct, brand: '', sku: '  ', tag: '' });

    expect(body).toMatchObject({ brand: null, sku: null, tag: null });
  });

  it('пустой адрес не отправляется — сервер соберёт его из названия', () => {
    expect(toRequestBody({ ...filledProduct, slug: '' })).not.toHaveProperty('slug');
    expect(toRequestBody({ ...filledProduct, slug: 'svoy-adres' })).toMatchObject({
      slug: 'svoy-adres',
    });
  });

  it('полупустая характеристика отбрасывается: в таблице сравнения это пустая ячейка', () => {
    const body = toRequestBody({
      ...filledProduct,
      specs: [
        { k: 'Площадь', v: 'до 27 м²' },
        { k: 'Забыли значение', v: '' },
        { k: '', v: 'забыли название' },
      ],
    });

    expect(body.specs).toEqual([{ k: 'Площадь', v: 'до 27 м²' }]);
  });

  it('пробелы вокруг значений срезаются', () => {
    const body = toRequestBody({
      ...filledProduct,
      name: '  Сплит  ',
      specs: [{ k: '  Шум ', v: ' 21 дБ ' }],
    });

    expect(body.name).toBe('Сплит');
    expect(body.specs).toEqual([{ k: 'Шум', v: '21 дБ' }]);
  });

  it('числа уходят строками — приводит их схема на сервере, и только она', () => {
    const body = toRequestBody(filledProduct);

    expect(body.priceNum).toBe('38500');
    expect(body.areaMax).toBe('27');
  });

  it('🔴 скидки в теле нет: её задаёт отдельная ручка (инвариант 14)', () => {
    const body = toRequestBody(filledProduct);

    expect(body).not.toHaveProperty('salePrice');
    expect(body).not.toHaveProperty('saleFrom');
    expect(body).not.toHaveProperty('discountPercent');
  });
});
