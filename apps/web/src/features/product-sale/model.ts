/**
 * Скидка на модель — контракт docs/API.md §3, ADR-011.
 *
 * 🔴 Задаётся конечной ценой и периодом. Процента в форме нет и быть не
 * может: он вычисляется из цен. Поле «скидка 40%» — это возможность её
 * нарисовать (инвариант 14).
 */
export type SaleFormValues = {
  /** Пусто — скидки нет. Отправка пустого значения снимает скидку. */
  readonly salePrice: string;
  /** Границы — дни: `2026-09-01`. Пустая граница означает «без ограничения». */
  readonly saleFrom: string;
  readonly saleTo: string;
  readonly saleLabel: string;
};

export type SaleStatus = 'idle' | 'sending' | 'success' | 'error';

export type SaleResult = { readonly ok: boolean; readonly message?: string };

export type SaleSave = (values: SaleFormValues) => Promise<SaleResult>;

export const emptySaleValues: SaleFormValues = {
  salePrice: '',
  saleFrom: '',
  saleTo: '',
  saleLabel: '',
};
