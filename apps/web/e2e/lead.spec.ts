import { expect, test } from '@playwright/test';

import { BASE_URL, withAdmin } from './support/admin-api';

/**
 * Сквозной сценарий из docs/CLAUDE.md («Тестирование»): отправка заявки.
 *
 * Проверяется не только экран успеха, но и инвариант 2 — заявка реально
 * записана в базу. В базу тест смотрит через админ-API: заодно проверяется
 * путь чтения, которым пользуется владелец.
 *
 * 🔴 В дев-базе настоящие данные владельца. Своя запись помечается уникальным
 * маркером в имени и закрывается после теста даже при падении. DELETE для
 * заявок в контракте нет (docs/API.md §8) — уборка ограничена переводом в
 * статус «отклонена» с пояснением в комментарии менеджера.
 */

test.use({ baseURL: BASE_URL });

/** Маркер прогона: по нему заявка находится и убирается, чужое не трогается. */
const marker = `E2E-заявка-${Date.now()}`;

test.describe('Заявка с лендинга', () => {
  test.afterEach(async () => {
    await withAdmin(async (admin) => {
      const mine = (await admin.listLeads()).filter(
        (lead) => lead.name === marker && lead.status !== 'rejected',
      );
      for (const lead of mine) {
        await admin.closeLead(lead.id, 'Тестовая запись E2E: в работу не брать');
      }
    });
  });

  test('форма сохраняет заявку в базу и показывает экран успеха', async ({ page }) => {
    await page.goto('/');

    const form = page.locator('#lead form');
    const phone = form.locator('input[name="phone"]');

    /* Гидрацию ждём через маску телефона: пока форма не ожила, введённая
       цифра остаётся голой, а после — превращается в «+7 (9». Заполнять
       раньше нельзя: состояние React осталось бы пустым, и отправилась бы
       пустая форма. */
    await expect(async () => {
      await phone.fill('');
      await phone.fill('9');
      expect(await phone.inputValue()).toContain('+7');
    }).toPass({ timeout: 45_000 });

    await phone.fill('9012345678');
    await expect(phone).toHaveValue('+7 (901) 234-56-78');
    await form.locator('input[name="name"]').fill(marker);
    await form.locator('input[name="consent"]').check();
    await form.getByRole('button', { name: 'Отправить заявку' }).click();

    await expect(
      page.locator('#lead').getByRole('heading', { name: 'Заявка отправлена' }),
    ).toBeVisible({ timeout: 30_000 });

    /* Инвариант 2: ответ формы обязан означать запись в БД, а не удачный
       вызов мессенджера. Свежая заявка приходит со статусом «new». */
    await withAdmin(async (admin) => {
      const created = (await admin.listLeads('new')).find((lead) => lead.name === marker);
      expect(created, 'заявка с маркером должна лежать в базе').toBeDefined();
      // телефон нормализуется сервером — сверяем, что дошёл тот же номер
      expect(created?.phone).toBe('+79012345678');
    });
  });
});
