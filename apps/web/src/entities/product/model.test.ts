import { describe, expect, it } from 'vitest';

import { photoUpdateSchema, productInputSchema, saleInputSchema } from './model';

const VALID = {
  badge: '09',
  name: 'Сплит-система 09',
  areaMax: 27,
  priceNum: 38_500,
  specs: [{ k: 'Площадь', v: 'до 27 м²' }],
};

describe('тело создания модели', () => {
  it('принимает произвольные характеристики: фиксированного списка нет', () => {
    const parsed = productInputSchema.parse({
      ...VALID,
      specs: [
        { k: 'Уровень шума', v: '22 дБ' },
        { k: 'Какая угодно новая характеристика', v: 'значение' },
      ],
    });

    expect(parsed.specs).toHaveLength(2);
  });

  it('числа принимаются строками: форма отдаёт значения полей текстом', () => {
    const parsed = productInputSchema.parse({ ...VALID, areaMax: '27', priceNum: '38500' });

    expect(parsed.areaMax).toBe(27);
    expect(parsed.priceNum).toBe(38_500);
  });

  it('без цены и с отрицательной ценой карточка не сохраняется', () => {
    expect(productInputSchema.safeParse({ ...VALID, priceNum: undefined }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...VALID, priceNum: -100 }).success).toBe(false);
  });

  it('характеристика без значения не принимается', () => {
    const result = productInputSchema.safeParse({ ...VALID, specs: [{ k: 'Площадь', v: '' }] });

    expect(result.success).toBe(false);
  });

  it('незнакомое поле — это опечатка формы, а не повод молча его потерять', () => {
    expect(productInputSchema.safeParse({ ...VALID, discount: 15 }).success).toBe(false);
  });

  /** 🔴 Скидку задаёт отдельная ручка: двух мест, где рождается цена, быть не должно. */
  it('конечную цену через карточку задать нельзя', () => {
    expect(productInputSchema.safeParse({ ...VALID, salePrice: 30_000 }).success).toBe(false);
  });

  it('тексты ошибок русские: их читает владелец, а не разработчик', () => {
    const result = productInputSchema.safeParse({ ...VALID, badge: '' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).not.toMatch(/[A-Za-z]/);
  });
});

describe('период скидки', () => {
  it('начало и конец периода считаются по времени Тулы', () => {
    const parsed = saleInputSchema.parse({
      salePrice: 34_900,
      saleFrom: '2026-09-01',
      saleTo: '2026-10-31',
    });

    expect(parsed.saleFrom?.toISOString()).toBe('2026-08-31T21:00:00.000Z');
    // конец дня, иначе скидка пропадёт утром последнего дня
    expect(parsed.saleTo?.toISOString()).toBe('2026-10-31T20:59:59.999Z');
  });

  it('пустая граница означает «без ограничения»', () => {
    const parsed = saleInputSchema.parse({ salePrice: 34_900, saleFrom: '', saleTo: null });

    expect(parsed.saleFrom).toBeNull();
    expect(parsed.saleTo).toBeNull();
  });

  it('невнятная дата отклоняется по-русски', () => {
    const result = saleInputSchema.safeParse({ salePrice: 1, saleTo: 'тридцать первое' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).not.toMatch(/[A-Za-z]/);
  });

  /**
   * 🔴 Перевёрнутый период сервер принимал молча, а скидка после этого не
   * включалась никогда: `withinPeriod` при `from > to` не пропускает ни одного
   * мгновения. В панели скидка значилась заданной, на витрине её не было.
   */
  it('🔴 конец акции раньше начала — отказ, а не молчаливое сохранение', () => {
    const result = saleInputSchema.safeParse({
      salePrice: 34_900,
      saleFrom: '2026-10-31',
      saleTo: '2026-09-01',
    });

    expect(result.success).toBe(false);
    // ошибка вешается на «до»: это поле человек правит последним
    expect(result.error?.issues[0]?.path).toEqual(['saleTo']);
    expect(result.error?.issues[0]?.message).toBe('Конец акции раньше её начала');
  });

  it('акция на один день проходит: начало и конец в одну дату — не перевёрнутый период', () => {
    const result = saleInputSchema.safeParse({
      salePrice: 34_900,
      saleFrom: '2026-09-01',
      saleTo: '2026-09-01',
    });

    expect(result.success).toBe(true);
  });

  it('одна граница без второй сравнивать не с чем — проходит', () => {
    expect(saleInputSchema.safeParse({ salePrice: 1, saleFrom: '2026-10-31' }).success).toBe(true);
    expect(saleInputSchema.safeParse({ salePrice: 1, saleTo: '2026-09-01' }).success).toBe(true);
  });

  /** 🔴 Инвариант 14: процент вычисляется из цен, задать его нельзя. */
  it('процент скидки в теле запроса не принимается', () => {
    expect(saleInputSchema.safeParse({ salePrice: 34_900, discountPercent: 15 }).success).toBe(
      false,
    );
  });

  it('salePrice: null снимает скидку', () => {
    expect(saleInputSchema.parse({ salePrice: null }).salePrice).toBeNull();
  });
});

describe('правка фотографии', () => {
  it('меняются только подпись, признак главной и порядок', () => {
    expect(photoUpdateSchema.parse({ alt: 'Внешний блок', isMain: true }).isMain).toBe(true);
    expect(photoUpdateSchema.safeParse({ url: '/api/media/чужой.jpg' }).success).toBe(false);
  });
});
