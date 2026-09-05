import { expect, test } from '@playwright/test';

import { withAdmin } from './support/admin-api';
import { loginViaUi } from './support/admin-ui';

/**
 * Слой занятости монтажников — ADR-123, issue #49 и #50.
 *
 * 🔴 Проверяется тем, ради чего фильтр и заведён: человек выключается и
 * возвращается, а его выезды уходят и приходят вместе с ним; то же с видом
 * записей. Юнит показывает, что раскладка отбрасывает чужие записи, но не
 * показывает, что нажатие в панели доводит выбор до сетки: между ними лежит
 * адрес, разбор параметров и серверная отрисовка страницы.
 */
test.describe('слой занятости монтажников', () => {
  test('🔴 монтажник выключается и возвращается, унося и принося свои выезды', async ({ page }) => {
    /* Метка своя и заведомо уникальная: база живая, и совпадение с настоящим
       монтажником сделало бы проверку недостоверной. */
    const mark = `E2E-слой-${Date.now()}`;
    const name = `Монтажник ${mark}`;

    /* Тот же день, что подставляет заведение наряда: сетка дня открывается по
       нему явно, а не по «сегодня» — иначе сценарий зависел бы от того, по
       какую сторону московской полуночи он запущен. */
    const day = new Date().toISOString().slice(0, 10);

    await withAdmin(async (api) => {
      const installer = await api.createInstaller({
        name,
        login: `e2e-layer-${Date.now()}`,
        phone: '+7 (900) 000-00-00',
        password: 'Sekret-12345',
      });
      const client = await api.createClient({
        name: `Клиент ${mark}`,
        phone: '+79000000001',
        address: `Тула, ${mark}, 1`,
      });
      const order = await api.createOrder({
        clientId: client.id,
        address: `Тула, ${mark}, 1`,
        price: 30_000,
      });
      await api.assignOrder(order.id, installer.id);

      try {
        await loginViaUi(page);
        await page.goto(`/admin/crm?view=day&day=${day}&team=on`);

        const chip = page.getByRole('button', { name: new RegExp(`Наряд № ${order.number}`) });
        await expect(chip).toBeVisible();

        // выключаем человека — уходит и он, и его выезд
        await page.getByRole('link', { name: `Скрыть ${name} из слоя` }).click();
        await expect(chip).toBeHidden();

        /* Вид и день остаются теми же: фильтр меняет состав слоя, а не то, на
           что человек смотрит. */
        await expect(page).toHaveURL(new RegExp(`view=day.*day=${day}`));
        await expect(page).toHaveURL(/who=/);

        // возвращаем — выезд возвращается вместе с ним
        await page.getByRole('link', { name: `Показать ${name} в слое` }).click();
        await expect(chip).toBeVisible();

        /* Виды записей — вторая половина карточки «Показывать»: снятые
           «Наряды» уносят выезд с сетки независимо от того, чей он. */
        await page.getByRole('link', { name: 'Скрыть: наряды' }).click();
        await expect(chip).toBeHidden();
        await expect(page).toHaveURL(/kinds=/);

        await page.getByRole('link', { name: 'Показать: наряды' }).click();
        await expect(chip).toBeVisible();
      } finally {
        await api.deleteOrder(order.id);
        await api.deleteClient(client.id);
        await api.deleteStaff(installer.id);
      }
    });
  });
});
