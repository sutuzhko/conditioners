import { describe, expect, it } from 'vitest';

import { saleInputSchema } from './sale';

/**
 * Схема скидки — граница, за которой цена становится обещанием покупателю
 * (ADR-011, инвариант 14). Ошибка здесь стоит не падения страницы, а
 * нарисованной скидки или скидки, которая не включится никогда.
 *
 * Проверяется именно схема, а не форма: правило живёт на сервере, и обойти
 * его можно любым запросом мимо панели.
 */
describe('saleInputSchema', () => {
  const base = { salePrice: 29_900 };

  it('скидка задаётся конечной ценой, а период необязателен', () => {
    const parsed = saleInputSchema.parse(base);

    expect(parsed.salePrice).toBe(29_900);
    expect(parsed.saleFrom).toBeUndefined();
    expect(parsed.saleTo).toBeUndefined();
  });

  it('null снимает скидку', () => {
    expect(saleInputSchema.parse({ salePrice: null }).salePrice).toBeNull();
  });

  /**
   * 🔴 Главное правило этого файла. Перевёрнутый период сервер принимал молча,
   * и скидка после него не включалась никогда: `withinPeriod` при `from > to`
   * не пропускает ни одного мгновения. На витрине товар оставался без скидки,
   * а в панели она значилась заданной — владелец узнавал об этом от
   * покупателя, а не от формы.
   */
  it('🔴 перевёрнутый период не принимается', () => {
    const parsed = saleInputSchema.safeParse({
      ...base,
      saleFrom: '2026-10-31',
      saleTo: '2026-10-01',
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const issue = parsed.error.issues[0];
    // ошибка адресована полю «до»: его человек правит последним
    expect(issue?.path).toEqual(['saleTo']);
    expect(issue?.message).toBe('Конец акции раньше её начала');
  });

  it('период в один день перевёрнутым не считается', () => {
    /* Начало берётся полуночью, конец — концом того же дня: акция «только
       31 октября» законна, и отказать ей значило бы запретить однодневную
       распродажу. */
    const parsed = saleInputSchema.safeParse({
      ...base,
      saleFrom: '2026-10-31',
      saleTo: '2026-10-31',
    });

    expect(parsed.success).toBe(true);
  });

  it('одна открытая граница сравнивать не с чем — период принимается', () => {
    expect(saleInputSchema.safeParse({ ...base, saleFrom: '2026-10-31' }).success).toBe(true);
    expect(saleInputSchema.safeParse({ ...base, saleTo: '2026-10-01' }).success).toBe(true);
    expect(saleInputSchema.safeParse({ ...base, saleFrom: '', saleTo: '' }).success).toBe(true);
  });

  /**
   * 🔴 Процента в схеме нет и быть не может: прислать «скидку 40%» — значит
   * получить возможность её нарисовать (инвариант 14). `.strict()` — не
   * стилистика, а этот запрет.
   */
  it('🔴 процент скидки телом запроса не задаётся', () => {
    const parsed = saleInputSchema.safeParse({ ...base, discountPercent: 40 });

    expect(parsed.success).toBe(false);
  });

  it('ноль и отрицательная цена скидкой не являются', () => {
    expect(saleInputSchema.safeParse({ salePrice: 0 }).success).toBe(false);
    expect(saleInputSchema.safeParse({ salePrice: -1 }).success).toBe(false);
  });

  it('дробная цена скидки не принимается: цены в рублях целые', () => {
    expect(saleInputSchema.safeParse({ salePrice: 29_900.5 }).success).toBe(false);
  });

  it('неразобранная дата отказывает, а не превращается в «сейчас»', () => {
    const parsed = saleInputSchema.safeParse({ ...base, saleTo: '31 октября' });

    expect(parsed.success).toBe(false);
  });
});
