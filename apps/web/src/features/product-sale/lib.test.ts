import { afterEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';

import { productSaleContent as texts } from './content';
import { activeSale, expiredSale, higherThanBase, nowFixture, priceFixture } from './fixtures';
import { explainInactive, patchSale, previewSale, toSaleBody } from './lib';
import { emptySaleValues } from './model';

describe('Скидка — предпросмотр', () => {
  it('процент вычисляется из цен, а не задаётся', () => {
    const preview = previewSale(activeSale, priceFixture, nowFixture);

    expect(preview.saleActive).toBe(true);
    expect(preview.currentPrice).toBe(34900);
    expect(preview.oldPrice).toBe(priceFixture);
    // 1 − 34900/38500 = 9,35 % → 9
    expect(preview.discountPercent).toBe(9);
  });

  it('закончившийся период снимает скидку сам', () => {
    expect(previewSale(expiredSale, priceFixture, nowFixture).saleActive).toBe(false);
  });

  it('🔴 цена не ниже обычной скидкой не считается (инвариант 14)', () => {
    const preview = previewSale(higherThanBase, priceFixture, nowFixture);

    expect(preview.saleActive).toBe(false);
    expect(preview.oldPrice).toBeNull();
  });

  it('пустая цена — скидки нет', () => {
    expect(previewSale(emptySaleValues, priceFixture, nowFixture).saleActive).toBe(false);
  });
});

describe('Скидка — почему она не появится', () => {
  it('молчит, когда скидки нет вовсе', () => {
    expect(explainInactive(emptySaleValues, priceFixture)).toBeNull();
  });

  it('предупреждает о цене не ниже обычной', () => {
    expect(explainInactive(higherThanBase, priceFixture)).toBe(texts.priceTooHigh);
  });

  it('предупреждает о перевёрнутом периоде', () => {
    const values = { ...activeSale, saleFrom: '2026-10-01', saleTo: '2026-09-01' };

    expect(explainInactive(values, priceFixture)).toBe(texts.periodBackwards);
  });

  it('на рабочей скидке молчит', () => {
    expect(explainInactive(activeSale, priceFixture)).toBeNull();
  });
});

describe('Скидка — тело запроса', () => {
  it('🔴 процента в теле нет: его нельзя прислать, только вычислить', () => {
    const body = toSaleBody(activeSale);

    expect(body).not.toHaveProperty('discountPercent');
    expect(body).not.toHaveProperty('percent');
  });

  it('пустая цена снимает скидку', () => {
    expect(toSaleBody(emptySaleValues)).toMatchObject({ salePrice: null });
  });

  it('незаданные границы не отправляются — сервер поймёт это как «без ограничения»', () => {
    const body = toSaleBody({ ...activeSale, saleFrom: '', saleTo: '' });

    expect(body).not.toHaveProperty('saleFrom');
    expect(body).not.toHaveProperty('saleTo');
  });

  it('пустая подпись уходит как null, а не пустой строкой', () => {
    expect(toSaleBody({ ...activeSale, saleLabel: '   ' })).toMatchObject({ saleLabel: null });
  });
});

describe('Скидка — отправка', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('200 — сохранено', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    );

    await expect(patchSale('m1', activeSale)).resolves.toEqual({ ok: true });
  });

  it('сообщение сервера доносится как есть', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: { code: 'validation_error', message: 'Проверьте даты' } }),
            { status: 422 },
          ),
      ),
    );

    await expect(patchSale('m1', activeSale)).resolves.toEqual({
      ok: false,
      message: 'Проверьте даты',
    });
  });

  it('истёкшая сессия объясняется общим текстом панели: своего у фичи нет', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 })),
    );

    await expect(patchSale('m1', activeSale)).resolves.toEqual({
      ok: false,
      message: ADMIN_API_TEXTS.session,
    });
  });

  it('упавшая сеть сообщает, что изменения не сохранены', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    await expect(patchSale('m1', activeSale)).resolves.toEqual({
      ok: false,
      message: texts.networkError,
    });
  });
});
