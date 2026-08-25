// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth', () => ({ getAdminSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/server/repo/products', () => ({
  listAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  setSale: vi.fn(),
  addPhoto: vi.fn(),
  updatePhoto: vi.fn(),
  removePhoto: vi.fn(),
}));

import { revalidatePath } from 'next/cache';
import { getAdminSession } from '@/server/auth';
import * as products from '@/server/repo/products';
import { GET, POST } from './route';
import { PATCH as PATCH_SALE } from './[id]/sale/route';

const session = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const product = {
  id: 'p1',
  slug: 'split-sistema-09',
  badge: '09',
  name: 'Сплит-система 09',
  brand: null,
  sku: null,
  areaMax: 27,
  tag: null,
  priceNum: 38_500,
  salePrice: null,
  saleFrom: null,
  saleTo: null,
  saleLabel: null,
  link: null,
  visible: true,
  sort: 0,
  seoTitle: null,
  seoDescription: null,
  photos: [],
  specs: [{ k: 'Площадь', v: 'до 27 м²' }],
  currentPrice: 38_500,
  oldPrice: null,
  discountPercent: 0,
  saleActive: false,
};

function jsonRequest(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(new URL(url, 'http://tulaklimat.localhost'), {
    method,
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(session);
  vi.mocked(products.listAll).mockResolvedValue([product]);
  vi.mocked(products.create).mockResolvedValue(product);
  vi.mocked(products.setSale).mockResolvedValue(product);
});

describe('каталог в админке', () => {
  it('без сессии список не отдаётся', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await GET(
      new NextRequest('http://tulaklimat.localhost/api/admin/models'),
      undefined,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'unauthorized' } });
  });

  it('создаёт модель и отвечает 201', async () => {
    const response = await POST(
      jsonRequest('/api/admin/models', 'POST', {
        badge: '09',
        name: 'Сплит-система 09',
        areaMax: 27,
        priceNum: 38_500,
        specs: [{ k: 'Площадь', v: 'до 27 м²' }],
      }),
      undefined,
    );

    expect(response.status).toBe(201);
    expect(products.create).toHaveBeenCalled();
    // витрина и сравнение живут на главной (ADR-049) — сбрасывается она
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });

  /** 🔴 Инвариант 6: характеристики произвольны, фиксированного набора полей нет. */
  it('принимает любые характеристики, а не заранее известный список', async () => {
    await POST(
      jsonRequest('/api/admin/models', 'POST', {
        badge: '24',
        name: 'Кассетный 24',
        areaMax: 70,
        priceNum: 90_000,
        specs: [
          { k: 'Уровень шума', v: '22 дБ' },
          { k: 'Wi-Fi модуль', v: 'есть' },
          { k: 'Какая угодно новая характеристика', v: 'значение' },
        ],
      }),
      undefined,
    );

    const [input] = vi.mocked(products.create).mock.calls[0] ?? [];
    expect(input?.specs).toHaveLength(3);
    expect(input?.specs?.[2]).toEqual({ k: 'Какая угодно новая характеристика', v: 'значение' });
  });

  it('модель без цены не создаётся', async () => {
    const response = await POST(
      jsonRequest('/api/admin/models', 'POST', { badge: '09', name: 'Сплит', areaMax: 27 }),
      undefined,
    );

    expect(response.status).toBe(400);
    expect(products.create).not.toHaveBeenCalled();
  });

  it('отрицательная цена не принимается', async () => {
    const response = await POST(
      jsonRequest('/api/admin/models', 'POST', {
        badge: '09',
        name: 'Сплит',
        areaMax: 27,
        priceNum: -100,
      }),
      undefined,
    );

    expect(response.status).toBe(400);
  });
});

describe('скидка', () => {
  it('задаётся конечной ценой и периодом', async () => {
    const response = await PATCH_SALE(
      jsonRequest('/api/admin/models/p1/sale', 'PATCH', {
        salePrice: 34_900,
        saleFrom: '2026-09-01',
        saleTo: '2026-10-31',
        saleLabel: 'Осенняя цена',
      }),
      { params: Promise.resolve({ id: 'p1' }) },
    );

    expect(response.status).toBe(200);

    const [, input] = vi.mocked(products.setSale).mock.calls[0] ?? [];
    expect(input?.salePrice).toBe(34_900);
    // граница «до» — конец дня, иначе скидка пропадёт утром последнего дня
    expect(input?.saleTo?.toISOString()).toBe('2026-10-31T20:59:59.999Z');
  });

  it('salePrice: null снимает скидку', async () => {
    const response = await PATCH_SALE(
      jsonRequest('/api/admin/models/p1/sale', 'PATCH', { salePrice: null }),
      { params: Promise.resolve({ id: 'p1' }) },
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(products.setSale).mock.calls[0]?.[1].salePrice).toBeNull();
  });

  it('процент скидки задать нельзя — только цену', async () => {
    const response = await PATCH_SALE(
      jsonRequest('/api/admin/models/p1/sale', 'PATCH', { discountPercent: 15 }),
      { params: Promise.resolve({ id: 'p1' }) },
    );

    expect(response.status).toBe(400);
    expect(products.setSale).not.toHaveBeenCalled();
  });

  it('без сессии скидку не поставить', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await PATCH_SALE(
      jsonRequest('/api/admin/models/p1/sale', 'PATCH', { salePrice: 1 }),
      { params: Promise.resolve({ id: 'p1' }) },
    );

    expect(response.status).toBe(401);
  });
});
