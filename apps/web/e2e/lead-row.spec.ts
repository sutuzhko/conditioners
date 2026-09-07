import { expect, test, type Locator, type Page } from '@playwright/test';

import { leadManagerContent as texts } from '@/features/lead-manager/content';

import { BASE_URL, withAdmin } from './support/admin-api';
import { loginViaUi } from './support/admin-ui';

/**
 * Строка очереди обращений открывается целиком — issue #740.
 *
 * 🔴 Владелец целился в тему и во время и не попадал никуда: строка выглядела
 * целью, целью не являясь, — нажималось в ней одно имя. Ниже 600px, где
 * строка разворачивается карточкой на пол-экрана, это особенно заметно.
 *
 * 🔴 Проверяется браузером, а не юнитом. Площадь строке отдаёт растянутое
 * перекрытие ссылки: в jsdom раскладки нет, и «попал ли курсор в цель» там
 * не спрашивается вовсе. Отсюда и нажатия координатами — `click()` Playwright
 * на ячейке упирается в проверку достижимости и сообщает, что ячейку
 * перехватывает ссылка. Это не дефект, а ровно тот механизм, который
 * проверяется: слать `force: true` значило бы обойти проверяемое.
 *
 * 🔴 Сценарий не знает ни одного имени класса раздела. Он целится в то, что
 * видит человек: подпись колонки у ячейки, роль ссылки, роль кнопки меню, —
 * поэтому переезд приёма в кит его не ломает.
 *
 * Своих обращений сценарий не заводит: он ничего не меняет, только смотрит.
 * Публичная форма `POST /api/leads` держит ограничитель частоты, и лишнее
 * обращение с неё стоило бы отказов соседнему сценарию (`lead-delete`).
 */

test.use({ baseURL: BASE_URL });

const LEADS = '/admin/leads';

/** Что сценарию нужно знать о строке, чтобы проверить, куда она ведёт. */
interface RowFacts {
  /** Идентификатор обращения из адреса ссылки строки. */
  readonly id: string;
  /** Имя — оно же заголовок открытой карточки. */
  readonly name: string;
  /** Номер обращения: по нему называется меню действий строки. */
  readonly number: number;
}

test.beforeAll(async () => {
  const leads = await withAdmin((api) => api.listLeads());
  expect(
    leads.length,
    'на стенде нет ни одного обращения: очередь сценарию не с чем показать',
  ).toBeGreaterThan(0);
});

/** Очередь с начала: возвращает первую строку списка. */
async function openQueue(page: Page): Promise<Locator> {
  await page.goto(LEADS);

  const row = page.locator('[data-block="leads"] tbody tr').first();
  await expect(row).toBeVisible({ timeout: 30_000 });

  return row;
}

/** Ссылка строки. Она одна на строку — это и есть проверяемое требование. */
function rowLink(row: Locator): Locator {
  return row.getByRole('link');
}

/** Кнопка меню действий строки: единственная кнопка строки. */
function rowMenuButton(row: Locator): Locator {
  return row.getByRole('button');
}

/** Ячейка строки по подписи её колонки — та же подпись, что видна в карточном режиме. */
function cell(row: Locator, column: string): Locator {
  return row.locator(`td[data-label="${column}"]`);
}

async function factsOf(row: Locator): Promise<RowFacts> {
  const link = rowLink(row);
  await expect(link, 'у строки ровно одна ссылка').toHaveCount(1);

  const href = await link.getAttribute('href');
  expect(href, 'ссылка строки ведёт на обращение').not.toBeNull();

  const id = new URL(href ?? '', BASE_URL).searchParams.get('lead');
  expect(id, 'в адресе строки стоит открываемое обращение').not.toBeNull();

  const name = (await link.innerText()).trim();
  const number = Number.parseInt((await cell(row, texts.colNumber).innerText()).trim(), 10);
  expect(Number.isFinite(number), 'номер обращения читается из строки').toBe(true);

  return { id: id ?? '', name, number };
}

/**
 * Нажатие в середину ячейки — курсором, а не по элементу.
 *
 * 🔴 Именно так нажимает человек: он целится в место строки, а не в узел
 * разметки. Нажатие по элементу здесь и не прошло бы — ячейку накрывает
 * ссылка, и Playwright справедливо отказался бы считать ячейку достижимой.
 */
async function clickInside(page: Page, target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded();

  const box = await target.boundingBox();
  expect(box, 'ячейка нарисована и у неё есть площадь').not.toBeNull();
  if (box === null) return;

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/** Открылось ли то самое обращение: и адрес, и заголовок карточки. */
async function expectOpened(page: Page, facts: RowFacts): Promise<void> {
  await page.waitForURL((url) => url.searchParams.get('lead') === facts.id);
  await expect(page.getByRole('heading', { name: facts.name })).toBeVisible({ timeout: 30_000 });
}

test.describe('Очередь обращений: нажимается вся строка', () => {
  /**
   * 🔴 Профиль `mobile` (Pixel 7, 412px) сам даёт карточный режим: ниже 600px
   * строка разворачивается карточкой. Отдельного сценария под эту ширину нет
   * намеренно — проверяется одно и то же поведение, и второй его список
   * разошёлся бы с первым на первой же правке.
   */
  test('🔴 «Тема» и «Когда» открывают ту же карточку, что имя', async ({ page }) => {
    /* Вход, очередь и три перехода к карточке: в деве каждый экран собирается
       с нуля. */
    test.slow();

    await loginViaUi(page);

    const row = await openQueue(page);
    const facts = await factsOf(row);

    /* Опорная точка: то, что делало имя до правки. */
    await rowLink(row).click();
    await expectOpened(page, facts);

    for (const column of [texts.colTopic, texts.colWhen]) {
      const back = await openQueue(page);
      await clickInside(page, cell(back, column));
      await expectOpened(page, facts);
    }
  });

  /**
   * 🔴 Меню действий остаётся своей целью. «Позвонить» обязано звонить, а не
   * открывать карточку: под сплошным перекрытием строки кнопка меню стала бы
   * недостижимой, и раздел потерял бы удаление обращения из списка (#601).
   */
  test('🔴 меню действий строки карточку не открывает', async ({ page }) => {
    test.slow();

    await loginViaUi(page);

    const row = await openQueue(page);
    const facts = await factsOf(row);

    const menu = rowMenuButton(row);
    await expect(menu).toHaveCount(1);
    await expect(menu).toHaveAccessibleName(texts.rowActions(facts.number));

    /* Обычным нажатием, а не координатами: пройденная проверка достижимости
       и есть доказательство, что кнопку ничто не накрывает. */
    await menu.click();

    await expect(page.getByRole('menu', { name: texts.rowActions(facts.number) })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: texts.rowCall })).toBeVisible();

    expect(
      new URL(page.url()).searchParams.get('lead'),
      'меню открылось, а карточка — нет',
    ).toBeNull();
  });

  /**
   * 🔴 Целей у строки не прибавилось. Ссылка на каждой ячейке превратила бы
   * очередь из восьми обращений в сорок восемь одинаковых остановок, а список
   * ссылок в озвучке — в перечень из сорока восьми имён.
   */
  test('🔴 строка даёт одну остановку клавиатуре и называет обращение', async ({ page }) => {
    test.slow();

    await loginViaUi(page);

    const row = await openQueue(page);
    const facts = await factsOf(row);

    const link = rowLink(row);
    await expect(link).toHaveAccessibleName(texts.rowOpen(facts.number, facts.name));

    await link.focus();
    await expect(link).toBeFocused();

    /* Следующая остановка — действия той же строки, а не вторая ссылка на
       соседнюю ячейку: между именем и меню в строке нет ничего достижимого. */
    await page.keyboard.press('Tab');
    await expect(rowMenuButton(row)).toBeFocused();
  });
});
