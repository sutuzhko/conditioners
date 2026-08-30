import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  ADMIN_TABS,
  adminShellContent as texts,
  bottomSectionsFor,
  columnSectionsFor,
  navHrefOf,
  sectionsFor,
  type AdminSection,
} from '@/widgets/admin-shell/content';

import { loginViaUi } from './support/admin-ui';

/**
 * Оболочка панели на трёх ширинах.
 *
 * 🔴 Снимком это не проверяется. Снимок показывает одно состояние и молчит о
 * том, что раздел уехал за край, что подсветки текущего пункта нет вовсе и
 * что до навигации не добраться с клавиатуры. Сценарий обходит все разделы
 * на каждой ширине и меряет, а не смотрит.
 *
 * Ширины — те же, что у макета: 390 (телефон), 768 (планшет), 1440
 * (десктоп), плюс 320 нижней границей. До 900 навигация лежит нижней полосой
 * вкладок, от 900 — колонкой сбоку.
 */

/** Разделы владельца: все адреса панели, включая три под «Настройками». */
const SECTIONS = sectionsFor('owner');

/** Что стоит в нижней полосе: первые разделы списка, остальные — за «Ещё». */
const TABS = columnSectionsFor('owner').slice(0, ADMIN_TABS);

type NavKind = 'tabs' | 'column';

const SHELL: readonly { name: string; width: number; height: number; nav: NavKind }[] = [
  { name: 'минимум', width: 320, height: 720, nav: 'tabs' },
  { name: 'телефон', width: 390, height: 844, nav: 'tabs' },
  { name: 'планшет', width: 768, height: 1024, nav: 'tabs' },
  { name: 'десктоп', width: 1440, height: 900, nav: 'column' },
];

/** Минимальная тап-зона до 900px (DESIGN_BRIEF §6, ADR-183). */
const TAP = 44;

/* Профиль браузера сценарию безразличен: ширины он задаёт сам, а второй
   прогон тех же шестидесяти переходов стоит минут дев-сборки и не проверяет
   ничего нового. */
test.skip(({ isMobile }) => isMobile === true, 'ширины задаёт сам сценарий');

/**
 * 🔴 Значок дев-панели Next убирается перед замерами попадания.
 *
 * Он прибит к тому же углу экрана, что и первая вкладка, и перехватывает и
 * первый Tab, и точку в углу тап-зоны: без этого сценарий проверял бы не
 * панель, а мебель дев-сервера. В боевой сборке значка нет, и вызов там
 * ничего не делает.
 */
async function hideDevOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('nextjs-portal').forEach((overlay) => {
      overlay.remove();
    });
  });
}

/** Страница не едет вбок: горизонтальной прокрутки нет ни на одной ширине. */
async function expectNoSideScroll(page: Page, where: string): Promise<void> {
  const size = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));

  expect(size.scroll, where).toBe(size.client);
}

/**
 * Открытый пункт залит, а не только подписан цветом.
 *
 * Цвет в одиночку — единственный признак, и при нарушении цветовосприятия он
 * пропадает. Меряется вычисленный фон: прозрачный означает «подсветки нет».
 */
async function expectFilled(target: Locator, where: string): Promise<void> {
  const background = await target.evaluate((el) => getComputedStyle(el).backgroundColor);

  expect(background, where).not.toBe('rgba(0, 0, 0, 0)');
}

/**
 * Текущий раздел отмечен в видимой навигации оболочки.
 *
 * 🔴 Ищем внутри самой навигации, а не по всей странице: `aria-current`
 * ставят и разделы — фильтры склада, вид календаря, хлебные крошки, — и по
 * документу целиком отметка нашлась бы дважды.
 *
 * 🔴 Отбор идёт по `:visible`. Разметка обеих навигаций живёт в дереве на
 * любой ширине — лишняя спрятана `display: none`, — и полоса вкладок отдала
 * бы свою отметку на десктопе, где её не видно.
 *
 * Разделы конфигурации своего пункта не имеют: на `/admin/company` горит
 * «Настройки», через которые в них и заходят (ADR-188).
 */
async function expectMarked(page: Page, section: AdminSection, nav: NavKind): Promise<void> {
  const expected = navHrefOf(section.href);
  expect(expected, `${section.title}: раздел не знает своего пункта навигации`).toBeDefined();

  const shell =
    nav === 'column'
      ? page.locator('aside')
      : page.getByRole('navigation', { name: texts.tabsLabel });
  const marked = shell.locator('[aria-current="page"]:visible');

  if (nav === 'column' || TABS.some((tab) => tab.href === expected)) {
    await expect(marked, `${section.title}: отмечен ровно один пункт`).toHaveCount(1);
    await expect(marked).toHaveAttribute('href', String(expected));
    await expectFilled(marked, `${section.title}: открытый пункт залит`);
    return;
  }

  /* Раздел лежит за «Ещё»: подсвечена сама вкладка, а `aria-current` — на
     ссылке внутри листа. Иначе на складе подсвеченного пункта нет вовсе, и
     полоса выглядит потерявшей место. */
  const more = shell.getByRole('button', { name: texts.more });
  await expectFilled(more, `${section.title}: вкладка «Ещё» подсвечена`);
  await expect(marked, `${section.title}: закрытый лист ничего не отмечает`).toHaveCount(0);

  await more.click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.locator('[aria-current="page"]')).toHaveAttribute('href', String(expected));

  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
}

for (const shell of SHELL) {
  test(`${shell.name} · ${shell.width}px: разделы открываются, заголовок один, текущий отмечен`, async ({
    page,
  }) => {
    /* Дев-сервер собирает каждый раздел по первому обращению, и на холодной
       сборке пятнадцать разделов не укладываются в общий таймаут. */
    test.setTimeout(300_000);

    await page.setViewportSize({ width: shell.width, height: shell.height });
    await loginViaUi(page);

    for (const section of SECTIONS) {
      /* Запас к общему таймауту перехода: дев-сервер собирает раздел по
         первому обращению, и холодная сборка тяжёлой страницы не всегда
         укладывается в минуту. */
      await page.goto(section.href, { timeout: 90_000 });

      await expect(page.locator('h1'), `${section.title}: ровно один h1`).toHaveCount(1);
      await expectNoSideScroll(page, `${section.title} на ${shell.width}px`);
      await expectMarked(page, section, shell.nav);
    }
  });
}

test('оболочка переключается по ширине: полоса вкладок до 900, колонка от 900', async ({
  page,
}) => {
  test.setTimeout(120_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaUi(page);

  const bar = page.getByRole('navigation', { name: texts.tabsLabel });
  const column = page.getByRole('navigation', { name: texts.navLabel });

  for (const width of [320, 390, 768, 899]) {
    await page.setViewportSize({ width, height: 844 });

    await expect(bar, `на ${width}px навигация внизу`).toBeVisible();
    await expect(column, `на ${width}px колонки нет`).toBeHidden();

    /* Полоса прибита к низу окна: под большим пальцем, а не в начале
       страницы, куда нужно прокрутить обратно. */
    const box = await bar.boundingBox();
    expect(box, `на ${width}px полоса измерима`).not.toBeNull();
    expect(Math.round(box?.y ?? 0) + Math.round(box?.height ?? 0), `низ полосы на ${width}px`).toBe(
      844,
    );
    expect(Math.round(box?.width ?? 0), `ширина полосы на ${width}px`).toBe(width);

    await expectNoSideScroll(page, `оболочка на ${width}px`);
  }

  for (const width of [900, 1024, 1200, 1440]) {
    await page.setViewportSize({ width, height: 900 });

    await expect(column, `на ${width}px разделы в колонке`).toBeVisible();
    await expect(bar, `на ${width}px нижней полосы нет`).toBeHidden();
    await expectNoSideScroll(page, `оболочка на ${width}px`);
  }
});

/**
 * Ждём, пока выдвижной лист доедет до места.
 *
 * 🔴 Первый кадр он рисует за краем окна — анимация выезда начинается с
 * `translateX(100%)`, — и замер сразу после клика ловил именно его: «Клиенты»
 * оказывались на x=407 при экране 390, и все четыре угла зоны шли мимо. Гашение
 * движения от этого не спасает: кадр `from` браузер всё равно рисует.
 */
async function settled(target: Locator): Promise<void> {
  await target.evaluate(async (el) => {
    await Promise.all(el.getAnimations({ subtree: true }).map((animation) => animation.finished));
  });
}

/**
 * Цель не меньше 44×44 — проверкой попадания, а не рамкой элемента.
 *
 * 🔴 Рамке верить нельзя: ссылки шапки добирают зону прозрачным `::after`
 * (ADR-183), и `boundingBox` показывает у «Панели» 54×23, хотя палец в неё
 * попадает. Меряем то, что важно: попадают ли углы квадрата 44×44 в саму
 * цель.
 */
async function expectTapZone(target: Locator, where: string): Promise<void> {
  const misses = await target.evaluate((el, tap) => {
    const box = el.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const half = tap / 2 - 1;

    /* Углы — парами, а не парами чисел из общего массива: со строгим
       индексом элемент такого массива читается как `number | undefined`. */
    const corners: readonly (readonly [number, number])[] = [
      [x - half, y - half],
      [x + half, y - half],
      [x - half, y + half],
      [x + half, y + half],
    ];

    return corners.filter(([px, py]) => {
      const hit = document.elementFromPoint(px, py);
      return hit === null || !(el === hit || el.contains(hit));
    }).length;
  }, TAP);

  expect(misses, `${where}: угол зоны 44×44 мимо цели`).toBe(0);
}

test('все цели оболочки до 900px не мельче 44×44', async ({ page }) => {
  test.setTimeout(120_000);

  /* Движение гасим: мерим геометрию, а не секундомер. */
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await loginViaUi(page);

  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/admin');
    await hideDevOverlay(page);

    /* Только видимые: кнопка колонки до 900px спрятана, и мерить у неё
       нечего — рамка нулевая. */
    for (const link of await page.locator('header a:visible, header button:visible').all()) {
      const name = (await link.textContent()) ?? (await link.getAttribute('aria-label')) ?? '?';
      await expectTapZone(link, `${name.trim()} в шапке на ${width}px`);
    }

    const bar = page.getByRole('navigation', { name: texts.tabsLabel });
    const cells = await bar.locator('li > *').all();
    expect(cells, `на ${width}px в полосе пять целей`).toHaveLength(TABS.length + 1);

    for (const cell of cells) {
      await expectTapZone(cell, `вкладка на ${width}px`);
    }

    /* Лист «Ещё» — та же навигация, и мерка у него та же. */
    await bar.getByRole('button', { name: texts.more }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await settled(sheet);

    for (const item of await sheet.getByRole('link').all()) {
      await expectTapZone(item, `пункт листа на ${width}px`);
    }

    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  }
});

/**
 * Один шаг обхода табом: кто получил фокус, где он и виден ли.
 *
 * `onTop` отвечает на вопрос «не накрыли ли фокус липкие полосы»: в середине
 * элемента должен лежать он сам, а не шапка и не полоса вкладок поверх него.
 */
type FocusStop = {
  readonly name: string;
  readonly region: string;
  readonly inView: boolean;
  readonly onTop: boolean;
  readonly ring: boolean;
};

async function walkWithTab(page: Page, limit: number): Promise<readonly FocusStop[]> {
  await hideDevOverlay(page);

  const stops: FocusStop[] = [];

  for (let step = 0; step < limit; step += 1) {
    await page.keyboard.press('Tab');

    const stop = await page.evaluate((tabsLabel): (FocusStop & { seen: boolean }) | null => {
      const el = document.activeElement;
      if (el === null || el === document.body || !(el instanceof HTMLElement)) return null;

      /* Метка на элементе — способ понять, что обход пошёл по второму кругу:
         после последнего пункта браузер возвращает фокус в начало страницы, а
         имена пунктов повторяются («Править» в каждой строке таблицы). */
      const seen = el.dataset.tabWalk === 'yes';
      el.dataset.tabWalk = 'yes';

      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      const inTabbar = el.closest('nav')?.getAttribute('aria-label') === tabsLabel;

      /* Шапка оболочки — первый `header` документа. Сравнение именно с ним, а
         не просто `closest('header')`: у раздела есть своя шапка с заголовком
         и главным действием, и она уехала бы в ту же область. */
      const shellHeader = document.querySelector('header');
      const region = inTabbar
        ? 'полоса вкладок'
        : el.closest('aside') !== null
          ? 'колонка'
          : el.closest('header') === shellHeader && shellHeader !== null
            ? 'шапка'
            : 'содержимое';

      return {
        seen,
        name: (el.getAttribute('aria-label') ?? el.textContent ?? el.tagName).trim().slice(0, 40),
        region,
        inView:
          box.top >= 0 &&
          box.left >= 0 &&
          box.bottom <= window.innerHeight &&
          box.right <= window.innerWidth,
        onTop: hit !== null && (el === hit || el.contains(hit)),
        ring:
          (style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0) ||
          style.boxShadow !== 'none',
      };
    }, texts.tabsLabel);

    if (stop === null || stop.seen) break;
    stops.push(stop);
  }

  return stops;
}

/* Сколько целей у навигации в каждой раскладке: пять вкладок внизу против
   всей колонки — разделы, прибитый низ и «Выйти». */
const TABBAR_STOPS = TABS.length + 1;
const COLUMN_STOPS = columnSectionsFor('owner').length + bottomSectionsFor('owner').length + 1;

for (const shell of [
  {
    name: 'телефон',
    width: 390,
    height: 844,
    order: ['шапка', 'содержимое', 'полоса вкладок'],
    nav: 'полоса вкладок',
    navStops: TABBAR_STOPS,
  },
  {
    name: 'десктоп',
    width: 1440,
    height: 900,
    order: ['шапка', 'колонка', 'содержимое'],
    nav: 'колонка',
    navStops: COLUMN_STOPS,
  },
]) {
  test(`${shell.name} · ${shell.width}px: обход табом виден, идёт по порядку и не уходит под липкое`, async ({
    page,
  }) => {
    test.setTimeout(180_000);

    await page.setViewportSize({ width: shell.width, height: shell.height });

    /* Плавная прокрутка асинхронна: без этого координата снимается на
       середине хода, и «фокус за краем окна» показывает секундомер, а не
       вёрстка. Под `reduce` прокрутка мгновенная (global.css). */
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await loginViaUi(page);
    await page.goto('/admin/clients');

    const stops = await walkWithTab(page, 80);

    /* 🔴 Считаем пункты навигации, а не все остановки подряд: список раздела
       приходит с сервера, и число ссылок в нём зависит от базы. Обход обязан
       дойти до каждого пункта навигации — ради этого он и делается. */
    const reached = stops.filter((stop) => stop.region === shell.nav);
    expect(reached, `обход дошёл до всей навигации (${shell.nav})`).toHaveLength(shell.navStops);
    expect(
      stops.some((stop) => stop.region === 'содержимое'),
      'обход прошёл и через содержимое раздела',
    ).toBe(true);

    for (const stop of stops) {
      expect(stop.ring, `«${stop.name}»: фокус видно`).toBe(true);
      expect(stop.inView, `«${stop.name}»: фокус в пределах окна`).toBe(true);
      expect(stop.onTop, `«${stop.name}»: липкая полоса не накрывает фокус`).toBe(true);
    }

    /* Порядок обхода совпадает с визуальным: шапка сверху, навигация там, где
       она нарисована, — сбоку на десктопе и внизу на телефоне. */
    const regions = stops
      .map((stop) => stop.region)
      .filter((region, index, all) => region !== all[index - 1]);
    expect(regions, 'порядок областей совпадает с визуальным').toEqual(shell.order);
  });
}
