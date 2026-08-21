import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { emptySettingsFixture, settingsFixture } from '../_lib/fixtures';

/**
 * Страница контактов: один `h1`, NAP-данные из настроек и ни одного факта о
 * компании в коде (инвариант 8).
 */
const { state } = vi.hoisted(() => ({
  state: { settings: {} as Record<string, unknown> },
}));

vi.mock('@/shared/config/env', () => ({ env: { SITE_URL: 'https://tulaklimat.test' } }));
vi.mock('@/server/repo/settings', () => ({ getAll: vi.fn(async () => state.settings) }));

const { default: KontaktyPage, generateMetadata } = await import('./page');

beforeEach(() => {
  state.settings = settingsFixture;
});

describe('страница контактов', () => {
  it('заголовок первого уровня на странице ровно один', async () => {
    render(await KontaktyPage());

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Контакты');
  });

  it('название компании в заголовке для выдачи — из настроек', async () => {
    const meta = await generateMetadata();

    expect(meta.title).toBe('Контакты — кондиционеры и монтаж в Туле | Тест-Климат');
    expect(meta.alternates?.canonical).toBe('https://tulaklimat.test/contacts');
  });

  it('адрес и часы работы приходят в разметку из настроек', async () => {
    render(await KontaktyPage());

    // адрес стоит и в строке контактов, и в подписи к карте — источник один
    expect(screen.getAllByText(/Проспект Ленина/).length).toBeGreaterThan(0);
    expect(screen.getByText('Пн–Вс, 8:00–21:00')).toBeInTheDocument();
  });

  it('без настроек заголовок обходится без названия и города', async () => {
    state.settings = emptySettingsFixture;

    const meta = await generateMetadata();
    render(await KontaktyPage());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(meta.title).toBe('Контакты — кондиционеры и монтаж');
  });
});
