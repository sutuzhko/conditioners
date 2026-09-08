// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { notificationPayloadSchema } from './types';

/**
 * 🔴 Уведомление, поставленное в очередь до выкладки, обязано доехать
 * (ADR-343, инвариант 2 по духу).
 *
 * Снимок лежит в базе как есть, а выкладка меняет схему разбора: вид работ
 * наряда сменился с ключа `type` на подпись `workType`. Запись, поставленная
 * минутой раньше, разбор бы не прошла **никогда** — воркер повторил бы её до
 * `MAX_ATTEMPTS` и положил в `FAILED`. За такой записью стоит наряд, о котором
 * монтажник не узнает.
 *
 * Окно невелико, но не нулевое: уведомление, ушедшее в откат по недоступному
 * Telegram незадолго до выкладки, ждёт следующей попытки минутами и переживает
 * деплой.
 */

/** Снимок наряда в том виде, в каком его писала версия до ADR-343. */
const LEGACY_ASSIGNED = {
  kind: 'order-assigned',
  orderId: 'o-1',
  number: 1059,
  type: 'install',
  at: '2026-08-28T08:00:00.000Z',
  durationMin: 180,
  address: 'Тула, Первомайская, 12, кв. 4',
  intercom: null,
  phone2: null,
  floor: null,
  heightWorks: false,
  clientName: 'Ирина Соколова',
  clientPhone: '+7 (910) 155-24-68',
  payment: 'company',
  installerFee: 9000,
  comment: null,
  units: [],
};

describe('снимок наряда старого формата', () => {
  it.each([
    ['install', 'Монтаж'],
    ['service', 'Обслуживание'],
    ['repair', 'Ремонт'],
  ])('🔴 ключ «%s» разбирается и становится подписью «%s»', (type, title) => {
    const parsed = notificationPayloadSchema.parse({ ...LEGACY_ASSIGNED, type });

    expect(parsed).toMatchObject({ kind: 'order-assigned', workType: title });
    /* Ключа старой формы в разобранном снимке не остаётся: дальше по коду
       живёт одно поле, а не два. */
    expect(parsed).not.toHaveProperty('type');
  });

  it('🔴 отказ и правка наряда разбираются так же', () => {
    const cancelled = notificationPayloadSchema.parse({
      ...LEGACY_ASSIGNED,
      kind: 'order-cancelled',
      reason: 'cancelled',
    });

    expect(cancelled).toMatchObject({ kind: 'order-cancelled', workType: 'Монтаж' });
  });

  /**
   * 🔴 Список изменившихся полей знал тот же ключ. Не переведи его — и снимок
   * правки наряда упал бы на перечислении полей, то есть ровно там же, где и
   * до починки, только по другой причине.
   */
  it('🔴 «изменился тип работ» остаётся в списке правок', () => {
    const changed = notificationPayloadSchema.parse({
      ...LEGACY_ASSIGNED,
      kind: 'order-changed',
      changes: ['type', 'at'],
    });

    expect(changed).toMatchObject({ workType: 'Монтаж', changes: ['workType', 'at'] });
  });

  /** Сегодняшний снимок перевод не трогает — иначе он ломал бы рабочий путь. */
  it('снимок нового формата проходит нетронутым', () => {
    const today = notificationPayloadSchema.parse({
      ...LEGACY_ASSIGNED,
      type: undefined,
      workType: 'Чистка дренажа',
    });

    expect(today).toMatchObject({ workType: 'Чистка дренажа' });
  });

  /**
   * Перевод узкий намеренно: он чинит один формат, а не прощает мусор. Снимок
   * без вида работ вовсе разбор не проходит — иначе сообщение уехало бы
   * монтажнику с пустой строкой вместо работы.
   */
  it('снимок без вида работ в обеих формах отклоняется', () => {
    const noWorkType = { ...LEGACY_ASSIGNED, type: undefined };

    expect(notificationPayloadSchema.safeParse(noWorkType).success).toBe(false);
  });

  /** Заявка и остаток склада перевода не касаются: там вида работ нет. */
  it('снимки других событий не задеты', () => {
    const stock = notificationPayloadSchema.parse({
      kind: 'stock-low',
      itemId: 's1',
      name: 'Фреон R410a',
      group: null,
      unit: 'kilogram',
      qty: 2,
      minQty: 5,
    });

    expect(stock).toMatchObject({ kind: 'stock-low', name: 'Фреон R410a' });
  });
});
