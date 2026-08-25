// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth', () => ({ getAdminSession: vi.fn() }));
vi.mock('@/server/repo/leads', () => ({
  listByStatus: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
}));

import { getAdminSession } from '@/server/auth';
import * as leads from '@/server/repo/leads';
import { GET } from './route';
import { PATCH } from './[id]/route';

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
  place: null,
  qty: null,
  callTime: null,
  address: null,
  comment: null,
  photo: null,
  sourceUrl: null,
  referrer: null,
  utm: null,
  consentAt: '2026-08-01T10:00:00.000Z',
  status: 'new' as const,
  managerComment: null,
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

const context = { params: Promise.resolve({ id: 'l1' }) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(session);
  vi.mocked(leads.listByStatus).mockResolvedValue([lead]);
  vi.mocked(leads.update).mockResolvedValue({ ...lead, status: 'in_progress' });
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
    expect(leads.listByStatus).toHaveBeenCalledWith('in_progress');
  });

  it('пустой фильтр означает «все»', async () => {
    await GET(request('/api/admin/leads?status='), undefined);

    expect(leads.listByStatus).toHaveBeenCalledWith(undefined);
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
