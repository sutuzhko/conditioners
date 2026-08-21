/** Данные для историй и тестов формы цен. */
import type { PricesFormValues, PricesSave, PricesSaveResult } from './model';

export const filledPrices: PricesFormValues = {
  prices: [
    { cls: '07', power: '2.0 кВт', area: 'до 20 м²', price: '5500', term: '3–4 часа' },
    { cls: '09', power: '2.6 кВт', area: 'до 27 м²', price: '6000', term: '3–4 часа' },
  ],
  extras: {
    trassaPerM: '700',
    shtrobPerM: '800',
    heightWorks: '2000',
    trassaIncludedM: '3',
    heightFloorFrom: '10',
  },
};

/** Ставки не заданы: подставлять вместо них нули значит выдумать цену. */
export const emptyExtras: PricesFormValues = {
  ...filledPrices,
  extras: {
    trassaPerM: '',
    shtrobPerM: '',
    heightWorks: '',
    trassaIncludedM: '',
    heightFloorFrom: '',
  },
};

export const emptyPrices: PricesFormValues = { ...filledPrices, prices: [] };

export const acceptingSave: PricesSave = async () => ({ ok: true });

export const failingSave: PricesSave = async () => ({
  ok: false,
  message: 'Нужна хотя бы одна строка прайса',
});

export const pendingSave: PricesSave = () => new Promise<PricesSaveResult>(() => {});
