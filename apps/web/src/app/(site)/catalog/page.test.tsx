import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const { testEnv, repoMock, settingsMock } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-catalog',
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

const { default: CatalogPage, generateMetadata } = await import('./page');
const { catalogPageContent } = await import('./content');

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
    specs: [],
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
    sort: 1,
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
  return render(await CatalogPage({ searchParams: Promise.resolve(params) }));
}

function metadata(params: Record<string, string> = {}) {
  return generateMetadata({ searchParams: Promise.resolve(params) });
}

describe('Каталог — страница', () => {
  it('🔴 отдаёт модели с сервера, а не собирает их на клиенте (инвариант 1)', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(catalogPageContent.title);
    expect(screen.getByRole('heading', { name: 'Сплит-система 09' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Сплит-система 07' })).toBeInTheDocument();
  });

  it('🔴 сравнение собирается на сервере: таблица приходит в HTML (инвариант 1)', async () => {
    await renderPage({ compare: 'split-09,split-07' });

    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers).toEqual(['Характеристика', 'Сплит-система 09', 'Сплит-система 07']);
  });

  it('🔴 отмеченная модель остаётся в сравнении, даже когда подбор её отсеял', async () => {
    await renderPage({ class: '07', compare: 'split-09' });

    expect(screen.queryByRole('heading', { name: 'Сплит-система 09' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Сплит-система 09 — убрать из сравнения/ }),
    ).toBeInTheDocument();
  });

  it('фильтр из адреса отрабатывает на сервере', async () => {
    await renderPage({ class: '07' });

    expect(screen.getByRole('heading', { name: 'Сплит-система 07' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Сплит-система 09' })).not.toBeInTheDocument();
  });

  it('хлебные крошки ведут от главной к каталогу', async () => {
    await renderPage();

    const trail = within(screen.getByRole('navigation', { name: 'Хлебные крошки' }));
    expect(trail.getByRole('link', { name: 'Главная' })).toHaveAttribute('href', '/');
    expect(trail.getByText(catalogPageContent.sectionTitle)).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('🔴 разметка списка ссылается на страницы моделей (ADR-109)', async () => {
    const { container } = await renderPage();

    const script = container.querySelector('script[type="application/ld+json"]');
    const graph = JSON.parse(script?.textContent ?? '{}')['@graph'];
    const list = Array.isArray(graph) ? graph[0] : null;

    expect(list?.['@type']).toBe('ItemList');
    expect(list?.itemListElement?.[0]?.url).toBe('https://example.test/catalog/split-09');
    expect(list?.itemListElement?.[0]?.item?.offers?.url).toBe(
      'https://example.test/catalog/split-09',
    );
  });

  it('🔴 цена в разметке — та же, что видна на карточке (инвариант 9)', async () => {
    const { container } = await renderPage();

    const script = container.querySelector('script[type="application/ld+json"]');
    const graph = JSON.parse(script?.textContent ?? '{}')['@graph'];
    const offer = Array.isArray(graph) ? graph[0]?.itemListElement?.[0]?.item?.offers : null;

    expect(offer?.price).toBe(38_500);
    expect(screen.getAllByText('38 500 ₽').length).toBeGreaterThan(0);
  });
});

describe('Каталог — канонизация (ADR-109)', () => {
  it('чистый адрес индексируется и самоканоничен', async () => {
    const meta = await metadata();

    expect(meta.alternates?.canonical).toBe('https://example.test/catalog');
    expect(meta.robots).toBeUndefined();
  });

  it('🔴 фильтр закрыт от индекса, но робот идёт по ссылкам дальше', async () => {
    const meta = await metadata({ class: '09' });

    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe('https://example.test/catalog');
  });

  it('🔴 сортировка — то же самое: это тот же каталог под другим углом', async () => {
    const meta = await metadata({ sort: 'price-asc' });

    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe('https://example.test/catalog');
  });

  it('🔴 `?compare=` — состояние интерфейса, а не страница (ADR-109)', async () => {
    const meta = await metadata({ compare: 'split-09,split-07' });

    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe('https://example.test/catalog');
  });

  it('🔴 страница разбивки индексируется и каноничная — она сама', async () => {
    repoMock.listVisible.mockResolvedValue(
      Array.from({ length: 20 }, (_, index) =>
        model({ id: `p${index}`, slug: `split-${index}`, sort: index }),
      ),
    );

    const meta = await metadata({ page: '2' });

    expect(meta.robots).toBeUndefined();
    expect(meta.alternates?.canonical).toBe('https://example.test/catalog?page=2');
  });

  it('номер за пределами списка каноникалит на реально показанную страницу', async () => {
    const meta = await metadata({ page: '99' });

    // моделей на одну страницу — значит показана первая, она и каноничная
    expect(meta.alternates?.canonical).toBe('https://example.test/catalog');
  });

  it('заголовок и описание собираются из данных, а не хардкодятся', async () => {
    const meta = await metadata();

    expect(meta.title).toBe(`${catalogPageContent.metaTitle} | ТулаКлимат`);
    expect(meta.description).toContain('в Туле');
  });
});
