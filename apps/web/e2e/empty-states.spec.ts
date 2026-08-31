import { expect, test } from '@playwright/test';

import { BASE_URL } from './support/admin-api';
import { loginViaUi } from './support/admin-ui';

/**
 * Пустое состояние против «ничего не найдено» — issue #335.
 *
 * 🔴 Проверяется тем, ради чего разводка и делалась: из состояния «фильтр
 * ничего не нашёл» обязан быть выход. До правки человек видел «По этому
 * запросу никого не нашлось» и мог только искать поле поиска глазами —
 * действия у состояния не было вовсе.
 *
 * Юнит-проверка текста этого не показывает: она сверяет строку, а не то, что
 * ссылка действительно возвращает к полному списку.
 */
test.use({ baseURL: BASE_URL });

test.describe('пустое состояние и «ничего не найдено»', () => {
  test('🔴 поиск без совпадений даёт выход, и он возвращает к полному списку', async ({ page }) => {
    await loginViaUi(page);

    /* Запрос заведомо ни с чем не совпадает: база живая, и поиск по реальной
       строке нашёл бы настоящего клиента. */
    const nothing = `E2E-нет-такого-${Date.now()}`;
    await page.goto(`/admin/clients?q=${encodeURIComponent(nothing)}`);

    await expect(
      page.getByRole('heading', { name: 'По этому запросу никого не нашлось' }),
    ).toBeVisible();

    /* 🔴 И не текст пустой базы: это разные новости с противоположными
       шагами, и подмена одного другим — ровно тот дефект, ради которого
       issue заведён. */
    await expect(page.getByRole('heading', { name: 'В базе пока никого' })).toHaveCount(0);

    const back = page.getByRole('link', { name: 'Показать всех клиентов' });
    await expect(back).toBeVisible();
    await back.click();

    await page.waitForURL((url) => url.pathname === '/admin/clients' && url.search === '');
    await expect(
      page.getByRole('heading', { name: 'По этому запросу никого не нашлось' }),
    ).toHaveCount(0);
  });

  test('под фильтром никогда не показывается текст пустого раздела', async ({ page }) => {
    await loginViaUi(page);

    /* 🔴 Утверждение безусловное, а не «если пусто, то». Условная проверка
       молча проходит в тот день, когда ветка перестаёт достигаться, — и
       перестаёт быть проверкой. Здесь же инвариант выполняется всегда: пока
       выбран статус, пустота обязана объясняться фильтром, а не отсутствием
       заявок вообще. */
    /* Статусы настоящие: неизвестное значение страница игнорирует и
       показывает полный список — проверка тогда сверяла бы не то. */
    for (const status of ['rejected', 'done']) {
      await page.goto(`/admin/leads?status=${status}`);
      await expect(page.getByRole('heading', { name: 'Заявок пока нет' })).toHaveCount(0);
    }
  });
});
