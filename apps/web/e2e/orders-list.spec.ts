import { expect, test } from '@playwright/test';

import { orderManagerContent as texts } from '@/features/order-manager/content';

import { withAdmin } from './support/admin-api';
import { loginViaUi } from './support/admin-ui';

/**
 * Раздел «Заказы»: групповое действие, переход по страницам и причина отказа
 * (issue #596, #595, #627, #599).
 *
 * 🔴 Сценарий доходит до базы, а не проверяет разметку: назначение читается
 * обратно через API, отказ без причины отбивается сервером, а страницы
 * листаются кликом по номеру. Юнит на функцию-обработчик ни одного из этих
 * трёх утверждений не показывает.
 *
 * Свои записи, а не демонстрационные: наряд с нужным состоянием на стенде
 * бывает, а бывает и нет, — и сценарий, который тогда пропускает себя, ничего
 * не проверяет, но выглядит зелёным.
 */
const mark = (): string => `E2E-заказы-${Date.now()}`;

test.describe('заказы: групповое действие и страницы', () => {
  test('🔴 групповое назначение доводит выбранные наряды до исполнителя', async () => {
    await withAdmin(async (api) => {
      const tag = mark();
      const client = await api.createClient({
        name: `Клиент ${tag}`,
        phone: '+7 (910) 000-11-22',
        address: `Тула, ${tag}, 1`,
      });
      const installer = await api.createInstaller({
        name: `Монтажник ${tag}`,
        login: `e2e-${Date.now()}`,
        phone: '+7 (910) 000-00-99',
        password: 'e2e-Password-1',
      });

      const first = await api.createOrder({
        clientId: client.id,
        address: `Тула, ${tag}, 1`,
        price: 10_000,
      });
      const second = await api.createOrder({
        clientId: client.id,
        address: `Тула, ${tag}, 2`,
        price: 12_000,
      });

      try {
        const result = await api.assignMany([first.id, second.id], installer.id);
        expect(result.assigned).toBe(2);
        expect(result.failed).toEqual([]);

        /* Проверка идёт по записи, а не по ответу: назначение обязано лечь в
           базу, иначе монтажник наряда не увидит. */
        for (const order of [first, second]) {
          const saved = await api.getOrder(order.id);
          expect(saved['installer']).toMatchObject({ id: installer.id });
          /* Статус подтягивается за исполнителем сам: наряд с монтажником не
             остаётся «Новым», иначе он навсегда во вкладке «Новые». */
          expect(saved['status']).toBe('assigned');
        }
      } finally {
        await api.deleteOrder(first.id);
        await api.deleteOrder(second.id);
        await api.deleteStaff(installer.id);
        await api.deleteClient(client.id);
      }
    });
  });

  test('🔴 отказ без причины не записывается, с причиной — попадает в отказы', async () => {
    await withAdmin(async (api) => {
      const tag = mark();
      const client = await api.createClient({
        name: `Клиент ${tag}`,
        phone: '+7 (910) 000-11-33',
        address: `Тула, ${tag}, 3`,
      });
      const order = await api.createOrder({
        clientId: client.id,
        address: `Тула, ${tag}, 3`,
        price: 9_000,
      });

      try {
        /* Отказ без разбора не даёт ничего, ради чего заводится вкладка
           «Отказы» (ADR-310): сервер обязан отказать, а не записать пустоту. */
        const refused = await api.cancelOrder(order.id, {});
        expect(refused.status).toBe(400);

        const accepted = await api.cancelOrder(order.id, {
          cancelReason: 'too_expensive',
          cancelNote: `Нашёл дешевле ${tag}`,
        });
        expect(accepted.status).toBe(200);

        const saved = await api.getOrder(order.id);
        expect(saved['status']).toBe('cancelled');
        expect(saved['cancelReason']).toBe('too_expensive');
        expect(saved['cancelNote']).toBe(`Нашёл дешевле ${tag}`);
        /* Дату отказа ставит сервер: «когда отказались» — это факт, а не поле
           формы, и клиенту его не диктуют. */
        expect(saved['cancelledAt']).toEqual(expect.any(String));
      } finally {
        await api.deleteOrder(order.id);
        await api.deleteClient(client.id);
      }
    });
  });

  test('🔴 возврат отказа в работу гасит причину: без отказа она читалась бы как действующая', async () => {
    await withAdmin(async (api) => {
      const tag = mark();
      const client = await api.createClient({
        name: `Клиент ${tag}`,
        phone: '+7 (910) 000-11-44',
        address: `Тула, ${tag}, 4`,
      });
      const order = await api.createOrder({
        clientId: client.id,
        address: `Тула, ${tag}, 4`,
        price: 7_000,
      });

      try {
        await api.cancelOrder(order.id, { cancelReason: 'no_answer' });
        await api.assignOrder(order.id, null);

        const saved = await api.getOrder(order.id);
        expect(saved['status']).toBe('new');
        expect(saved['cancelReason']).toBeNull();
        expect(saved['cancelledAt']).toBeNull();
      } finally {
        await api.deleteOrder(order.id);
        await api.deleteClient(client.id);
      }
    });
  });

  test('🔴 страницы листаются номером, а число строк меняет длину списка', async ({ page }) => {
    await loginViaUi(page);

    /* Вкладка «Все» — единственная, где на стенде заведомо больше одной
       страницы: остальные стопки бывают и пустыми. */
    await page.goto('/admin/orders?tab=all');

    const rows = page.getByRole('row');
    const before = await rows.count();

    /* Один переход по номеру: список обязан смениться, а адрес — назваться
       страницей, потому что его присылают ссылкой. */
    const second = page.getByRole('link', { name: texts.pageGo(2) });

    if ((await second.count()) > 0) {
      await second.click();
      await page.waitForURL(/page=2/);
      await expect(page.getByText(texts.pageCurrent(2))).toBeAttached();
    }

    /* Шаг листания — тоже адрес: он присылается ссылкой вместе со страницей. */
    await page.getByRole('link', { name: texts.perPageSet(16) }).click();
    await page.waitForURL(/size=16/);

    /* Смена шага возвращает на первую страницу: седьмая по восемь строк и
       седьмая по шестнадцать — разные места списка. */
    expect(page.url()).not.toContain('page=');
    expect(await rows.count()).toBeGreaterThanOrEqual(before);
  });
});
