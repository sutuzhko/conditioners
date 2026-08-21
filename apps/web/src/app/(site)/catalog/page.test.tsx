import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatMoney } from '@/shared/lib/format';
import { catalogFixture, plainProduct } from '@/widgets/catalog/fixtures';
import { priceRows, rates } from '@/widgets/pricing/fixtures';

import { emptySettingsFixture, settingsFixture } from '../_lib/fixtures';

/**
 * Страница каталога: один `h1`, метаданные из данных, живучесть на пустой базе.
 * Репозитории подменяются целиком — Postgres тесту страницы не нужен.
 */
const { state } = vi.hoisted(() => ({
  state: {
    products: [] as unknown[],
    prices: [] as unknown[],
    extras: null as unknown,
    settings: {} as Record<string, unknown>,
  },
}));

vi.mock('@/shared/config/env', () => ({ env: { SITE_URL: 'https://tulaklimat.test' } }));
vi.mock('@/server/repo/products', () => ({ listVisible: vi.fn(async () => state.products) }));
vi.mock('@/server/repo/prices', () => ({
  getPrices: vi.fn(async () => ({ prices: state.prices, extras: state.extras })),
}));
vi.mock('@/server/repo/settings', () => ({ getAll: vi.fn(async () => state.settings) }));

const { default: KatalogPage, generateMetadata } = await import('./page');

/**
 * Модель с бессрочной скидкой: по ней проверяется, что в сниппет уходит
 * действующая цена, а не зачёркнутая (docs/SEO.md §3). Период не задан
 * намеренно — тест не должен позеленеть или покраснеть от смены даты.
 */
const permanentSaleProduct = {
  ...plainProduct,
  id: 'split-sale',
  slug: 'split-sale',
  priceNum: 40_000,
  salePrice: 30_000,
  saleFrom: null,
  saleTo: null,
};

beforeEach(() => {
  state.products = [...catalogFixture];
  state.prices = [...priceRows];
  state.extras = rates;
  state.settings = settingsFixture;
});

describe('страница каталога', () => {
  it('заголовок первого уровня на странице ровно один', async () => {
    render(await KatalogPage());

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Купить кондиционер в Туле');
  });

  it('город в заголовке берётся из настроек, а не из вёрстки', async () => {
    state.settings = { ...settingsFixture, address: { country: 'RU', city: 'Новомосковск' } };
    render(await KatalogPage());

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Купить кондиционер в Новомосковске',
    );
  });

  it('метаданные и каноникал собираются из данных', async () => {
    state.products = [plainProduct, permanentSaleProduct];

    const meta = await generateMetadata();

    expect(meta.title).toBe('Купить кондиционер в Туле — каталог с ценами и установкой');
    // в сниппет уходит действующая цена со скидкой, а не зачёркнутая
    expect(meta.description).toContain(`от ${formatMoney(30_000)}`);
    expect(meta.alternates?.canonical).toBe('https://tulaklimat.test/catalog');
  });

  it('на пустой базе страница остаётся целой и не выдумывает цен', async () => {
    state.products = [];
    state.prices = [];
    state.extras = null;
    state.settings = emptySettingsFixture;

    const meta = await generateMetadata();
    render(await KatalogPage());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Купить кондиционер');
    expect(meta.title).toBe('Купить кондиционер — каталог с ценами и установкой');
    expect(meta.description).not.toContain('от ');
  });
});
