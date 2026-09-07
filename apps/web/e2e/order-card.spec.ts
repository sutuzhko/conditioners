import { expect, test } from '@playwright/test';

import { orderManagerContent as texts } from '@/features/order-manager/content';

import { BASE_URL, withAdmin } from './support/admin-api';
import { loginViaUi } from './support/admin-ui';

/**
 * Карточка наряда сменила род экрана (issue #598).
 *
 * 🔴 Сценарий проверяет ровно то, ради чего задача заведена: карточка
 * **читается**, а правка живёт своим адресом. Прежде весь наряд лежал полями
 * формы на всей её высоте — 5156px на 390 у наряда в работе.
 *
 * 🔴 Оба действия доходят до базы, а не до разметки. «Отметить выполненным»
 * обязано записать статус: кнопка, показавшая успех и не изменившая записи,
 * выглядит одинаково с работающей ровно до следующего открытия карточки.
 *
 * Свои записи, а не демонстрационные: наряд в нужном состоянии на стенде
 * бывает, а бывает и нет, — и сценарий, который тогда пропускает себя, ничего
 * не проверяет, но выглядит зелёным.
 */

test.use({ baseURL: BASE_URL });

const mark = (): string => `E2E-карточка-${Date.now()}`;

test.describe('карточка наряда: чтение и правка', () => {
  test('🔴 карточка отдаёт чтение, а поля правки живут на своём адресе', async ({ page }) => {
    await withAdmin(async (api) => {
      const tag = mark();
      const client = await api.createClient({
        name: `Клиент ${tag}`,
        phone: '+7 (910) 000-22-11',
        address: `Тула, ${tag}, 1`,
      });
      const order = await api.createOrder({
        clientId: client.id,
        address: `Тула, ${tag}, 1`,
        price: 15_000,
      });

      try {
        await loginViaUi(page);
        await page.goto(`/admin/orders/${order.id}`);

        await expect(page.getByRole('heading', { name: texts.number(order.number) })).toBeVisible({
          timeout: 30_000,
        });

        /* 🔴 То, ради чего задача и заведена: адреса, суммы и монтажника
           карточка показывает текстом, а не полями ввода. Выпадающий список
           статуса — самый заметный признак прежней формы. */
        await expect(page.getByText(`Тула, ${tag}, 1`).first()).toBeVisible();
        await expect(page.getByRole('combobox', { name: texts.status })).toBeHidden();
        await expect(page.getByRole('combobox', { name: texts.client })).toBeHidden();
        /* 🔴 «Сохранить» на карточке остаётся ровно одно — у итога работ.
           Это отдельная форма владельца, а не правка наряда: её поля
           проверены выше как отсутствующие. Число важно само по себе — два
           «Сохранить» на экране означали бы, что форма правки никуда не
           уехала, а просто встала рядом. */
        await expect(page.getByRole('button', { name: texts.save })).toHaveCount(1);

        /* Правка — ссылка на свой адрес: её обязано открывать и средней
           кнопкой, как всякий другой адрес панели. */
        const edit = page.getByRole('link', { name: texts.edit });
        await expect(edit).toHaveAttribute('href', `/admin/orders/${order.id}/edit`);

        await edit.click();

        /* На своём адресе поля есть — и это та же форма, что была в карточке. */
        await expect(page.getByRole('combobox', { name: texts.status })).toBeVisible({
          timeout: 30_000,
        });
        await expect(page.getByRole('button', { name: texts.save })).toBeVisible();
      } finally {
        await api.deleteOrder(order.id);
        await api.deleteClient(client.id);
      }
    });
  });

  test('🔴 «Отметить выполненным» записывает статус в базу, а не только на экран', async ({
    page,
  }) => {
    await withAdmin(async (api) => {
      const tag = mark();
      const client = await api.createClient({
        name: `Клиент ${tag}`,
        phone: '+7 (910) 000-22-33',
        address: `Тула, ${tag}, 2`,
      });
      const installer = await api.createInstaller({
        name: `Монтажник ${tag}`,
        login: `e2e-card-${Date.now()}`,
        phone: '+7 (910) 000-22-44',
        password: 'e2e-Password-1',
      });
      const order = await api.createOrder({
        clientId: client.id,
        address: `Тула, ${tag}, 2`,
        price: 21_000,
      });

      try {
        /* Закрывать можно назначенный наряд: у нового исполнителя нет, и
           закрывать его некому. */
        await api.assignOrder(order.id, installer.id);

        await loginViaUi(page);
        await page.goto(`/admin/orders/${order.id}`);

        await page.getByRole('button', { name: texts.markDone }).click();

        await expect(page.getByText(texts.markDoneDone)).toBeVisible({ timeout: 30_000 });

        // 🔴 То, ради чего сценарий написан: статус лёг в запись
        const saved = await api.getOrder(order.id);
        expect(saved['status']).toBe('done');

        /* Закрытый наряд закрывать больше нечем: кнопка уходит вместе с
           состоянием, а не остаётся нажимаемой впустую. */
        await page.reload();
        await expect(page.getByRole('heading', { name: texts.number(order.number) })).toBeVisible({
          timeout: 30_000,
        });
        await expect(page.getByRole('button', { name: texts.markDone })).toBeHidden();
      } finally {
        await api.deleteOrder(order.id);
        await api.deleteStaff(installer.id);
        await api.deleteClient(client.id);
      }
    });
  });

  test('🔴 правка со своего адреса доходит до базы', async ({ page }) => {
    await withAdmin(async (api) => {
      const tag = mark();
      const client = await api.createClient({
        name: `Клиент ${tag}`,
        phone: '+7 (910) 000-22-55',
        address: `Тула, ${tag}, 3`,
      });
      const order = await api.createOrder({
        clientId: client.id,
        address: `Тула, ${tag}, 3`,
        price: 8_000,
      });

      try {
        await loginViaUi(page);
        await page.goto(`/admin/orders/${order.id}/edit`);

        const address = page.getByRole('textbox', { name: texts.address });
        await expect(address).toBeVisible({ timeout: 30_000 });

        await address.fill(`Тула, ${tag}, правленый`);
        await page.getByRole('button', { name: texts.save }).click();

        await expect(page.getByText(texts.saved)).toBeVisible({ timeout: 30_000 });

        // 🔴 Правка обязана лечь в запись, иначе монтажник поедет по старому адресу
        const saved = await api.getOrder(order.id);
        expect(saved['address']).toBe(`Тула, ${tag}, правленый`);
      } finally {
        await api.deleteOrder(order.id);
        await api.deleteClient(client.id);
      }
    });
  });
});
