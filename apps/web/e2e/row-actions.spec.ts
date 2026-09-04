import { expect, test, type Page } from '@playwright/test';

import { BASE_URL } from './support/admin-api';
import { loginViaUi } from './support/admin-ui';

/**
 * Строка списка правится и убирается, не заставляя открывать карточку
 * (issue #577, веха «Соответствие · Фаза 2»).
 *
 * 🔴 Счёт владельца был такой: «нельзя удалять и переименовывать». Действия
 * существовали, но жили внутри карточки, и из списка о них ничто не
 * сообщало. Поэтому сценарий проверяет не «удаление работает» — это
 * проверяет юнит, — а что до правки и до удаления можно добраться **из
 * строки**, по её собственной подписи.
 *
 * 🔴 Отдельная проверка: отказ от подтверждения не меняет ничего. Диалог кита
 * заменил `window.confirm` (ADR-113), и цена ошибки здесь — статья вместе с
 * её адресом.
 *
 * Данные свои: статья заводится ручкой и ею же убирается в `afterEach`, так
 * что упавший прогон не оставляет мусора в дев-базе и не трогает чужие
 * записи.
 */

test.use({ baseURL: BASE_URL });

/** Метка прогона: две статьи разных прогонов не должны путаться в списке. */
const stamp = (): string => `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

type Created = { readonly id: string; readonly title: string };

async function createArticle(page: Page): Promise<Created> {
  const title = `Черновик сценария строки ${stamp()}`;

  const response = await page.request.post('/api/admin/articles', {
    data: {
      title,
      category: 'Эксплуатация',
      date: '2026-09-04',
      minutes: 4,
      excerpt: 'Временная статья сквозного сценария действий строки списка.',
      body: 'Текст временной статьи, заведённой сквозным сценарием. Убирается тем же сценарием.',
      published: false,
      seoTitle: null,
      seoDescription: null,
    },
  });

  expect(response.ok(), `создание статьи: ${response.status()}`).toBe(true);
  const { id } = await response.json();
  expect(typeof id, 'ручка вернула идентификатор').toBe('string');

  return { id, title };
}

/** Строка списка по подписи её действия: одна ссылка «Править» на десять строк
    бесполезна, поэтому подпись называет саму статью — по ней и ищем. */
function editAction(page: Page, title: string) {
  return page.getByRole('link', { name: `Править: ${title}` });
}

function removeAction(page: Page, title: string) {
  return page.getByRole('button', { name: `Удалить: ${title}` });
}

test.describe('Действия строки списка', () => {
  let created: Created | null = null;

  test.afterEach(async ({ page }) => {
    if (created !== null) {
      // страховка: упавший тест не оставляет статью в дев-базе
      await page.request.delete(`/api/admin/articles/${created.id}`).catch(() => undefined);
      created = null;
    }
    await page.request.post('/api/auth/logout').catch(() => undefined);
  });

  test('статья правится и убирается из строки, а отказ ничего не меняет', async ({ page }) => {
    // несколько переходов подряд: в деве сервер собирает каждую страницу с нуля
    test.slow();

    await loginViaUi(page);
    created = await createArticle(page);
    const { id, title } = created;

    await page.goto('/admin/knowledge');

    /* Шаг 1. Правка достижима из строки: не «где-то в карточке», а действием
       с собственной подписью, названной этой статьёй. */
    const edit = editAction(page, title);
    await expect(edit).toBeVisible({ timeout: 30_000 });
    await edit.click();
    await page.waitForURL(`**/admin/knowledge/${id}`);

    const renamed = `${title} — переименована`;
    const titleField = page.getByLabel('Заголовок');
    await expect(titleField).toHaveValue(title, { timeout: 30_000 });
    await titleField.fill(renamed);
    await page.getByRole('button', { name: 'Сохранить' }).first().click();
    await expect(page.getByText('Сохранено. Изменения уже на сайте')).toBeVisible({
      timeout: 30_000,
    });

    // новое имя доехало до списка
    await page.goto('/admin/knowledge');
    await expect(editAction(page, renamed)).toBeVisible({ timeout: 30_000 });

    /* Шаг 2. Отказ от подтверждения не меняет ничего. Проверяется не только
       тем, что строка на месте, но и перезагрузкой: строка, «оставшаяся» лишь
       в незасвежённом кеше маршрутизатора, выглядела бы точно так же. */
    const remove = removeAction(page, renamed);
    await expect(remove).toBeVisible();
    await remove.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog).toContainText(renamed);
    await dialog.getByRole('button', { name: 'Отмена' }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    await expect(removeAction(page, renamed)).toBeVisible({ timeout: 30_000 });

    /* Шаг 3. Согласие убирает строку — и карточку для этого открывать не
       пришлось ни разу. */
    await removeAction(page, renamed).click();
    const confirm = page.getByRole('dialog');
    await expect(confirm).toBeVisible({ timeout: 15_000 });
    await confirm.getByRole('button', { name: 'Удалить статью' }).click();

    await expect(removeAction(page, renamed)).toHaveCount(0, { timeout: 30_000 });

    // строка ушла из базы, а не только с экрана
    await page.reload();
    await expect(removeAction(page, renamed)).toHaveCount(0, { timeout: 30_000 });
    created = null;
  });
});
