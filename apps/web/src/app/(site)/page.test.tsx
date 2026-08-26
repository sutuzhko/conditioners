import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const { testEnv, productsMock, reviewsMock, articlesMock, pricesMock, settingsMock } = vi.hoisted(
  () => ({
    testEnv: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://user:pass@db:5432/test',
      SITE_URL: 'https://example.test',
      SESSION_SECRET: '0123456789abcdef',
      UPLOADS_DIR: '/tmp/tk-test-uploads-home',
      UPLOAD_MAX_BYTES: 5_242_880,
      NOTIFY_DRIVER: 'log',
      TELEGRAM_TRANSPORT: 'off',
    },
    productsMock: { listVisible: vi.fn(), listFeatured: vi.fn() },
    reviewsMock: { listApproved: vi.fn() },
    articlesMock: { listPublished: vi.fn() },
    pricesMock: { getPrices: vi.fn() },
    settingsMock: { getAll: vi.fn() },
  }),
);

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/repo/products', () => productsMock);
vi.mock('@/server/repo/reviews', () => reviewsMock);
vi.mock('@/server/repo/articles', () => articlesMock);
vi.mock('@/server/repo/prices', () => pricesMock);
vi.mock('@/server/repo/settings', () => settingsMock);

const { default: HomePage, generateMetadata } = await import('./page');

const RATES = {
  trassaPerM: 900,
  trassaIncludedM: 3,
  heightWorks: 2000,
  heightFloorFrom: 10,
  shtrobPerM: 700,
  demontazh: 1500,
  pumpOut: 1200,
};

/** Заполненные настройки: ровно то состояние, в котором сайт уходит в прод. */
const FILLED = {
  company: { name: 'Демо-Климат', tagline: 'кондиционеры' },
  contacts: {
    phones: ['+74872000000'],
    email: 'demo@example.test',
    hours: 'Пн–Вс, 8:00–21:00',
    openingHours: ['Mo-Su 08:00-21:00'],
  },
  address: {
    country: 'RU',
    region: 'Тульская область',
    city: 'Тула',
    street: 'ул. Демонстрационная',
    building: '1',
    postalCode: '300000',
  },
  geo: { lat: 54.19, lng: 37.61 },
  area: { served: 'Тула и область', districts: ['Пролетарский'] },
  seo: { titleSuffix: 'Демо-Климат', ogImage: '/og.png' },
};

/** Заглушки сидов: владелец ещё ничего не заполнил. */
const PLACEHOLDERS = {
  company: {
    name: 'ЗАПОЛНИТЕ В АДМИНКЕ',
    tagline: 'ЗАПОЛНИТЕ В АДМИНКЕ',
  },
  contacts: { phones: ['ЗАПОЛНИТЕ В АДМИНКЕ'], email: 'ЗАПОЛНИТЕ В АДМИНКЕ' },
  address: { country: 'RU', city: 'Тула', street: 'ЗАПОЛНИТЕ В АДМИНКЕ' },
};

function graph(container: HTMLElement): readonly Record<string, unknown>[] {
  return [...container.querySelectorAll('script[type="application/ld+json"]')].flatMap((script) => {
    const parsed: unknown = JSON.parse(script.textContent ?? '{}');
    if (typeof parsed !== 'object' || parsed === null) return [];
    const nodes = (parsed as { '@graph'?: unknown })['@graph'];
    return Array.isArray(nodes) ? (nodes as Record<string, unknown>[]) : [];
  });
}

function types(container: HTMLElement): readonly string[] {
  return graph(container).map((node) => String(node['@type']));
}

beforeEach(() => {
  vi.clearAllMocks();
  productsMock.listVisible.mockResolvedValue([]);
  productsMock.listFeatured.mockResolvedValue([]);
  reviewsMock.listApproved.mockResolvedValue([]);
  articlesMock.listPublished.mockResolvedValue([]);
  pricesMock.getPrices.mockResolvedValue({
    prices: [
      { cls: '07', power: '2.1 кВт', area: 'до 20 м²', price: 6000, term: '3–4 часа', sort: 1 },
    ],
    extras: RATES,
  });
  settingsMock.getAll.mockResolvedValue(FILLED);
});

describe('Лендинг — разметка Schema.org', () => {
  it('🔴 отдаёт HVACBusiness и FAQPage с сервера: робот не ждёт скриптов', async () => {
    const { container } = render(await HomePage());

    expect(types(container)).toContain('HVACBusiness');
    expect(types(container)).toContain('FAQPage');
  });

  it('🔴 данные организации в разметке — из настроек, ни одного значения из кода', async () => {
    const { container } = render(await HomePage());

    const business = graph(container).find((node) => node['@type'] === 'HVACBusiness');
    expect(business).toBeDefined();
    expect(business?.name).toBe(FILLED.company.name);
    expect(business?.telephone).toEqual(FILLED.contacts.phones[0]);
    expect(business?.openingHours).toEqual(FILLED.contacts.openingHours[0]);
  });

  it('🔴 заглушки сидов в разметку не попадают: узла нет вовсе', async () => {
    settingsMock.getAll.mockResolvedValue(PLACEHOLDERS);

    const { container } = render(await HomePage());

    expect(types(container)).not.toContain('HVACBusiness');
    expect(container.innerHTML).not.toContain('"ЗАПОЛНИТЕ В АДМИНКЕ"');
  });

  it('🔴 витрина уходит в ItemList товарами со ссылками на их страницы (ADR-109)', async () => {
    productsMock.listFeatured.mockResolvedValue([
      {
        id: 'p1',
        slug: 'split-09',
        badge: '09',
        name: 'Сплит-система 09',
        areaMax: 27,
        priceNum: 42_900,
        specs: [{ k: 'Мощность охлаждения', v: '2.6 кВт' }],
        photos: [],
        visible: true,
        featured: true,
      },
    ]);

    const { container } = render(await HomePage());

    const list = graph(container).find((node) => node['@type'] === 'ItemList');
    const entries = Array.isArray(list?.itemListElement) ? list.itemListElement : [];
    expect(entries).toHaveLength(1);

    const entry = entries[0] as { url?: unknown; item?: { name?: unknown; offers?: unknown } };
    expect(entry.url).toBe('https://example.test/catalog/split-09');
    expect(entry.item?.name).toBe('Сплит-система 09');
    expect(container.textContent).toContain('Сплит-система 09');
  });

  it('🔴 на главной только витрина: модель в продаже, но не вынесенная, туда не идёт', async () => {
    productsMock.listVisible.mockResolvedValue([
      {
        id: 'p1',
        slug: 'split-07',
        badge: '07',
        name: 'Сплит-система 07',
        areaMax: 20,
        priceNum: 34_900,
        specs: [],
        photos: [],
        visible: true,
        featured: false,
      },
    ]);

    const { container } = render(await HomePage());

    // подбор по площади в первом экране выбирает из всего ассортимента,
    // а витрина остаётся пустой — карточки в ней нет
    expect(container.querySelector('#catalog')?.textContent).not.toContain('Сплит-система 07');
    expect(graph(container).some((node) => node['@type'] === 'ItemList')).toBe(false);
  });

  it('🔴 вопросы в FAQPage дословно те же, что на странице (инвариант 9)', async () => {
    const { container } = render(await HomePage());

    const faq = graph(container).find((node) => node['@type'] === 'FAQPage');
    const questions = Array.isArray(faq?.mainEntity) ? faq.mainEntity : [];
    expect(questions.length).toBeGreaterThan(0);

    for (const item of questions) {
      const question = (item as { name?: unknown }).name;
      expect(container.textContent).toContain(String(question));
    }
  });

  it('🔴 без настоящих отзывов узлов Review нет (инвариант 10)', async () => {
    const { container } = render(await HomePage());

    expect(types(container)).not.toContain('Review');
    expect(graph(container).some((node) => 'aggregateRating' in node)).toBe(false);
  });

  it('одобренный отзыв попадает в разметку тем же текстом, что виден на странице', async () => {
    reviewsMock.listApproved.mockResolvedValue([
      {
        id: 'r1',
        name: 'Илья',
        city: 'Тула',
        rating: 5,
        text: 'Приехали в тот же день, трассу спрятали в короб аккуратно.',
        status: 'approved',
        photo: null,
        createdAt: '2026-07-01T00:00:00.000Z',
      },
    ]);

    const { container } = render(await HomePage());

    const business = graph(container).find((node) => node['@type'] === 'HVACBusiness');
    const reviews = Array.isArray(business?.review) ? business.review : [];
    expect(reviews).toHaveLength(1);
    expect(container.textContent).toContain('Приехали в тот же день');
  });
});

describe('Лендинг — состав страницы', () => {
  it('🔴 на странице ровно один h1', async () => {
    const { container } = render(await HomePage());

    expect(container.querySelectorAll('h1')).toHaveLength(1);
  });

  it('🔴 разделы доступны по английским якорям, на которые ведёт навигация', async () => {
    const { container } = render(await HomePage());

    for (const id of ['catalog', 'prices', 'installation', 'service', 'reviews', 'lead']) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it('пустая база не роняет лендинг: секции остаются на месте', async () => {
    pricesMock.getPrices.mockResolvedValue({ prices: [], extras: RATES });

    const { container } = render(await HomePage());

    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('#catalog')).not.toBeNull();
  });
});

describe('Лендинг — метаданные (инвариант 5)', () => {
  it('🔴 title, description и OG приходят из настроек, каноникал абсолютный', async () => {
    settingsMock.getAll.mockResolvedValue({
      ...FILLED,
      seo: {
        homeTitle: 'Кондиционеры в Туле — купить с установкой',
        homeDescription: 'Продажа и монтаж под ключ за один день.',
        titleSuffix: 'Демо-Климат',
        ogImage: '/og.png',
      },
    });

    const metadata = await generateMetadata();

    expect(metadata.title).toBe('Кондиционеры в Туле — купить с установкой | Демо-Климат');
    expect(metadata.description).toBe('Продажа и монтаж под ключ за один день.');
    expect(metadata.alternates?.canonical).toBe('https://example.test/');
    expect(JSON.stringify(metadata.openGraph)).toContain('https://example.test/og.png');
  });

  it('🔴 пустые настройки не рождают выдуманных значений: полей просто нет', async () => {
    settingsMock.getAll.mockResolvedValue({});

    const metadata = await generateMetadata();

    expect(metadata.title).toBeUndefined();
    expect(metadata.description).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe('https://example.test/');
  });
});
