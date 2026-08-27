import type { Prisma } from '@prisma/client';

import type { OrderCard } from '@/entities/order/model';
import { db } from '@/server/db';
import { enqueueNotification } from './queue';
import type { OrderBrief, OrderBriefField, OrderCancelReason, OrderUnitBrief } from './types';

/**
 * Уведомления о наряде — единственное место, где событие наряда превращается
 * в сообщение монтажнику.
 *
 * 🔴 Ставит их слой, который меняет наряд: маршрут вызывает одну из функций
 * ниже сразу после записи, при возможности — тем же транзакционным клиентом
 * (ADR-091). Полезная нагрузка — самодостаточный снимок: воркер не ходит за
 * нарядом в базу заново.
 */

/**
 * 🔴 Вводные наряда — ровно проекция под монтажника (docs/API.md §13).
 *
 * Определение сознательно механическое: **вводные — это то, что монтажник
 * видит в своей карточке**. Отсюда следует и обратное — заметка владельца,
 * удержание и сумма заказа при безналичной оплате изменением вводных не
 * являются никогда: человек их не видит, и сообщать ему об их правке значило
 * бы обойти разграничение доступа сообщением (ADR-114).
 *
 * Из проекции исключены `id`, `number`, `createdAt` и `status`: первые три
 * неизменны, а статус живёт своими событиями — назначением, отменой и
 * действиями самого монтажника.
 *
 * Итог работ (`extraWork`, `report`, `resultAt`) в вводные тоже не входит:
 * его заполняет сам монтажник после выезда, и слать ему сообщение о том, что
 * он только что записал, — шум, а не уведомление.
 */
export function installerBrief(order: OrderCard): OrderBrief {
  return {
    orderId: order.id,
    number: order.number,
    type: order.type,
    at: order.at,
    durationMin: order.durationMin,
    address: order.address,
    intercom: order.intercom,
    phone2: order.phone2,
    floor: order.floor,
    heightWorks: order.heightWorks,
    clientName: order.client.name,
    clientPhone: order.client.phone,
    payment: order.payment,
    /* Сумма заказа — только при оплате наличными: её нужно принять от клиента.
       В остальных случаях ключа нет вовсе, а не `null`. */
    ...(order.payment === 'cash_to_installer' && order.price !== undefined
      ? { price: order.price }
      : {}),
    installerFee: order.installerFee,
    comment: order.comment,
    units: order.units.map((unit) => ({
      equip: unit.equip,
      model: unit.model,
      source: unit.source,
      trassaM: unit.trassaM,
      diameter: unit.diameter,
      shtrob: unit.shtrob,
    })),
  };
}

function sameUnits(before: readonly OrderUnitBrief[], after: readonly OrderUnitBrief[]): boolean {
  if (before.length !== after.length) return false;

  return before.every((unit, index) => {
    const other = after[index];
    if (other === undefined) return false;

    return (
      unit.equip === other.equip &&
      unit.model === other.model &&
      unit.source === other.source &&
      unit.trassaM === other.trassaM &&
      unit.diameter === other.diameter &&
      unit.shtrob === other.shtrob
    );
  });
}

/** Что из вводных разошлось между двумя снимками. Пустой список — писать не о чем. */
export function briefChanges(before: OrderBrief, after: OrderBrief): readonly OrderBriefField[] {
  const changed: OrderBriefField[] = [];

  if (before.type !== after.type) changed.push('type');
  if (before.at !== after.at) changed.push('at');
  if (before.durationMin !== after.durationMin) changed.push('durationMin');
  if (before.address !== after.address) changed.push('address');
  if (before.intercom !== after.intercom) changed.push('intercom');
  if (before.phone2 !== after.phone2) changed.push('phone2');
  if (before.floor !== after.floor) changed.push('floor');
  if (before.heightWorks !== after.heightWorks) changed.push('heightWorks');
  if (before.clientName !== after.clientName || before.clientPhone !== after.clientPhone) {
    changed.push('client');
  }
  if (before.payment !== after.payment) changed.push('payment');
  if (before.price !== after.price) changed.push('price');
  if (before.installerFee !== after.installerFee) changed.push('installerFee');
  if (before.comment !== after.comment) changed.push('comment');
  if (!sameUnits(before.units, after.units)) changed.push('units');

  return changed;
}

function installerOf(order: OrderCard): string | null {
  return order.installer?.id ?? null;
}

async function assigned(
  order: OrderCard,
  recipientId: string,
  client: Prisma.TransactionClient,
): Promise<number> {
  return enqueueNotification({ kind: 'order-assigned', ...installerBrief(order) }, client, {
    recipientId,
  });
}

async function cancelled(
  order: OrderCard,
  recipientId: string,
  reason: OrderCancelReason,
  client: Prisma.TransactionClient,
): Promise<number> {
  return enqueueNotification(
    { kind: 'order-cancelled', ...installerBrief(order), reason },
    client,
    {
      recipientId,
    },
  );
}

/**
 * Наряд заведён. Исполнителя назначили сразу — он узнаёт об этом сейчас;
 * назначат позже — уведомление уйдёт из `notifyOrderUpdated`.
 */
export async function notifyOrderCreated(
  order: OrderCard,
  client: Prisma.TransactionClient = db,
): Promise<number> {
  const recipientId = installerOf(order);
  if (recipientId === null || order.status === 'cancelled') return 0;

  return assigned(order, recipientId, client);
}

/**
 * Наряд правили. Одно место решает все три случая сразу, потому что по
 * отдельности их легко перепутать: переназначение — это одновременно отмена
 * у прежнего исполнителя и назначение новому, и разнести эти два сообщения по
 * разным вызовам значит однажды забыть одно из них.
 *
 * `before` и `after` — снимки владельца (`OrderCard` целиком): проекцию под
 * монтажника функция делает сама, и разница, посчитанная по урезанной
 * карточке, молча потеряла бы часть вводных.
 */
export async function notifyOrderUpdated(
  before: OrderCard,
  after: OrderCard,
  client: Prisma.TransactionClient = db,
): Promise<number> {
  const was = installerOf(before);
  const now = installerOf(after);

  // Отменённый наряд — событие для того, кто на него ехал, кем бы он ни был
  if (after.status === 'cancelled') {
    if (before.status === 'cancelled') return 0;
    const recipientId = now ?? was;
    return recipientId === null ? 0 : cancelled(after, recipientId, 'cancelled', client);
  }

  if (was !== now) {
    const off =
      was === null
        ? 0
        : await cancelled(before, was, now === null ? 'unassigned' : 'reassigned', client);
    const on = now === null ? 0 : await assigned(after, now, client);
    return off + on;
  }

  if (now === null) return 0;

  /* Наряд вернули в работу из отказа: для монтажника это то же самое, что
     назначение заново — выезд, о котором он уже перестал думать. */
  if (before.status === 'cancelled') return assigned(after, now, client);

  const changes = briefChanges(installerBrief(before), installerBrief(after));
  if (changes.length === 0) return 0;

  return enqueueNotification(
    // копия списка: снимок события не должен зависеть от массива вызывающего
    { kind: 'order-changed', ...installerBrief(after), changes: [...changes] },
    client,
    { recipientId: now },
  );
}

/** Наряд удалён из базы. Для монтажника это отмена: выезжать некуда. */
export async function notifyOrderRemoved(
  order: OrderCard,
  client: Prisma.TransactionClient = db,
): Promise<number> {
  const recipientId = installerOf(order);
  if (recipientId === null || order.status === 'cancelled') return 0;

  return cancelled(order, recipientId, 'cancelled', client);
}
