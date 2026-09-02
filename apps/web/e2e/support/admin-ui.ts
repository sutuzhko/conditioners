import { expect, type Page } from '@playwright/test';

import { ADMIN_LOGIN, ADMIN_PASSWORD } from './admin-api';

/**
 * Вход в панель через форму — тот самый шаг «вход в админку» из сквозных
 * сценариев docs/CLAUDE.md, поэтому он проходит честными кликами, а не
 * подстановкой cookie в контекст.
 */
export interface LoginCredentials {
  readonly login: string;
  readonly password: string;
}

export async function loginViaUi(
  page: Page,
  credentials: LoginCredentials = { login: ADMIN_LOGIN, password: ADMIN_PASSWORD },
): Promise<void> {
  await page.goto('/admin/login');

  /* Гидрацию ждём через саму форму: до неё нажатие уходит нативным сабмитом
     (форма noValidate, страница просто перезагружается), а после — пустые
     поля дают клиентскую ошибку «Введите логин». Она и служит признаком,
     что форма ожила и готова принять ввод. */
  await expect(async () => {
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByText('Введите логин')).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 45_000 });

  await page.locator('input[name="login"]').fill(credentials.login);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole('button', { name: 'Войти' }).click();

  /* После входа форма уводит на первый раздел панели: владельца — на сводку,
     монтажника оболочка разворачивает дальше, на его календарь. */
  await page.waitForURL(
    (url) => url.pathname.startsWith('/admin') && url.pathname !== '/admin/login',
  );
}
