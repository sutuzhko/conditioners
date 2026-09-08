import { expect, test, type Page } from '@playwright/test';

import { BASE_URL, withAdmin, type AdminLead } from './support/admin-api';
import { loginViaUi } from './support/admin-ui';

/**
 * Панель не теряет введённое — веха «Интерфейс · Фаза 8» (issue #36).
 *
 * Три сценария, каждый про свой способ потерять работу владельца:
 *
 * 1. уход со страницы «Компания» с несохранённым вводом (issue #32);
 * 2. смена статуса заявки, которую сервер не принял (issue #33);
 * 3. удаление заполненной строки прайса (issue #35).
 *
 * 🔴 Ни один из трёх ничего не пишет в базу. Правки компании и прайса не
 * сохраняются вовсе, а отказ сервера подделывается перехватом запроса в
 * браузере — до базы он не доходит. Это не поблажка сценарию: проверяется
 * ровно то, что происходит с экраном, когда запись **не** случилась, и
 * настоящая поломка сервера тут была бы лишней переменной.
 *
 * Проверка того, что база не тронута, всё равно идёт через админ-API: без неё
 * «ушли, не сохранив» ничем не отличалось бы от «ушли, сохранив молча».
 */

test.use({ baseURL: BASE_URL });

/* Поведение от ширины не зависит: проверяется, что спрашивают и откатывают, а
   не как это разложено. Раскладка панели — дело `admin-layout`. Заодно вдвое
   меньше проходов входа. */
test.skip(({ isMobile }) => isMobile === true, 'потеря ввода не зависит от ширины');

/* Один вход на файл: три сценария подряд в одном окне. Каждый свой вход стоил
   бы трёх сессий в базе стенда и трёх минут прогона. */
test.describe.configure({ mode: 'serial' });

/** Значение, которое нельзя спутать с настоящими данными стенда. */
const marker = `E2E-не-сохранять-${Date.now()}`;

/** Любое обращение со стенда: сценарий его не меняет и возвращать нечего. */
async function anyLead(): Promise<AdminLead> {
  return withAdmin(async (admin) => {
    const [first] = await admin.listLeads();
    if (first === undefined) {
      throw new Error('На стенде нет ни одного обращения: сценарию не с чем работать');
    }
    return first;
  });
}

/**
 * Форма ожила.
 *
 * 🔴 До гидрации ввод не попадает в состояние React: поле показывает букву, а
 * форма считает себя нетронутой — и вопроса об уходе не будет. Признак живой
 * формы — появившаяся кнопка «Отменить правки»: её рисует то самое состояние.
 */
async function waitCompanyFormAlive(page: Page, field: string): Promise<void> {
  const counter = page.getByLabel(field);
  await expect(counter).toBeVisible({ timeout: 30_000 });

  await expect(async () => {
    await counter.fill(marker);
    await expect(page.getByRole('button', { name: 'Отменить правки' })).toBeVisible({
      timeout: 2_000,
    });
  }).toPass({ timeout: 45_000 });
}

test.describe('Панель не теряет введённое', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({ baseURL: BASE_URL });
    await loginViaUi(page);
  });

  test.afterAll(async () => {
    // сессия UI-входа гасится, чтобы прогоны не копили записи Session в базе
    await page.request.post('/api/auth/logout').catch(() => undefined);
    await page.close();
  });

  /**
   * 🔴 Главная проверка issue #32. Правки данных компании заполняют не за
   * минуту, а форма прежних значений не хранит: уход по ссылке уносил их
   * молча.
   */
  test('🔴 уход со страницы «Компания» с несохранённым вводом спрашивает', async () => {
    // в деве раздел собирается с нуля на каждый заход
    test.slow();

    await page.goto('/admin/company');

    const field = 'Номер счётчика Яндекс.Метрики';
    await waitCompanyFormAlive(page, field);

    const nav = page.getByRole('navigation', { name: 'Разделы панели управления' });
    await nav.getByRole('link', { name: 'Заявки' }).click();

    const ask = page.getByRole('dialog');
    await expect(ask).toContainText('Уйти, не сохранив правки?');
    /* Вопрос называет тронутую группу: «есть несохранённые изменения» на форме
       из тринадцати групп не говорит владельцу ничего. */
    await expect(ask).toContainText('Счётчики и кнопки');

    await ask.getByRole('button', { name: 'Остаться и сохранить' }).click();

    await expect(page).toHaveURL(/\/admin\/company/);
    await expect(page.getByLabel(field)).toHaveValue(marker);

    /* Второй заход: соглашаемся уйти — и введённое действительно теряется,
       потому что его никто не сохранял. */
    await nav.getByRole('link', { name: 'Заявки' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Уйти без сохранения' }).click();
    await page.waitForURL('**/admin/leads');

    // 🔴 То, ради чего сценарий и написан: в базе набранного нет
    await withAdmin(async (admin) => {
      const saved = await admin.getSetting('integrations');
      expect(JSON.stringify(saved)).not.toContain(marker);
    });
  });

  /**
   * 🔴 Проверка issue #33. Без отката на экране оставалось «В работе», а в
   * базе — прежнее: владелец закрывал сообщение об отказе, селектор показывал
   * новое значение, и заявка оставалась необработанной.
   */
  test('🔴 сервер не принял статус — селектор возвращается, а итог не объявляется', async () => {
    test.slow();

    const lead = await anyLead();
    await page.goto(`/admin/leads?lead=${lead.id}`);

    const status = page.getByLabel('Статус');
    await expect(status).toBeVisible({ timeout: 30_000 });

    /* Гидрацию ждём через кнопку заметки: её рисует состояние формы, и до
       оживления её нет. Заметка при этом не сохраняется — кнопку не жмём. */
    const note = page.getByLabel('Заметка менеджера');
    await expect(async () => {
      await note.fill('E2E');
      await expect(page.getByRole('button', { name: 'Сохранить заметку' })).toBeVisible({
        timeout: 2_000,
      });
    }).toPass({ timeout: 45_000 });
    await note.fill('');

    /* Отказ подделывается перехватом: до базы запрос не доходит, и заявка
       стенда остаётся нетронутой. */
    await page.route('**/api/admin/leads/**', async (route) => {
      if (route.request().method() !== 'PATCH') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Сервер не принял изменения' } }),
      });
    });

    /* Отказ — единственный переход с разбором причины (ADR-310), окно вместо
       запроса. Здесь нужен обычный переход. */
    const next = lead.status === 'in_progress' ? 'done' : 'in_progress';
    await status.selectOption(next);

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 30_000 });
    await expect(status).toHaveValue(lead.status);
    /* Подтверждения того, чего не произошло, на экране нет. */
    await expect(page.getByText('Заявка принята в работу')).toHaveCount(0);
    await expect(page.getByText('Заявка завершена')).toHaveCount(0);

    await page.unroute('**/api/admin/leads/**');

    await withAdmin(async (admin) => {
      expect((await admin.findLead(lead.id))?.status).toBe(lead.status);
    });
  });

  /**
   * 🔴 Проверка issue #35. Строку удаляют вместе с набранными в ней ценой и
   * сроком, и вернуть их нечем: форма истории не хранит.
   */
  test('🔴 удаление заполненной строки прайса спрашивает, отказ ничего не убирает', async () => {
    test.slow();

    await page.goto('/admin/prices');

    const rows = page.locator('input[aria-label^="Класс "]');
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    const before = await rows.count();

    /* Признак живой формы — «Добавить класс» действительно добавляет строку.
       Работаем со своей строкой: чужие цифры сценарий не трогает. */
    await expect(async () => {
      await page.getByRole('button', { name: 'Добавить класс' }).click();
      expect(await rows.count()).toBeGreaterThan(before);
    }).toPass({ timeout: 45_000 });

    // повторные нажатия из цикла ожидания могли добавить лишние пустые строки
    const mine = before + 1;
    while ((await rows.count()) > mine) {
      await page
        .getByRole('button', { name: /^Удалить строку/ })
        .last()
        .click();
    }

    const own = rows.nth(before);
    await own.fill('E2E 07');

    const remove = page.getByRole('button', { name: `Удалить строку ${mine}` });
    await remove.click();

    const ask = page.getByRole('dialog');
    await expect(ask).toContainText(`Удалить строку ${mine}?`);
    /* Окно называет исчезающее словами: «данные будут удалены» человеку,
       который смотрит на заполненную строку, не говорит ничего. */
    await expect(ask).toContainText('E2E 07');

    await ask.getByRole('button', { name: 'Оставить' }).click();
    await expect(own).toHaveValue('E2E 07');

    await remove.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Удалить строку' }).click();

    await expect(rows).toHaveCount(before);

    /* Ничего не сохранялось: прайс стенда обязан остаться прежним. */
    await withAdmin(async (admin) => {
      const prices = await admin.getPrices();
      expect(prices.prices.some((row) => row.cls === 'E2E 07')).toBe(false);
    });
  });
});
