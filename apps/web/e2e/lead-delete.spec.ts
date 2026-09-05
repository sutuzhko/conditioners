import { expect, test } from '@playwright/test';

import { BASE_URL, withAdmin, type AdminLead } from './support/admin-api';
import { loginViaUi } from './support/admin-ui';

/**
 * 🔴 Удаление обращения — исполнение требования 152-ФЗ об уничтожении
 * персональных данных (issue #600, #605, ADR-310).
 *
 * Сценарий доходит до базы: после удаления записи не остаётся ни в списке, ни
 * по прямому адресу. Юнит на обработчик этого не показывает — он проверяет
 * вызов, а не то, что строка исчезла.
 *
 * Отдельно проверяется отказ от подтверждения: он не должен делать ничего.
 * Это единственное правильное поведение необратимого действия (ADR-113), и
 * ошибка здесь стоит истории обращения, восстановить которую нечем.
 *
 * 🔴 Публичная форма зовётся ровно один раз за прогон — только там, где
 * обращение потом уничтожается. `POST /api/leads` держит ограничитель частоты
 * (пять обращений за десять минут с адреса), и три создания на файл, помноженные
 * на два профиля и повторы Playwright, упирались в 429 — сценарий падал на
 * подготовке, не дойдя до проверки. Остальные два сценария ничего не создают:
 * они работают с обращением, которое на стенде уже есть, и возвращают его
 * состояние обратно — тем же приёмом, что `panel-states`.
 */

test.use({ baseURL: BASE_URL });

/* Удаление и отмена от ширины не зависят: сценарий проверяет поведение, а не
   раскладку. Тот же приём, что у остальных сценариев панели, — и он же вдвое
   уменьшает число обращений к ограничителю частоты. */
test.skip(({ isMobile }) => isMobile === true, 'удаление не зависит от ширины');

/** Маркер прогона: по нему обращение находится и убирается, чужое не трогается. */
const marker = `E2E-удаление-${Date.now()}`;

/** Заводит обращение публичной формой — тем же путём, каким оно приходит с сайта. */
async function createLead(name: string): Promise<AdminLead> {
  return withAdmin(async (admin) => {
    const form = new URLSearchParams({
      name,
      phone: '+7 (901) 234-56-78',
      topic: 'Консультация',
      address: 'Тула, Оборонная 12, кв. 34',
      comment: 'Сквозной сценарий удаления: персональные данные подлежат уничтожению.',
      consent: 'on',
    });

    const response = await admin.postPublicForm('/api/leads', form);
    if (response.status() !== 201) {
      throw new Error(`Заявка не завелась: код ${response.status()}`);
    }

    const created = (await admin.listLeads()).find((lead) => lead.name === name);
    if (created === undefined) throw new Error('Заявка не нашлась в списке после создания');

    return created;
  });
}

/** Любое обращение со стенда — для сценариев, которые ничего не меняют насовсем. */
async function anyLead(): Promise<AdminLead> {
  return withAdmin(async (admin) => {
    const [first] = await admin.listLeads();
    if (first === undefined) {
      throw new Error('На стенде нет ни одного обращения: сценарию не с чем работать');
    }
    return first;
  });
}

test.describe('Удаление обращения', () => {
  test.afterEach(async () => {
    /* Уборка на случай падения посреди сценария: своё обращение не должно
       остаться на стенде, даже если тест не дошёл до удаления. */
    await withAdmin(async (admin) => {
      const mine = (await admin.listLeads()).filter((lead) => lead.name === marker);
      for (const lead of mine) await admin.deleteLead(lead.id);
    });
  });

  test('🔴 удалённого обращения не остаётся в базе', async ({ page }) => {
    // путь через вход, очередь и подтверждение: в деве разделы собираются с нуля
    test.slow();

    const lead = await createLead(marker);

    await loginViaUi(page);
    await page.goto(`/admin/leads?lead=${lead.id}`);

    await expect(page.getByRole('heading', { name: marker })).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: 'Удалить обращение' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(`Удалить обращение № ${lead.number}?`);
    await dialog.getByRole('button', { name: 'Удалить навсегда' }).click();

    /* Экран возвращается к очереди: карточка удалённого обращения показывала
       бы то, чего в базе не осталось. */
    await expect(page.getByRole('heading', { name: marker })).toBeHidden({ timeout: 30_000 });

    // 🔴 То, ради чего сценарий и написан: записи в базе нет
    await withAdmin(async (admin) => {
      expect(await admin.findLead(lead.id)).toBeNull();
      expect((await admin.listLeads()).some((item) => item.id === lead.id)).toBe(false);
    });
  });

  /* 🔴 Сценарий ничего не меняет: он открывает окно и отказывается. Поэтому
     работает с обращением, которое на стенде уже есть, и публичную форму не
     трогает — ограничитель частоты бережётся для того сценария, которому
     обращение действительно нужно уничтожить. */
  test('🔴 отказ от подтверждения ничего не удаляет', async ({ page }) => {
    test.slow();

    const lead = await anyLead();

    await loginViaUi(page);
    await page.goto(`/admin/leads?lead=${lead.id}`);

    await expect(page.getByRole('heading', { name: lead.name })).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: 'Удалить обращение' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Оставить' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('heading', { name: lead.name })).toBeVisible();

    // 🔴 Запись на месте: отказ от подтверждения не делает ничего
    await withAdmin(async (admin) => {
      expect(await admin.findLead(lead.id)).not.toBeNull();
    });
  });

  /**
   * 🔴 Отмена и удаление — разные вещи (ADR-310, #630). Отменённое обращение
   * остаётся в истории и в счётчиках конверсии, и причина у него обязательна:
   * ради разбора причин вкладка отказов и заводится.
   */
  test('🔴 отказ оставляет обращение в базе и записывает причину', async ({ page }) => {
    test.slow();

    /* Сценарий меняет статус чужого обращения и возвращает его обратно —
       тем же приёмом, что `panel-states`: стенд после прогона такой же, каким
       был до него. */
    const lead = await anyLead();

    await loginViaUi(page);
    await page.goto(`/admin/leads?lead=${lead.id}`);

    await expect(page.getByRole('heading', { name: lead.name })).toBeVisible({ timeout: 30_000 });

    try {
      await page.getByLabel('Статус').selectOption({ label: 'Отказ' });

      const dialog = page.getByRole('dialog', { name: 'Почему отказались?' });
      await expect(dialog).toBeVisible();
      await dialog.getByLabel('Причина').selectOption({ label: 'Дорого' });
      await dialog.getByRole('button', { name: 'Отметить отказ' }).click();

      await expect(dialog).toBeHidden({ timeout: 30_000 });

      await withAdmin(async (admin) => {
        const found = await admin.findLead(lead.id);
        expect(found?.status).toBe('rejected');
      });
    } finally {
      await withAdmin((admin) => admin.setLeadStatus(lead.id, lead.status));
    }
  });
});
