import { expect, test } from '@playwright/test';
import { z } from 'zod';

import { withAdmin, withInstaller, type AdminApi } from './support/admin-api';

/**
 * Маржа наряда и закупочная цена позиции склада (issue #628, ADR-310).
 *
 * 🔴 Сценарий доходит до базы, а не проверяет разметку: цена пишется
 * маршрутом и читается обратно, расход собирается настоящими движениями, а
 * снимок цены проверяется переоценкой позиции после списания. Юнит на чистую
 * функцию маржи ни одного из этих утверждений не показывает — он считает по
 * тем числам, которые ему дали.
 *
 * Свои записи, а не демонстрационные: позиция с заведённой закупочной ценой
 * на стенде бывает, а бывает и нет, — и сценарий, который тогда пропускает
 * себя, ничего не проверяет, но выглядит зелёным.
 */
const mark = (): string => `E2E-маржа-${Date.now()}`;

/**
 * Маржа, как её отдаёт API, — размеченное объединение (docs/API.md §13).
 *
 * Схемой, а не приведением типа: ответ приходит снаружи, и `as` на нём
 * означал бы, что тест верит серверу на слово ровно там, где его и проверяет.
 */
const marginSchema = z.discriminatedUnion('known', [
  z.object({ known: z.literal(true), materials: z.number(), value: z.number() }),
  z.object({ known: z.literal(false), unpriced: z.number() }),
]);

function marginOf(order: Record<string, unknown>): z.infer<typeof marginSchema> {
  return marginSchema.parse(order['margin']);
}

/**
 * Обнуляет позицию и сдаёт её в архив.
 *
 * 🔴 Позиция уходит в архив только пустой (ADR-134), а после списания на ней
 * остаётся остаток: без обнуления уборка молча не срабатывала бы и стенд
 * копил бы позиции каждого прогона. Обнуление — инвентаризацией с
 * основанием, единственным способом поправить остаток руками.
 */
async function dropStockItem(
  api: AdminApi,
  itemId: string,
  zoneId: string,
  rest: number,
): Promise<void> {
  /* Сценарий мог выйти до первого движения — тогда обнулять нечего и незачем. */
  if (zoneId !== '' && rest !== 0) {
    await api.stockMove({
      kind: 'count',
      itemId,
      qty: -rest,
      toZoneId: zoneId,
      reason: 'Уборка после сквозного сценария',
    });
  }
  await api.deleteStockItem(itemId);
}

test.describe('маржа наряда считается по движениям склада', () => {
  test('🔴 списанный материал уменьшает маржу на свою закупочную цену', async () => {
    await withAdmin(async (api) => {
      const tag = mark();
      const client = await api.createClient({
        name: `Клиент ${tag}`,
        phone: '+7 (910) 000-22-33',
        address: `Тула, ${tag}, 1`,
      });
      const order = await api.createOrder({
        clientId: client.id,
        address: `Тула, ${tag}, 1`,
        price: 30_000,
      });
      /* `createOrder` ставит выплату монтажнику 3 000 ₽ — она и вычитается. */
      const item = await api.createStockItem({
        name: `Труба ${tag}`,
        unit: 'meter',
        purchasePrice: 250,
      });

      /* Зона нужна и уборке в `finally`, поэтому живёт снаружи `try`. */
      let warehouseId = '';

      try {
        const zones = await api.stockZones();
        const warehouse = zones.find((zone) => zone.kind === 'warehouse');
        expect(warehouse, 'на стенде нет ни одного склада: списывать неоткуда').toBeDefined();
        if (warehouse === undefined) return;
        warehouseId = warehouse.id;

        /* Без маржи наряд стоит на разнице «сумма минус выплата». */
        const before = marginOf(await api.getOrder(order.id));
        expect(before).toMatchObject({ known: true, materials: 0, value: 27_000 });

        await api.stockMove({
          kind: 'income',
          itemId: item.id,
          qty: 20,
          toZoneId: warehouse.id,
        });
        await api.stockMove({
          kind: 'consume',
          itemId: item.id,
          qty: 4,
          fromZoneId: warehouse.id,
          orderId: order.id,
        });

        /* 4 метра по 250 ₽ — 1 000 ₽ расхода, и маржа падает ровно на них. */
        const after = marginOf(await api.getOrder(order.id));
        expect(after).toMatchObject({ known: true, materials: 1_000, value: 26_000 });

        /* 🔴 Переоценка позиции не трогает прошлый наряд: движение хранит
           снимок цены на свой момент, а не ссылку на цену позиции. Без этого
           прибыльность каждой прошлой работы ехала бы за складом. */
        await api.updateStockItem(item.id, { purchasePrice: 900 });

        const repriced = marginOf(await api.getOrder(order.id));
        expect(repriced).toMatchObject({ known: true, materials: 1_000, value: 26_000 });
      } finally {
        await api.deleteOrder(order.id);
        /* Пришло 20, списано 4 — на складе осталось 16. */
        await dropStockItem(api, item.id, warehouseId, 16);
        await api.deleteClient(client.id);
      }
    });
  });

  test('🔴 материал без закупочной цены оставляет маржу непосчитанной', async () => {
    await withAdmin(async (api) => {
      const tag = mark();
      const client = await api.createClient({
        name: `Клиент ${tag}`,
        phone: '+7 (910) 000-33-44',
        address: `Тула, ${tag}, 2`,
      });
      const order = await api.createOrder({
        clientId: client.id,
        address: `Тула, ${tag}, 2`,
        price: 30_000,
      });
      const item = await api.createStockItem({
        name: `Кронштейн ${tag}`,
        unit: 'piece',
        purchasePrice: null,
      });

      let warehouseId = '';

      try {
        const zones = await api.stockZones();
        const warehouse = zones.find((zone) => zone.kind === 'warehouse');
        expect(warehouse, 'на стенде нет ни одного склада: списывать неоткуда').toBeDefined();
        if (warehouse === undefined) return;
        warehouseId = warehouse.id;

        await api.stockMove({
          kind: 'income',
          itemId: item.id,
          qty: 10,
          toZoneId: warehouse.id,
        });
        await api.stockMove({
          kind: 'consume',
          itemId: item.id,
          qty: 2,
          fromZoneId: warehouse.id,
          orderId: order.id,
        });

        /* 🔴 Не ноль и не «27 000». Ноль вместо неизвестной цены занизил бы
           расход и завысил маржу — соврал бы ровно в ту сторону, ради которой
           закупочная цена и заводится (ADR-310). */
        expect(marginOf(await api.getOrder(order.id))).toMatchObject({
          known: false,
          unpriced: 1,
        });
      } finally {
        await api.deleteOrder(order.id);
        /* Пришло 10, списано 2 — осталось 8. */
        await dropStockItem(api, item.id, warehouseId, 8);
        await api.deleteClient(client.id);
      }
    });
  });

  test('🔴 монтажник не получает ни маржи, ни закупочных цен', async () => {
    await withAdmin(async (api) => {
      const tag = mark();
      const installer = await api.createInstaller({
        name: `Монтажник ${tag}`,
        login: `e2e-margin-${Date.now()}`,
        phone: '+7 (910) 000-44-55',
        password: 'e2e-Password-1',
      });
      const client = await api.createClient({
        name: `Клиент ${tag}`,
        phone: '+7 (910) 000-55-66',
        address: `Тула, ${tag}, 3`,
      });
      const order = await api.createOrder({
        clientId: client.id,
        address: `Тула, ${tag}, 3`,
        price: 30_000,
      });
      const item = await api.createStockItem({
        name: `Дренаж ${tag}`,
        unit: 'meter',
        purchasePrice: 120,
      });

      try {
        await api.assignOrder(order.id, installer.id);

        /* Роль проверяется на сервере, а не скрытой кнопкой (ADR-092): ключей
           нет в самом ответе, и посмотреть их нечем даже запросом руками. */
        await withInstaller(installer.login, 'e2e-Password-1', async (mine) => {
          const seen = await mine.getOrder(order.id);
          expect('margin' in seen).toBe(false);
          expect('price' in seen).toBe(false);

          const stock = await mine.stockOverview();
          for (const row of stock) {
            expect('purchasePrice' in row).toBe(false);
            expect('minQty' in row).toBe(false);
          }
        });
      } finally {
        await api.deleteOrder(order.id);
        /* Движений по позиции не было — она пуста и уходит в архив сразу. */
        await api.deleteStockItem(item.id);
        await api.deleteClient(client.id);
        await api.deleteStaff(installer.id);
      }
    });
  });
});
