import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const { testEnv, repoMock, settingsMock } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-compare',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'off',
  },
  repoMock: { listVisible: vi.fn(), findVisibleBySlug: vi.fn() },
  settingsMock: { getAll: vi.fn() },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/repo/products', () => repoMock);
vi.mock('@/server/repo/settings', () => settingsMock);

const { default: ComparePage, generateMetadata } = await import('./page');
const { comparePageContent } = await import('./content');
const { catalogListText } = await import('@/widgets/catalog');

/** Модель в том виде, в каком её отдаёт репозиторий: даты строками. */
function model(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    slug: 'split-09',
    badge: '09',
    name: 'Сплит-система 09',
    brand: null,
    sku: null,
    areaMax: 25,
    tag: null,
    priceNum: 38_500,
    salePrice: null,
    saleFrom: null,
    saleTo: null,
    saleLabel: null,
    link: null,
    visible: true,
    featured: true,
    sort: 0,
    seoTitle: null,
    seoDescription: null,
    photos: [],
    specs: [{ k: 'Компрессор', v: 'Инверторный', sort: 0 }],
    currentPrice: 38_500,
    oldPrice: null,
    discountPercent: 0,
    saleActive: false,
    ...overrides,
  };
}

const CATALOG = [
  model(),
  model({
    id: 'p2',
    slug: 'split-07',
    badge: '07',
    name: 'Сплит-система 07',
    areaMax: 20,
    priceNum: 34_900,
    currentPrice: 34_900,
    sort: 1,
    specs: [{ k: 'Уровень шума', v: '21 дБ', sort: 0 }],
  }),
];

beforeEach(() => {
  vi.clearAllMocks();
  settingsMock.getAll.mockResolvedValue({
    company: { name: 'ТулаКлимат' },
    address: { city: 'Тула' },
    seo: { titleSuffix: 'ТулаКлимат' },
  });
  repoMock.listVisible.mockResolvedValue(CATALOG);
});

/** Страница — серверный компонент: рисуем то, что она вернула. */
async function renderPage(params: Record<string, string> = {}) {
  return render(await ComparePage({ searchParams: Promise.resolve(params) }));
}

describe('Сравнение — страница (ADR-121)', () => {
  it('🔴 таблица приходит с сервера собранной, а не строится на клиенте (инвариант 1)', async () => {
    await renderPage({ compare: 'split-09,split-07' });

    const [head] = screen.getAllByRole('row');
    if (head === undefined) throw new Error('Шапка таблицы не найдена');

    expect(
      within(head)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Характеристика', 'Сплит-система 09', 'Сплит-система 07']);
  });

  it('🔴 порядок колонок — порядок слагов в адресе: пересланная ссылка открывает то же', async () => {
    await renderPage({ compare: 'split-07,split-09' });

    const [head] = screen.getAllByRole('row');
    if (head === undefined) throw new Error('Шапка таблицы не найдена');

    expect(
      within(head)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Характеристика', 'Сплит-система 07', 'Сплит-система 09']);
  });

  it('🔴 без параметров — приглашение и дорога в каталог, а не пустая страница', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(comparePageContent.title);
    expect(screen.getByText(catalogListText.compareEmptyTitle)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: catalogListText.compareToCatalog })).toHaveAttribute(
      'href',
      '/catalog',
    );
  });

  it('🔴 все слаги мусорные — то же приглашение: адрес правят руками', async () => {
    await renderPage({ compare: 'нет-такой,и-этой-нет' });

    expect(screen.getByText(catalogListText.compareEmptyTitle)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('снятая с продажи модель в сравнение не попадает', async () => {
    repoMock.listVisible.mockResolvedValue([CATALOG[0]]);
    await renderPage({ compare: 'split-09,split-07' });

    // одна колонка — таблицы нет, есть объяснение «отметьте ещё одну»
    expect(screen.getByText(catalogListText.compareAlone)).toBeInTheDocument();
  });

  it('хлебные крошки ведут от главной через каталог к сравнению', async () => {
    await renderPage({ compare: 'split-09,split-07' });

    const trail = within(screen.getByRole('navigation', { name: 'Хлебные крошки' }));
    expect(trail.getByRole('link', { name: 'Главная' })).toHaveAttribute('href', '/');
    expect(trail.getByRole('link', { name: 'Каталог' })).toHaveAttribute('href', '/catalog');
    expect(trail.getByText(comparePageContent.sectionTitle)).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('возврат в каталог несёт с собой подбор и отметки', async () => {
    await renderPage({ class: '09', compare: 'split-09,split-07' });

    expect(screen.getByRole('link', { name: catalogListText.compareBack })).toHaveAttribute(
      'href',
      '/catalog?class=09&compare=split-09%2Csplit-07',
    );
  });
});

describe('Сравнение — канонизация (ADR-121)', () => {
  it('🔴 страница закрыта от индекса, но робот идёт по ссылкам дальше', async () => {
    const meta = await generateMetadata();

    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe('https://example.test/compare');
  });

  it('заголовок и описание собираются из данных, а не хардкодятся', async () => {
    const meta = await generateMetadata();

    expect(meta.title).toBe(`${comparePageContent.metaTitle} | ТулаКлимат`);
    expect(meta.description).toContain('в Туле');
  });
});
