import type { Prisma } from '@prisma/client';

import type { MarginMaterial } from '@/entities/order/lib/margin';
import { db } from '@/server/db';

/**
 * Материалы нарядов: то, из чего считается их маржа (ADR-310, issue #628).
 *
 * 🔴 Отдельный файл, а не функция в `orders.ts` или `stock.ts`. Склад уже
 * берёт у нарядов `requireAccess` и `Viewer`, и обратный импорт замкнул бы
 * два самых больших репозитория в кольцо. Здесь же нет ничего, кроме одного
 * запроса и раскладки его строк по нарядам.
 *
 * 🔴 Роль не проверяется: это выборка, а не доступ. Маржу спрашивает только
 * владелец, и следит за этим `orders.ts` — там же, где решается, какие ключи
 * вообще попадут в карточку (ADR-092).
 */

/**
 * Виды движения, из которых складывается расход наряда.
 *
 * Приход, перемещение и инвентаризация к наряду не относятся: `orderId` есть
 * только у списания и возврата (docs/API.md §14).
 */
const MATERIAL_KINDS = ['CONSUME', 'RETURN'] as const;

/**
 * Раскладывает движения по нарядам.
 *
 * Условие приходит целиком снаружи, потому что вызывающих двое и спрашивают
 * они разное: строка списка — про свои восемь нарядов, итог периода — про всю
 * отобранную историю. Условие наряда при этом остаётся тем же объектом
 * Prisma, что и в самом списке, — второй его копии, способной разойтись с
 * первой, здесь нет намеренно.
 */
async function materialsBy(
  where: Prisma.StockMovementWhereInput,
): Promise<ReadonlyMap<string, readonly MarginMaterial[]>> {
  const rows = await db.stockMovement.findMany({
    where: { ...where, kind: { in: [...MATERIAL_KINDS] } },
    /* Четыре колонки, а не строка целиком: серийные номера, основание и автор
       к марже отношения не имеют, а движений за год набегает много. */
    select: { orderId: true, kind: true, qty: true, unitCost: true },
  });

  const byOrder = new Map<string, MarginMaterial[]>();

  for (const row of rows) {
    /* `orderId` у списания и возврата есть всегда, но схема разрешает `null`:
       наряд мог быть удалён, и движение осталось сиротой (`SetNull`). Такое
       движение не принадлежит ни одному наряду и в маржу не входит. */
    if (row.orderId === null) continue;

    const list = byOrder.get(row.orderId) ?? [];
    list.push({
      kind: row.kind === 'RETURN' ? 'return' : 'consume',
      qty: row.qty.toNumber(),
      unitCost: row.unitCost,
    });
    byOrder.set(row.orderId, list);
  }

  return byOrder;
}

/** Материалы перечисленных нарядов — строки одной страницы списка. */
export async function materialsOfOrders(
  orderIds: readonly string[],
): Promise<ReadonlyMap<string, readonly MarginMaterial[]>> {
  if (orderIds.length === 0) return new Map();

  return materialsBy({ orderId: { in: [...orderIds] } });
}

/**
 * Материалы всех нарядов, попавших в отбор, — итог периода.
 *
 * Условие наряда переиспользуется через связь, а не переписывается списком
 * идентификаторов: список пришлось бы сначала вычитать вторым запросом, а на
 * периоде «за всё время» он вырос бы во всю таблицу нарядов.
 */
export async function materialsOfPeriod(
  orders: Prisma.OrderWhereInput,
): Promise<ReadonlyMap<string, readonly MarginMaterial[]>> {
  return materialsBy({ order: { is: orders } });
}
