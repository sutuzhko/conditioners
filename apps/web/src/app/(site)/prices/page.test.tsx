import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatMoney } from '@/shared/lib/format';
import { priceRows, rates } from '@/widgets/pricing/fixtures';

import { emptySettingsFixture, settingsFixture } from '../_lib/fixtures';

/** Страница цен: один `h1`, цифры в метаданных — из прайса, а не из вёрстки. */
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

const { default: CenyPage, generateMetadata } = await import('./page');

/** Самая дешёвая строка демонстрационного прайса — от неё считается «от N ₽». */
const CHEAPEST = 5_500;

beforeEach(() => {
  state.prices = [...priceRows];
  state.extras = rates;
  state.settings = settingsFixture;
});

describe('страница цен', () => {
  it('заголовок первого уровня на странице ровно один', async () => {
    render(await CenyPage());

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Цены на установку кондиционеров в Туле');
  });

  it('метаданные и каноникал собираются из данных', async () => {
    const meta = await generateMetadata();

    expect(meta.title).toBe('Цены на установку кондиционеров в Туле — прайс и калькулятор');
    expect(meta.description).toContain(`от ${formatMoney(CHEAPEST)}`);
    expect(meta.alternates?.canonical).toBe('https://tulaklimat.test/prices');
  });

  it('минимальная цена на странице и в описании — одна и та же', async () => {
    render(await CenyPage());

    const meta = await generateMetadata();
    expect(meta.description).toContain(formatMoney(CHEAPEST));
    // та же сумма стоит в опорных цифрах вводной части; \s — потому что
    // в отформатированной сумме пробелы неразрывные
    expect(screen.getAllByText(/от\s5\s500\s₽/).length).toBeGreaterThan(0);
  });

  it('без прайса страница остаётся целой и цифр не выдумывает', async () => {
    state.prices = [];
    state.extras = null;
    state.settings = emptySettingsFixture;

    const meta = await generateMetadata();
    render(await CenyPage());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Цены на установку кондиционеров',
    );
    expect(meta.description).not.toContain('₽');
  });
});
