import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const { testEnv, settingsMock, productsMock } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-not-found',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'off',
  },
  settingsMock: { getAll: vi.fn(), readiness: vi.fn() },
  productsMock: { listFeatured: vi.fn() },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/repo/settings', () => settingsMock);
vi.mock('@/server/repo/products', () => productsMock);

const { default: NotFound, metadata } = await import('./not-found');
const { NOT_FOUND_CONTENT, NOT_FOUND_ROUTES } = await import('@/shared/seo');

const PHONE = '+7 (4872) 00-00-00';

const PRODUCT = {
  id: 'p1',
  slug: 'split-09',
  badge: 'Хит',
  name: 'Сплит-система 09',
  brand: null,
  sku: null,
  areaMax: 25,
  tag: null,
  priceNum: 32_900,
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
  currentPrice: 32_900,
  oldPrice: null,
  updatedAt: '2026-06-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  settingsMock.getAll.mockResolvedValue({
    company: { name: 'ТулаКлимат', tagline: 'Кондиционеры в Туле' },
    contacts: { phones: [PHONE], email: 'mail@example.test', hours: 'Ежедневно 8:00–20:00' },
    address: { city: 'Тула', street: 'ул. Демонстрационная', building: '1' },
    legal: { form: 'ИП', name: 'Демонстрационный Стенд Демонстрационович', inn: '710000000077' },
    seo: {},
  });
  productsMock.listFeatured.mockResolvedValue([PRODUCT]);
});

describe('Страница 404', () => {
  it('объясняет ошибку одним заголовком первого уровня', async () => {
    render(await NotFound());

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(NOT_FOUND_CONTENT.title);
  });

  it('🔴 остаётся вне индекса, но по ссылкам с неё робот ходит', () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it('уводит в разделы сайта, а не в тупик', async () => {
    render(await NotFound());

    const nav = screen.getByRole('navigation', { name: NOT_FOUND_CONTENT.navTitle });
    for (const route of NOT_FOUND_ROUTES) {
      expect(within(nav).getByRole('link', { name: route.title })).toHaveAttribute(
        'href',
        route.path,
      );
    }
  });

  it('ведёт на главную отдельной кнопкой', async () => {
    render(await NotFound());

    expect(screen.getByRole('link', { name: NOT_FOUND_CONTENT.homeLink })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('политики в списке разделов нет — она тут только мешает', async () => {
    render(await NotFound());

    const nav = screen.getByRole('navigation', { name: NOT_FOUND_CONTENT.navTitle });
    const links = within(nav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(links).not.toContain('/privacy');
  });

  it('🔴 страница вернулась в общий каркас: шапка и подвал на месте', async () => {
    const { container } = render(await NotFound());

    expect(container.querySelector('header')).not.toBeNull();
    expect(container.querySelector('footer')).not.toBeNull();
  });

  it('🔴 телефон приходит из настроек, а не из вёрстки, и ведёт на tel:', async () => {
    render(await NotFound());

    const calls = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('tel:') === true);

    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call).toHaveAttribute('href', 'tel:+74872000000');
    }
  });

  it('🔴 модели приходят из базы: без них блока витрины нет вовсе', async () => {
    render(await NotFound());
    expect(screen.getByRole('link', { name: PRODUCT.name })).toBeInTheDocument();

    productsMock.listFeatured.mockResolvedValue([]);
    const empty = render(await NotFound());
    expect(within(empty.container).queryByText(PRODUCT.name)).toBeNull();
  });
});
