// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Одна ячейка «базы»: что записали в группу extras, то и читаем обратно. */
const store = vi.hoisted(() => ({ extras: null as unknown }));

import type * as AuthModuleTypes from '@/server/auth';

/* Частичная подмена: `isOwner` берём настоящий — раздел владельческий,
   и проверяется разграничение, а не сама функция сравнения роли. */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
}));

/* 🔴 Подмена репозитория команды нужна не маршруту, а разрыву цикла импортов:
   `auth` тянет `repo/admin-users`, тот — `http` ради `ApiException`, а `http` —
   обратно `auth`. На полпути этого круга `http` получает настоящий
   `getAdminSession` мимо подмены, и проверка доступа уходит в `cookies()` вне
   запроса. Без этой строки падают все проверки файла. */
vi.mock('@/server/repo/admin-users', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/server/db', () => {
  const setting = {
    findUnique: vi.fn(async () =>
      store.extras === null ? null : { key: 'extras', value: store.extras, updatedAt: new Date() },
    ),
    upsert: vi.fn(async ({ create }: { create: { key: string; value: unknown } }) => {
      // Postgres хранит группу как JSON — прогоняем значение через сериализацию,
      // чтобы тест не проверял ссылку на тот же объект вместо записи в базу.
      store.extras = JSON.parse(JSON.stringify(create.value));
      return { key: 'extras', value: store.extras, updatedAt: new Date() };
    }),
  };

  const priceRow = {
    findMany: vi.fn(async () => [
      { cls: '09', power: '2.6 кВт', area: 'до 25 м²', price: 33900, term: '1 день', sort: 0 },
    ]),
    upsert: vi.fn(async () => ({})),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  };

  const db = {
    setting,
    priceRow,
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(db)),
  };

  return { db };
});

import { db } from '@/server/db';
import { getAdminSession } from '@/server/auth';
import { GET, PUT } from './route';

const session = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const priceRow = { cls: '09', power: '2.6 кВт', area: 'до 25 м²', price: 33900, term: '1 день' };

/**
 * Ставки, которые задал владелец. Включённые метры трассы и порог высотных
 * работ отличаются от умолчаний ADR-029 (3 и 10) — иначе потерю полей не
 * отличить от значений по умолчанию.
 */
const extras = {
  trassaPerM: 700,
  shtrobPerM: 800,
  heightWorks: 2000,
  trassaIncludedM: 5,
  heightFloorFrom: 6,
};

function put(body: unknown): NextRequest {
  return new NextRequest(new URL('/api/admin/prices', 'http://tulaklimat.localhost'), {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  store.extras = null;
  vi.mocked(getAdminSession).mockResolvedValue(session);
});

/**
 * 🔴 Здесь была настоящая потеря данных. Админ-API валидировал ставки копией
 * схемы в `server/repo/settings-schemas.ts`, которая не знала про
 * `trassaIncludedM` и `heightFloorFrom` (ADR-029): владелец сохранял свои
 * включённые метры, а обратно они не приходили — калькулятор считал по
 * умолчаниям и показывал не ту цену, которую задал владелец. Для сайта,
 * половина контента которого про честность сметы, это красная линия.
 */
describe('ставки монтажа через админ-API', () => {
  it('сохранённые метры трассы и порог этажа читаются обратно без потерь', async () => {
    const saved = await PUT(put({ prices: [priceRow], extras }), undefined);

    expect(saved.status).toBe(200);
    await expect(saved.json()).resolves.toMatchObject({ extras });

    const read = await GET(
      new NextRequest('http://tulaklimat.localhost/api/admin/prices'),
      undefined,
    );

    await expect(read.json()).resolves.toMatchObject({ extras });
  });

  it('ставки из формы приходят строками и сохраняются числами', async () => {
    const response = await PUT(
      put({
        prices: [{ ...priceRow, price: '33900' }],
        extras: { ...extras, trassaIncludedM: '5', heightFloorFrom: '6' },
      }),
      undefined,
    );

    expect(response.status).toBe(200);
    expect(store.extras).toMatchObject({ trassaIncludedM: 5, heightFloorFrom: 6 });
  });

  it('без заданных значений остаются умолчания из PROJECT §2.4', async () => {
    await PUT(
      put({ prices: [priceRow], extras: { trassaPerM: 700, shtrobPerM: 800, heightWorks: 2000 } }),
      undefined,
    );

    expect(store.extras).toMatchObject({ trassaIncludedM: 3, heightFloorFrom: 10 });
  });

  it('без сессии прайс не меняется', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await PUT(put({ prices: [priceRow], extras }), undefined);

    expect(response.status).toBe(401);
    expect(db.setting.upsert).not.toHaveBeenCalled();
  });

  /**
   * 🔴 Строка без класса — потерянная строка, а не пустой ряд. Форма её
   * останавливает и подсвечивает, но правило обязано жить на сервере: мимо
   * панели прайс правится любым запросом, а прайс с безымянной строкой — это
   * цена, которой калькулятор не найдёт.
   *
   * Проверяется не только отказ, но и адрес поля: по нему форма подсвечивает
   * свою ячейку (`rowOfField` в `features/prices-form/lib.ts`), и в таблице из
   * десяти классов одна плашка внизу не говорит, какая строка не прошла.
   */
  it('🔴 строка прайса без класса не сохраняется, и отказ называет её номер', async () => {
    const response = await PUT(
      put({ prices: [priceRow, { ...priceRow, cls: '   ' }], extras }),
      undefined,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'validation_error', field: 'prices.1.cls' },
    });

    // 🔴 Прайс заменяется целиком: сохранись он частично, пропала бы вся таблица
    expect(db.priceRow.deleteMany).not.toHaveBeenCalled();
    expect(db.priceRow.upsert).not.toHaveBeenCalled();
  });

  it('🔴 пустой прайс не принимается: калькулятору не по чему считать', async () => {
    const response = await PUT(put({ prices: [], extras }), undefined);

    expect(response.status).toBe(400);
    expect(db.priceRow.deleteMany).not.toHaveBeenCalled();
  });
});
