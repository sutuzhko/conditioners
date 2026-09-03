import { expect, test, type Page } from '@playwright/test';

import { BASE_URL, withAdmin } from './support/admin-api';

/**
 * Форма заявки после перевёрстки (issue #276, issue #278).
 *
 * 🔴 Проверяется инвариант 2 — заявка сначала пишется в базу, — и проверяется
 * он на обеих раскладках формы: на телефоне поля идут столбиком, с 900px
 * форма стоит правой колонкой. Юнит на обработчик этого не показывает: там
 * нет ни вёрстки, ни базы.
 *
 * 🔴 В дев-базе настоящие данные владельца. Своя запись помечается уникальным
 * маркером в имени и закрывается после теста даже при падении. DELETE для
 * заявок в контракте нет (docs/API.md §8) — уборка ограничена переводом в
 * статус «отклонена» с пояснением в комментарии менеджера.
 */

test.use({ baseURL: BASE_URL });

const marker = `E2E-резина-${Date.now()}`;

/**
 * Ждёт гидрации формы через маску телефона: пока форма не ожила, введённая
 * цифра остаётся голой, а после — превращается в «+7 (9». Заполнять раньше
 * нельзя: состояние React осталось бы пустым, и отправилась бы пустая форма.
 */
/**
 * 🔴 Своя «сеть» на каждый сценарий: ограничение частоты у `/api/leads` — пять
 * обращений с адреса за десять минут (`LEAD_RATE_LIMIT`), и все сценарии
 * стенда приходят с одного адреса. Пока их было два, лимит не мешал; с
 * появлением этих проверок обязательный сценарий `lead.spec.ts` начал падать
 * в CI на отказе «слишком много обращений» — на форме, которая исправна.
 *
 * Адрес берётся из `X-Real-IP` (`server/client-ip.ts`) — того самого
 * запасного пути, который заведён там «для окружений без Caddy». Так каждый
 * сценарий получает свой счётчик, а сам ограничитель остаётся включённым и
 * проверяемым: ослаблять его ради тестов нельзя.
 */
const ADDRESS_BY_PROJECT: Record<string, number> = { desktop: 10, mobile: 40 };

async function ownAddress(page: Page, projectName: string, seed: number): Promise<void> {
  const base = ADDRESS_BY_PROJECT[projectName] ?? 90;
  await page.setExtraHTTPHeaders({ 'X-Real-IP': `10.77.0.${base + seed}` });
}

async function waitForHydration(page: Page): Promise<void> {
  const phone = page.locator('#lead form input[name="phone"]');
  await expect(async () => {
    await phone.fill('');
    await phone.fill('9');
    expect(await phone.inputValue()).toContain('+7');
  }).toPass({ timeout: 45_000 });
}

test.describe('Заявка на телефоне и на десктопе', () => {
  test.afterEach(async () => {
    await withAdmin(async (admin) => {
      const mine = (await admin.listLeads()).filter(
        (lead) => lead.name.startsWith(marker) && lead.status !== 'rejected',
      );
      for (const lead of mine) {
        await admin.closeLead(lead.id, 'Тестовая запись E2E: в работу не брать');
      }
    });
  });

  for (const [index, width] of ([375, 1200] as const).entries()) {
    test(`заявка с ширины ${width} доходит до базы`, async ({ page }, testInfo) => {
      test.slow();
      await ownAddress(page, testInfo.project.name, index);
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');

      const form = page.locator('#lead form');

      /* 🔴 До раскрывашки открыто ровно три поля плюс согласие (issue #276):
         анкета из девяти полей отпугивала раньше, чем человек доходил до
         кнопки. Необязательные поля при этом остаются в разметке — обрезан
         показ, а не содержание. */
      await expect(form.locator('details')).toHaveCount(1);
      await expect(form.locator('details')).not.toHaveAttribute('open', /.*/);
      await expect(form.locator('input[name="address"]')).toBeHidden();
      await expect(form.locator('input[name="address"]')).toHaveCount(1);

      await waitForHydration(page);

      const name = `${marker}-${width}`;
      await form.locator('input[name="phone"]').fill('9012345678');
      await expect(form.locator('input[name="phone"]')).toHaveValue('+7 (901) 234-56-78');
      await form.locator('input[name="name"]').fill(name);
      await form.locator('input[name="consent"]').check();
      await form.getByRole('button', { name: 'Отправить заявку' }).click();

      await expect(
        page.locator('#lead').getByRole('heading', { name: 'Заявка отправлена' }),
      ).toBeVisible({ timeout: 30_000 });

      /* Инвариант 2: ответ формы обязан означать запись в БД, а не удачный
         вызов мессенджера. Свежая заявка приходит со статусом «new». */
      await withAdmin(async (admin) => {
        const created = (await admin.listLeads('new')).find((lead) => lead.name === name);
        expect(created, 'заявка с маркером должна лежать в базе').toBeDefined();
        expect(created?.phone).toBe('+79012345678');
      });
    });
  }

  /**
   * 🔴 Согласие обязательно: телефон — персональные данные, и без явной
   * отметки форма не отправляется (инвариант 12, 152-ФЗ). Отказ обязан
   * объяснять, что делать, и оставлять телефон запасным путём.
   */
  test('без согласия заявка не уходит, а отказ объясняет и оставляет телефон', async ({
    page,
  }, testInfo) => {
    await ownAddress(page, testInfo.project.name, 6);
    test.slow();
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/');

    const form = page.locator('#lead form');
    await waitForHydration(page);

    await form.locator('input[name="phone"]').fill('9012345678');
    await form.locator('input[name="name"]').fill(`${marker}-без-согласия`);
    await form.getByRole('button', { name: 'Отправить заявку' }).click();

    await expect(form.getByText(/согласи/i).first()).toBeVisible();
    await expect(form.locator('input[name="consent"]')).toHaveAttribute('aria-invalid', 'true');

    // 🔴 Запасной путь виден и в отказе: номер стоит под кнопкой всегда
    await expect(form.locator('a[href^="tel:"]')).toBeVisible();

    // и в базе ничего не появилось
    await withAdmin(async (admin) => {
      const created = (await admin.listLeads()).find((lead) => lead.name.includes('без-согласия'));
      expect(created, 'заявка без согласия в базу попасть не должна').toBeUndefined();
    });
  });

  /**
   * 🔴 Ошибка сервера в спрятанном поле обязана раскрыть блок: в закрытом
   * `<details>` поля лежат в `display: none`, и фокус в них не попадает —
   * человек получил бы сообщение об ошибке и не нашёл, где её править.
   *
   * Проверяется через клиентскую подстановку: адрес длиннее допустимого
   * ловится той же Zod-схемой, что на сервере (docs/CLAUDE.md, «Формы»).
   */
  test('ошибка в необязательном поле раскрывает блок и ведёт туда фокус', async ({
    page,
  }, testInfo) => {
    await ownAddress(page, testInfo.project.name, 5);
    test.slow();
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/');

    const form = page.locator('#lead form');
    await waitForHydration(page);

    const details = form.locator('details');
    await form.getByText('Модель, адрес, фото — по желанию').click();
    await expect(details).toHaveAttribute('open', /.*/);

    const comment = form.locator('textarea[name="comment"]');
    await comment.fill('я'.repeat(2100));
    await form.locator('input[name="phone"]').fill('9012345678');
    await form.locator('input[name="name"]').fill(`${marker}-длинный-комментарий`);
    await form.locator('input[name="consent"]').check();

    // сворачиваем блок обратно и отправляем: форма обязана открыть его сама
    await form.getByText('Модель, адрес, фото — по желанию').click();
    await expect(details).not.toHaveAttribute('open', /.*/);

    await form.getByRole('button', { name: 'Отправить заявку' }).click();

    await expect(details).toHaveAttribute('open', /.*/);
    await expect(comment).toBeFocused();
  });
});
