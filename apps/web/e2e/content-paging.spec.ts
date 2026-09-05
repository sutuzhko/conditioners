import { expect, test, type Page } from '@playwright/test';

import { BASE_URL, withAdmin } from './support/admin-api';
import { loginViaUi } from './support/admin-ui';

/**
 * Разбивка каталога и базы знаний — issue #612, #614, проверка #616.
 *
 * 🔴 Проверяется тем, ради чего разбивка и заведена: списками длиннее одной
 * страницы. До неё разделы читали базу целиком (`listAll`), и при восьми
 * моделях этого не было видно — отсутствие было настоящим, но не наблюдаемым.
 * Поэтому сценарий сам заводит одиннадцать записей и убирает их за собой.
 *
 * 🔴 И второе, чего не показывает ни один юнит: **поиск переезжает вместе со
 * страницей**. Ссылка «2», потерявшая условие отбора, показывает вторую
 * страницу всего раздела — то есть чужие записи под видом найденных.
 */

test.use({ baseURL: BASE_URL });

/** Сколько записей на странице списка панели (`shared/lib/paging`). */
const PAGE_SIZE = 8;

/** Записей заводим на три больше страницы: две страницы, вторая не пустая. */
const TOTAL = PAGE_SIZE + 3;

/** Что стоит в адресе после перехода по ссылке разбивки. */
function params(page: Page): URLSearchParams {
  return new URL(page.url()).searchParams;
}

test.describe('Каталог: разбивка и поиск', () => {
  test('🔴 вторая страница показывает остаток, и поиск едет вместе с ней', async ({ page }) => {
    /* Одиннадцать записей плюс несколько переходов: в деве каждую страницу
       сервер может собирать с нуля. */
    test.slow();

    /* Метка своя и заведомо уникальная: база живая, и совпадение с настоящей
       моделью сделало бы проверку недостоверной. */
    const mark = `E2E-каталог-${Date.now()}`;
    const created: string[] = [];

    await withAdmin(async (api) => {
      try {
        for (let index = 1; index <= TOTAL; index += 1) {
          const product = await api.createProduct({
            name: `${mark} № ${index}`,
            badge: '09',
            areaMax: 25,
            priceNum: 30_000 + index,
            /* В конец списка: порядок панели — это порядок витрины, и свои
               строки не должны разъехаться по чужим страницам. */
            sort: 9_000 + index,
          });
          created.push(product.id);
        }

        await loginViaUi(page);
        await page.goto(`/admin/catalog?q=${encodeURIComponent(mark)}`);

        const rows = page.locator('[data-block="catalog"] tbody tr');
        await expect(rows).toHaveCount(PAGE_SIZE);

        /* Счётчики шапки считаются по всему каталогу, а не по странице: они и
           не обязаны совпасть с числом строк — но список обязан быть окном. */
        const pager = page.getByRole('navigation', { name: 'Страницы списка моделей' });
        await expect(pager).toBeVisible();

        await pager.getByRole('link', { name: 'Страница 2' }).click();
        await page.waitForURL((url) => url.searchParams.get('page') === '2');

        /* 🔴 Условие отбора уехало на вторую страницу вместе со страницей. */
        expect(params(page).get('q')).toBe(mark);
        await expect(rows).toHaveCount(TOTAL - PAGE_SIZE);
        await expect(rows.first()).toContainText(mark);
      } finally {
        for (const id of created) await api.deleteProduct(id);
      }
    });
  });
});

test.describe('База знаний: разбивка, поиск и подпись строки', () => {
  test('🔴 вторая страница, отбор в адресе и адрес статьи в подписи', async ({ page }) => {
    test.slow();

    const mark = `E2E-статья-${Date.now()}`;
    const category = `${mark}-рубрика`;
    const created: string[] = [];

    await withAdmin(async (api) => {
      try {
        for (let index = 1; index <= TOTAL; index += 1) {
          const article = await api.createArticle({
            title: `${mark} № ${index}`,
            category,
            /* Разные дни: список идёт по дате, и одинаковая дата у всех
               оставила бы порядок страниц на усмотрение базы. */
            date: `2026-08-${String(index).padStart(2, '0')}`,
            minutes: 4,
            excerpt: `Служебная статья сквозного сценария ${mark}. Удаляется после прогона.`,
            body: `## ${mark}\n\nСлужебный текст сквозного сценария. Удаляется после прогона.`,
            /* Половина черновиками: на них проверяется фильтр состояния и
               отключённое «Смотреть на сайте» (issue #615). */
            published: index % 2 === 1,
          });
          created.push(article.id);
        }

        await loginViaUi(page);
        await page.goto(`/admin/knowledge?q=${encodeURIComponent(mark)}`);

        const rows = page.locator('[data-block="articles"] tbody tr');
        await expect(rows).toHaveCount(PAGE_SIZE);

        /* 🔴 Подпись строки несёт адрес статьи и длину её текста (issue #614):
           слаг задаёт владелец, и на него завязаны разосланные ссылки. */
        await expect(rows.first()).toContainText('/knowledge/');
        await expect(rows.first()).toContainText('знаков');

        const pager = page.getByRole('navigation', { name: 'Страницы списка статей' });
        await pager.getByRole('link', { name: 'Страница 2' }).click();
        await page.waitForURL((url) => url.searchParams.get('page') === '2');

        expect(params(page).get('q')).toBe(mark);
        await expect(rows).toHaveCount(TOTAL - PAGE_SIZE);

        /* 🔴 Фильтр состояния сбрасывает страницу на первую: остаток отбора,
           показанный на четвёртой странице нового списка, выглядел бы как
           «ничего не нашлось». */
        await page.goto(`/admin/knowledge?q=${encodeURIComponent(mark)}&state=draft`);
        /* Черновиками заведена каждая нечётная — их на одну больше половины. */
        await expect(rows).toHaveCount(Math.ceil(TOTAL / 2));

        /* 🔴 У черновика адреса на сайте нет — действие отключено и называет
           причину (issue #615). */
        const draft = rows.first();
        await expect(
          draft.getByRole('button', { name: /^Черновик, на сайте его ещё нет/ }),
        ).toBeDisabled();

        /* Отбор, который ничего не находит, объясняется сбросом, а не
           предложением написать статью (issue #335). */
        await page.goto(`/admin/knowledge?q=${encodeURIComponent(`${mark}-нет-такого`)}`);
        await expect(page.getByRole('link', { name: 'Показать все статьи' })).toBeVisible();
      } finally {
        for (const id of created) await api.deleteArticle(id);
      }
    });
  });
});
