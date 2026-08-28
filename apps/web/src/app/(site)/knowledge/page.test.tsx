import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const { testEnv, repoMock, settingsMock } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-knowledge',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'off',
  },
  repoMock: { findPublishedBySlug: vi.fn(), listPublished: vi.fn() },
  settingsMock: { getAll: vi.fn() },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/repo/articles', () => repoMock);
vi.mock('@/server/repo/settings', () => settingsMock);

const { default: BazaZnaniyPage, generateMetadata } = await import('./page');
const { articleContent } = await import('@/widgets/article/content');

const CHOICE = {
  id: 'a1',
  slug: 'kak-vybrat-kondicioner',
  title: 'Как выбрать кондиционер для квартиры',
  category: 'Выбор',
  date: '2026-06-14T00:00:00.000Z',
  minutes: 6,
  cover: null,
  excerpt: 'Мощность по площади, поправки и инвертор.',
  published: true,
  updatedAt: '2026-06-20T00:00:00.000Z',
};

const CARE = {
  id: 'a2',
  slug: 'uhod-za-kondicionerom',
  title: 'Уход за кондиционером',
  category: 'Уход',
  date: '2026-05-12T00:00:00.000Z',
  minutes: 5,
  cover: null,
  excerpt: 'Чистка фильтров и ежегодное ТО.',
  published: true,
  updatedAt: '2026-05-12T00:00:00.000Z',
};

const ARTICLES = [CHOICE, CARE];

beforeEach(() => {
  vi.clearAllMocks();
  settingsMock.getAll.mockResolvedValue({
    company: { name: 'ТулаКлимат' },
    address: { city: 'Тула' },
    seo: { titleSuffix: 'ТулаКлимат' },
  });
});

const noParams = Promise.resolve({});

describe('Листинг Базы знаний', () => {
  it('🔴 пустой раздел не ломает страницу', async () => {
    repoMock.listPublished.mockResolvedValue([]);

    render(await BazaZnaniyPage({ searchParams: noParams }));

    expect(
      screen.getByRole('heading', { level: 1, name: articleContent.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(articleContent.emptyTitle)).toBeInTheDocument();
  });

  it('🔴 статьи приходят в HTML с сервера, каждая со ссылкой на свою страницу', async () => {
    repoMock.listPublished.mockResolvedValue(ARTICLES);

    render(await BazaZnaniyPage({ searchParams: noParams }));

    const list = screen.getByRole('list', { name: articleContent.listLabel });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('link', { name: CHOICE.title })).toHaveAttribute(
      'href',
      '/knowledge/kak-vybrat-kondicioner',
    );
  });

  it('рубрика из адреса фильтрует список на сервере, без участия скриптов', async () => {
    repoMock.listPublished.mockResolvedValue(ARTICLES);

    render(await BazaZnaniyPage({ searchParams: Promise.resolve({ category: 'uhod' }) }));

    const list = screen.getByRole('list', { name: articleContent.listLabel });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('link', { name: CARE.title })).toBeInTheDocument();
  });

  it('🔴 каноникал листинга не зависит от фильтра — раздел один', async () => {
    const meta = await generateMetadata({ searchParams: Promise.resolve({}) });

    expect(meta.alternates?.canonical).toBe('https://example.test/knowledge');
    expect(meta.description).toContain('в Туле');
  });

  /* 🔴 ADR-152: рубрика — тот же раздел под другим углом. Каноникала мало,
     он рекомендация: отфильтрованный адрес обязан ещё и просить себя не
     индексировать, как это делают фильтры каталога. */
  it('🔴 отфильтрованная рубрика закрыта от индекса, но проходима по ссылкам', async () => {
    const meta = await generateMetadata({
      searchParams: Promise.resolve({ category: 'uhod' }),
    });

    expect(meta.alternates?.canonical).toBe('https://example.test/knowledge');
    expect(meta.robots).toMatchObject({ index: false, follow: true });
  });
});
