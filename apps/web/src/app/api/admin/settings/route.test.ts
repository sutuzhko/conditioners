// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth', () => ({ getAdminSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/server/repo/settings', () => ({
  getAll: vi.fn(),
  getGroup: vi.fn(),
  putGroup: vi.fn(),
  readiness: vi.fn(),
  getExtras: vi.fn(),
  checkReadiness: vi.fn(),
}));

import { revalidatePath } from 'next/cache';
import { getAdminSession } from '@/server/auth';
import * as settings from '@/server/repo/settings';
import { PLACEHOLDER } from '@/server/repo/settings-schemas';
import { GET as GET_ALL } from './route';
import { PUT } from './[key]/route';
import { GET as GET_PUBLIC } from '../../settings/[key]/route';

const session = { userId: 'u1', login: 'admin', expiresAt: new Date('2026-12-31') };

const contacts = {
  phones: ['8 (4872) 12-34-56'],
  email: 'info@example.ru',
  telegram: '',
  whatsapp: '',
  hours: 'Пн–Вс, 8:00–21:00',
};

function put(key: string, body: unknown): [NextRequest, { params: Promise<{ key: string }> }] {
  return [
    new NextRequest(new URL(`/api/admin/settings/${key}`, 'http://tulaklimat.localhost'), {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
    { params: Promise.resolve({ key }) },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(session);
  vi.mocked(settings.getAll).mockResolvedValue({ contacts });
  vi.mocked(settings.getGroup).mockResolvedValue(contacts);
});

describe('чтение настроек', () => {
  it('все группы разом — только с сессией', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await GET_ALL(
      new NextRequest('http://tulaklimat.localhost/api/admin/settings'),
      undefined,
    );

    expect(response.status).toBe(401);
  });

  it('публичное чтение отдаёт группу без сессии', async () => {
    const response = await GET_PUBLIC(
      new NextRequest('http://tulaklimat.localhost/api/settings/contacts'),
      { params: Promise.resolve({ key: 'contacts' }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ email: 'info@example.ru' });
  });

  it('настройки интеграций наружу не отдаются', async () => {
    const response = await GET_PUBLIC(
      new NextRequest('http://tulaklimat.localhost/api/settings/integrations'),
      { params: Promise.resolve({ key: 'integrations' }) },
    );

    expect(response.status).toBe(404);
  });

  it('несуществующая группа — 404', async () => {
    const response = await GET_PUBLIC(
      new NextRequest('http://tulaklimat.localhost/api/settings/выдумка'),
      { params: Promise.resolve({ key: 'выдумка' }) },
    );

    expect(response.status).toBe(404);
  });
});

describe('сохранение группы', () => {
  it('телефон сохраняется в едином виде', async () => {
    const response = await PUT(...put('contacts', contacts));

    expect(response.status).toBe(200);
    expect(settings.putGroup).toHaveBeenCalledWith(
      'contacts',
      expect.objectContaining({ phones: ['+7 (487) 212-34-56'] }),
    );
  });

  it('ревалидирует весь сайт: контакты стоят в шапке и футере', async () => {
    await PUT(...put('contacts', contacts));

    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  it('координаты вне диапазона не сохраняются', async () => {
    const response = await PUT(...put('geo', { lat: 999, lng: 37.61 }));

    expect(response.status).toBe(400);
    expect(settings.putGroup).not.toHaveBeenCalled();
  });

  it('неполные данные сохранить можно — владелец заполняет постепенно', async () => {
    const response = await PUT(
      ...put('company', {
        name: PLACEHOLDER,
        legalName: '',
        tagline: '',
        foundedYear: null,
      }),
    );

    expect(response.status).toBe(200);
  });

  it('без сессии настройки не меняются', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await PUT(...put('contacts', contacts));

    expect(response.status).toBe(401);
    expect(settings.putGroup).not.toHaveBeenCalled();
  });
});
