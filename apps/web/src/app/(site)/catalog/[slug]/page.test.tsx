import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const { testEnv, repoMock, settingsMock, notFoundMock } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-model',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'off',
  },
  repoMock: { listVisible: vi.fn(), findVisibleBySlug: vi.fn() },
  settingsMock: { getAll: vi.fn() },
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/repo/products', () => repoMock);
vi.mock('@/server/repo/settings', () => settingsMock);
vi.mock('next/navigation', () => ({ notFound: notFoundMock }));

const { default: ProductPage, generateMetadata, generateStaticParams } = await import('./page');
const { formatMoney } = await import('@/shared/lib/format');

const PRODUCT = {
  id: 'p1',
  slug: 'split-09',
  badge: '09',
  name: 'Сплит-система 09',
  brand: 'Пример',
  sku: 'PRM-09',
  areaMax: 25,
  tag: 'тихая, для спальни',
  priceNum: 38_500,
  salePrice: 33_900,
  saleFrom: null,
  saleTo: '2026-10-31',
  saleLabel: null,
  link: null,
  visible: true,
  featured: true,
  sort: 0,
  seoTitle: null,
  seoDescription: null,
  photos: [],
  specs: [{ k: 'Уровень шума', v: '19 дБ' }],
  currentPrice: 33_900,
  oldPrice: 38_500,
  discountPercent: 12,
  saleActive: true,
};

const PARAMS = Promise.resolve({ slug: 'split-09' });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // внутри периода скидки: цена на странице и в разметке должна быть со скидкой
  vi.setSystemTime(new Date('2026-08-20T09:00:00.000Z'));
  settingsMock.getAll.mockResolvedValue({
    company: { name: 'ТулаКлимат' },
    address: { city: 'Тула' },
    seo: { titleSuffix: 'ТулаКлимат' },
  });
  repoMock.findVisibleBySlug.mockResolvedValue(PRODUCT);
  repoMock.listVisible.mockResolvedValue([PRODUCT]);
});

describe('Страница модели', () => {
  it('🔴 отдаётся с сервера: название, цена и характеристики уже в разметке', async () => {
    render(await ProductPage({ params: PARAMS }));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Сплит-система 09');
    expect(screen.getByText('33 900 ₽')).toBeInTheDocument();
    expect(screen.getByText('Уровень шума')).toBeInTheDocument();
  });

  it('хлебные крошки ведут от главной через каталог к модели', async () => {
    render(await ProductPage({ params: PARAMS }));

    const trail = within(screen.getByRole('navigation', { name: 'Хлебные крошки' }));
    expect(trail.getByRole('link', { name: 'Главная' })).toHaveAttribute('href', '/');
    expect(trail.getByRole('link', { name: 'Каталог' })).toHaveAttribute('href', '/catalog');
    expect(trail.getByText('Сплит-система 09')).toHaveAttribute('aria-current', 'page');
  });

  it('🔴 разметка Product несёт свой адрес и действующую цену (инвариант 9)', async () => {
    const { container } = render(await ProductPage({ params: PARAMS }));

    const script = container.querySelector('script[type="application/ld+json"]');
    const graph = JSON.parse(script?.textContent ?? '{}')['@graph'];
    const product = Array.isArray(graph) ? graph[0] : null;

    expect(product?.['@type']).toBe('Product');
    expect(product?.url).toBe('https://example.test/catalog/split-09');
    expect(product?.offers?.url).toBe('https://example.test/catalog/split-09');
    expect(product?.offers?.price).toBe(33_900);
    expect(product?.offers?.priceValidUntil).toBe('2026-10-31');
  });

  it('🔴 снятая с продажи модель отдаёт 404, а не карточку товара, которого нет', async () => {
    repoMock.findVisibleBySlug.mockResolvedValue(null);

    await expect(ProductPage({ params: PARAMS })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFoundMock).toHaveBeenCalled();
  });

  it('статические адреса строятся по моделям в продаже', async () => {
    expect(await generateStaticParams()).toEqual([{ slug: 'split-09' }]);
  });
});

describe('Страница модели — метаданные', () => {
  it('заголовок, описание и каноникал собираются из данных', async () => {
    const meta = await generateMetadata({ params: PARAMS });

    expect(meta.title).toBe('Сплит-система 09 — купить в Туле с установкой | ТулаКлимат');
    expect(meta.alternates?.canonical).toBe('https://example.test/catalog/split-09');
    expect(meta.description).toContain('до 25 м²');
    // цена в описании — действующая, та же и в том же написании, что на странице
    expect(meta.description).toContain(formatMoney(33_900));
  });

  it('🔴 свой заголовок владельца главнее шаблона и бренд к нему не дописывается', async () => {
    repoMock.findVisibleBySlug.mockResolvedValue({
      ...PRODUCT,
      seoTitle: 'Сплит-система 09 за 33 900 ₽',
      seoDescription: 'Своё описание владельца',
    });

    const meta = await generateMetadata({ params: PARAMS });

    expect(meta.title).toBe('Сплит-система 09 за 33 900 ₽');
    expect(meta.description).toBe('Своё описание владельца');
  });

  it('неизвестному адресу описывать нечего', async () => {
    repoMock.findVisibleBySlug.mockResolvedValue(null);

    expect(await generateMetadata({ params: PARAMS })).toEqual({});
  });
});
