// @vitest-environment node
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AuthModuleTypes from '@/server/auth';

/* Частичная подмена: `isOwner` берём настоящий — проверяется разграничение,
   а не сама функция сравнения роли. */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
}));

/* 🔴 Подмена репозитория команды нужна не маршруту, а разрыву цикла импортов:
   `auth` тянет `repo/admin-users`, тот — `http` ради `ApiException`, а `http` —
   обратно `auth`. На полпути этого круга `http` получает настоящий
   `getAdminSession` мимо подмены, и проверка доступа уходит в `cookies()` вне
   запроса. */
vi.mock('@/server/repo/admin-users', () => ({}));
vi.mock('@/server/repo/leads', () => ({
  listByStatus: vi.fn(),
  findById: vi.fn(),
  findPhotoFile: vi.fn(),
  startWork: vi.fn(),
  update: vi.fn(),
}));
vi.mock('@/server/repo/clients', () => ({ fromLead: vi.fn() }));

import { getAdminSession } from '@/server/auth';
import * as clients from '@/server/repo/clients';
import * as leads from '@/server/repo/leads';
import { GET } from './route';
import { PATCH } from './[id]/route';
import { POST as startOrder } from './[id]/order/route';
import { GET as getPhoto } from './[id]/photo/route';

const session = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const lead = {
  id: 'l1',
  name: 'Пётр',
  phone: '+7 (953) 123-45-67',
  topic: 'Установка',
  model: null,
  place: null,
  qty: null,
  callTime: null,
  address: null,
  comment: null,
  photo: null,
  sourceUrl: null,
  referrer: null,
  utm: null,
  context: null,
  consentAt: '2026-08-01T10:00:00.000Z',
  status: 'new' as const,
  managerComment: null,
  clientId: null,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

type Init = { method?: string; body?: string; headers?: Record<string, string> };

function request(url: string, init: Init = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://tulaklimat.localhost'), init);
}

function patch(body: unknown): NextRequest {
  return request('/api/admin/leads/l1', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const client = {
  id: 'c1',
  name: 'Пётр',
  phone: '+7 (953) 123-45-67',
  address: null,
  note: null,
  createdAt: '2026-08-01T10:00:00.000Z',
  leadCount: 1,
};

const context = { params: Promise.resolve({ id: 'l1' }) };

function post(): NextRequest {
  return request('/api/admin/leads/l1/order', { method: 'POST' });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(session);
  vi.mocked(leads.listByStatus).mockResolvedValue({ items: [lead], total: 1, page: 1, pages: 1 });
  vi.mocked(leads.update).mockResolvedValue({ ...lead, status: 'in_progress' });
  vi.mocked(leads.startWork).mockResolvedValue({ ...lead, status: 'in_progress' });
  vi.mocked(clients.fromLead).mockResolvedValue({ client: client, created: true });
});

describe('список заявок', () => {
  it('закрыт без сессии — это персональные данные клиентов', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await GET(request('/api/admin/leads'), undefined);

    expect(response.status).toBe(401);
    expect(leads.listByStatus).not.toHaveBeenCalled();
  });

  it('фильтруется по статусу', async () => {
    const response = await GET(request('/api/admin/leads?status=in_progress'), undefined);

    expect(response.status).toBe(200);
    expect(leads.listByStatus).toHaveBeenCalledWith({ status: 'in_progress', page: 1 });
  });

  it('номер страницы читается из адреса, мусор — первая страница', async () => {
    await GET(request('/api/admin/leads?page=4'), undefined);
    expect(leads.listByStatus).toHaveBeenCalledWith({ status: undefined, page: 4 });

    // адрес правят руками и присылают друг другу: отказ вместо списка там
    // ничего не объясняет
    await GET(request('/api/admin/leads?page=нет'), undefined);
    expect(leads.listByStatus).toHaveBeenLastCalledWith({ status: undefined, page: 1 });
  });

  it('пустой фильтр означает «все»', async () => {
    await GET(request('/api/admin/leads?status='), undefined);

    expect(leads.listByStatus).toHaveBeenCalledWith({ status: undefined, page: 1 });
  });

  it('неизвестный статус отклоняется', async () => {
    const response = await GET(request('/api/admin/leads?status=отменена'), undefined);

    expect(response.status).toBe(400);
  });
});

describe('обработка заявки', () => {
  it('меняет статус и комментарий менеджера', async () => {
    const response = await PATCH(
      patch({ status: 'in_progress', managerComment: 'Перезвонить после 18:00' }),
      context,
    );

    expect(response.status).toBe(200);
    expect(leads.update).toHaveBeenCalledWith('l1', {
      status: 'in_progress',
      managerComment: 'Перезвонить после 18:00',
    });
  });

  it('данные клиента через этот эндпоинт не правятся', async () => {
    const response = await PATCH(patch({ phone: '+7 999 000-00-00' }), context);

    expect(response.status).toBe(400);
    expect(leads.update).not.toHaveBeenCalled();
  });

  it('пустое тело сохранять нечего', async () => {
    const response = await PATCH(patch({}), context);

    expect(response.status).toBe(400);
  });

  it('без сессии заявка не меняется', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await PATCH(patch({ status: 'done' }), context);

    expect(response.status).toBe(401);
    expect(leads.update).not.toHaveBeenCalled();
  });
});

describe('«Создать заказ» из обращения', () => {
  it('заводит клиента и переводит обращение в работу одним запросом', async () => {
    const response = await startOrder(post(), context);

    expect(response.status).toBe(200);
    expect(clients.fromLead).toHaveBeenCalledWith('l1');
    expect(leads.startWork).toHaveBeenCalledWith('l1');

    const body: unknown = await response.json();
    expect(body).toMatchObject({
      client: { id: 'c1' },
      created: true,
      lead: { status: 'in_progress' },
    });
  });

  it('🔴 наряд здесь не создаётся: номер не тратится на промах мимо кнопки', async () => {
    const response = await startOrder(post(), context);
    const body: unknown = await response.json();

    expect(body).not.toHaveProperty('order');
  });

  it('без сессии не заводит ни клиента, ни работу', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await startOrder(post(), context);

    expect(response.status).toBe(401);
    expect(clients.fromLead).not.toHaveBeenCalled();
    expect(leads.startWork).not.toHaveBeenCalled();
  });

  it('🔴 монтажнику обращения не адресованы вовсе', async () => {
    vi.mocked(getAdminSession).mockResolvedValue({ ...session, role: 'installer' });

    const response = await startOrder(post(), context);

    expect(response.status).toBe(403);
    expect(clients.fromLead).not.toHaveBeenCalled();
  });
});

/**
 * 🔴 ADR-171: к форме человек прикладывает фотографию своей комнаты. Это
 * персональные данные ровно в той же мере, что и адрес в той же заявке, и до
 * ADR-171 снимок отдавался публичным `/api/media/{name}` любому, кто знает имя
 * файла.
 */
describe('🔴 выдача снимка при заявке', () => {
  const PHOTO_PATH = '/tmp/tk-test-lead-photo/0f9c1f4e-6f3a-4c69-9c1a-8a5b6d7e8f90.jpg';
  const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);

  const context = { params: Promise.resolve({ id: 'l1' }) };

  function get(): NextRequest {
    return new NextRequest(new URL('/api/admin/leads/l1/photo', 'https://tulaklimat.ru'));
  }

  beforeEach(() => {
    vi.mocked(leads.findPhotoFile).mockResolvedValue({ path: PHOTO_PATH, mime: 'image/jpeg' });
  });

  it('без сессии снимок не отдаётся', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await getPhoto(get(), context);

    expect(response.status).toBe(401);
    expect(leads.findPhotoFile).not.toHaveBeenCalled();
  });

  it('🔴 монтажнику обращения не адресованы — снимок тоже', async () => {
    vi.mocked(getAdminSession).mockResolvedValue({ ...session, role: 'installer' });

    const response = await getPhoto(get(), context);

    expect(response.status).toBe(403);
    expect(leads.findPhotoFile).not.toHaveBeenCalled();
  });

  it('владелец получает снимок, и снимок не оседает в кеше', async () => {
    await mkdir('/tmp/tk-test-lead-photo', { recursive: true });
    await writeFile(PHOTO_PATH, JPEG_BYTES);

    const response = await getPhoto(get(), context);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    // между панелью и браузером стоит Caddy: снимок в общем кеше — та же утечка
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');

    const body = Buffer.from(await response.arrayBuffer());
    expect(body.equals(JPEG_BYTES)).toBe(true);

    await rm('/tmp/tk-test-lead-photo', { recursive: true, force: true });
  });

  it('файла нет на диске — 404, а не пустой ответ с кодом 200', async () => {
    await rm('/tmp/tk-test-lead-photo', { recursive: true, force: true });

    const response = await getPhoto(get(), context);

    expect(response.status).toBe(404);
  });
});
