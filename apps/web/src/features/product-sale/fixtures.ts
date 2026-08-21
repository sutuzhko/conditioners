/** Данные для историй и тестов формы скидки. */
import type { SaleFormValues, SaleResult, SaleSave } from './model';

/** Обычная цена модели, от которой считается процент. */
export const priceFixture = 38500;

/** «Сегодня» в историях и тестах фиксировано: календарь не должен их ронять. */
export const nowFixture = new Date('2026-09-15T12:00:00+03:00');

export const activeSale: SaleFormValues = {
  salePrice: '34900',
  saleFrom: '2026-09-01',
  saleTo: '2026-10-31',
  saleLabel: 'Осенняя цена',
};

/** Период уже закончился — скидка снимается сама, без участия владельца. */
export const expiredSale: SaleFormValues = {
  salePrice: '34900',
  saleFrom: '2026-06-01',
  saleTo: '2026-06-30',
  saleLabel: '',
};

/** Цена «со скидкой» не ниже обычной: рисовать перечёркнутую цену нечем. */
export const higherThanBase: SaleFormValues = {
  salePrice: '41000',
  saleFrom: '',
  saleTo: '',
  saleLabel: '',
};

export const acceptingSave: SaleSave = async () => ({ ok: true });

export const failingSave: SaleSave = async () => ({
  ok: false,
  message: 'Сервер не принял изменения. Попробуйте ещё раз',
});

export const pendingSave: SaleSave = () => new Promise<SaleResult>(() => {});
