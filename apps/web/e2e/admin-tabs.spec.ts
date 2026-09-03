import { expect, test, type Page } from '@playwright/test';

import {
  ORDER_CARD_TAB_TITLE,
  ORDER_TAB_TITLE,
  orderManagerContent as orderTexts,
} from '@/features/order-manager/content';
import { reviewModerationContent as reviewTexts } from '@/features/review-moderation/content';

import { ADMIN_LOGIN, ADMIN_PASSWORD, BASE_URL } from './support/admin-api';
import { loginViaUi } from './support/admin-ui';

/**
 * Вкладка живёт в адресе — issue #343 (веха «Панель · Фаза 7»).
 *
 * Четыре сценария: прямая ссылка на вкладку, история браузера, мусор в
 * параметре и ссылка, присланная коллеге.
 *
 * 🔴 «Пришло с сервера» проверяется по тексту ответа, а не по экрану: с
 * выключенным JS у страницы с `loading.tsx` на экране остаётся заготовка —
 * подменяет её встроенный скрипт React. Поэтому разметку читает
 * `page.request`, и вкладка ищется в ней тем же признаком, каким её видит
 * человек: `aria-current` у ссылки и снятый `hidden` у панели.
 *
 * Вкладок в словаре тридцать, собранных на сегодня — двенадцать: пять стопок
 * заказов, четыре вкладки отзывов и три вкладки карточки наряда. Обзор,
 * карточки клиента и монтажника, склад и статья вкладками ещё не собраны —
 * их строят Фазы 8–10, и сценарий дополняется вместе с ними.
 */
test.use({ baseURL: BASE_URL });

/* Ширины сценарий задаёт сам: профиль телефона повторял бы те же шаги. */
test.skip(({ isMobile }) => isMobile === true, 'вкладки не зависят от ширины');

const REVIEWS = '/admin/reviews';
const ORDERS = '/admin/orders';

/** Четыре случая мусора из issue #341. `undefined` — параметра нет вовсе. */
const GARBAGE: readonly (string | undefined)[] = [
  undefined,
  'pendign',
  'materials',
  'x'.repeat(600),
];

function withTab(path: string, tab: string | undefined): string {
  return tab === undefined ? path : `${path}?tab=${encodeURIComponent(tab)}`;
}

/**
 * Подпись вкладки, отмеченной открытой в присланной разметке.
 *
 * Лент вкладок в ответе бывает две: заготовка `loading.tsx` и сама страница.
 * Открытую вкладку отмечает только вторая — заготовка адреса не знает.
 */
function activeChip(html: string, navLabel: string): string | null {
  const navs = html.match(new RegExp(`<nav[^>]*aria-label="${navLabel}"[\\s\\S]*?</nav>`, 'g'));
  if (navs === null) return null;

  for (const nav of navs) {
    const link = nav.match(/<a\b[^>]*aria-current="page"[^>]*>([^<]*)<\/a>/);
    if (link !== null) return link[1] ?? null;
  }
  return null;
}

/** Ключ панели карточки, пришедшей открытой: у остальных стоит `hidden`. */
function openCardPanel(html: string): string | null {
  const panels = html.matchAll(/<div\b([^>]*\bid="order-panel-([a-z]+)"[^>]*)>/g);

  for (const [, attrs, key] of panels) {
    if (attrs !== undefined && !/\bhidden\b/.test(attrs)) return key ?? null;
  }
  return null;
}

async function html(page: Page, path: string): Promise<{ status: number; body: string }> {
  const response = await page.request.get(path);
  return { status: response.status(), body: await response.text() };
}

/** Номер наряда для карточки: берётся из панели, а не заводится своим. */
async function anyOrderId(page: Page): Promise<string> {
  const response = await page.request.get('/api/admin/orders?tab=all');
  expect(response.status()).toBe(200);

  const payload: unknown = await response.json();
  const items = (payload as { items?: readonly { id?: string }[] }).items ?? [];
  const id = items[0]?.id;

  expect(id, 'в дев-базе нет ни одного наряда — карточку не на чем открыть').toBeTruthy();
  return id ?? '';
}

/** Гидратация: до неё кнопка вкладки — просто кнопка (HANDOFF, «чему научила»). */
async function settled(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
}

/** Значок дев-панели Next перехватывает клики в углу экрана. */
async function hideDevOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('nextjs-portal').forEach((overlay) => {
      overlay.remove();
    });
  });
}

test.describe('Вкладки разделов панели', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page);
  });

  test.afterEach(async ({ page }) => {
    // сессия UI-входа гасится: прогоны не копят записи Session в базе
    await page.request.post('/api/auth/logout').catch(() => undefined);
  });

  test('сценарий 1: прямая ссылка отдаёт свою вкладку первым же HTML', async ({ page }) => {
    // двенадцать адресов подряд: в деве каждый сервер может собирать с нуля
    test.slow();

    /* Стопки заказов: ключ адреса `declined` — это доменная стопка
       `cancelled`, вкладка «Отказы» (ADR-255). */
    const stacks = [
      [undefined, 'active'],
      ['new', 'new'],
      ['history', 'history'],
      ['declined', 'cancelled'],
      ['all', 'all'],
    ] as const;

    for (const [tab, stack] of stacks) {
      const { status, body } = await html(page, withTab(ORDERS, tab));

      expect(status, `${ORDERS} ?tab=${tab ?? '—'}`).toBe(200);
      expect(activeChip(body, orderTexts.tabsLabel), `${ORDERS} ?tab=${tab ?? '—'}`).toBe(
        ORDER_TAB_TITLE[stack],
      );
    }

    for (const tab of ['pending', 'published', 'rejected', 'all'] as const) {
      const path = tab === 'pending' ? REVIEWS : withTab(REVIEWS, tab);
      const { status, body } = await html(page, path);

      expect(status, path).toBe(200);
      expect(activeChip(body, reviewTexts.filterLabel), path).toBe(reviewTexts.tabTitle(tab));
    }

    const orderId = await anyOrderId(page);

    for (const tab of ['job', 'checklist', 'documents'] as const) {
      const path = withTab(`${ORDERS}/${orderId}`, tab === 'job' ? undefined : tab);
      const { status, body } = await html(page, path);

      expect(status, path).toBe(200);
      expect(openCardPanel(body), path).toBe(tab);
    }
  });

  test('сценарий 2: «назад» ведёт по вкладкам, а не из раздела', async ({ page }) => {
    test.slow();

    const orderId = await anyOrderId(page);
    const card = `${ORDERS}/${orderId}`;

    await page.goto(ORDERS);
    await settled(page);
    await hideDevOverlay(page);
    await page.goto(card);
    await settled(page);

    const panel = (key: string) => page.locator(`#order-panel-${key}`);

    /* Первое переключение — с повтором: до гидратации кнопка вкладки ничего
       не делает, а после — переключает мгновенно, без обращения к серверу. */
    await expect(async () => {
      await page.getByRole('tab', { name: ORDER_CARD_TAB_TITLE.checklist }).click();
      await expect(panel('checklist')).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 45_000 });

    expect(new URL(page.url()).search).toBe('?tab=checklist');

    /* 🔴 Прокрутка не сбрасывается: вкладки одной карточки сравнивают, стоя
       в середине страницы (issue #342). Лента вкладок остаётся на месте. */
    await page.evaluate(() => window.scrollTo(0, 120));
    const before = await page.evaluate(() => Math.round(window.scrollY));

    await page.getByRole('tab', { name: ORDER_CARD_TAB_TITLE.documents }).click();
    await expect(panel('documents')).toBeVisible();
    expect(new URL(page.url()).search).toBe('?tab=documents');
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(before);

    await page.goBack();
    await expect(panel('checklist')).toBeVisible();
    expect(new URL(page.url()).search).toBe('?tab=checklist');

    await page.goBack();
    await expect(panel('job')).toBeVisible();
    expect(new URL(page.url()).search).toBe('');

    await page.goForward();
    await expect(panel('checklist')).toBeVisible();
    expect(new URL(page.url()).search).toBe('?tab=checklist');

    /* Из первой вкладки «назад» уводит из карточки — но не из панели. */
    await page.goBack();
    await page.goBack();
    await page.waitForURL((url) => url.pathname === ORDERS);

    /* Отзывы переключаются обычными ссылками: история и вкладка совпадают на
       каждом шаге. */
    await page.goto(REVIEWS);
    await settled(page);

    const chip = page.locator(`nav[aria-label="${reviewTexts.filterLabel}"] a[aria-current]`);
    await expect(chip).toHaveText(reviewTexts.tabTitle('pending'));

    await page.getByRole('link', { name: reviewTexts.tabTitle('rejected'), exact: true }).click();
    await expect(chip).toHaveText(reviewTexts.tabTitle('rejected'));
    expect(new URL(page.url()).search).toBe('?tab=rejected');

    await page.goBack();
    await expect(chip).toHaveText(reviewTexts.tabTitle('pending'));
    expect(new URL(page.url()).search).toBe('');
  });

  test('сценарий 3: мусор в параметре даёт 200 и первую вкладку', async ({ page }) => {
    const orderId = await anyOrderId(page);

    for (const tab of GARBAGE) {
      const reviews = await html(page, withTab(REVIEWS, tab));
      expect(reviews.status, `отзывы ?tab=${tab ?? '—'}`).toBe(200);
      expect(activeChip(reviews.body, reviewTexts.filterLabel)).toBe(
        reviewTexts.tabTitle('pending'),
      );

      const orders = await html(page, withTab(ORDERS, tab));
      expect(orders.status, `заказы ?tab=${tab ?? '—'}`).toBe(200);
      expect(activeChip(orders.body, orderTexts.tabsLabel)).toBe(ORDER_TAB_TITLE.active);

      const card = await html(page, withTab(`${ORDERS}/${orderId}`, tab));
      expect(card.status, `карточка ?tab=${tab ?? '—'}`).toBe(200);
      expect(openCardPanel(card.body)).toBe('job');
    }
  });

  test('сценарий 4: ссылка на вкладку открывается у коллеги в чистом контексте', async ({
    browser,
  }) => {
    const shared = `${REVIEWS}?tab=rejected`;

    /* Свой контекст без единой cookie: так ссылку открывает коллега, который
       вкладку в этом разделе ни разу не переключал. */
    const context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();

    try {
      await page.goto(shared);

      /* Страж уводит на вход, сохранив адрес в `next`: после входа человек
         обязан попасть на ту вкладку, ссылку на которую ему прислали. */
      await page.waitForURL((url) => url.pathname === '/admin/login');

      await expect(async () => {
        await page.getByRole('button', { name: 'Войти' }).click();
        await expect(page.getByText('Введите логин')).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 45_000 });

      await page.locator('input[name="login"]').fill(ADMIN_LOGIN);
      await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Войти' }).click();

      await page.waitForURL((url) => url.pathname === REVIEWS);
      expect(new URL(page.url()).search).toBe('?tab=rejected');

      await expect(
        page.locator(`nav[aria-label="${reviewTexts.filterLabel}"] a[aria-current]`),
      ).toHaveText(reviewTexts.tabTitle('rejected'));
    } finally {
      await page.request.post('/api/auth/logout').catch(() => undefined);
      await context.close();
    }
  });
});
