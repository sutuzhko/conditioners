import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { emptySettingsFixture, settingsFixture } from '../_lib/fixtures';

/**
 * Политика: один `h1`, оператор и реквизиты — только из настроек. Пустые
 * реквизиты заменяются объяснением, а не выдуманным ИНН (инвариант 8).
 */
const { state } = vi.hoisted(() => ({
  state: { settings: {} as Record<string, unknown> },
}));

vi.mock('@/shared/config/env', () => ({ env: { SITE_URL: 'https://tulaklimat.test' } }));
vi.mock('@/server/repo/settings', () => ({ getAll: vi.fn(async () => state.settings) }));

const { default: PolicyPage, generateMetadata } = await import('./page');

beforeEach(() => {
  state.settings = settingsFixture;
});

describe('политика обработки персональных данных', () => {
  it('заголовок первого уровня на странице ровно один', async () => {
    render(await PolicyPage());

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Политика обработки персональных данных');
  });

  it('оператор и реквизиты подставляются из настроек', async () => {
    render(await PolicyPage());

    expect(screen.getAllByText(/ИП Тестов Тест Тестович/).length).toBeGreaterThan(0);
    expect(screen.getByText('710703123450')).toBeInTheDocument();
    // у предпринимателя номер называется ОГРНИП, а не ОГРН
    expect(screen.getByText('ОГРНИП')).toBeInTheDocument();
    expect(screen.getByText('Орган регистрации')).toBeInTheDocument();
  });

  /**
   * 🔴 Оператор персональных данных в политике и продавец в футере — одно
   * лицо, и состав реквизитов у них общий (PROJECT §5.3). Адрес регистрации
   * предпринимателя не публикуется ни там, ни здесь: это домашний адрес.
   */
  it('адрес регистрации предпринимателя в политику не попадает', async () => {
    render(await PolicyPage());

    expect(screen.queryByText('300000, Тула, проспект Ленина, 1')).not.toBeInTheDocument();
  });

  it('локализация баз данных в России названа прямо — этого требует 152-ФЗ', async () => {
    render(await PolicyPage());

    expect(screen.getByText(/находятся на территории Российской Федерации/)).toBeInTheDocument();
  });

  it('без реквизитов страница объясняет пустоту, а не выдумывает их', async () => {
    state.settings = emptySettingsFixture;

    const meta = await generateMetadata();
    render(await PolicyPage());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText(/Реквизиты оператора заполняются в админ-панели/)).toBeInTheDocument();
    expect(meta.title).toBe('Политика обработки персональных данных');
    expect(meta.alternates?.canonical).toBe('https://tulaklimat.test/privacy');
  });
});
