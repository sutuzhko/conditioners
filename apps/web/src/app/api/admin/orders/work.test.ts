// @vitest-environment node
import { Readable } from 'node:stream';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AuthModuleTypes from '@/server/auth';

/* Частичная подмена: `isOwner` берём настоящий — проверяется разграничение,
   а не сама функция сравнения роли. */
vi.mock('@/server/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModuleTypes>()),
  getAdminSession: vi.fn(),
}));

/* Разрыв цикла импортов, как в route.test.ts: `auth` тянет `repo/admin-users`,
   тот — `http`, а `http` — обратно `auth`. */
vi.mock('@/server/repo/admin-users', () => ({}));

const fake = vi.hoisted(() => ({
  db: {
    order: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    orderChecklistItem: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    orderDocument: { findFirst: vi.fn(), create: vi.fn(), delete: vi.fn() },
    orderPhoto: { findFirst: vi.fn(), create: vi.fn(), delete: vi.fn() },
    orderHistory: { createMany: vi.fn() },
    $transaction: vi.fn(),
  },
  files: { mkdir: vi.fn(), writeFile: vi.fn(), rm: vi.fn(), stat: vi.fn() },
  uploads: { saveImage: vi.fn(), deleteStoredImage: vi.fn() },
  streams: { createReadStream: vi.fn() },
}));

vi.mock('@/server/db', () => ({ db: fake.db }));

vi.mock('node:fs/promises', () => ({
  mkdir: fake.files.mkdir,
  writeFile: fake.files.writeFile,
  rm: fake.files.rm,
  stat: fake.files.stat,
}));

vi.mock('node:fs', () => ({ createReadStream: fake.streams.createReadStream }));

vi.mock('@/server/uploads/store', () => ({
  saveImage: fake.uploads.saveImage,
  deleteStoredImage: fake.uploads.deleteStoredImage,
}));

import { getAdminSession } from '@/server/auth';

import { PATCH as SET_RESULT } from './[id]/result/route';
import { POST as ADD_ITEM, PUT as REBUILD } from './[id]/checklist/route';
import { DELETE as REMOVE_ITEM, PATCH as TOGGLE_ITEM } from './[id]/checklist/[itemId]/route';
import { POST as ADD_DOC } from './[id]/docs/route';
import { DELETE as REMOVE_DOC } from './[id]/docs/[docId]/route';
import { GET as GET_FILE } from './[id]/docs/[docId]/file/route';
import { POST as ADD_PHOTO } from './[id]/photos/route';
import { DELETE as REMOVE_PHOTO } from './[id]/photos/[photoId]/route';

const owner = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const installer = { ...owner, userId: 'u2', login: 'sokolov', role: 'installer' } as const;

/** Наряд, назначенный на `u2`, — тот самый монтажник из сессии. */
const access = { id: 'o1', installerId: 'u2', status: 'ASSIGNED' };

const detailsRow = {
  id: 'o1',
  number: 1059,
  type: 'INSTALL',
  status: 'ASSIGNED',
  client: { id: 'c1', name: 'Ирина Соколова', phone: '+7 (910) 155-24-68' },
  installer: { id: 'u2', name: 'Дмитрий Соколов', login: 'sokolov', employment: 'SELF_EMPLOYED' },
  at: new Date('2026-08-28T08:00:00.000Z'),
  durationMin: 180,
  address: 'Тула, Первомайская, 12, кв. 4',
  intercom: null,
  phone2: null,
  floor: 5,
  heightWorks: true,
  payment: 'COMPANY',
  price: 38500,
  installerFee: 9000,
  deductionSum: 0,
  deductionReason: null,
  comment: null,
  ownerNote: 'Клиент постоянный',
  leadId: null,
  extraWork: 'Дополнительно два метра трассы',
  report: 'Блок повешен, проверен на охлаждение',
  resultAt: new Date('2026-08-28T12:00:00.000Z'),
  units: [],
  checklist: [],
  docs: [],
  photos: [],
  history: [],
  createdAt: new Date('2026-08-26T14:00:00.000Z'),
};

function request(url: string, init: { method?: string; body?: unknown } = {}): NextRequest {
  const { method = 'GET', body: payload } = init;

  return new NextRequest(new URL(url, 'https://tulaklimat.ru'), {
    method,
    ...(payload === undefined
      ? {}
      : { body: JSON.stringify(payload), headers: { 'content-type': 'application/json' } }),
  });
}

function form(url: string, data: FormData): NextRequest {
  return new NextRequest(new URL(url, 'https://tulaklimat.ru'), { method: 'POST', body: data });
}

const ctx = { params: Promise.resolve({ id: 'o1' }) };
const itemCtx = { params: Promise.resolve({ id: 'o1', itemId: 'i1' }) };
const docCtx = { params: Promise.resolve({ id: 'o1', docId: 'd1' }) };
const photoCtx = { params: Promise.resolve({ id: 'o1', photoId: 'p1' }) };

const PDF = new File([Buffer.from('%PDF-1.7\n…')], 'Договор.pdf', { type: 'application/pdf' });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(owner);

  fake.db.$transaction.mockImplementation(async (run: (tx: typeof fake.db) => Promise<unknown>) =>
    run(fake.db),
  );
  fake.db.order.findFirst.mockResolvedValue(access);
  fake.db.order.findUnique.mockResolvedValue({
    id: 'o1',
    type: 'INSTALL',
    heightWorks: false,
    payment: 'COMPANY',
    price: 38500,
    units: [],
  });
  fake.db.order.update.mockResolvedValue(detailsRow);
  fake.db.orderHistory.createMany.mockResolvedValue({ count: 1 });
  fake.db.orderChecklistItem.findMany.mockResolvedValue([]);
  fake.db.orderChecklistItem.findFirst.mockResolvedValue({ id: 'i1', own: true });
  fake.db.orderChecklistItem.create.mockResolvedValue({
    id: 'i9',
    text: 'Взять чехлы',
    done: false,
    own: true,
    sort: 3,
  });
  fake.db.orderChecklistItem.update.mockResolvedValue({
    id: 'i1',
    text: 'Стремянка',
    done: true,
    own: false,
    sort: 0,
  });
  fake.db.orderChecklistItem.delete.mockResolvedValue({});
  fake.db.orderChecklistItem.deleteMany.mockResolvedValue({ count: 0 });
  fake.db.orderChecklistItem.createMany.mockResolvedValue({ count: 0 });
  fake.db.orderDocument.create.mockResolvedValue({
    id: 'd1',
    kind: 'CONTRACT',
    name: 'Договор.pdf',
    url: '00000000-0000-4000-8000-000000000000.pdf',
    sizeBytes: 11,
    createdAt: new Date('2026-08-26T14:00:00.000Z'),
  });
  fake.db.orderDocument.findFirst.mockResolvedValue({
    id: 'd1',
    name: 'Договор.pdf',
    url: '00000000-0000-4000-8000-000000000000.pdf',
    sizeBytes: 11,
  });
  fake.db.orderPhoto.findFirst.mockResolvedValue(null);
  fake.db.orderPhoto.create.mockResolvedValue({
    id: 'p1',
    stage: 'AFTER',
    url: '/api/media/aaa.jpg',
    sort: 0,
  });
  fake.uploads.saveImage.mockResolvedValue({
    url: '/api/media/aaa.jpg',
    filename: 'aaa.jpg',
    mime: 'image/jpeg',
  });
  fake.files.stat.mockResolvedValue({ isFile: () => true, size: 11 });
  fake.streams.createReadStream.mockReturnValue(Readable.from([Buffer.from('%PDF-1.7\n…')]));
});

describe('итог работ', () => {
  it('владелец заполняет итог, и время ставит сервер', async () => {
    const response = await SET_RESULT(
      request('/api/admin/orders/o1/result', {
        method: 'PATCH',
        body: { extraWork: 'Два метра трассы', report: 'Готово' },
      }),
      ctx,
    );

    expect(response.status).toBe(200);
    const [args] = fake.db.order.update.mock.calls[0] ?? [];
    expect(args?.data).toMatchObject({ extraWork: 'Два метра трассы', report: 'Готово' });
    expect(args?.data?.resultAt).toBeInstanceOf(Date);
  });

  it('монтажник заполняет итог своего наряда: это его отчёт о выезде', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await SET_RESULT(
      request('/api/admin/orders/o1/result', { method: 'PATCH', body: { report: 'Готово' } }),
      ctx,
    );

    expect(response.status).toBe(200);
    expect(fake.db.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'o1', installerId: 'u2' } }),
    );
  });

  it('🔴 чужой наряд — 404, и до записи дело не доходит', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);
    fake.db.order.findFirst.mockResolvedValue(null);

    const response = await SET_RESULT(
      request('/api/admin/orders/o1/result', { method: 'PATCH', body: { report: 'Готово' } }),
      ctx,
    );

    expect(response.status).toBe(404);
    expect(fake.db.order.update).not.toHaveBeenCalled();
  });

  it('🔴 плановых полей итог не правит: цену заказа решает владелец', async () => {
    /* Схема строгая, поэтому цена в теле итога отвергается ещё на границе — а
       записывается ровно три поля, и ни одно из них не про деньги. */
    const rejected = await SET_RESULT(
      request('/api/admin/orders/o1/result', {
        method: 'PATCH',
        body: { report: 'Готово', price: 1 },
      }),
      ctx,
    );
    expect(rejected.status).toBe(400);
    expect(fake.db.order.update).not.toHaveBeenCalled();

    await SET_RESULT(
      request('/api/admin/orders/o1/result', { method: 'PATCH', body: { report: 'Готово' } }),
      ctx,
    );

    const [args] = fake.db.order.update.mock.calls[0] ?? [];
    expect(Object.keys(args?.data ?? {}).sort()).toEqual(['extraWork', 'report', 'resultAt']);
  });

  it('🔴 лишнее поле в теле — отказ, а не молчаливое игнорирование', async () => {
    const response = await SET_RESULT(
      request('/api/admin/orders/o1/result', {
        method: 'PATCH',
        body: { report: 'Готово', status: 'done' },
      }),
      ctx,
    );

    expect(response.status).toBe(400);
    expect(fake.db.order.update).not.toHaveBeenCalled();
  });

  it('🔴 итог пишет историю в той же транзакции, что и запись', async () => {
    await SET_RESULT(
      request('/api/admin/orders/o1/result', { method: 'PATCH', body: { report: 'Готово' } }),
      ctx,
    );

    expect(fake.db.$transaction).toHaveBeenCalled();
    expect(fake.db.orderHistory.createMany).toHaveBeenCalledWith({
      data: [{ orderId: 'o1', authorId: 'u1', text: 'Заполнен итог работ' }],
    });
  });

  it('очистка итога снимает и время: отчёта больше нет', async () => {
    await SET_RESULT(
      request('/api/admin/orders/o1/result', {
        method: 'PATCH',
        body: { extraWork: '', report: '' },
      }),
      ctx,
    );

    const [args] = fake.db.order.update.mock.calls[0] ?? [];
    expect(args?.data?.resultAt).toBeNull();
  });

  it('🔴 монтажнику заметка владельца не приходит и в ответе итога', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const body = await (
      await SET_RESULT(
        request('/api/admin/orders/o1/result', { method: 'PATCH', body: { report: 'Готово' } }),
        ctx,
      )
    ).json();

    expect(body).not.toHaveProperty('ownerNote');
    expect(body).not.toHaveProperty('history');
    expect(body).toHaveProperty('report');
  });
});

describe('чеклист выезда', () => {
  it('монтажник дописывает свой пункт — он помечен как свой', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await ADD_ITEM(
      request('/api/admin/orders/o1/checklist', { method: 'POST', body: { text: 'Взять чехлы' } }),
      ctx,
    );

    expect(response.status).toBe(201);
    expect(fake.db.orderChecklistItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ own: true, orderId: 'o1' }) }),
    );
  });

  it('🔴 в чужой наряд пункт не допишешь', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);
    fake.db.order.findFirst.mockResolvedValue(null);

    const response = await ADD_ITEM(
      request('/api/admin/orders/o1/checklist', { method: 'POST', body: { text: 'Взять чехлы' } }),
      ctx,
    );

    expect(response.status).toBe(404);
    expect(fake.db.orderChecklistItem.create).not.toHaveBeenCalled();
  });

  it('монтажник отмечает пункт при сборах', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await TOGGLE_ITEM(
      request('/api/admin/orders/o1/checklist/i1', { method: 'PATCH', body: { done: true } }),
      itemCtx,
    );

    expect(response.status).toBe(200);
    expect(fake.db.orderChecklistItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'i1' }, data: { done: true } }),
    );
  });

  it('🔴 пункт из чужого наряда не отмечается: сверяется и наряд, и номер пункта', async () => {
    fake.db.orderChecklistItem.findFirst.mockResolvedValue(null);

    const response = await TOGGLE_ITEM(
      request('/api/admin/orders/o1/checklist/i1', { method: 'PATCH', body: { done: true } }),
      itemCtx,
    );

    expect(response.status).toBe(404);
    expect(fake.db.orderChecklistItem.update).not.toHaveBeenCalled();
  });

  it('дописанный пункт удаляется', async () => {
    const response = await REMOVE_ITEM(
      request('/api/admin/orders/o1/checklist/i1', { method: 'DELETE' }),
      itemCtx,
    );

    expect(response.status).toBe(204);
    expect(fake.db.orderChecklistItem.delete).toHaveBeenCalledWith({ where: { id: 'i1' } });
  });

  it('🔴 собранный из наряда пункт не удаляется: он вернётся пересборкой', async () => {
    fake.db.orderChecklistItem.findFirst.mockResolvedValue({ id: 'i1', own: false });

    const response = await REMOVE_ITEM(
      request('/api/admin/orders/o1/checklist/i1', { method: 'DELETE' }),
      itemCtx,
    );

    expect(response.status).toBe(403);
    expect(fake.db.orderChecklistItem.delete).not.toHaveBeenCalled();
  });

  it('🔴 пересборка сохраняет отметку и дописанное, а исчезнувшее убирает', async () => {
    fake.db.order.findUnique.mockResolvedValue({
      id: 'o1',
      type: 'INSTALL',
      heightWorks: false,
      payment: 'COMPANY',
      price: 0,
      units: [],
    });
    fake.db.orderChecklistItem.findMany.mockResolvedValueOnce([
      { id: 'keep', text: 'Стремянка', own: false },
      { id: 'gone', text: 'Позиция 1: медная трасса 4 м', own: false },
      { id: 'mine', text: 'Взять чехлы', own: true },
    ]);
    fake.db.orderChecklistItem.findMany.mockResolvedValueOnce([]);

    const response = await REBUILD(
      request('/api/admin/orders/o1/checklist', { method: 'PUT' }),
      ctx,
    );

    expect(response.status).toBe(200);
    expect(fake.db.orderChecklistItem.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['gone'] } },
    });
    /* Дописанный пункт не удалён и остался в списке — только переставлен. */
    expect(fake.db.orderChecklistItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'mine' } }),
    );
  });
});

describe('документы наряда', () => {
  it('владелец прикладывает договор', async () => {
    const data = new FormData();
    data.append('file', PDF);
    data.append('kind', 'contract');

    const response = await ADD_DOC(form('/api/admin/orders/o1/docs', data), ctx);

    expect(response.status).toBe(201);
    expect(fake.files.writeFile).toHaveBeenCalled();
  });

  it('🔴 имя файла на диске генерирует сервер: оригинальное не используется', async () => {
    const data = new FormData();
    data.append('file', PDF);
    data.append('kind', 'contract');

    await ADD_DOC(form('/api/admin/orders/o1/docs', data), ctx);

    const [path] = fake.files.writeFile.mock.calls[0] ?? [];
    expect(String(path)).not.toContain('Договор');
    expect(String(path)).toMatch(/[0-9a-f-]{36}\.pdf$/);
  });

  it('🔴 документы лежат не там, откуда отдаёт открытый маршрут', async () => {
    const data = new FormData();
    data.append('file', PDF);
    data.append('kind', 'contract');

    await ADD_DOC(form('/api/admin/orders/o1/docs', data), ctx);

    const [dir] = fake.files.mkdir.mock.calls[0] ?? [];
    expect(String(dir)).toMatch(/orders$/);
  });

  it('🔴 тип проверяется по содержимому, а не по расширению', async () => {
    const data = new FormData();
    data.append('file', new File([Buffer.from('<?php echo 1; ?>')], 'акт.pdf'));
    data.append('kind', 'act');

    const response = await ADD_DOC(form('/api/admin/orders/o1/docs', data), ctx);

    expect(response.status).toBe(400);
    expect(fake.files.writeFile).not.toHaveBeenCalled();
  });

  it('осиротевший файл убирается за собой, если запись не создалась', async () => {
    fake.db.orderDocument.create.mockRejectedValue(new Error('база отказала'));

    const data = new FormData();
    data.append('file', PDF);
    data.append('kind', 'contract');

    const response = await ADD_DOC(form('/api/admin/orders/o1/docs', data), ctx);

    expect(response.status).toBe(500);
    expect(fake.files.rm).toHaveBeenCalled();
  });

  it('🔴 монтажник документы не прикладывает', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const data = new FormData();
    data.append('file', PDF);
    data.append('kind', 'contract');

    const response = await ADD_DOC(form('/api/admin/orders/o1/docs', data), ctx);

    expect(response.status).toBe(403);
    expect(fake.files.writeFile).not.toHaveBeenCalled();
  });

  it('🔴 монтажник документы не удаляет', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await REMOVE_DOC(
      request('/api/admin/orders/o1/docs/d1', { method: 'DELETE' }),
      docCtx,
    );

    expect(response.status).toBe(403);
    expect(fake.db.orderDocument.delete).not.toHaveBeenCalled();
  });

  it('владелец удаляет документ вместе с файлом', async () => {
    const response = await REMOVE_DOC(
      request('/api/admin/orders/o1/docs/d1', { method: 'DELETE' }),
      docCtx,
    );

    expect(response.status).toBe(204);
    expect(fake.db.orderDocument.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
    expect(fake.files.rm).toHaveBeenCalled();
  });
});

describe('🔴 выдача файла документа', () => {
  it('без сессии файл не отдаётся: это договор с персональными данными', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await GET_FILE(request('/api/admin/orders/o1/docs/d1/file'), docCtx);

    expect(response.status).toBe(401);
    expect(fake.streams.createReadStream).not.toHaveBeenCalled();
  });

  it('монтажник получает документ своего наряда', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const response = await GET_FILE(request('/api/admin/orders/o1/docs/d1/file'), docCtx);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('🔴 из чужого наряда файл не выдаётся — 404 и ни одного чтения с диска', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);
    fake.db.order.findFirst.mockResolvedValue(null);

    const response = await GET_FILE(request('/api/admin/orders/o1/docs/d1/file'), docCtx);

    expect(response.status).toBe(404);
    expect(fake.streams.createReadStream).not.toHaveBeenCalled();
  });

  it('🔴 документ ищется внутри наряда: чужой номер по своему наряду не откроется', async () => {
    fake.db.orderDocument.findFirst.mockResolvedValue(null);

    const response = await GET_FILE(request('/api/admin/orders/o1/docs/d1/file'), docCtx);

    expect(response.status).toBe(404);
    expect(fake.db.orderDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'd1', orderId: 'o1' } }),
    );
  });

  it('имя в заголовке — подпись документа, а не путь на диске', async () => {
    const response = await GET_FILE(request('/api/admin/orders/o1/docs/d1/file'), docCtx);

    expect(response.headers.get('Content-Disposition')).toContain(
      encodeURIComponent('Договор.pdf'),
    );
  });
});

describe('фотографии наряда', () => {
  it('монтажник грузит фото выполненных работ', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const data = new FormData();
    data.append('photo', new File([Buffer.from([0xff, 0xd8, 0xff])], 'после.jpg'));
    data.append('stage', 'after');

    const response = await ADD_PHOTO(form('/api/admin/orders/o1/photos', data), ctx);

    expect(response.status).toBe(201);
    expect(fake.uploads.saveImage).toHaveBeenCalled();
  });

  it('🔴 фото места установки грузит владелец, а не монтажник', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);

    const data = new FormData();
    data.append('photo', new File([Buffer.from([0xff, 0xd8, 0xff])], 'до.jpg'));
    data.append('stage', 'before');

    const response = await ADD_PHOTO(form('/api/admin/orders/o1/photos', data), ctx);

    expect(response.status).toBe(403);
    expect(fake.uploads.saveImage).not.toHaveBeenCalled();
  });

  it('🔴 фото «до» монтажник и не удаляет', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);
    fake.db.orderPhoto.findFirst.mockResolvedValue({
      id: 'p1',
      stage: 'BEFORE',
      url: '/api/media/aaa.jpg',
    });

    const response = await REMOVE_PHOTO(
      request('/api/admin/orders/o1/photos/p1', { method: 'DELETE' }),
      photoCtx,
    );

    expect(response.status).toBe(403);
    expect(fake.db.orderPhoto.delete).not.toHaveBeenCalled();
  });

  it('своё фото «после» монтажник убирает вместе с файлом', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(installer);
    fake.db.orderPhoto.findFirst.mockResolvedValue({
      id: 'p1',
      stage: 'AFTER',
      url: '/api/media/aaa.jpg',
    });

    const response = await REMOVE_PHOTO(
      request('/api/admin/orders/o1/photos/p1', { method: 'DELETE' }),
      photoCtx,
    );

    expect(response.status).toBe(204);
    expect(fake.uploads.deleteStoredImage).toHaveBeenCalledWith('/api/media/aaa.jpg');
  });

  it('неизвестный этап — отказ с названным полем', async () => {
    const data = new FormData();
    data.append('photo', new File([Buffer.from([0xff, 0xd8, 0xff])], 'фото.jpg'));
    data.append('stage', 'потом');

    const response = await ADD_PHOTO(form('/api/admin/orders/o1/photos', data), ctx);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { field: 'stage' } });
  });
});
