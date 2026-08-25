import { expect, type Page } from '@playwright/test';

import { ADMIN_LOGIN, ADMIN_PASSWORD } from './admin-api';

/**
 * Вход в панель через форму — тот самый шаг «вход в админку» из сквозных
 * сценариев docs/CLAUDE.md, поэтому он проходит честными кликами, а не
 * подстановкой cookie в контекст.
 */
export async function loginViaUi(page: Page): Promise<void> {
  await page.goto('/admin/login');

  /* Гидрацию ждём через саму форму: до неё нажатие уходит нативным сабмитом
     (форма noValidate, страница просто перезагружается), а после — пустые
     поля дают клиентскую ошибку «Введите логин». Она и служит признаком,
     что форма ожила и готова принять ввод. */
  await expect(async () => {
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByText('Введите логин')).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 45_000 });

  await page.locator('input[name="login"]').fill(ADMIN_LOGIN);
  await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Войти' }).click();

  // после входа форма уводит на первый раздел панели
  await page.waitForURL((url) => url.pathname === '/admin');
}
