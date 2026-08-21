import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatMoney } from '@/shared/lib/format';
import { priceRows, rates } from '@/widgets/pricing/fixtures';

import { emptySettingsFixture, settingsFixture } from '../_lib/fixtures';

/** Страница установки: заголовок с ценой из прайса, один `h1`, живучесть. */
const { state } = vi.hoisted(() => ({
  state: {
    prices: [] as unknown[],
    extras: null as unknown,
    settings: {} as Record<string, unknown>,
  },
}));

vi.mock('@/shared/config/env', () => ({ env: { SITE_URL: 'https://tulaklimat.test' } }));
vi.mock('@/server/repo/prices', () => ({
  getPrices: vi.fn(async () => ({ prices: state.prices, extras: state.extras })),
}));
vi.mock('@/server/repo/settings', () => ({ getAll: vi.fn(async () => state.settings) }));

const { default: UstanovkaPage, generateMetadata } = await import('./page');

const CHEAPEST = 5_500;

beforeEach(() => {
  state.prices = [...priceRows];
  state.extras = rates;
  state.settings = settingsFixture;
});

describe('страница установки', () => {
  it('заголовок первого уровня на странице ровно один', async () => {
    render(await UstanovkaPage());

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Установка кондиционеров в Туле');
  });

  it('цена в заголовке для выдачи приходит из прайса', async () => {
    const meta = await generateMetadata();

    expect(meta.title).toBe(
      `Установка кондиционеров в Туле — монтаж под ключ от ${formatMoney(CHEAPEST)}`,
    );
    expect(meta.alternates?.canonical).toBe('https://tulaklimat.test/installation');
  });

  it('срок гарантии в опорных цифрах — из настроек', async () => {
    render(await UstanovkaPage());

    expect(screen.getAllByText('3 года').length).toBeGreaterThan(0);
  });

  it('без прайса и настроек заголовок обходится без цифр', async () => {
    state.prices = [];
    state.extras = null;
    state.settings = emptySettingsFixture;

    const meta = await generateMetadata();
    render(await UstanovkaPage());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(meta.title).toBe('Установка кондиционеров — монтаж под ключ за один выезд');
  });
});
