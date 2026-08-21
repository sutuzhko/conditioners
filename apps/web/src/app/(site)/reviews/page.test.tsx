import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { emptySettingsFixture, settingsFixture } from '../_lib/fixtures';

/**
 * Страница отзывов: один `h1`, город в заголовке для выдачи — из настроек,
 * пустой раздел — рабочее состояние (инвариант 10).
 */
const { state } = vi.hoisted(() => ({
  state: { reviews: [] as unknown[], settings: {} as Record<string, unknown> },
}));

vi.mock('@/shared/config/env', () => ({ env: { SITE_URL: 'https://tulaklimat.test' } }));
vi.mock('@/server/repo/reviews', () => ({ listApproved: vi.fn(async () => state.reviews) }));
vi.mock('@/server/repo/settings', () => ({ getAll: vi.fn(async () => state.settings) }));

const { default: OtzyvyPage, generateMetadata } = await import('./page');

const approvedReview = {
  id: 'r1',
  name: 'Мария',
  district: 'Центральный',
  rating: 5,
  text: 'Поставили за день, смета совпала с расчётом по телефону.',
  photo: null,
  status: 'approved',
  createdAt: '2026-07-14T09:00:00.000Z',
};

beforeEach(() => {
  state.reviews = [approvedReview];
  state.settings = settingsFixture;
});

describe('страница отзывов', () => {
  it('заголовок первого уровня на странице ровно один', async () => {
    render(await OtzyvyPage());

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Отзывы клиентов');
  });

  it('одобренный отзыв приходит в разметке страницы', async () => {
    render(await OtzyvyPage());

    expect(screen.getByText(/смета совпала с расчётом/)).toBeInTheDocument();
  });

  it('метаданные и каноникал собираются из данных', async () => {
    const meta = await generateMetadata();

    expect(meta.title).toBe('Отзывы об установке кондиционеров в Туле');
    expect(meta.alternates?.canonical).toBe('https://tulaklimat.test/reviews');
  });

  it('пустой раздел — рабочее состояние, а не поломка', async () => {
    state.reviews = [];
    state.settings = emptySettingsFixture;

    const meta = await generateMetadata();
    render(await OtzyvyPage());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(meta.title).toBe('Отзывы об установке кондиционеров');
  });
});
