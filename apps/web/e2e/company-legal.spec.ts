import { expect, test } from '@playwright/test';

import { BASE_URL, withAdmin } from './support/admin-api';
import { loginViaUi } from './support/admin-ui';

/**
 * Сквозной сценарий раздела «Компания»: вход в панель → правка реквизитов →
 * реквизиты обновились в футере сайта и в политике обработки данных.
 *
 * 🔴 Раздел до этого не был принят сценарием вовсе, хотя правило прямое
 * (docs/CLAUDE.md, «Как проверяется сделанное»): юнит на обработчик не
 * показывает ни того, что форма доносит значение до базы, ни того, что база
 * доносит его до страницы. Здесь проверяется и обратное — что **не** доходит:
 * адрес регистрации предпринимателя на сайт не выводится, а публичный маршрут
 * не отдаёт его и банковские реквизиты (ADR-143).
 *
 * 🔴 В дев-базе лежат данные стенда. До правок снимается снимок группы через
 * админ-API и возвращается в `afterEach` — упавший тест не оставляет чужих
 * реквизитов в футере каждой страницы.
 */

test.use({ baseURL: BASE_URL });

/** Номер с верным контрольным разрядом: схема проверяет арифметику (PROJECT §5.2). */
const OGRNIP = '314710700012346';
const HOME_ADDRESS = '300026, Тула, ул. Рязанская, д. 24, кв. 71';
const BANK_ACCOUNT = '40702810700000000001';

test.describe('данные компании', () => {
  let snapshot: unknown = null;

  test.beforeEach(async () => {
    snapshot = await withAdmin((api) => api.getSetting('legal'));
  });

  test.afterEach(async ({ page }) => {
    // сессия UI-входа гасится, чтобы прогоны не копили записи Session в базе
    await page.request.post('/api/auth/logout').catch(() => undefined);

    if (snapshot === null) return;
    await withAdmin((api) => api.putSetting('legal', snapshot));
  });

  test('правка реквизитов доходит до футера и до политики', async ({ page }) => {
    const authority = `ИФНС проверки ${Date.now()}`;

    await withAdmin((api) =>
      api.putSetting('legal', {
        form: 'ИП',
        name: 'Проверкин Проверка Проверкович',
        inn: '710703123450',
        ogrn: OGRNIP,
        regDate: '2015-03-12',
        regAuthority: authority,
        address: HOME_ADDRESS,
        bankName: 'Банк проверки',
        bankBik: '047003608',
        bankAccount: BANK_ACCOUNT,
        bankCorrAccount: '30101810700000000004',
      }),
    );

    await page.goto('/');
    const footer = page.getByRole('contentinfo');

    await expect(footer.getByText('ИП Проверкин Проверка Проверкович')).toBeVisible();
    await expect(footer.getByText(OGRNIP)).toBeVisible();
    await expect(footer.getByText(authority)).toBeVisible();
    // подпись номера зависит от формы: у предпринимателя это ОГРНИП
    await expect(footer.getByText('ОГРНИП', { exact: true })).toBeVisible();

    /* 🔴 Адрес регистрации предпринимателя — как правило домашний, то есть
       персональные данные, и на сайт он не выводится (PROJECT §5.1). Проверять
       это обязано именно здесь: в футере он стоял бы рядом с адресом приёма, и
       глазом их не различить. */
    await expect(page.getByText(HOME_ADDRESS)).toHaveCount(0);
    await expect(page.getByText(BANK_ACCOUNT)).toHaveCount(0);

    // политика печатает те же реквизиты: оператор ПДн и продавец — одно лицо
    await page.goto('/privacy');
    await expect(page.getByText(OGRNIP).first()).toBeVisible();
    await expect(page.getByText(authority).first()).toBeVisible();
    await expect(page.getByText(HOME_ADDRESS)).toHaveCount(0);
  });

  test('🔴 публичный маршрут не отдаёт домашний адрес и банк', async ({ page }) => {
    await withAdmin((api) =>
      api.putSetting('legal', {
        form: 'ИП',
        name: 'Проверкин Проверка Проверкович',
        inn: '710703123450',
        ogrn: OGRNIP,
        regDate: '2015-03-12',
        regAuthority: 'ИФНС проверки',
        address: HOME_ADDRESS,
        bankName: 'Банк проверки',
        bankBik: '047003608',
        bankAccount: BANK_ACCOUNT,
        bankCorrAccount: '30101810700000000004',
      }),
    );

    // без сессии: маршрут публичный по контракту (docs/API.md §5)
    const response = await page.request.get('/api/settings/legal');
    expect(response.status()).toBe(200);

    const body = JSON.stringify(await response.json());
    expect(body).toContain(OGRNIP);
    expect(body).not.toContain('Рязанская');
    expect(body).not.toContain(BANK_ACCOUNT);
    expect(body).not.toContain('047003608');
  });

  test('форма показывает поля выбранной формы и спрашивает при смене', async ({ page }) => {
    await loginViaUi(page);
    await page.goto('/admin/company');

    const form = page.locator('form').filter({ has: page.getByLabel('Форма') });
    await expect(form.getByLabel('ОГРНИП')).toBeVisible();
    // у предпринимателя КПП не бывает — поле не спрятано, его нет
    await expect(form.getByLabel('КПП')).toHaveCount(0);

    /* 🔴 Клик и ввод до гидрации уходят мимо состояния React. Признак живой
       формы — что переключатель поднимает окно подтверждения: до гидрации
       обработчик не навешен, и окна не будет. */
    await expect(async () => {
      await form.getByLabel('Форма').selectOption('ООО');
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 45_000 });

    // окно называет исчезающее словами, а не «данные будут удалены»
    await expect(page.getByRole('dialog')).toContainText('ОГРНИП');

    await page.getByRole('button', { name: 'Оставить как есть' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // отказ не поменял ничего: ни переключателя, ни состава полей
    await expect(form.getByLabel('Форма')).toHaveValue('ИП');
    await expect(form.getByLabel('ОГРНИП')).toBeVisible();
  });
});
