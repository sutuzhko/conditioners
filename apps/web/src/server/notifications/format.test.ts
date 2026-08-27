// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import type { NotificationPayload, OrderBrief } from './types';

const { testEnv } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-format',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'direct',
  } as Record<string, unknown>,
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));

const { adminLink, formatDuration, notificationSubject, notificationText } =
  await import('./format');

const BRIEF: OrderBrief = {
  orderId: 'o-1',
  number: 1059,
  type: 'install',
  at: '2026-08-28T08:00:00.000Z',
  durationMin: 180,
  address: 'Тула, Первомайская, 12, кв. 4',
  intercom: '24К',
  phone2: null,
  floor: 5,
  heightWorks: true,
  clientName: 'Ирина Соколова',
  clientPhone: '+7 (910) 155-24-68',
  payment: 'company',
  installerFee: 9000,
  comment: 'Домофон не работает, звонить на телефон',
  units: [
    {
      equip: 'conditioner',
      model: 'Сплит-система 09',
      source: 'ours',
      trassaM: 4,
      diameter: '1/4–3/8',
      shtrob: true,
    },
  ],
};

const ASSIGNED: NotificationPayload = { kind: 'order-assigned', ...BRIEF };

describe('Сообщение монтажнику о наряде', () => {
  it('несёт всё, ради чего он выезжает', () => {
    const text = notificationText(ASSIGNED);

    expect(text).toContain('№ 1059');
    expect(text).toContain('Монтаж');
    expect(text).toContain('Тула, Первомайская, 12, кв. 4');
    expect(text).toContain('Ирина Соколова');
    expect(text).toContain('домофон 24К, этаж 5');
    expect(text).toContain('Высотные работы');
    expect(text).toContain('Сплит-система 09');
    expect(text).toContain('Домофон не работает');
  });

  it('🔴 при безналичной оплате суммы заказа в сообщении нет', () => {
    const text = notificationText(ASSIGNED);

    expect(text).not.toContain('38');
    expect(text).toContain('Ваше вознаграждение');
  });

  it('🔴 при оплате наличными сумма названа: её принимают от клиента', () => {
    const text = notificationText({
      kind: 'order-assigned',
      ...BRIEF,
      payment: 'cash_to_installer',
      price: 38_500,
    });

    expect(text).toContain('Принять от клиента');
    expect(text).toContain('38');
  });

  it('правка вводных называет, что именно поменялось', () => {
    const text = notificationText({
      kind: 'order-changed',
      ...BRIEF,
      changes: ['at', 'address', 'units'],
    });

    expect(text).toContain('дата и время, адрес, состав оборудования');
    expect(text).toContain('№ 1059');
  });

  it('отмена, передача другому и снятие — три разных факта', () => {
    const cancelled = notificationText({ kind: 'order-cancelled', ...BRIEF, reason: 'cancelled' });
    const reassigned = notificationText({
      kind: 'order-cancelled',
      ...BRIEF,
      reason: 'reassigned',
    });
    const unassigned = notificationText({
      kind: 'order-cancelled',
      ...BRIEF,
      reason: 'unassigned',
    });

    expect(cancelled).toContain('отменён');
    expect(reassigned).toContain('передан другому');
    expect(unassigned).toContain('снят с вас');
    expect(cancelled).toContain('Выезжать не нужно');
  });

  it('тема письма отличает событие: их приходит по несколько в день', () => {
    expect(notificationSubject(ASSIGNED)).toContain('назначен наряд № 1059');
    expect(notificationSubject({ kind: 'order-changed', ...BRIEF, changes: ['at'] })).toContain(
      'Изменился наряд',
    );
  });

  it('ссылка ведёт в карточку наряда, а не в список', () => {
    expect(adminLink(ASSIGNED)).toBe('https://example.test/admin/orders/o-1');
  });

  it('длительность читается часами, а не минутами', () => {
    expect(formatDuration(180)).toBe('3 ч');
    expect(formatDuration(90)).toBe('1 ч 30 мин');
    expect(formatDuration(45)).toBe('45 мин');
  });
});

describe('Сообщения владельцу', () => {
  it('заявка сохраняет привычную раскладку строк', () => {
    const text = notificationText({
      kind: 'lead',
      leadId: 'l-1',
      name: 'Игорь',
      phone: '+79001234567',
      topic: 'Монтаж и установка',
      place: null,
      qty: null,
      callTime: null,
      address: null,
      comment: null,
      photo: null,
      sourceUrl: null,
    });

    expect(text).toContain('🆕 Новая заявка с сайта');
    expect(text).toContain('🧭 Тема: Монтаж и установка');
    expect(text).toContain('📍 Адрес: —');
  });
});
