// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
vi.mock('@/server/repo/reviews', () => ({
  listByStatus: vi.fn(),
  setStatus: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@/server/uploads/store', () => ({ deleteStoredImage: vi.fn() }));

import { getAdminSession } from '@/server/auth';
import { deleteStoredImage } from '@/server/uploads/store';
import * as reviews from '@/server/repo/reviews';
import { GET } from './route';
import { PATCH } from './[id]/status/route';
import { DELETE } from './[id]/route';

const session = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const stored = {
  id: 'r5',
  name: 'Ирина',
  rating: 5,
  text: 'Приехали в тот же день, всё аккуратно',
  photo: null,
  avatar: null,
  status: 'pending' as const,
  reject: null,
  createdAt: '2026-08-01T10:00:00.000Z',
};

type Init = { method?: string; body?: string; headers?: Record<string, string> };

function request(url: string, init: Init = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://tulaklimat.localhost'), init);
}

function context(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(session);
  vi.mocked(reviews.listByStatus).mockResolvedValue({
    items: [stored],
    total: 1,
    page: 1,
    pages: 1,
  });
  vi.mocked(reviews.setStatus).mockResolvedValue({ ...stored, status: 'approved' });
  vi.mocked(reviews.remove).mockResolvedValue({ photo: null, avatar: null });
});

describe('список отзывов', () => {
  it('без сессии не отдаётся', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await GET(request('/api/admin/reviews'), undefined);

    expect(response.status).toBe(401);
    expect(reviews.listByStatus).not.toHaveBeenCalled();
  });

  it('фильтруется по статусу', async () => {
    const response = await GET(request('/api/admin/reviews?status=pending'), undefined);

    expect(response.status).toBe(200);
    expect(reviews.listByStatus).toHaveBeenCalledWith({ status: 'pending', page: 1 });
  });

  it('без фильтра отдаёт все', async () => {
    await GET(request('/api/admin/reviews'), undefined);

    expect(reviews.listByStatus).toHaveBeenCalledWith({ status: undefined, page: 1 });
  });

  it('номер страницы читается из адреса, мусор — первая страница', async () => {
    await GET(request('/api/admin/reviews?page=3'), undefined);
    expect(reviews.listByStatus).toHaveBeenCalledWith({ status: undefined, page: 3 });

    await GET(request('/api/admin/reviews?page=нет'), undefined);
    expect(reviews.listByStatus).toHaveBeenLastCalledWith({ status: undefined, page: 1 });
  });

  it('неизвестный статус — ошибка валидации, а не пустой список', async () => {
    const response = await GET(request('/api/admin/reviews?status=выдумка'), undefined);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'validation_error', field: 'status' },
    });
    expect(reviews.listByStatus).not.toHaveBeenCalled();
  });
});

describe('смена статуса', () => {
  it('меняет статус и ревалидирует страницы с отзывами', async () => {
    const response = await PATCH(
      request('/api/admin/reviews/r5/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
        headers: { 'content-type': 'application/json' },
      }),
      context('r5'),
    );

    expect(response.status).toBe(200);
    expect(reviews.setStatus).toHaveBeenCalledWith('r5', { status: 'approved' }, 'u1');
  });

  it('без сессии статус не меняется', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await PATCH(
      request('/api/admin/reviews/r5/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
        headers: { 'content-type': 'application/json' },
      }),
      context('r5'),
    );

    expect(response.status).toBe(401);
    expect(reviews.setStatus).not.toHaveBeenCalled();
  });

  it('несуществующий статус не принимается', async () => {
    const response = await PATCH(
      request('/api/admin/reviews/r5/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'опубликован' }),
        headers: { 'content-type': 'application/json' },
      }),
      context('r5'),
    );

    expect(response.status).toBe(400);
  });
});

/** 🔴 Инвариант 7: текст отзыва неизменяем — модератор меняет только статус. */
describe('текст отзыва изменить нельзя', () => {
  it('попытка передать text вместе со статусом отклоняется', async () => {
    const response = await PATCH(
      request('/api/admin/reviews/r5/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved', text: 'Переписанный отзыв' }),
        headers: { 'content-type': 'application/json' },
      }),
      context('r5'),
    );

    expect(response.status).toBe(400);
    expect(reviews.setStatus).not.toHaveBeenCalled();
  });

  it.each(['text', 'name', 'rating', 'photo', 'district'])(
    'поле %s не принимается ни в каком виде',
    async (field) => {
      const response = await PATCH(
        request('/api/admin/reviews/r5/status', {
          method: 'PATCH',
          body: JSON.stringify({ [field]: 'подмена' }),
          headers: { 'content-type': 'application/json' },
        }),
        context('r5'),
      );

      expect(response.status).toBe(400);
      expect(reviews.setStatus).not.toHaveBeenCalled();
    },
  );

  it('в репозиторий уходит только идентификатор и статус', async () => {
    await PATCH(
      request('/api/admin/reviews/r5/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'archived' }),
        headers: { 'content-type': 'application/json' },
      }),
      context('r5'),
    );

    expect(reviews.setStatus).toHaveBeenCalledWith('r5', { status: 'archived' }, 'u1');
    expect(vi.mocked(reviews.setStatus).mock.calls[0]).toHaveLength(3);
  });
});

/** 🔴 ADR-300: отклонить, не объяснив, нельзя — ни из панели, ни мимо неё. */
describe('отказ без причины не принимается', () => {
  const reject = (body: Record<string, unknown>) =>
    PATCH(
      request('/api/admin/reviews/r5/status', {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
      }),
      context('r5'),
    );

  it('статус rejected без поля причины — 400', async () => {
    expect((await reject({ status: 'rejected' })).status).toBe(400);
    expect(reviews.setStatus).not.toHaveBeenCalled();
  });

  it('отговорка в два слова причиной не считается', async () => {
    expect((await reject({ status: 'rejected', reason: 'спам' })).status).toBe(400);
    expect(reviews.setStatus).not.toHaveBeenCalled();
  });

  it('причина с пробелами по краям обрезается, а не проходит длиной', async () => {
    expect((await reject({ status: 'rejected', reason: '   спам    ' })).status).toBe(400);
    expect(reviews.setStatus).not.toHaveBeenCalled();
  });

  it('причина уходит в репозиторий вместе с автором решения', async () => {
    vi.mocked(reviews.setStatus).mockResolvedValue({
      ...stored,
      status: 'rejected',
      reject: { reason: 'Реклама конкурента', by: 'admin', at: '2026-09-04T09:00:00.000Z' },
    });

    const response = await reject({ status: 'rejected', reason: 'Реклама конкурента' });

    expect(response.status).toBe(200);
    expect(reviews.setStatus).toHaveBeenCalledWith(
      'r5',
      { status: 'rejected', reason: 'Реклама конкурента' },
      'u1',
    );
  });

  it('🔴 причина к одобрению не приделывается: это не поле на все случаи', async () => {
    expect((await reject({ status: 'approved', reason: 'Хороший отзыв' })).status).toBe(400);
    expect(reviews.setStatus).not.toHaveBeenCalled();
  });
});

describe('удаление отзыва', () => {
  it('удаляет и отвечает 204', async () => {
    const response = await DELETE(
      request('/api/admin/reviews/r5', { method: 'DELETE' }),
      context('r5'),
    );

    expect(response.status).toBe(204);
    expect(reviews.remove).toHaveBeenCalledWith('r5');
  });

  it('🔴 снимки удалённого отзыва не остаются на диске (152-ФЗ)', async () => {
    vi.mocked(reviews.remove).mockResolvedValue({
      photo: '/api/media/aaaa.jpg',
      avatar: '/api/media/bbbb.jpg',
    });

    const response = await DELETE(
      request('/api/admin/reviews/r5', { method: 'DELETE' }),
      context('r5'),
    );

    expect(response.status).toBe(204);
    expect(deleteStoredImage).toHaveBeenCalledWith('/api/media/aaaa.jpg');
    expect(deleteStoredImage).toHaveBeenCalledWith('/api/media/bbbb.jpg');
  });

  it('отзыв без снимков не трогает диск', async () => {
    await DELETE(request('/api/admin/reviews/r5', { method: 'DELETE' }), context('r5'));

    expect(deleteStoredImage).not.toHaveBeenCalled();
  });

  it('без сессии не удаляет', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await DELETE(
      request('/api/admin/reviews/r5', { method: 'DELETE' }),
      context('r5'),
    );

    expect(response.status).toBe(401);
    expect(reviews.remove).not.toHaveBeenCalled();
  });
});
