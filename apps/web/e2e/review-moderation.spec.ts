import { expect, test } from '@playwright/test';

import { BASE_URL, withAdmin } from './support/admin-api';
import { loginViaUi } from './support/admin-ui';

/**
 * Сквозной сценарий из docs/CLAUDE.md («Тестирование»): отправка отзыва и его
 * появление на модерации.
 *
 * 🔴 Отзыв уходит со статусом «pending» и не публикуется без модератора
 * (инвариант 7): экран успеха обещает модерацию, а админка показывает отзыв
 * со статусом «На модерации».
 *
 * В дев-базе настоящие данные владельца: свой отзыв помечается уникальным
 * маркером в имени и удаляется через DELETE /api/admin/reviews/[id] после
 * теста даже при падении.
 */

test.use({ baseURL: BASE_URL });

/** Маркер прогона: по нему отзыв находится и удаляется, чужое не трогается. */
const marker = `E2E-отзыв-${Date.now()}`;

test.describe('Отзыв и модерация', () => {
  test.afterEach(async ({ page }) => {
    // сессия UI-входа гасится, чтобы прогоны не копили записи Session в базе
    await page.request.post('/api/auth/logout').catch(() => undefined);

    await withAdmin(async (admin) => {
      const mine = (await admin.listReviews()).filter((review) => review.name === marker);
      for (const review of mine) {
        await admin.deleteReview(review.id);
      }
    });
  });

  test('отзыв с лендинга появляется в админке со статусом «На модерации»', async ({ page }) => {
    // путь через четыре страницы: в деве каждую сервер может собирать с нуля
    test.slow();

    await page.goto('/');

    const opener = page.locator('#reviews').getByRole('button', { name: 'Оставить отзыв' });
    const dialog = page.getByRole('dialog');

    // кнопка открывает окно только после гидрации — повторяем, пока не откроется
    await expect(async () => {
      await opener.click();
      await expect(dialog).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 45_000 });

    await dialog.locator('input[name="name"]').fill(marker);
    // оценка — клик по подписи звезды: сама радиокнопка скрыта с глаз (srOnly)
    await dialog.locator('label').filter({ hasText: 'Оценка 5 из 5' }).click();
    await dialog
      .locator('textarea[name="text"]')
      .fill('Сквозной тест: монтаж прошёл аккуратно, смета совпала с названной по телефону.');
    await dialog.locator('input[name="consent"]').check();
    await dialog.getByRole('button', { name: 'Отправить отзыв' }).click();

    // 🔴 успех обещает модерацию, а не публикацию (инвариант 7)
    await expect(dialog.getByRole('heading', { name: 'Отзыв отправлен на модерацию' })).toBeVisible(
      { timeout: 30_000 },
    );

    // вход в админку — честной формой, как в сценарии из docs/CLAUDE.md
    await loginViaUi(page);
    await page.goto('/admin/reviews');

    const card = page.locator('article').filter({ hasText: marker });
    await expect(card).toBeVisible({ timeout: 30_000 });
    await expect(card.getByText('На модерации')).toBeVisible();
  });
});
