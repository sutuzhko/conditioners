// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AuthModuleTypes from '@/server/auth';

/* Частичная подмена: настоящим остаётся `isOwner` — проверяется разграничение,
   а не функция сравнения роли. */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
}));

/* 🔴 Подмена репозитория команды нужна не странице, а разрыву цикла импортов:
   `auth` тянет `repo/admin-users`, тот — `http` ради `ApiException`, а `http` —
   обратно `auth`. На полпути этого круга `http` получает настоящий
   `getAdminSession` мимо подмены. Без этой строки падает весь файл. */
vi.mock('@/server/repo/admin-users', () => ({ listInstallers: vi.fn(async () => []) }));

/* Базу подменяем целиком, а не репозитории: проверяется именно то, что запрос
   за чужими делами и заявками не уходит — увидеть это можно только здесь. */
const db = vi.hoisted(() => ({
  crmEvent: { findMany: vi.fn(), count: vi.fn() },
  lead: { findMany: vi.fn(), findUnique: vi.fn() },
  order: { findMany: vi.fn() },
  dayBlock: { findMany: vi.fn() },
  setting: { findUnique: vi.fn() },
}));

vi.mock('@/server/db', () => ({ db }));

import { getAdminSession } from '@/server/auth';

import AdminCrmPage from './page';

const owner = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const installer = { ...owner, userId: 'u2', login: 'sokolov', role: 'installer' } as const;

const eventRow = {
  id: 'e1',
  kind: 'CALL',
  status: 'PLANNED',
  at: new Date('2026-08-24T07:00:00.000Z'),
  durationMin: 30,
  overtimeMin: 0,
  clientName: 'Ирина Соколова',
  clientPhone: '+7 (910) 155-24-68',
  address: 'Тула, Первомайская, 12',
  note: 'перезвонить после обеда',
  leadId: null,
};

const leadRow = {
  id: 'l1',
  name: 'Ирина Соколова',
  phone: '+7 (910) 155-24-68',
  topic: 'INSTALL',
  model: null,
  area: null,
  address: 'Тула, Первомайская, 12',
  comment: null,
  status: 'NEW',
  context: null,
  consent: true,
  consentAt: new Date('2026-08-20T09:00:00.000Z'),
  clientId: null,
  createdAt: new Date('2026-08-20T09:00:00.000Z'),
  updatedAt: new Date('2026-08-20T09:00:00.000Z'),
};

/** Календарь месяца: вид по умолчанию, им и открывают панель. */
function open(search: Record<string, string> = {}) {
  return AdminCrmPage({ searchParams: Promise.resolve({ month: '2026-08', ...search }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(owner);
  db.crmEvent.findMany.mockResolvedValue([eventRow]);
  db.crmEvent.count.mockResolvedValue(2);
  db.lead.findMany.mockResolvedValue([leadRow]);
  db.lead.findUnique.mockResolvedValue(leadRow);
  db.order.findMany.mockResolvedValue([]);
  db.dayBlock.findMany.mockResolvedValue([]);
  db.setting.findUnique.mockResolvedValue(null);
});

describe('календарь работ и роль смотрящего', () => {
  it('🔴 монтажнику ни одно чужое дело и ни одна заявка не выбираются из базы', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    await open();

    expect(db.crmEvent.findMany).not.toHaveBeenCalled();
    expect(db.lead.findMany).not.toHaveBeenCalled();
    // счётчик просрочки — та же сводка по чужим делам, только числом
    expect(db.crmEvent.count).not.toHaveBeenCalled();
  });

  it('🔴 монтажник не достаёт клиента подставленным в адрес номером заявки', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    await open({ lead: 'l1' });

    expect(db.lead.findUnique).not.toHaveBeenCalled();
  });

  it('свои наряды и свои отлучки монтажник получает по-прежнему', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    await open();

    expect(db.order.findMany.mock.calls[0]?.[0]?.where).toMatchObject({ installerId: 'u2' });
    expect(db.dayBlock.findMany).toHaveBeenCalled();
  });

  it('владелец получает дела, заявки и просрочку как раньше', async () => {
    await open({ lead: 'l1' });

    expect(db.crmEvent.findMany).toHaveBeenCalled();
    expect(db.lead.findMany).toHaveBeenCalled();
    expect(db.crmEvent.count).toHaveBeenCalled();
    expect(db.lead.findUnique).toHaveBeenCalledWith({ where: { id: 'l1' } });
  });
});
