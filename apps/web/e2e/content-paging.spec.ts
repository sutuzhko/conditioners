import { expect, test, type Page } from '@playwright/test';

import { ADMIN_PAGE_SIZE } from '@/shared/lib/paging';
import { pagerLabels } from '@/shared/ui/Pager/labels';

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

/**
 * Сколько записей на странице списка панели.
 *
 * 🔴 Берётся у приложения, а не переписывается числом. Скопированная сюда
 * восьмёрка — второй источник правды о размере страницы: он молчит ровно до
 * того дня, когда размер поменяют, и тогда сценарий начинает проверять
 * разбивку, которой в панели уже нет.
 */
const PAGE_SIZE = ADMIN_PAGE_SIZE;

/** Записей заводим на три больше страницы: две страницы, вторая не пустая. */
const TOTAL = PAGE_SIZE + 3;

/**
 * План статей сценария: номер и состояние.
 *
 * 🔴 Один список, из которого статьи и создаются, и по которому потом
 * считается ожидание. Пока «сколько черновиков» вычислялось второй формулой
 * рядом, она разошлась с фикстурой и молча проверяла не то: формула обещала
 * шесть черновиков, а заводились пять — черновиками оказывались чётные
 * номера, а не нечётные.
 */
const ARTICLE_PLAN = Array.from({ length: TOTAL }, (_, index) => ({
  number: index + 1,
  /* Каждая вторая — черновик: на них проверяется фильтр состояния и
     отключённое «Смотреть на сайте» (issue #615). */
  published: index % 2 === 0,
}));

/** Сколько черновиков завёл сценарий — по тому же списку, что их создаёт. */
const DRAFTS = ARTICLE_PLAN.filter((article) => !article.published).length;

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

        /* 🔴 Шагом, а не номером: ниже 600px полосы номеров нет вовсе — её
           место занимает подпись положения (PIXEL_SPEC П-15), и пять номеров
           не помещались в колонку 256px на ширине 320. Сценарий гоняется на
           узком окне, и целиться в номер здесь означало бы проверять то, чего
           на этой ширине не рисуется.

           🔴 Имя шага берётся у кита, а не переписывается строкой (issue
           #748). Здесь стояло «Дальше →» — слово исчезло вместе с правкой,
           когда шаг в панели стал шевроном, и сценарий пятнадцать секунд ждал
           ссылку, которой в разметке нет. */
        await pager.getByRole('link', { name: pagerLabels.nextPage }).click();
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
        for (const planned of ARTICLE_PLAN) {
          const article = await api.createArticle({
            title: `${mark} № ${planned.number}`,
            category,
            /* Разные дни: список идёт по дате, и одинаковая дата у всех
               оставила бы порядок страниц на усмотрение базы. */
            date: `2026-08-${String(planned.number).padStart(2, '0')}`,
            minutes: 4,
            excerpt: `Служебная статья сквозного сценария ${mark}. Удаляется после прогона.`,
            body: `## ${mark}\n\nСлужебный текст сквозного сценария. Удаляется после прогона.`,
            published: planned.published,
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
        /* 🔴 Шагом, а не номером: ниже 600px полосы номеров нет вовсе — её
           место занимает подпись положения (PIXEL_SPEC П-15), и пять номеров
           не помещались в колонку 256px на ширине 320. Сценарий гоняется на
           узком окне, и целиться в номер здесь означало бы проверять то, чего
           на этой ширине не рисуется.

           🔴 Имя шага берётся у кита, а не переписывается строкой (issue
           #748). Здесь стояло «Дальше →» — слово исчезло вместе с правкой,
           когда шаг в панели стал шевроном, и сценарий пятнадцать секунд ждал
           ссылку, которой в разметке нет. */
        await pager.getByRole('link', { name: pagerLabels.nextPage }).click();
        await page.waitForURL((url) => url.searchParams.get('page') === '2');

        expect(params(page).get('q')).toBe(mark);
        await expect(rows).toHaveCount(TOTAL - PAGE_SIZE);

        /* 🔴 Фильтр состояния сбрасывает страницу на первую: остаток отбора,
           показанный на четвёртой странице нового списка, выглядел бы как
           «ничего не нашлось». */
        await page.goto(`/admin/knowledge?q=${encodeURIComponent(mark)}&state=draft`);
        /* Черновики умещаются на одну страницу — иначе строка ниже мерила бы
           не число черновиков, а размер окна, и молча проходила бы при любом
           дефекте фильтра. */
        expect(DRAFTS).toBeLessThanOrEqual(PAGE_SIZE);
        await expect(rows).toHaveCount(DRAFTS);

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

/**
 * Переход по страницам не двигает прокрутку — issue #735.
 *
 * 🔴 Ряд разбивки стоит под списком, то есть внизу блока: до него
 * прокручивают. Умолчание Next — бросить документ в начало — уносило из-под
 * глаз ровно тот список, ради которого нажали шаг вперёд, и человек оказывался
 * на приветствии раздела. Проверяется здесь, а не юнитом: `scroll={false}` в
 * разметке юнит увидит, а увидит ли его браузер — нет.
 */
test.describe('Разбивка: переход остаётся на месте', () => {
  /**
   * 🔴 Две **полные** страницы, а не страница с остатком.
   *
   * Неполная вторая страница короче первой, документ на ней сжимается, и
   * браузер сам подрезает прокрутку до нового предела. Проверка «не
   * сдвинулось» тогда падала бы на исправном коде — то есть мерила бы длину
   * остатка, а не поведение перехода. Соседние сценарии файла берут
   * `PAGE_SIZE + 3` по обратной причине: им нужен как раз остаток.
   */
  const FULL_PAGES = PAGE_SIZE * 2;

  test('🔴 шаг вперёд не сбрасывает прокрутку и объявляет новую страницу', async ({ page }) => {
    test.slow();

    const mark = `E2E-прокрутка-${Date.now()}`;
    const created: string[] = [];

    await withAdmin(async (api) => {
      try {
        for (let index = 1; index <= FULL_PAGES; index += 1) {
          const product = await api.createProduct({
            name: `${mark} № ${String(index).padStart(2, '0')}`,
            badge: '09',
            areaMax: 25,
            priceNum: 30_000 + index,
            sort: 9_000 + index,
          });
          created.push(product.id);
        }

        await loginViaUi(page);
        await page.goto(`/admin/catalog?q=${encodeURIComponent(mark)}`);

        const rows = page.locator('[data-block="catalog"] tbody tr');
        await expect(rows).toHaveCount(PAGE_SIZE);

        const pager = page.getByRole('navigation', { name: 'Страницы списка моделей' });
        await expect(pager).toBeVisible();

        /* 🔴 Прокрутка уводится вниз до самой разбивки: на нуле «не
           сдвинулось» проверять нечего — там некуда двигаться, и сценарий
           прошёл бы и без правки. */
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        const scrollBefore = await page.evaluate(() => Math.round(window.scrollY));
        expect(
          scrollBefore,
          'страница обязана быть прокручена: иначе сброс прокрутки нечем заметить',
        ).toBeGreaterThan(0);

        /* Верх первой строки в окне — то, на что человек смотрит. Координата
           от окна, а не от документа: она отвечает на вопрос «список остался
           перед глазами», а не «сколько прокручено». */
        const rowBefore = await rows.first().boundingBox();
        expect(rowBefore).not.toBeNull();

        /* Имя шага — из кита: строка, переписанная сюда руками, разошлась с
           компонентом молча (issue #748). */
        await pager.getByRole('link', { name: pagerLabels.nextPage }).click();
        await page.waitForURL((url) => url.searchParams.get('page') === '2');

        /* Вторая страница дорисована: мерить посреди перехода значило бы
           мерить заготовку, а не список. */
        await expect(rows).toHaveCount(PAGE_SIZE);
        await expect(rows.first()).toContainText(
          `${mark} № ${String(PAGE_SIZE + 1).padStart(2, '0')}`,
        );

        expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(scrollBefore);

        const rowAfter = await rows.first().boundingBox();
        expect(rowAfter).not.toBeNull();
        if (rowBefore !== null && rowAfter !== null) {
          /* Допуск 1px: субпиксельная раскладка даёт разницу в сотых даже
             там, где не двинулось ничего. */
          expect(Math.abs(rowAfter.y - rowBefore.y)).toBeLessThanOrEqual(1);
        }

        /* 🔴 Видимого события больше нет — значит, о переходе обязано быть
           слышно: живая область разбивки называет новую страницу. */
        await expect(pager.getByRole('status')).toHaveText('Показана страница 2 из 2');
      } finally {
        for (const id of created) await api.deleteProduct(id);
      }
    });
  });
});
