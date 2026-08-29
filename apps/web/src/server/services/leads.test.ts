// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Правила приёма обращения — те, за нарушение которых владелец платит:
 * заявка обязана оказаться в базе, уведомление — в очереди, и оба события
 * обязаны быть неразделимы (инвариант 2, ADR-091).
 */
const mocks = vi.hoisted(() => ({
  leadCreate: vi.fn(),
  enqueue: vi.fn(),
  saveProtectedImage: vi.fn(),
  deleteProtectedImage: vi.fn(),
  /** Идёт ли прямо сейчас транзакция — этим проверяется неразделимость. */
  inTransaction: false,
}));

vi.mock('@/server/db', () => {
  const client = { lead: { create: mocks.leadCreate } };

  return {
    db: {
      ...client,
      $transaction: async (run: (tx: typeof client) => Promise<unknown>): Promise<unknown> => {
        mocks.inTransaction = true;
        try {
          return await run(client);
        } finally {
          mocks.inTransaction = false;
        }
      },
    },
  };
});

vi.mock('@/server/notifications/queue', () => ({ enqueueNotification: mocks.enqueue }));

vi.mock('@/server/uploads/store', () => ({
  saveProtectedImage: mocks.saveProtectedImage,
  deleteProtectedImage: mocks.deleteProtectedImage,
}));

import { createLead, createToReminder } from '@/server/services/leads';
import type { LeadFormInput, ToReminderFormInput } from '@/server/intake/schemas';
import type { Tracking } from '@/server/intake/tracking';
import type { LeadContext } from '@/entities/lead/model';

const NO_TRACKING: Tracking = { sourceUrl: null, referrer: null, utm: null };

/** Имя, какое выдаёт хранилище: uuid и расширение, без всякого адреса. */
const PHOTO_FILENAME = '0f9c1f4e-6f3a-4c69-9c1a-8a5b6d7e8f90.webp';

/* Согласие обязательно в самой схеме формы (152-ФЗ): без него заявка не
   доходит до сервиса вовсе, поэтому фикстура всегда с ним. */
function leadForm(extra: Partial<LeadFormInput> = {}): LeadFormInput {
  return { name: 'Пётр', phone: '+7 910 123-45-67', consent: true, ...extra };
}

function reminderForm(extra: Partial<ToReminderFormInput> = {}): ToReminderFormInput {
  return { phone: '89101234567', consent: true, ...extra };
}

const row = {
  id: 'l1',
  name: 'Пётр',
  phone: '+79101234567',
  topic: 'Консультация',
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
  consentAt: new Date('2026-08-28T09:00:00Z'),
  status: 'NEW' as const,
  managerComment: null,
  clientId: null,
  createdAt: new Date('2026-08-28T09:00:00Z'),
  updatedAt: new Date('2026-08-28T09:00:00Z'),
};

/** Была ли очередь вызвана внутри транзакции — заполняется самим двойником. */
let enqueuedInTransaction: boolean | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  enqueuedInTransaction = null;
  mocks.leadCreate.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }): Promise<unknown> => ({ ...row, ...data }),
  );
  mocks.enqueue.mockImplementation(async (): Promise<number> => {
    enqueuedInTransaction = mocks.inTransaction;
    return 1;
  });
  mocks.saveProtectedImage.mockResolvedValue({ filename: PHOTO_FILENAME, mime: 'image/webp' });
  mocks.deleteProtectedImage.mockResolvedValue(undefined);
});

describe('приём заявки', () => {
  it('🔴 пишет заявку раньше, чем ставит уведомление в очередь', async () => {
    await createLead({
      form: leadForm(),
      tracking: NO_TRACKING,
      context: null,
      photo: null,
    });

    expect(mocks.leadCreate).toHaveBeenCalledTimes(1);
    expect(mocks.enqueue).toHaveBeenCalledTimes(1);
    expect(mocks.leadCreate.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.enqueue.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('🔴 обе записи идут одной транзакцией: уведомление ставится внутри неё', async () => {
    await createLead({
      form: leadForm(),
      tracking: NO_TRACKING,
      context: null,
      photo: null,
    });

    expect(enqueuedInTransaction).toBe(true);
  });

  it('🔴 фиксирует момент согласия на обработку персональных данных', async () => {
    await createLead({
      form: leadForm(),
      tracking: NO_TRACKING,
      context: null,
      photo: null,
    });

    const { data } = mocks.leadCreate.mock.calls[0]?.[0] ?? {};
    expect(data.consentAt).toBeInstanceOf(Date);
  });

  it('приводит телефон к единому виду — по нему узнают повторное обращение', async () => {
    await createLead({
      form: leadForm({ phone: '8 (910) 123-45-67' }),
      tracking: NO_TRACKING,
      context: null,
      photo: null,
    });

    const { data } = mocks.leadCreate.mock.calls[0]?.[0] ?? {};
    expect(data.phone).toBe('+79101234567');
  });

  it('без темы это обращение за консультацией', async () => {
    await createLead({
      form: leadForm({ phone: '+79101234567' }),
      tracking: NO_TRACKING,
      context: null,
      photo: null,
    });

    const { data } = mocks.leadCreate.mock.calls[0]?.[0] ?? {};
    expect(data.topic).toBe('Консультация');
  });

  it('без рекламных меток колонка остаётся пустой, а не пустым объектом', async () => {
    await createLead({
      form: leadForm({ phone: '+79101234567' }),
      tracking: NO_TRACKING,
      context: null,
      photo: null,
    });

    const { data } = mocks.leadCreate.mock.calls[0]?.[0] ?? {};
    expect(data).not.toHaveProperty('utm');
  });

  it('метки и страница-источник доходят до записи', async () => {
    await createLead({
      form: leadForm({ phone: '+79101234567' }),
      tracking: {
        sourceUrl: 'https://example.ru/catalog',
        referrer: 'https://yandex.ru/',
        utm: { utm_source: 'yandex' },
      },
      context: null,
      photo: null,
    });

    const { data } = mocks.leadCreate.mock.calls[0]?.[0] ?? {};
    expect(data.sourceUrl).toBe('https://example.ru/catalog');
    expect(data.utm).toEqual({ utm_source: 'yandex' });
  });

  it('снимок экрана уходит и в запись, и в уведомление', async () => {
    const context: LeadContext = {
      estimate: null,
      model: { slug: 'gree-bora', name: 'Gree Bora', price: 32_000, oldPrice: null },
      pick: null,
      liked: [],
    };

    await createLead({
      form: leadForm({ phone: '+79101234567' }),
      tracking: NO_TRACKING,
      context,
      photo: null,
    });

    const { data } = mocks.leadCreate.mock.calls[0]?.[0] ?? {};
    expect(data.context).toEqual(context);
    expect(mocks.enqueue.mock.calls[0]?.[0]).toMatchObject({ kind: 'lead', context });
  });
});

describe('фотография к заявке', () => {
  it('🔴 уходит в закрытое хранилище, и в базу попадает имя файла, а не адрес', async () => {
    await createLead({
      form: leadForm({ phone: '+79101234567' }),
      tracking: NO_TRACKING,
      context: null,
      photo: new File(['x'], 'room.jpg', { type: 'image/jpeg' }),
    });

    expect(mocks.saveProtectedImage).toHaveBeenCalledTimes(1);
    const { data } = mocks.leadCreate.mock.calls[0]?.[0] ?? {};
    /* Имя файла, а не `/api/media/…`: публичной отдачи у снимка комнаты
       клиента нет вовсе (ADR-171). */
    expect(data.photo).toBe(PHOTO_FILENAME);
  });

  it('🔴 упавшая запись не оставляет файл сиротой на диске', async () => {
    mocks.leadCreate.mockRejectedValueOnce(new Error('база недоступна'));

    await expect(
      createLead({
        form: leadForm({ phone: '+79101234567' }),
        tracking: NO_TRACKING,
        context: null,
        photo: new File(['x'], 'room.jpg', { type: 'image/jpeg' }),
      }),
    ).rejects.toThrow('база недоступна');

    expect(mocks.deleteProtectedImage).toHaveBeenCalledWith(PHOTO_FILENAME);
  });

  it('заявка без фотографии ничего не сохраняет и ничего не удаляет', async () => {
    await createLead({
      form: leadForm({ phone: '+79101234567' }),
      tracking: NO_TRACKING,
      context: null,
      photo: null,
    });

    expect(mocks.saveProtectedImage).not.toHaveBeenCalled();
    expect(mocks.deleteProtectedImage).not.toHaveBeenCalled();
  });
});

describe('напоминание о ТО', () => {
  it('🔴 подчиняется тому же правилу: запись, затем очередь, одной транзакцией', async () => {
    await createToReminder({ form: reminderForm(), tracking: NO_TRACKING });

    expect(mocks.leadCreate.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.enqueue.mock.invocationCallOrder[0] ?? 0,
    );
    expect(enqueuedInTransaction).toBe(true);
  });

  it('это обращение за ТО, а не безымянная строка в списке', async () => {
    await createToReminder({
      form: reminderForm({ when: 'прошлым летом' }),
      tracking: NO_TRACKING,
    });

    const { data } = mocks.leadCreate.mock.calls[0]?.[0] ?? {};
    expect(data.topic).toBe('ТО и чистка');
    expect(data.name).not.toBe('');
    expect(data.comment).toBe('прошлым летом');
    expect(data.consentAt).toBeInstanceOf(Date);
  });

  it('срок обслуживания уходит владельцу в уведомлении', async () => {
    await createToReminder({ form: reminderForm({ when: 'не помню' }), tracking: NO_TRACKING });

    expect(mocks.enqueue.mock.calls[0]?.[0]).toMatchObject({
      kind: 'to-reminder',
      when: 'не помню',
    });
  });
});
