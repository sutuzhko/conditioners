/**
 * Прайс монтажа и ставки допуслуг — контракт docs/API.md §4.
 *
 * Значения строками: приводит их схема на сервере. 🔴 Эти цифры кормят
 * калькулятор, который видит посетитель, — второе место, где они рождаются,
 * означало бы, что смета на сайте и смета по телефону разойдутся.
 */
export type PriceRowValues = {
  readonly cls: string;
  readonly power: string;
  readonly area: string;
  readonly price: string;
  readonly term: string;
};

export type ExtrasValues = {
  readonly trassaPerM: string;
  readonly shtrobPerM: string;
  readonly heightWorks: string;
  readonly trassaIncludedM: string;
  readonly heightFloorFrom: string;
};

export type PricesFormValues = {
  readonly prices: readonly PriceRowValues[];
  readonly extras: ExtrasValues;
};

export type PricesStatus = 'idle' | 'sending' | 'success' | 'error';

export type PricesSaveResult = {
  readonly ok: boolean;
  readonly message?: string;
};

export type PricesSave = (values: PricesFormValues) => Promise<PricesSaveResult>;

export const emptyPriceRow: PriceRowValues = {
  cls: '',
  power: '',
  area: '',
  price: '',
  term: '',
};
