import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { emptySettingsFixture, settingsFixture } from '../_lib/fixtures';

/** Страница сервиса: один `h1`, регион выезда из настроек, живучесть на пустых. */
const { state } = vi.hoisted(() => ({
  state: { settings: {} as Record<string, unknown> },
}));

vi.mock('@/shared/config/env', () => ({ env: { SITE_URL: 'https://tulaklimat.test' } }));
vi.mock('@/server/repo/settings', () => ({ getAll: vi.fn(async () => state.settings) }));

const { default: RemontPage, generateMetadata } = await import('./page');

beforeEach(() => {
  state.settings = settingsFixture;
});

describe('страница ремонта и обслуживания', () => {
  it('заголовок первого уровня на странице ровно один', async () => {
    render(await RemontPage());

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Ремонт и обслуживание кондиционеров в Туле');
  });

  it('метаданные и каноникал собираются из данных', async () => {
    const meta = await generateMetadata();

    expect(meta.title).toBe('Ремонт и обслуживание кондиционеров в Туле — выезд мастера');
    expect(meta.description).toContain('в Туле');
    expect(meta.alternates?.canonical).toBe('https://tulaklimat.test/service');
  });

  it('регион выезда показывается из настроек', async () => {
    render(await RemontPage());

    expect(screen.getAllByText('Тула и Тульская область').length).toBeGreaterThan(0);
  });

  it('на пустых настройках страница остаётся целой', async () => {
    state.settings = emptySettingsFixture;

    const meta = await generateMetadata();
    render(await RemontPage());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(meta.title).toBe('Ремонт и обслуживание кондиционеров — выезд мастера');
  });
});
